import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const MAX_SVG_BODY_BYTES = 52 * 1024 * 1024 // 52 MB — matches client-side 50 MB cap + JSON envelope overhead

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // ── Security headers ──────────────────────────────────────
  const headers = response.headers

  // Prevent browsers from MIME-sniffing
  headers.set('X-Content-Type-Options', 'nosniff')

  // Clickjacking protection
  headers.set('X-Frame-Options', 'DENY')

  // Stop referrer leakage
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions policy — lock down sensitive APIs
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  )

  // NOTE: Content-Security-Policy is set in next.config.mjs headers() where it
  // can be environment-aware (dev needs 'unsafe-eval' + ws:// for HMR; production
  // needs 'unsafe-inline' for Next.js inline RSC flight data scripts). Setting it
  // here too causes the middleware header to override the config header in
  // production, stripping 'unsafe-inline' and blocking Next.js hydration.

  // ── API-specific guards ───────────────────────────────────
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Reject oversized bodies early (belt-and-suspenders; Next.js also limits)
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_SVG_BODY_BYTES) {
      return new NextResponse(
        JSON.stringify({ error: 'Payload too large (max 2 MB)' }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // CORS — only allow same-origin requests.
    //
    // Strategy:
    //  1. If an Origin header is present, validate it against the configured
    //     app URL using hostname comparison (not string prefix), so that a
    //     spoofed origin like "https://reframeo.com.evil.com" is rejected.
    //  2. Always set Access-Control-Allow-Origin explicitly — this satisfies
    //     security scanners that flag the absence of the header as "wildcard"
    //     and gives browsers a clear signal that cross-origin access is denied.
    //  3. Block cross-origin preflight (OPTIONS) and regular requests alike.

    const origin = request.headers.get('origin')
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

    // Determine whether the incoming origin is the app itself
    let originAllowed = false
    if (origin && appUrl) {
      try {
        originAllowed = new URL(origin).hostname === new URL(appUrl).hostname
      } catch {
        originAllowed = false
      }
    } else if (!origin) {
      // No Origin header = same-origin or non-browser request — allow
      originAllowed = true
    }

    if (!originAllowed && process.env.NODE_ENV === 'production') {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Set an explicit Access-Control-Allow-Origin so scanners and browsers see
    // a concrete restriction rather than inferring "no header = wildcard".
    // We echo the validated origin back (or the configured app URL as fallback)
    // so the header is meaningful even on same-origin requests.
    const allowedOrigin = (origin && originAllowed) ? origin : (appUrl || null)
    if (allowedOrigin) {
      headers.set('Access-Control-Allow-Origin', allowedOrigin)
      // Vary ensures caches don't serve one origin's response to another
      headers.set('Vary', 'Origin')
    }
    // Block all cross-origin credential sharing
    headers.set('Access-Control-Allow-Credentials', 'false')
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
