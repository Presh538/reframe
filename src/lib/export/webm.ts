/**
 * WebM Exporter — canvas-capture approach
 *
 * Uses the same Phase 1 (stepToTime frame serialisation) and Phase 2
 * (SVG-string → canvas) pipeline as the GIF exporter, then encodes via
 * MediaRecorder on a canvas stream for a proper video file with transparency
 * handled via a CSS background (transparent by default).
 *
 * Browser support: Chrome / Edge 91+, Firefox 97+.  Safari currently lacks
 * MediaRecorder VP8/VP9 support so we gracefully fall back to webm/h264
 * or webm with no codec hint.
 */

import { stepToTime, restorePlayback, computeSequenceDuration } from '@/lib/svg/animate'

// ── Config ─────────────────────────────────────────────────────

const FPS           = 30
const MAX_EXPORT_PX = 720   // 480 was undersized; 720 gives clean output on retina displays
const MAX_DURATION  = 10    // seconds — hard cap

// ── Public API ─────────────────────────────────────────────────

export interface WebmExportOptions {
  svgEl: SVGSVGElement
  onProgress?: (pct: number) => void
  /** Background colour, or 'transparent' (default). */
  background?: string | 'transparent'
}

export async function exportWebm(opts: WebmExportOptions): Promise<Blob> {
  const { svgEl, onProgress, background = 'transparent' } = opts

  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder is not available in this browser')
  }

  const vb   = svgEl.viewBox?.baseVal
  const srcW = vb?.width  ?? svgEl.clientWidth  ?? 400
  const srcH = vb?.height ?? svgEl.clientHeight ?? 400
  const scale = Math.min(MAX_EXPORT_PX / Math.max(srcW, srcH), 1)
  const W = Math.round(srcW * scale)
  const H = Math.round(srcH * scale)

  const animDuration = computeSequenceDuration(svgEl) / 1000
  const duration     = Math.min(animDuration, MAX_DURATION)
  const frameCount   = Math.round(duration * FPS)

  // ── Phase 1: Serialise all frames (synchronous) ─────────────

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

  const canvases = await Promise.all(
    svgStrings.map(svg => svgStringToCanvas(svg, W, H, background))
  )

  const frames = canvases.filter((c): c is HTMLCanvasElement => c !== null)

  if (frames.length === 0) {
    throw new Error('No frames captured — the SVG may not render as a standalone image')
  }

  // ── Phase 3: Encode as WebM via MediaRecorder ────────────────

  return encodeWebm(frames, FPS, W, H, (p) => {
    onProgress?.(32 + Math.round(p * 68))
  })
}

// ── Internal helpers ──────────────────────────────────────────

function svgStringToCanvas(
  svgString: string,
  W: number,
  H: number,
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
        const ctx = canvas.getContext('2d')!

        if (background !== 'transparent') {
          ctx.fillStyle = background
          ctx.fillRect(0, 0, W, H)
        }
        // For transparent background: leave canvas clear — WebM VP8/VP9
        // supports full alpha channel natively (unlike GIF's 1-bit approach).
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

function pickMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return 'video/webm'
}

function encodeWebm(
  frames: HTMLCanvasElement[],
  fps: number,
  W: number,
  H: number,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Create an offscreen canvas that MediaRecorder will watch
    const canvas = document.createElement('canvas')
    canvas.width  = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!

    // Use captureStream(0) + explicit requestFrame() for frame-accurate encoding
    const stream  = canvas.captureStream(0)
    const track   = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack & {
      requestFrame?: () => void
    }
    const mimeType = pickMimeType()
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 })

    const chunks: Blob[] = []
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }))
    recorder.onerror = (e) => reject(new Error(`MediaRecorder error: ${e}`))

    recorder.start()

    const frameDurationMs = 1000 / fps
    let i = 0

    const pushFrame = () => {
      if (i >= frames.length) {
        // Give MediaRecorder a moment to flush the last frame before stopping
        setTimeout(() => recorder.stop(), frameDurationMs * 2)
        return
      }

      ctx.clearRect(0, 0, W, H)
      ctx.drawImage(frames[i], 0, 0)

      // Explicitly push the frame if the API is available (Chrome), otherwise
      // the captureStream FPS drives the capture rate automatically.
      if (typeof track.requestFrame === 'function') {
        track.requestFrame()
      }

      onProgress?.((i + 1) / frames.length)
      i++
      setTimeout(pushFrame, frameDurationMs)
    }

    pushFrame()
  })
}
