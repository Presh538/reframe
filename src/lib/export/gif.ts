/**
 * GIF Exporter — parallel three-phase pipeline
 *
 * Phase 1 – Serialise (sync, ~0 ms/frame):
 *   Step the SVG through time and serialise each frozen state as an SVG
 *   string. stepToTime() writes inline styles synchronously; XMLSerializer
 *   reads inline styles directly — no repaint / rAF wait needed.
 *
 * Phase 2 – Render (parallel, ~max_single_load instead of sum_all_loads):
 *   Launch all SVG-string → canvas conversions with Promise.all so every
 *   image loads concurrently.
 *
 * Phase 3 – Encode (per-frame NeuQuant, quality 10):
 *   GIFEncoder with setTransparent marks chroma-key pixels as transparent.
 *   quality=10 (the NeuQuant default) ensures enough pixels are sampled
 *   for magenta to reliably appear in every frame's palette.
 *
 * Transparency:
 *   GIF supports only 1-bit transparency. We use a chroma-key approach:
 *   - Transparent SVG areas → magenta (#FF00FF) in the canvas pixel walk.
 *   - setTransparent(CHROMA_KEY_NUM) marks that palette entry as transparent.
 *   - Drawing on a CLEAR canvas (not pre-filled with magenta) ensures
 *     anti-aliased edges composite against nothing, not against magenta,
 *     so there is no pink fringe on SVG artwork edges.
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
  /** Pass a pre-built 768-byte RGB palette; all frames skip per-frame NeuQuant. */
  setGlobalPalette(palette: Uint8Array): void
  addFrame(data: Uint8ClampedArray): void
  finish(): void
  stream(): { pages: Uint8Array[]; cursor: number }
  /** The 768-byte RGB palette built by NeuQuant after the first addFrame call. */
  colorTab: Uint8Array | null
}

// ── Config ────────────────────────────────────────────────────

const FPS           = 10
const MAX_EXPORT_PX = 360
const MAX_FRAMES    = 24

// Chroma key — fully-saturated magenta is vanishingly unlikely in real SVGs.
const CHROMA_KEY_NUM = 0xFF00FF

// ── Public API ────────────────────────────────────────────────

export interface GifExportOptions {
  svgEl: SVGSVGElement
  onProgress?: (pct: number) => void
  /** Background colour, or 'transparent' (default) for a transparent GIF. */
  background?: string | 'transparent'
}

export async function exportGif(opts: GifExportOptions): Promise<Blob> {
  const { svgEl, onProgress, background = 'transparent' } = opts

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

  const svgStrings: string[] = []

  for (let i = 0; i <= frameCount; i++) {
    const t = (i / frameCount) * duration
    stepToTime(svgEl, t)
    svgEl.setAttribute('width',  String(W))
    svgEl.setAttribute('height', String(H))
    svgStrings.push(new XMLSerializer().serializeToString(svgEl))
    svgEl.removeAttribute('width')
    svgEl.removeAttribute('height')
    onProgress?.(Math.round((i / frameCount) * 30))
  }

  restorePlayback(svgEl)

  // ── Phase 2: Render all SVG strings → canvases in parallel ──

  onProgress?.(32)

  const transparent = background === 'transparent'
  const canvases = await Promise.all(
    svgStrings.map(svg => svgStringToCanvas(svg, W, H, transparent, background))
  )

  const frames = canvases.filter((c): c is HTMLCanvasElement => c !== null)

  if (frames.length === 0) {
    throw new Error('No frames captured — the SVG may not render as a standalone image')
  }

  // ── Phase 3: Encode ──────────────────────────────────────────

  onProgress?.(70)

  const blob = await encodeGif(frames, frameDelay, W, H, transparent, (p) => {
    onProgress?.(70 + Math.round(p * 30))
  })

  return blob
}

// ── Internal helpers ──────────────────────────────────────────

function yieldToMain(): Promise<void> {
  return new Promise(r => setTimeout(r, 0))
}

/**
 * Converts a serialised SVG string to a canvas at the target dimensions.
 *
 * Transparent mode (transparent=true):
 *   Draws SVG on a CLEAR canvas so anti-aliased edges composite against
 *   nothing (not against magenta). Then walks the pixel buffer:
 *   - alpha < 128  → replaced with fully-opaque magenta (chroma key)
 *   - alpha >= 128 → kept as-is with alpha forced to 255
 *   This gives clean edges with no pink fringe.
 *
 * Solid mode (transparent=false):
 *   Fills with the background colour then draws the SVG on top.
 */
