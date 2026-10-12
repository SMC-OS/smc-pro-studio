import { getSupabaseClient, isSupabaseConfigured } from "../../services/supabaseClient";

export interface ProfessionalStripeStatus {
  connected: boolean;
  environment: "sandbox" | "live";
  accountId?: string;
  ready: boolean;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  dashboard: "full";
  feesCollector: "stripe";
  lossesCollector: "stripe";
  requirementsCollector?: "stripe" | "application" | null;
  cardPaymentsStatus?: string | null;
  payoutsStatus?: string | null;
  payoutSchedule?: string | null;
  payoutDelayDays?: number | null;
  debitNegativeBalances?: boolean | null;
  platformCommissionPercent: 0;
  onboardingUrl?: string;
}

function client() {
  if (!isSupabaseConfigured) throw new Error("SMC Pro Studio is not connected to its workspace.");
  return getSupabaseClient();
}

async function invoke(action: "status" | "onboard"): Promise<ProfessionalStripeStatus> {
  const { data, error } = await client().functions.invoke("connect-professional-account", {
    body: { action },
  });
  if (error) throw new Error("Stripe account status could not be loaded. Please try again.", { cause: error });
  if (data?.error) throw new Error(data.message || "Stripe account setup could not be completed.");
  return data as ProfessionalStripeStatus;
}

export function fetchProfessionalStripeStatus(): Promise<ProfessionalStripeStatus> {
  return invoke("status");
}

export function beginProfessionalStripeOnboarding(): Promise<ProfessionalStripeStatus> {
  return invoke("onboard");
}
