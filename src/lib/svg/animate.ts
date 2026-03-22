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

// Tags that are non-visual and should never be animated
const NON_VISUAL_TAGS = new Set([
  'defs', 'style', 'title', 'desc', 'metadata', 'symbol',
  'lineargradient', 'radialgradient', 'pattern', 'filter',
  'mask', 'clippath', 'marker',
])

/**
 * Returns the first meaningful set of visual children, recursively
 * unwrapping single-wrapper <g> elements at any depth.
 *
 * Handles:
 *   1. Single wrapper <g> at any nesting depth (Figma / Illustrator / Inkscape).
 *      Keeps drilling until it finds ≥2 siblings or non-group children.
 *   2. Flat SVG (all paths at root, no groups): returns root-level shapes.
 *
 * Avoids the double-animation bug where parent <g> and its children both
 * received CSS animations, fighting each other.
 */
function resolveDirectTargets(el: Element, depth = 0): SVGElement[] {
  // Safety cap — prevents infinite recursion on pathological SVGs
  if (depth > 12) return []

  const direct = [...el.children].filter(
    c => !NON_VISUAL_TAGS.has(c.tagName.toLowerCase())
  ) as SVGElement[]

  if (direct.length === 0) return []

  // Single wrapper <g> — keep drilling deeper
  if (direct.length === 1 && direct[0].tagName.toLowerCase() === 'g') {
    const inner = resolveDirectTargets(direct[0], depth + 1)
    return inner.length > 0 ? inner : direct
  }

  return direct
}

/**
 * Resolves the first meaningful level of <g> elements, recursively
 * unwrapping single-wrapper <g> elements at any depth.
 *
 * Used by scope:'groups'. Keeps drilling through nested single wrappers
 * until it finds multiple <g> siblings or bottoms out.
 *
 * Filters out decorative overlay groups — <g opacity="0.33"> style elements
 * that are shadow/highlight effects, not independent animation layers.
 * Threshold is 0.5: anything semi-transparent or lower is treated as an overlay.
 */
function resolveGroupLevel(el: Element, depth = 0): SVGElement[] {
  // Safety cap
  if (depth > 12) return []

  const groups = [...el.children].filter(c => {
    if (c.tagName.toLowerCase() !== 'g') return false
    // Exclude decorative overlays — groups with opacity ≤ 0.5 are typically
    // shadow/highlight compositing layers, not independent visual layers.
    const opacity = parseFloat(c.getAttribute('opacity') ?? '1')
    return opacity > 0.5
  }) as SVGElement[]

  if (groups.length === 0) return []

  // Single wrapper — drill deeper
  if (groups.length === 1) {
    const deeper = resolveGroupLevel(groups[0], depth + 1)
    return deeper.length > 0 ? deeper : groups
  }

  return groups
}

/**
 * Returns true when the SVG has at least one meaningful <g> group
 * (opacity > 0.5, not a decorative overlay).  Callers use this to
 * surface a warning instead of silently falling back to a different scope.
 */
export function hasMeaningfulGroups(el: SVGSVGElement): boolean {
  return resolveGroupLevel(el).length > 0
}

/**
 * Returns the elements to animate based on the scope param.
 *
 * For scope:'groups' there is intentionally NO fallback — if the SVG has
 * no meaningful groups, an empty array is returned so the caller can surface
 * a clear message to the user rather than silently animating as 'all'.
 */
export function getTargets(el: SVGSVGElement, scope: AnimParams['scope']): SVGElement[] {
  let results: SVGElement[] = []

  if (scope === 'groups') {
    // Strict: respect the SVG's actual <g> structure.
    // Returns [] for flat SVGs — callers should check hasMeaningfulGroups first.
    results = resolveGroupLevel(el)
  } else if (scope === 'paths') {
    results = [...el.querySelectorAll<SVGElement>(SHAPE_TAGS.join(','))]
  } else {
    // 'all' — first meaningful level of visual children (paths + groups),
    // recursively unwrapping single-wrapper <g> elements. Handles both
    // flat SVGs and deeply-nested Figma/Illustrator exports correctly.
    results = resolveDirectTargets(el)
    if (!results.length) results = [...el.querySelectorAll<SVGElement>(SHAPE_TAGS.join(','))]
    if (!results.length) results = [...(el.children as HTMLCollectionOf<SVGElement>)]
  }

  return results.slice(0, 500) // Safety cap — prevents overwhelming the browser on pathological SVGs
}

/**
 * Returns stroke-able elements for draw-type presets.
 */
export function getStrokeTargets(el: SVGSVGElement, scope: AnimParams['scope']): SVGElement[] {
  const all = [...el.querySelectorAll<SVGElement>(STROKE_TAGS.join(','))]
  if (all.length) return all.slice(0, 500)
  return getTargets(el, scope)
}

/**
 * All animatable descendants, ordered by DOM position (for stagger effects).
 */
export function getAllTargets(el: SVGSVGElement): SVGElement[] {
  const results = [...el.querySelectorAll<SVGElement>(
    ['g', ...SHAPE_TAGS, 'text'].join(',')
  )]
  return results.length ? results.slice(0, 500) : [...(el.children as HTMLCollectionOf<SVGElement>)]
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
  el.setAttribute('data-rf-anim', animation)
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
  // JS-managed restart (see scheduleLoop in PreviewStage) plays the sequence
  // as a single CSS pass so all staggered elements restart in sync — no phase drift.
  if (p.loop === 'bounce') return '2'   // forward + backward = one clean bounce cycle
  if (p.loop === 'loop')   return '1'   // one forward pass; JS restarts after sequence ends
  // 'once' — 'in-out' needs 2 iterations (forward + reverse) within a single play
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

/**
 * Computes the total wall-clock duration of the staggered animation sequence
 * by finding the element with the latest end time: max(delay + duration).
 *
 * Used by the JS-managed loop restart in PreviewStage so all elements
 * restart together once the last element has finished — no phase drift.
 *
 * Returns milliseconds.
 */
export function computeSequenceDuration(svgEl: SVGSVGElement): number {
  let maxEnd = 0

  svgEl.querySelectorAll<SVGElement>('[data-rf-anim]').forEach(el => {
    const delay = parseFloat(el.getAttribute('data-rf-delay') ?? '0')
    // The animation shorthand is: "name duration timing delay count direction fill"
    // First <number>s value = duration, second = delay (already stored in data-rf-delay).
    const timeValues = el.style.animation.match(/(\d+\.?\d*)s/g) ?? []
    const dur = timeValues.length > 0 ? parseFloat(timeValues[0] as string) : 1
    maxEnd = Math.max(maxEnd, delay + dur)
  })

  // Minimum 100 ms to avoid tight spin if something goes wrong
  return Math.max(maxEnd * 1000, 100)
}
