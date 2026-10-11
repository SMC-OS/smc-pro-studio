import { useCallback, useEffect, useState } from "react";
import { CreditCard, ExternalLink, ShieldCheck } from "lucide-react";
import { Card } from "./ui";
import {
  beginProfessionalStripeOnboarding,
  fetchProfessionalStripeStatus,
  type ProfessionalStripeStatus,
} from "../services/stripeConnectClient";
import { describeError } from "../services/networkErrors";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; stripe: ProfessionalStripeStatus };

function statusLabel(stripe: ProfessionalStripeStatus): string {
  if (!stripe.connected) return "Not connected";
  if (stripe.ready) return "Ready for payments";
  if (!stripe.onboardingComplete) return "Onboarding required";
  return "Stripe review in progress";
}

export default function ProfessionalStripeCard() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setState({ status: "loading" });
      const stripe = await fetchProfessionalStripeStatus();
      setState({ status: "ready", stripe });
    } catch (error: unknown) {
      setState({
        status: "error",
        message: describeError(error, "Stripe account status could not be loaded.").message,
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onboard() {
    try {
      setBusy(true);
      const stripe = await beginProfessionalStripeOnboarding();
      if (stripe.onboardingUrl) {
        window.location.assign(stripe.onboardingUrl);
        return;
      }
      setState({ status: "ready", stripe });
    } catch (error: unknown) {
      setState({
        status: "error",
        message: describeError(error, "Stripe onboarding could not be opened.").message,
      });
    } finally {
      setBusy(false);
    }
  }

  if (state.status === "loading") {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" aria-hidden="true" />
          <h2 className="font-semibold">Payments with Stripe</h2>
        </div>
        <p className="mt-3 text-sm text-[var(--smc-charcoal-soft)]">Checking your payment account…</p>
      </Card>
    );
  }

  if (state.status === "error") {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" aria-hidden="true" />
          <h2 className="font-semibold">Payments with Stripe</h2>
        </div>
        <p role="alert" className="mt-3 text-sm text-red-700">{state.message}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full border border-[var(--smc-border-strong)] px-4 text-sm font-semibold"
        >
          Try again
        </button>
      </Card>
    );
  }

  const stripe = state.stripe;
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" aria-hidden="true" />
          <h2 className="font-semibold">Payments with Stripe</h2>
        </div>
        <span className="rounded-full bg-[var(--smc-limestone)] px-3 py-1.5 text-xs font-semibold text-[var(--smc-charcoal)]">
          {statusLabel(stripe)}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-[var(--smc-charcoal-soft)]">
        You are the legal seller and invoice issuer for your projects. Homeowner payments are made directly to your connected Stripe account. Stripe deducts its processing fees from your account; SMC Pro Studio takes no transaction commission in V1.
      </p>

      <div className="mt-4 grid gap-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[var(--smc-charcoal-soft)]">Payment processing fees</span>
          <strong>Professional pays Stripe</strong>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[var(--smc-charcoal-soft)]">SMC Pro Studio commission</span>
          <strong>0%</strong>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[var(--smc-charcoal-soft)]">Negative-balance liability</span>
          <strong>{stripe.lossesCollector === "stripe" ? "Stripe managed" : "Check required"}</strong>
        </div>
        {stripe.connected && (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--smc-charcoal-soft)]">Card payments</span>
              <strong>{stripe.chargesEnabled ? "Enabled" : stripe.cardPaymentsStatus ?? "Pending"}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--smc-charcoal-soft)]">Payouts</span>
              <strong>{stripe.payoutsEnabled ? "Enabled" : stripe.payoutsStatus ?? "Pending"}</strong>
            </div>
            {stripe.payoutSchedule && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--smc-charcoal-soft)]">Payout schedule</span>
                <strong className="capitalize">{stripe.payoutSchedule}</strong>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-5 rounded-[var(--smc-radius-card)] bg-[var(--smc-surface-sunken)] p-4 text-sm leading-6 text-[var(--smc-charcoal-soft)]">
        Refunds and chargebacks are applied to your connected Stripe account because the project charge is yours. With the approved Managed Risk configuration, Stripe is responsible for unrecoverable connected-account negative balances; your own business remains responsible for the underlying customer transaction and dispute response.
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {!stripe.ready && (
          <button
            type="button"
            onClick={() => void onboard()}
            disabled={busy}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[var(--smc-charcoal)] px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {busy ? "Opening Stripe…" : stripe.connected ? "Continue Stripe setup" : "Connect Stripe"}
          </button>
        )}
        {stripe.ready && (
          <a
            href="https://dashboard.stripe.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[var(--smc-border-strong)] px-5 text-sm font-semibold"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" /> Open Stripe Dashboard
          </a>
        )}
        {stripe.connected && (
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[var(--smc-border-strong)] px-5 text-sm font-semibold"
          >
            Refresh status
          </button>
        )}
      </div>

      {stripe.environment === "sandbox" && (
        <p className="mt-4 text-xs font-medium text-[var(--smc-charcoal-faint)]">
          Staging uses an isolated Stripe Sandbox. No real money moves here.
        </p>
      )}
    </Card>
  );
}
