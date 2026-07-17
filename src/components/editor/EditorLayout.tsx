'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { AnimatePresence } from 'motion/react'
import { motion } from 'motion/react'
import { useEditorStore, selectSvgReady, undoEditor, redoEditor } from '@/lib/store/editor'
import { LibraryBrowser } from './LibraryBrowser'
import { KeyboardShortcutsOverlay } from '@/components/ui/KeyboardShortcutsOverlay'
import { ControlsSidebar } from './ControlsSidebar'
import { AIPromptBar } from './AIPromptBar'
import { useToast } from '@/components/ui/Toast'
import { sanitizeSvgClient, normalizeSvgElement, extractLayerInfo } from '@/lib/svg/sanitize'
import { EditorAnalytics } from '@/components/EditorAnalytics'

export type AppMode = 'animate' | '3d'
type CanvasTheme = 'dark' | 'light'

const PreviewStage = dynamic(() => import('./PreviewStage').then(m => ({ default: m.PreviewStage })), { ssr: false })
const TopBar       = dynamic(() => import('./TopBar').then(m => ({ default: m.TopBar })),             { ssr: false })
const ThreeDMode        = dynamic(() => import('../threed/ThreeDMode').then(m => ({ default: m.ThreeDMode })),               { ssr: false })
const ThreeDPresetPanel = dynamic(() => import('../threed/ThreeDPresetPanel').then(m => ({ default: m.ThreeDPresetPanel })), { ssr: false })
const ThreeDEasingPanel = dynamic(() => import('../threed/ThreeDEasingPanel').then(m => ({ default: m.ThreeDEasingPanel })), { ssr: false })

type ActivePanel = 'presets' | 'smoothing' | null

