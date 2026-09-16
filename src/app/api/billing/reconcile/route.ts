import { NextResponse, type NextRequest } from 'next/server'
import { AuthenticationRequiredError, requireCurrentAppUser } from '@/lib/auth/current-user'
import { getAccountAccess, rebuildAccessSnapshot } from '@/lib/billing/entitlements'
import {
  grantSubscriptionPeriodCredits,
  syncSubscription,
  UntrustedBillingEventError,
  type SubscriptionState,
} from '@/lib/billing/fulfillment'
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
 * POST /api/billing/reconcile — recovery path for an unusually delayed webhook.
 *
 * This is NOT the normal authorization path. Ordinary access is decided by the
 * local entitlement tables written by verified webhooks; this endpoint only
 * repairs a user whose paid state has not arrived yet, and it repairs the
 * caller's own account only -- the Polar lookup is keyed by the session's
 * internal UUID, never by an identifier supplied in the request.
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, { name: 'billing-reconcile', limit: 12, window: '1 h' })
    if (!rateLimit.success) return response({ error: 'Too many reconciliation attempts' }, 429)
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return response({ error: 'Reconciliation temporarily unavailable' }, 503)
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

  let state
  try {
    state = await getPolarClient().customers.getStateExternal(
      { externalId: user.id },
      { timeoutMs: 10_000 },
    )
  } catch {
    // No Polar customer yet simply means nothing has been purchased.
    await rebuildAccessSnapshot(user.id)
    const access = await getAccountAccess(user.id)
    return response({ reconciled: false, plan: access.planKey, features: access.features }, 200)
  }

  let synced = 0
  for (const subscription of state.activeSubscriptions) {
    const normalized: SubscriptionState = {
      providerSubscriptionId: subscription.id,
      userId: user.id,
      providerProductId: subscription.productId,
      status: String(subscription.status),
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      canceledAt: subscription.canceledAt,
      endedAt: subscription.endsAt,
    }

    try {
      await syncSubscription(normalized)
      await grantSubscriptionPeriodCredits(normalized)
      synced += 1
    } catch (error) {
      if (error instanceof UntrustedBillingEventError) continue
      throw error
    }
  }

  // One-time orders are deliberately NOT fulfilled here. Granting a pass or a
  // credit pack from a polled read would bypass the signed webhook that is the
  // only trusted proof of payment.
  await rebuildAccessSnapshot(user.id)
  const access = await getAccountAccess(user.id)

  return response({
    reconciled: synced > 0,
    subscriptionsSynced: synced,
    plan: access.planKey,
    features: access.features,
  }, 200)
}
