import 'server-only'

import type { Order } from '@polar-sh/sdk/models/components/order.js'
import type { Subscription } from '@polar-sh/sdk/models/components/subscription.js'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { recordAudit } from '@/lib/billing/audit'
import { grantCredits } from '@/lib/billing/credits'
import { invalidateAccessCache, PLAN_FEATURES, rebuildAccessSnapshot } from '@/lib/billing/entitlements'
import { ALLOWANCE } from '@/lib/billing/policy'
import { getDatabase } from '@/lib/db/client'
import {
  appUsers,
  billingCustomers,
  billingOrderItems,
  billingOrders,
  billingProducts,
  checkoutIntents,
  creditAccounts,
  creditGrants,
  creditLedger,
  entitlementGrants,
  exportPasses,
  subscriptions,
} from '@/lib/db/schema'

const UuidSchema = z.string().uuid()

function metadataString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export class UntrustedBillingEventError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UntrustedBillingEventError'
  }
}

export async function fulfillPaidOrder(order: Order): Promise<void> {
  if (!order.paid || !order.productId || !order.checkoutId) {
    throw new UntrustedBillingEventError('Paid order is missing required references')
  }

  const externalUserId = UuidSchema.safeParse(order.customer.externalId)
  if (!externalUserId.success) throw new UntrustedBillingEventError('Invalid external customer ID')

  const intentId = metadataString(order.metadata.checkout_intent_id)
  const metadataProductKey = metadataString(order.metadata.product_key)
  if (!intentId || !metadataProductKey) {
    throw new UntrustedBillingEventError('Missing trusted checkout metadata')
  }

  const db = getDatabase()
  const [[user], [product], [intent]] = await Promise.all([
    db.select().from(appUsers).where(and(
      eq(appUsers.id, externalUserId.data),
      eq(appUsers.status, 'active'),
    )).limit(1),
    db.select().from(billingProducts).where(and(
      eq(billingProducts.providerProductId, order.productId),
      eq(billingProducts.active, true),
    )).limit(1),
    db.select().from(checkoutIntents).where(eq(checkoutIntents.id, intentId)).limit(1),
  ])

  if (!user || !product || !intent) throw new UntrustedBillingEventError('Unknown user, product, or checkout')
  if (
    intent.userId !== user.id ||
    intent.productKey !== product.productKey ||
    product.productKey !== metadataProductKey ||
    intent.providerCheckoutId !== order.checkoutId
  ) {
    throw new UntrustedBillingEventError('Checkout ownership or product mismatch')
  }

  const localOrderId = await db.transaction(async (tx) => {
    await tx.insert(billingCustomers).values({
      userId: user.id,
      providerCustomerId: order.customerId,
      externalCustomerId: user.id,
    }).onConflictDoUpdate({
      target: billingCustomers.userId,
      set: { providerCustomerId: order.customerId, updatedAt: new Date() },
    })

    const [insertedOrder] = await tx.insert(billingOrders).values({
      userId: user.id,
      providerOrderId: order.id,
      providerCheckoutId: order.checkoutId,
      status: 'paid',
      currency: order.currency.toUpperCase(),
      amountMinor: order.totalAmount,
      paidAt: new Date(),
    }).onConflictDoUpdate({
      target: billingOrders.providerOrderId,
      set: { status: 'paid', amountMinor: order.totalAmount, paidAt: new Date(), updatedAt: new Date() },
    }).returning({ id: billingOrders.id })

    await tx.insert(billingOrderItems).values({
      orderId: insertedOrder.id,
      productKey: product.productKey,
      providerProductId: product.providerProductId,
      quantity: 1,
      amountMinor: order.netAmount,
    }).onConflictDoNothing()

    await tx.update(checkoutIntents).set({ status: 'succeeded', updatedAt: new Date() })
      .where(eq(checkoutIntents.id, intent.id))

    if (order.subscription) {
      await tx.insert(subscriptions).values({
        userId: user.id,
        productKey: product.productKey,
        providerSubscriptionId: order.subscription.id,
        status: order.subscription.status,
        currentPeriodStart: order.subscription.currentPeriodStart,
        currentPeriodEnd: order.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: order.subscription.cancelAtPeriodEnd,
        canceledAt: order.subscription.canceledAt,
      }).onConflictDoUpdate({
        target: subscriptions.providerSubscriptionId,
        set: {
          status: order.subscription.status,
          currentPeriodStart: order.subscription.currentPeriodStart,
          currentPeriodEnd: order.subscription.currentPeriodEnd,
          cancelAtPeriodEnd: order.subscription.cancelAtPeriodEnd,
          canceledAt: order.subscription.canceledAt,
          updatedAt: new Date(),
        },
      })
    }

    return insertedOrder.id
  })

  if (product.productKey === 'ai_credits_25') {
    await grantCredits({
      userId: user.id,
      amount: 25,
      grantType: 'purchase',
      sourceType: 'order',
      sourceId: order.id,
      idempotencyKey: `polar-order:${order.id}:ai-25`,
    })
  } else if (product.productKey === 'project_pass_7d') {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await db.insert(exportPasses).values({
      userId: user.id,
      orderId: localOrderId,
      passType: 'project_7d',
      availableUntil: expiresAt,
      idempotencyKey: `polar-order:${order.id}:project-pass`,
    }).onConflictDoNothing()
    await grantCredits({
      userId: user.id,
      amount: 20,
      grantType: 'purchase',
      sourceType: 'order',
      sourceId: order.id,
      idempotencyKey: `polar-order:${order.id}:project-ai-20`,
      expiresAt,
    })
  } else if (product.productKey === 'export_4k_single') {
    await db.insert(exportPasses).values({
      userId: user.id,
      orderId: localOrderId,
      passType: 'single_4k',
      idempotencyKey: `polar-order:${order.id}:single-4k`,
    }).onConflictDoNothing()
  } else if (product.productKey === 'pro_monthly' || product.productKey === 'pro_yearly') {
    if (!order.subscription) throw new UntrustedBillingEventError('Subscription product has no subscription')

    const creditExpiry = new Date(Math.min(
      order.subscription.currentPeriodEnd.getTime(),
      Date.now() + 35 * 24 * 60 * 60 * 1000,
    ))

    await grantCredits({
      userId: user.id,
      amount: 300,
      grantType: 'subscription',
      sourceType: 'subscription',
      sourceId: order.subscription.id,
      idempotencyKey: `polar-order:${order.id}:pro-ai-300`,
      expiresAt: creditExpiry,
    })

    for (const featureKey of PLAN_FEATURES.pro) {
      await db.insert(entitlementGrants).values({
        userId: user.id,
        featureKey,
        sourceType: 'subscription',
        sourceId: order.subscription.id,
        expiresAt: order.subscription.currentPeriodEnd,
        idempotencyKey: `polar-order:${order.id}:feature:${featureKey}`,
      }).onConflictDoNothing()
    }
  }

  // Recomputed from the grants just written, so the snapshot can never drift
  // from the rows that actually authorize access.
  await rebuildAccessSnapshot(user.id)

  await recordAudit({
    actorType: 'provider',
    action: 'billing.order.fulfilled',
    targetType: 'order',
    targetId: order.id,
    userId: user.id,
    metadata: { productKey: product.productKey, amountMinor: order.totalAmount },
  })
}

