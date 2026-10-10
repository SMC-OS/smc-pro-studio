import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import Stripe from "npm:stripe@22.6.0";

const stripeMode = Deno.env.get("STRIPE_MODE") ?? "test";
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
  if (stripeMode !== "test" && stripeMode !== "live") return "STRIPE_MODE must be test or live.";
  if (stripeMode === "test" && stripeKey.includes("_live_")) return "A live Stripe key cannot be used in test mode.";
  if (stripeMode === "live" && !allowLive) return "Live Stripe payments are disabled for this deployment.";
  if (stripeMode === "live" && stripeKey.includes("_test_")) return "A test Stripe key cannot be used in live mode.";
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
    .select("id, project_id, customer_id, requested_by, kind, status, currency, amount, due_at, collection_method, provider_invoice_id")
    .eq("id", payload.paymentId)
    .maybeSingle();

  if (paymentError) return json({ error: "payment_lookup_failed" }, 500);
  if (!payment) return json({ error: "payment_not_found" }, 404);
  if (payment.requested_by !== userData.user.id) return json({ error: "not_authorized" }, 403);
  if (payment.collection_method !== "invoice") return json({ error: "payment_uses_checkout" }, 409);
  if (payment.currency !== "GBP") return json({ error: "unsupported_currency" }, 409);
  if (!payment.due_at) return json({ error: "invoice_due_date_required" }, 409);
  if (payment.status === "paid" || payment.status === "refunded") return json({ error: "payment_already_settled" }, 409);

  const dueAt = new Date(payment.due_at);
  if (Number.isNaN(dueAt.getTime()) || dueAt <= new Date()) return json({ error: "invoice_due_date_invalid" }, 409);

  const stripe = new Stripe(stripeKey, { apiVersion: "2026-08-26.dahlia" });

  if (payment.provider_invoice_id) {
    try {
      const existing = await stripe.invoices.retrieve(payment.provider_invoice_id);
      return json({
        invoiceId: existing.id,
        hostedInvoiceUrl: existing.hosted_invoice_url ?? null,
        invoicePdfUrl: existing.invoice_pdf ?? null,
        reused: true,
      });
    } catch {
      // If the provider object is missing in the current sandbox, rebuild it idempotently below.
    }
  }

  const { data: project, error: projectError } = await userClient
    .from("projects")
    .select("id, title")
    .eq("id", payment.project_id)
    .maybeSingle();
  if (projectError || !project) return json({ error: "project_not_found" }, 404);

  const { data: customerAuth, error: customerAuthError } = await admin.auth.admin.getUserById(payment.customer_id);
  if (customerAuthError || !customerAuth.user?.email) return json({ error: "customer_email_required" }, 409);

  let providerCustomerId: string | null = null;
  const { data: mappedCustomer } = await admin
    .from("stripe_customers")
    .select("provider_customer_id")
    .eq("profile_id", payment.customer_id)
    .eq("mode", stripeMode)
    .maybeSingle();

  providerCustomerId = mappedCustomer?.provider_customer_id ?? null;

  try {
    if (!providerCustomerId) {
      const providerCustomer = await stripe.customers.create(
        {
          email: customerAuth.user.email,
          metadata: {
            smc_profile_id: payment.customer_id,
            smc_environment: stripeMode,
          },
        },
        { idempotencyKey: `smc-customer-${payment.customer_id}-${stripeMode}` },
      );
      providerCustomerId = providerCustomer.id;

      const { error: customerMapError } = await admin.from("stripe_customers").upsert(
        {
          profile_id: payment.customer_id,
          mode: stripeMode,
          provider_customer_id: providerCustomerId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "profile_id,mode" },
      );
      if (customerMapError) return json({ error: "customer_mapping_failed" }, 500);
    }

    const metadata = {
      smc_payment_id: payment.id,
      smc_project_id: payment.project_id,
      smc_customer_id: payment.customer_id,
      smc_environment: stripeMode,
    };

    const draft = await stripe.invoices.create(
      {
        customer: providerCustomerId,
        collection_method: "send_invoice",
        due_date: Math.floor(dueAt.getTime() / 1000),
        currency: "gbp",
        description: `SMC Pro Studio project payment — ${project.title}`,
        metadata,
        auto_advance: false,
      },
      { idempotencyKey: `smc-invoice-${payment.id}-draft` },
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
      { idempotencyKey: `smc-invoice-${payment.id}-item` },
    );

    const finalized = await stripe.invoices.finalizeInvoice(
      draft.id,
      {},
      { idempotencyKey: `smc-invoice-${payment.id}-finalize` },
    );

    const sent = await stripe.invoices.sendInvoice(
      finalized.id,
      {},
      { idempotencyKey: `smc-invoice-${payment.id}-send` },
    );

    const { error: updateError } = await admin
      .from("payments")
      .update({
        provider_customer_id: providerCustomerId,
        provider_invoice_id: sent.id,
        hosted_invoice_url: sent.hosted_invoice_url ?? null,
        invoice_pdf_url: sent.invoice_pdf ?? null,
        status: "pending",
        failure_code: null,
        failure_message: null,
        cancelled_at: null,
      })
      .eq("id", payment.id);

    if (updateError) return json({ error: "payment_state_update_failed" }, 500);

    return json({
      invoiceId: sent.id,
      hostedInvoiceUrl: sent.hosted_invoice_url ?? null,
      invoicePdfUrl: sent.invoice_pdf ?? null,
      reused: false,
    });
  } catch (error) {
    console.error("create-project-invoice", error instanceof Error ? error.message : "stripe_error");
    return json({ error: "invoice_creation_failed" }, 502);
  }
});
