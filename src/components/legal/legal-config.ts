/**
 * Facts the legal pages state about the operator. Anything still wrapped in
 * [[ ]] is a placeholder. A production build refuses to proceed while any
 * remain (see the guard at the bottom), so an unfinished policy can't ship --
 * while local development, tests and preview deployments keep working.
 */
export const LEGAL = {
  product: 'Reframe',
  site: 'https://reframeo.com',
  /** The person or company legally responsible for the service. */
  operator: '[[OPERATOR LEGAL NAME]]',
  /** Where privacy and support requests should go. */
  contactEmail: '[[CONTACT EMAIL]]',
  /** Law and courts that govern the Terms. */
  governingLaw: '[[COUNTRY / STATE]]',
  effectiveDate: '[[EFFECTIVE DATE]]',
} as const

export function hasPlaceholders(): string[] {
  return Object.entries(LEGAL)
    .filter(([, value]) => value.includes('[['))
    .map(([key]) => key)
}

// Production deployments only: previews and local builds may carry placeholders
// while the operator details are being decided.
if (process.env.VERCEL_ENV === 'production') {
  const missing = hasPlaceholders()
  if (missing.length > 0) {
    throw new Error(`Legal pages have unfilled placeholders: ${missing.join(', ')} (src/components/legal/legal-config.ts)`)
  }
}
