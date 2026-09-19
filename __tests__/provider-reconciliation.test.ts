jest.mock('server-only', () => ({}))
const mockLocal = jest.fn(), mockState = jest.fn(), mockGet = jest.fn(), mockSync = jest.fn(), mockGrant = jest.fn()
jest.mock('@/lib/db/client', () => ({ getDatabase: () => ({ select: () => {
  const query = { from: () => query, where: () => query, limit: () => mockLocal() }
  return query
} }) }))
jest.mock('@/lib/billing/polar', () => ({ getPolarClient: () => ({
  customers: { getStateExternal: mockState }, subscriptions: { get: mockGet },
}) }))
jest.mock('@/lib/billing/fulfillment', () => ({
  syncSubscription: (...args: unknown[]) => mockSync(...args),
  grantSubscriptionPeriodCredits: (...args: unknown[]) => mockGrant(...args),
  subscriptionStateFromWebhook: (snapshot: { customer: { externalId: string }; status: string }) => ({ userId: snapshot.customer.externalId, status: snapshot.status }),
  UntrustedBillingEventError: class extends Error {},
}))
import { reconcileUserSubscriptions } from '@/lib/billing/provider-reconciliation'
beforeEach(() => {
  jest.clearAllMocks()
  mockLocal.mockResolvedValue([{ providerSubscriptionId: 'known-subscription' }])
  mockState.mockResolvedValue({ activeSubscriptions: [] })
  mockGet.mockResolvedValue({ customer: { externalId: 'caller' }, status: 'canceled' })
})
it('checks canonical status of locally active subscriptions missing from the active list', async () => {
  expect(await reconcileUserSubscriptions('caller')).toBe(1)
  expect(mockGet).toHaveBeenCalledWith({ id: 'known-subscription' }, { timeoutMs: 10000 })
  expect(mockSync).toHaveBeenCalledWith({ userId: 'caller', status: 'canceled' })
})
it('rejects provider responses for another user', async () => {
  mockGet.mockResolvedValue({ customer: { externalId: 'someone-else' }, status: 'active' })
  await expect(reconcileUserSubscriptions('caller')).rejects.toThrow(/ownership/i)
  expect(mockSync).not.toHaveBeenCalled()
})
it('does not interpret an upstream scope failure as a free account', async () => {
  mockState.mockRejectedValue(new Error('insufficient scope'))
  await expect(reconcileUserSubscriptions('caller')).rejects.toThrow()
  expect(mockSync).not.toHaveBeenCalled()
})
it('deduplicates IDs present in both local and provider state', async () => {
  mockState.mockResolvedValue({ activeSubscriptions: [{ id: 'known-subscription' }] })
  await reconcileUserSubscriptions('caller')
  expect(mockGet).toHaveBeenCalledTimes(1)
})
