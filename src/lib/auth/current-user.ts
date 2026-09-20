import 'server-only'

import { auth } from '@clerk/nextjs/server'
import { and, eq } from 'drizzle-orm'
import { getDatabase } from '@/lib/db/client'
import {
  accountAccessSnapshots,
  appUsers,
  billingCustomers,
  creditAccounts,
  creditGrants,
  type AppUser,
} from '@/lib/db/schema'
import { grantCredits } from '@/lib/billing/credits'
import { ALLOWANCE } from '@/lib/billing/policy'
import { integrationStatus } from '@/lib/env'

export class AuthenticationRequiredError extends Error {
  constructor() {
    super('Authentication required')
    this.name = 'AuthenticationRequiredError'
  }
}

/**
 * Resolves Clerk identity to Reframe's provider-independent internal UUID.
 * The lazy upsert avoids relying on asynchronous Clerk webhook delivery.
 */
export async function getCurrentAppUser(): Promise<AppUser | null> {
  if (!integrationStatus.clerk() || !integrationStatus.database()) return null

  const { userId } = await auth()
  if (!userId) return null

  const db = getDatabase()

  // Fast path: one round trip.
  //
  // Provisioning only matters the first time an account is seen, but it used
  // to run on every authenticated request -- a five-statement transaction plus
  // grantCredits' own transaction, so roughly a dozen round trips before any
  // route did its actual work. Every one after the first was a no-op that
  // still cost the latency.
  //
  // The check cannot be "does the user row exist": the Clerk webhook creates
  // that row on its own, without the credit account or the free grant, so a
  // webhook-created account would be handed back unprovisioned and would then
  // look like it had no credits. The join confirms the rows that actually
  // matter are present before taking the shortcut.
  const [existing] = await db
    .select({
      user: appUsers,
      creditAccountUserId: creditAccounts.userId,
      freeGrantId: creditGrants.id,
    })
    .from(appUsers)
    .leftJoin(creditAccounts, and(
      eq(creditAccounts.userId, appUsers.id),
      eq(creditAccounts.creditType, 'ai_generation'),
    ))
    .leftJoin(creditGrants, and(
      eq(creditGrants.userId, appUsers.id),
      eq(creditGrants.grantType, 'free_allowance'),
    ))
    .where(eq(appUsers.clerkUserId, userId))
    .limit(1)

  if (existing && existing.user.status !== 'active') return null
  if (existing?.creditAccountUserId && existing.freeGrantId) return existing.user

  const user = await db.transaction(async (tx) => {
    await tx.insert(appUsers).values({ clerkUserId: userId }).onConflictDoNothing()

    const [user] = await tx
      .select()
      .from(appUsers)
      .where(eq(appUsers.clerkUserId, userId))
      .limit(1)

    if (!user || user.status !== 'active') return null

    await tx.insert(creditAccounts).values({
      userId: user.id,
      creditType: 'ai_generation',
    }).onConflictDoNothing()

    await tx.insert(accountAccessSnapshots).values({ userId: user.id }).onConflictDoNothing()

    await tx.insert(billingCustomers).values({
      userId: user.id,
      externalCustomerId: user.id,
    }).onConflictDoNothing()

    return user
  })

  if (!user) return null

  // Granted outside the upsert transaction because grantCredits owns its own.
  // The deterministic key makes the repeat on every later request a no-op.
  await grantCredits({
    userId: user.id,
    amount: ALLOWANCE.freeAccountAiCredits,
    grantType: 'free_allowance',
    sourceType: 'free_allowance',
    sourceId: user.id,
    idempotencyKey: `free-account:${user.id}:v1`,
  })

  return user
}

export async function requireCurrentAppUser(): Promise<AppUser> {
  const user = await getCurrentAppUser()
  if (!user) throw new AuthenticationRequiredError()
  return user
}
