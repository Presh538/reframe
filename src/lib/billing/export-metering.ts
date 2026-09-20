import 'server-only'

import { and, eq } from 'drizzle-orm'
import {
  InsufficientCreditsError,
  completeAiCredit,
  releaseAiCredit,
  reserveAiCredit,
} from '@/lib/billing/credits'
import { hasFeature } from '@/lib/billing/entitlements'
import { getDatabase } from '@/lib/db/client'
import { usageOperations } from '@/lib/db/schema'

/**
 * Confirms the operation is this account's, and is an export.
 *
 * completeAiCredit and releaseAiCredit both act on an operation id alone, so
 * without this an authenticated caller could settle or release an operation
 * belonging to someone else, or interfere with an AI generation still in
 * flight. Ids are random UUIDs and the damage would be limited, but the
 * endpoint takes the id from the client, so it is checked rather than trusted.
 */
async function ownsExportOperation(userId: string, operationId: string): Promise<boolean> {
  const [operation] = await getDatabase()
    .select({ id: usageOperations.id })
    .from(usageOperations)
    .where(and(
      eq(usageOperations.id, operationId),
      eq(usageOperations.userId, userId),
      eq(usageOperations.operationType, 'export_watermark_free'),
    ))
    .limit(1)
  return operation !== undefined
}

/**
 * Decides whether an export carries the Reframe watermark, and charges for it
 * when it does not.
 *
 * Three outcomes, in order:
 *
 *   Pro          -> clean export, nothing charged. The subscription already
 *                   pays for it via the export.watermark_free entitlement.
 *   Has credits  -> clean export, one credit reserved for it.
 *   Neither      -> watermarked. Never an error: a visitor with no credits is
 *                   the ordinary free case, not a failure.
 *
 * The credit is reserved rather than spent outright, so an export that fails
 * after this point can hand it back. Settlement is the caller's job --
 * `settleWatermarkFreeExport` on success, `refundWatermarkFreeExport` on
 * failure -- mirroring how AI generations are metered.
 */
export type ExportMeter =
  | { watermark: true; operationId: null }
  | { watermark: false; operationId: string | null }

export async function beginExport(
  userId: string | null,
  idempotencyKey: string,
): Promise<ExportMeter> {
  // Signed out: no account to charge and no entitlement to check.
  if (!userId) return { watermark: true, operationId: null }

  if (await hasFeature(userId, 'export.watermark_free')) {
    return { watermark: false, operationId: null }
  }

  try {
    const reservation = await reserveAiCredit({
      userId,
      idempotencyKey,
      operationType: 'export_watermark_free',
    })
    return { watermark: false, operationId: reservation.operationId }
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return { watermark: true, operationId: null }
    }
    // A database failure must not hand out a clean export for free, and must
    // not block the export either. Fall back to the watermarked one.
    console.error('[export-metering] reserve failed', {
      error: error instanceof Error ? error.name : 'unknown',
    })
    return { watermark: true, operationId: null }
  }
}

/** Confirms the spend after the file has been produced. Never throws. */
export async function settleExport(userId: string, operationId: string): Promise<void> {
  try {
    if (!await ownsExportOperation(userId, operationId)) return
    await completeAiCredit({ operationId })
  } catch (error) {
    // Already reserved, so the customer is not over-charged; the stale
    // reservation is swept by the same path that covers AI generations.
    console.error('[export-metering] settle failed', {
      operationId,
      error: error instanceof Error ? error.name : 'unknown',
    })
  }
}

/** Returns the reserved credit after a failed export. Never throws. */
export async function refundExport(userId: string, operationId: string, errorCode: string): Promise<void> {
  try {
    if (!await ownsExportOperation(userId, operationId)) return
    await releaseAiCredit(operationId, errorCode)
  } catch (error) {
    console.error('[export-metering] release failed', {
      operationId,
      error: error instanceof Error ? error.name : 'unknown',
    })
  }
}
