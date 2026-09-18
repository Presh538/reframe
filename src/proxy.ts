import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server'
import { allowedAppOrigins, isAllowedAppOrigin } from '@/lib/app-origin'

const MAX_SVG_BODY_BYTES = 52 * 1024 * 1024
const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
)

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  )
  return response
}

function securityProxy(request: NextRequest): NextResponse {
  const response = applySecurityHeaders(NextResponse.next())

  if (!request.nextUrl.pathname.startsWith('/api/')) return response

  const contentLength = request.headers.get('content-length')
  if (contentLength && Number.parseInt(contentLength, 10) > MAX_SVG_BODY_BYTES) {
    return applySecurityHeaders(
      NextResponse.json({ error: 'Payload too large (max 50 MB)' }, { status: 413 }),
    )
  }

  const origin = request.headers.get('origin')
  const allowedOrigins = allowedAppOrigins()

  // No Origin header at all is a same-origin navigation or a non-browser call.
  const originAllowed = !origin || isAllowedAppOrigin(origin)

  if (!originAllowed && process.env.NODE_ENV === 'production') {
    return applySecurityHeaders(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
  }

  const allowedOrigin = origin && originAllowed ? origin : (allowedOrigins[0] ?? null)
  if (allowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    response.headers.set('Vary', 'Origin')
  }
  response.headers.set('Access-Control-Allow-Credentials', 'false')
  return response
}

const authenticatedProxy = clerkConfigured
  ? clerkMiddleware((_auth, request) => securityProxy(request))
  : null

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  return authenticatedProxy ? authenticatedProxy(request, event) : securityProxy(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
}
