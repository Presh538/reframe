'use client'

import { refreshEntitlements } from '@/lib/billing/useEntitlements'

/**
 * Client half of export metering.
 *
 * The server decides whether an export is watermarked and reserves the credit;
 * this only relays the outcome and reports how the export ended, so the
 * reserved credit is either confirmed or handed back.
 *
 * Every failure here falls back to a watermarked export rather than a clean
 * one. Encoding runs in the browser, so this is not a lock — but it must not
 * be the thing that gives a clean export away when the server never agreed.
 */
export type ExportPermit = { watermark: boolean; operationId: string | null }

const WATERMARKED: ExportPermit = { watermark: true, operationId: null }
const CLEAN: ExportPermit = { watermark: false, operationId: null }

/**
 * Only raster output is stamped, so only raster output is charged for. Lottie,
 * CSS and the embed snippet have no frames to mark, and charging a credit to
 * remove a watermark that was never going to be there would be taking payment
 * for nothing.
 */
const WATERMARKABLE = new Set(['gif', 'webm'])

export async function beginMeteredExport(format: string): Promise<ExportPermit> {
  if (!WATERMARKABLE.has(format)) return CLEAN
  try {
    const response = await fetch('/api/export/credit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // One key per export, so a retried request cannot charge twice.
      body: JSON.stringify({ phase: 'begin', idempotencyKey: crypto.randomUUID() }),
    })
    if (!response.ok) return WATERMARKED
    const body = await response.json() as Partial<ExportPermit>
    return { watermark: body.watermark !== false, operationId: body.operationId ?? null }
  } catch {
    return WATERMARKED
  }
}

/**
 * Closes out a metered export. `succeeded` confirms the spend; anything else
 * returns the credit. Silent by design: the customer already has their file
 * (or already has an error), and a bookkeeping failure is ours to notice, not
 * theirs. The daily sweep covers a report that never arrives.
 */
export async function finishMeteredExport(
  permit: ExportPermit,
  outcome: 'succeeded' | 'failed',
): Promise<void> {
  if (!permit.operationId) return
  try {
    await fetch('/api/export/credit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        outcome === 'succeeded'
          ? { phase: 'settle', operationId: permit.operationId }
          : { phase: 'refund', operationId: permit.operationId, reason: 'export_failed' },
      ),
      // The tab may be closing behind a download; let the request outlive it.
      keepalive: true,
    })
  } catch { /* swept by the stale-reservation sweep */ }
  // The balance moved either way, so the header should stop showing the old one.
  refreshEntitlements()
}
