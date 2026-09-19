import type { SceneManifest, SceneNode } from './schema'

const VISUAL_SELECTOR = 'g,path,circle,rect,ellipse,line,polyline,polygon,text'
const MAX_NODES = 120

/**
 * Assigns stable, local IDs to meaningful SVG nodes and returns a compact
 * geometry manifest suitable for structured AI reasoning. The IDs live on the
 * live SVG only; no path data or rendered text content is sent to the model.
 */
export function buildSceneManifest(svgEl: SVGSVGElement): SceneManifest {
  const all = Array.from(svgEl.querySelectorAll<SVGGraphicsElement>(VISUAL_SELECTOR))
    .filter(el => !el.closest('defs,clipPath,mask,pattern,marker'))
    .slice(0, MAX_NODES)

  const included = new Set<Element>(all)
  const idByElement = new Map<Element, string>()
  all.forEach((el, index) => {
    const id = `rf-node-${index + 1}`
    el.setAttribute('data-rf-node', id)
    idByElement.set(el, id)
  })

  const viewBox = svgEl.viewBox.baseVal
  const width = viewBox?.width || svgEl.width.baseVal.value || 400
  const height = viewBox?.height || svgEl.height.baseVal.value || 400

  const nodes: SceneNode[] = all.map((el, index) => {
    let box = { x: 0, y: 0, width: 0, height: 0 }
    try {
      const measured = el.getBBox()
      box = { x: measured.x, y: measured.y, width: measured.width, height: measured.height }
    } catch { /* detached or non-rendering SVG nodes retain a zero box */ }

    let parent: Element | null = el.parentElement
    while (parent && !included.has(parent)) parent = parent.parentElement

    const authoredLabel = [el.id, el.getAttribute('class'), el.getAttribute('aria-label')]
      .filter(Boolean)
      .join(' ')
      .replace(/[^a-zA-Z0-9 _-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120)

    let depth = 0
    let cursor: Element | null = el.parentElement
    while (cursor && cursor !== svgEl && depth < 16) { depth++; cursor = cursor.parentElement }

    return {
      id: idByElement.get(el) ?? `rf-node-${index + 1}`,
      tag: el.tagName.toLowerCase() as SceneNode['tag'],
      parentId: parent ? (idByElement.get(parent) ?? null) : null,
      label: authoredLabel,
      depth,
      childCount: Math.min(el.querySelectorAll(VISUAL_SELECTOR).length, 500),
      bbox: box,
    }
  })

  return { width, height, nodes }
}
