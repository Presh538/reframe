/**
 * Origins this deployment legitimately serves from.
 *
 * The canonical domain, plus the deployment's own Vercel hostnames. Preview
 * deployments run with NODE_ENV=production but are served from *.vercel.app,
 * so the canonical domain alone would misclassify their own requests as
 * cross-origin. The Vercel values are the deployment's own hostnames, so
 * including them does not widen what is trusted.
 *
 * Shared by the proxy (origin enforcement) and checkout (redirect targets) so
 * the two can never disagree about what counts as "this app".
 */
export function allowedAppOrigins(): string[] {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
    process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`,
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
  ]

  const origins: string[] = []
  for (const value of candidates) {
    if (!value) continue
    try {
      const origin = new URL(value).origin
      if (!origins.includes(origin)) origins.push(origin)
    } catch { /* ignore malformed configuration */ }
  }
  return origins
}

/** True only when `origin` exactly matches an allowed origin after parsing. */
export function isAllowedAppOrigin(origin: string): boolean {
  try {
    return allowedAppOrigins().includes(new URL(origin).origin)
  } catch {
    return false
  }
}

/**
 * Where to send a user back after an off-site flow such as checkout.
 *
 * Uses the origin the request actually arrived on when that origin is one this
 * deployment serves, so a purchase started on a preview returns to that
 * preview. Anything else falls back to the canonical origin. The request's
 * Host is never trusted on its own, which would make this an open redirect.
 */
export function returnOriginFor(request: Request): string {
  const fallback = allowedAppOrigins()[0] ?? 'http://localhost:3000'
  try {
    const requestOrigin = new URL(request.url).origin
    return isAllowedAppOrigin(requestOrigin) ? requestOrigin : fallback
  } catch {
    return fallback
  }
}
