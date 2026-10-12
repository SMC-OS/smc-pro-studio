import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock3, ReceiptText, XCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, SectionHeading } from "../components/ui";
import { ErrorState, GuestNotice, LoadingState } from "../components/StateViews";
import { fetchPaymentDetail, type PaymentDetail } from "../services/paymentClient";
import { useAuthSession } from "../services/useAuthSession";
import { describeError } from "../services/networkErrors";

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
}

export default function PaymentReturnRoute() {
  const auth = useAuthSession();
  const [params] = useSearchParams();
  const paymentId = params.get("payment_id") ?? "";
  const checkoutClosed = params.get("cancelled") === "1";
  const attempts = useRef(0);
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "ready"; payment: PaymentDetail }
    | { status: "error"; message: string }
  >({ status: "idle" });

  const load = useCallback(async () => {
    if (auth.status !== "authenticated" || !paymentId) return;
    try {
      const payment = await fetchPaymentDetail(paymentId);
      if (!payment) {
        setState({ status: "error", message: "This payment could not be found, or your account does not have access to it." });
        return;
      }
      setState({ status: "ready", payment });
    } catch (error: unknown) {
      setState({ status: "error", message: describeError(error, "Payment status could not be loaded.").message });
    }
  }, [auth.status, paymentId]);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    if (!paymentId) {
      setState({ status: "error", message: "The payment return link is incomplete." });
      return;
    }

    setState({ status: "loading" });
    attempts.current = 0;
    void load();

    const interval = window.setInterval(() => {
      attempts.current += 1;
      if (attempts.current >= 30) {
        window.clearInterval(interval);
        return;
      }
      void load();
    }, 2000);

    return () => window.clearInterval(interval);
  }, [auth.status, load, paymentId]);

  useEffect(() => {
    if (state.status !== "ready") return;
    if (["paid", "refunded", "failed", "cancelled"].includes(state.payment.status)) {
      attempts.current = 30;
    }
  }, [state]);

  if (auth.status === "loading") return <LoadingState label="Checking your account" />;
  if (auth.status === "guest") return <GuestNotice message="Sign in to verify this project payment." />;
  if (state.status === "idle" || state.status === "loading") {
    return <LoadingState label="Checking Stripe payment status" />;
  }
  if (state.status === "error") return <ErrorState message={state.message} onRetry={() => void load()} />;

  const payment = state.payment;
  const paid = payment.status === "paid";
  const refunded = payment.status === "refunded";
  const failed = payment.status === "failed";
  const cancelled = payment.status === "cancelled" || checkoutClosed;
  const pending = !paid && !refunded && !failed && payment.status !== "cancelled";

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <SectionHeading
        eyebrow="Project payment"
        title={paid ? "Payment verified" : refunded ? "Payment refunded" : failed ? "Payment not completed" : cancelled ? "Checkout closed" : "Payment processing"}
        description={
          paid
            ? "Stripe has verified this payment and SMC Pro Studio has updated the project record."
            : refunded
              ? "Stripe has confirmed that this payment was refunded."
              : failed
                ? "Stripe did not complete this payment. You can return to the project and try again."
                : checkoutClosed
                  ? "No successful payment is being claimed from this return screen. The project record remains the source of truth."
                  : "We are waiting for Stripe's signed webhook before showing this payment as paid."
        }
      />

      <Card className="p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--smc-limestone)]">
            {paid || refunded ? (
              <CheckCircle2 className="h-5 w-5 text-[var(--smc-success)]" aria-hidden="true" />
            ) : failed || cancelled ? (
              <XCircle className="h-5 w-5 text-red-700" aria-hidden="true" />
            ) : (
              <Clock3 className="h-5 w-5 text-[var(--smc-mineral-bronze)]" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--smc-charcoal-faint)]">Amount</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--smc-charcoal)]">
              {money(Number(payment.amount), payment.currency)}
            </p>
            <p className="mt-2 text-sm text-[var(--smc-charcoal-soft)]">
              Status: <strong>{payment.status.replace(/_/g, " ")}</strong>
            </p>
            {pending && (
              <p className="mt-3 text-sm leading-6 text-[var(--smc-charcoal-soft)]">
                This screen refreshes automatically for about one minute. If Stripe is still processing after that, you can safely return to the project and check again later.
              </p>
            )}
            {payment.failure_message && (
              <p className="mt-3 text-sm text-red-700">{payment.failure_message}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            to={`/projects/${payment.project_id}`}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-full bg-[var(--smc-charcoal)] px-5 text-sm font-semibold text-white"
          >
            Return to project
          </Link>
          {payment.receipt_url && (
            <a
              href={payment.receipt_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full border border-[var(--smc-border-strong)] px-5 text-sm font-semibold"
            >
              <ReceiptText className="h-4 w-4" aria-hidden="true" /> Open receipt
            </a>
          )}
        </div>
      </Card>

      <p className="text-center text-xs leading-5 text-[var(--smc-charcoal-faint)]">
        A Stripe redirect alone never changes a payment to paid. SMC Pro Studio waits for a verified Stripe webhook and then updates the protected payment record.
      </p>
    </div>
  );
}
