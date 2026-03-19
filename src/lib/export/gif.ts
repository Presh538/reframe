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
const GIF = (typeof window !== 'undefined' ? require('gif.js') : null) as new (options: GifOptions) => GifInstance

interface GifOptions {
  workers: number
  quality: number
  width: number
  height: number
  workerScript: string
  repeat?: number
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
// Pass 'transparent' to skip the fill entirely (canvas starts as RGBA(0,0,0,0);
// gif.js encodes transparent pixels as white in most viewers, which is fine for
// SVGs that carry their own coloured background rect).
const DEFAULT_BG = '#e8e8e8'

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

  const blob = await encodeGif(frames, frameDelay, W, H, (p) => {
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
      const serialized = new XMLSerializer().serializeToString(svgEl)
      const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = W
        canvas.height = H
        const ctx = canvas.getContext('2d')!
        // Only fill a background colour when the caller wants one.
        // Skipping the fill leaves the canvas transparent (RGBA 0,0,0,0) so
        // SVGs that carry their own background rect render correctly, and SVGs
        // with no background get whatever the GIF viewer uses for transparent
        // pixels (typically white — but that is the viewer's choice, not ours).
        if (background !== 'transparent') {
          ctx.fillStyle = background
          ctx.fillRect(0, 0, W, H)
        }
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
    })

    frames.forEach(canvas => gif.addFrame(canvas, { delay, copy: true }))

    gif.on('progress', (p: number) => onProgress?.(p))
    gif.on('finished', (blob: Blob) => resolve(blob))
    gif.on('error', (err: Error) => reject(err))

    gif.render()
  })
}

