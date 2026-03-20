/**
 * GIF Exporter — parallel three-phase pipeline
 *
 * Phase 1 – Serialise (sync, ~0 ms/frame):
 *   Step the SVG through time and serialise each frozen state as an SVG
 *   string. stepToTime() writes inline styles synchronously, and
 *   XMLSerializer reads inline styles directly — no repaint / rAF wait needed.
 *
 * Phase 2 – Render (parallel, ~max_single_load instead of sum_all_loads):
 *   Launch all SVG-string → canvas conversions with Promise.all so every
 *   image loads concurrently. Total time = slowest single load, not their sum.
 *
 * Phase 3 – Encode (per-frame NeuQuant, quality 20):
 *   GIFEncoder with quality 20 runs NeuQuant per frame but samples every 20th
 *   pixel — accurate for flat SVG vector colours and fast enough to keep
 *   total encode time under ~80 ms for 24 frames at 360 px.
 *
 * Background note:
 *   GIF's 1-bit transparency is notoriously unreliable with anti-aliased
 *   vector edges (chroma-key compositing introduces colour fringing).
 *   We use a white background by default — clean, universally correct, and
 *   what every major GIF tool does. The background colour is configurable
 *   via GifExportOptions.background for callers that need a different matte.
 */

import { stepToTime, restorePlayback, computeSequenceDuration } from '@/lib/svg/animate'

// GIFEncoder is the low-level encoder from the gif.js npm package.
// Required directly from src/ to bypass the package's "browser" field,
// which maps require('gif.js') → dist/gif.js (the worker-based GIF class).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const getEncoder = (): (new (w: number, h: number) => GifEncoderInstance) | null =>
  typeof window !== 'undefined' ? require('gif.js/src/GIFEncoder.js') : null

interface GifEncoderInstance {
  writeHeader(): void
  setRepeat(n: number): void
  setDelay(ms: number): void
  setQuality(q: number): void
  setTransparent(color: number | null): void
  addFrame(data: Uint8ClampedArray): void
  finish(): void
  stream(): { pages: Uint8Array[]; cursor: number }
}

// ── Config ────────────────────────────────────────────────────

const FPS           = 10   // 10 fps is smooth while minimizing frame count.
// 360 px: SVGs are lossless vectors at any scale. 360² = 130 K px/frame vs
// 480² = 230 K — 43 % fewer pixels → proportional LZW speedup per frame.
const MAX_EXPORT_PX = 360
// 24 frames hard cap: at 10 fps covers 2.4 s of animation.
const MAX_FRAMES    = 24
// Chroma-key used for GIF transparency. GIF only supports one transparent
// palette index; we map this unlikely hue and encode it as transparent.
const DEFAULT_BG    = 'transparent'
const CHROMA_KEY    = '#ff00ff'
const CHROMA_KEY_NUM = 0xff00ff

// ── Public API ────────────────────────────────────────────────

export interface GifExportOptions {
  svgEl: SVGSVGElement
  onProgress?: (pct: number) => void
  /** Background colour drawn beneath each SVG frame (default: '#ffffff'). */
  background?: string
}

export async function exportGif(opts: GifExportOptions): Promise<Blob> {
  const { svgEl, onProgress, background = DEFAULT_BG } = opts

  // Compute export dimensions (capped, preserving aspect ratio)
  const vb   = svgEl.viewBox?.baseVal
  const srcW = vb?.width  ?? svgEl.clientWidth  ?? 400
  const srcH = vb?.height ?? svgEl.clientHeight ?? 400
  const scale = Math.min(MAX_EXPORT_PX / Math.max(srcW, srcH), 1)
  const W = Math.round(srcW * scale)
  const H = Math.round(srcH * scale)

  const duration   = computeSequenceDuration(svgEl) / 1000
  const frameCount = Math.min(Math.ceil(duration * FPS), MAX_FRAMES)
  const frameDelay = Math.round(1000 / FPS)

  // ── Phase 1: Serialise all frames (synchronous, no waits) ───
  //
  // stepToTime() sets el.style.animationDelay / animationPlayState inline.
  // XMLSerializer reads those inline attributes directly from the DOM tree —
  // no browser repaint cycle is required, so we skip the rAF wait entirely.
  // This turns frame serialisation from ~16 ms × N frames → near-zero.
  //
  // We stamp explicit pixel width/height before serialising so the detached
  // <img> has a concrete intrinsic size (normalizeSvgElement strips them and
  // replaces with "width: 100%" CSS which resolves to 0 in a detached context).

  const svgStrings: string[] = []

  for (let i = 0; i <= frameCount; i++) {
    const t = (i / frameCount) * duration
    stepToTime(svgEl, t)

    svgEl.setAttribute('width',  String(W))
    svgEl.setAttribute('height', String(H))
    svgStrings.push(new XMLSerializer().serializeToString(svgEl))
    svgEl.removeAttribute('width')
    svgEl.removeAttribute('height')

    onProgress?.(Math.round((i / frameCount) * 30)) // 0–30 % serialise
  }

  // Restore the live animation before any awaits so the preview
  // continues playing while Phase 2 is in flight.
  restorePlayback(svgEl)

  // ── Phase 2: Render all SVG strings → canvases in parallel ──
  //
  // Promise.all launches every image load simultaneously.
  // Total render time = slowest single load, not sum(all loads).

  onProgress?.(32)

  const canvases = await Promise.all(
    svgStrings.map(svg => svgStringToCanvas(svg, W, H, background))
  )

  const frames = canvases.filter((c): c is HTMLCanvasElement => c !== null)

  if (frames.length === 0) {
    throw new Error('No frames captured — the SVG may not render as a standalone image')
  }

  // ── Phase 3: Encode (per-frame NeuQuant, quality 20) ────────
  onProgress?.(70)

  const blob = await encodeGif(frames, frameDelay, W, H, background === 'transparent', (p) => {
    onProgress?.(70 + Math.round(p * 30)) // 70–100 % encode
  })

  return blob
}

