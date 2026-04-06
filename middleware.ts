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

    // CORS: only allow same-origin for API routes in production.
    // Use URL hostname comparison instead of raw string equality so that
    // values like "https://reframeo.com.attacker.com" cannot spoof the check
    // by sharing a prefix with NEXT_PUBLIC_APP_URL.
    const origin = request.headers.get('origin')
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    if (process.env.NODE_ENV === 'production' && origin && appUrl) {
      try {
        const originHostname = new URL(origin).hostname
        const appHostname    = new URL(appUrl).hostname
        if (originHostname !== appHostname) {
          return new NextResponse(
            JSON.stringify({ error: 'Forbidden' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          )
        }
      } catch {
        // Malformed origin or appUrl — reject as a precaution
        return new NextResponse(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
