/**
 * Live Upstash checks.
 *
 * Exercises the real limiter and the real guest counter against the configured
 * Redis instance. Skips itself when credentials are absent, so CI and other
 * machines stay green -- run it locally after provisioning or rotating keys.
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
const configured = Boolean(process.env.BILLING_TEST_REDIS_REST_URL && process.env.BILLING_TEST_REDIS_REST_TOKEN && process.env.RATE_LIMIT_HMAC_SECRET)
if (configured) {
  process.env.UPSTASH_REDIS_REST_URL = process.env.BILLING_TEST_REDIS_REST_URL
  process.env.UPSTASH_REDIS_REST_TOKEN = process.env.BILLING_TEST_REDIS_REST_TOKEN
}

jest.mock('server-only', () => ({}))

const cookieStore = { get: jest.fn(), set: jest.fn() }
jest.mock('next/headers', () => ({ cookies: async () => cookieStore }))

import { checkRateLimit } from '@/lib/rate-limit'
import { consumeGuestAiTrial } from '@/lib/billing/guest-trial'
import { ALLOWANCE } from '@/lib/billing/policy'

const RUN = `livetest-${Date.now()}`
const request = (ip: string) =>
  new Request('https://reframeo.com/api/ai-animate', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
  })

jest.setTimeout(60_000)

const suite = configured ? describe : describe.skip

suite('live Upstash rate limiter', () => {
  it('allows up to the limit then blocks', async () => {
    const policy = { name: `${RUN}-a`, limit: 3, window: '1 m' as const }
    const results = []
    for (let i = 0; i < 4; i++) results.push(await checkRateLimit(request('203.0.113.10'), policy))

    expect(results.slice(0, 3).map((r) => r.success)).toEqual([true, true, true])
    expect(results[3].success).toBe(false)
    expect(results[0].remaining).toBe(2)
  })

  it('counts each caller separately', async () => {
    const policy = { name: `${RUN}-b`, limit: 1, window: '1 m' as const }
    expect((await checkRateLimit(request('203.0.113.20'), policy)).success).toBe(true)
    expect((await checkRateLimit(request('203.0.113.21'), policy)).success).toBe(true)
    expect((await checkRateLimit(request('203.0.113.20'), policy)).success).toBe(false)
  })

  it('shares one budget across separate server instances', async () => {
    // Two isolated module registries stand in for two Vercel functions. The
    // old in-memory limiter gave each its own counter; Redis must not.
    const policy = { name: `${RUN}-c`, limit: 2, window: '1 m' as const }
    const run = async () => {
      let result: Awaited<ReturnType<typeof checkRateLimit>> | undefined
      await jest.isolateModulesAsync(async () => {
        const mod = await import('@/lib/rate-limit')
        result = await mod.checkRateLimit(request('203.0.113.30'), policy)
      })
      return result!
    }

    expect((await run()).success).toBe(true)
    expect((await run()).success).toBe(true)
    expect((await run()).success).toBe(false)
  })

  it('does not leak the raw IP into the Redis key', async () => {
    const policy = { name: `${RUN}-d`, limit: 5, window: '1 m' as const }
    await checkRateLimit(request('198.51.100.77'), policy)

    const { Redis } = await import('@upstash/redis')
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL as string,
      token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
    })

    const keys = await redis.keys(`reframe:ratelimit:${policy.name}*`)
    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) expect(key).not.toContain('198.51.100.77')
  })
})

suite('live guest AI trial', () => {
  // Guest counters live for 24h, so a fixed address would be exhausted on the
  // second run of this suite. Each test gets its own fresh /24 instead.
  const freshNetwork = () =>
    `${10 + Math.floor(Math.random() * 90)}.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 254)}.5`

  beforeEach(() => {
    cookieStore.get.mockReset()
    cookieStore.set.mockReset()
    cookieStore.get.mockReturnValue(undefined) // a fresh visitor each time
  })

  it('stops a visitor who discards the cookie, via the network counter', async () => {
    // Every call presents no cookie, so each looks like a brand-new visitor.
    // Only the IP-prefix counter can stop them.
    const ip = freshNetwork()
    const outcomes = []
    for (let i = 0; i < ALLOWANCE.guestAiPerNetworkWindow + 1; i++) {
      outcomes.push(await consumeGuestAiTrial(request(ip)))
    }

    const last = outcomes[outcomes.length - 1]
    expect(last.allowed).toBe(false)
    if (!last.allowed) expect(last.reason).toBe('network_allowance_exhausted')
  })

  it('issues a signed cookie to a first-time visitor', async () => {
    const result = await consumeGuestAiTrial(request(freshNetwork()))

    expect(result.allowed).toBe(true)
    if (result.allowed) {
      expect(result.setCookie).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
      expect(result.remaining).toBe(ALLOWANCE.guestAiPerWindow - 1)
    }
  })
})