export function EditorLayout() {
  const [activePanel,    setActivePanel]    = useState<ActivePanel>(null)
  const [appMode,        setAppMode]        = useState<AppMode>('animate')
  const [isLibraryOpen,  setIsLibraryOpen]  = useState(false)
  const [showShortcuts,  setShowShortcuts]  = useState(false)
  const [showInfo,       setShowInfo]       = useState(false)
  const [canvasTheme,    setCanvasTheme]    = useState<CanvasTheme>('dark')

  // 3D Bridge states
  const [export3dFn,       setExport3dFn]       = useState<(() => void) | null>(null)
  const [exportWebM3dFn,   setExportWebM3dFn]   = useState<(() => void) | null>(null)
  const [copyEmbed3dFn,    setCopyEmbed3dFn]    = useState<(() => void) | null>(null)
  const [changeFile3dFn,   setChangeFile3dFn]   = useState<(() => void) | null>(null)
  const [canExport3d,      setCanExport3d]      = useState(false)
  const [asset3dFileName,  setAsset3dFileName]  = useState<string | undefined>()
  const [asset3dKind,      setAsset3dKind]      = useState<'svg' | 'image' | undefined>()

  const svgReady         = useEditorStore(selectSvgReady)
  const updateParam      = useEditorStore(s => s.updateParam)
  const params           = useEditorStore(s => s.params)
  const restartAnimation = useEditorStore(s => s.restartAnimation)
  const resetView        = useEditorStore(s => s.resetView)
  const setSvgSource     = useEditorStore(s => s.setSvgSource)
  const setActivePreset  = useEditorStore(s => s.setActivePreset)
  const { toast }        = useToast()

  useEffect(() => {
    if (svgReady) setIsLibraryOpen(false)
  }, [svgReady])

  // ── Canvas background theme — session-only. Always starts dark on reload. ──
  const handleCanvasThemeChange = useCallback((theme: CanvasTheme) => {
    setCanvasTheme(theme)
  }, [])

  // ── Try an example — loads Logo White.svg from /public ─────────
  const handleTryExample = useCallback(async () => {
    try {
      const raw = await fetch('/example-logo.svg').then(r => r.text())
      const sanitized = await sanitizeSvgClient(raw)

      // Try server validation first (same path as PreviewStage)
      try {
        const res = await fetch('/api/validate-svg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ svg: sanitized }),
        })
        if (res.ok) {
          const data = await res.json()
          setSvgSource(data.sanitized, 'Logo White.svg', data.layers)
          setActivePreset(null)
          return
        }
      } catch { /* fall through to client-side path */ }

      // Client-side fallback
      const doc = new DOMParser().parseFromString(sanitized, 'image/svg+xml')
      const svgEl = doc.querySelector('svg') as SVGSVGElement | null
      if (svgEl) {
        normalizeSvgElement(svgEl)
        setSvgSource(sanitized, 'Logo White.svg', extractLayerInfo(svgEl))
        setActivePreset(null)
      }
    } catch (err) {
      console.error('[handleTryExample]', err)
      toast('Could not load example', 'error')
    }
  }, [setSvgSource, setActivePreset, toast])

  // ── Global keyboard shortcuts ──────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const inInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
      if (inInput) return

      if (e.key === '?') { e.preventDefault(); setShowShortcuts(s => !s); return }
      if (e.key === 'Escape') { setShowShortcuts(false); setShowInfo(false); setActivePanel(null); return }

      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoEditor(); return }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redoEditor(); return }

      if (e.key === '1') { setAppMode('animate'); setActivePanel(null); return }
      if (e.key === '2') { setAppMode('3d');      setActivePanel(null); return }

      if (appMode !== 'animate') return

      if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey) { restartAnimation(); return }
      if (e.key === '0') { resetView(); return }

      if (e.key === '[') {
        e.preventDefault()
        const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]
        const idx = speeds.indexOf(params.speed)
        if (idx > 0) updateParam('speed', speeds[idx - 1])
        return
      }
      if (e.key === ']') {
        e.preventDefault()
        const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]
        const idx = speeds.indexOf(params.speed)
        if (idx < speeds.length - 1) updateParam('speed', speeds[idx + 1])
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [appMode, params.speed, updateParam, restartAnimation, resetView])

  const togglePanel = (panel: ActivePanel) => setActivePanel(prev => prev === panel ? null : panel)
  const closePanel  = () => setActivePanel(null)

  const handleExportReady      = useCallback((fn: () => void) => setExport3dFn(() => fn),      [])
  const handleExportWebMReady  = useCallback((fn: () => void) => setExportWebM3dFn(() => fn),  [])
  const handleCopyEmbedReady   = useCallback((fn: () => void) => setCopyEmbed3dFn(() => fn),   [])
  const handleAssetChange      = useCallback((hasAsset: boolean, name?: string, kind?: 'svg' | 'image') => {
    setCanExport3d(hasAsset); setAsset3dFileName(name); setAsset3dKind(kind)
  }, [])
  const handleRequestFileInput = useCallback((fn: () => void) => setChangeFile3dFn(() => fn),  [])

  return (
    <div className="relative h-screen w-screen overflow-hidden canvas-bg" data-canvas-theme={canvasTheme}>

      {/* Full-canvas preview (Animate mode) */}
      <AnimatePresence mode="popLayout">
        {appMode === 'animate' && (
          <motion.div
            key="animate-stage"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            <PreviewStage />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D viewer */}
      <AnimatePresence>
        {appMode === '3d' && (
          <ThreeDMode
            onExportReady={handleExportReady}
            onExportWebMReady={handleExportWebMReady}
            onCopyEmbedReady={handleCopyEmbedReady}
            onAssetChange={handleAssetChange}
            onRequestFileInput={handleRequestFileInput}
          />
        )}
      </AnimatePresence>

      {/* TopBar */}
      <TopBar
        appMode={appMode}
        onExport3D={export3dFn ?? undefined}
        onExportWebM3D={exportWebM3dFn ?? undefined}
        onCopyEmbed3D={copyEmbed3dFn ?? undefined}
        canExport3D={canExport3d}
        asset3dFileName={asset3dFileName}
        asset3dKind={asset3dKind}
        onChangeFile3D={changeFile3dFn ?? undefined}
        onBrowseLibrary={() => setIsLibraryOpen(true)}
        isLibraryOpen={isLibraryOpen}
      />

      {/* Controls sidebar — animate mode */}
      {appMode === 'animate' && (
        <ControlsSidebar
          onOpenPresets={() => togglePanel('presets')}
          onOpenEasing={()  => togglePanel('smoothing')}
          presetsOpen={activePanel === 'presets'}
          easingOpen={activePanel === 'smoothing'}
        />
      )}

      {/* Overlay panels (Preset/Easing pickers) */}
      <AnimatePresence>
        {appMode === '3d'      && canExport3d && activePanel === 'presets'   && <ThreeDPresetPanel key="3d-presets" onClose={closePanel} />}
        {appMode === '3d'      && canExport3d && activePanel === 'smoothing' && <ThreeDEasingPanel key="3d-easing"  onClose={closePanel} />}
      </AnimatePresence>

      {/* Library overlay */}
      <AnimatePresence>
        {isLibraryOpen && (
          <LibraryBrowser
            key="library"
            isModal={!!svgReady}
            onClose={svgReady ? () => setIsLibraryOpen(false) : undefined}
            onUpload={() => {
              document.querySelector<HTMLInputElement>('input[type="file"][accept*="svg"]')?.click()
            }}
          />
        )}
      </AnimatePresence>

      {/* AI Prompt Bar */}
      <AnimatePresence>
        {appMode === 'animate' && (
          <AIPromptBar key="ai-bar" isLight={canvasTheme === 'light'} />
        )}
      </AnimatePresence>

      {/* Empty-state modal overlay */}
      <AnimatePresence>
        {appMode === 'animate' && !svgReady && !isLibraryOpen && (
          <EmptyStateModal
            key="empty-modal"
            onBrowseLibrary={() => setIsLibraryOpen(true)}
            onTryExample={handleTryExample}
            onUpload={() => {
              document.querySelector<HTMLInputElement>('input[type="file"][accept*="svg"]')?.click()
            }}
          />
        )}
      </AnimatePresence>

      <CanvasThemeToggle theme={canvasTheme} onChange={handleCanvasThemeChange} />

      <InfoButton onClick={() => setShowInfo(true)} />

      <AnimatePresence>
        {showInfo && <InfoModal key="info-modal" onClose={() => setShowInfo(false)} />}
      </AnimatePresence>

      <KeyboardShortcutsOverlay open={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {/* Headless analytics observer — no UI, fires PostHog events on store changes */}
      <EditorAnalytics />
    </div>
  )
}

function CanvasThemeToggle({ theme, onChange }: { theme: CanvasTheme; onChange: (theme: CanvasTheme) => void }) {
  const isLight = theme === 'light'
  const options: { value: CanvasTheme; label: string; src: string }[] = [
    { value: 'dark',  label: 'Dark canvas background',  src: '/figma-icons/icon-moon.svg' },
    { value: 'light', label: 'Light canvas background', src: '/figma-icons/icon-sun.svg' },
  ]

  return (
    <div
      role="radiogroup"
      aria-label="Canvas background"
      style={{
        position: 'absolute',
        left: 40,
        bottom: 40,
        zIndex: 45,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: 14,
        borderRadius: 50,
        border: isLight ? 'none' : '0.8px solid rgba(255,255,255,0.06)',
        background: isLight ? '#EDEDED' : 'rgba(255,255,255,0.06)',
        boxShadow: isLight ? 'none' : '0 2px 4px 1px rgba(0,0,0,0.65), inset 0 2px 4px rgba(57,57,57,0.45)',
        backdropFilter: isLight ? 'none' : 'blur(17px)',
        WebkitBackdropFilter: isLight ? 'none' : 'blur(17px)',
      }}
    >
      {options.map(({ value, label, src }) => {
        const active = theme === value
        return (
          <motion.button
            key={value}
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => onChange(value)}
            whileHover={!active ? { backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.09)' } : undefined}
            whileTap={{ scale: 0.9 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              padding: 4,
              borderRadius: 20,
              border: 'none',
              background: active ? '#FFFFFF' : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            <img src={src} alt="" width={22} height={22} style={{ display: 'block', flexShrink: 0 }} />
          </motion.button>
        )
      })}
    </div>
  )
}

function InfoButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      aria-label="About Reframeo"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.94 }}
      style={{
        position: 'absolute',
        right: 40,
        bottom: 40,
        zIndex: 45,
        width: 52,
        height: 52,
        borderRadius: 40,
        border: 'var(--infobtn-border)',
        background: 'var(--infobtn-bg)',
        boxShadow: 'var(--infobtn-shadow)',
        backdropFilter: 'var(--infobtn-blur)',
        WebkitBackdropFilter: 'var(--infobtn-blur)',
        cursor: 'pointer',
        display: 'grid',
        placeItems: 'center',
        transition: 'background 0.15s, border-color 0.15s, transform 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--infobtn-hover-bg)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--infobtn-bg)' }}
    >
      <img
        src="/figma-icons/question.svg"
        alt=""
        width={24}
        height={24}
        style={{ display: 'block', width: 24, height: 24, maxWidth: 'none', flexShrink: 0, filter: 'var(--pill-icon-filter)' }}
      />
    </motion.button>
  )
}

function InfoModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 select-none"
      style={{
        zIndex: 80,
        background: 'rgba(17,17,17,0.70)',
        backdropFilter: 'blur(7px)',
        WebkitBackdropFilter: 'blur(7px)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.article
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          position: 'absolute',
          right: 92,
          bottom: 88,
          width: 554,
          maxHeight: 'calc(100vh - 140px)',
          maxWidth: 'calc(100vw - 124px)',
          borderRadius: 28,
          overflow: 'hidden',
          background: 'rgba(46,46,46,0.85)',
          border: '0.5px solid rgba(36,36,49,0.64)',
          boxShadow: '0 16px 70px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Scrollable body */}
        <div
          className="scrollbar-thin"
          style={{
            overflowY: 'auto',
            padding: '20px 20px 24px',
            fontFamily: 'var(--font-geist-sans), sans-serif',
            color: '#979797',
            fontSize: 13,
            lineHeight: '19px',
            fontWeight: 400,
            letterSpacing: 0.02,
          }}
        >
          {/* About */}
          <p style={{ margin: 0, fontSize: 13, lineHeight: '19px' }}>
            Reframe is a free browser tool for animating SVGs — built by{' '}
            <a
              href="https://www.prefolio.work/"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#D06523', textDecoration: 'underline', textUnderlineOffset: 2 }}
            >
              Precious Ogar
            </a>
            . Upload any SVG, describe the motion in plain English or pick from 30+ presets,
            then export to GIF, WebM, CSS, or Lottie JSON — no code, no installs, no learning curve.
          </p>

          {/* Divider */}
          <div style={{ margin: '18px 0', borderTop: '0.5px solid rgba(255,255,255,0.07)' }} />

          {/* How it works */}
          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 600, letterSpacing: 0.08, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
            How it works
          </p>
          <ol style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              ['Upload your SVG', 'Drag and drop any SVG — or start with an example.'],
              ['Animate with AI or a preset', 'Type how you want it to move, or pick from 30+ motion presets.'],
              ['Fine-tune speed and easing', 'Adjust timing until it feels right.'],
              ['Export or share', 'Download as GIF, WebM, CSS, or Lottie — or copy a share link.'],
            ].map(([title, desc]) => (
              <li key={title} style={{ paddingLeft: 4 }}>
                <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{title}</span>
                <span style={{ color: '#979797' }}> — {desc}</span>
              </li>
            ))}
          </ol>

          {/* Divider */}
          <div style={{ margin: '18px 0', borderTop: '0.5px solid rgba(255,255,255,0.07)' }} />

          {/* FAQ */}
          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 600, letterSpacing: 0.08, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
            Common questions
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              ['Can I animate SVGs with AI?', 'Yes. Type how you want it to move and Reframe\'s AI picks and applies the right animation — no timeline needed.'],
              ['Is it free?', 'Fully free, right in your browser. No account required.'],
              ['What formats can I export?', 'GIF (with transparent background option), WebM, CSS animation, and Lottie JSON — with adjustable quality and frame rate.'],
              ['Do I need After Effects or code?', 'No. Everything runs in the browser. Upload, animate, export — done.'],
            ].map(([q, a]) => (
              <div key={q}>
                <p style={{ margin: '0 0 2px', color: 'rgba(255,255,255,0.65)', fontWeight: 500, fontSize: 13 }}>{q}</p>
                <p style={{ margin: 0, fontSize: 13, lineHeight: '18px' }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.article>

      <motion.button
        onClick={onClose}
        aria-label="Close about Reframe"
        whileHover={{
          scale: 1.05,
          backgroundColor: 'rgba(255,255,255,0.09)',
          borderColor: 'rgba(255,255,255,0.12)',
        }}
        whileTap={{ scale: 0.94 }}
        style={{
          position: 'absolute',
          right: 40,
          bottom: 40,
          width: 52,
          height: 52,
          borderRadius: 40,
          border: '0.8px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.06)',
          boxShadow: '0 2px 4px 1px rgba(0,0,0,0.65), inset 0 2px 4px rgba(57,57,57,0.45)',
          backdropFilter: 'blur(17px)',
          WebkitBackdropFilter: 'blur(17px)',
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
          style={{ display: 'block', width: 24, height: 24, maxWidth: 'none', flexShrink: 0 }}
        />
      </motion.button>
    </motion.div>
  )
}

function EmptyStateModal({ onBrowseLibrary, onTryExample, onUpload }: { onBrowseLibrary: () => void; onTryExample: () => void; onUpload: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 flex items-start justify-center select-none"
      style={{
        zIndex: 35,
        background: 'rgba(17,17,17,0.70)',
        backdropFilter: 'blur(7px)',
        WebkitBackdropFilter: 'blur(7px)',
        paddingTop: 159,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        style={{
          position: 'relative',
          width: 554,
          height: 602,
          borderRadius: 28,
          overflow: 'hidden',
          background: 'rgba(46,46,46,0.85)',
          border: '0.5px solid rgba(36,36,49,0.64)',
          boxShadow: '0 16px 70px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 7.5,
            top: 7.5,
            width: 538,
            height: 344,
            borderRadius: 20,
            overflow: 'hidden',
          }}
        >
          <img
            src="/figma-icons/start-modal-preview.png"
            alt=""
            width={538}
            height={344}
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        <div style={{ position: 'absolute', left: 16, top: 368, width: 435 }}>
          <h1 style={{
            margin: 0,
            fontFamily: 'var(--font-geist-sans), sans-serif',
            fontSize: 22,
            lineHeight: '29px',
            fontWeight: 600,
            letterSpacing: 0.2,
            color: '#FFFFFF',
          }}>
            Turn static SVGs into motion in seconds
          </h1>
          <p style={{
            margin: '4px 0 0',
            fontFamily: 'var(--font-geist-sans), sans-serif',
            fontSize: 14,
            lineHeight: '18px',
            fontWeight: 400,
            letterSpacing: 0.028,
            color: '#979797',
          }}>
            Upload any SVG, choose a preset, and export a polished animation, without learning animation software.
          </p>
        </div>

        <div style={{ position: 'absolute', left: 16, top: 453, display: 'grid', gap: 8 }}>
          <FeatureLine strong="Instant motion:" text="Turn static design into something worth looking at" icon="keyframes" />
          <FeatureLine strong="Thoughtfully crafted:" text="Great motion without tweaking a hundred settings" icon="align" />
          <FeatureLine strong="Ready to share:" text="From upload to export in minutes" icon="spark" />
        </div>

        <motion.button
          onClick={onTryExample}
          whileHover={{
            scale: 1.03,
            backgroundColor: 'rgba(255,255,255,0.09)',
            borderColor: 'rgba(255,255,255,0.12)',
          }}
          whileTap={{ scale: 0.97 }}
          style={{
            position: 'absolute',
            left: 16,
            top: 548,
            height: 38,
            padding: '0 10px',
            borderRadius: 40,
            border: '0.8px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.05)',
            color: '#FFFFFF',
            fontFamily: 'var(--font-geist-sans), sans-serif',
            fontSize: 14,
            lineHeight: '18px',
            fontWeight: 400,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s, border-color 0.15s, transform 0.15s',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          Try an example
        </motion.button>

        <motion.button
          onClick={onUpload}
          aria-label="Upload SVG"
          whileHover={{ scale: 1.06, backgroundColor: '#E0762D' }}
          whileTap={{ scale: 0.92 }}
          style={{
            position: 'absolute',
            right: 8,
            bottom: 8,
            width: 55,
            height: 55,
            borderRadius: 40,
            border: 'none',
            background: '#D06523',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            transition: 'background 0.15s, transform 0.15s',
          }}
        >
          <img src="/figma-icons/plus.svg" alt="" width={34} height={34} />
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

function FeatureLine({ strong, text, icon }: { strong: string; text: string; icon: 'keyframes' | 'align' | 'spark' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 18 }}>
      <FeatureIcon type={icon} />
      <p style={{ margin: 0, fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 14, lineHeight: '18px', letterSpacing: 0.028, color: '#979797', whiteSpace: 'nowrap' }}>
        <span style={{ color: '#FFFFFF', fontWeight: 500 }}>{strong}</span>{' '}
        {text}
      </p>
    </div>
  )
}

function FeatureIcon({ type }: { type: 'keyframes' | 'align' | 'spark' }) {
  const src = {
    keyframes: '/figma-icons/keyframes.svg',
    align: '/figma-icons/keyframe-align-vertical.svg',
    spark: '/figma-icons/bright-crown.svg',
  }[type]

  return <img src={src} alt="" width={18} height={18} style={{ flexShrink: 0 }} />
}
