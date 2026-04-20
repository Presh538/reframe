'use client'

import { clsx } from 'clsx'
import { useEditorStore, selectCanExport } from '@/lib/store/editor'
import { runExport } from '@/lib/export/runExport'
import { useToast } from '@/components/ui/Toast'
import type { ExportFormat } from '@/types'

const FORMAT_OPTIONS: { value: ExportFormat; label: string; tier: 'free' | 'pro' }[] = [
  { value: 'gif',  label: 'GIF',  tier: 'free' },
  { value: 'webm', label: 'WebM', tier: 'free' },
  { value: 'css',  label: 'CSS',  tier: 'pro'  },
]

const EXPORT_LABELS: Record<ExportFormat, string> = {
  gif:    'Export GIF',
  webm:   'Export WebM',
  lottie: 'Export Lottie JSON',
  css:    'Export CSS',
  embed:  'Copy Embed',
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
    setExportState({ isRunning: true, progress: 0, error: null })
    await runExport({
      format,
      activePresetId,
      params,
      onProgress: (pct) => setExportState({ progress: pct }),
      onError:    (msg) => { setExportState({ error: msg }); toast(msg, 'error') },
      onSuccess:  (msg) => toast(msg, 'success'),
    })
    setExportState({ isRunning: false, progress: 0 })
  }

  const exportLabel = exportState.isRunning
    ? (exportState.progress < 32 ? 'Capturing frames…' : exportState.progress < 90 ? 'Rendering…' : 'Encoding…')
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
        {/* Lottie phase text */}
        {format === 'lottie' && (
          <p className="text-[10px] leading-[14px] text-muted bg-surface-2 rounded px-2 py-1.5">
            <span className="font-semibold text-warning">Note:</span> Lottie export now includes full layer-level transform keyframes (scale, opacity, rotate, translate). <span className="font-medium">Shape-level path animation (drawing lines/morphing)</span> is coming soon.
          </p>
        )}

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
