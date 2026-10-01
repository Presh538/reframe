jest.mock('server-only', () => ({}))
import { exportFeedback } from '@/lib/billing/export-credit-client'

it('tells a paying export what it cost', () => {
  expect(exportFeedback({ watermark: false, operationId: 'op-1' })).toEqual({
    message: 'Exported watermark-free — 1 credit used', type: 'success',
  })
})
it('explains the watermark rather than leaving it unexplained', () => {
  const note = exportFeedback({ watermark: true, operationId: null })
  expect(note?.type).toBe('info')
  expect(note?.message).toMatch(/watermark/i)
})
it('says nothing to Pro, who paid not to think about it', () => {
  expect(exportFeedback({ watermark: false, operationId: null })).toBeNull()
})
