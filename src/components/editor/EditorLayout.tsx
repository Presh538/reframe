'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { AnimatePresence } from 'motion/react'
import { motion } from 'motion/react'
import { SPRING } from '@/lib/motion'
import { useEditorStore, selectSvgReady, undoEditor, redoEditor } from '@/lib/store/editor'
import { LibraryBrowser } from './LibraryBrowser'
import { KeyboardShortcutsOverlay } from '@/components/ui/KeyboardShortcutsOverlay'

export type AppMode = 'animate' | '3d'

// Lazy-load PreviewStage — pulls in motion/react + all SVG animation utilities;
// deferring it keeps the EditorLayout chunk lean and reduces Time-to-Interactive.
const PreviewStage = dynamic(() => import('./PreviewStage').then(m => ({ default: m.PreviewStage })), { ssr: false })

// Lazy-load TopBar — motion/react + IconBounce + Zustand bundle, not needed for initial paint
const TopBar = dynamic(() => import('./TopBar').then(m => ({ default: m.TopBar })), { ssr: false })

// Lazy-load heavy panels — only needed when the user opens them
const PresetPanel    = dynamic(() => import('./PresetPanel').then(m => ({ default: m.PresetPanel })),       { ssr: false })
const SmoothingPanel = dynamic(() => import('./SmoothingPanel').then(m => ({ default: m.SmoothingPanel })), { ssr: false })

// 3D mode + panels
const ThreeDMode        = dynamic(() => import('../threed/ThreeDMode').then(m => ({ default: m.ThreeDMode })),               { ssr: false })
const ThreeDPresetPanel = dynamic(() => import('../threed/ThreeDPresetPanel').then(m => ({ default: m.ThreeDPresetPanel })), { ssr: false })
const ThreeDEasingPanel = dynamic(() => import('../threed/ThreeDEasingPanel').then(m => ({ default: m.ThreeDEasingPanel })), { ssr: false })

// Lazy-load BottomBar — large icon + motion bundle, not needed for initial paint
const BottomBar         = dynamic(() => import('./BottomBar').then(m => ({ default: m.BottomBar })),               { ssr: false })

type ActiveTab = 'presets' | 'smoothing'

