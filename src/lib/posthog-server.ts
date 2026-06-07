import { PostHog } from 'posthog-node'

let client: PostHog | null = null

/**
 * Returns a PostHog server-side client, or null if the key is not configured.
 * All callers must handle the null case gracefully — analytics is non-critical.
 */
export function getPostHogClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return null

  if (!client) {
    client = new PostHog(key, {
      host:          process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      flushAt:       1,
      flushInterval: 0,
    })
  }
  return client
}