export async function refundOrder(order: Order): Promise<void> {
  const db = getDatabase()
  const [localOrder] = await db.select().from(billingOrders)
    .where(eq(billingOrders.providerOrderId, order.id)).limit(1)

  if (!localOrder) throw new UntrustedBillingEventError('Refund references unknown order')

  await db.transaction(async (tx) => {
    const [account] = await tx.select().from(creditAccounts).where(and(
      eq(creditAccounts.userId, localOrder.userId),
      eq(creditAccounts.creditType, 'ai_generation'),
    )).for('update').limit(1)

    const grants = await tx.select().from(creditGrants).where(and(
      eq(creditGrants.userId, localOrder.userId),
      eq(creditGrants.sourceId, order.id),
      isNull(creditGrants.revokedAt),
    )).for('update')

    const recoverable = grants.reduce((sum, grant) => sum + grant.remaining, 0)
    if (recoverable > 0 && (!account || account.available < recoverable)) {
      throw new UntrustedBillingEventError('Refund would violate credit balance invariant')
    }
    for (const grant of grants) {
      if (grant.remaining > 0) {
        await tx.insert(creditLedger).values({
          userId: localOrder.userId,
          creditType: 'ai_generation',
          entryType: 'refund',
          deltaAvailable: -grant.remaining,
          sourceType: 'refund',
          sourceId: order.id,
          creditGrantId: grant.id,
          idempotencyKey: `polar-refund:${order.id}:grant:${grant.id}`,
        }).onConflictDoNothing()
      }
      await tx.update(creditGrants).set({ remaining: 0, revokedAt: new Date() })
        .where(eq(creditGrants.id, grant.id))
    }

    if (recoverable > 0) {
      await tx.update(creditAccounts).set({
        available: sql`${creditAccounts.available} - ${recoverable}`,
        version: sql`${creditAccounts.version} + 1`,
        updatedAt: new Date(),
      }).where(and(
        eq(creditAccounts.userId, localOrder.userId),
        eq(creditAccounts.creditType, 'ai_generation'),
      ))
    }

    await tx.update(exportPasses).set({ status: 'revoked', updatedAt: new Date() })
      .where(eq(exportPasses.orderId, localOrder.id))

    await tx.update(entitlementGrants).set({ revokedAt: new Date() }).where(and(
      eq(entitlementGrants.userId, localOrder.userId),
      eq(entitlementGrants.sourceId, order.subscriptionId ?? order.id),
      isNull(entitlementGrants.revokedAt),
    ))

    await tx.update(billingOrders).set({ status: 'refunded', updatedAt: new Date() })
      .where(eq(billingOrders.id, localOrder.id))

  })

  await rebuildAccessSnapshot(localOrder.userId)

  await recordAudit({
    actorType: 'provider',
    action: 'billing.order.refunded',
    targetType: 'order',
    targetId: order.id,
    userId: localOrder.userId,
  })
}


