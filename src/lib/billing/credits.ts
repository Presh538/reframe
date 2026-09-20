import 'server-only'

import { and, eq, gt, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm'
import { STALE_RESERVATION_MS } from '@/lib/billing/policy'
import { refundedCreditTarget } from '@/lib/billing/lifecycle-policy'
import { getDatabase } from '@/lib/db/client'
import {
  creditAccounts,
  billingOrders,
  creditGrants,
  creditLedger,
  usageCreditAllocations,
  usageOperations,
} from '@/lib/db/schema'

export type CreditGrantType = 'free_allowance' | 'purchase' | 'subscription' | 'promotion' | 'admin'
export type CreditSourceType = 'free_allowance' | 'order' | 'subscription' | 'admin'

export class InsufficientCreditsError extends Error {
  constructor() {
    super('Insufficient AI credits')
    this.name = 'InsufficientCreditsError'
  }
}

export class CreditOperationStateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CreditOperationStateError'
  }
}

export async function grantCredits(input: {
  userId: string
  amount: number
  grantType: CreditGrantType
  sourceType: CreditSourceType
  sourceId: string
  idempotencyKey: string
  expiresAt?: Date | null
}, transaction?: Transaction): Promise<{ granted: boolean; grantId: string | null }> {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new Error('Credit grant amount must be a positive integer')
  }

  const grantWithin = async (tx: Transaction) => {
    await tx.insert(creditAccounts).values({
      userId: input.userId,
      creditType: 'ai_generation',
    }).onConflictDoNothing()

    await tx.select().from(creditAccounts).where(eq(creditAccounts.userId, input.userId)).for('update').limit(1)

    const [grant] = await tx.insert(creditGrants).values({
      userId: input.userId,
      creditType: 'ai_generation',
      grantType: input.grantType,
      sourceId: input.sourceId,
      amount: input.amount,
      remaining: input.amount,
      expiresAt: input.expiresAt ?? null,
      idempotencyKey: input.idempotencyKey,
    }).onConflictDoNothing().returning({ id: creditGrants.id })

    if (!grant) return { granted: false, grantId: null }

    await tx.update(creditAccounts).set({
      available: sql`${creditAccounts.available} + ${input.amount}`,
      version: sql`${creditAccounts.version} + 1`,
      updatedAt: new Date(),
    }).where(and(
      eq(creditAccounts.userId, input.userId),
      eq(creditAccounts.creditType, 'ai_generation'),
    ))

    await tx.insert(creditLedger).values({
      userId: input.userId,
      creditType: 'ai_generation',
      entryType: input.grantType === 'purchase' ? 'purchase' : 'grant',
      deltaAvailable: input.amount,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      creditGrantId: grant.id,
      idempotencyKey: `grant:${input.idempotencyKey}`,
      expiresAt: input.expiresAt ?? null,
    })

    return { granted: true, grantId: grant.id }
  }
  return transaction ? grantWithin(transaction) : getDatabase().transaction(grantWithin)
}

/** Reserves one AI unit and binds it to the earliest-expiring eligible grant. */
/**
 * What a reserved unit is being spent on. Both draw from the same
 * ai_generation balance -- exports without a watermark are priced in the same
 * credits -- but they are recorded separately so usage stays legible.
 */
export type UsageOperationType = 'ai_animation' | 'export_watermark_free'

