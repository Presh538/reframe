import 'server-only'

import { and, eq, gt, inArray, isNull, lte, or, sql } from 'drizzle-orm'
import { getDatabase } from '@/lib/db/client'
import { accountAccessSnapshots, creditAccounts, entitlementGrants, subscriptions } from '@/lib/db/schema'
import { getRedis } from '@/lib/redis'

/**
 * Stable feature keys. Code asks for a capability, never for a plan name, so
 * promotional grants and future repackaging do not require rewriting checks.
 */
export const FEATURE_KEYS = [
  'export.standard.unlimited',
  'export.4k',
  'export.transparent',
  'export.lottie',
  'share.permanent',
  'share.private',
  'project.history',
  'render.priority',
  'export.watermark_free',
] as const

export type FeatureKey = (typeof FEATURE_KEYS)[number]

export const PLAN_FEATURES: Record<string, FeatureKey[]> = {
  free: [],
  pro: [
    'export.standard.unlimited',
    'export.4k',
    'export.transparent',
    'export.lottie',
    'share.permanent',
    'share.private',
    'project.history',
    'export.watermark_free',
  ],
  studio: [...FEATURE_KEYS],
}

/**
 * Which plan each subscription product grants. The single place that answers
 * "is this account paying, and for what".
 */
export const PLAN_BY_PRODUCT: Record<string, string> = {
  pro_monthly: 'pro',
  pro_yearly: 'pro',
}

export function planForProductKey(productKey: string): string | null {
  return PLAN_BY_PRODUCT[productKey] ?? null
}

/** Subscription states that still confer the plan, matching fulfillment. */
const ENTITLING_STATUSES = ['active', 'trialing', 'past_due']

export type AccountAccess = {
  planKey: string
  features: Record<string, boolean>
  entitlementVersion: number
}

const FREE_ACCESS: AccountAccess = { planKey: 'free', features: {}, entitlementVersion: 0 }

const cacheKey = (userId: string) => `reframe:access:${userId}`

/**
 * Recomputes from live grants. Cached snapshots are not an authorization source.
 */
export async function getAccountAccess(userId: string): Promise<AccountAccess> {
  // Until a cache is explicitly bounded by the next grant expiry, live grants
  // are the authority. Missed cron jobs and invalidation failures cannot retain Pro.
  return rebuildAccessSnapshot(userId)
}

export async function invalidateAccessCache(userId: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.del(cacheKey(userId))
  } catch { /* non-critical */ }
}

export async function hasFeature(userId: string, featureKey: FeatureKey): Promise<boolean> {
  const access = await getAccountAccess(userId)
  return access.features[featureKey] === true
}

/**
 * Recomputes the snapshot from live entitlement grants -- the authoritative
 * rows -- rather than trusting whatever the last webhook happened to write.
 * Safe to run at any time; this is also the admin repair path.
 */
export async function rebuildAccessSnapshot(userId: string): Promise<AccountAccess> {
  const now = new Date()
  const result = await getDatabase().transaction(async db => {
  // Serialize with subscription changes so a stale rebuild cannot win a race.
  await db.select().from(creditAccounts).where(eq(creditAccounts.userId, userId)).for('update').limit(1)

  const active = await db
    .select({
      featureKey: entitlementGrants.featureKey,
      sourceType: entitlementGrants.sourceType,
      sourceId: entitlementGrants.sourceId,
    })
    .from(entitlementGrants)
    .where(
      and(
        eq(entitlementGrants.userId, userId),
        eq(entitlementGrants.scopeType, 'account'),
        isNull(entitlementGrants.revokedAt),
        lte(entitlementGrants.startsAt, now),
        or(isNull(entitlementGrants.expiresAt), gt(entitlementGrants.expiresAt, now)),
      ),
    )

  const features: Record<string, boolean> = {}
  for (const grant of active) features[grant.featureKey] = true

  // The plan comes from the subscription the account actually holds, not from
  // the set of features it happens to have.
  //
  // This used to require holding EVERY feature of a plan. That made the plan
  // name a hostage to the feature list: adding one key to PLAN_FEATURES
  // demoted every existing subscriber to 'free' until their grants were
  // re-synced, because their rows predated the new key. Adding
  // export.watermark_free did exactly that to a live subscriber.
  //
  // Capability is still decided by the grants -- hasFeature() reads `features`
  // -- so an account can hold a feature without holding the plan, and a
  // promotional grant still cannot present itself as a paid subscription.
  const [entitling] = await db
    .select({
      productKey: subscriptions.productKey,
      providerSubscriptionId: subscriptions.providerSubscriptionId,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        inArray(subscriptions.status, ENTITLING_STATUSES),
        gt(subscriptions.currentPeriodEnd, now),
        isNull(subscriptions.endedAt),
      ),
    )
    .limit(1)

  // The subscription names the plan, but the grants still decide whether it is
  // in force: the plan holds only while that subscription has at least one
  // live grant. So a mirror row left 'active' by a missed revocation webhook
  // cannot keep an account on Pro past the expiry of what it was granted --
  // the rule the expiry test pins down.
  const heldBySubscription = entitling !== undefined && active.some(
    (grant) => grant.sourceType === 'subscription' && grant.sourceId === entitling.providerSubscriptionId,
  )

  const planKey = (heldBySubscription && PLAN_BY_PRODUCT[entitling.productKey]) || 'free'

  await db
    .insert(accountAccessSnapshots)
    .values({ userId, planKey, features, entitlementVersion: 1, computedAt: now })
    .onConflictDoUpdate({
      target: accountAccessSnapshots.userId,
      set: {
        planKey,
        features,
        entitlementVersion: sql`${accountAccessSnapshots.entitlementVersion} + 1`,
        computedAt: now,
      },
    })

  const [snapshot] = await db
    .select()
    .from(accountAccessSnapshots)
    .where(eq(accountAccessSnapshots.userId, userId))
    .limit(1)

  return snapshot
      ? { planKey: snapshot.planKey, features: snapshot.features ?? {}, entitlementVersion: snapshot.entitlementVersion }
    : FREE_ACCESS
  })
  await invalidateAccessCache(userId)
  return result
}
