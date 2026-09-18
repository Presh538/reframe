import { acceptSubscriptionState, allowanceWindow, refundedCreditTarget } from '@/lib/billing/lifecycle-policy'
const date = (value: string) => new Date(value)

describe('paid-period allowance policy', () => {
  it('does not issue a new monthly window at calendar rollover', () => {
    const start = date('2026-09-18T12:00:00Z'), end = date('2026-10-18T12:00:00Z')
    expect(allowanceWindow(start, end, false, date('2026-10-01T00:00:00Z'))).toEqual({ start, end })
  })
  it('clamps annual anniversaries without drifting after February', () => {
    const start = date('2027-01-31T12:00:00Z'), end = date('2028-01-31T12:00:00Z')
    expect(allowanceWindow(start, end, true, date('2027-03-01T00:00:00Z'))).toEqual({ start: date('2027-02-28T12:00:00Z'), end: date('2027-03-31T12:00:00Z') })
    expect(allowanceWindow(start, end, true, date('2027-03-31T12:00:00Z'))?.start).toEqual(date('2027-03-31T12:00:00Z'))
  })
  it('does not grant before or after the paid period', () => {
    expect(allowanceWindow(date('2026-09-18'), date('2026-10-18'), false, date('2026-09-17'))).toBeNull()
    expect(allowanceWindow(date('2026-09-18'), date('2026-10-18'), false, date('2026-10-18'))).toBeNull()
  })
  it('calculates cumulative refund targets with integer arithmetic', () => {
    expect(refundedCreditTarget(25, 250, 500)).toBe(12)
    expect(refundedCreditTarget(25, 500, 500)).toBe(25)
    expect(() => refundedCreditTarget(25, -1, 500)).toThrow()
  })
})

describe('subscription state ordering', () => {
  const current = { status: 'active', providerUpdatedAt: date('2026-09-20'), currentPeriodStart: date('2026-09-18') }
  it('rejects older snapshots and older periods', () => {
    expect(acceptSubscriptionState(current, { status: 'active', observedAt: date('2026-09-19'), currentPeriodStart: date('2026-09-18') })).toBe(false)
    expect(acceptSubscriptionState(current, { status: 'active', observedAt: date('2026-09-21'), currentPeriodStart: date('2026-08-18') })).toBe(false)
  })
  it('cannot resurrect a terminal subscription even with a later delivery', () => {
    expect(acceptSubscriptionState({ ...current, status: 'canceled' }, { status: 'active', observedAt: date('2026-09-21'), currentPeriodStart: date('2026-09-18') })).toBe(false)
  })
  it('allows undo cancellation while active and a later resume from pause', () => {
    expect(acceptSubscriptionState(current, { status: 'active', observedAt: date('2026-09-21'), currentPeriodStart: date('2026-09-18') })).toBe(true)
    expect(acceptSubscriptionState({ ...current, status: 'paused' }, { status: 'active', observedAt: date('2026-09-21'), currentPeriodStart: date('2026-09-21') })).toBe(true)
  })
})
