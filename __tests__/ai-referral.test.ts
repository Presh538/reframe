import { detectAiSource } from '@/lib/ai-referral'

describe('detectAiSource', () => {
  it.each([
    ['https://chatgpt.com/', 'chatgpt'],
    ['https://chat.openai.com/c/123', 'chatgpt'],
    ['https://www.perplexity.ai/search?q=svg', 'perplexity'],
    ['https://claude.ai/chat/abc', 'claude'],
    ['https://gemini.google.com/app', 'gemini'],
    ['https://copilot.microsoft.com/', 'copilot'],
  ])('reads the referrer %s', (ref, expected) => {
    expect(detectAiSource(ref, '')).toBe(expected)
  })

  it('falls back to utm_source when no referrer is sent', () => {
    expect(detectAiSource('', '?utm_source=chatgpt.com')).toBe('chatgpt')
    expect(detectAiSource('', '?utm_source=perplexity')).toBe('perplexity')
    expect(detectAiSource('', '?utm_source=Claude')).toBe('claude')
  })

  it('ignores ordinary search and social traffic', () => {
    expect(detectAiSource('https://www.google.com/', '')).toBeNull()
    expect(detectAiSource('https://www.bing.com/search?q=x', '')).toBeNull()
    expect(detectAiSource('https://x.com/', '?utm_source=newsletter')).toBeNull()
    expect(detectAiSource('', '')).toBeNull()
  })

  it('does not match look-alike hosts', () => {
    expect(detectAiSource('https://notchatgpt.com/', '')).toBeNull()
    expect(detectAiSource('https://claude.ai.evil.example/', '')).toBeNull()
  })

  it('survives a malformed referrer', () => {
    expect(detectAiSource('not a url', '?utm_source=gemini')).toBe('gemini')
  })
})
