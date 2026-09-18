import 'server-only'

import { and, eq, gt, inArray, isNull, lt, lte, sql } from 'drizzle-orm'
import { releaseAiCredit } from '@/lib/billing/credits'
import { grantSubscriptionPeriodCredits } from '@/lib/billing/fulfillment'
import { rebuildAccessSnapshot } from '@/lib/billing/entitlements'
import { STALE_RESERVATION_MS } from '@/lib/billing/policy'
import { getDatabase } from '@/lib/db/client'
import {
  auditEvents,
  billingProducts,
  creditAccounts,
  creditGrants,
  creditLedger,
  entitlementGrants,
  subscriptions,
  usageOperations,
} from '@/lib/db/schema'

/**
 * Returns credits held by reservations whose request never finished.
 *
 * A process that dies between reserving and settling leaves the unit in
 * `reserved` forever, silently shrinking the customer's balance. Anything
 * older than the maximum generation timeout is assumed orphaned.
 */
export async function releaseStaleReservations(limit = 200): Promise<{ released: number; failed: number }> {
  const cutoff = new Date(Date.now() - STALE_RESERVATION_MS)
  const stale = await getDatabase()
    .select({ id: usageOperations.id })
    .from(usageOperations)
    .where(and(
      inArray(usageOperations.status, ['reserved', 'running']),
      lt(usageOperations.reservedAt, cutoff),
    ))
    .limit(limit)

  let released = 0
  let failed = 0

  for (const operation of stale) {
    try {
      await releaseAiCredit(operation.id, 'stale_reservation')
      released += 1
    } catch (error) {
      failed += 1
      console.error('[reconciliation] stale release failed', {
        operationId: operation.id,
        error: error instanceof Error ? error.name : 'unknown',
      })
    }
  }

  return { released, failed }
}

/**
 * Removes lapsed credits from the spendable balance.
 *
 * The reservation path already refuses to spend an expired grant, so this is
 * a correctness sweep rather than a security control: without it the balance
 * shown to the customer stays higher than what they can actually use.
 */
export async function expireLapsedCreditGrants(limit = 500): Promise<{ expired: number; credits: number }> {
  const now = new Date()
  const db = getDatabase()

  const lapsed = await db
    .select({
      id: creditGrants.id,
      userId: creditGrants.userId,
      remaining: creditGrants.remaining,
    })
    .from(creditGrants)
    .where(and(
      gt(creditGrants.remaining, 0),
      isNull(creditGrants.revokedAt),
      lte(creditGrants.expiresAt, now),
    ))
    .limit(limit)

  let expired = 0
  let credits = 0

  for (const grant of lapsed) {
    try {
      await db.transaction(async (tx) => {
        // Re-read under lock: a concurrent reservation may have just spent
        // from this grant, so the amount to remove is decided here, not above.
        const [locked] = await tx.select().from(creditGrants)
          .where(eq(creditGrants.id, grant.id)).for('update').limit(1)

        if (!locked || locked.remaining <= 0 || locked.revokedAt) return

        await tx.update(creditGrants)
          .set({ remaining: 0, revokedAt: now })
          .where(eq(creditGrants.id, locked.id))

        // Clamped so a bookkeeping drift can never push the account negative.
        await tx.update(creditAccounts).set({
          available: sql`greatest(0, ${creditAccounts.available} - ${locked.remaining})`,
          version: sql`${creditAccounts.version} + 1`,
          updatedAt: now,
        }).where(and(
          eq(creditAccounts.userId, locked.userId),
          eq(creditAccounts.creditType, 'ai_generation'),
        ))

        await tx.insert(creditLedger).values({
          userId: locked.userId,
          creditType: 'ai_generation',
          entryType: 'expire',
          deltaAvailable: -locked.remaining,
          sourceType: 'reconciliation',
          sourceId: locked.id,
          creditGrantId: locked.id,
          idempotencyKey: `expire:grant:${locked.id}`,
        }).onConflictDoNothing()

        expired += 1
        credits += locked.remaining
      })
    } catch (error) {
      console.error('[reconciliation] grant expiry failed', {
        grantId: grant.id,
        error: error instanceof Error ? error.name : 'unknown',
      })
    }
  }

  return { expired, credits }
}

/**
 * Rebuilds access snapshots for accounts whose entitlements have just lapsed.
 *
 * Polar normally sends `subscription.revoked` at period end, but a missed or
 * delayed webhook would otherwise leave paid features switched on. This makes
 * expiry converge without depending on the provider.
 */
export async function refreshLapsedAccess(lookbackHours = 26, limit = 500): Promise<{ rebuilt: number }> {
  const now = new Date()
  const since = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000)

  const lapsed = await getDatabase()
    .selectDistinct({ userId: entitlementGrants.userId })
    .from(entitlementGrants)
    .where(and(
      lte(entitlementGrants.expiresAt, now),
      gt(entitlementGrants.expiresAt, since),
    ))
    .limit(limit)

  let rebuilt = 0
  for (const row of lapsed) {
    try {
      await rebuildAccessSnapshot(row.userId)
      rebuilt += 1
    } catch (error) {
      console.error('[reconciliation] snapshot rebuild failed', {
        userId: row.userId,
        error: error instanceof Error ? error.name : 'unknown',
      })
    }
  }

  return { rebuilt }
}

/**
 * Issues this month's allowance to every entitled subscription.
 *
 * Annual plans receive no renewal event for eleven months of the year, so
 * without this sweep they would get a single monthly grant per year. Monthly
 * plans are included too: the calendar-month key makes it a no-op when the
 * renewal webhook already granted, and a repair when it was missed.
 */
export async function grantMonthlySubscriptionCredits(limit = 500): Promise<{ checked: number }> {
  const now = new Date()
  const rows = await getDatabase()
    .select()
    .from(subscriptions)
    .where(and(
      inArray(subscriptions.status, ['active', 'trialing', 'past_due']),
      gt(subscriptions.currentPeriodEnd, now),
    ))
    .limit(limit)

  let checked = 0
  for (const row of rows) {
    // Period columns are nullable in the mirror; a row without both is not
    // yet fully synced and is left for the next webhook.
    if (!row.currentPeriodStart || !row.currentPeriodEnd) continue
    const { currentPeriodStart, currentPeriodEnd } = row
    try {
      const [product] = await getDatabase().select().from(billingProducts)
        .where(eq(billingProducts.productKey, row.productKey)).limit(1)
      if (!product) continue

      await grantSubscriptionPeriodCredits({
        providerSubscriptionId: row.providerSubscriptionId,
        userId: row.userId,
        providerProductId: product.providerProductId,
        status: row.status,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: row.cancelAtPeriodEnd,
        canceledAt: row.canceledAt,
        endedAt: null,
      }, now)
      checked += 1
    } catch (error) {
      console.error('[reconciliation] monthly grant failed', {
        subscriptionId: row.providerSubscriptionId,
        error: error instanceof Error ? error.name : 'unknown',
      })
    }
  }
  return { checked }
}

export async function recordReconciliationAudit(summary: Record<string, number>): Promise<void> {
  try {
    await getDatabase().insert(auditEvents).values({
      actorType: 'system',
      action: 'billing.reconcile',
      targetType: 'billing',
      metadata: summary,
    })
  } catch { /* the audit trail must never fail the job itself */ }
}
