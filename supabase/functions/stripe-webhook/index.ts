import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import Stripe from "npm:stripe@22.6.0";

const stripeMode = Deno.env.get("STRIPE_MODE") ?? "test";
const allowLive = Deno.env.get("ALLOW_LIVE_STRIPE") === "true";
const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET") ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function adminKey(): string {
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) return JSON.parse(modern).default;
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

function assertStripeEnvironment(): string | null {
  if (!stripeKey || !webhookSecret) return "Stripe webhook secrets are not configured.";
  if (stripeMode !== "test" && stripeMode !== "live") return "STRIPE_MODE must be test or live.";
  if (stripeMode === "test" && stripeKey.includes("_live_")) return "A live Stripe key cannot be used in test mode.";
  if (stripeMode === "live" && !allowLive) return "Live Stripe webhooks are disabled for this deployment.";
  if (stripeMode === "live" && stripeKey.includes("_test_")) return "A test Stripe key cannot be used in live mode.";
  return null;
}

function isoFromSeconds(value: unknown): string | null {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

function stripeId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof (value as { id?: unknown }).id === "string") {
    return (value as { id: string }).id;
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const configError = assertStripeEnvironment();
  if (configError) return json({ error: "stripe_not_configured", message: configError }, 503);

  const signature = req.headers.get("Stripe-Signature");
  if (!signature) return json({ error: "stripe_signature_required" }, 400);

  const body = await req.text();
  const stripe = new Stripe(stripeKey, { apiVersion: "2026-08-26.dahlia" });
  const cryptoProvider = Stripe.createSubtleCryptoProvider();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider,
    );
  } catch {
    return json({ error: "invalid_stripe_signature" }, 400);
  }

  const expectedLiveMode = stripeMode === "live";
  if (event.livemode !== expectedLiveMode) {
    return json({ error: "stripe_environment_mismatch" }, 400);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", adminKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const existing = await admin
    .from("stripe_webhook_events")
    .select("processed_at")
    .eq("event_id", event.id)
    .maybeSingle();

  if (existing.data?.processed_at) {
    return json({ received: true, duplicate: true });
  }

  if (!existing.data) {
    const object = event.data.object as { id?: string };
    const { error: eventInsertError } = await admin.from("stripe_webhook_events").insert({
      event_id: event.id,
      event_type: event.type,
      livemode: event.livemode,
      object_id: typeof object?.id === "string" ? object.id : null,
      provider_created_at: isoFromSeconds(event.created),
    });
    if (eventInsertError && eventInsertError.code !== "23505") {
      return json({ error: "webhook_event_record_failed" }, 500);
    }
  } else {
    await admin
      .from("stripe_webhook_events")
      .update({ error_text: null })
      .eq("event_id", event.id);
  }

  async function findPaymentId(object: Record<string, any>): Promise<string | null> {
    const metadataPaymentId = object.metadata?.smc_payment_id;
    if (typeof metadataPaymentId === "string" && metadataPaymentId) return metadataPaymentId;

    const candidates: Array<[string, string | null]> = [
      ["provider_checkout_session_id", typeof object.id === "string" && object.id.startsWith("cs_") ? object.id : null],
      ["provider_invoice_id", typeof object.id === "string" && object.id.startsWith("in_") ? object.id : null],
      ["provider_payment_intent_id", stripeId(object.payment_intent) ?? (typeof object.id === "string" && object.id.startsWith("pi_") ? object.id : null)],
      ["provider_charge_id", stripeId(object.charge) ?? (typeof object.id === "string" && object.id.startsWith("ch_") ? object.id : null)],
    ];

    for (const [column, value] of candidates) {
      if (!value) continue;
      const { data } = await admin.from("payments").select("id").eq(column, value).maybeSingle();
      if (data?.id) return data.id;
    }
    return null;
  }

  async function getPayment(paymentId: string) {
    const { data, error } = await admin
      .from("payments")
      .select("id, project_id, quote_id, customer_id, requested_by, amount, currency, status, refunded_amount")
      .eq("id", paymentId)
      .single();
    if (error || !data) throw new Error("payment_not_found");
    return data;
  }

  async function getLeadProfessional(projectId: string): Promise<string | null> {
    const { data } = await admin
      .from("projects")
      .select("lead_professional_id")
      .eq("id", projectId)
      .maybeSingle();
    return data?.lead_professional_id ?? null;
  }

  async function notifyPayment(
    payment: Awaited<ReturnType<typeof getPayment>>,
    customerTitle: string,
    customerBody: string,
    professionalTitle?: string,
    professionalBody?: string,
  ) {
    await admin.from("notifications").insert({
      user_id: payment.customer_id,
      project_id: payment.project_id,
      quote_id: payment.quote_id,
      kind: "payment_status",
      title: customerTitle,
      body: customerBody,
    });

    const professionalId = await getLeadProfessional(payment.project_id);
    if (professionalId && professionalTitle) {
      await admin.from("notifications").insert({
        user_id: professionalId,
        project_id: payment.project_id,
        quote_id: payment.quote_id,
        kind: "payment_status",
        title: professionalTitle,
        body: professionalBody ?? customerBody,
      });
    }
  }

  async function paymentIntentReceipt(paymentIntentId: string | null) {
    if (!paymentIntentId) return { chargeId: null as string | null, receiptUrl: null as string | null };
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
    const charge = pi.latest_charge;
    if (charge && typeof charge === "object") {
      return {
        chargeId: charge.id,
        receiptUrl: charge.receipt_url ?? null,
      };
    }
    return { chargeId: stripeId(charge), receiptUrl: null };
  }

  async function markPaid(paymentId: string, object: Record<string, any>) {
    const payment = await getPayment(paymentId);
    if (payment.status === "paid" || payment.status === "refunded") return;

    const paymentIntentId = stripeId(object.payment_intent) ??
      (typeof object.id === "string" && object.id.startsWith("pi_") ? object.id : null);
    const receipt = await paymentIntentReceipt(paymentIntentId);

    const patch: Record<string, unknown> = {
      status: "paid",
      paid_at: isoFromSeconds(event.created) ?? new Date().toISOString(),
      provider_payment_intent_id: paymentIntentId,
      provider_charge_id: receipt.chargeId,
      receipt_url: receipt.receiptUrl,
      failure_code: null,
      failure_message: null,
      cancelled_at: null,
      last_provider_event_id: event.id,
      last_provider_event_at: isoFromSeconds(event.created),
    };

    if (typeof object.id === "string" && object.id.startsWith("cs_")) {
      patch.provider_checkout_session_id = object.id;
      patch.provider_customer_id = stripeId(object.customer);
    }
    if (typeof object.id === "string" && object.id.startsWith("in_")) {
      patch.provider_invoice_id = object.id;
      patch.provider_customer_id = stripeId(object.customer);
      patch.hosted_invoice_url = object.hosted_invoice_url ?? null;
      patch.invoice_pdf_url = object.invoice_pdf ?? null;
    }

    const { error } = await admin.from("payments").update(patch).eq("id", paymentId);
    if (error) throw error;

    await notifyPayment(
      payment,
      "Payment received",
      "Your project payment has been verified by Stripe.",
      "Project payment received",
      "Stripe has verified the customer’s project payment.",
    );
  }

  async function markFailed(paymentId: string, object: Record<string, any>, code = "payment_failed") {
    const payment = await getPayment(paymentId);
    if (payment.status === "paid" || payment.status === "refunded") return;

    const lastError = object.last_payment_error;
    const { error } = await admin
      .from("payments")
      .update({
        status: "failed",
        failure_code: typeof lastError?.code === "string" ? lastError.code : code,
        failure_message: typeof lastError?.message === "string" ? lastError.message.slice(0, 500) : null,
        last_provider_event_id: event.id,
        last_provider_event_at: isoFromSeconds(event.created),
      })
      .eq("id", paymentId);
    if (error) throw error;

    await notifyPayment(
      payment,
      "Payment not completed",
      "Stripe did not complete this project payment. You can review the payment and try again.",
    );
  }

  async function markCancelled(paymentId: string) {
    const payment = await getPayment(paymentId);
    if (payment.status === "paid" || payment.status === "refunded") return;

    const { error } = await admin
      .from("payments")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        last_provider_event_id: event.id,
        last_provider_event_at: isoFromSeconds(event.created),
      })
      .eq("id", paymentId);
    if (error) throw error;
  }

  async function syncRefund(refund: Record<string, any>) {
    const paymentId = await findPaymentId(refund);
    if (!paymentId) return;
    const payment = await getPayment(paymentId);

    const rawStatus = typeof refund.status === "string" ? refund.status : "pending";
    const status = rawStatus === "canceled" ? "cancelled" : rawStatus;
    const amount = Number(refund.amount ?? 0) / 100;

    await admin.from("payment_refunds").upsert(
      {
        payment_id: paymentId,
        provider_refund_id: refund.id,
        amount,
        currency: String(refund.currency ?? "gbp").toUpperCase(),
        status: ["pending", "succeeded", "failed", "cancelled"].includes(status) ? status : "pending",
        reason: typeof refund.reason === "string" ? refund.reason : null,
        provider_created_at: isoFromSeconds(refund.created),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider_refund_id" },
    );

    const { data: rows, error: rowsError } = await admin
      .from("payment_refunds")
      .select("amount,status")
      .eq("payment_id", paymentId);
    if (rowsError) throw rowsError;

    const refunded = (rows ?? [])
      .filter((row) => row.status === "succeeded")
      .reduce((sum, row) => sum + Number(row.amount), 0);

    const fullyRefunded = refunded >= Number(payment.amount);
    const { error } = await admin
      .from("payments")
      .update({
        refunded_amount: Math.min(refunded, Number(payment.amount)),
        status: fullyRefunded ? "refunded" : "paid",
        last_provider_event_id: event.id,
        last_provider_event_at: isoFromSeconds(event.created),
      })
      .eq("id", paymentId);
    if (error) throw error;

    await notifyPayment(
      payment,
      fullyRefunded ? "Payment refunded" : "Partial refund recorded",
      fullyRefunded
        ? "Stripe has confirmed that this project payment was refunded."
        : "Stripe has confirmed a partial refund on this project payment.",
      fullyRefunded ? "Project payment refunded" : "Project payment partially refunded",
    );
  }

  async function syncDispute(dispute: Record<string, any>) {
    const paymentId = await findPaymentId(dispute);
    if (!paymentId) return;
    const payment = await getPayment(paymentId);
    const amount = Number(dispute.amount ?? 0) / 100;
    const status = typeof dispute.status === "string" ? dispute.status : "unknown";

    const { error: disputeError } = await admin.from("payment_disputes").upsert(
      {
        payment_id: paymentId,
        provider_dispute_id: dispute.id,
        amount,
        currency: String(dispute.currency ?? "gbp").toUpperCase(),
        status,
        reason: typeof dispute.reason === "string" ? dispute.reason : null,
        evidence_due_at: isoFromSeconds(dispute.evidence_details?.due_by),
        provider_created_at: isoFromSeconds(dispute.created),
        closed_at: event.type === "charge.dispute.closed" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider_dispute_id" },
    );
    if (disputeError) throw disputeError;

    const { data: rows, error: rowsError } = await admin
      .from("payment_disputes")
      .select("amount,status")
      .eq("payment_id", paymentId);
    if (rowsError) throw rowsError;

    const disputedAmount = (rows ?? [])
      .filter((row) => row.status !== "won")
      .reduce((sum, row) => sum + Number(row.amount), 0);

    await admin
      .from("payments")
      .update({
        disputed_amount: disputedAmount,
        last_provider_event_id: event.id,
        last_provider_event_at: isoFromSeconds(event.created),
      })
      .eq("id", paymentId);

    await notifyPayment(
      payment,
      "Payment dispute updated",
      "Stripe reported a dispute update for this project payment.",
      "Project payment dispute updated",
    );
  }

  try {
    const object = event.data.object as unknown as Record<string, any>;

    switch (event.type) {
      case "checkout.session.completed":
        if (object.payment_status && object.payment_status !== "unpaid") {
          const paymentId = await findPaymentId(object);
          if (paymentId) await markPaid(paymentId, object);
        }
        break;
      case "checkout.session.async_payment_succeeded": {
        const paymentId = await findPaymentId(object);
        if (paymentId) await markPaid(paymentId, object);
        break;
      }
      case "checkout.session.async_payment_failed": {
        const paymentId = await findPaymentId(object);
        if (paymentId) await markFailed(paymentId, object, "async_payment_failed");
        break;
      }
      case "checkout.session.expired": {
        const paymentId = await findPaymentId(object);
        if (paymentId) await markCancelled(paymentId);
        break;
      }
      case "payment_intent.succeeded": {
        const paymentId = await findPaymentId(object);
        if (paymentId) await markPaid(paymentId, object);
        break;
      }
      case "payment_intent.payment_failed": {
        const paymentId = await findPaymentId(object);
        if (paymentId) await markFailed(paymentId, object);
        break;
      }
      case "invoice.paid": {
        const paymentId = await findPaymentId(object);
        if (paymentId) await markPaid(paymentId, object);
        break;
      }
      case "invoice.payment_failed": {
        const paymentId = await findPaymentId(object);
        if (paymentId) await markFailed(paymentId, object, "invoice_payment_failed");
        break;
      }
      case "invoice.voided": {
        const paymentId = await findPaymentId(object);
        if (paymentId) await markCancelled(paymentId);
        break;
      }
      case "invoice.finalized": {
        const paymentId = await findPaymentId(object);
        if (paymentId) {
          await admin
            .from("payments")
            .update({
              provider_invoice_id: object.id,
              hosted_invoice_url: object.hosted_invoice_url ?? null,
              invoice_pdf_url: object.invoice_pdf ?? null,
              last_provider_event_id: event.id,
              last_provider_event_at: isoFromSeconds(event.created),
            })
            .eq("id", paymentId);
        }
        break;
      }
      case "refund.created":
      case "refund.updated":
      case "refund.failed":
        await syncRefund(object);
        break;
      case "charge.refunded":
        for (const refund of object.refunds?.data ?? []) await syncRefund(refund);
        break;
      case "charge.dispute.created":
      case "charge.dispute.updated":
      case "charge.dispute.closed":
        await syncDispute(object);
        break;
      default:
        break;
    }

    await admin
      .from("stripe_webhook_events")
      .update({ processed_at: new Date().toISOString(), error_text: null })
      .eq("event_id", event.id);

    return json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "webhook_processing_failed";
    console.error("stripe-webhook", event.type, message);
    await admin
      .from("stripe_webhook_events")
      .update({ error_text: message })
      .eq("event_id", event.id);
    return json({ error: "webhook_processing_failed" }, 500);
  }
});
