import 'server-only'

import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { getDatabase } from '@/lib/db/client'
import {
  accountAccessSnapshots,
  appUsers,
  billingCustomers,
  creditAccounts,
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
