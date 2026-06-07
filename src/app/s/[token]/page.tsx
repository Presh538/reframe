/**
 * /s/[token] — Shareable animation preview page.
 *
 * Server component: verifies the HMAC token and decompresses the SVG.
 * Passes the sanitized SVG to PreviewCanvas (client) for DOMPurify re-sanitization
 * and animated rendering. Two-pass sanitization = defense in depth.
 *
 * Security headers (X-Frame-Options, CSP) are set in next.config to
 * ensure they apply at the CDN layer. The page itself is noindex.
 */

import type { Metadata } from 'next'
import { verifyShareToken, SHARE_TTL_DAYS } from '@/lib/share'
import { PreviewCanvas }                    from './PreviewCanvas'

const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://reframeo.com'
const APP_NAME = 'Reframe'

// ── Metadata ──────────────────────────────────────────────────────
export const metadata: Metadata = {
  title:       `Animation Preview — ${APP_NAME}`,
  description: `View an animation created with ${APP_NAME}. Links expire after ${SHARE_TTL_DAYS} days.`,
  robots:      { index: false, follow: false },
  openGraph: {
    title:       `Animation Preview — ${APP_NAME}`,
    description: `Created with ${APP_NAME} — the free SVG animator.`,
    url:         APP_URL,
    images:      [{ url: `${APP_URL}/og-image.png`, width: 1200, height: 630 }],
  },
}

// ── Page ──────────────────────────────────────────────────────────
interface Props {
  params: Promise<{ token: string }>
}

export default async function SharePreviewPage({ params }: Props) {
  const { token } = await params

  // Basic sanity check before hitting crypto — token must only contain
  // base64url chars (A-Za-z0-9-_) and exactly two dots (our separators).
  const VALID_TOKEN_RE = /^[A-Za-z0-9\-_]+\.[0-9]+\.[A-Za-z0-9\-_]+$/
  if (!VALID_TOKEN_RE.test(token)) {
    return <PreviewCanvas svg={null} error="This share link is invalid." />
  }

  const result = await verifyShareToken(token)

  if (!result.ok) {
    const msg = result.reason === 'expired'
      ? `This share link has expired. Links are valid for ${SHARE_TTL_DAYS} days.`
      : 'This share link is invalid or has been tampered with.'
    return <PreviewCanvas svg={null} error={msg} />
  }

  return <PreviewCanvas svg={result.svg} error={null} />
}
