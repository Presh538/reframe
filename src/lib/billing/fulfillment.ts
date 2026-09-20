import 'server-only'
import type { Order } from '@polar-sh/sdk/models/components/order.js'
import type { Subscription } from '@polar-sh/sdk/models/components/subscription.js'
import { and, desc, eq, gt, gte, lt, inArray, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { recordAudit } from './audit'
import { grantCredits } from './credits'
import { ENTITLING_STATUSES, PLAN_FEATURES, planForProductKey, rebuildAccessSnapshot } from './entitlements'
import { acceptSubscriptionState, allowanceWindow, refundedCreditTarget } from './lifecycle-policy'
import { ALLOWANCE } from './policy'
import { getDatabase } from '@/lib/db/client'
import { appUsers, billingCustomers, billingOrders, billingOrderItems, billingProducts, checkoutIntents,
  creditAccounts, creditGrants, creditLedger, exportPasses, subscriptions, entitlementGrants } from '@/lib/db/schema'

type Tx = Parameters<Parameters<ReturnType<typeof getDatabase>['transaction']>[0]>[0]
export class UntrustedBillingEventError extends Error {
  constructor(message: string) { super(message); this.name = 'UntrustedBillingEventError' }
}
export type SubscriptionState = {
  providerSubscriptionId: string; userId: string; providerProductId: string; status: string
  currentPeriodStart: Date; currentPeriodEnd: Date; cancelAtPeriodEnd: boolean
  canceledAt: Date | null; endedAt: Date | null; observedAt?: Date
}
const planProduct = (key: string) => planForProductKey(key) !== null

async function lockAccount(tx: Tx, userId: string) {
  const [account] = await tx.select().from(creditAccounts).where(and(eq(creditAccounts.userId, userId),
    eq(creditAccounts.creditType, 'ai_generation'))).for('update').limit(1)
  if (!account) throw new UntrustedBillingEventError('Missing credit account')
  return account
}

async function trustedOrder(tx: Tx, order: Order, includeInactive = false) {
  const identity = z.string().uuid().safeParse(order.customer.externalId)
  if (!identity.success || !order.productId) throw new UntrustedBillingEventError('Invalid order references')
  const [user] = await tx.select().from(appUsers).where(and(eq(appUsers.id, identity.data), eq(appUsers.status, 'active'))).limit(1)
  const [product] = await tx.select().from(billingProducts).where(and(eq(billingProducts.providerProductId, order.productId), includeInactive ? undefined : eq(billingProducts.active, true))).limit(1)
  if (!user || !product) throw new UntrustedBillingEventError('Unknown user or product')
  await lockAccount(tx, user.id)
  return { user, product }
}

/** Mirrors advance pending orders but cannot undo settled refund/dispute state. */
function isoOrNull(value: Date | null | undefined): string | null {
  return value instanceof Date && Number.isFinite(value.getTime()) ? value.toISOString() : null
}

async function mirrorWithin(tx: Tx, order: Order, userId: string, productKey: string) {
  const refunded = order.refundedAmount ?? 0
  if (![order.netAmount, order.totalAmount, refunded].every(Number.isSafeInteger) || order.netAmount < 0 || refunded < 0) throw new UntrustedBillingEventError('Invalid amounts')
  const status = refunded > 0 ? (refunded >= order.netAmount ? 'refunded' : 'partially_refunded') : order.paid ? 'paid' : 'pending'
  await tx.insert(billingCustomers).values({ userId, providerCustomerId: order.customerId, externalCustomerId: userId })
    .onConflictDoUpdate({ target: billingCustomers.userId, set: { providerCustomerId: order.customerId, updatedAt: new Date() } })
  const [row] = await tx.insert(billingOrders).values({
    userId, providerOrderId: order.id, providerCheckoutId: order.checkoutId ?? null,
    providerSubscriptionId: order.subscriptionId ?? order.subscription?.id ?? null,
    periodStart: order.subscription?.currentPeriodStart ?? null, periodEnd: order.subscription?.currentPeriodEnd ?? null,
    status, currency: order.currency.toUpperCase(), amountMinor: order.totalAmount,
    netAmountMinor: order.netAmount, refundedAmountMinor: refunded, paidAt: order.paid ? new Date() : null,
  }).onConflictDoUpdate({ target: billingOrders.providerOrderId, set: {
    status: sql`case when ${billingOrders.status} in ('refunded', 'partially_refunded', 'disputed') then ${billingOrders.status}
      when ${status} in ('refunded', 'partially_refunded') then ${status}
      when ${billingOrders.status} = 'paid' then 'paid' else ${status} end`,
    amountMinor: sql`case when ${billingOrders.status} = 'pending' then ${order.totalAmount} else ${billingOrders.amountMinor} end`,
    netAmountMinor: sql`case when ${billingOrders.status} = 'pending' or ${billingOrders.netAmountMinor} = 0 then ${order.netAmount} else ${billingOrders.netAmountMinor} end`,
    refundedAmountMinor: sql`greatest(${billingOrders.refundedAmountMinor}, ${refunded})`,
    providerSubscriptionId: sql`coalesce(${billingOrders.providerSubscriptionId}, ${order.subscriptionId ?? order.subscription?.id ?? null})`,
    // Raw SQL parameters carry no column type, so postgres.js cannot serialize
    // a JS Date inside them and throws. Bind ISO strings with an explicit cast.
    periodStart: sql`coalesce(${billingOrders.periodStart}, ${isoOrNull(order.subscription?.currentPeriodStart)}::timestamptz)`,
    periodEnd: sql`coalesce(${billingOrders.periodEnd}, ${isoOrNull(order.subscription?.currentPeriodEnd)}::timestamptz)`,
    paidAt: sql`coalesce(${billingOrders.paidAt}, ${order.paid ? new Date().toISOString() : null}::timestamptz)`, updatedAt: new Date(),
  } }).returning()
  if (row.userId !== userId) throw new UntrustedBillingEventError('Order ownership mismatch')
  await tx.insert(billingOrderItems).values({ orderId: row.id, productKey, providerProductId: order.productId!, quantity: 1,
    amountMinor: order.netAmount }).onConflictDoNothing()
  return row
}

export async function recordOrderMirror(order: Order): Promise<string | null> {
  return getDatabase().transaction(async tx => {
    const { user, product } = await trustedOrder(tx, order, true)
    return (await mirrorWithin(tx, order, user.id, product.productKey)).id
  })
}

export function subscriptionStateFromWebhook(subscription: Subscription, observedAt?: Date): SubscriptionState {
  const identity = z.string().uuid().safeParse(subscription.customer.externalId)
  if (!identity.success) throw new UntrustedBillingEventError('Invalid external customer ID')
  return { providerSubscriptionId: subscription.id, userId: identity.data, providerProductId: subscription.productId,
    status: String(subscription.status), currentPeriodStart: subscription.currentPeriodStart, currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd, canceledAt: subscription.canceledAt, endedAt: subscription.endedAt,
    observedAt: subscription.modifiedAt ?? observedAt }
}

async function syncWithin(tx: Tx, state: SubscriptionState) {
  const [user] = await tx.select().from(appUsers).where(and(eq(appUsers.id, state.userId), eq(appUsers.status, 'active'))).limit(1)
  const [product] = await tx.select().from(billingProducts).where(eq(billingProducts.providerProductId, state.providerProductId)).limit(1)
  if (!user || !product || !planProduct(product.productKey)) throw new UntrustedBillingEventError('Unknown subscription owner or plan')
  const [previous] = await tx.select().from(subscriptions).where(eq(subscriptions.providerSubscriptionId, state.providerSubscriptionId)).for('update').limit(1)
  if (previous && previous.userId !== state.userId) throw new UntrustedBillingEventError('Subscription ownership mismatch')
  if (!acceptSubscriptionState(previous, state)) return false
  if (!Number.isFinite(state.currentPeriodStart.getTime()) || !Number.isFinite(state.currentPeriodEnd.getTime()) || state.currentPeriodEnd <= state.currentPeriodStart) throw new UntrustedBillingEventError('Invalid subscription period')
  const values = { userId: state.userId, productKey: product.productKey, providerSubscriptionId: state.providerSubscriptionId,
    status: state.status, currentPeriodStart: state.currentPeriodStart, currentPeriodEnd: state.currentPeriodEnd,
    cancelAtPeriodEnd: state.cancelAtPeriodEnd, canceledAt: state.canceledAt, endedAt: state.endedAt,
    providerUpdatedAt: state.observedAt ?? previous?.providerUpdatedAt ?? null, updatedAt: new Date() }
  await tx.insert(subscriptions).values(values).onConflictDoUpdate({ target: subscriptions.providerSubscriptionId, set: values })
  const until = state.endedAt ?? state.currentPeriodEnd
  await tx.update(entitlementGrants).set({ revokedAt: new Date() }).where(and(eq(entitlementGrants.userId, state.userId),
    eq(entitlementGrants.sourceType, 'subscription'), eq(entitlementGrants.sourceId, state.providerSubscriptionId), isNull(entitlementGrants.revokedAt)))
  if (ENTITLING_STATUSES.includes(state.status) && until > new Date()) {
    for (const featureKey of PLAN_FEATURES.pro) {
      await tx.insert(entitlementGrants).values({ userId: state.userId, featureKey, sourceType: 'subscription', sourceId: state.providerSubscriptionId,
        expiresAt: until, idempotencyKey: `subscription:${state.providerSubscriptionId}:feature:${featureKey}` })
        .onConflictDoUpdate({ target: entitlementGrants.idempotencyKey, set: { expiresAt: until, revokedAt: null } })
    }
  }
  return true
}

export async function syncSubscription(state: SubscriptionState): Promise<void> {
  await getDatabase().transaction(async tx => { await lockAccount(tx, state.userId); await syncWithin(tx, state) })
  await rebuildAccessSnapshot(state.userId)
}

async function allowanceWithin(tx: Tx, state: SubscriptionState, now: Date) {
  const [current] = await tx.select().from(subscriptions).where(and(eq(subscriptions.providerSubscriptionId, state.providerSubscriptionId), eq(subscriptions.userId, state.userId))).limit(1)
  if (!current || current.status !== 'active' || !current.currentPeriodStart || !current.currentPeriodEnd || current.endedAt) return
  const [paid] = await tx.select().from(billingOrders).where(and(eq(billingOrders.userId, state.userId),
    eq(billingOrders.providerSubscriptionId, state.providerSubscriptionId), eq(billingOrders.periodStart, current.currentPeriodStart),
    inArray(billingOrders.status, ['paid', 'partially_refunded']), gt(billingOrders.netAmountMinor, 0)))
    .orderBy(desc(billingOrders.createdAt)).limit(1)
  if (!paid?.periodStart || !paid.periodEnd) return
  const window = allowanceWindow(paid.periodStart, paid.periodEnd, current.productKey === 'pro_yearly', now)
  if (!window) return
  // Adopt pre-migration calendar grants instead of issuing a second allowance.
  const legacy = await tx.select().from(creditGrants).where(and(eq(creditGrants.userId, state.userId),
    eq(creditGrants.grantType, 'subscription'), eq(creditGrants.sourceId, state.providerSubscriptionId),
    gte(creditGrants.createdAt, paid.periodStart), lt(creditGrants.createdAt, window.end)))
  if (legacy.length > 0) {
    for (const grant of legacy) await tx.update(creditGrants).set({ sourceId: paid.providerOrderId }).where(eq(creditGrants.id, grant.id))
    if (paid.refundedAmountMinor > 0) await recoverRefundWithin(tx, paid)
    return
  }
  const [adopted] = await tx.select().from(creditGrants).where(and(eq(creditGrants.userId, state.userId),
    eq(creditGrants.grantType, 'subscription'), eq(creditGrants.sourceId, paid.providerOrderId),
    gte(creditGrants.createdAt, window.start), lt(creditGrants.createdAt, window.end))).limit(1)
  if (adopted) { if (paid.refundedAmountMinor > 0) await recoverRefundWithin(tx, paid); return }
  await grantCredits({ userId: state.userId, amount: ALLOWANCE.proMonthlyAiCredits, grantType: 'subscription', sourceType: 'order', sourceId: paid.providerOrderId,
    idempotencyKey: `subscription:${state.providerSubscriptionId}:allowance:${window.start.toISOString()}`,
    expiresAt: window.end }, tx)
  if (paid.refundedAmountMinor > 0) await recoverRefundWithin(tx, paid)
}

export async function grantSubscriptionPeriodCredits(state: SubscriptionState, now = new Date()): Promise<void> {
  await getDatabase().transaction(async tx => { await lockAccount(tx, state.userId); await allowanceWithin(tx, state, now) })
}

export async function fulfillPaidOrder(order: Order, observedAt?: Date): Promise<void> {
  if (!order.paid) throw new UntrustedBillingEventError('Order is not paid')
  const userId = await getDatabase().transaction(async tx => {
    const { user, product } = await trustedOrder(tx, order, true)
    const recurring = ['subscription_create', 'subscription_cycle', 'subscription_update'].includes(order.billingReason) && planProduct(product.productKey)
    let intentId: string | null = null
    if (recurring) {
      if (!order.subscription || order.subscription.productId !== order.productId) throw new UntrustedBillingEventError('Missing matching subscription')
    } else {
      intentId = typeof order.metadata.checkout_intent_id === 'string' ? order.metadata.checkout_intent_id : null
      if (!intentId || !z.string().uuid().safeParse(intentId).success || !order.checkoutId) throw new UntrustedBillingEventError('Missing checkout metadata')
      const [intent] = await tx.select().from(checkoutIntents).where(eq(checkoutIntents.id, intentId)).limit(1)
      if (!intent || intent.userId !== user.id || intent.productKey !== product.productKey || order.metadata.product_key !== product.productKey
        || intent.providerCheckoutId !== order.checkoutId) throw new UntrustedBillingEventError('Checkout ownership or product mismatch')
    }
    const local = await mirrorWithin(tx, order, user.id, product.productKey)
    if (['refunded', 'disputed'].includes(local.status)) return user.id
    if (product.productKey === 'ai_credits_25' || product.productKey === 'project_pass_7d') {
      const expiresAt = product.productKey === 'project_pass_7d' ? new Date(local.createdAt.getTime() + 7 * 86400000) : null
      if (!expiresAt || expiresAt > new Date()) await grantCredits({ userId: user.id, amount: product.productKey === 'ai_credits_25' ? 25 : 20,
        grantType: 'purchase', sourceType: 'order', sourceId: order.id,
        idempotencyKey: `polar-order:${order.id}:${product.productKey === 'ai_credits_25' ? 'ai-25' : 'project-ai-20'}`, expiresAt }, tx)
    }
    if (product.productKey === 'export_4k_single' || product.productKey === 'project_pass_7d') {
      await tx.insert(exportPasses).values({ userId: user.id, orderId: local.id,
        passType: product.productKey === 'export_4k_single' ? 'single_4k' : 'project_7d',
        availableUntil: product.productKey === 'project_pass_7d' ? new Date(local.createdAt.getTime() + 7 * 86400000) : null,
        idempotencyKey: `polar-order:${order.id}:${product.productKey === 'export_4k_single' ? 'single-4k' : 'project-pass'}` }).onConflictDoNothing()
    }
    if (planProduct(product.productKey)) {
      if (!order.subscription) throw new UntrustedBillingEventError('Missing subscription')
      const sub = order.subscription
      const state: SubscriptionState = { providerSubscriptionId: sub.id, userId: user.id, providerProductId: sub.productId,
        status: String(sub.status), currentPeriodStart: sub.currentPeriodStart, currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd, canceledAt: sub.canceledAt, endedAt: sub.endedAt, observedAt: sub.modifiedAt ?? observedAt }
      await syncWithin(tx, state)
      await allowanceWithin(tx, state, new Date())
    }
    if (intentId) await tx.update(checkoutIntents).set({ status: 'succeeded', updatedAt: new Date() }).where(eq(checkoutIntents.id, intentId))
    if (recurring && order.checkoutId) await tx.update(checkoutIntents).set({ status: 'succeeded', updatedAt: new Date() })
      .where(and(eq(checkoutIntents.userId, user.id), eq(checkoutIntents.providerCheckoutId, order.checkoutId)))
    if (local.refundedAmountMinor > 0) await recoverRefundWithin(tx, local)
    return user.id
  })
  await rebuildAccessSnapshot(userId)
  await recordAudit({ actorType: 'provider', action: 'billing.order.fulfilled', targetType: 'order', targetId: order.id, userId })
}

async function recoverRefundWithin(tx: Tx, local: typeof billingOrders.$inferSelect) {
    const account = await lockAccount(tx, local.userId)
    const refunded = local.refundedAmountMinor
    if (refunded <= 0 || local.netAmountMinor <= 0) throw new UntrustedBillingEventError('Refund has no positive amount')
    const full = refunded >= local.netAmountMinor
    if (local.providerSubscriptionId && local.periodStart && local.periodEnd) {
      await tx.update(creditGrants).set({ sourceId: local.providerOrderId }).where(and(eq(creditGrants.userId, local.userId),
        eq(creditGrants.grantType, 'subscription'), eq(creditGrants.sourceId, local.providerSubscriptionId),
        gte(creditGrants.createdAt, local.periodStart), lt(creditGrants.createdAt, local.periodEnd)))
    }
    const grants = await tx.select().from(creditGrants).where(and(eq(creditGrants.userId, local.userId), eq(creditGrants.sourceId, local.providerOrderId),
      isNull(creditGrants.revokedAt))).for('update')
    let recoverable = 0
    for (const grant of grants) {
      const [prior] = await tx.select({ removed: sql<number>`coalesce(sum(-${creditLedger.deltaAvailable}), 0)::bigint` })
        .from(creditLedger).where(and(eq(creditLedger.creditGrantId, grant.id), eq(creditLedger.entryType, 'refund')))
      const target = refundedCreditTarget(grant.amount, refunded, local.netAmountMinor)
      const remove = Math.min(grant.remaining, Math.max(0, target - Number(prior?.removed ?? 0)))
      recoverable += remove
      await tx.update(creditGrants).set({ remaining: grant.remaining - remove, revokedAt: full ? new Date() : null }).where(eq(creditGrants.id, grant.id))
      if (remove > 0) await tx.insert(creditLedger).values({ userId: local.userId, creditType: 'ai_generation', entryType: 'refund',
        deltaAvailable: -remove, sourceType: 'refund', sourceId: local.providerOrderId, creditGrantId: grant.id,
        idempotencyKey: `polar-refund:${local.providerOrderId}:${refunded}:grant:${grant.id}` }).onConflictDoNothing()
    }
    if (account.available < recoverable) throw new UntrustedBillingEventError('Refund balance invariant failed')
    if (recoverable > 0) await tx.update(creditAccounts).set({ available: sql`${creditAccounts.available} - ${recoverable}`,
      version: sql`${creditAccounts.version} + 1`, updatedAt: new Date() }).where(eq(creditAccounts.userId, local.userId))
    if (full) {
      await tx.update(exportPasses).set({ status: 'revoked', updatedAt: new Date() }).where(eq(exportPasses.orderId, local.id))
      await tx.update(entitlementGrants).set({ revokedAt: new Date() }).where(and(eq(entitlementGrants.userId, local.userId),
        eq(entitlementGrants.sourceType, 'order'), eq(entitlementGrants.sourceId, local.providerOrderId), isNull(entitlementGrants.revokedAt)))
    }
    await tx.update(billingOrders).set({ status: full ? 'refunded' : 'partially_refunded', refundedAmountMinor: refunded, updatedAt: new Date() }).where(eq(billingOrders.id, local.id))
}

export async function refundOrder(order: Order): Promise<void> {
  const userId = await getDatabase().transaction(async tx => {
    const { user, product } = await trustedOrder(tx, order, true)
    const local = await mirrorWithin(tx, order, user.id, product.productKey)
    await recoverRefundWithin(tx, local)
    return user.id
  })
  await rebuildAccessSnapshot(userId)
  await recordAudit({ actorType: 'provider', action: 'billing.order.refunded', targetType: 'order', targetId: order.id, userId })
}
