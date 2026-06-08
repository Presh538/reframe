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
import { verifyShare, SHARE_TTL_DAYS } from '@/lib/share'
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
    images:      [{ url: 'https://firebasestorage.googleapis.com/v0/b/legacy-abdbc.firebasestorage.app/o/Reframeo%2FOG%20Image.png?alt=media&token=de48a637-e72f-4405-9e4d-f9c756854f5f', width: 1200, height: 630 }],
  },
}

// ── Page ──────────────────────────────────────────────────────────
interface Props {
  params: Promise<{ token: string }>
}

export default async function SharePreviewPage({ params }: Props) {
  const { token: id } = await params

  // Sanity check before hitting storage — share IDs are base64url only.
  // (verifyShare re-validates, but this avoids a needless Blob round-trip.)
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(id)) {
    return <PreviewCanvas svg={null} error="This share link is invalid." />
  }

  const result = await verifyShare(id)

  if (!result.ok) {
    const msg = result.reason === 'expired'
      ? `This share link has expired. Links are valid for ${SHARE_TTL_DAYS} days.`
      : 'This share link is invalid or no longer exists.'
    return <PreviewCanvas svg={null} error={msg} />
  }

  return <PreviewCanvas svg={result.svg} error={null} />
}
