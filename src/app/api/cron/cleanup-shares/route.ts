/**
 * GET /api/cron/cleanup-shares — scheduled purge of expired share blobs.
 *
 * Vercel Blob has no native TTL, so this endpoint deletes any share older
 * than SHARE_TTL_DAYS. It is invoked by a Vercel Cron Job (see vercel.json).
 *
 * Security:
 *   • Vercel attaches `Authorization: Bearer ${CRON_SECRET}` to cron requests
 *     when CRON_SECRET is set. We require it, so the endpoint can't be
 *     triggered by the public. If CRON_SECRET is unset we refuse to run
 *     (fail closed) rather than expose an open delete-everything endpoint.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { deleteExpiredShares } from '@/lib/share'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'
export const maxDuration = 60  // listing + batch deletes across many blobs

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET

  // Fail closed: never run an unauthenticated delete operation.
  if (!secret) {
    console.error('[cron:cleanup-shares] CRON_SECRET is not configured')
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }

  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { scanned, deleted } = await deleteExpiredShares()
    console.log(`[cron:cleanup-shares] scanned=${scanned} deleted=${deleted}`)
    return NextResponse.json({ ok: true, scanned, deleted })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'cleanup failed'
    console.error('[cron:cleanup-shares]', message)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}
