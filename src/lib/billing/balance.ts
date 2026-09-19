import 'server-only'
import { and, eq, gt, isNull, lte, or, sql } from 'drizzle-orm'
import { getDatabase } from '@/lib/db/client'
import { creditAccounts, creditGrants } from '@/lib/db/schema'

/** Display eligible units, not an aggregate that the daily expiry sweep may lag. */
export async function getCreditBalance(userId: string) {
  const now = new Date()
  const db = getDatabase()
  const [[eligible], [account]] = await Promise.all([
    db.select({ available: sql<number>`coalesce(sum(${creditGrants.remaining}), 0)::bigint` }).from(creditGrants)
      .where(and(eq(creditGrants.userId, userId), eq(creditGrants.creditType, 'ai_generation'), isNull(creditGrants.revokedAt),
        lte(creditGrants.startsAt, now), or(isNull(creditGrants.expiresAt), gt(creditGrants.expiresAt, now)))),
    db.select({ reserved: creditAccounts.reserved }).from(creditAccounts).where(eq(creditAccounts.userId, userId)).limit(1),
  ])
  return { available: Number(eligible?.available ?? 0), reserved: account?.reserved ?? 0 }
}
