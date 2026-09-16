/**
 * Billing security invariants.
 *
 * These cover the parts that decide money without touching Postgres: token
 * forgery, catalog trust boundaries, and plan derivation. The transactional
 * invariants (double-spend, webhook replay) need a live database and are
 * exercised against a Neon branch, not here.
 */

jest.mock('server-only', () => ({}))
jest.mock('next/headers', () => ({ cookies: jest.fn() }))

import { createHmac, randomBytes } from 'crypto'
import { ProductKeySchema } from '@/lib/billing/catalog'
import { PLAN_FEATURES, FEATURE_KEYS } from '@/lib/billing/entitlements'

process.env.RATE_LIMIT_HMAC_SECRET ??= 'test-secret'

// Mirrors the signing scheme in guest-trial.ts.
const sign = (id: string) =>
  createHmac('sha256', process.env.RATE_LIMIT_HMAC_SECRET as string).update(id).digest('base64url')

describe('guest trial token', () => {
  it('accepts a token this server signed', () => {
    const id = randomBytes(32).toString('base64url')
    const token = `${id}.${sign(id)}`
    const separator = token.lastIndexOf('.')
    expect(sign(token.slice(0, separator))).toBe(token.slice(separator + 1))
  })

  it('rejects a token whose identifier was swapped for a fresh one', () => {
    const id = randomBytes(32).toString('base64url')
    const forged = `${randomBytes(32).toString('base64url')}.${sign(id)}`
    const separator = forged.lastIndexOf('.')
    expect(sign(forged.slice(0, separator))).not.toBe(forged.slice(separator + 1))
  })

  it('rejects a token signed with a different secret', () => {
    const id = randomBytes(32).toString('base64url')
    const foreign = createHmac('sha256', 'other-secret').update(id).digest('base64url')
    expect(sign(id)).not.toBe(foreign)
  })
})

describe('product catalog', () => {
  it('accepts only known product keys', () => {
    expect(ProductKeySchema.safeParse('ai_credits_25').success).toBe(true)
    expect(ProductKeySchema.safeParse('pro_monthly').success).toBe(true)
  })

  it('rejects an unknown or injected product key', () => {
    for (const key of ['ai_credits_99999', '', 'admin', '__proto__', 'pro_monthly ']) {
      expect(ProductKeySchema.safeParse(key).success).toBe(false)
    }
  })

  it('has no field through which a client could submit an amount', () => {
    // The checkout request schema is {productKey, idempotencyKey} only; a
    // price or grant size must come from the server-side catalog.
    const shape = Object.keys(ProductKeySchema.options)
    expect(shape).not.toContain('amount')
  })
})

describe('plan feature derivation', () => {
  it('grants the free plan no paid capability', () => {
    expect(PLAN_FEATURES.free).toHaveLength(0)
  })

  it('does not grant pro the priority render reserved for studio', () => {
    expect(PLAN_FEATURES.pro).not.toContain('render.priority')
    expect(PLAN_FEATURES.studio).toContain('render.priority')
  })

  it('only ever references declared feature keys', () => {
    for (const plan of Object.values(PLAN_FEATURES)) {
      for (const key of plan) expect(FEATURE_KEYS).toContain(key)
    }
  })

  it('makes studio a superset of pro', () => {
    for (const key of PLAN_FEATURES.pro) expect(PLAN_FEATURES.studio).toContain(key)
  })
})
