/**
 * Animated SVG export — the format an SVG animator most obviously owes you.
 *
 * The capability already existed: the live preview element carries the
 * animation as inline style properties on each element, plus one `@keyframes`
 * block Reframe injects as `<style data-rf>`. People were reaching it by hand
 * through Inspect Element. This writes the same thing to a file.
 *
 * The one thing that differs from the embed snippet: that hoists the keyframes
 * OUT to a separate <style> tag for the host page. A standalone file must keep
 * them INSIDE the <svg> root, because nothing else will be loaded alongside it.
 * That is what lets the file animate on its own in a browser, an <img> tag, or
 * a CSS background.
 */

import { triggerDownload } from './css'

/** Editor-only bookkeeping that should never reach a file someone ships. */
const INTERNAL_ATTRS = ['data-rf-anim', 'data-rf-stroke-added', 'data-rf-sw-added']

const SVG_NS = 'http://www.w3.org/2000/svg'
const XLINK_NS = 'http://www.w3.org/1999/xlink'

/**
 * Serialises the live preview into a standalone animated `.svg` file.
 *
 * Takes the element rather than markup so it always exports exactly what is on
 * screen, including any tuning applied since the file was opened.
 */
export function buildAnimatedSvg(svgEl: SVGSVGElement): string {
  // Clone so the live preview is never mutated by an export.
  const clone = svgEl.cloneNode(true) as SVGSVGElement

  for (const attr of INTERNAL_ATTRS) {
    clone.querySelectorAll<SVGElement>(`[${attr}]`).forEach((el) => el.removeAttribute(attr))
  }
  // The root carries them too when the whole drawing animates.
  for (const attr of INTERNAL_ATTRS) clone.removeAttribute(attr)

  // A file opened outside a document has no inherited namespace, so an SVG
  // without xmlns renders as nothing at all. The DOM does not require the
  // attribute to be present in markup, so it is set explicitly rather than
  // assumed from the live element.
  clone.setAttribute('xmlns', SVG_NS)
  if (clone.querySelector('[*|href]') && !clone.getAttribute('xmlns:xlink')) {
    clone.setAttribute('xmlns:xlink', XLINK_NS)
  }

  // Explicit dimensions so the file has an intrinsic size. Without them it
  // collapses in an <img> tag and in most editors.
  if (!clone.getAttribute('width') && !clone.getAttribute('height')) {
    const viewBox = clone.getAttribute('viewBox')?.trim().split(/[\s,]+/)
    if (viewBox?.length === 4) {
      clone.setAttribute('width', viewBox[2])
      clone.setAttribute('height', viewBox[3])
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n${clone.outerHTML}\n`
}

export function exportAnimatedSvg(svgEl: SVGSVGElement, presetId: string): void {
  const markup = buildAnimatedSvg(svgEl)
  triggerDownload(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }), `reframe-${presetId}.svg`)
}
