/**
 * Embed code generator — Flow mode
 *
 * Produces a self-contained HTML snippet that drops the live animated SVG
 * into any webpage. Keyframes are moved to an external <style> block so the
 * code is clean; element animation properties remain as inline styles (highest
 * specificity, no class-name collisions in the host page).
 */

export function generateEmbedHtml(svgEl: SVGSVGElement, presetName: string): string {
  // Clone so we never mutate the live preview element
  const clone = svgEl.cloneNode(true) as SVGSVGElement

  // Pull the @keyframes block Reframe injected via <style data-rf>
  const styleEl = clone.querySelector<SVGStyleElement>('style[data-rf]')
  const keyframesCSS = styleEl?.textContent?.trim() ?? ''
  styleEl?.remove()

  // Strip internal helper attributes — not needed in the output
  clone.querySelectorAll<SVGElement>('[data-rf-anim]').forEach(el =>
    el.removeAttribute('data-rf-anim'),
  )
  clone.querySelectorAll<SVGElement>('[data-rf-stroke-added]').forEach(el =>
    el.removeAttribute('data-rf-stroke-added'),
  )
  clone.querySelectorAll<SVGElement>('[data-rf-sw-added]').forEach(el =>
    el.removeAttribute('data-rf-sw-added'),
  )

  // Ensure the SVG has explicit width/height so it renders predictably
  if (!clone.getAttribute('width') && !clone.getAttribute('height')) {
    const vb = clone.getAttribute('viewBox')?.split(/\s+/)
    if (vb && vb.length === 4) {
      clone.setAttribute('width',  vb[2])
      clone.setAttribute('height', vb[3])
    }
  }

  const svgMarkup = clone.outerHTML

  const lines: string[] = [
    `<!-- ${presetName} — animated with Reframe -->`,
  ]

  if (keyframesCSS) {
    lines.push(`<style>`, keyframesCSS, `</style>`, ``)
  }

  lines.push(svgMarkup)

  return lines.join('\n')
}
