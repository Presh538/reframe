/**
 * runExport — shared export orchestrator
 *
 * Single implementation used by both TopBar and ExportPanel.
 * Previously each component duplicated this logic; any format change
 * or bug fix now only needs to be made here.
 */

import { triggerDownload } from './css'
import { getPreset } from '@/lib/presets'
import { liveSvgRef } from '@/lib/store/editor'
import { trackExportCompleted, trackExportFailed } from '@/lib/analytics'
import type { ExportFormat, AnimParams } from '@/types'

export interface RunExportOptions {
  format: ExportFormat
  activePresetId: string | null
  params: AnimParams
  onProgress: (pct: number) => void
  onError: (msg: string) => void
  onSuccess: (msg: string) => void
  /** Called with the generated HTML when format === 'embed' */
  onEmbedCode?: (html: string) => void
  /** Export quality 10–100 (resolution scale + palette/bitrate). Used by GIF and WebM. */
  quality?: number
  /** Frames per second. Used by GIF and WebM. */
  fps?: number
}

export async function runExport({
  format,
  activePresetId,
  params,
  onProgress,
  onError,
  onSuccess,
  onEmbedCode,
  quality,
  fps,
}: RunExportOptions): Promise<void> {
  if (!activePresetId) return

  const preset = getPreset(activePresetId)
  if (!preset) { onError('Preset not found — try reapplying a preset'); return }

  // Use the live SVG ref set by PreviewStage — avoids the fragile
  // document.querySelector('.rf-preview-container svg') DOM query.
  const svgEl = liveSvgRef.current
  if (!svgEl) {
    onError('No SVG in preview — apply a preset first')
    return
  }

  const startMs = Date.now()

  try {
    if (format === 'gif') {
      const { exportGif } = await import('./gif')
      const blob = await exportGif({ svgEl, onProgress, quality, fps })
      triggerDownload(blob, `reframe-${preset.id}.gif`)
      onSuccess('GIF downloaded ✓')

    } else if (format === 'webm') {
      const { exportWebm } = await import('./webm')
      const blob = await exportWebm({ svgEl, onProgress, quality, fps })
      triggerDownload(blob, `reframe-${preset.id}.webm`)
      onSuccess('WebM downloaded ✓')

    } else if (format === 'css') {
      const { exportCss, downloadText } = await import('./css')
      const css = exportCss(svgEl, preset)
      downloadText(css, `reframe-${preset.id}.css`, 'text/css')
      onSuccess('CSS exported ✓')

    } else if (format === 'lottie') {
      const { exportLottie } = await import('./lottie')
      exportLottie(svgEl, preset, params)
      onSuccess('Lottie exported ✓')

    } else if (format === 'embed') {
      const { generateEmbedHtml } = await import('./embed')
      const html = generateEmbedHtml(svgEl, preset.name)
      if (onEmbedCode) {
        onEmbedCode(html)
      } else {
        // Fallback: copy to clipboard directly
        await navigator.clipboard.writeText(html)
        onSuccess('Embed code copied ✓')
      }
    }

    trackExportCompleted({ format, durationMs: Date.now() - startMs })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Export failed'
    trackExportFailed({ format, reason: msg })
    onError(msg)
  }
}
