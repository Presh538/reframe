'use client'

import { clsx } from 'clsx'
import { useEditorStore, selectCanExport } from '@/lib/store/editor'
import { getPreset } from '@/lib/presets'
import { exportGif } from '@/lib/export/gif'
import { exportCss, downloadText } from '@/lib/export/css'
import { exportLottie } from '@/lib/export/lottie'
import { useToast } from '@/components/ui/Toast'
import { triggerDownload } from '@/lib/export/css'
import type { ExportFormat } from '@/types'

const FORMAT_OPTIONS: { value: ExportFormat; label: string; tier: 'free' | 'pro' }[] = [
  { value: 'gif',    label: 'GIF',    tier: 'free' },
  { value: 'lottie', label: 'Lottie', tier: 'pro' },
  { value: 'css',    label: 'CSS',    tier: 'pro' },
]

const EXPORT_LABELS: Record<ExportFormat, string> = {
  gif:    'Export GIF',
  lottie: 'Export Lottie JSON',
  css:    'Export CSS',
}

export function ExportPanel() {
  const format         = useEditorStore(s => s.format)
  const exportState    = useEditorStore(s => s.export)
  const activePresetId = useEditorStore(s => s.activePresetId)
  const params         = useEditorStore(s => s.params)
  const canExport      = useEditorStore(selectCanExport)

  const setFormat      = useEditorStore(s => s.setFormat)
  const setExportState = useEditorStore(s => s.setExportState)

  const { toast } = useToast()

  const handleExport = async () => {
    if (!canExport || !activePresetId) return

    const preset = getPreset(activePresetId)
    if (!preset) return

    const svgEl = document.querySelector<SVGSVGElement>('.rf-preview-container svg')
    if (!svgEl) { toast('No SVG in preview — apply a preset first', 'error'); return }

    setExportState({ isRunning: true, progress: 0, error: null })

    try {
      if (format === 'gif') {
        const blob = await exportGif({
          svgEl,
          animationDuration: preset.baseDuration,
          speed: params.speed,
          watermark: true,
          onProgress: (pct) => setExportState({ progress: pct }),
        })
        triggerDownload(blob, `reframe-${preset.id}.gif`)
        toast('GIF downloaded ✓', 'success')

      } else if (format === 'css') {
        const css = exportCss(svgEl, preset)
        downloadText(css, `reframe-${preset.id}.css`, 'text/css')
        toast('CSS exported ✓', 'success')

      } else if (format === 'lottie') {
        exportLottie(svgEl, preset, params)
        toast('Lottie JSON exported ✓', 'success')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed'
      setExportState({ error: msg })
      toast(msg, 'error')
    } finally {
      setExportState({ isRunning: false, progress: 0 })
    }
  }

  const exportLabel = exportState.isRunning
    ? (exportState.progress < 78 ? 'Capturing frames…' : 'Encoding…')
    : EXPORT_LABELS[format]

  return (
    <div className="flex-shrink-0 border-t border-border">
      {/* Format tabs */}
      <div className="flex border-b border-border">
        {FORMAT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFormat(opt.value)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1 h-[32px] text-[11px] font-medium transition-colors duration-100',
              format === opt.value
                ? 'text-[var(--text)] bg-surface-2 border-b-[1.5px] border-accent -mb-px'
                : 'text-muted hover:text-[var(--text)] hover:bg-surface-2/50'
            )}
          >
            {opt.label}
            {opt.tier === 'pro' && (
              <span className="text-[8px] font-bold text-warning/70 tracking-wide">PRO</span>
            )}
          </button>
        ))}
      </div>

      <div className="p-3 space-y-2.5">
        {exportState.isRunning && (
          <div className="h-[2px] rounded-full bg-surface-3 overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-150"
              style={{ width: `${exportState.progress}%` }}
            />
          </div>
        )}

        {exportState.error && (
          <p className="text-2xs text-danger leading-snug">{exportState.error}</p>
        )}

        <button
          onClick={handleExport}
          disabled={!canExport || exportState.isRunning}
          className={clsx(
            'w-full h-[32px] rounded text-xs font-semibold transition-all duration-100 flex items-center justify-center gap-2',
            canExport && !exportState.isRunning
              ? 'bg-accent hover:bg-accent-hover text-white cursor-pointer'
              : 'bg-surface-2 text-muted cursor-not-allowed'
          )}
        >
          {exportState.isRunning && (
            <svg className="animate-spin-slow w-3 h-3 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          )}
          {exportLabel}
        </button>
      </div>
    </div>
  )
}
