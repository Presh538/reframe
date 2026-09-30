jest.mock('server-only', () => ({}))
import { estimateCostMicros, AI_ANIMATE_MODEL } from '@/lib/billing/ai-pricing'

it('prices a Haiku generation at published rates', () => {
  // 1M in + 1M out on Haiku 4.5 = $1.00 + $5.00 = $6.00 = 6,000,000 micros
  expect(estimateCostMicros('claude-haiku-4-5', 1_000_000, 1_000_000)).toBe(6_000_000)
  // A realistic call: 4k in, 1k out = $0.004 + $0.005 = $0.009 = 9,000 micros
  expect(estimateCostMicros('claude-haiku-4-5', 4_000, 1_000)).toBe(9_000)
})
it('returns undefined rather than a free-looking zero when it cannot price', () => {
  expect(estimateCostMicros('some-unknown-model', 4_000, 1_000)).toBeUndefined()
  expect(estimateCostMicros('claude-haiku-4-5', undefined, undefined)).toBeUndefined()
})
it('prices the model the route actually calls', () => {
  expect(estimateCostMicros(AI_ANIMATE_MODEL, 1_000_000, 0)).toBe(1_000_000)
})
