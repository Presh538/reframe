import { and, desc, eq, sql } from 'drizzle-orm'
import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getDatabase } from '@/lib/db/client'
import { billingOrderItems, billingOrders, checkoutIntents, subscriptions } from '@/lib/db/schema'
import { getAccountAccess } from '@/lib/billing/entitlements'
import { getCreditBalance } from '@/lib/billing/balance'

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
    const [access, credits, plans, orders, intents] = await Promise.all([
      getAccountAccess(user.id), getCreditBalance(user.id),
      db.select({ productKey: subscriptions.productKey, status: subscriptions.status,
        currentPeriodEnd: subscriptions.currentPeriodEnd, cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd })
        .from(subscriptions).where(eq(subscriptions.userId, user.id)).orderBy(desc(subscriptions.updatedAt)).limit(5),
      db.select({ id: billingOrders.id, status: billingOrders.status, amountMinor: billingOrders.amountMinor,
        currency: billingOrders.currency, createdAt: billingOrders.createdAt,
        // One item per order today; the subquery names what was bought so the
        // account panel can say "25 AI Credits" rather than a bare amount.
        productKey: sql<string | null>`(select ${billingOrderItems.productKey} from ${billingOrderItems}
          where ${billingOrderItems.orderId} = ${billingOrders.id} limit 1)` })
        .from(billingOrders).where(eq(billingOrders.userId, user.id)).orderBy(desc(billingOrders.createdAt)).limit(5),
      checkoutId ? db.select({ status: checkoutIntents.status }).from(checkoutIntents)
        .where(and(eq(checkoutIntents.userId, user.id), eq(checkoutIntents.providerCheckoutId, checkoutId))).limit(1)
        : Promise.resolve([]),
    ])
    // A URL parameter is a lookup hint, never proof of payment or ownership.
    return NextResponse.json({ plan: access.planKey, credits,
      subscriptions: plans, orders, checkout: checkoutId ? intents[0] ?? { status: 'unknown' } : null }, { headers })
  } catch {
    return NextResponse.json({ error: 'Billing status temporarily unavailable' }, { status: 503, headers })
  }
}