export function EditorLayout() {
  const [activeTab,      setActiveTab]      = useState<ActiveTab | null>(null)
  const [appMode,        setAppMode]        = useState<AppMode>('animate')
  const [isLibraryOpen,    setIsLibraryOpen]    = useState(false)
  const [showShortcuts,    setShowShortcuts]    = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 3D Bridge states
  const [export3dFn,       setExport3dFn]       = useState<(() => void) | null>(null)
  const [exportWebM3dFn,   setExportWebM3dFn]   = useState<(() => void) | null>(null)
  const [copyEmbed3dFn,    setCopyEmbed3dFn]    = useState<(() => void) | null>(null)
  const [changeFile3dFn,   setChangeFile3dFn]   = useState<(() => void) | null>(null)
  const [canExport3d,    setCanExport3d]    = useState(false)
  const [asset3dFileName, setAsset3dFileName] = useState<string | undefined>()
  const [asset3dKind,    setAsset3dKind]    = useState<'svg' | 'image' | undefined>()

  const svgReady       = useEditorStore(selectSvgReady)
  const updateParam    = useEditorStore(s => s.updateParam)
  const params         = useEditorStore(s => s.params)
  const restartAnimation = useEditorStore(s => s.restartAnimation)
  const resetView      = useEditorStore(s => s.resetView)

  // ── Library open/close logic ──────────────────────────────────
  // Do NOT auto-open on mount — the PreviewStage empty state is the primary
  // landing view. The library is opened explicitly via the "Browse templates"
  // button in the empty state or the library icon in the TopBar.
  useEffect(() => {
    if (svgReady) setIsLibraryOpen(false)
  }, [svgReady])

  // ── Global keyboard shortcuts ─────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const inInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      if (inInput) return

      // ? — toggle shortcuts overlay
      if (e.key === '?') { e.preventDefault(); setShowShortcuts(s => !s); return }

      // Esc — close overlays
      if (e.key === 'Escape') { setShowShortcuts(false); return }

      // Undo / Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoEditor(); return }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redoEditor(); return }

      // Mode switch — 1 = Flow, 2 = Sculpt
      if (e.key === '1') { setAppMode('animate'); setActiveTab(null); return }
      if (e.key === '2') { setAppMode('3d'); setActiveTab(null); return }

      // Flow-mode only shortcuts
      if (appMode !== 'animate') return

      // R — restart animation
      if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey) { restartAnimation(); return }

      // 0 — reset view
      if (e.key === '0') { resetView(); return }

      // [ / ] — decrease / increase speed
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

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(prev => prev === tab ? null : tab)
  }

  // Close any open panel when the SVG is cleared
  const closePanel = () => setActiveTab(null)

  // Stable bridge callbacks — must never change reference or ThreeDMode's
  // useEffect([onExportReady, ...]) fires → setState → re-render → infinite loop
  const handleExportReady      = useCallback((fn: () => void) => setExport3dFn(() => fn),       [])
  const handleExportWebMReady  = useCallback((fn: () => void) => setExportWebM3dFn(() => fn),   [])
  const handleCopyEmbedReady   = useCallback((fn: () => void) => setCopyEmbed3dFn(() => fn),    [])
  const handleAssetChange      = useCallback((hasAsset: boolean, name?: string, kind?: 'svg' | 'image') => {
    setCanExport3d(hasAsset)
    setAsset3dFileName(name)
    setAsset3dKind(kind)
  }, [])
  const handleRequestFileInput = useCallback((fn: () => void)                                   => setChangeFile3dFn(() => fn), [])

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

      {/* Full-canvas 3D viewer */}
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

      {/* TopBar — always visible; handles empty state internally */}
      <TopBar
        activeTab={activeTab ?? 'presets'}
        onTabChange={handleTabChange}
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

      {/* Library browser — full-screen overlay (empty state + mid-session).
          Empty state (svgReady=false): isModal=false → position:absolute so the
          TopBar at z-30 floats above it and the Reframe logo stays visible.
          Mid-session (svgReady=true): isModal=true → position:fixed, z=200 so
          it covers the full viewport as a proper focused modal overlay.       */}
      <AnimatePresence>
        {isLibraryOpen && (
          <LibraryBrowser
            key="library"
            isModal={!!svgReady}
            onClose={svgReady ? () => setIsLibraryOpen(false) : undefined}
            onUpload={() => {
              // Delegate to the hidden file input inside PreviewStage
              document.querySelector<HTMLInputElement>('input[type="file"][accept*="svg"]')?.click()
            }}
          />
        )}
      </AnimatePresence>

      {/* Mode Switcher (Bottom-Left) */}
      <div className="absolute bottom-5 left-5 z-30 pointer-events-auto">
        <motion.div
           initial={{ opacity: 0, y: 10, scale: 0.95 }}
           animate={{ opacity: 1, y: 0, scale: 1 }}
           transition={SPRING.entrance}
           className="flex items-center px-[6px] py-[5px] backdrop-blur-md gap-[2px]"
           style={{ borderRadius: 74, background: 'rgba(229,229,229,0.60)' }}
        >
          <ModeSwitchBtn
            active={appMode === 'animate'}
            onClick={() => { setAppMode('animate'); setActiveTab(null) }}
            icon={<FlowTabIcon active={appMode === 'animate'} />}
            activeColor="#FF4040"
          >
            Flow
          </ModeSwitchBtn>

          <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(0,0,0,0.15)', flexShrink: 0, marginLeft: 2, marginRight: 2 }} />

          <ModeSwitchBtn
            active={appMode === '3d'}
            onClick={() => { setAppMode('3d'); setActiveTab(null) }}
            icon={<SculptTabIcon active={appMode === '3d'} />}
            activeColor="#00C945"
          >
            Sculpt
          </ModeSwitchBtn>
        </motion.div>
      </div>

      {/* Panels — only render when the matching mode has an asset loaded */}
      <AnimatePresence>
        {appMode === 'animate' && svgReady    && activeTab === 'presets'   && <PresetPanel       key="a-presets"  onClose={closePanel} />}
        {appMode === 'animate' && svgReady    && activeTab === 'smoothing' && <SmoothingPanel    key="a-easing"   onClose={closePanel} />}
        {appMode === '3d'      && canExport3d && activeTab === 'presets'   && <ThreeDPresetPanel key="3d-presets" onClose={closePanel} />}
        {appMode === '3d'      && canExport3d && activeTab === 'smoothing' && <ThreeDEasingPanel key="3d-easing"  onClose={closePanel} />}
      </AnimatePresence>

      {/* BottomBar (Animate mode only) */}
      <AnimatePresence>
        {appMode === 'animate' && svgReady && (
          <BottomBar key="bottombar" onBrowseLibrary={() => setIsLibraryOpen(true)} />
        )}
      </AnimatePresence>

      {/* ? Shortcut hint button — bottom right */}
      <div className="absolute bottom-5 right-5 z-30 pointer-events-auto">
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRING.entrance}
          onClick={() => setShowShortcuts(s => !s)}
          title="Keyboard shortcuts (?)"
          style={{
            width: 32, height: 32, borderRadius: '50%', border: 'none',
            background: 'rgba(229,229,229,0.70)',
            backdropFilter: 'blur(8px)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-geist-sans), sans-serif',
            fontWeight: 600, fontSize: 14, color: '#888',
            transition: 'background 0.12s, color 0.12s',
            boxShadow: showShortcuts ? '0 0 0 1.5px #3f37c9' : 'none',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; e.currentTarget.style.color = '#111' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(229,229,229,0.70)'; e.currentTarget.style.color = '#888' }}
        >
          ?
        </motion.button>
      </div>

      {/* Keyboard shortcuts overlay */}
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
        background: active ? 'rgba(255,255,255,0.95)' : 'transparent',
        border: 'none',
        fontFamily: 'var(--font-geist-sans), sans-serif',
        fontWeight: 500,
        fontSize: 14,
        lineHeight: '20px',
        color: active ? activeColor : '#AFAFAF',
        whiteSpace: 'nowrap',
        transition: 'background 0.18s, color 0.18s, box-shadow 0.18s',
        boxShadow: active ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
    >
      {icon}
      {children}
    </motion.button>
  )
}

