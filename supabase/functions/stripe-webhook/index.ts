import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import Stripe from "npm:stripe@22.6.0";

const stripeEnvironment = Deno.env.get("STRIPE_ENVIRONMENT") ?? "sandbox";
const allowLive = Deno.env.get("ALLOW_LIVE_STRIPE") === "true";
const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const webhookSecret = Deno.env.get("STRIPE_CONNECT_WEBHOOK_SIGNING_SECRET") ?? "";

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
  if (!stripeKey || !webhookSecret) return "Stripe Connect webhook secrets are not configured.";
  if (!["sandbox", "live"].includes(stripeEnvironment)) {
    return "STRIPE_ENVIRONMENT must be sandbox or live.";
  }
  if (stripeEnvironment === "sandbox" && stripeKey.includes("_live_")) {
    return "A live Stripe key cannot be used in the sandbox environment.";
  }
  if (stripeEnvironment === "live" && !allowLive) {
    return "Live Stripe webhooks are disabled for this deployment.";
  }
  if (stripeEnvironment === "live" && stripeKey.includes("_test_")) {
    return "A sandbox/test Stripe key cannot be used in the live environment.";
  }
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

function currencyUpper(value: unknown): string | null {
  return typeof value === "string" ? value.toUpperCase() : null;
}

function majorFromMinor(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value / 100 : null;
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

  const expectedLiveMode = stripeEnvironment === "live";
  if (event.livemode !== expectedLiveMode) {
    return json({ error: "stripe_environment_mismatch" }, 400);
  }

  const connectedAccountId = (event as Stripe.Event & { account?: string }).account ?? null;
  const paymentEvent =
    event.type.startsWith("checkout.session.") ||
    event.type.startsWith("payment_intent.") ||
    event.type.startsWith("invoice.") ||
    event.type.startsWith("refund.") ||
    event.type.startsWith("charge.refunded") ||
    event.type.startsWith("charge.dispute.");

  // Project payments are direct charges. Their events must arrive through a
  // Connect event destination and identify the professional's Stripe account.
  if (paymentEvent && !connectedAccountId) {
    return json({ error: "connected_account_required" }, 400);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", adminKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const objectForClaim = event.data.object as { id?: string };
  const { data: claimed, error: claimError } = await admin.rpc("claim_stripe_webhook_event", {
    p_event_id: event.id,
    p_event_type: event.type,
    p_livemode: event.livemode,
    p_provider_account_id: connectedAccountId,
    p_object_id: typeof objectForClaim?.id === "string" ? objectForClaim.id : null,
    p_provider_created_at: isoFromSeconds(event.created),
  });
  if (claimError) return json({ error: "webhook_event_claim_failed" }, 500);
  if (!claimed) {
    const { data: existingEvent } = await admin
      .from("stripe_webhook_events")
      .select("processed_at")
      .eq("event_id", event.id)
      .maybeSingle();
    if (existingEvent?.processed_at) return json({ received: true, duplicate: true });
    return json({ error: "webhook_event_processing" }, 503);
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
      let query = admin.from("payments").select("id").eq(column, value);
      if (connectedAccountId) query = query.eq("provider_account_id", connectedAccountId);
      const { data } = await query.maybeSingle();
      if (data?.id) return data.id;
    }
    return null;
  }

  async function getPayment(paymentId: string) {
    const { data, error } = await admin
      .from("payments")
      .select("id, project_id, quote_id, customer_id, seller_id, provider_account_id, amount, currency, status, refunded_amount")
      .eq("id", paymentId)
      .single();
    if (error || !data) throw new Error("payment_not_found");

    if (!connectedAccountId || data.provider_account_id !== connectedAccountId) {
      throw new Error("payment_connected_account_mismatch");
    }

    const { data: sellerAccount, error: sellerError } = await admin
      .from("stripe_connected_accounts")
      .select("professional_id, provider_account_id, fees_collector, losses_collector")
      .eq("professional_id", data.seller_id)
      .eq("environment", stripeEnvironment)
      .eq("provider_account_id", connectedAccountId)
      .maybeSingle();

    if (
      sellerError ||
      !sellerAccount ||
      sellerAccount.fees_collector !== "stripe" ||
      sellerAccount.losses_collector !== "stripe"
    ) {
      throw new Error("seller_connect_configuration_mismatch");
    }
    return data;
  }

  function assertCommercialIdentity(payment: Awaited<ReturnType<typeof getPayment>>, object: Record<string, any>) {
    const metaSeller = object.metadata?.smc_seller_id;
    const metaCustomer = object.metadata?.smc_customer_id;
    const metaProject = object.metadata?.smc_project_id;
    if (metaSeller && metaSeller !== payment.seller_id) throw new Error("seller_metadata_mismatch");
    if (metaCustomer && metaCustomer !== payment.customer_id) throw new Error("customer_metadata_mismatch");
    if (metaProject && metaProject !== payment.project_id) throw new Error("project_metadata_mismatch");
  }

  function assertAmount(payment: Awaited<ReturnType<typeof getPayment>>, object: Record<string, any>) {
    const expectedAmount = Number(payment.amount);
    const objectCurrency = currencyUpper(object.currency);
    const candidates = [
      majorFromMinor(object.amount_total),
      majorFromMinor(object.amount_received),
      majorFromMinor(object.amount_paid),
      majorFromMinor(object.amount_due),
      majorFromMinor(object.amount),
    ].filter((value): value is number => value !== null);

    if (objectCurrency && objectCurrency !== payment.currency) throw new Error("payment_currency_mismatch");
    if (candidates.length > 0 && !candidates.some((value) => Math.abs(value - expectedAmount) < 0.000001)) {
      throw new Error("payment_amount_mismatch");
    }
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
    if (!paymentIntentId || !connectedAccountId) {
      return { chargeId: null as string | null, receiptUrl: null as string | null };
    }
    const pi = await stripe.paymentIntents.retrieve(
      paymentIntentId,
      { expand: ["latest_charge"] },
      { stripeAccount: connectedAccountId },
    );
    const charge = pi.latest_charge;
    if (charge && typeof charge === "object") {
      return { chargeId: charge.id, receiptUrl: charge.receipt_url ?? null };
    }
    return { chargeId: stripeId(charge), receiptUrl: null };
  }

  async function markPaid(paymentId: string, object: Record<string, any>) {
    const payment = await getPayment(paymentId);
    assertCommercialIdentity(payment, object);
    assertAmount(payment, object);
    if (payment.status === "paid" || payment.status === "refunded") return;

    const paymentIntentId =
      stripeId(object.payment_intent) ??
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
      "Stripe has verified your payment to the project professional.",
      "Project payment received",
      "Stripe has verified the customer’s direct payment to your connected account.",
    );
  }

  async function markFailed(paymentId: string, object: Record<string, any>, code = "payment_failed") {
    const payment = await getPayment(paymentId);
    assertCommercialIdentity(payment, object);
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
    assertCommercialIdentity(payment, refund);

    const rawStatus = typeof refund.status === "string" ? refund.status : "pending";
    const status = rawStatus === "canceled" ? "cancelled" : rawStatus;
    const normalizedStatus = ["pending", "succeeded", "failed", "cancelled"].includes(status) ? status : "pending";
    const amount = Number(refund.amount ?? 0) / 100;
    if (amount <= 0 || amount > Number(payment.amount)) throw new Error("refund_amount_invalid");
    if (currencyUpper(refund.currency) !== payment.currency) throw new Error("refund_currency_mismatch");

    const { data: previousRefund } = await admin
      .from("payment_refunds")
      .select("status")
      .eq("provider_refund_id", refund.id)
      .maybeSingle();

    const { error: refundError } = await admin.from("payment_refunds").upsert(
      {
        payment_id: paymentId,
        provider_account_id: connectedAccountId,
        provider_refund_id: refund.id,
        amount,
        currency: String(refund.currency).toUpperCase(),
        status: normalizedStatus,
        reason: typeof refund.reason === "string" ? refund.reason : null,
        provider_created_at: isoFromSeconds(refund.created),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider_refund_id" },
    );
    if (refundError) throw refundError;

    const { data: rows, error: rowsError } = await admin
      .from("payment_refunds")
      .select("amount,status")
      .eq("payment_id", paymentId)
      .eq("provider_account_id", connectedAccountId);
    if (rowsError) throw rowsError;

    const refunded = (rows ?? [])
      .filter((row) => row.status === "succeeded")
      .reduce((sum, row) => sum + Number(row.amount), 0);

    const fullyRefunded = refunded >= Number(payment.amount);
    const { error } = await admin
      .from("payments")
      .update({
        refunded_amount: Math.min(refunded, Number(payment.amount)),
        status: fullyRefunded ? "refunded" : payment.status === "refunded" ? "refunded" : "paid",
        last_provider_event_id: event.id,
        last_provider_event_at: isoFromSeconds(event.created),
      })
      .eq("id", paymentId);
    if (error) throw error;

    if (normalizedStatus === "succeeded" && previousRefund?.status !== "succeeded") {
      await notifyPayment(
        payment,
        fullyRefunded ? "Payment refunded" : "Partial refund recorded",
        fullyRefunded
          ? "Stripe has confirmed that the project professional refunded this payment."
          : "Stripe has confirmed a partial refund from the project professional.",
        fullyRefunded ? "Project payment refunded" : "Project payment partially refunded",
      );
    } else if (normalizedStatus === "failed" && previousRefund?.status !== "failed") {
      await notifyPayment(
        payment,
        "Refund not completed",
        "Stripe reported that the professional's refund attempt failed.",
        "Project refund failed",
      );
    }
  }

  async function syncDispute(dispute: Record<string, any>) {
    const paymentId = await findPaymentId(dispute);
    if (!paymentId) return;
    const payment = await getPayment(paymentId);
    const amount = Number(dispute.amount ?? 0) / 100;
    const status = typeof dispute.status === "string" ? dispute.status : "unknown";
    if (amount <= 0 || amount > Number(payment.amount)) throw new Error("dispute_amount_invalid");
    if (currencyUpper(dispute.currency) !== payment.currency) throw new Error("dispute_currency_mismatch");

    const { error: disputeError } = await admin.from("payment_disputes").upsert(
      {
        payment_id: paymentId,
        provider_account_id: connectedAccountId,
        provider_dispute_id: dispute.id,
        amount,
        currency: String(dispute.currency).toUpperCase(),
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
      .eq("payment_id", paymentId)
      .eq("provider_account_id", connectedAccountId);
    if (rowsError) throw rowsError;

    const disputedAmount = (rows ?? [])
      .filter((row) => row.status !== "won")
      .reduce((sum, row) => sum + Number(row.amount), 0);

    const { error: updateError } = await admin
      .from("payments")
      .update({
        disputed_amount: disputedAmount,
        last_provider_event_id: event.id,
        last_provider_event_at: isoFromSeconds(event.created),
      })
      .eq("id", paymentId);
    if (updateError) throw updateError;

    await notifyPayment(
      payment,
      "Payment dispute updated",
      "Stripe reported a dispute update on the professional's payment account.",
      "Project payment dispute updated",
      "Stripe has updated a dispute on your connected account. Review it in your Stripe Dashboard.",
    );
  }

  try {
    const object = event.data.object as unknown as Record<string, any>;

    switch (event.type) {
      case "checkout.session.completed": {
        const paymentId = await findPaymentId(object);
        if (paymentId && object.payment_status === "paid") await markPaid(paymentId, object);
        break;
      }
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
          const payment = await getPayment(paymentId);
          assertCommercialIdentity(payment, object);
          assertAmount(payment, object);
          const { error } = await admin
            .from("payments")
            .update({
              provider_invoice_id: object.id,
              hosted_invoice_url: object.hosted_invoice_url ?? null,
              invoice_pdf_url: object.invoice_pdf ?? null,
              last_provider_event_id: event.id,
              last_provider_event_at: isoFromSeconds(event.created),
            })
            .eq("id", paymentId);
          if (error) throw error;
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
    console.error("stripe-connect-webhook", event.type, connectedAccountId, message);
    await admin
      .from("stripe_webhook_events")
      .update({ error_text: message })
      .eq("event_id", event.id);
    return json({ error: "webhook_processing_failed" }, 500);
  }
});
