/**
 * SVG Sanitization — client-side layer
 *
 * DOMPurify runs in the browser. The server-side API route
 * (/api/validate-svg) provides a second, independent pass
 * using regex + XML parsing so malicious SVGs can't slip
 * through even if a user bypasses the client.
 */

import type { SvgLayerInfo } from '@/types'

// ── DOMPurify (client-only) ───────────────────────────────────

/**
 * Sanitizes an SVG string using DOMPurify.
 * Must only be called in the browser.
 */
export async function sanitizeSvgClient(raw: string): Promise<string> {
  // Dynamic import keeps DOMPurify out of the server bundle
  const DOMPurify = (await import('dompurify')).default

  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { svg: true, svgFilters: true },
    // Remove elements that have no place in a display SVG
    FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'embed', 'object', 'link'],
    // Strip all event handlers and javascript: URIs
    FORBID_ATTR: [
      'onload', 'onclick', 'onerror', 'onmouseover', 'onmouseout',
      'onfocus', 'onblur', 'onkeydown', 'onkeyup', 'onkeypress',
      'onsubmit', 'onreset', 'onchange', 'oninput', 'onabort',
      'onscroll', 'onwheel',
    ],
  })
}

// ── File validation ───────────────────────────────────────────

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB

export interface FileValidationResult {
  ok: boolean
  error?: string
}

export function validateSvgFile(file: File): FileValidationResult {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: `File too large (max 2 MB, got ${(file.size / 1024).toFixed(0)} KB)` }
  }

  const isSvgMime = file.type === 'image/svg+xml'
  const isSvgExt = file.name.toLowerCase().endsWith('.svg')

  if (!isSvgMime && !isSvgExt) {
    return { ok: false, error: 'File must be an SVG (.svg)' }
  }

  return { ok: true }
}

// ── Layer extraction ──────────────────────────────────────────

/**
 * Parses layer metadata from a live SVG element.
 * Call after the SVG has been injected into the DOM so
 * viewBox dimensions are accessible.
 */
export function extractLayerInfo(svgEl: SVGSVGElement): SvgLayerInfo {
  const vb = svgEl.viewBox?.baseVal
  return {
    groups: svgEl.querySelectorAll('g').length,
    paths: svgEl.querySelectorAll('path').length,
    shapes: svgEl.querySelectorAll('circle,rect,ellipse,line,polyline,polygon').length,
    total: svgEl.querySelectorAll('*').length,
    hasText: svgEl.querySelector('text') !== null,
    viewBox: {
      width: vb?.width ?? parseFloat(svgEl.getAttribute('width') ?? '400'),
      height: vb?.height ?? parseFloat(svgEl.getAttribute('height') ?? '400'),
    },
  }
}

// ── SVG normalisation ─────────────────────────────────────────

/**
 * Ensures the SVG element has a viewBox and strips fixed dimensions
 * so it scales correctly inside the preview container.
 */
export function normalizeSvgElement(svgEl: SVGSVGElement): void {
  if (!svgEl.getAttribute('viewBox')) {
    const w = svgEl.getAttribute('width') ?? '100'
    const h = svgEl.getAttribute('height') ?? '100'
    svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`)
  }
  svgEl.removeAttribute('width')
  svgEl.removeAttribute('height')
  svgEl.style.cssText = 'max-width:100%;max-height:100%;display:block'
}
