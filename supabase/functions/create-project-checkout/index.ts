import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import Stripe from "npm:stripe@22.6.0";

const stripeEnvironment = Deno.env.get("STRIPE_ENVIRONMENT") ?? "sandbox";
const allowLive = Deno.env.get("ALLOW_LIVE_STRIPE") === "true";
const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const appBaseUrl = (Deno.env.get("APP_BASE_URL") ?? "https://smcprostudio.app").replace(/\/$/, "");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function adminKey(): string {
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) return JSON.parse(modern).default;
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

function publicKey(): string {
  const modern = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (modern) return JSON.parse(modern).default;
  return Deno.env.get("SUPABASE_ANON_KEY") ?? "";
}

function assertStripeEnvironment(): string | null {
  if (!stripeKey) return "Stripe is not configured for this environment.";
  if (!["sandbox", "live"].includes(stripeEnvironment)) {
    return "STRIPE_ENVIRONMENT must be sandbox or live.";
  }
  if (stripeEnvironment === "sandbox" && stripeKey.includes("_live_")) {
    return "A live Stripe key cannot be used in the sandbox environment.";
  }
  if (stripeEnvironment === "live" && !allowLive) {
    return "Live Stripe payments are disabled for this deployment.";
  }
  if (stripeEnvironment === "live" && stripeKey.includes("_test_")) {
    return "A sandbox/test Stripe key cannot be used in the live environment.";
  }
  return null;
}

