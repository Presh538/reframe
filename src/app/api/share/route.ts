/**
 * POST /api/share — store an animated SVG and return a short share link.
 *
 * Accepts: { svg: string }  (animated SVG outerHTML from liveSvgRef)
 * Returns: { token: string, url: string, expiresAt: string }
 *          (`token` is the short Blob storage ID embedded in the URL)
 *
 * Security:
 *  – Rate-limited: 5 creates per IP per 10 minutes
 *  – SVG size-limited: 5 MB raw / 2 MB stored (compressed)
 *  – SVG sanitized + stored in private Vercel Blob (see src/lib/share.ts)
 *  – Share ID is 16 random bytes (unguessable bearer capability)
 *  – No user-controlled data is reflected verbatim in response
 */

import { after }       from 'next/server'
import { NextResponse } from 'next/server'
import { z }            from 'zod'
import { createShare, SHARE_TTL_DAYS } from '@/lib/share'
import { getPostHogClient } from '@/lib/posthog-server'
import { checkRateLimit, RateLimitUnavailableError } from '@/lib/rate-limit'

export const runtime    = 'nodejs'
export const dynamic    = 'force-dynamic'
export const maxDuration = 15  // sanitize + compress + Blob upload; 15s is generous

// ── Request schema ────────────────────────────────────────────────
const RequestSchema = z.object({
  /** Animated SVG outerHTML — may include injected <style data-rf> keyframes */
  svg: z.string().min(10).max(5 * 1024 * 1024),
})

// ── POST handler ──────────────────────────────────────────────────
export async function POST(request: Request) {
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'unknown'
  let rateLimit
  try {
    rateLimit = await checkRateLimit(request, { name: 'share-create', limit: 5, window: '10 m' })
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) return err('Sharing is temporarily unavailable', 503)
    throw error
  }
  if (!rateLimit.success) return err('Too many share requests — please wait a few minutes', 429)

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

  // Sanitize + compress + store in Vercel Blob; returns a short share ID
  let id: string
  try {
    id = await createShare(parse.data.svg)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create share link'
    const isSize  = message.includes('too large') || message.includes('exceeds')
    // Size errors are the user's fault (413); anything else is a server/storage issue (500).
    const status  = isSize ? 413 : 500
    if (status === 500) {
      console.error('[share] createShare failed', { ip, error: message })
      // Don't leak storage/config details to the client
      return err('Couldn’t create a share link right now. Please try again.', 500)
    }
    return err(message, status)
  }

  const APP_URL   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://reframeo.com'
  const url       = `${APP_URL}/s/${id}`
  const expiresAt = new Date(Date.now() + SHARE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Fire analytics after the response is sent — never blocks or crashes the route
  after(() => {
    try {
      getPostHogClient()?.capture({ distinctId: `server_${ip}`, event: 'share_created' })
    } catch { /* non-critical */ }
  })

  return NextResponse.json({ token: id, url, expiresAt }, { status: 201 })
}

// ── Helper ────────────────────────────────────────────────────────
function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
