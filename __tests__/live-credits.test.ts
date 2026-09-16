/**
 * Live credit-service invariants.
 *
 * Runs the real reservation logic against the configured Neon database using a
 * synthetic user that is created and removed per run, so a developer's own
 * balance is never touched. Skips when DATABASE_URL is absent.
 *
 * These are the go-live acceptance criteria that cannot be proven with mocks:
 * concurrency, idempotency, and refund correctness all depend on actual row
 * locking in Postgres.
 */

import fs from 'node:fs'

let hasLocalEnv = false

try {
  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, '$2')
  }
  hasLocalEnv = true
} catch { /* no local env file: the guard below skips the suite */ }

// Requires .env.local specifically: these tests write to a real database and
// a real Redis, so a CI runner that merely has production credentials in its
// environment must never run them.
const configured = hasLocalEnv && Boolean(
process.env.DATABASE_URL)

jest.mock('server-only', () => ({}))

import postgres from 'postgres'
import {
  completeAiCredit,
  grantCredits,
  InsufficientCreditsError,
  releaseAiCredit,
  reserveAiCredit,
} from '@/lib/billing/credits'

jest.setTimeout(120_000)

const suite = configured ? describe : describe.skip

suite('live credit service', () => {
  const sql = postgres(process.env.DATABASE_URL as string, { ssl: 'require', max: 2, prepare: false })
  let userId: string

  const balance = async () => {
    const [row] = await sql`select available, reserved from credit_account where user_id = ${userId}`
    return { available: Number(row.available), reserved: Number(row.reserved) }
  }

  beforeAll(async () => {
    const [row] = await sql`
      insert into app_user (clerk_user_id) values (${'test_' + Date.now()}) returning id`
    userId = row.id
    await sql`insert into credit_account (user_id, credit_type) values (${userId}, 'ai_generation')`
  })

  afterAll(async () => {
    // FK-ordered teardown so the synthetic user leaves nothing behind.
    await sql`delete from usage_credit_allocation where usage_operation_id in (
                select id from usage_operation where user_id = ${userId})`
    await sql`delete from credit_ledger  where user_id = ${userId}`
    await sql`delete from usage_operation where user_id = ${userId}`
    await sql`delete from credit_grant   where user_id = ${userId}`
    await sql`delete from credit_account where user_id = ${userId}`
    await sql`delete from app_user       where id      = ${userId}`
    await sql.end()
  })

  it('grants credits and reflects them in the balance', async () => {
    await grantCredits({
      userId, amount: 5, grantType: 'promotion', sourceType: 'admin',
      sourceId: 'test', idempotencyKey: `test:${userId}:grant-a`,
    })
    expect(await balance()).toEqual({ available: 5, reserved: 0 })
  })

  it('ignores a repeated grant with the same idempotency key', async () => {
    await grantCredits({
      userId, amount: 5, grantType: 'promotion', sourceType: 'admin',
      sourceId: 'test', idempotencyKey: `test:${userId}:grant-a`,
    })
    expect(await balance()).toEqual({ available: 5, reserved: 0 })
  })

  it('moves a credit from available to reserved', async () => {
    await reserveAiCredit({ userId, idempotencyKey: `test:${userId}:op-1` })
    expect(await balance()).toEqual({ available: 4, reserved: 1 })
  })

  it('does not charge twice for a repeated idempotency key', async () => {
    const again = await reserveAiCredit({ userId, idempotencyKey: `test:${userId}:op-1` })
    expect(again.charged).toBe(false)
    expect(await balance()).toEqual({ available: 4, reserved: 1 })
  })

  it('consumes the reservation on success', async () => {
    const [op] = await sql`
      select id from usage_operation where user_id = ${userId} and idempotency_key = ${`test:${userId}:op-1`}`
    await completeAiCredit({ operationId: op.id, inputTokens: 10, outputTokens: 20 })
    expect(await balance()).toEqual({ available: 4, reserved: 0 })
  })

  it('returns the credit when a generation fails', async () => {
    const res = await reserveAiCredit({ userId, idempotencyKey: `test:${userId}:op-2` })
    expect(await balance()).toEqual({ available: 3, reserved: 1 })

    await releaseAiCredit(res.operationId, 'upstream_failure')
    expect(await balance()).toEqual({ available: 4, reserved: 0 })
  })

  it('refuses to spend below zero', async () => {
    // Drain to exactly zero, then ask for one more.
    for (let i = 0; i < 4; i++) {
      const r = await reserveAiCredit({ userId, idempotencyKey: `test:${userId}:drain-${i}` })
      await completeAiCredit({ operationId: r.operationId })
    }
    expect(await balance()).toEqual({ available: 0, reserved: 0 })

    await expect(
      reserveAiCredit({ userId, idempotencyKey: `test:${userId}:overdraw` }),
    ).rejects.toBeInstanceOf(InsufficientCreditsError)
  })

  it('cannot spend an expired grant', async () => {
    await sql`
      insert into credit_grant (user_id, credit_type, grant_type, source_id, amount, remaining, starts_at, expires_at, idempotency_key)
      values (${userId}, 'ai_generation', 'promotion', 'test', 3, 3,
              now() - interval '2 days', now() - interval '1 day', ${`test:${userId}:expired`})`
    // Mirror the grant into the account the way a real grant would.
    await sql`update credit_account set available = available + 3 where user_id = ${userId}`

    await expect(
      reserveAiCredit({ userId, idempotencyKey: `test:${userId}:expired-spend` }),
    ).rejects.toBeInstanceOf(InsufficientCreditsError)

    await sql`update credit_account set available = available - 3 where user_id = ${userId}`
  })

  it('lets only one of two concurrent transactions spend the last credit', async () => {
    await grantCredits({
      userId, amount: 1, grantType: 'promotion', sourceType: 'admin',
      sourceId: 'test', idempotencyKey: `test:${userId}:last-one`,
    })
    expect((await balance()).available).toBe(1)

    // Two independent connections run the same lock-then-decrement sequence the
    // reservation uses. The service's own pool is max:1, so racing through it
    // would merely queue on one connection and prove nothing -- this exercises
    // the actual Postgres row lock that makes the reservation safe.
    const race = async (client: ReturnType<typeof postgres>) =>
      client.begin(async (tx) => {
        const [row] = await tx`
          select available from credit_account
          where user_id = ${userId} and credit_type = 'ai_generation'
          for update`
        if (Number(row.available) < 1) return 'denied'
        // Held deliberately so both transactions overlap inside the lock window.
        await new Promise((r) => setTimeout(r, 150))
        await tx`
          update credit_account set available = available - 1
          where user_id = ${userId} and credit_type = 'ai_generation'`
        return 'ok'
      })

    const a = postgres(process.env.DATABASE_URL as string, { ssl: 'require', max: 1, prepare: false })
    const b = postgres(process.env.DATABASE_URL as string, { ssl: 'require', max: 1, prepare: false })
    try {
      const results = await Promise.all([race(a), race(b)])
      expect(results.filter((r) => r === 'ok')).toHaveLength(1)
      expect((await balance()).available).toBe(0)
    } finally {
      await a.end()
      await b.end()
    }
  })

  it('refuses a negative balance even if the service layer is bypassed', async () => {
    // The CHECK constraint is the last line of defence: a bug or a direct
    // database write still cannot overdraw an account.
    expect((await balance()).available).toBe(0)
    await expect(
      sql`update credit_account set available = available - 1
          where user_id = ${userId} and credit_type = 'ai_generation'`,
    ).rejects.toThrow(/credit_account_available_check|violates check constraint/i)
  })
})
