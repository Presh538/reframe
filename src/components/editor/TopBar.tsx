'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useEditorStore, selectCanExport, selectSvgReady } from '@/lib/store/editor'
import { runExport } from '@/lib/export/runExport'
import { SPRING } from '@/lib/motion'
import { useToast } from '@/components/ui/Toast'
import { CodeSheet } from '@/components/ui/CodeSheet'
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

  const handleExport = async () => {
    if (appMode === 'animate') {
      if (!canExport || !activePresetId) return
      setExportState({ isRunning: true, progress: 0, error: null })
      await runExport({
        format, activePresetId, params,
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
              background: '#1B1B1B',
              border: '0.5px solid rgba(36,36,49,0.64)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
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
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <img src="/figma-icons/folder.svg" alt="" width={18} height={18} style={{ flexShrink: 0, opacity: 0.61 }} />
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
            onClick={displayCanExport && !isRunning ? () => setExportModalOpen(true) : undefined}
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
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(17px)',
              WebkitBackdropFilter: 'blur(17px)',
              cursor: displayCanExport && !isRunning ? 'pointer' : 'not-allowed',
              opacity: displayCanExport ? 1 : 0.42,
              boxShadow: 'inset 0px 2px 4px rgba(57,57,57,0.45)',
              transition: 'background 0.15s',
              overflow: 'hidden',
            }}
            onMouseEnter={e => { if (displayCanExport && !isRunning) e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
          >
            <span style={{
              fontFamily: 'var(--font-geist-sans), sans-serif',
              fontWeight: 400,
              fontSize: 14,
              letterSpacing: 0.028,
              color: '#D06523',
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
            onExport={async () => { await handleExport(); setExportModalOpen(false) }}
            onClose={() => setExportModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function ReframeLogo() {
  return <img src="/figma-icons/platform-logo.svg" alt="" width={26} height={26} style={{ flexShrink: 0 }} />
}

// ── Export Modal ─────────────────────────────────────────────────

const f: React.CSSProperties = { fontFamily: 'var(--font-geist-sans), sans-serif' }

const ANIMATE_FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'gif',    label: 'GIF'    },
  { value: 'webm',   label: 'WebM'   },
  { value: 'lottie', label: 'Lottie' },
  { value: 'css',    label: 'CSS'    },
]

function ExportModal({
  appMode, format, setFormat, format3d, setFormat3d, asset3dKind,
  isRunning, progress, onExport, onClose,
}: {
  appMode:      'animate' | '3d'
  format:       ExportFormat
  setFormat:    (f: ExportFormat) => void
  format3d:     Format3D
  setFormat3d:  (f: Format3D) => void
  asset3dKind?: 'svg' | 'image'
  isRunning:    boolean
  progress:     number
  onExport:     () => Promise<void>
  onClose:      () => void
}) {
  const formats3d = FORMATS_3D.filter(f => f.value !== 'embed' || asset3dKind === 'svg')

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        className="fixed z-50"
        style={{ top: '50%', left: '50%', translateX: '-50%', translateY: '-50%' }}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={{    opacity: 0, scale: 0.97, y: 4 }}
        transition={{ type: 'spring', stiffness: 480, damping: 30, mass: 0.6 }}
      >
        <div style={{
          width: 480,
          padding: 28,
          borderRadius: 20,
          background: '#141414',
          border: '0.5px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ ...f, fontSize: 15, fontWeight: 600, color: '#FFFFFF', letterSpacing: 0.02 }}>Export</span>
            <motion.button
              onClick={onClose}
              whileTap={{ scale: 0.9 }}
              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'rgba(255,255,255,0.06)', borderRadius: 8, cursor: 'pointer' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1L11 11M11 1L1 11" stroke="#888" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </motion.button>
          </div>

          {/* Format */}
          <Section label="Format">
            <div style={{ display: 'flex', gap: 6 }}>
              {(appMode === 'animate' ? ANIMATE_FORMATS : formats3d).map(fmt => {
                const active = appMode === 'animate' ? format === fmt.value : format3d === fmt.value
                return (
                  <motion.button
                    key={fmt.value}
                    onClick={() => appMode === 'animate' ? setFormat(fmt.value as ExportFormat) : setFormat3d(fmt.value as Format3D)}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    style={{
                      height: 36, padding: '0 16px',
                      borderRadius: 8, border: 'none',
                      background: active ? 'rgba(255,255,255,0.12)' : '#0E0E0F',
                      ...f, fontSize: 13, fontWeight: active ? 500 : 400,
                      color: active ? '#FFFFFF' : '#888',
                      cursor: 'pointer',
                      transition: 'background 0.12s, color 0.12s',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#1A1A1A' }}
                    onMouseLeave={e => { e.currentTarget.style.background = active ? 'rgba(255,255,255,0.12)' : '#0E0E0F' }}
                  >
                    {fmt.label}
                  </motion.button>
                )
              })}
            </div>
          </Section>

          <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)' }} />

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
            <motion.button
              onClick={onClose}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={{
                height: 38, padding: '0 20px',
                borderRadius: 40, border: 'none',
                background: 'rgba(255,255,255,0.06)',
                ...f, fontSize: 14, fontWeight: 400,
                color: '#888', cursor: 'pointer',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
            >
              Cancel
            </motion.button>

            <motion.button
              onClick={isRunning ? undefined : onExport}
              disabled={isRunning}
              whileTap={!isRunning ? { scale: 0.96 } : undefined}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={{
                height: 38, padding: '0 24px',
                borderRadius: 40, border: 'none',
                background: 'rgba(255,255,255,0.06)',
                boxShadow: 'inset 0px 2px 4px rgba(57,57,57,0.45)',
                backdropFilter: 'blur(17px)',
                WebkitBackdropFilter: 'blur(17px)',
                ...f, fontSize: 14, fontWeight: 400,
                color: isRunning ? '#888' : '#D06523',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                letterSpacing: 0.028,
                transition: 'background 0.12s',
                minWidth: 100,
              }}
              onMouseEnter={e => { if (!isRunning) e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
            >
              {isRunning ? `${progress}%` : 'Export to file…'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={{ ...f, fontSize: 13, fontWeight: 500, color: '#666', letterSpacing: 0.02 }}>{label}</span>
      {children}
    </div>
  )
}