export async function reserveAiCredit(input: {
  userId: string
  idempotencyKey: string
  operationType?: UsageOperationType
}): Promise<{ operationId: string; status: string; charged: boolean }> {
  return getDatabase().transaction(async (tx) => {
    const [existing] = await tx.select({
      id: usageOperations.id,
      status: usageOperations.status,
    }).from(usageOperations).where(and(
      eq(usageOperations.userId, input.userId),
      eq(usageOperations.idempotencyKey, input.idempotencyKey),
    )).limit(1)

    if (existing) return { operationId: existing.id, status: existing.status, charged: false }

    let [account] = await tx.select().from(creditAccounts).where(and(
      eq(creditAccounts.userId, input.userId),
      eq(creditAccounts.creditType, 'ai_generation'),
    )).for('update').limit(1)

    if (!account) throw new InsufficientCreditsError()

    // Self-heal before refusing. A request that died between reserving and
    // settling leaves its unit stranded in `reserved`, which would otherwise
    // look identical to an empty balance until the daily sweep runs.
    //
    // skipLocked is required: this transaction already holds the account row
    // and acquires operation rows second, while releaseAiCredit acquires them
    // in the opposite order. Skipping contended rows breaks the cycle -- a
    // reservation another transaction is actively releasing needs no help here.
    if (account.available < 1 && account.reserved > 0) {
      const stale = await tx.select().from(usageOperations).where(and(
        eq(usageOperations.userId, input.userId),
        inArray(usageOperations.status, ['reserved', 'running']),
        lt(usageOperations.reservedAt, new Date(Date.now() - STALE_RESERVATION_MS)),
      )).for('update', { skipLocked: true }).limit(20)

      for (const operation of stale) {
        await releaseOperationWithin(tx, operation, 'stale_reservation')
      }

      if (stale.length > 0) {
        ;[account] = await tx.select().from(creditAccounts).where(and(
          eq(creditAccounts.userId, input.userId),
          eq(creditAccounts.creditType, 'ai_generation'),
        )).limit(1)
      }
    }

    if (!account || account.available < 1) throw new InsufficientCreditsError()

    const now = new Date()
    const [grant] = await tx.select().from(creditGrants).where(and(
      eq(creditGrants.userId, input.userId),
      eq(creditGrants.creditType, 'ai_generation'),
      gt(creditGrants.remaining, 0),
      lte(creditGrants.startsAt, now),
      isNull(creditGrants.revokedAt),
      or(isNull(creditGrants.expiresAt), gt(creditGrants.expiresAt, now)),
    )).orderBy(sql`${creditGrants.expiresAt} asc nulls last`, creditGrants.createdAt)
      .for('update')
      .limit(1)

    if (!grant) throw new InsufficientCreditsError()

    const [operation] = await tx.insert(usageOperations).values({
      userId: input.userId,
      operationType: input.operationType ?? 'ai_animation',
      status: 'reserved',
      units: 1,
      idempotencyKey: input.idempotencyKey,
    }).returning({ id: usageOperations.id, status: usageOperations.status })

    await tx.update(creditGrants).set({
      remaining: sql`${creditGrants.remaining} - 1`,
    }).where(eq(creditGrants.id, grant.id))

    await tx.update(creditAccounts).set({
      available: sql`${creditAccounts.available} - 1`,
      reserved: sql`${creditAccounts.reserved} + 1`,
      version: sql`${creditAccounts.version} + 1`,
      updatedAt: now,
    }).where(and(
      eq(creditAccounts.userId, input.userId),
      eq(creditAccounts.creditType, 'ai_generation'),
    ))

    await tx.insert(usageCreditAllocations).values({
      usageOperationId: operation.id,
      creditGrantId: grant.id,
      units: 1,
    })

    await tx.insert(creditLedger).values({
      userId: input.userId,
      creditType: 'ai_generation',
      entryType: 'reserve',
      deltaAvailable: -1,
      deltaReserved: 1,
      sourceType: 'usage',
      sourceId: operation.id,
      creditGrantId: grant.id,
      idempotencyKey: `usage:${operation.id}:reserve`,
    })

    return { operationId: operation.id, status: operation.status, charged: true }
  })
}

export async function completeAiCredit(input: {
  operationId: string
  providerRequestId?: string
  inputTokens?: number
  outputTokens?: number
  estimatedCostMicros?: number
}): Promise<void> {
  await getDatabase().transaction(async (tx) => {
    const [operation] = await tx.select().from(usageOperations)
      .where(eq(usageOperations.id, input.operationId)).for('update').limit(1)

    if (!operation) throw new CreditOperationStateError('Unknown credit operation')
    if (operation.status === 'succeeded') return
    if (!['reserved', 'running'].includes(operation.status)) {
      throw new CreditOperationStateError(`Cannot complete operation in ${operation.status} state`)
    }

    const [updatedAccount] = await tx.update(creditAccounts).set({
      reserved: sql`${creditAccounts.reserved} - ${operation.units}`,
      version: sql`${creditAccounts.version} + 1`,
      updatedAt: new Date(),
    }).where(and(
      eq(creditAccounts.userId, operation.userId),
      eq(creditAccounts.creditType, 'ai_generation'),
      sql`${creditAccounts.reserved} >= ${operation.units}`,
    )).returning({ userId: creditAccounts.userId })

    if (!updatedAccount) throw new CreditOperationStateError('Reserved balance invariant failed')

    await tx.insert(creditLedger).values({
      userId: operation.userId,
      creditType: 'ai_generation',
      entryType: 'consume',
      deltaReserved: -operation.units,
      sourceType: 'usage',
      sourceId: operation.id,
      idempotencyKey: `usage:${operation.id}:consume`,
    }).onConflictDoNothing()

    await tx.update(usageOperations).set({
      status: 'succeeded',
      providerRequestId: input.providerRequestId,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      estimatedCostMicros: input.estimatedCostMicros,
      completedAt: new Date(),
    }).where(eq(usageOperations.id, operation.id))
  })
}

