/**
 * Social preview for a shared animation.
 *
 * Every shared link is a place someone else meets the product, and the preview
 * was the generic logo card — so a link proved nothing about what Reframe does.
 * This renders the shared artwork itself on the brand surface, which makes the
 * share loop self-demonstrating.
 *
 * The frame is static: satori rasterises a single state, it does not run SMIL
 * or CSS animation. That is the point of the still — it shows the artwork, and
 * the page behind the link shows it moving.
 */

import { ImageResponse } from 'next/og'
import { verifyShare } from '@/lib/share'

export const runtime = 'nodejs'
export const alt = 'Animation created with Reframe'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Brand surface, matching the editor chrome rather than the CSS tokens: the
// editor is what the screenshot in someone's feed will be compared against.
const BG = '#0D0D0D'
const SURFACE = '#141414'
const ACCENT = '#D06523'
const BORDER = 'rgba(255,255,255,0.08)'

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  let artwork: string | null = null
  try {
    const share = await verifyShare(token)
    if (share.ok) {
      // satori embeds SVG through <img>, not as markup. A data URI keeps it to
      // one self-contained document with no extra fetch.
      artwork = `data:image/svg+xml;base64,${Buffer.from(share.svg, 'utf8').toString('base64')}`
    }
  } catch {
    // An expired or unreadable link still gets a branded card rather than a
    // broken preview.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: BG,
          padding: 56,
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 28,
            overflow: 'hidden',
          }}
        >
          {artwork ? (
            // Contained, never cropped: the artwork is the subject.
            <img src={artwork} width={520} height={380} style={{ objectFit: 'contain' }} alt="" />
          ) : (
            <div style={{ display: 'flex', fontSize: 30, color: '#888' }}>Animation preview</div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 32,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 34, fontWeight: 600, color: '#fff' }}>
              Animated with Reframe
            </div>
            <div style={{ display: 'flex', fontSize: 24, color: '#8A8A8F', marginTop: 8 }}>
              Turn static SVGs into motion — free, in your browser
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: ACCENT,
              color: '#fff',
              fontSize: 24,
              fontWeight: 600,
              padding: '14px 26px',
              borderRadius: 999,
            }}
          >
            reframeo.com
          </div>
        </div>
      </div>
    ),
    size,
  )
}
