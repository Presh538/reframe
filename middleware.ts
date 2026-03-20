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

  // Content Security Policy
  headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      // Allow inline styles (Tailwind + injected SVG animations)
      "style-src 'self' 'unsafe-inline'",
      // Scripts: self only — gif.js is bundled via npm, worker served from /public
      "script-src 'self' 'unsafe-eval'",
      // Worker: blob: for gif.js web worker + self for /public/gif.worker.js
      "worker-src blob: 'self'",
      // Images: self, data URIs (canvas export), blob: (download links)
      "img-src 'self' data: blob: https://ik.imagekit.io",
      // Vercel Analytics + Speed Insights send data to vitals.vercel-insights.com
      "connect-src 'self' https://vitals.vercel-insights.com",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  )

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

    // CORS: only allow same-origin for API routes in production
    const origin = request.headers.get('origin')
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    if (
      process.env.NODE_ENV === 'production' &&
      origin &&
      origin !== appUrl
    ) {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
