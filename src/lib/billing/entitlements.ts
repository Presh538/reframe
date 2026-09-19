import 'server-only'

import { and, eq, gt, isNull, lte, or, sql } from 'drizzle-orm'
import { getDatabase } from '@/lib/db/client'
import { accountAccessSnapshots, creditAccounts, entitlementGrants } from '@/lib/db/schema'
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
  ],
  studio: [...FEATURE_KEYS],
}

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
    .select({ featureKey: entitlementGrants.featureKey })
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

  // Derive the display plan from the capabilities actually held, so a
  // promotional grant cannot silently present itself as a paid subscription.
  const planKey = PLAN_FEATURES.studio.every((key) => features[key])
    ? 'studio'
    : PLAN_FEATURES.pro.every((key) => features[key])
      ? 'pro'
      : 'free'

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
