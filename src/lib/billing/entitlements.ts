import 'server-only'

import { and, eq, gt, isNull, lte, or, sql } from 'drizzle-orm'
import { getDatabase } from '@/lib/db/client'
import { accountAccessSnapshots, entitlementGrants } from '@/lib/db/schema'
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

/** Short TTL: a stale read costs at most one cache window of feature access. */
const CACHE_TTL_SECONDS = 45
const cacheKey = (userId: string) => `reframe:access:${userId}`

/**
 * Reads the denormalized access snapshot, preferring a short Redis cache.
 *
 * Feature access is safe to cache because it is boolean and revocation is
 * followed by an explicit invalidation. Spendable credit balances are NOT
 * cached anywhere -- those are decided by an atomic Postgres transaction.
 */
export async function getAccountAccess(userId: string): Promise<AccountAccess> {
  const redis = getRedis()

  if (redis) {
    try {
      const cached = await redis.get<AccountAccess>(cacheKey(userId))
      if (cached && typeof cached.planKey === 'string') return cached
    } catch { /* cache failures must never block an entitlement read */ }
  }

  const [snapshot] = await getDatabase()
    .select()
    .from(accountAccessSnapshots)
    .where(eq(accountAccessSnapshots.userId, userId))
    .limit(1)

  const access: AccountAccess = snapshot
    ? {
        planKey: snapshot.planKey,
        features: snapshot.features ?? {},
        entitlementVersion: snapshot.entitlementVersion,
      }
    : FREE_ACCESS

  if (redis) {
    try {
      await redis.set(cacheKey(userId), access, { ex: CACHE_TTL_SECONDS })
    } catch { /* non-critical */ }
  }

  return access
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
  const db = getDatabase()

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

  await invalidateAccessCache(userId)

  const [snapshot] = await db
    .select()
    .from(accountAccessSnapshots)
    .where(eq(accountAccessSnapshots.userId, userId))
    .limit(1)

  return snapshot
    ? { planKey: snapshot.planKey, features: snapshot.features ?? {}, entitlementVersion: snapshot.entitlementVersion }
    : FREE_ACCESS
}
