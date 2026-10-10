import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile checkout sends only a payment id and never a client-owned amount", async () => {
  const client = await read("src/social/services/paymentClient.ts");
  const checkout = await read("supabase/functions/create-project-checkout/index.ts");

  assert.match(client, /body:\s*\{ paymentId \}/);
  assert.doesNotMatch(client, /create-project-checkout[\s\S]{0,400}amount:/);

  assert.match(
    checkout,
    /\.from\("payments"\)[\s\S]*\.select\("id, project_id, customer_id, kind, status, currency, amount,/,
  );
  assert.match(checkout, /unit_amount:\s*amountMinor\(Number\(payment\.amount\)\)/);
  assert.doesNotMatch(checkout, /payload\.amount|body\.amount|req.*amount/);
});

test("Stripe success is webhook-owned and the return screen is read-only", async () => {
  const webhook = await read("supabase/functions/stripe-webhook/index.ts");
  const checkout = await read("supabase/functions/create-project-checkout/index.ts");
  const returnRoute = await read("src/social/routes/PaymentReturnRoute.tsx");

  assert.match(webhook, /constructEventAsync/);
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

test("Stripe staging functions fail closed against accidental live mode", async () => {
  for (const path of [
    "supabase/functions/create-project-checkout/index.ts",
    "supabase/functions/create-project-invoice/index.ts",
    "supabase/functions/stripe-webhook/index.ts",
  ]) {
    const source = await read(path);
    assert.match(source, /STRIPE_MODE/);
    assert.match(source, /ALLOW_LIVE_STRIPE/);
    assert.match(source, /_live_/);
    assert.match(source, /Live Stripe/);
  }
});

test("Connect economics remain unimplemented until commercial responsibilities are approved", async () => {
  const checkout = await read("supabase/functions/create-project-checkout/index.ts");
  const invoice = await read("supabase/functions/create-project-invoice/index.ts");

  for (const source of [checkout, invoice]) {
    assert.doesNotMatch(source, /application_fee_amount/);
    assert.doesNotMatch(source, /transfer_data/);
    assert.doesNotMatch(source, /on_behalf_of/);
    assert.doesNotMatch(source, /stripe_account/i);
  }
});

test("production Express server has no payment mutation endpoint", async () => {
  const server = await read("server.ts");
  assert.equal(server.includes("/api/stripe/create-payment-intent"), false);
  assert.equal(server.includes("/api/stripe/process-payment"), false);
  assert.equal(server.includes("simulated: true"), false);
});