// ── Internal helpers ──────────────────────────────────────────

/** Yield to the event loop so React can flush progress state updates. */
function yieldToMain(): Promise<void> {
  return new Promise(r => setTimeout(r, 0))
}

/**
 * Converts a pre-serialised SVG string to a canvas at the target dimensions.
 * Fills with `background` colour before drawing so the SVG composites cleanly.
 * Safe to call in parallel — each invocation is fully independent.
 */
function svgStringToCanvas(
  svgString: string,
  W: number,
  H: number,
  background: string,
): Promise<HTMLCanvasElement | null> {
  return new Promise(resolve => {
    // 3 s timeout guards against a stuck img load (e.g. CSP blocking the blob
    // URL, or a malformed SVG the browser refuses to paint).
    const timer = setTimeout(() => resolve(null), 3000)

    try {
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const url  = URL.createObjectURL(blob)
      const img  = new Image()

      img.onload = () => {
        clearTimeout(timer)
        const canvas = document.createElement('canvas')
        canvas.width  = W
        canvas.height = H
        const ctx = canvas.getContext('2d')!

        // Fill with the requested matte. For true transparent output, use
        // a dedicated chroma key colour so encoder can mark it as transparent.
        ctx.fillStyle = background === 'transparent' ? CHROMA_KEY : background
        ctx.fillRect(0, 0, W, H)
        ctx.drawImage(img, 0, 0, W, H)
        URL.revokeObjectURL(url)
        resolve(canvas)
      }

      img.onerror = () => {
        clearTimeout(timer)
        URL.revokeObjectURL(url)
        resolve(null)
      }

      img.src = url
    } catch {
      clearTimeout(timer)
      resolve(null)
    }
  })
}

/**
 * Encodes captured canvas frames into a GIF Blob using GIFEncoder directly
 * (no web workers). NeuQuant runs per frame at quality 20 (samples every 20th
 * pixel) — fast enough for vector SVG artwork and gives each frame its own
 * accurate palette.
 */
async function encodeGif(
  frames: HTMLCanvasElement[],
  delay: number,
  W: number,
  H: number,
  transparent: boolean,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const GIFEncoder = getEncoder()
  if (!GIFEncoder) throw new Error('GIFEncoder not available in this environment')

  const encoder = new GIFEncoder(W, H)
  encoder.writeHeader()
  encoder.setRepeat(0)   // loop forever
  encoder.setDelay(delay)
  // If requested, mark the chroma-key colour as transparent in GIF output.
  if (transparent) {
    encoder.setTransparent(CHROMA_KEY_NUM)
  }
  // quality 20 = NeuQuant samples every 20th pixel (vs default 10). At 360 px
  // that's ~6 500 samples/frame — still accurate for flat SVG colours and
  // roughly 2× faster than quality 10.
  encoder.setQuality(20)

  // One yield before the loop flushes the progress bar update to React,
  // then we run all frames synchronously. With MAX_FRAMES=24 and per-frame
  // NeuQuant at quality 20 the encode loop finishes in <80 ms.
  await yieldToMain()

  for (let i = 0; i < frames.length; i++) {
    const ctx = frames[i].getContext('2d')!
    encoder.addFrame(ctx.getImageData(0, 0, W, H).data)
    onProgress?.((i + 1) / frames.length)
  }

  encoder.finish()

  // Assemble ByteArray pages into one contiguous Uint8Array.
  // Every page except the last is completely full (pageSize bytes);
  // the last page contains exactly `cursor` bytes.
  const stream   = encoder.stream()
  const { pages, cursor } = stream
  const pageSize = (stream.constructor as unknown as { pageSize: number }).pageSize
  const totalLen = (pages.length - 1) * pageSize + cursor
  const out      = new Uint8Array(totalLen)
  let offset     = 0
  pages.forEach((page: Uint8Array, i: number) => {
    const len = i === pages.length - 1 ? cursor : pageSize
    out.set(page.subarray(0, len), offset)
    offset += len
  })

  return new Blob([out], { type: 'image/gif' })
}
