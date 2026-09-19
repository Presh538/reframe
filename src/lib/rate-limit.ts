import 'server-only'

import { createHmac } from 'crypto'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { integrationStatus, requireServerEnv } from '@/lib/env'

type Window = '1 m' | '10 m' | '1 h' | '1 d'
type Policy = { name: string; limit: number; window: Window }
type Result = { success: boolean; reset: number; remaining: number }

const limiters = new Map<string, Ratelimit>()
const memory = new Map<string, { count: number; reset: number }>()

export class RateLimitUnavailableError extends Error {
  constructor() {
    super('Distributed rate limiting is not configured')
    this.name = 'RateLimitUnavailableError'
  }
}

function durationMs(window: Window): number {
  const [amount, unit] = window.split(' ') as [string, 'm' | 'h' | 'd']
  const multiplier = unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000
  return Number(amount) * multiplier
}

function requestIdentity(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown'
  const secret = process.env.RATE_LIMIT_HMAC_SECRET?.trim()

  if (!secret && process.env.NODE_ENV === 'production') throw new RateLimitUnavailableError()
  return createHmac('sha256', secret || 'reframe-development-only')
    .update(ip)
    .digest('base64url')
}

function memoryLimit(identity: string, policy: Policy): Result {
  const key = `${policy.name}:${identity}`
  const now = Date.now()
  const current = memory.get(key)

  if (!current || now >= current.reset) {
    const reset = now + durationMs(policy.window)
    memory.set(key, { count: 1, reset })
    return { success: true, reset, remaining: policy.limit - 1 }
  }

  if (current.count >= policy.limit) {
    return { success: false, reset: current.reset, remaining: 0 }
  }

  current.count += 1
  return { success: true, reset: current.reset, remaining: policy.limit - current.count }
}

export async function checkRateLimit(request: Request, policy: Policy): Promise<Result> {
  const identity = requestIdentity(request)

  if (!integrationStatus.redis()) {
    if (process.env.NODE_ENV === 'production') throw new RateLimitUnavailableError()
    return memoryLimit(identity, policy)
  }

  const cacheKey = `${policy.name}:${policy.limit}:${policy.window}`
  let limiter = limiters.get(cacheKey)
  if (!limiter) {
    const redis = new Redis({
      url: requireServerEnv('UPSTASH_REDIS_REST_URL'),
      token: requireServerEnv('UPSTASH_REDIS_REST_TOKEN'),
    })
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(policy.limit, policy.window),
      prefix: `reframe:ratelimit:${policy.name}`,
      analytics: false,
    })
    limiters.set(cacheKey, limiter)
  }

  try {
    const result = await limiter.limit(identity)
    return { success: result.success, reset: result.reset, remaining: result.remaining }
  } catch (error) {
    // Redis is reachable-in-principle but the call failed (outage, DNS, bad
    // token). Fail closed and report it as unavailable rather than letting a
    // raw transport error surface as an opaque 500: callers already translate
    // this into a 503, and an unmetered fallback would let an Upstash blip
    // turn into unlimited spending on the AI provider.
    console.error('[rate-limit] Redis unavailable, failing closed', {
      policy: policy.name,
      error: error instanceof Error ? error.name : 'unknown',
    })
    throw new RateLimitUnavailableError()
  }
}