function FlowTabIcon({ active }: { active: boolean }) {
  const c = active ? '#FF4040' : '#AFAFAF'
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <path fillRule="evenodd" clipRule="evenodd" d="M18.7752 16.2753C19.0193 16.0312 19.0193 15.6355 18.7752 15.3914L16.6919 13.3081C16.4478 13.064 16.0521 13.064 15.808 13.3081C15.5639 13.5522 15.5639 13.9479 15.808 14.192L16.8244 15.2084H14.5833C14.2381 15.2084 13.9583 15.4882 13.9583 15.8334C13.9583 16.1785 14.2381 16.4584 14.5833 16.4584H16.8244L15.808 17.4747C15.5639 17.7188 15.5639 18.1146 15.808 18.3586C16.0521 18.6027 16.4478 18.6027 16.6919 18.3586L18.7752 16.2753Z" fill={c}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M7.47481 4.19192C7.23073 3.94784 7.23073 3.55212 7.47481 3.30804L9.55814 1.2247C9.80222 0.980627 10.1979 0.980627 10.442 1.2247C10.6861 1.46878 10.6861 1.86451 10.442 2.10859L8.80063 3.74998L10.442 5.39137C10.6861 5.63545 10.6861 6.03118 10.442 6.27525C10.1979 6.51933 9.80222 6.51933 9.55814 6.27525L7.47481 4.19192Z" fill={c}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M8.12508 3.75C8.12508 3.40482 8.4049 3.125 8.75008 3.125C12.547 3.125 15.6251 6.20304 15.6251 10C15.6251 13.797 12.547 16.875 8.75008 16.875H1.66675C1.32157 16.875 1.04175 16.5952 1.04175 16.25C1.04175 15.9048 1.32157 15.625 1.66675 15.625H8.75008C11.8567 15.625 14.3751 13.1066 14.3751 10C14.3751 6.8934 11.8567 4.375 8.75008 4.375C8.4049 4.375 8.12508 4.09518 8.12508 3.75Z" fill={c}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M6.17114 4.27089C6.34371 4.56983 6.24127 4.95207 5.94232 5.12464C4.25697 6.09755 3.125 7.91696 3.125 10C3.125 11.267 3.54317 12.4346 4.24927 13.3747C4.45658 13.6507 4.4009 14.0424 4.1249 14.2498C3.84891 14.4571 3.45712 14.4014 3.24981 14.1254C2.3867 12.9763 1.875 11.547 1.875 10C1.875 7.45231 3.26113 5.22909 5.31739 4.04207C5.61633 3.8695 5.99857 3.97195 6.17114 4.27089Z" fill={c}/>
    </svg>
  )
}

