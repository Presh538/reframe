import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server'

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
  // A request may legitimately arrive from the configured canonical domain or
  // from the deployment's own Vercel URL. Preview deployments run with
  // NODE_ENV=production but are served from *.vercel.app, so without the
  // Vercel-provided origins every same-origin mutation on a preview would be
  // rejected as cross-origin. These are the deployment's own hostnames, so
  // accepting them does not widen the policy.
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
    process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`,
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => {
      try {
        return new URL(value).origin
      } catch {
        return null
      }
    })
    .filter((value): value is string => value !== null)

  // No Origin header at all is a same-origin navigation or a non-browser call.
  let originAllowed = !origin

  if (origin) {
    try {
      originAllowed = allowedOrigins.includes(new URL(origin).origin)
    } catch {
      originAllowed = false
    }
  }

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
