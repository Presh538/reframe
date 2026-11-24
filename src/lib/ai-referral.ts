/**
 * Recognise visits that arrive from an AI assistant or answer engine.
 *
 * PostHog already records the raw referring domain, but AI traffic is split
 * across many hosts (chatgpt.com and chat.openai.com, gemini and bard...) and
 * some of it carries no referrer at all, only a utm_source tag (ChatGPT adds
 * utm_source=chatgpt.com to links it cites). This folds both signals into one
 * `ai_source` value, so AI-sourced visits can be counted and followed through
 * to export separately from Google traffic.
 */

export type AiSource =
  | 'chatgpt'
  | 'perplexity'
  | 'claude'
  | 'gemini'
  | 'copilot'
  | 'deepseek'
  | 'meta-ai'
  | 'grok'
  | 'you'
  | 'phind'
  | 'mistral'

/** Hostname (without a leading "www.") → source. Subdomains also match. */
const HOSTS: Record<string, AiSource> = {
  'chatgpt.com':           'chatgpt',
  'chat.openai.com':       'chatgpt',
  'openai.com':            'chatgpt',
  'perplexity.ai':         'perplexity',
  'claude.ai':             'claude',
  'gemini.google.com':     'gemini',
  'bard.google.com':       'gemini',
  'copilot.microsoft.com': 'copilot',
  'copilot.cloud.microsoft': 'copilot',
  'chat.deepseek.com':     'deepseek',
  'meta.ai':               'meta-ai',
  'grok.com':              'grok',
  'you.com':               'you',
  'phind.com':             'phind',
  'chat.mistral.ai':       'mistral',
}

function fromHost(host: string): AiSource | null {
  let h = host.toLowerCase().replace(/^www\./, '')
  // Walk up the labels so "labs.perplexity.ai" still matches "perplexity.ai".
  while (h.includes('.')) {
    if (HOSTS[h]) return HOSTS[h]
    h = h.slice(h.indexOf('.') + 1)
  }
  return null
}

/**
 * @param referrer `document.referrer` (may be empty)
 * @param search   `location.search`, used for utm_source when no referrer is sent
 */
export function detectAiSource(referrer: string, search: string): AiSource | null {
  if (referrer) {
    try {
      const source = fromHost(new URL(referrer).hostname)
      if (source) return source
    } catch {
      // Malformed referrer: fall through to utm_source.
    }
  }

  const utm = new URLSearchParams(search).get('utm_source')?.trim().toLowerCase()
  if (!utm) return null
  // utm_source is usually a host ("chatgpt.com") but sometimes a bare name.
  return fromHost(utm.includes('.') ? utm : `${utm}.com`)
    ?? (Object.values(HOSTS) as string[]).find(s => s === utm) as AiSource | undefined
    ?? null
}
