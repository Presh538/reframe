import { Webhook } from 'standardwebhooks'
import { validatePolarEvent } from '@/lib/billing/polar-webhook'

const secret = `whsec_${Buffer.alloc(32, 7).toString('base64')}`
const body = JSON.stringify({
  type: 'benefit.created', timestamp: '2026-09-18T02:00:00Z',
  data: {
    id: 'test-benefit', created_at: '2026-09-18T02:00:00Z', modified_at: null,
    type: 'custom', description: 'Test', selectable: true, deletable: true,
    is_deleted: false, organization_id: 'test-org', metadata: {}, properties: { note: null },
  },
})

function delivery(scheme: 'standard' | 'legacy', payload = body, offsetSeconds = 0) {
  const timestamp = new Date(Math.floor(Date.now() / 1000) * 1000 + offsetSeconds * 1000)
  const signer = new Webhook(scheme === 'standard' ? secret : Buffer.from(secret).toString('base64'))
  return {
    'webhook-id': 'test-event',
    'webhook-timestamp': String(Math.floor(timestamp.getTime() / 1000)),
    'webhook-signature': signer.sign('test-event', timestamp, payload),
  }
}

describe('Polar signing compatibility (real SDK and Standard Webhooks)', () => {
  it.each(['subscription.cycled', 'subscription.paused', 'subscription.resumed', 'subscription.migrated'])('authenticates %s before normalizing its parser alias', type => {
    const aliasBody = JSON.stringify({ type, timestamp: '2026-09-18T02:00:00Z', data: {} })
    try {
      validatePolarEvent(aliasBody, delivery('standard', aliasBody), secret)
      throw new Error('Expected SDK schema rejection')
    } catch (error) {
      expect(error).toHaveProperty('name', 'SDKValidationError')
      expect(error).toHaveProperty('rawValue.type', 'subscription.updated')
    }
    const altered = aliasBody.replace(type, 'subscription.updated')
    expect(() => validatePolarEvent(altered, delivery('standard', aliasBody), secret)).toThrow(/signature/i)
  })
  it.each(['standard', 'legacy'] as const)('accepts %s and retains SDK date/field transformations', scheme => {
    const event = validatePolarEvent(body, delivery(scheme), secret)
    expect(event.type).toBe('benefit.created')
    expect(event.timestamp).toBeInstanceOf(Date)
    expect(event.data).toHaveProperty('createdAt', new Date('2026-09-18T02:00:00Z'))
  })

  it.each(['standard', 'legacy'] as const)('rejects altered bodies under %s', scheme => {
    expect(() => validatePolarEvent(body.replace('Test', 'Forged'), delivery(scheme), secret)).toThrow()
  })

  it('rejects a different secret', () => {
    expect(() => validatePolarEvent(body, delivery('standard'), `whsec_${Buffer.alloc(32, 8).toString('base64')}`)).toThrow()
  })

  it.each([-360, 360])('rejects timestamps outside tolerance (%s seconds)', offset => {
    expect(() => validatePolarEvent(body, delivery('standard', body, offset), secret)).toThrow(/timestamp/i)
  })

  it('rejects missing signature headers', () => {
    const headers = delivery('standard')
    headers['webhook-signature'] = ''
    expect(() => validatePolarEvent(body, headers, secret)).toThrow()
  })

  it('rejects an altered event identifier', () => {
    expect(() => validatePolarEvent(body, { ...delivery('standard'), 'webhook-id': 'forged' }, secret)).toThrow()
  })

  it.each(['standard', 'legacy'] as const)('rejects authenticated but malformed payloads under %s', scheme => {
    const malformed = JSON.stringify({ type: 'order.paid', data: {} })
    expect(() => validatePolarEvent(malformed, delivery(scheme, malformed), secret)).toThrow(/parse/i)
  })
})
