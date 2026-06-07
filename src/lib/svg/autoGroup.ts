/**
 * autoGroup.ts — Smart SVG Layer Grouper
 *
 * Analyses a flat SVG (no meaningful <g> structure) and wraps
 * elements into spatial clusters, creating animation-ready groups.
 *
 * Algorithm:
 *   1. Get getBBox() centroid for every direct animatable child
 *   2. Look for natural Y gaps (horizontal bands) → group by row
 *   3. Fall back to X gaps (vertical bands) → group by column
 *   4. Last resort: equal 3-way Y split
 *   5. Wrap each cluster in <g data-rf-group="n">
 *
 * Designed to work on the live DOM (getBBox requires a rendered element).
 * Returns null when the SVG already has meaningful groups (no-op).
 */

import { hasMeaningfulGroups } from './animate'

const SVG_NS = 'http://www.w3.org/2000/svg'

const NON_VISUAL_TAGS = new Set([
  'defs', 'style', 'title', 'desc', 'metadata', 'symbol',
  'lineargradient', 'radialgradient', 'pattern', 'filter',
  'mask', 'clippath', 'marker',
])

/** Minimum elements before grouping is attempted */
const MIN_ELEMENTS = 3
/** Minimum groups produced before the result is considered useful */
const MIN_GROUPS = 2
/** Maximum groups — beyond this, animations get too noisy */
const MAX_GROUPS = 6
/**
 * Gap threshold: a centroid gap wider than this fraction of the total
 * axis range is treated as a band boundary.
 * 0.12 catches dense grids (e.g. pixel-art logos) as well as loose layouts.
 */
const GAP_FRACTION = 0.12

export interface AutoGroupResult {
  svg: string
  groupCount: number
}

type Item = { el: SVGElement; cx: number; cy: number }

// ── Public API ────────────────────────────────────────────────

/**
 * Runs smart auto-grouping on a live (DOM-mounted) SVGSVGElement.
 * Mutates the element in-place and returns the serialised SVG + group count.
 * Returns null when:
 *   • The SVG already has meaningful <g> groups  (no-op)
 *   • Too few elements to cluster meaningfully
 *   • getBBox() is unavailable (server-side render guard)
 */
export function autoGroupSvg(svgEl: SVGSVGElement): AutoGroupResult | null {
  // Already has structure — don't touch it
  if (hasMeaningfulGroups(svgEl)) return null

  // ── Collect direct animatable children with bounding boxes ────
  const children = [...svgEl.children].filter(
    c => !NON_VISUAL_TAGS.has(c.tagName.toLowerCase())
  ) as SVGElement[]

  if (children.length < MIN_ELEMENTS) return null

  const items: Item[] = []
  for (const el of children) {
    try {
      const bb = (el as SVGGraphicsElement).getBBox?.()
      if (bb && (bb.width > 0 || bb.height > 0)) {
        items.push({ el, cx: bb.x + bb.width / 2, cy: bb.y + bb.height / 2 })
      }
    } catch {
      // getBBox throws on non-rendered or detached elements — skip silently
    }
  }

  if (items.length < MIN_ELEMENTS) return null

  // ── Find natural bands ─────────────────────────────────────────
  // Try Y-axis first (row bands = most natural for logos / icons).
  // If that doesn't produce enough groups, try X-axis (column bands).
  // Last resort: mechanical equal-thirds split on Y.
  let clusters = detectBands(items, 'cy')

  if (clusters.length < MIN_GROUPS) {
    clusters = detectBands(items, 'cx')
  }

  if (clusters.length < MIN_GROUPS) {
    clusters = equalSplit(items, 'cy', 3)
  }

  if (clusters.length < MIN_GROUPS) return null

  // Hard cap
  clusters = clusters.slice(0, MAX_GROUPS)

  // ── Wrap each cluster in a <g> ────────────────────────────────
  // Process clusters in ascending centroid order so group indices
  // correspond to their visual position (top → bottom or left → right).
  const doc = svgEl.ownerDocument
  for (let i = 0; i < clusters.length; i++) {
    const clusterSet = new Set(clusters[i].map(item => item.el))

    // Find the first cluster member in DOM order — that's where we insert
    let anchor: Element | null = null
    for (const child of [...svgEl.children]) {
      if (clusterSet.has(child as SVGElement)) { anchor = child; break }
    }

    const g = doc.createElementNS(SVG_NS, 'g') as SVGGElement
    g.setAttribute('data-rf-group', String(i))
    svgEl.insertBefore(g, anchor)

    // Move all cluster members into the group, preserving original DOM order
    for (const child of [...svgEl.children]) {
      if (clusterSet.has(child as SVGElement)) g.appendChild(child)
    }
  }

  return {
    svg: new XMLSerializer().serializeToString(svgEl),
    groupCount: clusters.length,
  }
}

// ── Clustering helpers ────────────────────────────────────────

/**
 * Splits items into natural bands along `axis` by detecting gaps
 * larger than GAP_FRACTION × total axis range.
 * Groups are sorted ascending by centroid position.
 */
function detectBands(items: Item[], axis: 'cx' | 'cy'): Item[][] {
  const sorted = [...items].sort((a, b) => a[axis] - b[axis])
  const lo  = sorted[0][axis]
  const hi  = sorted[sorted.length - 1][axis]
  const range = hi - lo

  // All elements have the same centroid on this axis → can't band
  if (range === 0) return [sorted]

  const threshold = range * GAP_FRACTION
  const clusters: Item[][] = []
  let current: Item[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i][axis] - sorted[i - 1][axis]
    // Create a new band on a significant gap, but respect the hard cap
    if (gap > threshold && clusters.length < MAX_GROUPS - 1) {
      clusters.push(current)
      current = []
    }
    current.push(sorted[i])
  }
  clusters.push(current)

  return clusters
}

/**
 * Divides items into `n` equal-sized buckets along `axis`.
 * Used as last resort when no natural gaps are detected.
 */
function equalSplit(items: Item[], axis: 'cx' | 'cy', n: number): Item[][] {
  const sorted = [...items].sort((a, b) => a[axis] - b[axis])
  const size = Math.ceil(sorted.length / n)
  const out: Item[][] = []
  for (let i = 0; i < sorted.length; i += size) {
    out.push(sorted.slice(i, i + size))
  }
  return out
}
