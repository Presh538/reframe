import { hasPlaceholders, LEGAL } from '@/components/legal/legal-config'

describe('legal config', () => {
  it('reports every unfilled placeholder by name', () => {
    const expected = Object.entries(LEGAL).filter(([, v]) => v.includes('[[')).map(([k]) => k)
    expect(hasPlaceholders()).toEqual(expected)
  })

  it('points at the live site', () => {
    expect(LEGAL.site).toBe('https://reframeo.com')
  })
})