// ── Subscription lifecycle ────────────────────────────────────

/**
 * Provider-shape-independent view of a subscription.
 *
 * Webhook payloads and Customer State responses carry different fields, so
 * both are normalized to this before touching entitlements. That keeps the
 * reconciliation path and the webhook path on identical logic.
 */
export type SubscriptionState = {
  providerSubscriptionId: string
  userId: string
  providerProductId: string
  status: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  canceledAt: Date | null
  endedAt: Date | null
}

/**
 * Statuses that keep paid capability. `past_due` retains access deliberately:
 * Polar sends `subscription.revoked` when the dunning grace period ends, and
 * that event is what actually withdraws the features.
 */
const ENTITLED_STATUSES = new Set(['active', 'trialing', 'past_due'])

function planForProductKey(productKey: string): keyof typeof PLAN_FEATURES | null {
  if (productKey === 'pro_monthly' || productKey === 'pro_yearly') return 'pro'
  if (productKey === 'studio_monthly') return 'studio'
  return null
}

/** Normalizes a verified webhook subscription, resolving the local user. */
export function subscriptionStateFromWebhook(subscription: Subscription): SubscriptionState {
  const externalUserId = UuidSchema.safeParse(subscription.customer.externalId)
  if (!externalUserId.success) throw new UntrustedBillingEventError('Invalid external customer ID')

  return {
    providerSubscriptionId: subscription.id,
    userId: externalUserId.data,
    providerProductId: subscription.productId,
    status: String(subscription.status),
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    canceledAt: subscription.canceledAt,
    endedAt: subscription.endedAt,
  }
}

/**
 * Mirrors a subscription and reconciles local entitlements to match.
 *
 * Every lifecycle event routes through here, so activation, cancellation,
 * renewal, and revocation converge on the same computed state rather than each
 * applying its own partial edit. Repeat deliveries are therefore harmless.
 */
