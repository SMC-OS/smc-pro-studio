import { useMemo, useState } from "react";
import { ExternalLink, FileText, PoundSterling, ReceiptText, ShieldCheck } from "lucide-react";
import { Card } from "./ui";
import type { LaunchProjectDetail } from "../services/launchClient";
import {
  createProjectCheckout,
  createProjectInvoice,
  requestProjectPayment,
  type ProjectPaymentCollectionMethod,
  type ProjectPaymentKind,
} from "../services/paymentClient";
import { describeError } from "../services/networkErrors";

function money(amount: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(amount);
}

function label(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function when(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function openHostedPayment(url: string) {
  // On web this navigates directly to Stripe. In the Android build the HTTPS
  // return URL is associated with SMC Pro Studio, so the completed flow can
  // return through the existing App Link configuration.
  window.location.assign(url);
}

export default function ProjectPaymentsCard({
  project,
  me,
  canManageProject,
  isCustomer,
  onChanged,
}: {
  project: LaunchProjectDetail;
  me: string;
  canManageProject: boolean;
  isCustomer: boolean;
  onChanged: () => Promise<void> | void;
}) {
  const [kind, setKind] = useState<ProjectPaymentKind>("deposit");
  const [amount, setAmount] = useState("");
  const [collectionMethod, setCollectionMethod] = useState<ProjectPaymentCollectionMethod>("checkout");
  const [dueAt, setDueAt] = useState("");
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const currency = project.quote?.currency ?? "GBP";
  const approvedVariationTotal = useMemo(
    () =>
      project.variations
        .filter((variation) => variation.status === "accepted")
        .reduce((sum, variation) => sum + Number(variation.amount_delta), 0),
    [project.variations],
  );
  const approvedProjectValue = Number(project.quote?.total ?? 0) + approvedVariationTotal;

  const paidNet = useMemo(
    () =>
      project.payments
        .filter((payment) => payment.status === "paid" || payment.status === "refunded")
        .reduce(
          (sum, payment) =>
            sum + Math.max(Number(payment.amount) - Number(payment.refunded_amount ?? 0), 0),
          0,
        ),
    [project.payments],
  );

  const committed = useMemo(
    () =>
      project.payments.reduce((sum, payment) => {
        if (payment.status === "pending" || payment.status === "requires_action") {
          return sum + Number(payment.amount);
        }
        if (payment.status === "paid" || payment.status === "refunded") {
          return sum + Math.max(Number(payment.amount) - Number(payment.refunded_amount ?? 0), 0);
        }
        return sum;
      }, 0),
    [project.payments],
  );

  const outstandingToCollect = Math.max(approvedProjectValue - paidNet, 0);
  const remainingToRequest = Math.max(approvedProjectValue - committed, 0);

  async function createRequest() {
    try {
      setCreating(true);
      setError("");
      const numericAmount = amount.trim() ? Number(amount) : null;
      await requestProjectPayment({
        projectId: project.id,
        kind,
        amount: numericAmount,
        dueAt: collectionMethod === "invoice" && dueAt ? new Date(dueAt).toISOString() : null,
        collectionMethod,
        note,
      });
      setAmount("");
      setDueAt("");
      setNote("");
      await onChanged();
    } catch (cause: unknown) {
      setError(describeError(cause, "The payment request could not be created.").message);
    } finally {
      setCreating(false);
    }
  }

  async function startCheckout(paymentId: string) {
    try {
      setBusyId(paymentId);
      setError("");
      const result = await createProjectCheckout(paymentId);
      if (result.checkoutUrl) {
        openHostedPayment(result.checkoutUrl);
        return;
      }
      await onChanged();
    } catch (cause: unknown) {
      setError(describeError(cause, "Secure Stripe Checkout could not be opened.").message);
    } finally {
      setBusyId(null);
    }
  }

  async function issueInvoice(paymentId: string) {
    try {
      setBusyId(paymentId);
      setError("");
      await createProjectInvoice(paymentId);
      await onChanged();
    } catch (cause: unknown) {
      setError(describeError(cause, "The Stripe invoice could not be created.").message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <PoundSterling className="h-5 w-5 text-[var(--smc-mineral-bronze)]" aria-hidden="true" />
        <h2 className="font-semibold">Payments</h2>
      </div>
      <p className="mt-1 text-sm text-[var(--smc-charcoal-soft)]">
        Project amounts come from the approved quote and accepted variations. Stripe verification — not the return screen — decides whether a payment is paid.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[var(--smc-radius-card)] bg-[var(--smc-surface-sunken)] p-4">
          <p className="text-xs font-medium text-[var(--smc-charcoal-faint)]">Approved project value</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{money(approvedProjectValue, currency)}</p>
        </div>
        <div className="rounded-[var(--smc-radius-card)] bg-[var(--smc-surface-sunken)] p-4">
          <p className="text-xs font-medium text-[var(--smc-charcoal-faint)]">Verified paid</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{money(paidNet, currency)}</p>
        </div>
        <div className="rounded-[var(--smc-radius-card)] bg-[var(--smc-surface-sunken)] p-4">
          <p className="text-xs font-medium text-[var(--smc-charcoal-faint)]">Outstanding balance</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{money(outstandingToCollect, currency)}</p>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-[var(--smc-radius-card)] border border-red-200 bg-red-50 p-4">
          <p role="alert" className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <div className="mt-5 grid gap-3">
        {project.payments.length === 0 ? (
          <p className="text-sm text-[var(--smc-charcoal-soft)]">No project payments requested yet.</p>
        ) : (
          project.payments.map((payment) => {
            const paymentBusy = busyId === payment.id;
            const isRequester = payment.requested_by === me;
            const netPaid = Math.max(Number(payment.amount) - Number(payment.refunded_amount ?? 0), 0);

            return (
              <div key={payment.id} className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{label(payment.kind)} payment</p>
                    <p className="mt-1 text-xs text-[var(--smc-charcoal-faint)]">
                      {label(payment.collection_method)} · requested {when(payment.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{money(Number(payment.amount), payment.currency)}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--smc-mineral-bronze)]">
                      {label(payment.status)}
                    </p>
                  </div>
                </div>

                {payment.request_note && (
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[var(--smc-charcoal-soft)]">{payment.request_note}</p>
                )}

                {payment.due_at && (
                  <p className="mt-2 text-xs text-[var(--smc-charcoal-faint)]">Due {when(payment.due_at)}</p>
                )}

                {payment.status === "paid" && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-[var(--smc-success)]">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    Verified by Stripe · net {money(netPaid, payment.currency)}
                  </div>
                )}

                {Number(payment.refunded_amount ?? 0) > 0 && (
                  <p className="mt-2 text-sm text-[var(--smc-charcoal-soft)]">
                    Refunded: <strong>{money(Number(payment.refunded_amount), payment.currency)}</strong>
                  </p>
                )}
                {Number(payment.disputed_amount ?? 0) > 0 && (
                  <p className="mt-2 text-sm text-red-700">
                    Disputed amount: <strong>{money(Number(payment.disputed_amount), payment.currency)}</strong>
                  </p>
                )}
                {payment.failure_message && (
                  <p className="mt-2 text-sm text-red-700">{payment.failure_message}</p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {isCustomer &&
                    payment.collection_method === "checkout" &&
                    (payment.status === "pending" || payment.status === "requires_action" || payment.status === "failed" || payment.status === "cancelled") && (
                      <button
                        type="button"
                        onClick={() => void startCheckout(payment.id)}
                        disabled={paymentBusy}
                        className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[var(--smc-charcoal)] px-5 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {paymentBusy ? "Opening Stripe…" : payment.status === "failed" || payment.status === "cancelled" ? "Try payment again" : "Pay securely with Stripe"}
                      </button>
                    )}

                  {payment.collection_method === "invoice" && payment.hosted_invoice_url && isCustomer && (
                    <a
                      href={payment.hosted_invoice_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[var(--smc-charcoal)] px-5 text-sm font-semibold text-white"
                    >
                      <FileText className="h-4 w-4" aria-hidden="true" /> Pay Stripe invoice
                    </a>
                  )}

                  {canManageProject &&
                    isRequester &&
                    payment.collection_method === "invoice" &&
                    !payment.hosted_invoice_url &&
                    payment.status !== "paid" &&
                    payment.status !== "refunded" && (
                      <button
                        type="button"
                        onClick={() => void issueInvoice(payment.id)}
                        disabled={paymentBusy}
                        className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[var(--smc-border-strong)] px-5 text-sm font-semibold disabled:opacity-50"
                      >
                        <FileText className="h-4 w-4" aria-hidden="true" />
                        {paymentBusy ? "Creating invoice…" : "Create Stripe invoice"}
                      </button>
                    )}

                  {payment.receipt_url && (
                    <a
                      href={payment.receipt_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-[var(--smc-mineral-bronze)] hover:underline"
                    >
                      <ReceiptText className="h-4 w-4" aria-hidden="true" /> Receipt
                    </a>
                  )}
                  {payment.invoice_pdf_url && (
                    <a
                      href={payment.invoice_pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-[var(--smc-mineral-bronze)] hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" /> Invoice PDF
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {canManageProject && remainingToRequest > 0 && (
        <div className="mt-5 grid gap-3 border-t border-[var(--smc-border)] pt-5">
          <div>
            <h3 className="text-sm font-semibold">Request project payment</h3>
            <p className="mt-1 text-xs text-[var(--smc-charcoal-faint)]">
              Up to {money(remainingToRequest, currency)} remains available to request. The server rejects any request above the approved project value.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Payment stage
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value as ProjectPaymentKind)}
                className="min-h-[48px] rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white px-3"
              >
                <option value="deposit">Deposit</option>
                <option value="stage">Stage payment</option>
                <option value="balance">Balance</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Collection method
              <select
                value={collectionMethod}
                onChange={(event) => setCollectionMethod(event.target.value as ProjectPaymentCollectionMethod)}
                className="min-h-[48px] rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white px-3"
              >
                <option value="checkout">Stripe Checkout</option>
                <option value="invoice">Stripe invoice</option>
              </select>
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium">
            Amount (£) <span className="font-normal text-[var(--smc-charcoal-faint)]">(leave blank for all remaining approved value)</span>
            <input
              type="number"
              min="0.01"
              max={remainingToRequest}
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={remainingToRequest.toFixed(2)}
              className="min-h-[48px] rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white px-3 tabular-nums"
            />
          </label>

          {collectionMethod === "invoice" && (
            <label className="grid gap-2 text-sm font-medium">
              Invoice due
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                className="min-h-[48px] rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white px-3"
              />
            </label>
          )}

          <label className="grid gap-2 text-sm font-medium">
            Note <span className="font-normal text-[var(--smc-charcoal-faint)]">(optional)</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="e.g. Deposit due before materials are ordered."
              className="rounded-[var(--smc-radius-card)] border border-[var(--smc-border)] bg-white p-3 leading-6"
            />
          </label>

          <button
            type="button"
            onClick={() => void createRequest()}
            disabled={creating}
            className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[var(--smc-border-strong)] px-5 text-sm font-semibold disabled:opacity-50"
          >
            {creating ? "Creating request…" : "Request payment"}
          </button>
        </div>
      )}

      {canManageProject && remainingToRequest <= 0 && (
        <p className="mt-5 border-t border-[var(--smc-border)] pt-5 text-sm text-[var(--smc-charcoal-soft)]">
          All currently approved project value is already paid or covered by active payment requests.
        </p>
      )}
    </Card>
  );
}
