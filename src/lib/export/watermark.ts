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

  // Wordmark height ~4.5% of the short edge, clamped so it stays legible on
  // small exports without dominating large ones.
  const markH = Math.max(6, Math.min(22, shortEdge * 0.045))
  const markW = markH * WORDMARK_RATIO
  const padX = markH * 0.9
  const padY = markH * 0.62
  const pillW = markW + padX * 2
  const pillH = markH + padY * 2
  const margin = Math.max(4, shortEdge * 0.03)
  const x = W - pillW - margin
  const y = H - pillH - margin

  // Nothing sensible to draw if the frame is smaller than the mark itself.
  if (x < 0 || y < 0) return

  ctx.save()
  ctx.globalAlpha = 1 // GIF keys out anything below alpha 128.
  ctx.globalCompositeOperation = 'source-over'

  ctx.beginPath()
  ctx.roundRect(x, y, pillW, pillH, pillH / 2)
  ctx.fillStyle = '#0E0E0F'
  ctx.fill()

  ctx.drawImage(wordmark, x + padX, y + padY, markW, markH)
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
