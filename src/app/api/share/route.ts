/**
 * POST /api/share — create a cryptographically signed share token.
 *
 * Accepts: { svg: string }  (animated SVG outerHTML from liveSvgRef)
 * Returns: { token: string, url: string, expiresAt: string }
 *
 * Security:
 *  – Rate-limited: 5 creates per IP per 10 minutes
 *  – SVG size-limited: 5 MB raw / 500 KB compressed
 *  – SVG sanitized in createShareToken (mirrors validate-svg patterns)
 *  – Token is HMAC-SHA256 signed (see src/lib/share.ts)
 *  – No user-controlled data is reflected verbatim in response
 */

import { after }       from 'next/server'
import { NextResponse } from 'next/server'
import { z }            from 'zod'
import { createShareToken, SHARE_TTL_DAYS } from '@/lib/share'
import { getPostHogClient } from '@/lib/posthog-server'

export const runtime    = 'nodejs'
export const dynamic    = 'force-dynamic'
export const maxDuration = 15  // compression + signing is fast; 15s is generous

// ── Rate limiter: 5 creates / IP / 10 min ────────────────────────
// Same in-memory pattern as /api/validate-svg.
// NOTE: For production hardening replace with Vercel KV.
const rateMap   = new Map<string, { count: number; reset: number }>()
const RATE_LIMIT  = 5
const RATE_WINDOW = 10 * 60_000  // 10 minutes

function isRateLimited(ip: string): boolean {
  const now   = Date.now()
  const entry = rateMap.get(ip)
  if (!entry || now > entry.reset) {
    rateMap.set(ip, { count: 1, reset: now + RATE_WINDOW })
    return false
  }
  if (entry.count >= RATE_LIMIT) return true
  entry.count++
  return false
}

// ── Request schema ────────────────────────────────────────────────
const RequestSchema = z.object({
  /** Animated SVG outerHTML — may include injected <style data-rf> keyframes */
  svg: z.string().min(10).max(5 * 1024 * 1024),
})

// ── POST handler ──────────────────────────────────────────────────
export async function POST(request: Request) {
  // Rate limit by IP
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return err('Too many share requests — please wait a few minutes', 429)
  }

  // Parse body
  let body: unknown
  try { body = await request.json() }
  catch { return err('Invalid JSON body', 400) }

  const parse = RequestSchema.safeParse(body)
  if (!parse.success) {
    return err(parse.error.issues[0]?.message ?? 'Invalid request body', 400)
  }

  // Must contain at least an <svg> element
  if (!parse.data.svg.trim().toLowerCase().includes('<svg')) {
    return err('Payload must be a valid SVG element', 400)
  }

  // Create signed token (sanitizes + compresses + signs)
  let token: string
  try {
    token = await createShareToken(parse.data.svg)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create share link'
    const status  = message.includes('too large') || message.includes('exceeds') ? 413 : 500
    // Log server-side errors for Vercel Functions tab observability
    if (status === 500) {
      console.error('[share] createShareToken failed', { ip, error: message })
    }
    return err(message, status)
  }

  const APP_URL   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://reframeo.com'
  const url       = `${APP_URL}/s/${token}`
  const expiresAt = new Date(Date.now() + SHARE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Fire analytics after the response is sent — never blocks or crashes the route
  after(() => {
    try {
      getPostHogClient()?.capture({ distinctId: `server_${ip}`, event: 'share_created' })
    } catch { /* non-critical */ }
  })

  return NextResponse.json({ token, url, expiresAt }, { status: 201 })
}

// ── Helper ────────────────────────────────────────────────────────
function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
