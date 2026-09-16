import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getDatabase } from '@/lib/db/client'
import { accountAccessSnapshots, creditAccounts } from '@/lib/db/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const noStore = { 'Cache-Control': 'private, no-store, max-age=0' }
  const user = await getCurrentAppUser()

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      plan: 'guest',
      features: {},
      credits: null,
    }, { headers: noStore })
  }

  const db = getDatabase()
  const [[access], [credits]] = await Promise.all([
    db.select().from(accountAccessSnapshots)
      .where(eq(accountAccessSnapshots.userId, user.id)).limit(1),
    db.select().from(creditAccounts)
      .where(eq(creditAccounts.userId, user.id)).limit(1),
  ])

  return NextResponse.json({
    authenticated: true,
    plan: access?.planKey ?? 'free',
    features: access?.features ?? {},
    credits: {
      available: credits?.available ?? 0,
      reserved: credits?.reserved ?? 0,
    },
  }, { headers: noStore })
}
