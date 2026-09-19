import { createHash } from 'crypto'
import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { and, eq } from 'drizzle-orm'
import { NextResponse, type NextRequest } from 'next/server'
import { getDatabase } from '@/lib/db/client'
import { appUsers, webhookEvents } from '@/lib/db/schema'
import { requireServerEnv } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function errorResponse(status: number) {
  return NextResponse.json(
    { error: status === 400 ? 'Invalid webhook' : 'Webhook processing failed' },
    { status, headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function POST(request: NextRequest) {
  const providerEventId = request.headers.get('svix-id')
  if (!providerEventId) return errorResponse(400)

  const rawBody = await request.clone().text()
  let event: Awaited<ReturnType<typeof verifyWebhook>>

  try {
    event = await verifyWebhook(request, {
      signingSecret: requireServerEnv('CLERK_WEBHOOK_SIGNING_SECRET'),
    })
  } catch {
    return errorResponse(400)
  }

  const db = getDatabase()
  const payloadSha256 = createHash('sha256').update(rawBody).digest('hex')
  const eventWhere = and(
    eq(webhookEvents.provider, 'clerk'),
    eq(webhookEvents.providerEventId, providerEventId),
  )

  try {
    await db.insert(webhookEvents).values({
      provider: 'clerk',
      providerEventId,
      eventType: event.type,
      payloadSha256,
      payload: JSON.parse(rawBody) as Record<string, unknown>,
    }).onConflictDoNothing()

    const [stored] = await db.select({ status: webhookEvents.status })
      .from(webhookEvents)
      .where(eventWhere)
      .limit(1)

    if (stored?.status === 'processed') {
      return NextResponse.json({ received: true }, { headers: { 'Cache-Control': 'no-store' } })
    }

    await db.transaction(async (tx) => {
      if (event.type === 'user.created' || event.type === 'user.updated') {
        const primaryEmail = event.data.email_addresses.find(
          (email) => email.id === event.data.primary_email_address_id,
        )?.email_address

        const displayName = [event.data.first_name, event.data.last_name]
          .filter(Boolean)
          .join(' ') || null

        await tx.insert(appUsers).values({
          clerkUserId: event.data.id,
          primaryEmail: primaryEmail ?? null,
          displayName,
        }).onConflictDoUpdate({
          target: appUsers.clerkUserId,
          set: {
            primaryEmail: primaryEmail ?? null,
            displayName,
            updatedAt: new Date(),
          },
        })
      } else if (event.type === 'user.deleted' && event.data.id) {
        await tx.update(appUsers).set({
          status: 'deleted',
          primaryEmail: null,
          displayName: null,
          deletedAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(appUsers.clerkUserId, event.data.id))
      }

      await tx.update(webhookEvents).set({
        status: 'processed',
        attempts: 1,
        processedAt: new Date(),
      }).where(eventWhere)
    })

    return NextResponse.json({ received: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[clerk-webhook] processing failed', {
      providerEventId,
      error: error instanceof Error ? error.name : 'unknown',
    })

    await db.update(webhookEvents).set({
      status: 'failed',
      lastErrorCode: 'processing_failed',
    }).where(eventWhere).catch(() => undefined)

    return errorResponse(500)
  }
}
