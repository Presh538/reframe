import 'server-only'
import { and, eq, gt, inArray, or } from 'drizzle-orm'
import { getDatabase } from '@/lib/db/client'
import { checkoutIntents, creditAccounts, subscriptions } from '@/lib/db/schema'

export async function prepareCheckoutIntent(userId: string, productKey: string, idempotencyKey: string) {
  return getDatabase().transaction(async tx => {
    await tx.select().from(creditAccounts).where(eq(creditAccounts.userId, userId)).for('update').limit(1)
    const [existing] = await tx.select().from(checkoutIntents).where(and(eq(checkoutIntents.userId, userId),
      eq(checkoutIntents.idempotencyKey, idempotencyKey))).limit(1)
    if (existing) {
      if (existing.productKey !== productKey) return { error: 'Checkout reference belongs to another product' }
      return { existing }
    }
    if (['pro_monthly', 'pro_yearly'].includes(productKey)) {
      const [current] = await tx.select().from(subscriptions).where(and(eq(subscriptions.userId, userId), or(
        eq(subscriptions.status, 'paused'), and(inArray(subscriptions.status, ['active', 'trialing', 'past_due']),
          gt(subscriptions.currentPeriodEnd, new Date()))))).limit(1)
      if (current) return { error: 'You already have a subscription. Use Account → Billing to manage it.' }
      const [open] = await tx.select().from(checkoutIntents).where(and(eq(checkoutIntents.userId, userId),
        inArray(checkoutIntents.productKey, ['pro_monthly', 'pro_yearly']), inArray(checkoutIntents.status, ['pending', 'open']))).limit(1)
      if (open) return { error: 'A subscription checkout is already open. Complete it or wait for it to expire.' }
    }
    const [createdIntent] = await tx.insert(checkoutIntents).values({ userId, productKey, idempotencyKey }).returning()
    return { createdIntent }
  })
}
