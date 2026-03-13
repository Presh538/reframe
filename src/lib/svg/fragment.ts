/**
 * SVG Fragment Utility
 *
 * Splits compound SVG elements into individually animatable pieces.
 * Two passes:
 *   1. Split compound <path> elements (multiple M commands) into separate paths
 *   2. Flatten single-wrapper <g> so each character/shape is a direct SVG child
 *
 * After fragmenting, the SVG has N direct <g> children — one per animatable element.
 * This gives fill-reveal, draw-on, and stagger presets clean per-element targets.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'
const META_TAGS = new Set(['defs', 'style', 'title', 'desc', 'symbol', 'marker', 'filter'])
const SHAPE_TAGS = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'use'])

export interface FragmentResult {
  svg: string
  count: number
}

/**
 * Returns the number of directly animatable top-level elements in the SVG source.
 * Useful for showing the current element count before fragmenting.
 */
export function countFragments(svgSource: string): number {
  try {
    const doc = new DOMParser().parseFromString(svgSource, 'image/svg+xml')
    const svg = doc.querySelector('svg')
    if (!svg) return 0
    return directAnimatables(svg).length
  } catch {
    return 0
  }
}

/**
 * Fragments the SVG into individually animatable elements.
 * Returns the new SVG markup and the element count.
 */
export function fragmentSvg(svgSource: string): FragmentResult {
  const doc = new DOMParser().parseFromString(svgSource, 'image/svg+xml')
  const svg = doc.querySelector('svg')
  if (!svg) return { svg: svgSource, count: 0 }

  // Pass 1 — split compound paths (multiple absolute M commands in one <path>)
  splitCompoundPaths(svg)

  // Pass 2 — unwrap a single top-level wrapper <g> so children become direct SVG children
  flattenSingleWrapper(svg)

  // Pass 3 — wrap any bare shape elements in a <g> so every direct child is a group
  wrapBareShapes(svg)

  const count = directAnimatables(svg).length

  return {
    svg: new XMLSerializer().serializeToString(svg),
    count,
  }
}

// ── Helpers ───────────────────────────────────────────────────

function splitCompoundPaths(svg: Element): void {
  // Clone list first — we'll mutate the DOM during iteration
  for (const path of [...svg.querySelectorAll('path')]) {
    const d = path.getAttribute('d') ?? ''
    const parts = splitPathD(d)
    if (parts.length <= 1) continue

    const parent = path.parentNode!
    for (const part of parts) {
      const np = path.cloneNode(false) as Element
      np.setAttribute('d', part)
      parent.insertBefore(np, path)
    }
    parent.removeChild(path)
  }
}

function flattenSingleWrapper(svg: Element): void {
  const direct = nonMetaChildren(svg)
  // Only unwrap if there is exactly one direct child and it's a <g>
  if (direct.length !== 1 || direct[0].tagName.toLowerCase() !== 'g') return

  const wrapper = direct[0]
  const children = [...wrapper.children]

  // Don't unwrap if the wrapper itself has transforms or styles applied —
  // those would be lost. Only unwrap clean wrappers.
  const hasTransform = wrapper.hasAttribute('transform')
  const hasStyle = wrapper.hasAttribute('style') || wrapper.hasAttribute('fill') || wrapper.hasAttribute('stroke')
  if (hasTransform || hasStyle) return

  for (const child of children) {
    svg.insertBefore(child, wrapper)
  }
  wrapper.remove()
}

function wrapBareShapes(svg: Element): void {
  for (const child of [...svg.children]) {
    const tag = child.tagName.toLowerCase()
    if (META_TAGS.has(tag) || tag === 'g') continue
    // It's a bare shape — wrap in <g>
    const g = document.createElementNS(SVG_NS, 'g')
    svg.insertBefore(g, child)
    g.appendChild(child)
  }
}

function nonMetaChildren(el: Element): Element[] {
  return [...el.children].filter(c => !META_TAGS.has(c.tagName.toLowerCase()))
}

function directAnimatables(svg: Element): Element[] {
  return nonMetaChildren(svg)
}

/**
 * Splits a path `d` attribute on uppercase M commands.
 * "M10,10 L20,20 M30,30 L40,40" → ["M10,10 L20,20", "M30,30 L40,40"]
 */
function splitPathD(d: string): string[] {
  const parts: string[] = []
  let buf = ''

  for (let i = 0; i < d.length; i++) {
    // Uppercase M (absolute moveto) that isn't the very first character = new subpath
    if (d[i] === 'M' && buf.trimStart()) {
      const trimmed = buf.trim()
      if (trimmed) parts.push(trimmed)
      buf = 'M'
    } else {
      buf += d[i]
    }
  }

  const last = buf.trim()
  if (last) parts.push(last)

  return parts.length > 0 ? parts : [d]
}
