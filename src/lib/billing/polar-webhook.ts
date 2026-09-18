import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks'
import { Webhook } from 'standardwebhooks'

/**
 * Compatibility adapter for SDK 0.47.x and Polar's September 2026 signing change.
 * Both schemes authenticate the exact raw body and enforce the five-minute
 * timestamp window. SDK schema validation still runs after authentication.
 */
export function validatePolarEvent(body: string, headers: Record<string, string>, secret: string) {
  try {
    return validateEvent(body, headers, secret)
  } catch (error) {
    // Never retry payload/schema failures as though they were signing failures.
    if (!(error instanceof WebhookVerificationError)) throw error
    if (!secret.startsWith('whsec_')) throw error
  }

  const standard = new Webhook(secret)
  standard.verify(body, headers)

  // The older SDK does not expose its event parser separately. ONLY after
  // authenticating the incoming signature, adapt it to the SDK's legacy key.
  // This local signature never leaves the process; the body is not modified.
  const legacy = new Webhook(Buffer.from(secret, 'utf8').toString('base64'))
  const timestamp = new Date(Number(headers['webhook-timestamp']) * 1000)
  return validateEvent(body, {
    ...headers,
    'webhook-signature': legacy.sign(headers['webhook-id'], timestamp, body),
  }, secret)
}
