# Billing verification — sandbox launch gate

## Confirmed manually

- Sandbox AI-credit purchase delivers successfully after signing compatibility fix.
- Redelivery of the same `order.paid` does not increase the balance again.

## Pending end-to-end tests

Use sandbox only and record the order/subscription reference, before/after
balance, webhook HTTP status, and account status. Never include secrets in notes.

1. Buy Pro Monthly while signed in. Expect Pro access and one 300-credit allowance,
   not two when both `order.paid` and `subscription.active` arrive. Redeliver both.
2. Observe a real renewal with a new billing period. Expect one allowance for the
   new period. Redelivering an activation is not a renewal test.
3. Cancel through Account → Billing → Manage billing. Expect cancellation scheduled
   for period end and paid access until then. Verify eventual revocation separately.
4. Fully refund a disposable sandbox AI-credit purchase. Expect unused credits from
   that purchase removed, other purchases untouched, and payment shown as refunded.
   Redeliver `order.refunded`; the balance must not change again.
5. Repeat with some purchased credits already spent; never allow a negative balance.
6. Separately verify partial refunds and subscription refunds after resolving the
   policy/implementation issues below.

## Code-review findings — not launch-approved

- Allowance keys use calendar months, not monthly renewal periods. Two different
  monthly periods within one calendar month can collide; calendar rollover can
  issue another allowance within the same paid period. Define monthly anniversary
  slices for annual subscriptions and billing-period keys for monthly subscriptions.
- Refund handling treats every `order.refunded` as a full refund. Define partial
  refund credit/pass policy and respect cumulative refunded amounts.
- Subscription allowances use subscription source IDs, but refund credit lookup
  uses the order ID. A subscription refund therefore does not recover its allowance.
- Refund handling revokes subscription feature grants without synchronizing the
  provider subscription state. A refund and subscription cancellation must not be
  treated as interchangeable; a later subscription sync can restore these grants.
- A distinct, delayed `order.paid` event can overwrite a refunded order as paid.
  Same-event deduplication does not resolve out-of-order distinct events.

These findings require focused fulfillment fixes and regression tests before live
subscription/refund launch. No refund was issued and no subscription was changed by
the local verification run.

## Account experience

Clerk owns authentication; Polar owns billing. Checkout requires a Reframe account.
Clerk's custom Billing page reads caller-scoped, uncached Reframe billing data and
opens a server-created Polar customer session. Return URL parameters never grant
credits or paid access. The dashboard polls briefly for server-recorded payment
status, then directs users to Billing rather than encouraging another payment.
