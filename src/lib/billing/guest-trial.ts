import 'server-only'

import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { ALLOWANCE } from '@/lib/billing/policy'
import { getRedis } from '@/lib/redis'

export const GUEST_COOKIE = 'rf_guest'

/** Raw identifier + HMAC tag, so a forged cookie cannot mint a fresh allowance. */
const TOKEN_BYTES = 32

export class GuestTrialUnavailableError extends Error {
  constructor() {
    super('Guest metering is not configured')
    this.name = 'GuestTrialUnavailableError'
  }
}

function secret(): string {
  const value = process.env.RATE_LIMIT_HMAC_SECRET?.trim()
  if (!value) {
    if (process.env.NODE_ENV === 'production') throw new GuestTrialUnavailableError()
    return 'reframe-development-only'
  }
  return value
}

function sign(id: string): string {
  return createHmac('sha256', secret()).update(id).digest('base64url')
}

function issueToken(): string {
  const id = randomBytes(TOKEN_BYTES).toString('base64url')
  return `${id}.${sign(id)}`
}

/** Constant-time verification; returns the identifier only when the tag matches. */
function verifyToken(token: string | undefined): string | null {
  if (!token) return null
  const separator = token.lastIndexOf('.')
  if (separator <= 0) return null

  const id = token.slice(0, separator)
  const provided = Buffer.from(token.slice(separator + 1))
  const expected = Buffer.from(sign(id))

  if (provided.length !== expected.length) return null
  return timingSafeEqual(provided, expected) ? id : null
}

/**
 * Collapses an address to its network prefix (IPv4 /24, IPv6 /48) before
 * hashing, so the stored key cannot be reversed to a single visitor.
 */
function networkKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const address = forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown'

  const prefix = address.includes(':')
    ? address.split(':').slice(0, 3).join(':')
    : address.split('.').slice(0, 3).join('.')

  return createHmac('sha256', secret()).update(`net:${prefix}`).digest('base64url')
}

async function incrementWithin(key: string, windowSeconds: number): Promise<number> {
  const redis = getRedis()
  if (!redis) throw new GuestTrialUnavailableError()

  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, windowSeconds)
  return count
}

export type GuestTrialResult =
  | { allowed: true; remaining: number; setCookie: string | null }
  | { allowed: false; reason: 'guest_allowance_exhausted' | 'network_allowance_exhausted' }

/**
 * Atomically consumes one anonymous AI generation.
 *
 * Fails closed when Redis is absent in production: an unmetered guest path
 * would let anyone spend the Anthropic balance without an account.
 */
export async function consumeGuestAiTrial(request: Request): Promise<GuestTrialResult> {
  if (!getRedis()) {
    if (process.env.NODE_ENV === 'production') throw new GuestTrialUnavailableError()
    return { allowed: true, remaining: ALLOWANCE.guestAiPerWindow - 1, setCookie: null }
  }

  const store = await cookies()
  const existing = verifyToken(store.get(GUEST_COOKIE)?.value)
  const id = existing ?? randomBytes(TOKEN_BYTES).toString('base64url')
  const setCookie = existing ? null : `${id}.${sign(id)}`

  // The network counter is consumed first and is never refunded by a new
  // cookie, so discarding the cookie cannot reset the effective allowance.
  const networkCount = await incrementWithin(
    `reframe:guest:net:${networkKey(request)}`,
    ALLOWANCE.guestWindowSeconds,
  )
  if (networkCount > ALLOWANCE.guestAiPerNetworkWindow) {
    return { allowed: false, reason: 'network_allowance_exhausted' }
  }

  const guestCount = await incrementWithin(
    `reframe:guest:id:${sign(id)}`,
    ALLOWANCE.guestWindowSeconds,
  )
  if (guestCount > ALLOWANCE.guestAiPerWindow) {
    return { allowed: false, reason: 'guest_allowance_exhausted' }
  }

  return {
    allowed: true,
    remaining: Math.max(0, ALLOWANCE.guestAiPerWindow - guestCount),
    setCookie,
  }
}

/** Applies the guest identifier to the response when one was just issued. */
export async function persistGuestCookie(token: string | null): Promise<void> {
  if (!token) return
  const store = await cookies()
  store.set(GUEST_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ALLOWANCE.guestWindowSeconds,
  })
}
