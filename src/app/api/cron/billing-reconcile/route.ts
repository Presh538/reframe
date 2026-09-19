/**
 * GET /api/cron/billing-reconcile — scheduled billing self-repair.
 *
 * Releases orphaned credit reservations, retires lapsed credit grants, and
 * rebuilds access snapshots whose entitlements have expired.
 *
 * Security:
 *   • Requires `Authorization: Bearer ${CRON_SECRET}`, compared in constant
 *     time. Fails closed when CRON_SECRET is unset rather than exposing an
 *     unauthenticated endpoint that mutates balances.
 */

import { timingSafeEqual } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'
import {
  expireLapsedCreditGrants,
  grantMonthlySubscriptionCredits,
  recordReconciliationAudit,
  refreshLapsedAccess,
  releaseStaleReservations,
} from '@/lib/billing/reconciliation'
import { integrationStatus } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorized(header: string | null, secret: string): boolean {
  if (!header) return false
  const provided = Buffer.from(header)
  const expected = Buffer.from(`Bearer ${secret}`)
  return provided.length === expected.length && timingSafeEqual(provided, expected)
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron:billing-reconcile] CRON_SECRET is not configured')
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }

  if (!authorized(request.headers.get('authorization'), secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!integrationStatus.database()) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }

  try {
    const reservations = await releaseStaleReservations()
    const grants = await expireLapsedCreditGrants()
    const access = await refreshLapsedAccess()
    const monthly = await grantMonthlySubscriptionCredits()

    const summary = {
      reservationsReleased: reservations.released,
      reservationsFailed: reservations.failed,
      grantsExpired: grants.expired,
      creditsExpired: grants.credits,
      snapshotsRebuilt: access.rebuilt,
      subscriptionsCheckedForMonthlyGrant: monthly.checked,
    }

    await recordReconciliationAudit(summary)
    console.log('[cron:billing-reconcile]', summary)
    return NextResponse.json({ ok: true, ...summary })
  } catch (error) {
    console.error('[cron:billing-reconcile] failed', {
      error: error instanceof Error ? error.name : 'unknown',
    })
    return NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 })
  }
}
