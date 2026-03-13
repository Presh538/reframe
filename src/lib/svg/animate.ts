/**
 * SVG Animation Engine
 *
 * Pure functions that operate on SVGSVGElement. No React, no state —
 * just DOM manipulation. This makes it easy to unit-test and reuse
 * outside of the Next.js context (e.g. a future CLI export tool).
 */

import type { AnimParams } from '@/types'

// ── Selectors ─────────────────────────────────────────────────

const SHAPE_TAGS = ['path', 'circle', 'rect', 'ellipse', 'line', 'polyline', 'polygon']
const STROKE_TAGS = ['path', 'line', 'polyline', 'polygon', 'rect', 'circle', 'ellipse']

/**
 * Returns the elements to animate based on the scope param.
 * Falls back gracefully if the selected scope yields nothing.
 */
export function getTargets(el: SVGSVGElement, scope: AnimParams['scope']): SVGElement[] {
  let results: SVGElement[] = []

  if (scope === 'groups') {
    results = [...el.querySelectorAll<SVGElement>('g')]
  } else if (scope === 'paths') {
    results = [...el.querySelectorAll<SVGElement>(SHAPE_TAGS.join(','))]
  } else {
    // 'all' — prefer groups, fall back to individual shapes, then direct children
    results = [...el.querySelectorAll<SVGElement>('g')]
    if (!results.length) results = [...el.querySelectorAll<SVGElement>(SHAPE_TAGS.join(','))]
    if (!results.length) results = [...(el.children as HTMLCollectionOf<SVGElement>)]
  }

  return results.slice(0, 32) // Cap to avoid overwhelming the browser
}

/**
 * Returns stroke-able elements for draw-type presets.
 */
export function getStrokeTargets(el: SVGSVGElement, scope: AnimParams['scope']): SVGElement[] {
  const all = [...el.querySelectorAll<SVGElement>(STROKE_TAGS.join(','))]
  if (all.length) return all.slice(0, 32)
  return getTargets(el, scope)
}

/**
 * All animatable descendants, ordered by DOM position (for stagger effects).
 */
export function getAllTargets(el: SVGSVGElement): SVGElement[] {
  const results = [...el.querySelectorAll<SVGElement>(
    ['g', ...SHAPE_TAGS, 'text'].join(',')
  )]
  return results.length ? results.slice(0, 40) : [...(el.children as HTMLCollectionOf<SVGElement>)]
}

// ── CSS injection ─────────────────────────────────────────────

/**
 * Appends keyframe CSS to a shared <style data-rf> tag inside the SVG.
 * Idempotent — creates the tag if it doesn't exist.
 */
export function injectKeyframes(svgEl: SVGSVGElement, css: string): void {
  let styleEl = svgEl.querySelector<SVGStyleElement>('style[data-rf]')
  if (!styleEl) {
    styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style') as SVGStyleElement
    styleEl.setAttribute('data-rf', '1')
    svgEl.insertBefore(styleEl, svgEl.firstChild)
  }
  styleEl.textContent += css
}

// ── Element animation ─────────────────────────────────────────

/**
 * Applies a CSS animation string to an element and stores metadata
 * needed for frame-stepping during GIF export.
 */
export function animateElement(el: SVGElement, animation: string, origDelay = 0): void {
  el.style.animation = animation
  el.setAttribute('data-rf-anim', '1')
  // Store the delay so GIF exporter can step to arbitrary frames
  el.setAttribute('data-rf-delay', String(origDelay))
}

/**
 * Strips all reframe-injected animations and styles from an SVG element.
 * Handles both CSS-animation elements and SVG-native clipPath elements
 * (used by the Fill Reveal preset).
 */
export function clearAnimations(svgEl: SVGSVGElement): void {
  // Remove injected <style> tags
  svgEl.querySelectorAll('style[data-rf]').forEach(el => el.remove())

  // Remove SVG-native <clipPath> elements added by fill-reveal
  svgEl.querySelectorAll('clipPath[data-rf-clip]').forEach(el => el.remove())

  // Remove clip-path attribute from elements that had one applied
  svgEl.querySelectorAll('[data-rf-clipped]').forEach(el => {
    el.removeAttribute('clip-path')
    el.removeAttribute('data-rf-clipped')
  })

  // Clear animation styles from all animated elements (includes clip rects)
  svgEl.querySelectorAll<SVGElement>('[data-rf-anim]').forEach(el => {
    el.style.animation = ''
    el.style.strokeDasharray = ''
    el.style.strokeDashoffset = ''
    el.style.opacity = ''
    el.style.clipPath = ''
    el.removeAttribute('data-rf-anim')
    el.removeAttribute('data-rf-delay')
  })

  // Remove stroke / stroke-width that were injected by the Draw On preset
  svgEl.querySelectorAll('[data-rf-stroke-added]').forEach(el => {
    el.removeAttribute('stroke')
    el.removeAttribute('data-rf-stroke-added')
  })
  svgEl.querySelectorAll('[data-rf-sw-added]').forEach(el => {
    el.removeAttribute('stroke-width')
    el.removeAttribute('data-rf-sw-added')
  })
}