function svgStringToCanvas(
  svgString: string,
  W: number,
  H: number,
  transparent: boolean,
  background: string | 'transparent',
): Promise<HTMLCanvasElement | null> {
  return new Promise(resolve => {
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
        const ctx = canvas.getContext('2d', { willReadFrequently: transparent })!

        if (transparent) {
          // Draw on clear canvas — no chroma-key pre-fill, so SVG edges don't
          // composite against magenta and produce pink fringing.
          ctx.drawImage(img, 0, 0, W, H)

          // Walk the pixel buffer: replace fully-transparent pixels with the
          // chroma key so the GIF encoder can mark them as the transparent index.
          const id = ctx.getImageData(0, 0, W, H)
          const d  = id.data
          for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] < 128) {
              // Transparent pixel → chroma key (fully opaque for the encoder)
              d[i]     = 0xFF
              d[i + 1] = 0x00
              d[i + 2] = 0xFF
              d[i + 3] = 0xFF
            } else {
              // Opaque pixel → force full opacity (GIF has no partial alpha)
              d[i + 3] = 0xFF
            }
          }
          ctx.putImageData(id, 0, 0)
        } else {
          ctx.fillStyle = background as string
          ctx.fillRect(0, 0, W, H)
          ctx.drawImage(img, 0, 0, W, H)
        }

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
 * Encodes captured canvas frames into a GIF Blob.
 *
 * Per-frame NeuQuant (quality 10) — each frame builds its own 256-colour
 * palette from its own pixels. This preserves accurate colours across every
 * frame regardless of what colours appear at t=0, which the global-palette
 * approach broke for animations that start faded-out or mostly transparent
 * (frame-0 palette was magenta-dominated → all other frames' colours crushed).
 *
 * The pixel walk in svgStringToCanvas guarantees every transparent frame has
 * enough magenta pixels (~30 %+ of a typical SVG background) for NeuQuant to
 * learn magenta, so setTransparent reliably finds the right palette index.
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
  encoder.setRepeat(0)
  encoder.setDelay(delay)
  if (transparent) {
    // Build a representative palette from the mid-animation frame, then
    // inject magenta at index 255 before locking it as the global palette.
    //
    // Why not per-frame NeuQuant + setTransparent?
    //   setTransparent calls findClosest(magenta, used=true). "used=true" means
    //   it only searches entries NeuQuant actually assigned pixels to. If the
    //   nearest palette entry to magenta isn't marked "used" (edge case but
    //   reproducible), findClosest silently returns index 0 — wrong colour
    //   becomes "transparent" and magenta stays solid.
    //
    // Why the mid-frame, not frame 0?
    //   Frame 0 (t=0) is often mostly transparent/faded-in, giving NeuQuant
    //   mostly magenta pixels → magenta-dominated palette → all other frames'
    //   real colours get crushed → black-and-white output.
    //
    // With a pre-built palette + guaranteed magenta at 255:
    //   findClosest(0xFF00FF) finds index 255 with distance=0. No luck needed.
    const midIdx = Math.max(0, Math.floor(frames.length / 2))
    const probe  = new GIFEncoder(W, H)
    probe.writeHeader()
    probe.setQuality(10)
    const pCtx = frames[midIdx].getContext('2d')!
    probe.addFrame(pCtx.getImageData(0, 0, W, H).data)

    if (probe.colorTab) {
      const palette = probe.colorTab.slice() // clone — don't mutate the probe
      palette[765] = 0xFF                    // R  ← index 255 = exact magenta
      palette[766] = 0x00                    // G
      palette[767] = 0xFF                    // B
      encoder.setGlobalPalette(palette)
    } else {
      // Fallback: per-frame NeuQuant (colour may drift but at least renders)
      encoder.setQuality(10)
    }
    encoder.setTransparent(CHROMA_KEY_NUM)
  } else {
    encoder.setQuality(10)
  }

  // One yield to flush the progress bar update to React before the encode loop.
  await yieldToMain()

  for (let i = 0; i < frames.length; i++) {
    const ctx = frames[i].getContext('2d')!
    encoder.addFrame(ctx.getImageData(0, 0, W, H).data)
    onProgress?.((i + 1) / frames.length)
  }

  encoder.finish()

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
