'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useEditorStore, selectCanExport, selectSvgReady, liveSvgRef } from '@/lib/store/editor'
import { runExport } from '@/lib/export/runExport'
import {
  trackExportModalOpened,
  trackExportStarted,
  trackShareLinkCreated,
} from '@/lib/analytics'
import { SPRING } from '@/lib/motion'
import { useToast } from '@/components/ui/Toast'
import { CodeSheet } from '@/components/ui/CodeSheet'
import { computeSequenceDuration } from '@/lib/svg/animate'
import type { ExportFormat } from '@/types'

const FORMATS_3D = [
  { value: 'gif'   as const, label: 'Export GIF'  },
  { value: 'webm'  as const, label: 'Export WebM' },
  { value: 'embed' as const, label: 'Copy Code'    },
]
type Format3D = 'gif' | 'webm' | 'embed'

interface TopBarProps {
  appMode?: 'animate' | '3d'
  onExport3D?: () => void
  onExportWebM3D?: () => void
  onCopyEmbed3D?: () => void
  canExport3D?: boolean
  asset3dFileName?: string
  asset3dKind?: 'svg' | 'image'
  onChangeFile3D?: () => void
  onBrowseLibrary?: () => void
  isLibraryOpen?: boolean
}

export function TopBar({
  appMode = 'animate',
  onExport3D, onExportWebM3D, onCopyEmbed3D, canExport3D, asset3dFileName, asset3dKind,
  onChangeFile3D, onBrowseLibrary, isLibraryOpen,
}: TopBarProps) {
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [format3d,        setFormat3d]        = useState<Format3D>('gif')
  const [embedCode,       setEmbedCode]       = useState<string | null>(null)

  const format         = useEditorStore(s => s.format)
  const exportState    = useEditorStore(s => s.export)
  const activePresetId = useEditorStore(s => s.activePresetId)
  const params         = useEditorStore(s => s.params)
  const canExport      = useEditorStore(selectCanExport)
  const svgFileName    = useEditorStore(s => s.svgFileName)
  const setFormat      = useEditorStore(s => s.setFormat)
  const setExportState = useEditorStore(s => s.setExportState)

  const { toast } = useToast()

  // ── Share handler ─────────────────────────────────────────────
  // Captures the live animated SVG, sends it to POST /api/share,
  // and returns the shareable URL. All sanitization is done server-side;
  // the button in ExportModal copies the URL to clipboard.
  const handleShare = async (): Promise<string> => {
    const svgEl = liveSvgRef.current
    if (!svgEl) throw new Error('No SVG loaded — apply a preset first')

    const res = await fetch('/api/share', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ svg: svgEl.outerHTML }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(
        (data as { error?: string }).error ?? 'Could not create share link',
      )
    }

    const { url } = await res.json() as { url: string }
    return url
  }

  const handleExport = async (quality?: number, fps?: number) => {
    if (appMode === 'animate') {
      if (!canExport || !activePresetId) return
      trackExportStarted({ format, quality, fps })
      setExportState({ isRunning: true, progress: 0, error: null })
      await runExport({
        format, activePresetId, params, quality, fps,
        onProgress:  p    => setExportState({ progress: p }),
        onError:     msg  => { setExportState({ error: msg }); toast(msg, 'error') },
        onSuccess:   msg  => toast(msg, 'success'),
        onEmbedCode: html => setEmbedCode(html),
      })
      setExportState({ isRunning: false, progress: 0 })
    } else {
      if (!canExport3D) return
      if      (format3d === 'embed') onCopyEmbed3D?.()
      else if (format3d === 'webm')  onExportWebM3D?.()
      else                           onExport3D?.()
    }
  }

  const displayFileName  = appMode === 'animate' ? svgFileName  : asset3dFileName
  const displayCanExport = appMode === 'animate' ? canExport    : canExport3D
  const isRunning        = exportState.isRunning

  const handleChangeBtn = () => {
    if (appMode === 'animate') {
      document.querySelector<HTMLInputElement>('input[type="file"][accept*="svg"]')?.click()
    } else {
      onChangeFile3D?.()
    }
  }

  return (
    <>
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-10 pt-[30px] pointer-events-none z-30"
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING.entrance, delay: 0.03 }}
      >

        {/* ── Left: Logo + file pill ── */}
        <div className="pointer-events-auto">
          <div
            className="inline-flex items-center gap-[8px] px-[18px] py-[12px]"
            style={{
              width: displayFileName ? 365 : 62,
              height: 62,
              borderRadius: 58,
              background: 'var(--filepanel-bg)',
              border: 'var(--filepanel-border)',
              backdropFilter: 'var(--filepanel-blur)',
              WebkitBackdropFilter: 'var(--filepanel-blur)',
              overflow: 'hidden',
            }}
          >
            <ReframeLogo />

            {displayFileName && (
              <>
                <button
                  onClick={handleChangeBtn}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: 38,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 40,
                    padding: '10px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--filepanel-inner-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <img src="/figma-icons/folder.svg" alt="" width={18} height={18} style={{ flexShrink: 0, opacity: 0.61, filter: 'var(--pill-icon-filter)' }} />
                    <span style={{
                      fontFamily: 'var(--font-geist-sans), sans-serif',
                      fontWeight: 400,
                      fontSize: 14,
                      color: '#979797',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {displayFileName}
                    </span>
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-geist-sans), sans-serif',
                    fontWeight: 400,
                    fontSize: 14,
                    color: '#D06523',
                    whiteSpace: 'nowrap',
                  }}>
                    Change
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Right: Export button ── */}
        <div className="pointer-events-auto">
          <motion.button
            onClick={displayCanExport && !isRunning ? () => { setExportModalOpen(true); trackExportModalOpened() } : undefined}
            disabled={!displayCanExport || isRunning}
            whileTap={displayCanExport && !isRunning ? { scale: 0.96 } : undefined}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 32px',
              borderRadius: 40,
              border: 'none',
              background: displayCanExport ? '#D06523' : 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(17px)',
              WebkitBackdropFilter: 'blur(17px)',
              cursor: displayCanExport && !isRunning ? 'pointer' : 'not-allowed',
              opacity: displayCanExport ? 1 : 0.42,
              boxShadow: 'inset 0px 2px 4px rgba(57,57,57,0.45)',
              transition: 'background 0.15s',
              overflow: 'hidden',
            }}
            onMouseEnter={e => { if (displayCanExport && !isRunning) e.currentTarget.style.background = '#E07028' }}
            onMouseLeave={e => { e.currentTarget.style.background = displayCanExport ? '#D06523' : 'rgba(255,255,255,0.06)' }}
          >
            <span style={{
              fontFamily: 'var(--font-geist-sans), sans-serif',
              fontWeight: 400,
              fontSize: 14,
              letterSpacing: 0.028,
              color: displayCanExport ? '#FFFFFF' : '#D06523',
              whiteSpace: 'nowrap',
            }}>
              {isRunning ? `${exportState.progress}%` : 'Export'}
            </span>
          </motion.button>
        </div>
      </motion.div>

      <AnimatePresence>
        {embedCode !== null && (
          <CodeSheet
            key="embed-sheet"
            code={embedCode}
            title="Embed Snippet"
            onClose={() => setEmbedCode(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {exportModalOpen && (
          <ExportModal
            key="export-modal"
            appMode={appMode}
            format={format}
            setFormat={setFormat}
            format3d={format3d}
            setFormat3d={setFormat3d}
            asset3dKind={asset3dKind}
            isRunning={isRunning}
            progress={exportState.progress}
            onExport={async (quality, fps) => { await handleExport(quality, fps); setExportModalOpen(false) }}
            onShare={handleShare}
            onClose={() => setExportModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function ReframeLogo() {
  return <img src="/figma-icons/platform-logo.svg" alt="" width={26} height={26} style={{ flexShrink: 0, filter: 'var(--pill-icon-filter)' }} />
}

// ── Export Modal ─────────────────────────────────────────────────

const f: React.CSSProperties = { fontFamily: 'var(--font-geist-sans), sans-serif' }

const QUALITY_STEPS = [10, 25, 50, 75, 90, 100]
const FPS_STEPS = [5, 10, 16, 20, 25, 33, 50]

const ANIMATE_FORMATS: { value: ExportFormat; label: string; locked?: boolean }[] = [
  { value: 'gif',    label: 'GIF'    },
  { value: 'webm',   label: 'WebM'   },
  { value: 'lottie', label: 'Lottie' },
  { value: 'css',    label: 'CSS',    locked: true },
]

function ExportModal({
  appMode, format, setFormat, format3d, setFormat3d, asset3dKind,
  isRunning, progress, onExport, onShare, onClose,
}: {
  appMode:      'animate' | '3d'
  format:       ExportFormat
  setFormat:    (f: ExportFormat) => void
  format3d:     Format3D
  setFormat3d:  (f: Format3D) => void
  asset3dKind?: 'svg' | 'image'
  isRunning:    boolean
  progress:     number
  onExport:     (quality: number, fps: number) => Promise<void>
  onShare:      () => Promise<string>
  onClose:      () => void
}) {
  const [quality, setQuality] = useState(100)
  const [fps, setFps] = useState(25)

  // ── Share button state ─────────────────────────────────────────
  type ShareState = 'idle' | 'loading' | 'copied'
  const [shareState, setShareState] = useState<ShareState>('idle')
  const { toast } = useToast()

  const handleShareClick = async () => {
    if (shareState !== 'idle') return
    setShareState('loading')
    try {
      const url = await onShare()
      // Copy to clipboard; fall back gracefully if blocked (e.g. non-HTTPS dev)
      await navigator.clipboard.writeText(url).catch(() => {})
      trackShareLinkCreated()
      setShareState('copied')
      setTimeout(() => setShareState('idle'), 3000)
    } catch (err) {
      setShareState('idle')
      toast(err instanceof Error ? err.message : 'Could not create share link', 'error')
    }
  }

  const shareLabel =
    shareState === 'loading' ? 'Generating…' :
    shareState === 'copied'  ? '✓ Link copied' :
    'Shareable link'

  const formats3d     = FORMATS_3D.filter(fmt => fmt.value !== 'embed' || asset3dKind === 'svg')
  const formatOptions = appMode === 'animate' ? ANIMATE_FORMATS : formats3d

  const exportLabel = isRunning
    ? (progress < 32 ? 'Capturing frames…' : progress < 90 ? 'Rendering…' : 'Encoding…')
    : 'Export to file'

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 select-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        style={{
          background: 'rgba(17,17,17,0.70)',
          backdropFilter: 'blur(7px)',
          WebkitBackdropFilter: 'blur(7px)',
        }}
        onClick={onClose}
      />

      <motion.div
        className="fixed z-50"
        style={{ top: '50%', left: '50%', translateX: '-50%', translateY: '-50%' }}
        initial={{ opacity: 0, scale: 0.98, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Export animation"
          onClick={e => e.stopPropagation()}
          style={{
            position: 'relative',
            width: 489,
            height: 555,
            borderRadius: 28,
            overflow: 'hidden',
            background: 'rgba(46,46,46,0.85)',
            border: '0.5px solid rgba(36,36,49,0.64)',
            boxShadow: '0 16px 70px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(25px)',
            WebkitBackdropFilter: 'blur(25px)',
            boxSizing: 'border-box',
          }}
        >
          <h2
            style={{
              ...f,
              position: 'absolute',
              left: 15.5,
              top: 15.5,
              margin: 0,
              fontSize: 18,
              lineHeight: '23px',
              fontWeight: 600,
              letterSpacing: 0.2,
              color: '#FFFFFF',
            }}
          >
            Export animation
          </h2>

          <motion.button
            onClick={onClose}
            aria-label="Close"
            whileTap={{ scale: 0.9 }}
            style={{
              position: 'absolute',
              left: 448.5,
              top: 15.5,
              width: 24,
              height: 24,
              border: 'none',
              background: 'transparent',
              padding: 0,
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <img
              src="/figma-icons/xmark.svg"
              alt=""
              width={24}
              height={24}
              style={{ display: 'block', width: 24, height: 24, maxWidth: 'none' }}
            />
          </motion.button>

          <ExportLivePreview />

          <div style={{ position: 'absolute', left: 15.5, top: 326.5, width: 457 }}>
            <ControlLabel>Format option</ControlLabel>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center', width: '100%' }}>
              {formatOptions.map(fmt => {
                const active  = appMode === 'animate' ? format === fmt.value : format3d === fmt.value
                const locked  = (fmt as { locked?: boolean }).locked ?? false
                return (
                  <FormatChip
                    key={fmt.value}
                    label={fmt.label}
                    active={active}
                    locked={locked}
                    onClick={() => {
                      if (locked) return
                      appMode === 'animate'
                        ? setFormat(fmt.value as ExportFormat)
                        : setFormat3d(fmt.value as Format3D)
                    }}
                  />
                )
              })}
            </div>
          </div>

          <div style={{ position: 'absolute', left: 15.5, top: 403.5, width: 222 }}>
            <ControlLabel>Quality</ControlLabel>
            <ExportSlider value={quality} steps={QUALITY_STEPS} displayValue={`${quality}%`} onChange={setQuality} disabled={appMode === 'animate' && format === 'lottie'} />
          </div>

          <div style={{ position: 'absolute', left: 251.5, top: 403.5, width: 222 }}>
            <ControlLabel>Frame Rate</ControlLabel>
            <ExportSlider value={fps} steps={FPS_STEPS} displayValue={`${fps} FPS`} onChange={setFps} disabled={appMode === 'animate' && format === 'lottie'} />
          </div>

          {isRunning && (
            <div style={{
              position: 'absolute',
              left: 15.5,
              top: 480,
              width: 457,
              height: 3,
              borderRadius: 99,
              background: 'rgba(255,255,255,0.07)',
              overflow: 'hidden',
            }}>
              <motion.div
                style={{ height: '100%', background: '#D06523', borderRadius: 99, originX: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'linear' }}
              />
            </div>
          )}

          <motion.button
            type="button"
            onClick={handleShareClick}
            disabled={shareState !== 'idle'}
            whileHover={shareState === 'idle' ? { backgroundColor: 'rgba(255,255,255,0.09)', borderColor: 'rgba(255,255,255,0.12)' } : undefined}
            whileTap={shareState === 'idle' ? { scale: 0.97 } : undefined}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{
              position: 'absolute',
              left: 15.5,
              top: 496.5,
              height: 42,
              padding: '12px 10px',
              borderRadius: 40,
              border: '0.8px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              ...f,
              fontSize: 14,
              lineHeight: '18px',
              fontWeight: 400,
              color: shareState === 'copied' ? '#4ADE80' : '#FFFFFF',
              letterSpacing: 0.028,
              cursor: shareState !== 'idle' ? 'default' : 'pointer',
              opacity: shareState === 'loading' ? 0.65 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxSizing: 'border-box',
              transition: 'color 0.2s, opacity 0.2s',
            }}
          >
            {shareState === 'loading' && (
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                <path d="M6.5 1.5A5 5 0 1 1 1.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )}
            {shareLabel}
          </motion.button>

          <motion.button
            onClick={isRunning ? undefined : () => onExport(quality, fps)}
            disabled={isRunning}
            whileHover={!isRunning ? { backgroundColor: '#E07028' } : undefined}
            whileTap={!isRunning ? { scale: 0.97 } : undefined}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{
              position: 'absolute',
              right: 15.5,
              top: 496.5,
              height: 42,
              padding: '12px 24px',
              borderRadius: 40,
              border: 'none',
              background: '#D06523',
              boxShadow: 'inset 0px 2px 4px rgba(57,57,57,0.45)',
              backdropFilter: 'blur(17px)',
              WebkitBackdropFilter: 'blur(17px)',
              ...f,
              fontSize: 14,
              fontWeight: 400,
              color: '#FFFFFF',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              letterSpacing: 0.028,
              opacity: isRunning ? 0.75 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {isRunning && (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                <path d="M7 1.5A5.5 5.5 0 1 1 1.5 7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )}
            {isRunning ? `${exportLabel} ${progress}%` : exportLabel}
          </motion.button>
        </div>
      </motion.div>
    </>
  )
}

// ── Shared sub-components ────────────────────────────────────────

function ExportLivePreview() {
  const containerRef = useRef<HTMLDivElement>(null)
  const params = useEditorStore(s => s.params)

  useEffect(() => {
    let loopTimer: ReturnType<typeof setTimeout> | null = null

    const clearLoop = () => {
      if (loopTimer !== null) {
        clearTimeout(loopTimer)
        loopTimer = null
      }
    }

    const scheduleLoop = (svgEl: SVGSVGElement) => {
      clearLoop()
      const animEls = Array.from(svgEl.querySelectorAll<SVGElement>('[data-rf-anim]'))
      if (!animEls.length) return
      if (animEls.some(el => el.style.animation.includes('infinite'))) return

      const sequenceMs = computeSequenceDuration(svgEl)
      const waitMs = params.direction === 'in-out' ? sequenceMs * 2 : sequenceMs

      loopTimer = setTimeout(() => {
        const savedAnimations = animEls.map(el => el.style.animation)
        const savedDelays = animEls.map(el => parseFloat(el.getAttribute('data-rf-delay') ?? '0'))

        animEls.forEach(el => { el.style.animation = 'none' })
        void svgEl.getBoundingClientRect()
        animEls.forEach((el, index) => {
          el.style.animation = savedAnimations[index]
          el.style.animationDelay = `${savedDelays[index]}s`
          el.style.animationPlayState = 'running'
        })

        scheduleLoop(svgEl)
      }, waitMs)
    }

    const frame = requestAnimationFrame(() => {
      const container = containerRef.current
      const svgEl = liveSvgRef.current
      if (!container || !svgEl) return

      const clone = svgEl.cloneNode(true) as SVGSVGElement
      clone.style.cssText = ''
      clone.style.width = '100%'
      clone.style.height = '100%'
      clone.style.maxWidth = '100%'
      clone.style.maxHeight = '100%'
      clone.style.display = 'block'
      clone.style.overflow = 'visible'
      clone.removeAttribute('width')
      clone.removeAttribute('height')

      container.replaceChildren(clone)
      scheduleLoop(clone)
    })

    return () => {
      cancelAnimationFrame(frame)
      clearLoop()
    }
  }, [params.direction])

  return (
    <div
      aria-label="Live export preview"
      style={{
        position: 'absolute',
        left: 7.5,
        top: 51.5,
        width: 473,
        height: 266,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#1B1B1B',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1.5px, transparent 1.5px)',
        backgroundSize: '27px 27px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

function ControlLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ ...f, margin: '0 0 8px', fontSize: 14, lineHeight: '18px', fontWeight: 400, color: '#979797', letterSpacing: 0.028 }}>
      {children}
    </p>
  )
}

function FormatChip({ label, active, locked, onClick }: { label: string; active: boolean; locked?: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={!locked ? { scale: 0.96 } : undefined}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      style={{
        flex: 1,
        minWidth: 0,
        height: 34,
        padding: 8,
        borderRadius: 8,
        border: active ? '0.6px solid #FF6043' : '0.6px solid transparent',
        background: active ? '#000000' : '#0E0E0F',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center',
        gap: 4,
        cursor: locked ? 'default' : 'pointer',
      }}
      onMouseEnter={e => { if (!active && !locked) e.currentTarget.style.background = '#151516' }}
      onMouseLeave={e => { if (!locked) e.currentTarget.style.background = active ? '#000000' : '#0E0E0F' }}
    >
      <span style={{ ...f, fontSize: 14, lineHeight: '18px', fontWeight: 400, color: active ? '#FFFFFF' : '#979797', letterSpacing: 0.028, whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {locked && (
        <span style={{
          ...f,
          fontSize: 14,
          lineHeight: '18px',
          fontWeight: 400,
          letterSpacing: 0.028,
          whiteSpace: 'nowrap',
          color: 'transparent',
          backgroundImage: 'linear-gradient(180deg, #FF6043 13.889%, #A94EB2 62.964%, rgba(78,90,178,0.5) 108.33%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
        }}>
          Soon
        </span>
      )}
    </motion.button>
  )
}

function ExportSlider({
  value, steps, displayValue, onChange, disabled = false,
}: {
  value: number
  steps: number[]
  displayValue: string
  onChange: (value: number) => void
  /** Non-interactive + dimmed — e.g. Lottie ignores quality/frame rate. */
  disabled?: boolean
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const selectedIndex = Math.max(0, steps.indexOf(value))
  const clampedRatio = steps.length > 1 ? selectedIndex / (steps.length - 1) : 0
  const thumbWidth = 11

  const updateFromPointer = (clientX: number) => {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const nextRatio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const index = Math.round(nextRatio * (steps.length - 1))
    onChange(steps[index])
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    e.preventDefault()
    updateFromPointer(e.clientX)
    const move = (ev: PointerEvent) => updateFromPointer(ev.clientX)
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      style={{ position: 'relative', width: '100%', height: 34, borderRadius: 8, overflow: 'hidden', background: '#0E0E0F', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}
    >
      <img
        src="/figma-icons/slider-grid.svg"
        alt=""
        width={528}
        height={481}
        draggable={false}
        style={{
          position: 'absolute',
          left: 'calc(50% - 16.5px)',
          top: 'calc(50% + 0.5px)',
          width: 528,
          height: 481,
          maxWidth: 'none',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
      <div style={{
        position: 'absolute',
        left: 0,
        top: -4,
        width: `calc(${clampedRatio} * (100% - ${thumbWidth}px) + ${thumbWidth / 2}px)`,
        height: 42,
        background: '#232323',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        left: `calc(${clampedRatio} * (100% - ${thumbWidth}px))`,
        top: 0,
        width: thumbWidth,
        height: 34,
        borderRadius: 10,
        background: '#565656',
        pointerEvents: 'none',
        zIndex: 1,
      }} />
      <span style={{
        ...f,
        position: 'absolute',
        left: 211,
        top: 8,
        transform: 'translateX(-100%)',
        fontSize: 14,
        fontWeight: 400,
        lineHeight: 'normal',
        color: '#979797',
        textAlign: 'right',
        letterSpacing: 0.028,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: 2,
      }}>
        {displayValue}
      </span>
    </div>
  )
}
