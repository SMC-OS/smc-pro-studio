import { getSupabaseClient, isSupabaseConfigured } from "../../services/supabaseClient";

export type ProjectPaymentKind = "deposit" | "stage" | "balance" | "other";
export type ProjectPaymentStatus = "pending" | "requires_action" | "paid" | "failed" | "refunded" | "cancelled";
export type ProjectPaymentCollectionMethod = "checkout" | "invoice";

export interface PaymentDetail {
  id: string;
  project_id: string;
  quote_id: string | null;
  variation_id: string | null;
  customer_id: string;
  seller_id: string | null;
  requested_by: string | null;
  kind: ProjectPaymentKind | "refund";
  status: ProjectPaymentStatus;
  currency: string;
  amount: number;
  request_note: string | null;
  collection_method: ProjectPaymentCollectionMethod;
  provider_account_id: string | null;
  due_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  refunded_amount: number;
  disputed_amount: number;
  receipt_url: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;
  failure_code: string | null;
  failure_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRefund {
  id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: string;
  reason: string | null;
  provider_created_at: string | null;
  created_at: string;
}

export interface PaymentDispute {
  id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: string;
  reason: string | null;
  evidence_due_at: string | null;
  provider_created_at: string | null;
  closed_at: string | null;
  created_at: string;
}

function client() {
  if (!isSupabaseConfigured) throw new Error("SMC Pro Studio is not connected to its workspace.");
  return getSupabaseClient();
}

async function currentUserId(): Promise<string> {
  const { data, error } = await client().auth.getUser();
  if (error) throw new Error("Your session could not be verified. Please try again.", { cause: error });
  if (!data.user) throw new Error("Sign in to continue.");
  return data.user.id;
}

export async function requestProjectPayment(input: {
  projectId: string;
  kind: ProjectPaymentKind;
  amount: number | null;
  dueAt: string | null;
  collectionMethod: ProjectPaymentCollectionMethod;
  note: string;
}): Promise<PaymentDetail> {
  await currentUserId();
  const note = input.note.trim();
  if (note.length > 1000) throw new Error("Payment note must be 1000 characters or fewer.");
  if (input.amount !== null && (!Number.isFinite(input.amount) || input.amount <= 0)) {
    throw new Error("Payment amount must be greater than zero.");
  }
  if (input.collectionMethod === "invoice" && !input.dueAt) {
    throw new Error("Choose a due date for an invoice.");
  }

  const { data, error } = await client().rpc("request_project_payment", {
    p_project_id: input.projectId,
    p_kind: input.kind,
    p_amount: input.amount,
    p_due_at: input.dueAt,
    p_collection_method: input.collectionMethod,
    p_note: note || null,
  });
  if (error || !data) {
    throw new Error("The project payment could not be requested. Please check the outstanding balance and try again.", {
      cause: error ?? undefined,
    });
  }
  return data as PaymentDetail;
}

export async function createProjectCheckout(paymentId: string): Promise<{
  checkoutUrl: string | null;
  sessionId: string;
  reused: boolean;
  processing?: boolean;
}> {
  await currentUserId();
  const { data, error } = await client().functions.invoke("create-project-checkout", {
    body: { paymentId },
  });
  if (error) throw new Error("Secure checkout could not be opened. Please try again.", { cause: error });
  if (data?.error) throw new Error(data.message || "Secure checkout could not be opened.");
  if (!data?.sessionId) throw new Error("Stripe did not return a checkout session.");
  return data;
}

export async function createProjectInvoice(paymentId: string): Promise<{
  invoiceId: string;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
  reused: boolean;
}> {
  await currentUserId();
  const { data, error } = await client().functions.invoke("create-project-invoice", {
    body: { paymentId },
  });
  if (error) throw new Error("The Stripe invoice could not be created. Please try again.", { cause: error });
  if (data?.error) throw new Error(data.message || "The Stripe invoice could not be created.");
  if (!data?.invoiceId) throw new Error("Stripe did not return an invoice.");
  return data;
}

export async function fetchPaymentDetail(paymentId: string): Promise<PaymentDetail | null> {
  await currentUserId();
  const { data, error } = await client()
    .from("payments")
    .select(
      "id, project_id, quote_id, variation_id, customer_id, seller_id, requested_by, kind, status, currency, amount, request_note, collection_method, provider_account_id, due_at, paid_at, cancelled_at, refunded_amount, disputed_amount, receipt_url, hosted_invoice_url, invoice_pdf_url, failure_code, failure_message, created_at, updated_at",
    )
    .eq("id", paymentId)
    .maybeSingle();
  if (error) throw new Error("Payment status could not be loaded. Please try again.", { cause: error });
  return data as PaymentDetail | null;
}

export async function fetchPaymentAdjustments(paymentId: string): Promise<{
  refunds: PaymentRefund[];
  disputes: PaymentDispute[];
}> {
  await currentUserId();
  const supabase = client();
  const [refundResult, disputeResult] = await Promise.all([
    supabase
      .from("payment_refunds")
      .select("id, payment_id, amount, currency, status, reason, provider_created_at, created_at")
      .eq("payment_id", paymentId)
      .order("created_at", { ascending: false }),
    supabase
      .from("payment_disputes")
      .select("id, payment_id, amount, currency, status, reason, evidence_due_at, provider_created_at, closed_at, created_at")
      .eq("payment_id", paymentId)
      .order("created_at", { ascending: false }),
  ]);
  if (refundResult.error || disputeResult.error) {
    throw new Error("Payment adjustments could not be loaded. Please try again.", {
      cause: refundResult.error ?? disputeResult.error ?? undefined,
    });
  }
  return {
    refunds: (refundResult.data ?? []) as PaymentRefund[],
    disputes: (disputeResult.data ?? []) as PaymentDispute[],
  };
}


export async function refundProjectPayment(
  paymentId: string,
  amount: number | null = null,
): Promise<{
  refundId: string;
  status: string | null;
  amount: number;
  currency: string;
  pendingWebhookReconciliation: boolean;
}> {
  await currentUserId();
  if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) {
    throw new Error("Refund amount must be greater than zero.");
  }
  const { data, error } = await client().functions.invoke("refund-project-payment", {
    body: { paymentId, amount },
  });
  if (error) throw new Error("The Stripe refund could not be started. Please try again.", { cause: error });
  if (data?.error) throw new Error(data.message || "The Stripe refund could not be started.");
  if (!data?.refundId) throw new Error("Stripe did not return a refund.");
  return data;
}