type Transaction = Parameters<Parameters<ReturnType<typeof getDatabase>['transaction']>[0]>[0]
type ReservedOperation = typeof usageOperations.$inferSelect

/**
 * Returns one reservation's units inside a caller-supplied transaction.
 *
 * Shared by the explicit release path and the opportunistic sweep so both
 * restore the grant bucket, the account, and the ledger identically.
 */
async function releaseOperationWithin(
  tx: Transaction,
  operation: ReservedOperation,
  errorCode: string,
): Promise<void> {
  const allocations = await tx.select().from(usageCreditAllocations)
    .where(eq(usageCreditAllocations.usageOperationId, operation.id))

  // Always lock account before grants, matching reserve/refund/expiry order.
  await tx.select().from(creditAccounts).where(eq(creditAccounts.userId, operation.userId)).for('update').limit(1)
  let restored = 0
  let releasedEligible = 0
  for (const allocation of allocations) {
    const [grant] = await tx.select().from(creditGrants).where(eq(creditGrants.id, allocation.creditGrantId)).for('update').limit(1)
    if (!grant || grant.revokedAt || (grant.expiresAt && grant.expiresAt <= new Date())) continue
    let withheld = 0
    const [order] = await tx.select().from(billingOrders).where(and(eq(billingOrders.userId, operation.userId),
      eq(billingOrders.providerOrderId, grant.sourceId))).limit(1)
    if (order && order.refundedAmountMinor > 0 && order.netAmountMinor > 0) {
      const [prior] = await tx.select({ removed: sql<number>`coalesce(sum(-${creditLedger.deltaAvailable}), 0)::bigint` })
        .from(creditLedger).where(and(eq(creditLedger.creditGrantId, grant.id), eq(creditLedger.entryType, 'refund')))
      withheld = Math.min(Number(allocation.units), Math.max(0,
        refundedCreditTarget(grant.amount, order.refundedAmountMinor, order.netAmountMinor) - Number(prior?.removed ?? 0)))
      if (withheld > 0) await tx.insert(creditLedger).values({ userId: operation.userId, creditType: 'ai_generation',
        entryType: 'refund', deltaAvailable: -withheld, sourceType: 'refund', sourceId: order.providerOrderId,
        creditGrantId: grant.id, idempotencyKey: `usage:${operation.id}:release-refund:${grant.id}` })
    }
    releasedEligible += Number(allocation.units)
    restored += Number(allocation.units) - withheld
    await tx.update(creditGrants).set({
      remaining: sql`${creditGrants.remaining} + ${Number(allocation.units) - withheld}`,
    }).where(eq(creditGrants.id, allocation.creditGrantId))
  }

  const [updatedAccount] = await tx.update(creditAccounts).set({
    available: sql`${creditAccounts.available} + ${restored}`,
    reserved: sql`${creditAccounts.reserved} - ${operation.units}`,
    version: sql`${creditAccounts.version} + 1`,
    updatedAt: new Date(),
  }).where(and(
    eq(creditAccounts.userId, operation.userId),
    eq(creditAccounts.creditType, 'ai_generation'),
    sql`${creditAccounts.reserved} >= ${operation.units}`,
  )).returning({ userId: creditAccounts.userId })

  if (!updatedAccount) throw new CreditOperationStateError('Reserved balance invariant failed')

  await tx.insert(creditLedger).values({
    userId: operation.userId,
    creditType: 'ai_generation',
    entryType: 'release',
    deltaAvailable: releasedEligible,
    deltaReserved: -operation.units,
    sourceType: 'usage',
    sourceId: operation.id,
    idempotencyKey: `usage:${operation.id}:release`,
    metadata: { errorCode },
  }).onConflictDoNothing()

  await tx.update(usageOperations).set({
    status: 'released',
    errorCode,
    completedAt: new Date(),
  }).where(eq(usageOperations.id, operation.id))
}

export async function releaseAiCredit(operationId: string, errorCode: string): Promise<void> {
  await getDatabase().transaction(async (tx) => {
    const [operation] = await tx.select().from(usageOperations)
      .where(eq(usageOperations.id, operationId)).for('update').limit(1)

    if (!operation) throw new CreditOperationStateError('Unknown credit operation')
    if (operation.status === 'released' || operation.status === 'failed') return
    if (!['reserved', 'running'].includes(operation.status)) {
      throw new CreditOperationStateError(`Cannot release operation in ${operation.status} state`)
    }

    await releaseOperationWithin(tx, operation, errorCode)
  })
}
