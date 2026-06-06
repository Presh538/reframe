'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { AnimatePresence } from 'motion/react'
import { motion } from 'motion/react'
import { SPRING } from '@/lib/motion'
import { useEditorStore, selectSvgReady, undoEditor, redoEditor } from '@/lib/store/editor'
import { LibraryBrowser } from './LibraryBrowser'
import { KeyboardShortcutsOverlay } from '@/components/ui/KeyboardShortcutsOverlay'
import { ControlsSidebar } from './ControlsSidebar'
import { AIPromptBar } from './AIPromptBar'

export type AppMode = 'animate' | '3d'

const PreviewStage = dynamic(() => import('./PreviewStage').then(m => ({ default: m.PreviewStage })), { ssr: false })
const TopBar       = dynamic(() => import('./TopBar').then(m => ({ default: m.TopBar })),             { ssr: false })
const PresetPanel  = dynamic(() => import('./PresetPanel').then(m => ({ default: m.PresetPanel })),   { ssr: false })
const SmoothingPanel = dynamic(() => import('./SmoothingPanel').then(m => ({ default: m.SmoothingPanel })), { ssr: false })

const ThreeDMode        = dynamic(() => import('../threed/ThreeDMode').then(m => ({ default: m.ThreeDMode })),               { ssr: false })
const ThreeDPresetPanel = dynamic(() => import('../threed/ThreeDPresetPanel').then(m => ({ default: m.ThreeDPresetPanel })), { ssr: false })
const ThreeDEasingPanel = dynamic(() => import('../threed/ThreeDEasingPanel').then(m => ({ default: m.ThreeDEasingPanel })), { ssr: false })

type ActivePanel = 'presets' | 'smoothing' | null

