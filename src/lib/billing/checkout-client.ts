/**
 * Client-side checkout entry point, shared by the billing panel and the
 * upgrade modal so the two can never drift on validation or idempotency.
 */

/**
 * Checkout and portal URLs come from our own API, but are still checked before
 * navigating: an https URL on Polar's domain only. Subdomains are accepted so
 * production checkout works whichever Polar host it is served from.
 */
export function trustedPolarUrl(raw: unknown): string {
  const url = new URL(String(raw))
  const polarHost = url.hostname === 'polar.sh' || url.hostname.endsWith('.polar.sh')
  if (url.protocol !== 'https:' || !polarHost) throw new Error('Invalid billing destination.')
  return url.toString()
}

/**
 * Opens Polar checkout for a product. Throws a customer-readable Error on
 * failure; callers surface the message and stay on the page.
 */
export async function startCheckout(productKey: string): Promise<never | void> {
  const response = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // One key per click: a double-submit reuses the same checkout.
    body: JSON.stringify({ productKey, idempotencyKey: crypto.randomUUID() }),
  })
  const body = await response.json().catch(() => ({}))
  // 409 carries a customer-readable reason (e.g. already subscribed).
  if (!response.ok) throw new Error(body.error ?? 'We couldn’t start checkout. Please try again.')
  window.location.assign(trustedPolarUrl(body.checkoutUrl))
}
