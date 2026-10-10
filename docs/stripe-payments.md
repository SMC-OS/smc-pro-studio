# SMC Pro Studio Stripe payment architecture

## Status

This integration is intentionally **test/sandbox only** until the payment release gate is approved.

The Android/web client never owns a payable amount and never marks a payment paid. Supabase/Postgres is the project ledger; Stripe is the payment processor; verified Stripe webhooks reconcile provider state back into the ledger.

## Payment flow

1. A professional/project manager creates a payment request with `request_project_payment()`.
2. Postgres locks the project and calculates the maximum collectible value from:
   - the accepted quote total; plus
   - accepted variation deltas.
3. Existing pending/requires-action requests and net verified payments are counted before another request can be created.
4. The customer starts Stripe Checkout using only the payment UUID. The Edge Function reads the authoritative GBP amount from Postgres.
5. A retry must first pass `claim_project_payment_for_collection()`, which locks the project and prevents a stale failed request from being retried after replacement requests have reserved the balance.
6. Stripe-hosted Checkout collects payment details. No Stripe secret is present in the mobile bundle.
7. The return screen is informational only. It polls the protected payment row and never marks payment success.
8. The signed Stripe webhook is the authority for paid/failed/cancelled/refunded/dispute reconciliation.
9. Stripe event IDs are atomically claimed before processing to prevent duplicate side effects from webhook retries.
10. Receipts/invoice PDFs are exposed only after provider state is reconciled.

## Invoicing

A project payment request can use `collection_method=invoice`.

The professional who requested it can ask the staging Edge Function to create a Stripe invoice. The server:
- resolves the customer email from Supabase Auth;
- creates/reuses the Stripe Customer mapping;
- creates the invoice and invoice item from the persisted GBP amount;
- finalizes and sends the invoice;
- stores hosted invoice/PDF URLs;
- still waits for Stripe webhooks before setting the project payment to paid.

Automatic Stripe Tax is intentionally not enabled because no tax-registration decision has been supplied for this integration.

## Refunds and disputes

Stripe webhook events reconcile:
- refund lifecycle into `payment_refunds`;
- dispute lifecycle into `payment_disputes`;
- aggregate refunded/disputed amounts onto `payments`.

Authenticated clients have read-only access scoped through project membership. Only server-side service credentials can write provider reconciliation rows.

## Connect

SMC Pro Studio is a two-sided platform. **Stripe Connect becomes necessary when SMC Pro Studio routes project funds or payouts to independent professionals.**

No Connect charge pattern is implemented yet. The following owner/commercial decisions must be approved first:
- who is merchant of record for each flow;
- whether SMC owns the customer payment relationship;
- platform fee/take-rate structure;
- payout timing;
- refund responsibility;
- dispute responsibility;
- negative-balance/loss liability.

Until those are approved, the code deliberately contains no:
- `application_fee_amount`;
- `transfer_data`;
- `on_behalf_of`;
- connected-account payout routing.

This avoids silently choosing commercial/legal responsibility in code.

## Staging Edge Functions

- `create-project-checkout` — authenticated customer, `verify_jwt=true`
- `create-project-invoice` — authenticated requesting professional, `verify_jwt=true`
- `stripe-webhook` — Stripe signature authentication, `verify_jwt=false`

Staging project:
`qezixxtknqbijnudvhal`

Webhook URL:
`https://qezixxtknqbijnudvhal.supabase.co/functions/v1/stripe-webhook`

## Required staging secrets

Set these in **Supabase Edge Function Secrets**, not source control:

- `STRIPE_MODE=test`
- `STRIPE_SECRET_KEY=<Stripe sandbox/test restricted or secret key>`
- `STRIPE_WEBHOOK_SIGNING_SECRET=<test webhook endpoint signing secret>`
- `APP_BASE_URL=https://smcprostudio.app`
- leave `ALLOW_LIVE_STRIPE` unset or `false`

The functions fail closed when the Stripe key/mode disagree or when live mode is requested without the explicit live enable flag.

## Required Stripe test webhook events

Register the staging webhook for:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `invoice.finalized`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.voided`
- `refund.created`
- `refund.updated`
- `refund.failed`
- `charge.refunded`
- `charge.dispute.created`
- `charge.dispute.updated`
- `charge.dispute.closed`

## Payment release gate

Do not mark the payment release gate GO until all of these have actual evidence:

- test/sandbox Checkout success;
- verified webhook transitions payment to paid;
- failed/cancelled Checkout;
- duplicate webhook delivery;
- delayed/asynchronous outcome where supported;
- Stripe invoice creation and payment reconciliation;
- refund reconciliation;
- dispute reconciliation;
- cross-user/tenant isolation;
- Android checkout and HTTPS App Link return on the physical target device;
- full CI green after the payment implementation.

No live Stripe mutation is part of the staging mission.
