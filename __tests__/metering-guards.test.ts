/**
 * Degradation guards.
 *
 * These pin the behaviour the deployment order depends on: metering must be
 * inert while the database is unconfigured, and must never silently fall back
 * to "free" once it is configured.
 */

jest.mock('server-only', () => ({}))

const getCurrentAppUser = jest.fn()
const consumeGuestAiTrial = jest.fn()
const reserveAiCredit = jest.fn()

jest.mock('@/lib/auth/current-user', () => ({ getCurrentAppUser }))
jest.mock('@/lib/billing/guest-trial', () => ({
  consumeGuestAiTrial,
  persistGuestCookie: jest.fn(),
  GuestTrialUnavailableError: class GuestTrialUnavailableError extends Error {},
}))
jest.mock('@/lib/billing/credits', () => ({
  reserveAiCredit,
  completeAiCredit: jest.fn(),
  releaseAiCredit: jest.fn(),
  InsufficientCreditsError: class InsufficientCreditsError extends Error {},
}))

import { AiMeterDeniedError, beginAiGeneration } from '@/lib/billing/ai-metering'
import { InsufficientCreditsError } from '@/lib/billing/credits'

const request = () => new Request('https://reframeo.com/api/ai-animate', { method: 'POST' })

describe('metering degradation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.DATABASE_URL
  })

  it('stays inert while the database is unconfigured', async () => {
    const meter = await beginAiGeneration(request(), 'key-1')

    expect(meter).toEqual({ mode: 'unmetered' })
    // Nothing may be consulted: this is the pre-launch path.
    expect(getCurrentAppUser).not.toHaveBeenCalled()
    expect(consumeGuestAiTrial).not.toHaveBeenCalled()
  })

  it('meters a signed-in user once the database is configured', async () => {
    process.env.DATABASE_URL = 'postgres://example/db'
    getCurrentAppUser.mockResolvedValue({ id: 'user-uuid' })
    reserveAiCredit.mockResolvedValue({ operationId: 'op-1', status: 'reserved', charged: true })

    const meter = await beginAiGeneration(request(), 'key-2')

    expect(meter).toMatchObject({ mode: 'user', userId: 'user-uuid', operationId: 'op-1' })
    expect(reserveAiCredit).toHaveBeenCalledWith({ userId: 'user-uuid', idempotencyKey: 'key-2' })
  })

  it('treats a visitor as a guest when no session exists', async () => {
    process.env.DATABASE_URL = 'postgres://example/db'
    getCurrentAppUser.mockResolvedValue(null)
    consumeGuestAiTrial.mockResolvedValue({ allowed: true, remaining: 2, setCookie: null })

    const meter = await beginAiGeneration(request(), 'key-3')

    expect(meter).toMatchObject({ mode: 'guest', remaining: 2 })
  })

  it('denies rather than falling back to free when credits run out', async () => {
    process.env.DATABASE_URL = 'postgres://example/db'
    getCurrentAppUser.mockResolvedValue({ id: 'user-uuid' })
    reserveAiCredit.mockRejectedValue(new InsufficientCreditsError())

    await expect(beginAiGeneration(request(), 'key-4')).rejects.toBeInstanceOf(AiMeterDeniedError)
  })

  it('denies rather than falling back to free when the guest allowance is spent', async () => {
    process.env.DATABASE_URL = 'postgres://example/db'
    getCurrentAppUser.mockResolvedValue(null)
    consumeGuestAiTrial.mockResolvedValue({ allowed: false, reason: 'guest_allowance_exhausted' })

    await expect(beginAiGeneration(request(), 'key-5')).rejects.toBeInstanceOf(AiMeterDeniedError)
  })
})
