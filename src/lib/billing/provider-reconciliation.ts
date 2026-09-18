import 'server-only'
import { and, eq, inArray } from 'drizzle-orm'
import { getDatabase } from '@/lib/db/client'
import { subscriptions } from '@/lib/db/schema'
import { getPolarClient } from './polar'
import { grantSubscriptionPeriodCredits, subscriptionStateFromWebhook, syncSubscription, UntrustedBillingEventError } from './fulfillment'

/** Fetch canonical state, not just activeSubscriptions (which omits revocations). */
export async function reconcileUserSubscriptions(userId: string) {
  const polar = getPolarClient()
  const local = await getDatabase().select().from(subscriptions).where(and(eq(subscriptions.userId, userId),
    inArray(subscriptions.status, ['active', 'past_due', 'trialing', 'paused', 'incomplete']))).limit(20)
  const customer = await polar.customers.getStateExternal({ externalId: userId }, { timeoutMs: 10000 })
  const ids = [...new Set([...local.map(row => row.providerSubscriptionId), ...customer.activeSubscriptions.map(row => row.id)])]
  let synced = 0
  // Bound both request count and provider concurrency; no client-supplied IDs.
  for (let offset = 0; offset < ids.length; offset += 3) {
    const snapshots = await Promise.all(ids.slice(offset, offset + 3).map(id => polar.subscriptions.get({ id }, { timeoutMs: 10000 })))
    for (const subscription of snapshots) {
      const state = subscriptionStateFromWebhook(subscription)
      if (state.userId !== userId) throw new UntrustedBillingEventError('Provider customer ownership mismatch')
      await syncSubscription(state)
      await grantSubscriptionPeriodCredits(state)
      synced++
    }
  }
  return synced
}