// ── SVG-native clipPath helpers ───────────────────────────────

/**
 * Creates a <clipPath> inside <defs> containing a <rect> that starts
 * at width=0 (fully hidden) and is meant to be animated to full width.
 *
 * Applies clip-path="url(#clipId)" to the target element.
 * Returns the <rect> so the caller can attach a CSS animation to it.
 *
 * Used by the Fill Reveal preset — more reliable than CSS inset() for
 * SVG fill paths because it respects the SVG user-unit coordinate system.
 */
export function injectClipRect(
  svgEl: SVGSVGElement,
  targetEl: SVGElement,
  clipId: string,
  svgWidth: number,
  svgHeight: number,
): SVGRectElement {
  // Ensure <defs> exists
  let defs = svgEl.querySelector('defs')
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    svgEl.insertBefore(defs, svgEl.firstChild)
  }

  // <clipPath>
  const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath')
  clipPath.id = clipId
  clipPath.setAttribute('data-rf-clip', '1')

  // <rect> — starts at width:0. Generously overshoots vertically so
  // descenders and ascenders are never clipped along the reveal axis.
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect') as SVGRectElement
  rect.setAttribute('x', String(-svgWidth * 0.05))   // slight left bleed
  rect.setAttribute('y', String(-svgHeight * 0.5))   // overshoot top
  rect.setAttribute('height', String(svgHeight * 2)) // overshoot bottom
  rect.setAttribute('width', '0')                    // starts fully hidden

  clipPath.appendChild(rect)
  defs.appendChild(clipPath)

  // Bind clip to target
  targetEl.setAttribute('clip-path', `url(#${clipId})`)
  targetEl.setAttribute('data-rf-clipped', '1')

  return rect
}

// ── Param helpers ─────────────────────────────────────────────

export function iterationCount(p: AnimParams): string {
  if (p.loop !== 'once') return 'infinite'
  // 'in-out' plays forward then backward in a single cycle — needs 2 iterations
  if (p.direction === 'in-out') return '2'
  return '1'
}

export function animationDirection(p: AnimParams): string {
  // bounce and in-out both use alternate (forward → backward)
  if (p.loop === 'bounce' || p.direction === 'in-out') return 'alternate'
  if (p.direction === 'out') return 'reverse'
  return 'normal'
}

// ── Path length ───────────────────────────────────────────────

/**
 * Returns the total length of a path-like element.
 * Falls back to geometric estimates for shapes.
 */
export function pathLength(el: SVGElement): number {
  try {
    if ('getTotalLength' in el && typeof (el as SVGGeometryElement).getTotalLength === 'function') {
      return (el as SVGGeometryElement).getTotalLength()
    }
  } catch (_) { /* swallow — some browsers throw on detached elements */ }

  const tag = el.tagName.toLowerCase()
  if (tag === 'rect') {
    const w = parseFloat(el.getAttribute('width') ?? '0')
    const h = parseFloat(el.getAttribute('height') ?? '0')
    return 2 * (w + h)
  }
  if (tag === 'circle') {
    const r = parseFloat(el.getAttribute('r') ?? '0')
    return 2 * Math.PI * r
  }
  if (tag === 'ellipse') {
    const rx = parseFloat(el.getAttribute('rx') ?? '0')
    const ry = parseFloat(el.getAttribute('ry') ?? '0')
    return Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)))
  }
  return 600 // Reasonable fallback
}

// ── Frame stepping (used by GIF exporter) ─────────────────────

/**
 * Freezes all animated elements at a specific time offset.
 * Uses the negative animation-delay trick: a delay of -t means
 * "the animation started t seconds ago", so the browser renders
 * the state at exactly time t.
 */
export function stepToTime(svgEl: SVGSVGElement, t: number): void {
  svgEl.querySelectorAll<SVGElement>('[data-rf-anim]').forEach(el => {
    const origDelay = parseFloat(el.getAttribute('data-rf-delay') ?? '0')
    const effective = t - origDelay

    if (effective < 0) {
      // Animation hasn't started yet — show pre-animation state
      el.style.animationDelay = '999s'
    } else {
      el.style.animationDelay = `-${effective.toFixed(4)}s`
    }
    el.style.animationPlayState = 'paused'
  })
}

/**
 * Restores animations to their natural running state.
 */
export function restorePlayback(svgEl: SVGSVGElement): void {
  svgEl.querySelectorAll<SVGElement>('[data-rf-anim]').forEach(el => {
    const origDelay = parseFloat(el.getAttribute('data-rf-delay') ?? '0')
    el.style.animationDelay = `${origDelay}s`
    el.style.animationPlayState = 'running'
  })
}
