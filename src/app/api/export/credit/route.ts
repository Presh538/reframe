import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { beginExport, refundExport, settleExport } from '@/lib/billing/export-metering'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0' }

/**
 * Decides whether an export is watermarked, and meters the credit when it is
 * not. Encoding runs in the browser, so this cannot force the client's hand --
 * but the decision is made here, from the account's real entitlements and
 * balance, rather than from anything the client asserts.
 *
 * Reserve, then settle or refund, so an export that fails after the credit was
 * taken hands it back.
 */
const BodySchema = z.discriminatedUnion('phase', [
  z.object({ phase: z.literal('begin'), idempotencyKey: z.string().uuid() }),
  z.object({ phase: z.literal('settle'), operationId: z.string().uuid() }),
  z.object({ phase: z.literal('refund'), operationId: z.string().uuid(), reason: z.string().max(64).optional() }),
])

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers: NO_STORE })
  }

  const user = await getCurrentAppUser()
  const body = parsed.data

  if (body.phase === 'begin') {
    const meter = await beginExport(user?.id ?? null, body.idempotencyKey)
    return NextResponse.json(meter, { headers: NO_STORE })
  }

  // Settling or refunding someone else's operation must not be possible;
  // the helpers check the operation belongs to this account and is an export.
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401, headers: NO_STORE })
  }

  if (body.phase === 'settle') await settleExport(user.id, body.operationId)
  else await refundExport(user.id, body.operationId, body.reason ?? 'export_failed')

  return NextResponse.json({ ok: true }, { headers: NO_STORE })
}
