# SMC Pro Studio Stripe payment architecture

## Locked V1 commercial model

For project work sold through SMC Pro Studio:

- the independent construction professional is the **legal seller**;
- the professional is the **invoice issuer**;
- homeowner payments use **Stripe Connect direct charges** on that professional's connected account;
- Stripe collects its processing fees from the connected professional;
- SMC Pro Studio's V1 transaction commission is **0%**;
- connected accounts use the full Stripe Dashboard;
- new connected accounts are created with Accounts v2 Merchant configuration;
- `defaults.responsibilities.fees_collector = stripe`;
- `defaults.responsibilities.losses_collector = stripe` (Stripe Managed Risk);
- card payments are requested during account creation;
- the professional manages direct-charge disputes and refunds from their connected Stripe account.

No project-payment code uses destination charges, separate charges and transfers, application fees, `transfer_data`, or `on_behalf_of`.

## Trust boundary

Postgres is authoritative for project commercial value. Stripe is authoritative for provider payment state.

1. The seller creates a payment request with `request_project_payment()`.
2. Postgres locks the project and derives the collectible amount from the accepted quote plus accepted variations.
3. The request snapshots `seller_id`; only the project's lead professional can create the request.
4. The homeowner client sends only the payment UUID to the Checkout function.
5. The server resolves the seller's connected account and creates Stripe Checkout **on that account**.
6. Stripe-hosted Checkout collects payment details.
7. The return route is read-only. It never marks a payment paid.
8. A verified connected-account Stripe webhook reconciles paid/failed/cancelled/refunded/dispute state.
9. Webhook reconciliation verifies the connected account, seller identity, currency and amount before changing the ledger.
10. Event IDs are atomically claimed to make webhook retries idempotent.

## Professional-issued invoices

For `collection_method=invoice`:

- only the seller who created the request can issue the invoice;
- the Stripe Customer is created inside the seller's connected account;
- the invoice, line item, finalisation and send operation all execute with that connected-account context;
- therefore the professional's Stripe account is the invoice issuer;
- the project payment is marked paid only after the connected-account webhook confirms it.

## Refunds and disputes

Only the seller can initiate a refund through SMC Pro Studio. The server resolves the original connected-account PaymentIntent/Charge and creates the refund on that account. Stripe prevents refunds above the charge amount; the signed webhook remains authoritative for final refund state.

Direct-charge dispute events must include the connected account. Dispute records are scoped to the same seller account and surfaced to the professional. SMC Pro Studio does not move dispute losses to the platform balance.

## Connect onboarding

`connect-professional-account` creates or refreshes the professional's Stripe account.

Required immutable V1 responsibilities:

- dashboard: `full`
- fees collector: `stripe`
- losses collector: `stripe`
- merchant card-payments capability requested
- country: `GB`

The status refresh compares Stripe's actual Accounts v2 responsibility fields with this contract and fails if they differ. It also reads the compatible Accounts v1 representation to persist actual `details_submitted`, `charges_enabled`, `payouts_enabled`, payout schedule, payout delay and `debit_negative_balances`.

## Staging-only configuration

Staging Supabase project: `qezixxtknqbijnudvhal`.

Edge Functions:

- `connect-professional-account` — authenticated professional
- `create-project-checkout` — authenticated homeowner
- `create-project-invoice` — authenticated seller
- `refund-project-payment` — authenticated seller
- `stripe-webhook` — Stripe Connect signature authentication

Staging secrets must be set through a secure secret channel:

- `STRIPE_ENVIRONMENT=sandbox`
- `STRIPE_SECRET_KEY=<authorised Stripe Sandbox secret>`
- `STRIPE_CONNECT_WEBHOOK_SIGNING_SECRET=<Sandbox Connect event destination signing secret>`
- `APP_BASE_URL=https://smcprostudio.app`
- `ALLOW_LIVE_STRIPE=false`

Never place these secrets in source control, a VITE variable, Android resources or chat.

## Required connected-account events

The Sandbox event destination must receive events on connected accounts for:

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

## Release evidence required

The payment gate is not GO until there is verified evidence for:

- professional Sandbox account creation and onboarding;
- actual returned responsibility values: Stripe fees collector + Stripe losses collector;
- actual card-payment and payout capability state;
- actual payout schedule/settings;
- a direct Checkout payment with zero platform application fee;
- connected-account webhook reconciliation to paid;
- professional-issued Stripe invoice and payment reconciliation;
- seller-initiated refund and webhook reconciliation;
- duplicate webhook delivery safety;
- failure/cancel path;
- tenant/seller isolation;
- Android Checkout and App Link return on the staging build;
- fresh full CI green.

No live Stripe mutation is part of the staging mission.