export function EditorLayout() {
  const [activePanel,    setActivePanel]    = useState<ActivePanel>(null)
  const [appMode,        setAppMode]        = useState<AppMode>('animate')
  const [isLibraryOpen,  setIsLibraryOpen]  = useState(false)
  const [showShortcuts,  setShowShortcuts]  = useState(false)

  // 3D Bridge states
  const [export3dFn,       setExport3dFn]       = useState<(() => void) | null>(null)
  const [exportWebM3dFn,   setExportWebM3dFn]   = useState<(() => void) | null>(null)
  const [copyEmbed3dFn,    setCopyEmbed3dFn]    = useState<(() => void) | null>(null)
  const [changeFile3dFn,   setChangeFile3dFn]   = useState<(() => void) | null>(null)
  const [canExport3d,      setCanExport3d]      = useState(false)
  const [asset3dFileName,  setAsset3dFileName]  = useState<string | undefined>()
  const [asset3dKind,      setAsset3dKind]      = useState<'svg' | 'image' | undefined>()

  const svgReady       = useEditorStore(selectSvgReady)
  const updateParam    = useEditorStore(s => s.updateParam)
  const params         = useEditorStore(s => s.params)
  const restartAnimation = useEditorStore(s => s.restartAnimation)
  const resetView      = useEditorStore(s => s.resetView)

  useEffect(() => {
    if (svgReady) setIsLibraryOpen(false)
  }, [svgReady])

  // ── Global keyboard shortcuts ──────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const inInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
      if (inInput) return

      if (e.key === '?') { e.preventDefault(); setShowShortcuts(s => !s); return }
      if (e.key === 'Escape') { setShowShortcuts(false); setActivePanel(null); return }

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
    <div className="relative h-screen w-screen overflow-hidden canvas-bg">

      {/* Full-canvas preview (Animate mode) */}
      <AnimatePresence mode="popLayout">
        {appMode === 'animate' && (
          <motion.div
            key="animate-stage"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            <PreviewStage
              onBrowseLibrary={() => setIsLibraryOpen(true)}
              libraryOpen={isLibraryOpen}
            />
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
        {appMode === 'animate' && svgReady    && activePanel === 'presets'   && <PresetPanel   key="a-presets"  onClose={closePanel} />}
        {appMode === 'animate' && svgReady    && activePanel === 'smoothing' && <SmoothingPanel key="a-easing"  onClose={closePanel} />}
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

      {/* AI Prompt Bar — animate mode with file loaded */}
      <AnimatePresence>
        {appMode === 'animate' && svgReady && (
          <AIPromptBar key="ai-bar" />
        )}
      </AnimatePresence>

      {/* Mode switcher — bottom left */}
      <div className="absolute bottom-5 left-5 z-30 pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={SPRING.entrance}
          className="flex items-center px-[6px] py-[5px] gap-[2px]"
          style={{ borderRadius: 74, background: 'rgba(20,20,20,0.85)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)' }}
        >
          <ModeSwitchBtn
            active={appMode === 'animate'}
            onClick={() => { setAppMode('animate'); setActivePanel(null) }}
            icon={<FlowIcon active={appMode === 'animate'} />}
            activeColor="#F97316"
          >
            Flow
          </ModeSwitchBtn>

          <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', flexShrink: 0, marginLeft: 2, marginRight: 2 }} />

          <ModeSwitchBtn
            active={appMode === '3d'}
            onClick={() => { setAppMode('3d'); setActivePanel(null) }}
            icon={<SculptIcon active={appMode === '3d'} />}
            activeColor="#00C945"
          >
            Sculpt
          </ModeSwitchBtn>
        </motion.div>
      </div>

      {/* ? Shortcuts hint */}
      <div className="absolute bottom-5 right-5 z-30 pointer-events-auto">
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRING.entrance}
          onClick={() => setShowShortcuts(s => !s)}
          title="Keyboard shortcuts (?)"
          style={{
            width: 32, height: 32, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(20,20,20,0.85)',
            backdropFilter: 'blur(16px)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-geist-sans), sans-serif',
            fontWeight: 600, fontSize: 14, color: '#555',
            boxShadow: showShortcuts ? '0 0 0 1.5px #F97316' : 'none',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#888' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#555' }}
        >
          ?
        </motion.button>
      </div>

      <KeyboardShortcutsOverlay open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  )
}

function ModeSwitchBtn({
  children, active, onClick, icon, activeColor,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  activeColor: string
}) {
  return (
    <motion.button
      onClick={onClick}
      className="flex items-center gap-[6px] px-[10px] py-[7px] cursor-pointer"
      style={{
        borderRadius: 34,
        background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
        border: 'none',
        fontFamily: 'var(--font-geist-sans), sans-serif',
        fontWeight: 500,
        fontSize: 14,
        lineHeight: '20px',
        color: active ? activeColor : '#555',
        whiteSpace: 'nowrap',
        transition: 'background 0.18s, color 0.18s',
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
    >
      {icon}
      {children}
    </motion.button>
  )
}

function FlowIcon({ active }: { active: boolean }) {
  const c = active ? '#F97316' : '#555'
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <path fillRule="evenodd" clipRule="evenodd" d="M18.7752 16.2753C19.0193 16.0312 19.0193 15.6355 18.7752 15.3914L16.6919 13.3081C16.4478 13.064 16.0521 13.064 15.808 13.3081C15.5639 13.5522 15.5639 13.9479 15.808 14.192L16.8244 15.2084H14.5833C14.2381 15.2084 13.9583 15.4882 13.9583 15.8334C13.9583 16.1785 14.2381 16.4584 14.5833 16.4584H16.8244L15.808 17.4747C15.5639 17.7188 15.5639 18.1146 15.808 18.3586C16.0521 18.6027 16.4478 18.6027 16.6919 18.3586L18.7752 16.2753Z" fill={c}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M7.47481 4.19192C7.23073 3.94784 7.23073 3.55212 7.47481 3.30804L9.55814 1.2247C9.80222 0.980627 10.1979 0.980627 10.442 1.2247C10.6861 1.46878 10.6861 1.86451 10.442 2.10859L8.80063 3.74998L10.442 5.39137C10.6861 5.63545 10.6861 6.03118 10.442 6.27525C10.1979 6.51933 9.80222 6.51933 9.55814 6.27525L7.47481 4.19192Z" fill={c}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M8.12508 3.75C8.12508 3.40482 8.4049 3.125 8.75008 3.125C12.547 3.125 15.6251 6.20304 15.6251 10C15.6251 13.797 12.547 16.875 8.75008 16.875H1.66675C1.32157 16.875 1.04175 16.5952 1.04175 16.25C1.04175 15.9048 1.32157 15.625 1.66675 15.625H8.75008C11.8567 15.625 14.3751 13.1066 14.3751 10C14.3751 6.8934 11.8567 4.375 8.75008 4.375C8.4049 4.375 8.12508 4.09518 8.12508 3.75Z" fill={c}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M6.17114 4.27089C6.34371 4.56983 6.24127 4.95207 5.94232 5.12464C4.25697 6.09755 3.125 7.91696 3.125 10C3.125 11.267 3.54317 12.4346 4.24927 13.3747C4.45658 13.6507 4.4009 14.0424 4.1249 14.2498C3.84891 14.4571 3.45712 14.4014 3.24981 14.1254C2.3867 12.9763 1.875 11.547 1.875 10C1.875 7.45231 3.26113 5.22909 5.31739 4.04207C5.61633 3.8695 5.99857 3.97195 6.17114 4.27089Z" fill={c}/>
    </svg>
  )
}

function SculptIcon({ active }: { active: boolean }) {
  const c = active ? '#00C945' : '#555'
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <path fillRule="evenodd" clipRule="evenodd" d="M10.5463 18.7448C10.2066 18.9335 9.79343 18.9335 9.45365 18.7448L2.45365 14.8559C2.0965 14.6575 1.875 14.281 1.875 13.8725L1.87498 6.12754C1.87498 5.71897 2.09649 5.34252 2.45364 5.14411L9.45365 1.25522C9.79343 1.06645 10.2066 1.06645 10.5463 1.25522L17.5463 5.14411C17.9035 5.34252 18.125 5.71897 18.125 6.12753L18.125 13.8725C18.125 14.281 17.9035 14.6575 17.5463 14.8559L10.5463 18.7448ZM10 17.6184L16.875 13.7989L16.875 6.20108L10 2.38164L3.12498 6.20108L3.125 13.7989L10 17.6184Z" fill={c}/>
    </svg>
  )
}
