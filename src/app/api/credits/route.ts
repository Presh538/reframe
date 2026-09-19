import { and, desc, eq, gt, isNull, or } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { ALLOWANCE } from '@/lib/billing/policy'
import { getDatabase } from '@/lib/db/client'
import { creditAccounts, creditGrants } from '@/lib/db/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0' }

/**
 * Reports the spendable AI balance. Read-only and never cached: the balance
 * shown here is informational, while the authority for spending remains the
 * atomic reservation inside the AI route.
 */
export async function GET() {
  const user = await getCurrentAppUser()

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      available: null,
      reserved: null,
      guestAllowance: ALLOWANCE.guestAiPerWindow,
      grants: [],
    }, { headers: NO_STORE })
  }

  const now = new Date()
  const db = getDatabase()

  const [[account], grants] = await Promise.all([
    db.select().from(creditAccounts).where(and(
      eq(creditAccounts.userId, user.id),
      eq(creditAccounts.creditType, 'ai_generation'),
    )).limit(1),
    db.select({
      grantType: creditGrants.grantType,
      remaining: creditGrants.remaining,
      expiresAt: creditGrants.expiresAt,
    }).from(creditGrants).where(and(
      eq(creditGrants.userId, user.id),
      eq(creditGrants.creditType, 'ai_generation'),
      gt(creditGrants.remaining, 0),
      isNull(creditGrants.revokedAt),
      or(isNull(creditGrants.expiresAt), gt(creditGrants.expiresAt, now)),
    )).orderBy(desc(creditGrants.createdAt)).limit(20),
  ])

  return NextResponse.json({
    authenticated: true,
    available: account?.available ?? 0,
    reserved: account?.reserved ?? 0,
    grants: grants.map((grant) => ({
      type: grant.grantType,
      remaining: grant.remaining,
      expiresAt: grant.expiresAt?.toISOString() ?? null,
    })),
  }, { headers: NO_STORE })
}
