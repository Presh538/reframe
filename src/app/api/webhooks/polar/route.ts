import { createHash } from 'crypto'
import { validateEvent } from '@polar-sh/sdk/webhooks'
import { and, eq, sql } from 'drizzle-orm'
import { NextResponse, type NextRequest } from 'next/server'
import {
  fulfillPaidOrder,
  grantSubscriptionPeriodCredits,
  refundOrder,
  subscriptionStateFromWebhook,
  syncSubscription,
  UntrustedBillingEventError,
} from '@/lib/billing/fulfillment'
import { getDatabase } from '@/lib/db/client'
import { webhookEvents } from '@/lib/db/schema'
import { requireServerEnv } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function webhookResponse(status: number) {
  return NextResponse.json(
    status < 300 ? { received: true } : { error: status === 400 ? 'Invalid webhook' : 'Webhook processing failed' },
    { status, headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function POST(request: NextRequest) {
  const providerEventId = request.headers.get('webhook-id') ?? request.headers.get('svix-id')
  if (!providerEventId) return webhookResponse(400)

  const rawBody = await request.text()
  const headers = Object.fromEntries(request.headers.entries())
  let event: ReturnType<typeof validateEvent>

  try {
    event = validateEvent(rawBody, headers, requireServerEnv('POLAR_WEBHOOK_SECRET'))
  } catch {
    return webhookResponse(400)
  }

  const db = getDatabase()
  const payloadSha256 = createHash('sha256').update(rawBody).digest('hex')
  const eventWhere = and(
    eq(webhookEvents.provider, 'polar'),
    eq(webhookEvents.providerEventId, providerEventId),
  )

  try {
    await db.insert(webhookEvents).values({
      provider: 'polar',
      providerEventId,
      eventType: event.type,
      payloadSha256,
      payload: JSON.parse(rawBody) as Record<string, unknown>,
    }).onConflictDoNothing()

    const [stored] = await db.select({ status: webhookEvents.status })
      .from(webhookEvents).where(eventWhere).limit(1)
    if (stored?.status === 'processed' || stored?.status === 'ignored') return webhookResponse(200)

    await db.update(webhookEvents).set({
      status: 'processing',
      attempts: sql`${webhookEvents.attempts} + 1`,
      lastErrorCode: null,
    }).where(eventWhere)

    if (event.type === 'order.paid') {
      await fulfillPaidOrder(event.data)
    } else if (event.type === 'order.refunded') {
      await refundOrder(event.data)
    } else if (
      event.type === 'subscription.active' ||
      event.type === 'subscription.created' ||
      event.type === 'subscription.updated' ||
      event.type === 'subscription.canceled' ||
      event.type === 'subscription.uncanceled' ||
      event.type === 'subscription.past_due' ||
      event.type === 'subscription.revoked'
    ) {
      // One reconciling handler for every lifecycle event: each recomputes
      // access from the subscription's current state rather than patching it.
      const state = subscriptionStateFromWebhook(event.data)
      await syncSubscription(state)
      // Polar signals a renewal as `subscription.updated` with a new billing
      // period, so the allowance is keyed to the period rather than to an
      // event name. Repeats within one period are no-ops.
      await grantSubscriptionPeriodCredits(state)
    } else {
      await db.update(webhookEvents).set({ status: 'ignored', processedAt: new Date() }).where(eventWhere)
      return webhookResponse(200)
    }

    await db.update(webhookEvents).set({ status: 'processed', processedAt: new Date() }).where(eventWhere)
    return webhookResponse(200)
  } catch (error) {
    const errorCode = error instanceof UntrustedBillingEventError
      ? 'untrusted_event'
      : 'processing_failed'

    console.error('[polar-webhook] processing failed', {
      providerEventId,
      eventType: event.type,
      errorCode,
      error: error instanceof Error ? error.name : 'unknown',
    })

    await db.update(webhookEvents).set({
      status: 'failed',
      lastErrorCode: errorCode,
    }).where(eventWhere).catch(() => undefined)

    return webhookResponse(500)
  }
}
