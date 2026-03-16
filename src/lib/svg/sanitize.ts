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

// Pro tier limits — hidden until billing is live. Re-enable FREE_MAX_BYTES check when ready.
// const FREE_MAX_BYTES = 10 * 1024 * 1024   // 10 MB — free tier
const PRO_MAX_BYTES  = 50 * 1024 * 1024   // 50 MB — hard cap (pro tier, TODO: enforce server-side)

export interface FileValidationResult {
  ok: boolean
  error?: string
  /** True when the file is valid but requires a Pro plan to process */
  requiresPro?: boolean
}

export function validateSvgFile(file: File): FileValidationResult {
  if (file.size > PRO_MAX_BYTES) {
    return { ok: false, error: `File too large (max 50 MB). Got ${(file.size / 1024 / 1024).toFixed(1)} MB.` }
  }
  // Pro gate hidden — re-enable when billing is live:
  // if (file.size > FREE_MAX_BYTES) {
  //   return { ok: false, requiresPro: true, error: `Files over 10 MB require a Pro plan.` }
  // }

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
 * Ensures the SVG element has a valid viewBox, strips fixed dimensions,
 * normalises xlink:href → href on <use> elements, and scopes CSS class
 * names to prevent collisions between loaded files and page styles.
 */
export function normalizeSvgElement(svgEl: SVGSVGElement): void {
  // 1. Build a valid numeric viewBox when one is absent
  if (!svgEl.getAttribute('viewBox')) {
    const w = svgEl.getAttribute('width')  ?? ''
    const h = svgEl.getAttribute('height') ?? ''
    // parseFloat strips units (px, em, %) and falls back to 400 if not numeric
    const vw = parseFloat(w) || 400
    const vh = parseFloat(h) || 400
    svgEl.setAttribute('viewBox', `0 0 ${vw} ${vh}`)
  }

  // 2. Remove fixed dimensions — the container CSS handles sizing.
  //    We set aspect-ratio from the viewBox so that when max-height kicks in,
  //    CSS automatically reduces the width proportionally (letterbox/pillarbox).
  //    Without aspect-ratio, max-height only clips vertically — causing the
  //    bottom of tall SVGs to be cut off inside the padded preview container.
  svgEl.removeAttribute('width')
  svgEl.removeAttribute('height')
  const vbParts = svgEl.getAttribute('viewBox')?.trim().split(/[\s,]+/) ?? []
  const vbW = parseFloat(vbParts[2] ?? '') || 1
  const vbH = parseFloat(vbParts[3] ?? '') || 1
  svgEl.style.cssText = `width:100%;max-width:100%;max-height:100%;aspect-ratio:${vbW}/${vbH};display:block`

  // 3. xlink:href → href on <use> elements so older Illustrator/Figma exports resolve
  const XLINK = 'http://www.w3.org/1999/xlink'
  svgEl.querySelectorAll('use').forEach(useEl => {
    const xlink = useEl.getAttributeNS(XLINK, 'href')
    if (xlink && !useEl.getAttribute('href')) {
      useEl.setAttribute('href', xlink)
    }
    useEl.removeAttributeNS(XLINK, 'href')
  })

  // 4. Scope CSS class names to this SVG so .cls-1, .st0 etc. don't collide
  //    with page styles or with a previously-loaded SVG's style block.
  scopeSvgStyles(svgEl)
}

/**
 * Prefixes every CSS class name in the SVG's <style> blocks and on every
 * element's class attribute with a random per-render unique token.
 * This prevents style bleed between SVGs and from page-level stylesheets.
 */
function scopeSvgStyles(svgEl: SVGSVGElement): void {
  const styleEls = svgEl.querySelectorAll('style')
  if (styleEls.length === 0) return

  // Collect all class names that appear on SVG elements
  const usedClasses = new Set<string>()
  svgEl.querySelectorAll('[class]').forEach(el => {
    const raw = el instanceof SVGElement
      ? (el.className as SVGAnimatedString).baseVal
      : el.getAttribute('class') ?? ''
    raw.split(/\s+/).filter(Boolean).forEach(c => usedClasses.add(c))
  })

  if (usedClasses.size === 0) return

  const uid = `rf${Math.random().toString(36).slice(2, 8)}`
  const classMap = new Map<string, string>()
  usedClasses.forEach(c => classMap.set(c, `${uid}-${c}`))

  // Rewrite class names in every <style> block
  styleEls.forEach(styleEl => {
    let text = styleEl.textContent ?? ''
    classMap.forEach((newName, oldName) => {
      // Match .classname as a whole word (not part of another class)
      text = text.replace(new RegExp(`\\.${CSS.escape(oldName)}(?=[\\s,{:#.\\[>+~)]|$)`, 'g'), `.${newName}`)
    })
    styleEl.textContent = text
  })

  // Rewrite class attributes on all elements
  svgEl.querySelectorAll('[class]').forEach(el => {
    if (el instanceof SVGElement) {
      const anim = el.className as SVGAnimatedString
      anim.baseVal = anim.baseVal.split(/\s+/).map(c => classMap.get(c) ?? c).join(' ')
    } else {
      const cur = el.getAttribute('class') ?? ''
      el.setAttribute('class', cur.split(/\s+/).map(c => classMap.get(c) ?? c).join(' '))
    }
  })
}
