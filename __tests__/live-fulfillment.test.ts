/**
 * Live subscription-fulfilment invariants.
 *
 * Exercises order and subscription fulfilment against the real database with
 * a synthetic user and synthetic catalog rows that are removed per run. Skips
 * without .env.local, and skips if real Pro products already exist so it can
 * never collide with a configured catalog.
 */

import fs from 'node:fs'

let hasLocalEnv = false
try {
  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, '$2')
  }
  hasLocalEnv = true
} catch { /* guarded below */ }

// Requires .env.local specifically: a CI runner holding production database
// credentials must never run tests that write to that database.
const configured = hasLocalEnv && Boolean(process.env.DATABASE_URL)

jest.mock('server-only', () => ({}))

import postgres from 'postgres'
import type { Order } from '@polar-sh/sdk/models/components/order.js'
import {
  fulfillPaidOrder,
  grantSubscriptionPeriodCredits,
  syncSubscription,
  UntrustedBillingEventError,
  type SubscriptionState,
} from '@/lib/billing/fulfillment'

jest.setTimeout(120_000)
const suite = configured ? describe : describe.skip
const DAY = 24 * 60 * 60 * 1000

suite('live subscription fulfilment', () => {
  const sql = postgres(process.env.DATABASE_URL as string, { ssl: 'require', max: 1, prepare: false })
  const run = Date.now()
  const monthlyProductId = `test_prod_monthly_${run}`
  const yearlyProductId = `test_prod_yearly_${run}`
  let userId: string
  let catalogFree = false

  const available = async () => {
    const [row] = await sql`select available from credit_account where user_id = ${userId}`
    return Number(row?.available ?? 0)
  }

  const renewalOrder = (subscriptionId: string, overrides: Partial<Record<string, unknown>> = {}) => ({
    id: `test_order_${subscriptionId}_${Math.random().toString(36).slice(2)}`,
    paid: true,
    billingReason: 'subscription_cycle',
    productId: monthlyProductId,
    checkoutId: null,
    customerId: `test_cus_${run}`,
    customer: { externalId: userId },
    metadata: {},
    currency: 'usd',
    totalAmount: 900,
    netAmount: 900,
    subscription: {
      id: subscriptionId,
      productId: monthlyProductId,
      status: 'active',
      currentPeriodStart: new Date(Date.now() - DAY),
      currentPeriodEnd: new Date(Date.now() + 29 * DAY),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      endedAt: null,
    },
    ...overrides,
  }) as unknown as Order

  beforeAll(async () => {
    const existing = await sql`select 1 from billing_product where product_key in ('pro_monthly', 'pro_yearly')`
    catalogFree = existing.length === 0
    if (!catalogFree) return

    const [u] = await sql`insert into app_user (clerk_user_id) values (${'test_fulfil_' + run}) returning id`
    userId = u.id
    await sql`insert into credit_account (user_id, credit_type) values (${userId}, 'ai_generation')`
    await sql`
      insert into billing_product (product_key, provider_product_id, kind, fulfillment_recipe)
      values ('pro_monthly', ${monthlyProductId}, 'subscription', '{}'),
             ('pro_yearly',  ${yearlyProductId},  'subscription', '{}')`
  })

  afterAll(async () => {
    if (catalogFree && userId) {
      await sql`delete from credit_ledger        where user_id = ${userId}`
      await sql`delete from credit_grant         where user_id = ${userId}`
      await sql`delete from credit_account       where user_id = ${userId}`
      await sql`delete from entitlement_grant    where user_id = ${userId}`
      await sql`delete from billing_order_item   where order_id in (select id from billing_order where user_id = ${userId})`
      await sql`delete from billing_order        where user_id = ${userId}`
      await sql`delete from subscription         where user_id = ${userId}`
      await sql`delete from billing_customer     where user_id = ${userId}`
      await sql`delete from account_access_snapshot where user_id = ${userId}`
      await sql`delete from audit_event          where user_id = ${userId}`
      await sql`delete from app_user             where id = ${userId}`
      await sql`delete from billing_product where provider_product_id in (${monthlyProductId}, ${yearlyProductId})`
    }
    await sql.end()
  })

  it('fulfils a renewal order that has no checkout behind it', async () => {
    if (!catalogFree) return
    const subscriptionId = `test_sub_renew_${run}`
    await fulfillPaidOrder(renewalOrder(subscriptionId))

    const [order] = await sql`select status, provider_checkout_id from billing_order where user_id = ${userId}`
    expect(order.status).toBe('paid')
    expect(order.provider_checkout_id).toBeNull()

    const [snap] = await sql`select plan_key from account_access_snapshot where user_id = ${userId}`
    expect(snap.plan_key).toBe('pro')
    expect(await available()).toBe(300)
  })

  it('does not double-grant when order.paid and subscription webhooks both arrive', async () => {
    if (!catalogFree) return
    const before = await available()
    const subscriptionId = `test_sub_renew_${run}`

    // The same billing period delivered again via order.paid and via the
    // subscription.updated path, in either order.
    await fulfillPaidOrder(renewalOrder(subscriptionId))
    const state: SubscriptionState = {
      providerSubscriptionId: subscriptionId,
      userId,
      providerProductId: monthlyProductId,
      status: 'active',
      currentPeriodStart: new Date(Date.now() - DAY),
      currentPeriodEnd: new Date(Date.now() + 29 * DAY),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      endedAt: null,
    }
    await syncSubscription(state)
    await grantSubscriptionPeriodCredits(state)

    expect(await available()).toBe(before)
  })

  it('gives an annual plan its allowance every month, each expiring within ~a month', async () => {
    if (!catalogFree) return
    const before = await available()
    const state: SubscriptionState = {
      providerSubscriptionId: `test_sub_yearly_${run}`,
      userId,
      providerProductId: yearlyProductId,
      status: 'active',
      currentPeriodStart: new Date(Date.now() - DAY),
      currentPeriodEnd: new Date(Date.now() + 364 * DAY),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      endedAt: null,
    }

    const monthOne = new Date()
    const monthTwo = new Date(Date.now() + 32 * DAY)
    await grantSubscriptionPeriodCredits(state, monthOne)
    await grantSubscriptionPeriodCredits(state, monthOne) // repeat: no-op
    await grantSubscriptionPeriodCredits(state, monthTwo)

    expect(await available()).toBe(before + 600)

    const grants = await sql`
      select expires_at, created_at from credit_grant
      where user_id = ${userId} and source_id = ${state.providerSubscriptionId}`
    expect(grants).toHaveLength(2)
    for (const g of grants) {
      // Never a year-long allowance, even though the billing period is a year.
      expect(new Date(g.expires_at).getTime()).toBeLessThanOrEqual(monthTwo.getTime() + 35 * DAY + 1000)
    }
  })

  it('still rejects a one-time purchase that has no matching checkout', async () => {
    if (!catalogFree) return
    const forged = renewalOrder(`test_sub_forged_${run}`, {
      billingReason: 'purchase',
      checkoutId: 'chk_not_ours',
      metadata: { checkout_intent_id: '00000000-0000-4000-8000-000000000000', product_key: 'pro_monthly' },
    })
    await expect(fulfillPaidOrder(forged)).rejects.toBeInstanceOf(UntrustedBillingEventError)
  })

  it('rejects a renewal that references a non-plan product', async () => {
    if (!catalogFree) return
    const forged = renewalOrder(`test_sub_bad_${run}`, { productId: 'test_prod_unknown' })
    await expect(fulfillPaidOrder(forged)).rejects.toBeInstanceOf(UntrustedBillingEventError)
  })
})
