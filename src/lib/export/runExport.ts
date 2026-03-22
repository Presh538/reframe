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
import type { ExportFormat, AnimParams } from '@/types'

export interface RunExportOptions {
  format: ExportFormat
  activePresetId: string | null
  params: AnimParams
  onProgress: (pct: number) => void
  onError: (msg: string) => void
  onSuccess: (msg: string) => void
}

export async function runExport({
  format,
  activePresetId,
  params,
  onProgress,
  onError,
  onSuccess,
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

  try {
    if (format === 'gif') {
      const { exportGif } = await import('./gif')
      const blob = await exportGif({ svgEl, onProgress })
      triggerDownload(blob, `reframe-${preset.id}.gif`)
      onSuccess('GIF downloaded ✓')

    } else if (format === 'css') {
      const { exportCss, downloadText } = await import('./css')
      const css = exportCss(svgEl, preset)
      downloadText(css, `reframe-${preset.id}.css`, 'text/css')
      onSuccess('CSS exported ✓')

    } else if (format === 'lottie') {
      const { exportLottie } = await import('./lottie')
      exportLottie(svgEl, preset, params)
      onSuccess('Lottie exported ✓')
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Export failed'
    onError(msg)
  }
}
