import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile checkout sends only a payment id and never a client-owned charge amount", async () => {
  const client = await read("src/social/services/paymentClient.ts");
  const checkout = await read("supabase/functions/create-project-checkout/index.ts");

  assert.match(client, /create-project-checkout[\s\S]*body:\s*\{ paymentId \}/);
  assert.match(
    checkout,
    /\.from\("payments"\)[\s\S]*\.select\("id, project_id, customer_id, seller_id, kind, status, currency, amount,/,
  );
  assert.match(checkout, /unit_amount:\s*amountMinor\(Number\(payment\.amount\)\)/);
  assert.doesNotMatch(checkout, /payload\.amount|body\.amount/);
});

test("project charges and invoices are direct on the professional connected account", async () => {
  const checkout = await read("supabase/functions/create-project-checkout/index.ts");
  const invoice = await read("supabase/functions/create-project-invoice/index.ts");
  const refund = await read("supabase/functions/refund-project-payment/index.ts");

  for (const source of [checkout, invoice, refund]) {
    assert.match(source, /stripeAccount:\s*connectedAccountId/);
  }

  for (const source of [checkout, invoice]) {
    assert.doesNotMatch(source, /application_fee_amount/);
    assert.doesNotMatch(source, /application_fee:/);
    assert.doesNotMatch(source, /transfer_data/);
    assert.doesNotMatch(source, /on_behalf_of/);
  }

  assert.match(invoice, /provider_account_id", connectedAccountId/);
  assert.match(invoice, /mode", stripeEnvironment/);
  assert.match(invoice, /stripe\.invoices\.create/);
  assert.match(invoice, /stripe\.invoiceItems\.create/);
});

test("Connect onboarding locks V1 economics to Stripe fees, Stripe loss liability and zero platform commission", async () => {
  const connect = await read("supabase/functions/connect-professional-account/index.ts");
  const migration = await read("supabase/migrations/20261011001545_stripe_connect_direct_charges.sql");

  assert.match(connect, /dashboard:\s*"full"/);
  assert.match(connect, /fees_collector:\s*"stripe"/);
  assert.match(connect, /losses_collector:\s*"stripe"/);
  assert.match(connect, /card_payments:\s*\{[\s\S]*requested:\s*true/);
  assert.match(connect, /platformCommissionPercent:\s*0/);

  assert.match(migration, /dashboard\s+text\s+not null default 'full' check \(dashboard = 'full'\)/);
  assert.match(migration, /fees_collector\s+text\s+not null default 'stripe' check \(fees_collector = 'stripe'\)/);
  assert.match(migration, /losses_collector\s+text\s+not null default 'stripe' check \(losses_collector = 'stripe'\)/);
  assert.doesNotMatch(connect, /application_fee_amount|transfer_data|on_behalf_of/);
});

test("Stripe success is webhook-owned, connected-account-bound and the return screen is read-only", async () => {
  const webhook = await read("supabase/functions/stripe-webhook/index.ts");
  const checkout = await read("supabase/functions/create-project-checkout/index.ts");
  const returnRoute = await read("src/social/routes/PaymentReturnRoute.tsx");

  assert.match(webhook, /constructEventAsync/);
  assert.match(webhook, /\.account\s*\?\?\s*null/);
  assert.match(webhook, /connected_account_required/);
  assert.match(webhook, /payment_connected_account_mismatch/);
  assert.match(webhook, /p_provider_account_id:\s*connectedAccountId/);
  assert.match(webhook, /status:\s*"paid"/);
  assert.match(webhook, /checkout\.session\.completed/);
  assert.match(webhook, /checkout\.session\.async_payment_succeeded/);
  assert.match(webhook, /payment_intent\.payment_failed/);
  assert.match(webhook, /invoice\.paid/);
  assert.match(webhook, /charge\.dispute\.created/);
  assert.match(webhook, /refund\.created/);

  assert.doesNotMatch(checkout, /status:\s*"paid"/);
  assert.match(returnRoute, /fetchPaymentDetail/);
  assert.doesNotMatch(returnRoute, /\.update\(|\.rpc\(/);
  assert.match(returnRoute, /verified Stripe webhook/i);
});

test("all Stripe staging functions fail closed against accidental live mode", async () => {
  for (const path of [
    "supabase/functions/connect-professional-account/index.ts",
    "supabase/functions/create-project-checkout/index.ts",
    "supabase/functions/create-project-invoice/index.ts",
    "supabase/functions/refund-project-payment/index.ts",
    "supabase/functions/stripe-webhook/index.ts",
  ]) {
    const source = await read(path);
    assert.match(source, /STRIPE_ENVIRONMENT/);
    assert.match(source, /sandbox/);
    assert.match(source, /ALLOW_LIVE_STRIPE/);
    assert.match(source, /_live_/);
    assert.match(source, /Live Stripe|Live Stripe Connect|Live Stripe refunds|Live Stripe webhooks/);
  }
});

test("refund requests never accept provider account, charge or PaymentIntent identifiers from the client", async () => {
  const client = await read("src/social/services/paymentClient.ts");
  const refund = await read("supabase/functions/refund-project-payment/index.ts");

  assert.match(client, /body:\s*\{ paymentId, amount \}/);
  assert.match(refund, /payment\.provider_account_id/);
  assert.match(refund, /payment\.provider_payment_intent_id/);
  assert.doesNotMatch(refund, /payload\.provider_account_id|payload\.provider_charge_id|payload\.provider_payment_intent_id/);
});

test("production Express server has no payment mutation endpoint", async () => {
  const server = await read("server.ts");
  assert.equal(server.includes("/api/stripe/create-payment-intent"), false);
  assert.equal(server.includes("/api/stripe/process-payment"), false);
  assert.equal(server.includes("simulated: true"), false);
});
