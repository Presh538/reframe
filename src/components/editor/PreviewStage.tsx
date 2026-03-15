'use client'

import { useRef, useEffect, useCallback, useState, type DragEvent, type ChangeEvent } from 'react'
import { useEditorStore, selectSvgReady } from '@/lib/store/editor'
import { getPreset } from '@/lib/presets'
import { clearAnimations } from '@/lib/svg/animate'
import { validateSvgFile, sanitizeSvgClient, normalizeSvgElement, extractLayerInfo } from '@/lib/svg/sanitize'
import { useToast } from '@/components/ui/Toast'

export function PreviewStage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef       = useRef<SVGSVGElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast }    = useToast()

  const svgSource      = useEditorStore(s => s.svgSource)
  const activePresetId = useEditorStore(s => s.activePresetId)
  const params         = useEditorStore(s => s.params)
  const isPlaying      = useEditorStore(s => s.isPlaying)
  const svgReady       = useEditorStore(selectSvgReady)

  const setSvgSource    = useEditorStore(s => s.setSvgSource)
  const setActivePreset = useEditorStore(s => s.setActivePreset)
  const setPlaying      = useEditorStore(s => s.setPlaying)

  const [isDragOver, setIsDragOver] = useState(false)
  // Track drag enter/leave depth to avoid flicker from child elements
  const dragDepth = useRef(0)

  // ── SVG injection ────────────────────────────────────────────
  const injectSvg = useCallback((source: string) => {
    if (!containerRef.current) return
    const doc = new DOMParser().parseFromString(source, 'image/svg+xml')
    if (doc.querySelector('parsererror')) { toast('Could not parse SVG', 'error'); return }
    const svgEl = doc.querySelector('svg') as SVGSVGElement | null
    if (!svgEl) { toast('No <svg> element found', 'error'); return }
    normalizeSvgElement(svgEl)
    containerRef.current.querySelectorAll('svg').forEach(el => el.remove())
    containerRef.current.appendChild(svgEl)
    svgRef.current = containerRef.current.querySelector('svg')
  }, [toast])

  // ── Apply preset ─────────────────────────────────────────────
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

  // ── Play / pause ─────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current) return
    svgRef.current.querySelectorAll<SVGElement>('[data-rf-anim]').forEach(el => {
      el.style.animationPlayState = isPlaying ? 'running' : 'paused'
    })
  }, [isPlaying])

  // ── File upload ──────────────────────────────────────────────
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

  const onDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    dragDepth.current++
    if (dragDepth.current === 1) setIsDragOver(true)
  }

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    dragDepth.current--
    if (dragDepth.current === 0) setIsDragOver(false)
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    dragDepth.current = 0
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <section
      className="absolute inset-0 flex items-center justify-center"
      onDragOver={e => e.preventDefault()}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        transition: 'background 0.15s',
        background: isDragOver ? 'rgba(63,55,201,0.06)' : 'transparent',
        borderRadius: isDragOver ? 16 : 0,
        outline: isDragOver ? '2px dashed rgba(63,55,201,0.35)' : '2px dashed transparent',
        outlineOffset: -8,
      }}
    >
      {svgReady ? (
        <div
          ref={containerRef}
          className="rf-preview-container flex items-center justify-center"
          style={{ width: '100%', height: '100%', padding: '100px 48px' }}
        />
      ) : (
        /* Empty state — Figma 297:5830 "Dash" */
        <div
          className="flex flex-col items-center gap-[16px] text-center cursor-pointer select-none"
          onClick={() => fileInputRef.current?.click()}
        >
          {/* Empty state file icon */}
          <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50" fill="none">
            <path d="M39.5833 20.8333H10.4167C8.11875 20.8333 6.25 22.7021 6.25 25V41.6667C6.25 43.9646 8.11875 45.8333 10.4167 45.8333H39.5833C41.8812 45.8333 43.75 43.9646 43.75 41.6667V25C43.75 22.7021 41.8812 20.8333 39.5833 20.8333ZM10.4167 12.5H39.5833V16.6667H10.4167V12.5ZM14.5833 4.16666H35.4167V8.33332H14.5833V4.16666Z" fill="#545454"/>
          </svg>

          {/* Text block */}
          <div className="flex flex-col gap-[8px] items-center w-full">
            <p
              style={{
                fontFamily: 'var(--font-geist-sans), sans-serif',
                fontWeight: 500,
                fontSize: 22,
                lineHeight: '24px',
                color: '#111111',
              }}
            >
              Drop an SVG to get started
            </p>
            <p
              style={{
                fontFamily: 'var(--font-geist-sans), sans-serif',
                fontWeight: 500,
                fontSize: 16,
                lineHeight: '24px',
                color: '#545454',
              }}
            >
              or click to browse
            </p>
          </div>

          {/* Upload button — Figma 297:5811 */}
          <button
            onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
            style={{
              background: '#3f37c9',
              borderRadius: 74,
              padding: '16px 18px',
              fontFamily: 'var(--font-geist-sans), sans-serif',
              fontWeight: 500,
              fontSize: 16,
              lineHeight: '24px',
              color: 'white',
              whiteSpace: 'nowrap',
              border: 'none',
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Upload SVG File
          </button>
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
