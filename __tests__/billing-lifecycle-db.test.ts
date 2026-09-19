/** Real PostgreSQL engine in memory. Never loads .env.local or opens a network connection. */
jest.mock('server-only', () => ({}))
const mockDb = jest.fn()
jest.mock('@/lib/db/client', () => ({ getDatabase: () => mockDb() }))
jest.mock('@/lib/redis', () => ({ getRedis: () => null }))

import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import type { Order } from '@polar-sh/sdk/models/components/order.js'
import * as schema from '@/lib/db/schema'
import { fulfillPaidOrder, refundOrder, recordOrderMirror, syncSubscription, grantSubscriptionPeriodCredits, type SubscriptionState } from '@/lib/billing/fulfillment'
import { getAccountAccess } from '@/lib/billing/entitlements'
import { grantCredits, releaseAiCredit, reserveAiCredit } from '@/lib/billing/credits'
import { getCreditBalance } from '@/lib/billing/balance'
import { prepareCheckoutIntent } from '@/lib/billing/checkout-intent'

jest.setTimeout(30000)
const client = new PGlite()
const db = drizzle(client, { schema })
const start = new Date(Date.now() - 86400000), end = new Date(start.getTime() + 30 * 86400000)
let userId: string

function state(overrides: Partial<SubscriptionState> = {}): SubscriptionState {
  return { userId, providerSubscriptionId: 'subscription', providerProductId: 'monthly-product', status: 'active',
    currentPeriodStart: start, currentPeriodEnd: end, cancelAtPeriodEnd: false, canceledAt: null, endedAt: null,
    observedAt: new Date('2026-01-01T00:00:00Z'), ...overrides }
}
function order(overrides: Record<string, unknown> = {}): Order {
  const sub = state()
  return { id: 'order', paid: true, billingReason: 'subscription_cycle', productId: 'monthly-product',
    subscriptionId: 'subscription', checkoutId: null, customerId: 'customer', customer: { externalId: userId },
    metadata: {}, currency: 'usd', totalAmount: 1200, netAmount: 1200, refundedAmount: 0,
    subscription: { id: sub.providerSubscriptionId, productId: sub.providerProductId, status: sub.status,
      currentPeriodStart: start, currentPeriodEnd: end, cancelAtPeriodEnd: false, canceledAt: null, endedAt: null,
      modifiedAt: sub.observedAt }, ...overrides } as unknown as Order
}
async function pack() {
  const intent = randomUUID()
  await db.insert(schema.checkoutIntents).values({ id: intent, userId, productKey: 'ai_credits_25', providerCheckoutId: 'checkout', idempotencyKey: intent })
  return order({ id: 'pack-order', billingReason: 'purchase', productId: 'pack-product', subscriptionId: null,
    subscription: null, checkoutId: 'checkout', netAmount: 500, totalAmount: 500,
    metadata: { checkout_intent_id: intent, product_key: 'ai_credits_25' } })
}
async function available() { return (await getCreditBalance(userId)).available }

beforeAll(async () => {
  mockDb.mockReturnValue(db)
  await client.exec(readFileSync('db/migrations/0000_stale_mordo.sql', 'utf8'))
  await client.exec(readFileSync('db/migrations/0001_fluffy_synch.sql', 'utf8'))
})
beforeEach(async () => {
  await client.exec('TRUNCATE app_user, billing_product CASCADE')
  userId = randomUUID()
  await db.insert(schema.appUsers).values({ id: userId, clerkUserId: userId })
  await db.insert(schema.creditAccounts).values({ userId, creditType: 'ai_generation' })
  await db.insert(schema.billingProducts).values([
    { productKey: 'pro_monthly', providerProductId: 'monthly-product', kind: 'subscription', fulfillmentRecipe: {} },
    { productKey: 'pro_yearly', providerProductId: 'yearly-product', kind: 'subscription', fulfillmentRecipe: {} },
    { productKey: 'ai_credits_25', providerProductId: 'pack-product', kind: 'one_time', fulfillmentRecipe: {} },
    { productKey: 'project_pass_7d', providerProductId: 'project-product', kind: 'one_time', fulfillmentRecipe: {} },
  ])
})
afterAll(async () => { await client.close() })

