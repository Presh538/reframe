import { NextResponse, type NextRequest } from 'next/server'
import { AuthenticationRequiredError, requireCurrentAppUser } from '@/lib/auth/current-user'
import { getPolarClient } from '@/lib/billing/polar'
import { checkRateLimit, RateLimitUnavailableError } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function response(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
}

/**
 * Issues a short-lived Polar customer portal session.
 *
 * The session is created from the internal user UUID held as Polar's
 * external customer ID, so a caller can never request another account's
 * portal by supplying an identifier.
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, { name: 'billing-portal', limit: 10, window: '1 h' })
    if (!rateLimit.success) return response({ error: 'Too many portal requests' }, 429)
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return response({ error: 'Billing portal temporarily unavailable' }, 503)
    }
    throw error
  }

  let user
  try {
    user = await requireCurrentAppUser()
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return response({ error: 'Authentication required' }, 401)
    throw error
  }

  try {
    const session = await getPolarClient().customerSessions.create(
      { externalCustomerId: user.id },
      { timeoutMs: 10_000 },
    )
    return response({ portalUrl: session.customerPortalUrl }, 200)
  } catch (error) {
    console.error('[billing-portal] session creation failed', {
      error: error instanceof Error ? error.name : 'unknown',
    })
    return response({ error: 'Billing portal temporarily unavailable' }, 503)
  }
}
