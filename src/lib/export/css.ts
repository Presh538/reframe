/**
 * CSS Exporter
 *
 * Extracts the injected @keyframes and per-element animation
 * declarations from the live SVG, then formats them as a
 * clean, self-contained CSS file.
 */

import type { Preset } from '@/types'

export function exportCss(svgEl: SVGSVGElement, preset: Preset): string {
  const styleEl = svgEl.querySelector<SVGStyleElement>('style[data-rf]')
  const animatedEls = [...svgEl.querySelectorAll<SVGElement>('[data-rf-anim]')]

  if (!styleEl || animatedEls.length === 0) {
    throw new Error('No animation found. Apply a preset before exporting.')
  }

  const lines: string[] = [
    `/* ─────────────────────────────────────────────────────── */`,
    `/* The Reframe — CSS Export                               */`,
    `/* Preset: ${preset.name} (${preset.category})           */`,
    `/* Generated: ${new Date().toISOString()}                 */`,
    `/* ─────────────────────────────────────────────────────── */`,
    '',
    '/* Keyframes */',
    styleEl.textContent?.trim() ?? '',
    '',
    '/* Element bindings',
    ' * Selectors are best-effort. Adjust to match your SVG IDs / classes. */',
  ]

  animatedEls.forEach((el, i) => {
    const sel = selectorFor(el, i)
    lines.push(`${sel} {`)
    lines.push(`  animation: ${el.style.animation};`)
    if (el.style.strokeDasharray) lines.push(`  stroke-dasharray: ${el.style.strokeDasharray};`)
    if (el.style.strokeDashoffset) lines.push(`  stroke-dashoffset: ${el.style.strokeDashoffset};`)
    if (el.style.transformOrigin) lines.push(`  transform-origin: ${el.style.transformOrigin};`)
    lines.push(`}`)
  })

  return lines.join('\n')
}

function selectorFor(el: SVGElement, index: number): string {
  if (el.id) return `#${CSS.escape(el.id)}`
  const cls = el.getAttribute('class')?.split(' ')[0]
  if (cls) return `.${CSS.escape(cls)}`
  return `/* element ${index + 1} */ svg > *:nth-child(${index + 1})`
}

export function downloadText(content: string, filename: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: mime })
  triggerDownload(blob, filename)
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  // Must be in the document before .click() — Firefox silently ignores
  // programmatic clicks on detached anchor elements.
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
