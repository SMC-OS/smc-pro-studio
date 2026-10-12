import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import Stripe from "npm:stripe@22.6.0";

const stripeEnvironment = Deno.env.get("STRIPE_ENVIRONMENT") ?? "sandbox";
const allowLive = Deno.env.get("ALLOW_LIVE_STRIPE") === "true";
const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const appBaseUrl = (Deno.env.get("APP_BASE_URL") ?? "https://smcprostudio.app").replace(/\/$/, "");

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
  if (stripeEnvironment === "live" && !allowLive) return "Live Stripe Connect is disabled for this deployment.";
  if (stripeEnvironment === "live" && stripeKey.includes("_test_")) {
    return "A sandbox/test Stripe key cannot be used in the live environment.";
  }
  return null;
}

function nestedStatus(value: unknown, path: string[]): string | null {
  let current: unknown = value;
  for (const key of path) {
    if (!current || typeof current !== "object" || !(key in current)) return null;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : null;
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
  if (userError || !userData.user?.email) return json({ error: "not_authenticated" }, 401);

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("id, account_type")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profileError || !profile) return json({ error: "profile_not_found" }, 404);
  if (profile.account_type !== "professional") return json({ error: "professional_only" }, 403);

  const { data: professional, error: professionalError } = await userClient
    .from("professional_profiles")
    .select("user_id, company_name")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (professionalError || !professional) return json({ error: "professional_profile_required" }, 409);

  let payload: { action?: "status" | "onboard" };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const action = payload.action ?? "status";

  const stripe = new Stripe(stripeKey, { apiVersion: "2026-08-26.dahlia" });

  let { data: mapping, error: mappingError } = await admin
    .from("stripe_connected_accounts")
    .select("*")
    .eq("professional_id", userData.user.id)
    .eq("environment", stripeEnvironment)
    .maybeSingle();
  if (mappingError) return json({ error: "stripe_account_lookup_failed" }, 500);

  if (!mapping && action === "status") {
    return json({
      connected: false,
      environment: stripeEnvironment,
      ready: false,
      onboardingComplete: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      dashboard: "full",
      feesCollector: "stripe",
      lossesCollector: "stripe",
      platformCommissionPercent: 0,
    });
  }

  try {
    if (!mapping) {
      const account = await stripe.v2.core.accounts.create({
        contact_email: userData.user.email,
        dashboard: "full",
        defaults: {
          responsibilities: {
            fees_collector: "stripe",
            losses_collector: "stripe",
          },
        },
        configuration: {
          merchant: {
            capabilities: {
              card_payments: {
                requested: true,
              },
            },
          },
        },
        identity: {
          country: "GB",
        },
        include: ["configuration.merchant", "defaults", "identity"],
      });

      const { error: insertError } = await admin.from("stripe_connected_accounts").insert({
        professional_id: userData.user.id,
        environment: stripeEnvironment,
        provider_account_id: account.id,
        dashboard: "full",
        fees_collector: "stripe",
        losses_collector: "stripe",
        requirements_collector: account.defaults?.responsibilities?.requirements_collector ?? null,
        card_payments_status: account.configuration?.merchant?.capabilities?.card_payments?.status ?? null,
        payouts_status: account.configuration?.merchant?.capabilities?.stripe_balance?.payouts?.status ?? null,
        onboarding_complete: false,
        charges_enabled: false,
        payouts_enabled: false,
        last_synced_at: new Date().toISOString(),
      });
      if (insertError) return json({ error: "stripe_account_mapping_failed" }, 500);

      mapping = {
        professional_id: userData.user.id,
        environment: stripeEnvironment,
        provider_account_id: account.id,
        dashboard: "full",
        fees_collector: "stripe",
        losses_collector: "stripe",
      };
    }

    const accountId = mapping.provider_account_id;

    const [v2Account, v1Account] = await Promise.all([
      stripe.v2.core.accounts.retrieve(accountId, {
        include: ["configuration.merchant", "defaults", "identity"],
      }),
      stripe.accounts.retrieve(accountId),
    ]);

    const feesCollector = v2Account.defaults?.responsibilities?.fees_collector ?? null;
    const lossesCollector = v2Account.defaults?.responsibilities?.losses_collector ?? null;
    const requirementsCollector = v2Account.defaults?.responsibilities?.requirements_collector ?? null;
    const cardPaymentsStatus =
      v2Account.configuration?.merchant?.capabilities?.card_payments?.status ??
      nestedStatus(v2Account, ["configuration", "merchant", "capabilities", "card_payments", "status"]);
    const payoutsStatus =
      v2Account.configuration?.merchant?.capabilities?.stripe_balance?.payouts?.status ??
      nestedStatus(v2Account, ["configuration", "merchant", "capabilities", "stripe_balance", "payouts", "status"]);

    if (
      v2Account.dashboard !== "full" ||
      feesCollector !== "stripe" ||
      lossesCollector !== "stripe"
    ) {
      return json({
        error: "stripe_account_configuration_mismatch",
        message: "Stripe returned account responsibilities that do not match the approved direct-charge model.",
      }, 409);
    }

    const payoutSchedule = v1Account.settings?.payouts?.schedule;
    const payoutDelayDays =
      typeof payoutSchedule?.delay_days === "number" ? payoutSchedule.delay_days : null;
    const onboardingComplete = Boolean(v1Account.details_submitted);
    const chargesEnabled = Boolean(v1Account.charges_enabled);
    const payoutsEnabled = Boolean(v1Account.payouts_enabled);
    const ready = onboardingComplete && chargesEnabled && cardPaymentsStatus === "active";

    const { error: syncError } = await admin
      .from("stripe_connected_accounts")
      .update({
        dashboard: "full",
        fees_collector: "stripe",
        losses_collector: "stripe",
        requirements_collector: requirementsCollector,
        card_payments_status: cardPaymentsStatus,
        payouts_status: payoutsStatus,
        charges_enabled: chargesEnabled,
        payouts_enabled: payoutsEnabled,
        onboarding_complete: onboardingComplete,
        payout_schedule_interval: payoutSchedule?.interval ?? null,
        payout_delay_days: payoutDelayDays,
        debit_negative_balances: v1Account.settings?.payouts?.debit_negative_balances ?? null,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("professional_id", userData.user.id)
      .eq("environment", stripeEnvironment);
    if (syncError) return json({ error: "stripe_account_sync_failed" }, 500);

    if (action === "onboard" && !ready) {
      const accountLink = await stripe.v2.core.accountLinks.create({
        account: accountId,
        use_case: {
          type: "account_onboarding",
          account_onboarding: {
            configurations: ["merchant"],
            return_url: `${appBaseUrl}/profile?stripe=return`,
            refresh_url: `${appBaseUrl}/profile?stripe=refresh`,
          },
        },
      });

      return json({
        connected: true,
        environment: stripeEnvironment,
        accountId,
        onboardingUrl: accountLink.url,
        ready,
        onboardingComplete,
        chargesEnabled,
        payoutsEnabled,
        dashboard: "full",
        feesCollector,
        lossesCollector,
        requirementsCollector,
        cardPaymentsStatus,
        payoutsStatus,
        payoutSchedule: payoutSchedule?.interval ?? null,
        payoutDelayDays,
        debitNegativeBalances: v1Account.settings?.payouts?.debit_negative_balances ?? null,
        platformCommissionPercent: 0,
      });
    }

    return json({
      connected: true,
      environment: stripeEnvironment,
      accountId,
      ready,
      onboardingComplete,
      chargesEnabled,
      payoutsEnabled,
      dashboard: "full",
      feesCollector,
      lossesCollector,
      requirementsCollector,
      cardPaymentsStatus,
      payoutsStatus,
      payoutSchedule: payoutSchedule?.interval ?? null,
      payoutDelayDays,
      debitNegativeBalances: v1Account.settings?.payouts?.debit_negative_balances ?? null,
      platformCommissionPercent: 0,
    });
  } catch (error) {
    console.error("connect-professional-account", error instanceof Error ? error.message : "stripe_error");
    return json({ error: action === "onboard" ? "stripe_onboarding_failed" : "stripe_status_failed" }, 502);
  }
});
