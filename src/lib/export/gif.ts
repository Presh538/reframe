/**
 * GIF Exporter
 *
 * Captures animation frames by stepping the SVG through time using
 * the negative animation-delay trick, then encodes via gif.js.
 *
 * gif.js is loaded from the local npm package. The worker script is
 * served from /public/gif.worker.js (same-origin) to avoid the
 * cross-origin Web Worker restriction browsers enforce on CDN URLs.
 */

import { stepToTime, restorePlayback, computeSequenceDuration } from '@/lib/svg/animate'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const GIF = (typeof window !== 'undefined' ? require('gif.js/dist/gif') : null) as new (options: GifOptions) => GifInstance

interface GifOptions {
  workers: number
  quality: number
  width: number
  height: number
  workerScript: string
  repeat?: number
  transparent?: number | null
}

interface GifInstance {
  addFrame(canvas: HTMLCanvasElement, opts: { delay: number; copy: boolean }): void
  on(event: 'finished', cb: (blob: Blob) => void): void
  on(event: 'error', cb: (err: Error) => void): void
  on(event: 'progress', cb: (n: number) => void): void
  render(): void
}

// ── Config ────────────────────────────────────────────────────
// Worker served from /public so it's same-origin (CDN workers are blocked)
const GIF_WORKER_LOCAL = '/gif.worker.js'
const FPS = 24
const MAX_EXPORT_PX = 800

// Default canvas background — matches the preview stage's --bg value so the
// exported GIF looks identical to what the user sees in the editor.
// Pass 'transparent' to export with no background (animation only).
const DEFAULT_BG = 'transparent'

// GIF supports only 1-bit transparency: one palette colour is designated as
// the transparent colour. We use fully-saturated magenta as a chroma key —
// it is vanishingly unlikely to appear in user SVGs and visually distinct
// from every common UI colour, so it never accidentally hides real content.
const CHROMA_KEY_HEX = '#FF00FF'
const CHROMA_KEY_NUM = 0xFF00FF

// ── Public API ────────────────────────────────────────────────

export interface GifExportOptions {
  svgEl: SVGSVGElement
  onProgress?: (pct: number) => void
  /** Canvas fill colour before drawing each SVG frame.
   *  Defaults to '#e8e8e8' (matches the editor preview background).
   *  Pass 'transparent' to export with no background fill. */
  background?: string | 'transparent'
}

export async function exportGif(opts: GifExportOptions): Promise<Blob> {
  const { svgEl, onProgress, background = DEFAULT_BG } = opts

  // Compute export dimensions (capped + preserving aspect ratio)
  const vb = svgEl.viewBox?.baseVal
  const srcW = vb?.width ?? svgEl.clientWidth ?? 400
  const srcH = vb?.height ?? svgEl.clientHeight ?? 400
  const scale = Math.min(MAX_EXPORT_PX / Math.max(srcW, srcH), 1)
  const W = Math.round(srcW * scale)
  const H = Math.round(srcH * scale)

  // Use the true sequence end time: max(delay + duration) across all animated
  // elements. This correctly accounts for stagger so no frames get cut off.
  const duration = computeSequenceDuration(svgEl) / 1000
  const frameCount = Math.ceil(duration * FPS)
  const frameDelay = Math.round(1000 / FPS)

  if (!GIF) throw new Error('gif.js not available in this environment')

  // ── Capture frames ──────────────────────────────────────────
  const frames: HTMLCanvasElement[] = []

  for (let i = 0; i <= frameCount; i++) {
    const t = (i / frameCount) * duration
    stepToTime(svgEl, t)

    await nextFrame()
    await nextFrame() // Two rAFs to ensure the browser has repainted

    const canvas = await svgToCanvas(svgEl, W, H, background)
    if (canvas) frames.push(canvas)

    onProgress?.(Math.round((i / frameCount) * 75)) // 0-75% for capture
  }

  restorePlayback(svgEl)

  // ── Encode ─────────────────────────────────────────────────
  onProgress?.(80)

  const blob = await encodeGif(frames, frameDelay, W, H, background === 'transparent', (p) => {
    onProgress?.(80 + Math.round(p * 20)) // 80-100% for encode
  })

  return blob
}

// ── Internal helpers ──────────────────────────────────────────

function nextFrame(): Promise<void> {
  return new Promise(r => requestAnimationFrame(() => r()))
}

function svgToCanvas(
  svgEl: SVGSVGElement,
  W: number,
  H: number,
  background: string | 'transparent',
): Promise<HTMLCanvasElement | null> {
  return new Promise(resolve => {
    try {
      // normalizeSvgElement strips the width/height attrs and replaces them
      // with CSS (width:100%). When the SVG is serialized and loaded as a
      // detached <img>, that 100% resolves against a zero-sized viewport —
      // so ctx.drawImage renders nothing. Stamping explicit pixel dimensions
      // before serializing gives the browser a concrete intrinsic size.
      svgEl.setAttribute('width', String(W))
      svgEl.setAttribute('height', String(H))
      const serialized = new XMLSerializer().serializeToString(svgEl)
      svgEl.removeAttribute('width')
      svgEl.removeAttribute('height')
      const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = W
        canvas.height = H
        const ctx = canvas.getContext('2d')!
        // Fill the canvas before drawing the SVG frame.
        // 'transparent' → use the chroma key so gif.js can mark those pixels
        // as transparent in the palette (GIF has no alpha channel).
        // Any other value is used directly as the visible background colour.
        ctx.fillStyle = background === 'transparent' ? CHROMA_KEY_HEX : background
        ctx.fillRect(0, 0, W, H)
        ctx.drawImage(img, 0, 0, W, H)
        URL.revokeObjectURL(url)
        resolve(canvas)
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }

      img.src = url
    } catch {
      resolve(null)
    }
  })
}


function encodeGif(
  frames: HTMLCanvasElement[],
  delay: number,
  W: number,
  H: number,
  transparent: boolean,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const gif = new GIF({
      workers: 4,
      quality: 2,   // 1 = best, 30 = worst; 2 gives excellent quality
      width: W,
      height: H,
      workerScript: GIF_WORKER_LOCAL,
      repeat: 0,
      // When transparent, designate the chroma-key colour as the GIF palette
      // entry for transparency. gif.js maps pixels of exactly this colour to
      // the transparent index so they show through in supporting viewers.
      transparent: transparent ? CHROMA_KEY_NUM : null,
    })

    frames.forEach(canvas => gif.addFrame(canvas, { delay, copy: true }))

    gif.on('progress', (p: number) => onProgress?.(p))
    gif.on('finished', (blob: Blob) => resolve(blob))
    gif.on('error', (err: Error) => reject(err))

    gif.render()
  })
}
