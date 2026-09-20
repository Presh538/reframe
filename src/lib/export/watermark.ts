/**
 * Export watermark — the free-tier mark burned into GIF and WebM frames.
 *
 * Stamped onto each frame canvas after rendering and before encoding, so it is
 * part of the pixels rather than an overlay the encoder could skip.
 *
 * Two constraints shape the design:
 *
 *   - GIF has no partial alpha. Pixels below alpha 128 are chroma-keyed to
 *     transparent (see gif.ts), so the mark is drawn FULLY OPAQUE or it would
 *     disappear on transparent exports. It also never uses the chroma key
 *     colour itself (#FF00FF).
 *   - The animation underneath can be any colour, so the wordmark sits on its
 *     own dark pill. Without it, a white logo on a white background is invisible
 *     and the watermark silently does nothing.
 */

const WORDMARK_SRC = '/figma-icons/reframe-wordmark.svg'
/** Natural size of the wordmark asset, used to keep its aspect ratio. */
const WORDMARK_RATIO = 49.6331 / 10.108

let wordmarkPromise: Promise<HTMLImageElement | null> | null = null

/** Loads the wordmark once per session; all frames reuse the decoded image. */
function loadWordmark(): Promise<HTMLImageElement | null> {
  wordmarkPromise ??= new Promise((resolve) => {
    const image = new Image()
    const done = (value: HTMLImageElement | null) => resolve(value)
    image.onload = () => done(image)
    image.onerror = () => done(null)
    image.src = WORDMARK_SRC
  })
  return wordmarkPromise
}

/**
 * Draws the mark into the bottom-right corner of a frame.
 * Sizes are derived from the frame so the mark stays proportionate on a
 * 200px thumbnail and a 1080p export alike.
 */
function stamp(canvas: HTMLCanvasElement, wordmark: HTMLImageElement): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { width: W, height: H } = canvas
  const shortEdge = Math.min(W, H)

  // Wordmark height ~3.2% of the short edge, clamped so it stays legible on
  // small exports without dominating large ones.
  const markH = Math.max(7, Math.min(16, shortEdge * 0.032))
  const markW = markH * WORDMARK_RATIO
  const margin = Math.max(6, shortEdge * 0.025)
  const x = W - markW - margin
  const y = H - markH - margin

  // Nothing sensible to draw if the frame is smaller than the mark itself.
  if (x < 0 || y < 0) return

  ctx.save()
  // Over opaque artwork this blends down to a soft grey. Over a transparent
  // area it lands just above GIF's alpha-128 cut-off, so the mark survives
  // instead of being keyed out (gif.ts then flattens it to opaque).
  ctx.globalAlpha = 0.62
  ctx.globalCompositeOperation = 'source-over'

  // A shadow rather than a plate: it keeps the wordmark readable on light
  // artwork, and its own pixels fall below the alpha cut-off, so a transparent
  // export carries the mark without a grey halo baked around it.
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)'
  ctx.shadowBlur = markH * 0.6
  ctx.shadowOffsetY = markH * 0.12

  ctx.drawImage(wordmark, x, y, markW, markH)
  ctx.restore()
}

/**
 * Stamps every frame in place. Resolves without changing anything if the
 * wordmark cannot be loaded — a failed watermark must never fail an export.
 */
export async function watermarkFrames(frames: HTMLCanvasElement[]): Promise<void> {
  const wordmark = await loadWordmark()
  if (!wordmark) return
  for (const frame of frames) stamp(frame, wordmark)
}