function amountMinor(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("invalid_payment_amount");
  const minor = Math.round(amount * 100);
  if (Math.abs(minor / 100 - amount) > 0.000001) throw new Error("invalid_payment_precision");
  return minor;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const configError = assertStripeEnvironment();
  if (configError) return json({ error: "stripe_not_configured", message: configError }, 503);

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "not_authenticated" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const userClient = createClient(supabaseUrl, publicKey(), {
    global: { headers: { Authorization: authorization } },
  });
  const admin = createClient(supabaseUrl, adminKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = authorization.slice("Bearer ".length);
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "not_authenticated" }, 401);

  let payload: { paymentId?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (!payload.paymentId) return json({ error: "payment_id_required" }, 400);

  const { data: payment, error: paymentError } = await userClient
    .from("payments")
    .select("id, project_id, customer_id, seller_id, kind, status, currency, amount, collection_method, provider_account_id, provider_checkout_session_id, checkout_attempt")
    .eq("id", payload.paymentId)
    .maybeSingle();

  if (paymentError) return json({ error: "payment_lookup_failed" }, 500);
  if (!payment) return json({ error: "payment_not_found" }, 404);
  if (payment.customer_id !== userData.user.id) return json({ error: "not_authorized" }, 403);
  if (!payment.seller_id) return json({ error: "project_seller_required" }, 409);
  if (payment.collection_method !== "checkout") return json({ error: "payment_uses_invoice" }, 409);
  if (payment.currency !== "GBP") return json({ error: "unsupported_currency" }, 409);
  if (payment.status === "paid" || payment.status === "refunded") {
    return json({ error: "payment_already_settled" }, 409);
  }

  const { data: sellerAccount, error: sellerAccountError } = await admin
    .from("stripe_connected_accounts")
    .select("provider_account_id, dashboard, fees_collector, losses_collector, card_payments_status, charges_enabled, onboarding_complete")
    .eq("professional_id", payment.seller_id)
    .eq("environment", stripeEnvironment)
    .maybeSingle();

  if (sellerAccountError) return json({ error: "seller_account_lookup_failed" }, 500);
  if (!sellerAccount) {
    return json({
      error: "seller_stripe_account_required",
      message: "The professional must finish Stripe setup before accepting project payments.",
    }, 409);
  }
  if (
    sellerAccount.dashboard !== "full" ||
    sellerAccount.fees_collector !== "stripe" ||
    sellerAccount.losses_collector !== "stripe"
  ) {
    return json({
      error: "seller_stripe_configuration_invalid",
      message: "The professional Stripe account does not match the approved SMC Pro Studio payment model.",
    }, 409);
  }
  if (!sellerAccount.onboarding_complete || !sellerAccount.charges_enabled || sellerAccount.card_payments_status !== "active") {
    return json({
      error: "seller_stripe_account_not_ready",
      message: "The professional Stripe account is not ready to accept card payments yet.",
    }, 409);
  }

  const connectedAccountId = sellerAccount.provider_account_id;
  if (payment.provider_account_id && payment.provider_account_id !== connectedAccountId) {
    return json({ error: "payment_seller_account_mismatch" }, 409);
  }

  const { error: claimError } = await admin.rpc("claim_project_payment_for_collection", {
    p_payment_id: payment.id,
    p_customer_id: payment.customer_id,
    p_collection_method: "checkout",
  });
  if (claimError) {
    return json({
      error: "payment_no_longer_collectible",
      message: "This payment can no longer be collected because the approved project balance is already covered by other payments or requests.",
    }, 409);
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2026-08-26.dahlia" });

  if (payment.provider_checkout_session_id) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(
        payment.provider_checkout_session_id,
        {},
        { stripeAccount: connectedAccountId },
      );
      if (existing.status === "open" && existing.url) {
        return json({ checkoutUrl: existing.url, sessionId: existing.id, reused: true });
      }
      if (existing.status === "complete") {
        return json({ checkoutUrl: null, sessionId: existing.id, processing: true, reused: true });
      }
    } catch {
      // A missing or expired session can be replaced safely below.
    }
  }

  const { data: project, error: projectError } = await userClient
    .from("projects")
    .select("id, title, lead_professional_id")
    .eq("id", payment.project_id)
    .maybeSingle();
  if (projectError || !project) return json({ error: "project_not_found" }, 404);
  if (project.lead_professional_id !== payment.seller_id) {
    return json({ error: "project_seller_mismatch" }, 409);
  }

  const attempt = Number(payment.checkout_attempt ?? 0) + 1;
  const metadata = {
    smc_payment_id: payment.id,
    smc_project_id: payment.project_id,
    smc_customer_id: payment.customer_id,
    smc_seller_id: payment.seller_id,
    smc_environment: stripeEnvironment,
  };

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        client_reference_id: payment.id,
        customer_email: userData.user.email ?? undefined,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "gbp",
              unit_amount: amountMinor(Number(payment.amount)),
              product_data: {
                name: `Project payment — ${project.title}`,
                description: `${String(payment.kind).replaceAll("_", " ")} payment`,
              },
            },
          },
        ],
        metadata,
        payment_intent_data: {
          metadata,
          receipt_email: userData.user.email ?? undefined,
        },
        success_url: `${appBaseUrl}/payments/return?payment_id=${payment.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appBaseUrl}/payments/return?payment_id=${payment.id}&cancelled=1`,
      },
      {
        stripeAccount: connectedAccountId,
        idempotencyKey: `smc-direct-checkout-${payment.id}-${attempt}`,
      },
    );

    if (!session.url) return json({ error: "checkout_url_missing" }, 502);

    const { error: updateError } = await admin
      .from("payments")
      .update({
        provider_account_id: connectedAccountId,
        provider_checkout_session_id: session.id,
        checkout_attempt: attempt,
        checkout_expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
        status: "pending",
        failure_code: null,
        failure_message: null,
        cancelled_at: null,
      })
      .eq("id", payment.id)
      .eq("seller_id", payment.seller_id);

    if (updateError) return json({ error: "payment_state_update_failed" }, 500);

    return json({
      checkoutUrl: session.url,
      sessionId: session.id,
      sellerAccountId: connectedAccountId,
      reused: false,
    });
  } catch (error) {
    console.error("create-project-checkout", error instanceof Error ? error.message : "stripe_error");
    return json({ error: "checkout_creation_failed" }, 502);
  }
});
