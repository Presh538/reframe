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
<<<<<<< HEAD
const getEncoder = (): (new (w: number, h: number) => GifEncoderInstance) | null =>
  typeof window !== 'undefined' ? require('gif.js/src/GIFEncoder.js') : null
=======
const GIF = (typeof window !== 'undefined' ? require('gif.js/dist/gif') : null) as new (options: GifOptions) => GifInstance
>>>>>>> origin/main

interface GifEncoderInstance {
  writeHeader(): void
  setRepeat(n: number): void
  setDelay(ms: number): void
  setQuality(q: number): void
  setTransparent(color: number | null): void
  /** Pass a pre-built 768-byte palette (256 × RGB) to use for all frames. */
  setGlobalPalette(palette: Uint8Array): void
  addFrame(data: Uint8ClampedArray): void
  finish(): void
  stream(): { pages: Uint8Array[]; cursor: number }
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

<<<<<<< HEAD
  // ── Phase 2: Render all SVG strings → canvases in parallel ──
=======
  if (frames.length === 0) {
    throw new Error('No frames captured — the SVG may not render as a standalone image')
  }

  // ── Encode ─────────────────────────────────────────────────
  onProgress?.(80)
>>>>>>> origin/main

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
 * Transparent mode uses a guaranteed-magenta global palette strategy:
 *   1. Run NeuQuant manually on the first frame to build a 256-colour palette.
 *   2. Overwrite the last palette slot (index 255) with exact magenta.
 *   3. Lock this palette for all frames via setGlobalPalette.
 *   4. Call setTransparent(CHROMA_KEY_NUM) — findClosest now finds index 255
 *      with distance 0 (exact match), not a "nearest neighbour" guess.
 *
 * This eliminates the failure mode where NeuQuant at quality 10 happened not
 * to sample enough magenta pixels, causing findClosest to return index 0 and
 * the wrong colour to become "transparent".
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
    // ── Build guaranteed palette with magenta at index 255 ─────────────────
    // Run NeuQuant directly on the first frame's RGB pixels.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const NeuQuant = require('gif.js/src/TypedNeuQuant.js') as
      new (pixels: Uint8Array, len: number, sample: number) => {
        buildColormap(): void
        getColormap(): Uint8Array
      }

    const ctx0  = frames[0].getContext('2d')!
    const rgba  = ctx0.getImageData(0, 0, W, H).data
    // NeuQuant expects packed RGB (3 bytes/pixel), not RGBA
    const rgb   = new Uint8Array(W * H * 3)
    for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
      rgb[j] = rgba[i]; rgb[j + 1] = rgba[i + 1]; rgb[j + 2] = rgba[i + 2]
    }
    const nq = new NeuQuant(rgb, rgb.length, 10)
    nq.buildColormap()
    const palette = nq.getColormap() // 768-byte flat RGB array (256 × 3)

    // Reserve the last slot for magenta so setTransparent gets an exact match.
    palette[765] = 0xFF  // R
    palette[766] = 0x00  // G
    palette[767] = 0xFF  // B

    // Lock palette for all frames — each addFrame skips NeuQuant and uses this.
    // setTransparent(CHROMA_KEY_NUM) → findClosest finds index 255 with d=0.
    encoder.setGlobalPalette(palette)
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
