/**
 * Social preview card for a landing page.
 *
 * Every landing page used to share the generic og-image.jpg, so a link to
 * "SVG to Lottie" looked identical to a link to the homepage in a feed or a
 * chat. Each page now gets a card with its own headline, on the editor's
 * surface (dark ground, dot grid, orange accent), rendered once at build time.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import type { LandingConfig } from './Landing'

const BG = '#0D0D0D'
const ACCENT = '#D06523'
const MUTED = '#8A8A8A'

// Embedded as a data URI: satori renders SVG through <img>, and reading the
// file at build time keeps the card free of network fetches.
const LOGO = `data:image/svg+xml;base64,${readFileSync(join(process.cwd(), 'public/favicon-white.svg')).toString('base64')}`

export function renderLandingOg(c: Pick<LandingConfig, 'eyebrow' | 'h1'>) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: BG,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.09) 1.5px, transparent 1.5px)',
          backgroundSize: '28px 28px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 26, fontWeight: 600, color: ACCENT, letterSpacing: 2, textTransform: 'uppercase' }}>
            {c.eyebrow}
          </div>
          <div style={{ marginTop: 24, fontSize: 68, fontWeight: 700, lineHeight: 1.1, color: '#FFFFFF', maxWidth: 980 }}>
            {c.h1}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- satori only renders <img> */}
            <img src={LOGO} width={44} height={44} alt="" />
            <div style={{ marginLeft: 16, fontSize: 34, fontWeight: 600, color: '#FFFFFF' }}>Reframe</div>
          </div>
          <div style={{ fontSize: 26, color: MUTED }}>Free AI SVG animator · reframeo.com</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
