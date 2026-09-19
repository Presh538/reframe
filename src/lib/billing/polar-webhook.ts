import { validateEvent } from '@polar-sh/sdk/webhooks'
import { Webhook, WebhookVerificationError } from 'standardwebhooks'

/**
 * Compatibility adapter for SDK 0.47.x and Polar's September 2026 signing change.
 * Both schemes authenticate the exact raw body and enforce the five-minute
 * timestamp window. SDK schema validation still runs after authentication.
 */
export function validatePolarEvent(body: string, headers: Record<string, string>, secret: string) {
  const legacy = new Webhook(Buffer.from(secret, 'utf8').toString('base64'))
  try {
    legacy.verify(body, headers)
  } catch (error) {
    // Never retry payload/schema failures as though they were signing failures.
    if (!(error instanceof WebhookVerificationError)) throw error
    if (!secret.startsWith('whsec_')) throw error
    new Webhook(secret).verify(body, headers)
  }

  // The older SDK does not expose its event parser separately. ONLY after
  // authenticating the incoming signature, adapt it to the SDK's legacy key.
  // This local signature never leaves the process. Incoming bytes are always
  // authenticated before any parser-only lifecycle alias normalization.
  const parsed = JSON.parse(body) as { type?: string }
  // Newer lifecycle aliases share the subscription.updated payload. Authenticate
  // ORIGINAL bytes first, then reuse the generated schema, including open status enums.
  const aliases = ['subscription.cycled', 'subscription.paused', 'subscription.resumed', 'subscription.migrated']
  const parserBody = aliases.includes(parsed.type ?? '') ? JSON.stringify({ ...parsed, type: 'subscription.updated' }) : body
  const timestamp = new Date(Number(headers['webhook-timestamp']) * 1000)
  return validateEvent(parserBody, {
    ...headers,
    'webhook-signature': legacy.sign(headers['webhook-id'], timestamp, parserBody),
  }, secret)
}