it('does not grant allowances from active or past-due subscription events without paid proof', async () => {
  await syncSubscription(state())
  await grantSubscriptionPeriodCredits(state())
  expect(await available()).toBe(0)
  await syncSubscription(state({ status: 'past_due', observedAt: new Date('2026-01-02') }))
  await grantSubscriptionPeriodCredits(state())
  expect(await available()).toBe(0)
})
it('grants once across paid orders, duplicate events and calendar rollover', async () => {
  await fulfillPaidOrder(order())
  await fulfillPaidOrder(order())
  await grantSubscriptionPeriodCredits(state(), new Date(start.getTime() + 20 * 86400000))
  expect(await available()).toBe(300)
  expect((await getAccountAccess(userId)).planKey).toBe('pro')
})
it('grants a new allowance for a new paid renewal period', async () => {
  await fulfillPaidOrder(order())
  const nextStart = new Date(Date.now() - 1000), nextEnd = new Date(Date.now() + 30 * 86400000)
  await fulfillPaidOrder(order({ id: 'renewal', subscription: { ...order().subscription, currentPeriodStart: nextStart,
    currentPeriodEnd: nextEnd, modifiedAt: new Date('2026-01-02') } }))
  expect(await available()).toBe(600)
})
it('annual allowances are monthly anniversaries, not an upfront annual grant', async () => {
  const yearlyEnd = new Date(start.getTime() + 365 * 86400000)
  await fulfillPaidOrder(order({ productId: 'yearly-product', subscription: { ...order().subscription,
    productId: 'yearly-product', currentPeriodEnd: yearlyEnd } }))
  await grantSubscriptionPeriodCredits(state({ providerProductId: 'yearly-product', currentPeriodEnd: yearlyEnd }), new Date(start.getTime() + 32 * 86400000))
  await grantSubscriptionPeriodCredits(state({ providerProductId: 'yearly-product', currentPeriodEnd: yearlyEnd }), new Date(start.getTime() + 32 * 86400000))
  const grants = await db.select().from(schema.creditGrants)
  expect(grants).toHaveLength(2)
  expect(grants.reduce((sum, grant) => sum + grant.amount, 0)).toBe(600)
})
it('period-end cancellation and undo keep paid access; immediate revocation removes only subscription features', async () => {
  await fulfillPaidOrder(order())
  await syncSubscription(state({ cancelAtPeriodEnd: true, observedAt: new Date('2026-01-02') }))
  expect((await getAccountAccess(userId)).planKey).toBe('pro')
  await syncSubscription(state({ observedAt: new Date('2026-01-03') }))
  expect((await getAccountAccess(userId)).planKey).toBe('pro')
  await syncSubscription(state({ status: 'canceled', endedAt: new Date(), observedAt: new Date('2026-01-04') }))
  expect((await getAccountAccess(userId)).planKey).toBe('free')
  expect(await available()).toBe(300)
  await syncSubscription(state({ observedAt: new Date('2026-01-05') }))
  expect((await getAccountAccess(userId)).planKey).toBe('free')
})
it('a stale active event cannot undo a newer pause, but a real later resume can', async () => {
  await fulfillPaidOrder(order())
  await syncSubscription(state({ status: 'paused', observedAt: new Date('2026-01-02') }))
  await syncSubscription(state())
  expect((await getAccountAccess(userId)).planKey).toBe('free')
  await syncSubscription(state({ observedAt: new Date('2026-01-03') }))
  expect((await getAccountAccess(userId)).planKey).toBe('pro')
})
it('reads expired entitlements as free even when no cron or revocation webhook ran', async () => {
  await fulfillPaidOrder(order())
  await client.query('UPDATE entitlement_grant SET starts_at=$1, expires_at=$2', [new Date(Date.now() - 2 * 86400000), new Date(Date.now() - 86400000)])
  expect((await getAccountAccess(userId)).planKey).toBe('free')
})
it('pending order mirrors advance to paid without granting until fulfillment', async () => {
  await recordOrderMirror(order({ paid: false }))
  await recordOrderMirror(order())
  expect((await db.select().from(schema.billingOrders))[0].status).toBe('paid')
  expect(await available()).toBe(0)
  await fulfillPaidOrder(order())
  expect(await available()).toBe(300)
})
it('full subscription refunds recover unused credits without cancelling subscription access', async () => {
  await fulfillPaidOrder(order())
  await refundOrder(order({ refundedAmount: 1200 }))
  await refundOrder(order({ refundedAmount: 1200 }))
  expect(await available()).toBe(0)
  expect((await getAccountAccess(userId)).planKey).toBe('pro')
  await fulfillPaidOrder(order())
  expect((await db.select().from(schema.billingOrders))[0].status).toBe('refunded')
  expect(await available()).toBe(0)
})
it('partial then full refunds are cumulative, duplicate safe and preserve other purchased credits', async () => {
  const paid = await pack()
  await fulfillPaidOrder(paid)
  await grantCredits({ userId, amount: 10, grantType: 'purchase', sourceType: 'order', sourceId: 'unrelated', idempotencyKey: 'unrelated' })
  await refundOrder({ ...paid, refundedAmount: 250 })
  await refundOrder({ ...paid, refundedAmount: 250 })
  expect(await available()).toBe(23)
  await refundOrder({ ...paid, refundedAmount: 500 })
  expect(await available()).toBe(10)
})
it('partial refund arriving before paid event still fulfills only the unrefunded credit portion', async () => {
  const paid = await pack()
  await refundOrder({ ...paid, refundedAmount: 250 })
  await fulfillPaidOrder(paid)
  expect(await available()).toBe(13)
})
it('full refund during a reservation cannot resurrect credits on release', async () => {
  const paid = await pack()
  await fulfillPaidOrder(paid)
  const operation = await reserveAiCredit({ userId, idempotencyKey: 'generation' })
  await refundOrder({ ...paid, refundedAmount: 500 })
  await releaseAiCredit(operation.operationId, 'failed')
  expect(await getCreditBalance(userId)).toEqual({ available: 0, reserved: 0 })
})
it('adopts old calendar grants without double-granting and links them to refundable orders', async () => {
  await grantCredits({ userId, amount: 300, grantType: 'subscription', sourceType: 'subscription', sourceId: 'subscription', idempotencyKey: 'legacy-calendar' })
  await fulfillPaidOrder(order())
  expect(await available()).toBe(300)
  await refundOrder(order({ refundedAmount: 1200 }))
  expect(await available()).toBe(0)
})
it('forged checkout ownership rolls back without orders or grants', async () => {
  const paid = await pack()
  await expect(fulfillPaidOrder({ ...paid, metadata: { ...paid.metadata, product_key: 'pro_yearly' } })).rejects.toThrow()
  expect(await db.select().from(schema.billingOrders)).toHaveLength(0)
  expect(await available()).toBe(0)
})
it('resubscription with a new ID works after terminal cancellation', async () => {
  await fulfillPaidOrder(order())
  await syncSubscription(state({ status: 'canceled', observedAt: new Date('2026-01-02'), endedAt: new Date() }))
  await fulfillPaidOrder(order({ id: 'resubscribe-order', subscriptionId: 'new-subscription',
    subscription: { ...order().subscription, id: 'new-subscription' } }))
  expect((await getAccountAccess(userId)).planKey).toBe('pro')
  expect(await available()).toBe(600)
})
it('full refund before any paid event never creates credits later', async () => {
  const paid = await pack()
  await refundOrder({ ...paid, refundedAmount: 500 })
  await fulfillPaidOrder(paid)
  expect(await available()).toBe(0)
})
it('fully spent credits do not cause a negative balance on refund', async () => {
  const paid = await pack()
  await fulfillPaidOrder(paid)
  for (let index = 0; index < 25; index++) {
    const operation = await reserveAiCredit({ userId, idempotencyKey: `spent-${index}` })
    const { completeAiCredit } = await import('@/lib/billing/credits')
    await completeAiCredit({ operationId: operation.operationId })
  }
  await refundOrder({ ...paid, refundedAmount: 500 })
  expect(await getCreditBalance(userId)).toEqual({ available: 0, reserved: 0 })
})
it('refunds remain valid after a product has been archived', async () => {
  const paid = await pack()
  await fulfillPaidOrder(paid)
  await client.exec("UPDATE billing_product SET active=false WHERE product_key='ai_credits_25'")
  await refundOrder({ ...paid, refundedAmount: 500 })
  expect(await available()).toBe(0)
})
it('expired credits are not restored by a failed AI reservation', async () => {
  const paid = await pack()
  await fulfillPaidOrder(paid)
  const operation = await reserveAiCredit({ userId, idempotencyKey: 'expire-in-flight' })
  await client.query('UPDATE credit_grant SET starts_at=$1, expires_at=$2', [new Date(Date.now() - 2 * 86400000), new Date(Date.now() - 86400000)])
  await releaseAiCredit(operation.operationId, 'failed')
  expect(await getCreditBalance(userId)).toEqual({ available: 0, reserved: 0 })
})
it('prevents duplicate subscription checkout intents and idempotency-key product swapping', async () => {
  const key = randomUUID()
  const first = await prepareCheckoutIntent(userId, 'pro_monthly', key)
  expect(first.createdIntent).toBeDefined()
  expect((await prepareCheckoutIntent(userId, 'pro_monthly', key)).existing?.id).toBe(first.createdIntent?.id)
  expect((await prepareCheckoutIntent(userId, 'pro_yearly', key)).error).toBeDefined()
  expect((await prepareCheckoutIntent(userId, 'pro_yearly', randomUUID())).error).toBeDefined()
})
it('directs existing subscribers to billing management instead of charging for another subscription', async () => {
  await fulfillPaidOrder(order())
  expect((await prepareCheckoutIntent(userId, 'pro_yearly', randomUUID())).error).toContain('already have a subscription')
})
it('keeps a project pass on partial refund, revokes it on full refund, and cannot resurrect it', async () => {
  const paid = await pack()
  await client.exec("UPDATE checkout_intent SET product_key='project_pass_7d'")
  const project = { ...paid, productId: 'project-product', metadata: { ...paid.metadata, product_key: 'project_pass_7d' } }
  await fulfillPaidOrder(project)
  await refundOrder({ ...project, refundedAmount: 250 })
  expect((await db.select().from(schema.exportPasses))[0].status).toBe('available')
  expect(await available()).toBe(10)
  await refundOrder({ ...project, refundedAmount: 500 })
  await fulfillPaidOrder(project)
  expect((await db.select().from(schema.exportPasses))[0].status).toBe('revoked')
  expect(await available()).toBe(0)
})
it('partial refunds withheld during an in-flight reservation are recovered when it is released', async () => {
  const paid = await pack()
  await fulfillPaidOrder(paid)
  const operations = []
  for (let index = 0; index < 25; index++) operations.push(await reserveAiCredit({ userId, idempotencyKey: `reserved-${index}` }))
  await refundOrder({ ...paid, refundedAmount: 250 })
  for (const operation of operations) await releaseAiCredit(operation.operationId, 'failed')
  expect(await getCreditBalance(userId)).toEqual({ available: 13, reserved: 0 })
})
