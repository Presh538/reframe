/** UTC anniversary arithmetic, clamped to the target month's final day. */
function anniversary(start: Date, months: number): Date {
  const result = new Date(start)
  result.setUTCDate(1)
  result.setUTCMonth(start.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(start.getUTCDate(), lastDay))
  return result
}

export function allowanceWindow(start: Date, end: Date, annual: boolean, now: Date) {
  if (![start, end, now].every(date => Number.isFinite(date.getTime())) || end <= start || now < start || now >= end) return null
  if (!annual) return { start, end }
  let index = (now.getUTCFullYear() - start.getUTCFullYear()) * 12 + now.getUTCMonth() - start.getUTCMonth()
  if (anniversary(start, index) > now) index--
  const windowStart = anniversary(start, index)
  const windowEnd = new Date(Math.min(anniversary(start, index + 1).getTime(), end.getTime()))
  return { start: windowStart, end: windowEnd }
}

export function refundedCreditTarget(amount: number, refunded: number, netAmount: number) {
  if (![amount, refunded, netAmount].every(Number.isSafeInteger) || amount < 0 || refunded < 0 || netAmount <= 0) throw new Error('Invalid refund amounts')
  return Number((BigInt(amount) * BigInt(Math.min(refunded, netAmount))) / BigInt(netAmount))
}

export function acceptSubscriptionState(existing: { status: string; providerUpdatedAt: Date | null; currentPeriodStart: Date | null } | undefined,
  incoming: { status: string; observedAt?: Date; currentPeriodStart: Date }) {
  if (!existing) return true
  if (existing.providerUpdatedAt && (!incoming.observedAt || incoming.observedAt < existing.providerUpdatedAt)) return false
  if (existing.currentPeriodStart && incoming.currentPeriodStart < existing.currentPeriodStart) return false
  // Polar terminal cancellations are not reversible; resubscription uses a new ID.
  if (['canceled', 'revoked', 'incomplete_expired'].includes(existing.status) && !['canceled', 'revoked', 'incomplete_expired'].includes(incoming.status)) return false
  // Equal-time catch-all events must not undo withdrawal.
  if (existing.providerUpdatedAt && incoming.observedAt?.getTime() === existing.providerUpdatedAt.getTime()
    && ['paused', 'unpaid'].includes(existing.status) && ['active', 'trialing', 'past_due'].includes(incoming.status)) return false
  return true
}
