import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import Stripe from "npm:stripe@22.6.0";

const stripeEnvironment = Deno.env.get("STRIPE_ENVIRONMENT") ?? "sandbox";
const allowLive = Deno.env.get("ALLOW_LIVE_STRIPE") === "true";
const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

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
  if (!["sandbox", "live"].includes(stripeEnvironment)) return "STRIPE_ENVIRONMENT must be sandbox or live.";
  if (stripeEnvironment === "sandbox" && stripeKey.includes("_live_")) {
    return "A live Stripe key cannot be used in the sandbox environment.";
  }
  if (stripeEnvironment === "live" && !allowLive) return "Live Stripe refunds are disabled for this deployment.";
  if (stripeEnvironment === "live" && stripeKey.includes("_test_")) {
    return "A sandbox/test Stripe key cannot be used in the live environment.";
  }
  return null;
}

function amountMinor(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("invalid_refund_amount");
  const minor = Math.round(amount * 100);
  if (Math.abs(minor / 100 - amount) > 0.000001) throw new Error("invalid_refund_precision");
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

  let payload: { paymentId?: string; amount?: number | null };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (!payload.paymentId) return json({ error: "payment_id_required" }, 400);

  const { data: payment, error: paymentError } = await userClient
    .from("payments")
    .select("id, project_id, customer_id, seller_id, status, currency, amount, refunded_amount, provider_account_id, provider_payment_intent_id, provider_charge_id")
    .eq("id", payload.paymentId)
    .maybeSingle();

  if (paymentError) return json({ error: "payment_lookup_failed" }, 500);
  if (!payment) return json({ error: "payment_not_found" }, 404);
  if (!payment.seller_id || payment.seller_id !== userData.user.id) return json({ error: "seller_only" }, 403);
  if (payment.status !== "paid") return json({ error: "paid_payment_required" }, 409);
  if (payment.currency !== "GBP") return json({ error: "unsupported_currency" }, 409);
  if (!payment.provider_account_id) return json({ error: "seller_stripe_account_required" }, 409);
  if (!payment.provider_payment_intent_id && !payment.provider_charge_id) {
    return json({ error: "provider_payment_reference_missing" }, 409);
  }

  const { data: sellerAccount, error: sellerError } = await admin
    .from("stripe_connected_accounts")
    .select("provider_account_id, fees_collector, losses_collector")
    .eq("professional_id", payment.seller_id)
    .eq("environment", stripeEnvironment)
    .maybeSingle();

  if (
    sellerError ||
    !sellerAccount ||
    sellerAccount.provider_account_id !== payment.provider_account_id ||
    sellerAccount.fees_collector !== "stripe" ||
    sellerAccount.losses_collector !== "stripe"
  ) {
    return json({ error: "seller_stripe_configuration_invalid" }, 409);
  }

  const alreadyRefunded = Number(payment.refunded_amount ?? 0);
  const remaining = Math.max(Number(payment.amount) - alreadyRefunded, 0);
  const requestedAmount = payload.amount == null ? remaining : Number(payload.amount);
  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0 || requestedAmount > remaining) {
    return json({ error: "refund_amount_exceeds_remaining" }, 409);
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2026-08-26.dahlia" });
  const connectedAccountId = payment.provider_account_id;
  const amount = amountMinor(requestedAmount);
  const metadata = {
    smc_payment_id: payment.id,
    smc_project_id: payment.project_id,
    smc_customer_id: payment.customer_id,
    smc_seller_id: payment.seller_id,
    smc_environment: stripeEnvironment,
  };

  try {
    const refund = await stripe.refunds.create(
      {
        ...(payment.provider_payment_intent_id
          ? { payment_intent: payment.provider_payment_intent_id }
          : { charge: payment.provider_charge_id }),
        amount,
        metadata,
      },
      {
        stripeAccount: connectedAccountId,
        idempotencyKey: `smc-direct-refund-${payment.id}-${amount}-${Math.round(alreadyRefunded * 100)}`,
      },
    );

    return json({
      refundId: refund.id,
      status: refund.status,
      amount: requestedAmount,
      currency: payment.currency,
      pendingWebhookReconciliation: true,
    });
  } catch (error) {
    console.error("refund-project-payment", error instanceof Error ? error.message : "stripe_error");
    return json({ error: "refund_creation_failed" }, 502);
  }
});