function SculptTabIcon({ active }: { active: boolean }) {
  const c = active ? '#00C945' : '#AFAFAF'
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <path d="M9.99984 19.1667C10.4601 19.1667 10.8332 18.7936 10.8332 18.3334C10.8332 17.8731 10.4601 17.5 9.99984 17.5C9.5396 17.5 9.1665 17.8731 9.1665 18.3334C9.1665 18.7936 9.5396 19.1667 9.99984 19.1667Z" fill={c}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M8.5415 18.3334C8.5415 19.1388 9.19442 19.7917 9.99984 19.7917C10.8053 19.7917 11.4582 19.1388 11.4582 18.3334C11.4582 17.5279 10.8053 16.875 9.99984 16.875C9.19442 16.875 8.5415 17.5279 8.5415 18.3334ZM9.99984 18.5417C9.88478 18.5417 9.7915 18.4484 9.7915 18.3334C9.7915 18.2183 9.88478 18.125 9.99984 18.125C10.1149 18.125 10.2082 18.2183 10.2082 18.3334C10.2082 18.4484 10.1149 18.5417 9.99984 18.5417Z" fill={c}/>
      <path d="M2.49984 6.66669C2.96007 6.66669 3.33317 6.29359 3.33317 5.83335C3.33317 5.37312 2.96007 5.00002 2.49984 5.00002C2.0396 5.00002 1.6665 5.37312 1.6665 5.83335C1.6665 6.29359 2.0396 6.66669 2.49984 6.66669Z" fill={c}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M1.0415 5.83335C1.0415 6.63877 1.69442 7.29169 2.49984 7.29169C3.30525 7.29169 3.95817 6.63877 3.95817 5.83335C3.95817 5.02794 3.30525 4.37502 2.49984 4.37502C1.69442 4.37502 1.0415 5.02794 1.0415 5.83335ZM2.49984 6.04169C2.38478 6.04169 2.2915 5.94841 2.2915 5.83335C2.2915 5.71829 2.38478 5.62502 2.49984 5.62502C2.6149 5.62502 2.70817 5.71829 2.70817 5.83335C2.70817 5.94841 2.6149 6.04169 2.49984 6.04169Z" fill={c}/>
      <path d="M2.49984 15C2.96007 15 3.33317 14.6269 3.33317 14.1667C3.33317 13.7064 2.96007 13.3333 2.49984 13.3333C2.0396 13.3333 1.6665 13.7064 1.6665 14.1667C1.6665 14.6269 2.0396 15 2.49984 15Z" fill={c}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M1.0415 14.1667C1.0415 14.9721 1.69442 15.625 2.49984 15.625C3.30525 15.625 3.95817 14.9721 3.95817 14.1667C3.95817 13.3613 3.30525 12.7083 2.49984 12.7083C1.69442 12.7083 1.0415 13.3613 1.0415 14.1667ZM2.49984 14.375C2.38478 14.375 2.2915 14.2817 2.2915 14.1667C2.2915 14.0516 2.38478 13.9583 2.49984 13.9583C2.6149 13.9583 2.70817 13.9516 2.70817 14.1667C2.70817 14.2817 2.6149 14.375 2.49984 14.375Z" fill={c}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M10.5463 18.7448C10.2066 18.9335 9.79343 18.9335 9.45365 18.7448L2.45365 14.8559C2.0965 14.6575 1.875 14.281 1.875 13.8725L1.87498 6.12754C1.87498 5.71897 2.09649 5.34252 2.45364 5.14411L9.45365 1.25522C9.79343 1.06645 10.2066 1.06645 10.5463 1.25522L17.5463 5.14411C17.9035 5.34252 18.125 5.71897 18.125 6.12753L18.125 13.8725C18.125 14.281 17.9035 14.6575 17.5463 14.8559L10.5463 18.7448ZM10 17.6184L16.875 13.7989L16.875 6.20108L10 2.38164L3.12498 6.20108L3.125 13.7989L10 17.6184Z" fill={c}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M17.6297 5.76128C17.4621 5.45954 17.0816 5.35083 16.7799 5.51846L10.0001 9.28502L3.24394 5.53163C2.9422 5.36399 2.5617 5.47271 2.39407 5.77445C2.22643 6.07619 2.33515 6.45669 2.63689 6.62432L9.45372 10.4114C9.79349 10.6002 10.2066 10.6002 10.5464 10.4114L17.3869 6.61116C17.6886 6.44353 17.7974 6.06302 17.6297 5.76128Z" fill={c}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M10 18.125C9.65482 18.125 9.375 17.8452 9.375 17.5V10C9.375 9.65482 9.65482 9.375 10 9.375C10.3452 9.375 10.625 9.65482 10.625 10L10.625 17.5C10.625 17.8452 10.3452 18.125 10 18.125Z" fill={c}/>
    </svg>
  )
}
