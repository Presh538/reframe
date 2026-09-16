import 'server-only'

import { getCurrentAppUser } from '@/lib/auth/current-user'
import {
  completeAiCredit,
  InsufficientCreditsError,
  releaseAiCredit,
  reserveAiCredit,
} from '@/lib/billing/credits'
import { consumeGuestAiTrial, GuestTrialUnavailableError, persistGuestCookie } from '@/lib/billing/guest-trial'
import { integrationStatus } from '@/lib/env'

/**
 * A single AI generation's billing handle.
 *
 * `unmetered` exists so the editor keeps working before Neon/Clerk/Upstash are
 * provisioned. It is chosen only when the database is absent -- never as a
 * fallback after a metering attempt fails, which would be a free-credits bug.
 */
export type AiMeter =
  | { mode: 'unmetered' }
  | { mode: 'guest'; remaining: number; guestCookie: string | null }
  | { mode: 'user'; userId: string; operationId: string; replayed: boolean }

export type AiMeterDenial = {
  status: number
  error: string
  reason: 'insufficient_credits' | 'guest_allowance_exhausted' | 'network_allowance_exhausted' | 'metering_unavailable'
}

export class AiMeterDeniedError extends Error {
  readonly denial: AiMeterDenial
  constructor(denial: AiMeterDenial) {
    super(denial.reason)
    this.name = 'AiMeterDeniedError'
    this.denial = denial
  }
}

/**
 * Reserves capacity for one generation before any model call is made.
 *
 * Signed-in users spend a real credit inside one short Postgres transaction;
 * anonymous visitors spend a Redis trial counter. Both paths are consumed up
 * front so a crash mid-request can never produce an unpaid generation.
 */
export async function beginAiGeneration(
  request: Request,
  idempotencyKey: string,
): Promise<AiMeter> {
  if (!integrationStatus.database()) return { mode: 'unmetered' }

  const user = await getCurrentAppUser()

  if (!user) {
    try {
      const trial = await consumeGuestAiTrial(request)
      if (!trial.allowed) {
        throw new AiMeterDeniedError({
          status: 402,
          reason: trial.reason,
          error:
            trial.reason === 'guest_allowance_exhausted'
              ? 'You have used your free AI generations. Sign in to continue.'
              : 'The free AI allowance for this network has been used up. Sign in to continue.',
        })
      }
      return { mode: 'guest', remaining: trial.remaining, guestCookie: trial.setCookie }
    } catch (error) {
      if (error instanceof GuestTrialUnavailableError) {
        throw new AiMeterDeniedError({
          status: 503,
          reason: 'metering_unavailable',
          error: 'AI features are temporarily unavailable. Please try again later.',
        })
      }
      throw error
    }
  }

  try {
    const reservation = await reserveAiCredit({ userId: user.id, idempotencyKey })
    return {
      mode: 'user',
      userId: user.id,
      operationId: reservation.operationId,
      replayed: !reservation.charged,
    }
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      throw new AiMeterDeniedError({
        status: 402,
        reason: 'insufficient_credits',
        error: 'You are out of AI credits. Top up to keep generating.',
      })
    }
    throw error
  }
}

/** Converts the reservation into a consumed credit. Never throws into the route. */
export async function settleAiGeneration(
  meter: AiMeter,
  usage?: { inputTokens?: number; outputTokens?: number; providerRequestId?: string },
): Promise<void> {
  if (meter.mode !== 'user') {
    if (meter.mode === 'guest') await persistGuestCookie(meter.guestCookie)
    return
  }

  try {
    await completeAiCredit({ operationId: meter.operationId, ...usage })
  } catch (error) {
    // The credit is already reserved, so the user is not over-charged. A stale
    // reservation is swept by the reconciliation job.
    console.error('[ai-metering] settle failed', {
      operationId: meter.operationId,
      error: error instanceof Error ? error.name : 'unknown',
    })
  }
}

/** Returns the reserved credit after a failed generation. Never throws. */
export async function refundAiGeneration(meter: AiMeter, errorCode: string): Promise<void> {
  if (meter.mode !== 'user') return

  try {
    await releaseAiCredit(meter.operationId, errorCode)
  } catch (error) {
    console.error('[ai-metering] release failed', {
      operationId: meter.operationId,
      error: error instanceof Error ? error.name : 'unknown',
    })
  }
}
