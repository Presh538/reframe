jest.mock('server-only', () => ({}))
const mockUser = jest.fn()
const mockDatabase = jest.fn()
jest.mock('@/lib/auth/current-user', () => ({ getCurrentAppUser: (...args: unknown[]) => mockUser(...args) }))
jest.mock('@/lib/db/client', () => ({ getDatabase: () => mockDatabase() }))

import { NextRequest } from 'next/server'
import { PgDialect } from 'drizzle-orm/pg-core'
import { GET } from '@/app/api/billing/status/route'

describe('private billing status', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('requires authentication before querying billing data', async () => {
    mockUser.mockResolvedValue(null)
    const response = await GET(new NextRequest('https://reframeo.com/api/billing/status'))
    expect(response.status).toBe(401)
    expect(response.headers.get('Cache-Control')).toContain('no-store')
    expect(mockDatabase).not.toHaveBeenCalled()
  })

  it('rejects invalid checkout references', async () => {
    mockUser.mockResolvedValue({ id: 'caller-uuid' })
    const response = await GET(new NextRequest('https://reframeo.com/api/billing/status?checkout_id=%3Cscript%3E'))
    expect(response.status).toBe(400)
    expect(mockDatabase).not.toHaveBeenCalled()
  })

  it('scopes every query to the caller and does not trust a success URL', async () => {
    mockUser.mockResolvedValue({ id: 'caller-uuid' })
    const conditions: unknown[][] = []
    const dialect = new PgDialect()
    mockDatabase.mockReturnValue({ select: () => {
      const query = {
        from: () => query,
        where: (condition: Parameters<PgDialect['sqlToQuery']>[0]) => {
          conditions.push(dialect.sqlToQuery(condition).params)
          return query
        },
        orderBy: () => query,
        limit: () => Promise.resolve([]),
      }
      return query
    } })
    const response = await GET(new NextRequest('https://reframeo.com/api/billing/status?billing=success&checkout_id=someone-elses-checkout'))
    expect(response.status).toBe(200)
    expect(conditions).toHaveLength(5)
    for (const params of conditions) expect(params).toContain('caller-uuid')
    expect(conditions[4]).toContain('someone-elses-checkout')
    expect(await response.json()).toMatchObject({ plan: 'free', checkout: { status: 'unknown' }, credits: { available: 0 } })
  })

  it('returns a generic failure without leaking database details', async () => {
    mockUser.mockRejectedValue(new Error('private connection details'))
    const response = await GET(new NextRequest('https://reframeo.com/api/billing/status'))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'Billing status temporarily unavailable' })
  })
})
