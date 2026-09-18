# Billing launch gate — September 18, 2026

## Status

Core lifecycle fixes are implemented locally, not deployed or migrated to Neon.
The configured Neon database contains production data. No remote database mutation,
Polar refund, or subscription cancellation was performed by this change.

Manual evidence supplied by the owner: sandbox AI-credit purchase succeeds and
redelivery of the same `order.paid` does not increase the balance again.

## Implemented behavior

- Allowances require a recorded paid order for the mirrored subscription period.
  Active/past-due/cycled events alone cannot create credits. Trials have no paid allowance.
- Monthly plans use billing-period keys. Annual plans use UTC monthly anniversaries,
  clamping month-end dates without calendar-month double grants or upfront annual credits.
- Paid orders, grants, passes, and checkout success commit together, serialized by
  the customer's credit-account row. Identical deliveries use deterministic grant keys.
- Period-end cancellation keeps paid features until expiry. Undo cancellation is
  supported. Immediate terminal cancellation cannot be reversed by a stale active event;
  resubscription uses a new provider subscription ID. Pause/resume snapshots reconcile grants.
- Subscription updates use provider modification timestamps and reject older periods.
- Expired grants are excluded on access and balance reads, without relying on daily cron.
- Pending mirrors advance to paid; late paid/pending events cannot erase refund/dispute state.
- Paid `order.updated` snapshots use the same trusted fulfillment path as `order.paid`.
- Full refunds recover remaining credits from that invoice and revoke its export passes.
  Partial refunds recover the refunded share of the original grant, capped at unused
  credits. Cumulative targets and ledger entries make redelivery harmless. Spent credits
  never become negative balances. Subscription refunds do not themselves cancel features.
- Credits from other invoices remain untouched. Failed AI reservations cannot restore
  expired/full-refunded credits; outstanding partial recovery is applied on release.
- Existing one-time grant/pass keys are preserved. Old calendar grants are adopted by
  a paid-period invoice rather than issuing another allowance; see legacy review below.
- Duplicate Pro checkout intents are blocked, existing subscribers use the Polar portal,
  and idempotency keys cannot be swapped between products. `checkout.expired` retires open intents.
- Account → Billing shows live server status and can request canonical subscription sync,
  including subscriptions omitted from Polar's active list. Provider failures return 503,
  not a misleading successful free-account reconciliation.
- Original webhook bytes are signature/timestamp-verified for both signing schemes.
  New cycle/pause/resume/migration aliases reuse the SDK subscription-updated schema only
  after authentication. This is not a general 2026-10 schema migration.

## Local tests

`npm test` runs unit tests and an in-memory PostgreSQL engine (PGlite) with the real
Drizzle queries and SQL migrations. This verifies domain behavior, constraints,
rollback, refunds and state ordering, without reading production credentials.
PGlite is single-connection: it does NOT prove multi-connection row-lock behavior.

Network tests now require explicit `BILLING_TEST_DATABASE_URL` or
`BILLING_TEST_REDIS_REST_URL` / `BILLING_TEST_REDIS_REST_TOKEN`; `.env.local` alone
never enables them. Use only dedicated isolated test resources, never production URLs.

## External setup and rollout

1. Create an isolated Neon branch/test database. Review that it contains no live
   customer traffic. If cloning production, restrict access and treat the copied data
   as production-sensitive. Prefer a schema-only test database.
2. Apply `0001_fluffy_synch.sql` to the isolated branch first. It adds invoice-period,
   cumulative-refund, and subscription-version fields and backfills invoice data from
   authenticated processed webhook payloads and existing order items.
   **Do not run `npm run db:migrate` with the current default environment:** it
   points to production. Explicitly configure `DATABASE_MIGRATION_URL` for the
   isolated branch before migrating. `BILLING_TEST_DATABASE_URL` only directs tests;
   it does not override the migration command or Preview app database connection.
3. Check historical orders have the correct period/net amount and historical grants
   are attributable to exactly one invoice. Multiple legacy invoices in the same period,
   missing paid evidence, and previously over-issued calendar allowances require explicit
   review; don't guess historical attribution or silently claw back production credits.
4. Configure the test connection explicitly and run the live service tests with
   separate connections. Add concurrent paid/refund/renewal tests before launch approval.
5. Add `subscriptions:read` and `checkouts:read` to the sandbox token if missing. No
   `subscriptions:write` or refund-write scope is required by Reframe's portal integration.
6. Enable the webhook events listed in BILLING_SETUP.md, including `checkout.expired`
   and all four order events. Keep endpoint version 2026-04 for this rollout.
7. Deploy against the isolated branch. Perform the sandbox matrix below and capture
   event references, HTTP responses, before/after balances and effective capabilities.
8. Only after approval, schedule the production migration (before deploying code that
   needs its columns), configure separate live Polar credentials/products/secret, and
   perform a low-value live purchase/refund smoke test with explicit owner approval.

## Required sandbox matrix — not yet verified end-to-end

| Scenario | Expected result |
|---|---|
| Initial Pro Monthly; paid + active + duplicate events | Pro and one 300-credit allowance |
| New paid renewal, repeated deliveries | One allowance for the new period |
| Failed renewal; recovery | Grace features per policy, no new credits until paid proof |
| Cancel at period end; undo cancellation | Access kept through paid expiry; flag updates |
| Immediate revoke; stale activation | Free effective subscription capabilities; no resurrection |
| Missed revoke/cron at expiry | Access reads free immediately at expiry |
| Annual anniversary, Jan 31, leap year | One slice per anniversary, no annual upfront grant |
| Full, partial, progressive and repeated refund | Correct cumulative unused-credit recovery |
| Refund before paid/mirror event | No grants on full refund; correct remainder on partial |
| Refund with spent/reserved credits | Non-negative balance; no released-credit resurrection |
| Archived product refund | Existing legitimate refund still processed |
| Plan change, pause/resume, resubscribe | Correct state and no duplicate per-period allowance |
| Concurrent paid/refund/state updates | No lost updates, duplicate grants or stale access |
| Portal cancel/invoices/payment-method update | Caller owns the portal session; dashboard reflects events |
| Duplicate checkout, abandoned/expired checkout | No accidental second subscription charge |
| Another account's checkout/portal identifiers | No cross-account information or access |

## Remaining product/infrastructure boundaries

Plan-change proration does not award an extra allowance for an existing anniversary.
Existing paid credits survive ordinary cancellation until their own expiry; refunds
use the separate recovery policy above. A pending checkout with no provider reference
after an ambiguous timeout requires recovery/support rather than risking a second charge.

Server-enforced paid exports/render-pass consumption are not implemented in the current
browser-only export pipeline. Do not sell gated 4K/export benefits as securely enforced
until that separate rendering/paywall workflow is implemented and tested. The schema
alone is not enforcement. Chargebacks, subscription migration from another provider,
and 2026-10-specific payload fields also require provider-specific end-to-end tests.

Daily annual-credit reconciliation can delay a new anniversary allowance by up to a
cron interval; Account → Billing → Sync subscription provides a recovery path. Check
cron health and backlog limits before scale-out; these local fixes are not proof of
high-volume throughput or complete provider-outage recovery.
