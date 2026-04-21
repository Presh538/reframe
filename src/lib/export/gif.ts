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
 *   image loads concurrently. Each frame is supersampled at 3× (rendered to
 *   a 3W×3H canvas with high-quality smoothing, then downscaled to W×H) so
 *   the browser's bicubic filter produces crisp, anti-aliased edges. The hi-res
 *   canvas backing store is released immediately after downscaling to cap RAM.
 *
 * Phase 3 – Encode (global palette from 16 sample frames, quality 1 = maximum):
 *   Build a composite palette from up to 16 evenly-spaced frames at NeuQuant
 *   quality 1 (absolute maximum — samples every pixel), then encode every frame
 *   using that global palette. setTransparent marks chroma-key pixels transparent.
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

const FPS           = 24          // Film-standard cadence — motion is smooth rather than stuttery
const MAX_EXPORT_PX = 1200         // High-resolution output; feels sharp on retina and 2K displays
const MAX_FRAMES    = 144          // 24 fps × 6 s hard cap
const SUPERSAMPLE   = 3           // Render at 3× then downscale — bicubic filter eliminates aliasing

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
 * Supersampling (SUPERSAMPLE ×):
 *   The SVG is drawn onto a (SS×W) × (SS×H) canvas with high-quality smoothing
 *   enabled, then downscaled onto the W × H output canvas. The browser's
 *   bicubic/lanczos filter smooths diagonal edges and curves — effectively
 *   multiplying perceived sharpness before the GIF encoder sees any pixels.
 *   The hi-res canvas backing store is freed immediately after the downscale
 *   (canvas.width = 0) to avoid accumulating multi-GB of off-screen pixel data.
 *
 * Transparent mode (transparent=true):
 *   Draws on a CLEAR hi-res canvas so SVG edges composite against nothing
 *   (not against magenta), preventing pink fringing. After downscaling:
 *   - alpha < 128  → replaced with fully-opaque magenta (chroma key)
 *   - alpha >= 128 → kept as-is with alpha forced to 255
 *
 * Solid mode (transparent=false):
 *   Fills hi-res canvas with the background colour then draws the SVG on top
 *   before downscaling.
 */
function svgStringToCanvas(
  svgString: string,
  W: number,
  H: number,
  transparent: boolean,
  background: string | 'transparent',
): Promise<HTMLCanvasElement | null> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(null), 8000)

    try {
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const url  = URL.createObjectURL(blob)
      const img  = new Image()

      img.onload = () => {
        clearTimeout(timer)

        // ── Step 1: render at SUPERSAMPLE× resolution ───────────
        const SS    = SUPERSAMPLE
        const hiRes = document.createElement('canvas')
        hiRes.width  = W * SS
        hiRes.height = H * SS
        const hiCtx = hiRes.getContext('2d')!
        hiCtx.imageSmoothingEnabled  = true
        hiCtx.imageSmoothingQuality  = 'high'

        if (!transparent) {
          hiCtx.fillStyle = background as string
          hiCtx.fillRect(0, 0, W * SS, H * SS)
        }
        // Browsers scale SVG images smoothly at any drawImage size regardless
        // of the width/height attributes baked into the serialised SVG string.
        hiCtx.drawImage(img, 0, 0, W * SS, H * SS)

        // ── Step 2: downscale to output canvas ──────────────────
        // High-quality bicubic filter applied during the downscale smooths all
        // edges and curves — aliasing is eliminated before encoding.
        const canvas = document.createElement('canvas')
        canvas.width  = W
        canvas.height = H
        const ctx = canvas.getContext('2d', { willReadFrequently: transparent })!
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(hiRes, 0, 0, W, H)

        // Release the hi-res backing store immediately — don't let SS²×frames
        // worth of pixel data accumulate while the rest of the batch finishes.
        hiRes.width  = 0
        hiRes.height = 0

        if (transparent) {
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
 * For transparent exports a composite global palette is built from up to
 * 4 evenly-spaced sample frames tiled into one canvas. Running NeuQuant
 * over combined pixels gives a palette that represents the full animation
 * colour space, not just a single frame. Magenta (#FF00FF) is then injected
 * at index 255 before the palette is locked, guaranteeing that
 * setTransparent(CHROMA_KEY_NUM) finds an exact-distance-0 match — no luck
 * needed.
 *
 * For solid-background exports standard per-frame NeuQuant (quality 10) is
 * used; no transparency handling is required.
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
    // Build a representative palette by tiling multiple evenly-spaced frames
    // into a single composite canvas, then running NeuQuant once over all of
    // them. Spatial layout doesn't affect quality — NeuQuant only sees colours.
    //
    // Why multiple frames instead of just the mid-frame?
    //   A single-frame palette misses colours that are vivid in other parts of
    //   the animation. Blues, greens, etc. that peak at frame 3 but are muted
    //   at frame 12 (mid) won't get palette entries → they map to the nearest
    //   neighbour → colour shift in the exported GIF.
    //
    // Why not per-frame NeuQuant + setTransparent?
    //   setTransparent calls findClosest(magenta, used=true). "used=true" means
    //   it only searches entries NeuQuant actually assigned pixels to. If the
    //   nearest palette entry to magenta isn't marked "used" (reproducible edge
    //   case), findClosest silently returns index 0 — wrong colour becomes
    //   "transparent" and magenta stays solid.
    //
    // With a composite palette + magenta guaranteed at index 255:
    //   findClosest(0xFF00FF) finds index 255 with distance=0. No luck needed.

    // Pick up to 4 evenly-spaced sample frames; always include the last frame
    // so late-appearing colours are represented.
    const sampleCount = Math.min(16, frames.length)
    const stride = Math.max(1, Math.floor((frames.length - 1) / Math.max(1, sampleCount - 1)))
    const sampleIndices: number[] = []
    for (let s = 0; s < sampleCount; s++) {
      sampleIndices.push(Math.min(s * stride, frames.length - 1))
    }
    sampleIndices[sampleIndices.length - 1] = frames.length - 1

    // Tile samples: up to 4 cols × 4 rows (covers 16 samples)
    const cols   = Math.min(sampleCount, 4)
    const rows   = Math.ceil(sampleCount / cols)
    const tiled  = document.createElement('canvas')
    tiled.width  = W * cols
    tiled.height = H * rows
    const tCtx   = tiled.getContext('2d')!
    sampleIndices.forEach((idx, n) => {
      tCtx.drawImage(frames[idx], (n % cols) * W, Math.floor(n / cols) * H, W, H)
    })

    const probe = new GIFEncoder(tiled.width, tiled.height)
    probe.writeHeader()
    probe.setQuality(1)  // quality 1 = maximum — NeuQuant samples every pixel
    probe.addFrame(tCtx.getImageData(0, 0, tiled.width, tiled.height).data)

    if (probe.colorTab) {
      const palette = probe.colorTab.slice() // clone — don't mutate the probe
      palette[765] = 0xFF                    // R  ← index 255 = exact magenta
      palette[766] = 0x00                    // G
      palette[767] = 0xFF                    // B
      encoder.setGlobalPalette(palette)
    } else {
      // Fallback: per-frame NeuQuant (colour may drift but at least renders)
      encoder.setQuality(1)
    }
    encoder.setTransparent(CHROMA_KEY_NUM)
  } else {
    encoder.setQuality(1)  // quality 1 = maximum NeuQuant accuracy
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
