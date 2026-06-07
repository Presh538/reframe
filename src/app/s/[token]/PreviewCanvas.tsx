'use client'

/**
 * PreviewCanvas — renders a sanitized animated SVG on a full-screen dark canvas.
 *
 * The SVG has already been HMAC-verified and server-sanitized by the page component.
 * We run DOMPurify here as a second pass (defense in depth) before touching the DOM.
 *
 * CSP note: inline <style> blocks inside SVG are required for CSS animations.
 * DOMPurify is configured to preserve them while stripping everything dangerous.
 */

import { useEffect, useRef } from 'react'
import DOMPurify             from 'dompurify'
import { trackSharePreviewViewed } from '@/lib/analytics'

const f: React.CSSProperties = { fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }

interface Props {
  svg:   string | null
  error: string | null
}

export function PreviewCanvas({ svg, error }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (svg) trackSharePreviewViewed()
  }, [svg])

  useEffect(() => {
    const container = containerRef.current
    if (!svg || !container) return

    // ── Client-side re-sanitization (DOMPurify) ───────────────────
    // ADD_TAGS: ['style']  — required for the injected <style data-rf> keyframes
    // FORBID_SCRIPTS: true — belt-and-suspenders; default but explicit here
    const clean = DOMPurify.sanitize(svg, {
      USE_PROFILES: { svg: true, svgFilters: true },
      ADD_TAGS:     ['style'],
      ADD_ATTR:     ['data-rf', 'data-rf-anim', 'data-rf-delay'],
      FORBID_TAGS:  ['script'],  // belt-and-suspenders; SVG profile already blocks it
    })

    const parser = new DOMParser()
    const doc    = parser.parseFromString(clean, 'image/svg+xml')
    const svgEl  = doc.documentElement

    // parseFromString returns an <html> wrapper on parse error
    if (svgEl.tagName.toLowerCase() !== 'svg') return

    // Fit to container, let CSS handle centering
    svgEl.removeAttribute('width')
    svgEl.removeAttribute('height')
    svgEl.style.cssText  = ''
    svgEl.style.width    = '100%'
    svgEl.style.height   = '100%'
    svgEl.style.maxWidth  = '100%'
    svgEl.style.maxHeight = '100%'
    svgEl.style.display  = 'block'
    svgEl.style.overflow = 'visible'

    container.replaceChildren(svgEl)
  }, [svg])

  return (
    <div
      style={{
        position:        'fixed',
        inset:           0,
        backgroundColor: '#0D0D0D',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1.5px, transparent 1.5px)',
        backgroundSize:  '27px 27px',
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        overflow:        'hidden',
      }}
    >
      {error ? (
        /* ── Error state ─────────────────────────────────────────── */
        <div style={{ textAlign: 'center', padding: '0 24px' }}>
          <p style={{ ...f, fontSize: 16, color: 'rgba(255,255,255,0.45)', margin: '0 0 20px', lineHeight: 1.5 }}>
            {error}
          </p>
          <a
            href="/"
            style={{
              ...f,
              display:      'inline-block',
              padding:      '10px 24px',
              borderRadius: 40,
              background:   '#D06523',
              color:        '#fff',
              fontSize:     14,
              fontWeight:   500,
              textDecoration: 'none',
              letterSpacing:  0.028,
            }}
          >
            Animate your own SVG →
          </a>
        </div>
      ) : (
        /* ── SVG canvas ──────────────────────────────────────────── */
        <>
          <div
            ref={containerRef}
            style={{
              width:          '100%',
              height:         '100%',
              maxWidth:       640,
              maxHeight:      640,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              padding:        48,
              boxSizing:      'border-box',
            }}
          />

          {/* ── Watermark ──────────────────────────────────────── */}
          <a
            href="/"
            style={{
              ...f,
              position:       'fixed',
              bottom:         24,
              left:           '50%',
              transform:      'translateX(-50%)',
              fontSize:       13,
              color:          'rgba(255,255,255,0.30)',
              textDecoration: 'none',
              letterSpacing:  0.028,
              whiteSpace:     'nowrap',
              transition:     'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.60)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.30)')}
          >
            Made with Reframe
          </a>
        </>
      )}
    </div>
  )
}
