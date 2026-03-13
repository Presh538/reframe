'use client'

import {
  useRef,
  useEffect,
  useCallback,
  type DragEvent,
  type ChangeEvent,
} from 'react'
import { clsx } from 'clsx'
import { useEditorStore, selectSvgReady } from '@/lib/store/editor'
import { getPreset } from '@/lib/presets'
import { clearAnimations } from '@/lib/svg/animate'
import { countFragments } from '@/lib/svg/fragment'
import {
  validateSvgFile,
  sanitizeSvgClient,
  normalizeSvgElement,
  extractLayerInfo,
} from '@/lib/svg/sanitize'
import { useToast } from '@/components/ui/Toast'

export function PreviewStage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const svgSource      = useEditorStore(s => s.svgSource)
  const activePresetId = useEditorStore(s => s.activePresetId)
  const params         = useEditorStore(s => s.params)
  const isPlaying      = useEditorStore(s => s.isPlaying)
  const isFragmented   = useEditorStore(s => s.isFragmented)
  const svgReady       = useEditorStore(selectSvgReady)

  const setSvgSource     = useEditorStore(s => s.setSvgSource)
  const setActivePreset  = useEditorStore(s => s.setActivePreset)
  const setPlaying       = useEditorStore(s => s.setPlaying)
  const fragmentElements = useEditorStore(s => s.fragmentElements)

  const elementCount = svgSource ? countFragments(svgSource) : 0

  const injectSvg = useCallback((source: string) => {
    if (!containerRef.current) return
    const doc = new DOMParser().parseFromString(source, 'image/svg+xml')
    const parseError = doc.querySelector('parsererror')
    if (parseError) { toast('Could not parse SVG', 'error'); return }
    const svgEl = doc.querySelector('svg') as SVGSVGElement | null
    if (!svgEl) { toast('No <svg> element found', 'error'); return }
    normalizeSvgElement(svgEl)
    containerRef.current.querySelectorAll('svg').forEach(el => el.remove())
    containerRef.current.appendChild(svgEl)
    svgRef.current = containerRef.current.querySelector('svg')
  }, [toast])

  useEffect(() => {
    if (!svgSource || !containerRef.current) return
    injectSvg(svgSource)
    if (!activePresetId) return
    const preset = getPreset(activePresetId)
    if (!preset || !svgRef.current) return
    clearAnimations(svgRef.current)
    preset.apply(svgRef.current, params)
    setPlaying(true)
  }, [svgSource, activePresetId, params, injectSvg, setPlaying])

  useEffect(() => {
    if (!svgRef.current) return
    svgRef.current.querySelectorAll<SVGElement>('[data-rf-anim]').forEach(el => {
      el.style.animationPlayState = isPlaying ? 'running' : 'paused'
    })
  }, [isPlaying])

  const handleFile = useCallback(async (file: File) => {
    const validation = validateSvgFile(file)
    if (!validation.ok) { toast(validation.error!, 'error'); return }
    const raw = await file.text()
    const sanitized = await sanitizeSvgClient(raw)
    try {
      const res = await fetch('/api/validate-svg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ svg: sanitized }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Validation failed', 'error'); return }
      setSvgSource(data.sanitized, file.name, data.layers)
      setActivePreset(null)
      toast(`${file.name} loaded`, 'success')
    } catch {
      const doc = new DOMParser().parseFromString(sanitized, 'image/svg+xml')
      const svgEl = doc.querySelector('svg') as SVGSVGElement | null
      if (svgEl) {
        normalizeSvgElement(svgEl)
        setSvgSource(sanitized, file.name, extractLayerInfo(svgEl))
        setActivePreset(null)
        toast(`${file.name} loaded`, 'success')
      }
    }
  }, [toast, setSvgSource, setActivePreset])

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleFragment = () => {
    fragmentElements()
    toast('SVG fragmented — pick a preset to animate', 'success')
  }

  return (
    <section
      className="flex-1 flex flex-col canvas-bg overflow-hidden relative"
      onDragOver={e => e.preventDefault()}
      onDrop={onDrop}
    >
      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
        {svgReady ? (
          <div
            ref={containerRef}
            className="rf-preview-container flex items-center justify-center"
            style={{ width: '100%', height: '100%', padding: '48px' }}
          />
        ) : (
          <div
            className="flex flex-col items-center gap-4 text-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div
              className="w-[56px] h-[56px] rounded-xl border border-dashed border-border flex items-center justify-center text-muted"
              style={{ background: 'rgba(124,92,252,0.06)' }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 3v10M6 7l4-4 4 4" stroke="#7c5cfc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text)]">Drop an SVG to get started</p>
              <p className="text-xs text-muted mt-0.5">or click to browse</p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
              className="h-[30px] px-4 text-xs font-medium bg-accent hover:bg-accent-hover text-white rounded transition-colors"
            >
              Choose SVG
            </button>
          </div>
        )}
      </div>

      {svgReady && (
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-t border-border bg-surface/80 backdrop-blur-sm">
          <div className="flex items-center gap-1">
            <ToolBtn onClick={() => setPlaying(!isPlaying)} title={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <rect x="2" y="1.5" width="3" height="9" rx="1"/>
                  <rect x="7" y="1.5" width="3" height="9" rx="1"/>
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M2.5 1.5l8 4.5-8 4.5V1.5z"/>
                </svg>
              )}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </ToolBtn>

            <ToolBtn
              onClick={() => useEditorStore.getState().updateParam('speed', params.speed)}
              title="Restart"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <path d="M2 6a4 4 0 1 1 1 2.8"/>
                <path d="M2 4v2h2"/>
              </svg>
              <span>Restart</span>
            </ToolBtn>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleFragment}
              title="Fragment vectors into individually animatable elements"
              className={clsx(
                'flex items-center gap-1.5 h-[26px] px-2.5 rounded text-xs transition-all',
                isFragmented
                  ? 'bg-success/10 text-success border border-success/25 cursor-default'
                  : 'text-muted hover:text-[var(--text)] hover:bg-surface-2 border border-transparent'
              )}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="2.5" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                <circle cx="9.5" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                <circle cx="2.5" cy="9.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                <circle cx="9.5" cy="9.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M4 2.5h4M4 9.5h4M2.5 4v4M9.5 4v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <span>{isFragmented ? `${elementCount} elements` : 'Fragment'}</span>
            </button>

            {!isFragmented && elementCount > 0 && (
              <span className="text-xs text-muted">{elementCount} elements</span>
            )}
          </div>

          <ToolBtn onClick={() => fileInputRef.current?.click()} title="Open SVG">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2v6M3.5 4.5L6 2l2.5 2.5"/>
              <path d="M2 8.5V10h8V8.5"/>
            </svg>
            <span>Open</span>
          </ToolBtn>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".svg,image/svg+xml"
        className="hidden"
        onChange={onInputChange}
      />
    </section>
  )
}

function ToolBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center gap-1.5 h-[26px] px-2.5 rounded text-xs text-muted hover:text-[var(--text)] hover:bg-surface-2 transition-colors"
    >
      {children}
    </button>
  )
}