export async function syncSubscription(state: SubscriptionState): Promise<void> {
  const db = getDatabase()
  const [[user], [product]] = await Promise.all([
    db.select().from(appUsers).where(and(
      eq(appUsers.id, state.userId),
      eq(appUsers.status, 'active'),
    )).limit(1),
    db.select().from(billingProducts).where(and(
      eq(billingProducts.providerProductId, state.providerProductId),
      eq(billingProducts.active, true),
    )).limit(1),
  ])

  if (!user) throw new UntrustedBillingEventError('Subscription references unknown user')
  if (!product) throw new UntrustedBillingEventError('Subscription references unknown product')

  const plan = planForProductKey(product.productKey)
  if (!plan) throw new UntrustedBillingEventError('Subscription product is not a plan')

  const now = new Date()
  const entitled = ENTITLED_STATUSES.has(state.status)
  // An explicit end date wins over the period end, so a revoked subscription
  // cannot keep access until the period it already paid for would have closed.
  const accessUntil = state.endedAt ?? state.currentPeriodEnd

  await db.insert(subscriptions).values({
    userId: user.id,
    productKey: product.productKey,
    providerSubscriptionId: state.providerSubscriptionId,
    status: state.status,
    currentPeriodStart: state.currentPeriodStart,
    currentPeriodEnd: state.currentPeriodEnd,
    cancelAtPeriodEnd: state.cancelAtPeriodEnd,
    canceledAt: state.canceledAt,
  }).onConflictDoUpdate({
    target: subscriptions.providerSubscriptionId,
    set: {
      status: state.status,
      currentPeriodStart: state.currentPeriodStart,
      currentPeriodEnd: state.currentPeriodEnd,
      cancelAtPeriodEnd: state.cancelAtPeriodEnd,
      canceledAt: state.canceledAt,
      updatedAt: now,
    },
  })

  if (entitled && accessUntil > now) {
    for (const featureKey of PLAN_FEATURES[plan]) {
      await db.insert(entitlementGrants).values({
        userId: user.id,
        featureKey,
        sourceType: 'subscription',
        sourceId: state.providerSubscriptionId,
        expiresAt: accessUntil,
        idempotencyKey: `subscription:${state.providerSubscriptionId}:period:${accessUntil.toISOString()}:${featureKey}`,
      }).onConflictDoNothing()
    }
  } else {
    // Ended, unpaid, or incomplete: withdraw capability now. Purchased credit
    // packs are deliberately untouched -- the customer paid for those.
    await db.update(entitlementGrants).set({ revokedAt: now }).where(and(
      eq(entitlementGrants.userId, user.id),
      eq(entitlementGrants.sourceId, state.providerSubscriptionId),
      isNull(entitlementGrants.revokedAt),
    ))

    await recordAudit({
      actorType: 'provider',
      action: 'billing.subscription.revoked',
      targetType: 'subscription',
      targetId: state.providerSubscriptionId,
      userId: user.id,
      metadata: { status: state.status },
    })
  }

  await rebuildAccessSnapshot(user.id)
  await invalidateAccessCache(user.id)
}

/**
 * Grants the monthly allowance for the subscription's current billing period.
 *
 * The period-scoped key means a redelivered event cannot double-grant, and an
 * annual plan still receives credits month by month rather than all upfront.
 */
export async function grantSubscriptionPeriodCredits(state: SubscriptionState): Promise<void> {
  if (!ENTITLED_STATUSES.has(state.status)) return

  const db = getDatabase()
  const [product] = await db.select().from(billingProducts).where(and(
    eq(billingProducts.providerProductId, state.providerProductId),
    eq(billingProducts.active, true),
  )).limit(1)

  if (!product || !planForProductKey(product.productKey)) return

  const period = state.currentPeriodStart.toISOString().slice(0, 7)

  await grantCredits({
    userId: state.userId,
    amount: ALLOWANCE.proMonthlyAiCredits,
    grantType: 'subscription',
    sourceType: 'subscription',
    sourceId: state.providerSubscriptionId,
    idempotencyKey: `subscription:${state.providerSubscriptionId}:monthly:${period}`,
    expiresAt: state.currentPeriodEnd,
  })
}
