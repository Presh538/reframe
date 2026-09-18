# Billing setup checklist

Everything below is external provisioning. The application code is complete and
degrades safely when a service is absent, so you can work through this list in
order and verify after each step.

**Safety property:** with `DATABASE_URL` unset the editor behaves exactly as it
does today — AI is unmetered and free for everyone. Metering switches on the
moment the database is configured.

## Order matters

Do **not** set `DATABASE_URL` in production until both of these are true:

1. Clerk is configured, and
2. a sign-in entry point exists in the UI.

Metering treats any visitor without a session as a guest, capped at 3 AI
generations a day. If the database is live and a user has no way to sign in,
that cap becomes a dead end rather than a prompt to create an account.

The safe sequence is therefore:

| Step | Where | Risk |
|---|---|---|
| 1. Upstash | local, then Vercel | none — fixes the rate limiter, no user-visible change |
| 2. Clerk | local only | none — sign-in works, nothing is metered yet |
| 3. Sign-in UI | local only | none |
| 4. Neon | local only | metering activates locally for testing |
| 5. Promote Clerk + Neon together | Vercel | safe once 1-4 are verified |
| 6. Polar | sandbox, then production | purchases only |

Steps 2-4 stay in `.env.local` until they are verified together. Promote them to
Vercel in one change, never one at a time.

The numbered sections below are per-service reference, not a running order —
follow the table above for sequencing.

---

## 1. Neon Postgres

1. Create a project at [neon.tech](https://neon.tech). Pick the region closest
   to your Vercel function region.
2. Copy both connection strings:
   - **Pooled** → `DATABASE_URL` (runtime)
   - **Direct** → `DATABASE_MIGRATION_URL` (migrations only)
3. Apply the schema:

```bash
npm run db:migrate
```

Create a Neon **branch** from production before testing anything destructive.

---

## 2. Clerk

1. Create an application at [clerk.com](https://clerk.com).
2. Enable **Google** and **Email magic link**. Leave passwords off.
3. Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
4. Add a webhook endpoint → `https://reframeo.com/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`
   - Copy the signing secret → `CLERK_WEBHOOK_SIGNING_SECRET`

---

## 3. Upstash Redis

1. Create a database at [upstash.com](https://upstash.com) in the same region.
2. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. Generate the hashing secret:

```bash
openssl rand -base64 32
```

Set the result as `RATE_LIMIT_HMAC_SECRET`. This keys both the IP-prefix hash
and the guest cookie signature. **Rotating it resets every guest allowance**, so
treat it as long-lived.

Redis is required in production: rate limiting and the guest trial both fail
closed without it rather than running unmetered.

---

## 4. Polar — sandbox first

1. Create an organization at [sandbox.polar.sh](https://sandbox.polar.sh).
2. Create five products. Names and prices are yours to choose; only the IDs
   matter here.

| Product | Type | Env var |
|---|---|---|
| 4K Export Pass | one-time | `POLAR_PRODUCT_EXPORT_4K_SINGLE` |
| 7-Day Project Pass | one-time | `POLAR_PRODUCT_PROJECT_PASS_7D` |
| 25 AI Credits | one-time | `POLAR_PRODUCT_AI_CREDITS_25` |
| Pro Monthly | recurring | `POLAR_PRODUCT_PRO_MONTHLY` |
| Pro Yearly | recurring | `POLAR_PRODUCT_PRO_YEARLY` |

3. Create an access token with `checkouts:write`, `customers:read`,
   `customer_sessions:write` → `POLAR_ACCESS_TOKEN`.
4. Add a webhook endpoint → `https://reframeo.com/api/webhooks/polar`
   - Format: **Raw**
   - Events: `order.paid`, `order.refunded`, and every `subscription.*` event
   - Copy the secret → `POLAR_WEBHOOK_SECRET`
   - Keep the endpoint API version at **2026-04** until a versioned SDK migration
     and real order/subscription payload tests verify **2026-10** compatibility.
     API version changes do not change the signing key.
   - The webhook adapter supports both legacy Polar HMAC and Standard Webhooks
     secrets introduced September 8, 2026. Never pre-encode the dashboard secret.
     After changing Vercel environment variables, redeploy the targeted environment.
5. Keep `POLAR_SERVER=sandbox` until the flow is verified end to end.

Production uses a **separate organization, token, product IDs, and webhook
secret**. Never mix the two sets.

---

## 5. Vercel

Add every variable from `.env.example` to the project. Note:

- `CRON_SECRET` is already set. The new `/api/cron/billing-reconcile` job reuses it.
- The reconciliation cron runs **once daily** (`0 4 * * *`), which is the only
  frequency the Hobby plan permits. Anything more frequent — including hourly —
  fails at deploy time with *"Hobby accounts are limited to daily cron jobs."*
  Hobby also has ±59 minutes of scheduling jitter, so treat the job as
  "sometime in the 4am hour", never as a precise deadline.
- Because the daily job is coarse, **stale credit reservations do not depend on
  it**. A reservation orphaned by a crashed request is released automatically
  the next time that same user requests a generation, so nobody waits a day to
  get a stuck credit back. The cron is a backstop for accounts that never
  return.

---

## 6. Verification, in order

1. Sign in → `GET /api/me/access` returns `authenticated: true`, plan `free`.
2. `GET /api/credits` shows 10 free credits.
3. Run an AI prompt → available drops to 9.
4. Force an upstream failure → the credit returns. Nothing is charged.
5. Buy AI credits in sandbox → webhook fires → balance increases by 25.
6. Redeliver that same webhook from Polar's dashboard → balance does **not**
   change again.
7. Sign out, run 3 AI prompts as a guest, then a 4th → `402`.
8. Clear cookies and retry → still blocked by the network allowance.
9. Cancel a sandbox subscription → `subscription.revoked` → plan returns to `free`.
