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
    .select("id, project_id, customer_id, seller_id, requested_by, kind, status, currency, amount, due_at, collection_method, provider_account_id, provider_invoice_id")
    .eq("id", payload.paymentId)
    .maybeSingle();

  if (paymentError) return json({ error: "payment_lookup_failed" }, 500);
  if (!payment) return json({ error: "payment_not_found" }, 404);
  if (!payment.seller_id || payment.seller_id !== userData.user.id) return json({ error: "seller_only" }, 403);
  if (payment.requested_by !== userData.user.id) return json({ error: "not_authorized" }, 403);
  if (payment.collection_method !== "invoice") return json({ error: "payment_uses_checkout" }, 409);
  if (payment.currency !== "GBP") return json({ error: "unsupported_currency" }, 409);
  if (!payment.due_at) return json({ error: "invoice_due_date_required" }, 409);
  if (payment.status === "paid" || payment.status === "refunded") return json({ error: "payment_already_settled" }, 409);

  const dueAt = new Date(payment.due_at);
  if (Number.isNaN(dueAt.getTime()) || dueAt <= new Date()) {
    return json({ error: "invoice_due_date_invalid" }, 409);
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
      message: "Connect Stripe before issuing project invoices.",
    }, 409);
  }
  if (
    sellerAccount.dashboard !== "full" ||
    sellerAccount.fees_collector !== "stripe" ||
    sellerAccount.losses_collector !== "stripe"
  ) {
    return json({
      error: "seller_stripe_configuration_invalid",
      message: "Your Stripe account does not match the approved SMC Pro Studio direct-charge model.",
    }, 409);
  }
  if (!sellerAccount.onboarding_complete || !sellerAccount.charges_enabled || sellerAccount.card_payments_status !== "active") {
    return json({
      error: "seller_stripe_account_not_ready",
      message: "Finish Stripe onboarding before issuing project invoices.",
    }, 409);
  }

  const connectedAccountId = sellerAccount.provider_account_id;
  if (payment.provider_account_id && payment.provider_account_id !== connectedAccountId) {
    return json({ error: "payment_seller_account_mismatch" }, 409);
  }

  const { error: claimError } = await admin.rpc("claim_project_payment_for_collection", {
    p_payment_id: payment.id,
    p_customer_id: payment.customer_id,
    p_collection_method: "invoice",
  });
  if (claimError) {
    return json({
      error: "payment_no_longer_collectible",
      message: "This invoice can no longer be issued because the approved project balance is already covered by other payments or requests.",
    }, 409);
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2026-08-26.dahlia" });

  if (payment.provider_invoice_id) {
    try {
      const existing = await stripe.invoices.retrieve(
        payment.provider_invoice_id,
        {},
        { stripeAccount: connectedAccountId },
      );
      return json({
        invoiceId: existing.id,
        hostedInvoiceUrl: existing.hosted_invoice_url ?? null,
        invoicePdfUrl: existing.invoice_pdf ?? null,
        sellerAccountId: connectedAccountId,
        reused: true,
      });
    } catch {
      // If the invoice is missing in this sandbox, an idempotent rebuild follows.
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

  const { data: customerAuth, error: customerAuthError } = await admin.auth.admin.getUserById(payment.customer_id);
  if (customerAuthError || !customerAuth.user?.email) {
    return json({ error: "customer_email_required" }, 409);
  }

  let providerCustomerId: string | null = null;
  const { data: mappedCustomer } = await admin
    .from("stripe_customers")
    .select("provider_customer_id")
    .eq("profile_id", payment.customer_id)
    .eq("provider_account_id", connectedAccountId)
    .eq("mode", stripeEnvironment)
    .maybeSingle();

  providerCustomerId = mappedCustomer?.provider_customer_id ?? null;

  try {
    if (!providerCustomerId) {
      const providerCustomer = await stripe.customers.create(
        {
          email: customerAuth.user.email,
          metadata: {
            smc_profile_id: payment.customer_id,
            smc_seller_id: payment.seller_id,
            smc_environment: stripeEnvironment,
          },
        },
        {
          stripeAccount: connectedAccountId,
          idempotencyKey: `smc-direct-customer-${payment.customer_id}-${connectedAccountId}-${stripeEnvironment}`,
        },
      );
      providerCustomerId = providerCustomer.id;

      const { error: customerMapError } = await admin.from("stripe_customers").upsert(
        {
          profile_id: payment.customer_id,
          provider_account_id: connectedAccountId,
          mode: stripeEnvironment,
          provider_customer_id: providerCustomerId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "profile_id,provider_account_id,mode" },
      );
      if (customerMapError) return json({ error: "customer_mapping_failed" }, 500);
    }

    const metadata = {
      smc_payment_id: payment.id,
      smc_project_id: payment.project_id,
      smc_customer_id: payment.customer_id,
      smc_seller_id: payment.seller_id,
      smc_environment: stripeEnvironment,
    };

    const draft = await stripe.invoices.create(
      {
        customer: providerCustomerId,
        collection_method: "send_invoice",
        due_date: Math.floor(dueAt.getTime() / 1000),
        currency: "gbp",
        description: `Project payment — ${project.title}`,
        metadata,
        auto_advance: false,
      },
      {
        stripeAccount: connectedAccountId,
        idempotencyKey: `smc-direct-invoice-${payment.id}-draft`,
      },
    );

    await stripe.invoiceItems.create(
      {
        customer: providerCustomerId,
        invoice: draft.id,
        amount: amountMinor(Number(payment.amount)),
        currency: "gbp",
        description: `${String(payment.kind).replaceAll("_", " ")} payment — ${project.title}`,
        metadata,
      },
      {
        stripeAccount: connectedAccountId,
        idempotencyKey: `smc-direct-invoice-${payment.id}-item`,
      },
    );

    const finalized = await stripe.invoices.finalizeInvoice(
      draft.id,
      {},
      {
        stripeAccount: connectedAccountId,
        idempotencyKey: `smc-direct-invoice-${payment.id}-finalize`,
      },
    );

    const sent = await stripe.invoices.sendInvoice(
      finalized.id,
      {},
      {
        stripeAccount: connectedAccountId,
        idempotencyKey: `smc-direct-invoice-${payment.id}-send`,
      },
    );

    const { error: updateError } = await admin
      .from("payments")
      .update({
        provider_account_id: connectedAccountId,
        provider_customer_id: providerCustomerId,
        provider_invoice_id: sent.id,
        hosted_invoice_url: sent.hosted_invoice_url ?? null,
        invoice_pdf_url: sent.invoice_pdf ?? null,
        status: "pending",
        failure_code: null,
        failure_message: null,
        cancelled_at: null,
      })
      .eq("id", payment.id)
      .eq("seller_id", payment.seller_id);

    if (updateError) return json({ error: "payment_state_update_failed" }, 500);

    return json({
      invoiceId: sent.id,
      hostedInvoiceUrl: sent.hosted_invoice_url ?? null,
      invoicePdfUrl: sent.invoice_pdf ?? null,
      sellerAccountId: connectedAccountId,
      reused: false,
    });
  } catch (error) {
    console.error("create-project-invoice", error instanceof Error ? error.message : "stripe_error");
    return json({ error: "invoice_creation_failed" }, 502);
  }
});
