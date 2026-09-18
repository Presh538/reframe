import { and, desc, eq } from 'drizzle-orm'
import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getDatabase } from '@/lib/db/client'
import { accountAccessSnapshots, billingOrders, checkoutIntents, creditAccounts, subscriptions } from '@/lib/db/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store, max-age=0' }
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers })
    const checkoutId = request.nextUrl.searchParams.get('checkout_id')
    if (checkoutId && (checkoutId.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(checkoutId))) {
      return NextResponse.json({ error: 'Invalid checkout reference' }, { status: 400, headers })
    }
    const db = getDatabase()
    const [[access], [credits], plans, orders, intents] = await Promise.all([
      db.select({ plan: accountAccessSnapshots.planKey }).from(accountAccessSnapshots)
        .where(eq(accountAccessSnapshots.userId, user.id)).limit(1),
      db.select({ available: creditAccounts.available, reserved: creditAccounts.reserved }).from(creditAccounts)
        .where(and(eq(creditAccounts.userId, user.id), eq(creditAccounts.creditType, 'ai_generation'))).limit(1),
      db.select({ productKey: subscriptions.productKey, status: subscriptions.status,
        currentPeriodEnd: subscriptions.currentPeriodEnd, cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd })
        .from(subscriptions).where(eq(subscriptions.userId, user.id)).orderBy(desc(subscriptions.updatedAt)).limit(5),
      db.select({ status: billingOrders.status, amountMinor: billingOrders.amountMinor,
        currency: billingOrders.currency, createdAt: billingOrders.createdAt })
        .from(billingOrders).where(eq(billingOrders.userId, user.id)).orderBy(desc(billingOrders.createdAt)).limit(5),
      checkoutId ? db.select({ status: checkoutIntents.status }).from(checkoutIntents)
        .where(and(eq(checkoutIntents.userId, user.id), eq(checkoutIntents.providerCheckoutId, checkoutId))).limit(1)
        : Promise.resolve([]),
    ])
    // A URL parameter is a lookup hint, never proof of payment or ownership.
    return NextResponse.json({ plan: access?.plan ?? 'free', credits: credits ?? { available: 0, reserved: 0 },
      subscriptions: plans, orders, checkout: checkoutId ? intents[0] ?? { status: 'unknown' } : null }, { headers })
  } catch {
    return NextResponse.json({ error: 'Billing status temporarily unavailable' }, { status: 503, headers })
  }
}
