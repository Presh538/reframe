'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useEditorStore, selectCanExport, selectSvgReady } from '@/lib/store/editor'
import { runExport } from '@/lib/export/runExport'
import { SPRING } from '@/lib/motion'
import { useToast } from '@/components/ui/Toast'
import { CodeSheet } from '@/components/ui/CodeSheet'
import type { ExportFormat } from '@/types'

const FORMATS: { value: ExportFormat; label: string; desc?: string }[] = [
  { value: 'gif',    label: 'Export GIF',    desc: 'Animated image' },
  { value: 'webm',   label: 'Export WebM',   desc: 'High-quality video' },
  { value: 'embed',  label: 'Copy Embed',    desc: 'HTML snippet for any page' },
  { value: 'css',    label: 'Export CSS',    desc: 'Keyframes + bindings' },
  { value: 'lottie', label: 'Export Lottie', desc: 'JSON for Lottie player' },
]

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
  const [formatOpen, setFormatOpen] = useState(false)
  const [format3d,   setFormat3d]   = useState<Format3D>('gif')
  const [embedCode,  setEmbedCode]  = useState<string | null>(null)

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
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-5 pointer-events-none z-30"
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING.entrance, delay: 0.03 }}
      >

        {/* ── Left: Logo + file pill ── */}
        <div className="pointer-events-auto">
          <div
            className="inline-flex items-center gap-[8px] px-[10px] py-[8px]"
            style={{
              borderRadius: 34,
              background: 'rgba(20,20,20,0.88)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <ReframeLogo />

            {!displayFileName && appMode === 'animate' && onBrowseLibrary && !isLibraryOpen && (
              <>
                <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
                <button
                  onClick={onBrowseLibrary}
                  style={{
                    background: 'rgba(249,115,22,0.14)',
                    borderRadius: 34,
                    padding: '2px 10px',
                    fontFamily: 'var(--font-geist-sans), sans-serif',
                    fontWeight: 500,
                    fontSize: 13,
                    lineHeight: '22px',
                    color: '#F97316',
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(249,115,22,0.22)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(249,115,22,0.14)')}
                >
                  Browse templates
                </button>
              </>
            )}

            {displayFileName && (
              <>
                <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M15.8333 8.33333H4.16667C3.2475 8.33333 2.5 9.08083 2.5 10V16.6667C2.5 17.5858 3.2475 18.3333 4.16667 18.3333H15.8333C16.7525 18.3333 17.5 17.5858 17.5 16.6667V10C17.5 9.08083 16.7525 8.33333 15.8333 8.33333ZM4.16667 5H15.8333V6.66667H4.16667V5ZM5.83333 1.66667H14.1667V3.33333H5.83333V1.66667Z" fill="#555555"/>
                </svg>

                <span style={{
                  fontFamily: 'var(--font-geist-sans), sans-serif',
                  fontWeight: 500,
                  fontSize: 13,
                  color: '#CCCCCC',
                  whiteSpace: 'nowrap',
                  maxWidth: 160,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {displayFileName}
                </span>

                <button
                  onClick={handleChangeBtn}
                  style={{
                    background: 'rgba(249,115,22,0.10)',
                    borderRadius: 34,
                    padding: '2px 8px',
                    fontFamily: 'var(--font-geist-sans), sans-serif',
                    fontWeight: 500,
                    fontSize: 12,
                    lineHeight: '22px',
                    color: '#F97316',
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(249,115,22,0.18)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(249,115,22,0.10)')}
                >
                  Change
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Right: Export button ── */}
        <div className="pointer-events-auto relative">
          <motion.div
            className="flex items-center gap-[8px] px-[14px] py-[8px] select-none"
            style={{
              borderRadius: 34,
              background: displayCanExport ? '#F97316' : 'rgba(249,115,22,0.22)',
              cursor: displayCanExport && !isRunning ? 'pointer' : 'not-allowed',
              transition: 'background 0.18s',
            }}
            onClick={displayCanExport && !isRunning ? handleExport : undefined}
            whileHover={displayCanExport ? { scale: 1.02 } : undefined}
            whileTap={displayCanExport ? { scale: 0.97 } : undefined}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
              <path d="M2.5 11.5L11.5 2.5M11.5 2.5H5.5M11.5 2.5V8.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{
              fontFamily: 'var(--font-geist-sans), sans-serif',
              fontWeight: 500,
              fontSize: 14,
              color: 'white',
              whiteSpace: 'nowrap',
            }}>
              {isRunning ? `${exportState.progress}%` : 'Export Animation'}
            </span>

            <div
              style={{ display: 'flex', alignItems: 'center', padding: '0 2px', cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); setFormatOpen(o => !o) }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </motion.div>

          {/* Format dropdown — Animate mode */}
          <AnimatePresence>
            {formatOpen && appMode === 'animate' && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFormatOpen(false)} />
                <motion.div
                  className="absolute right-0 top-[calc(100%+8px)] overflow-hidden min-w-[168px] z-50"
                  initial={{ opacity: 0, scale: 0.92, y: -8 }}
                  animate={{ opacity: 1, scale: 1,    y: 0  }}
                  exit={{    opacity: 0, scale: 0.96, y: -4 }}
                  transition={SPRING.dropdown}
                  style={{ transformOrigin: 'top right', background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12 }}
                >
                  {FORMATS.map((fmt, idx) => (
                    <motion.button
                      key={fmt.value}
                      onClick={() => { setFormat(fmt.value); setFormatOpen(false) }}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...SPRING.stagger, delay: idx * 0.04 }}
                      className="w-full text-left px-4 py-2.5 block"
                      style={{
                        background: format === fmt.value ? 'rgba(249,115,22,0.08)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { if (format !== fmt.value) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = format === fmt.value ? 'rgba(249,115,22,0.08)' : 'transparent' }}
                    >
                      <span style={{ display: 'block', fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 13, fontWeight: 500, color: format === fmt.value ? '#F97316' : '#CCCCCC' }}>
                        {fmt.label}
                      </span>
                      {fmt.desc && (
                        <span style={{ display: 'block', fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 11, color: '#555' }}>
                          {fmt.desc}
                        </span>
                      )}
                    </motion.button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Format dropdown — 3D mode */}
          <AnimatePresence>
            {formatOpen && appMode === '3d' && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFormatOpen(false)} />
                <motion.div
                  className="absolute right-0 top-[calc(100%+8px)] overflow-hidden min-w-[140px] z-50"
                  initial={{ opacity: 0, scale: 0.92, y: -8 }}
                  animate={{ opacity: 1, scale: 1,    y: 0  }}
                  exit={{    opacity: 0, scale: 0.96, y: -4 }}
                  transition={SPRING.dropdown}
                  style={{ transformOrigin: 'top right', background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12 }}
                >
                  {FORMATS_3D
                    .filter(fmt => fmt.value !== 'embed' || asset3dKind === 'svg')
                    .map((fmt, idx) => (
                      <motion.button
                        key={fmt.value}
                        onClick={() => { setFormat3d(fmt.value); setFormatOpen(false) }}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ ...SPRING.stagger, delay: idx * 0.04 }}
                        className="w-full text-left px-4 py-2.5 block"
                        style={{
                          background: format3d === fmt.value ? 'rgba(249,115,22,0.08)' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-geist-sans), sans-serif',
                          fontSize: 13,
                          fontWeight: 500,
                          color: format3d === fmt.value ? '#F97316' : '#CCCCCC',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => { if (format3d !== fmt.value) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = format3d === fmt.value ? 'rgba(249,115,22,0.08)' : 'transparent' }}
                      >
                        {fmt.label}
                      </motion.button>
                    ))
                  }
                </motion.div>
              </>
            )}
          </AnimatePresence>
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
    </>
  )
}

function ReframeLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M4.65843 19.6614C4.48954 16.3625 6.22763 14.2747 7.21952 15.1853L7.31778 15.2864C5.73323 16.6047 5.83457 20.0232 6.937 22.3808C6.62991 23.043 6.44873 23.2515 6.12937 23.276C5.45378 23.1902 4.75056 21.4641 4.65843 19.6553" fill="#F97316"/>
      <path d="M7.03835 22.1325C7.05677 22.0865 8.64747 17.267 7.3178 15.2864C8.90235 14.2747 9.95258 17.6931 9.19101 21.3844C8.98219 22.3962 8.59527 23.5857 7.94425 23.5091C7.57268 23.3956 7.33008 23.1136 6.93701 22.387C6.96772 22.3103 7.01071 22.2091 7.03835 22.1325Z" fill="#F97316"/>
      <path d="M12.965 0.726704C13.9446 0.254563 16.3583 -0.401529 16.1341 0.322012C13.4287 0.898392 11.7459 2.5049 12.2648 3.41852C12.0326 3.49088 11.789 3.51998 11.5463 3.50437C10.4807 3.31735 10.8031 2.12473 12.1604 1.18352C12.4141 1.01389 12.6788 0.861284 12.9527 0.726704" fill="#F97316"/>
      <path d="M16.3737 0.279079C17.0339 0.171774 18.5048 0.0184815 17.8477 0.892249C17.2673 1.65871 14.4698 3.78948 12.7409 3.65151C12.5579 3.63849 12.3872 3.55493 12.2649 3.41851C14.307 2.71336 15.9929 0.613256 16.1342 0.322001L16.3737 0.279079Z" fill="#F97316"/>
      <path d="M15.047 10.4975C15.1562 10.3127 15.3064 10.1554 15.4861 10.0377C15.7932 11.1414 17.4023 11.8618 18.0748 12.1224C18.4076 12.2478 18.747 12.3553 19.0913 12.4444C20.0818 12.7271 21.1213 12.796 22.1406 12.6467C23.369 15.0197 21.6032 15.8229 19.2356 15.0595C19.0483 14.9982 18.8026 14.9032 18.6214 14.8296C16.3152 13.8454 14.3223 11.868 15.0501 10.4975" fill="#F97316"/>
      <path d="M15.6918 9.05655C17.2702 6.9687 23.4795 8.62733 23.6945 11.2026C23.7835 12.2757 22.5521 12.5608 22.159 12.6559C21.397 11.4655 20.264 10.5584 18.9346 10.0744C17.5896 9.56548 16.2753 9.55321 15.5045 10.0468C15.459 9.87906 15.4533 9.70301 15.4879 9.53268C15.5226 9.36235 15.5966 9.20246 15.7041 9.06574" fill="#F97316"/>
      <path d="M0.242486 11.5277C0.427282 11.0221 0.654299 10.5329 0.921142 10.0653C0.94878 10.3412 1.09311 10.3994 1.53531 10.3075C1.68406 10.2704 1.82982 10.2222 1.97137 10.1634C2.77637 9.82207 3.49422 9.30446 4.07183 8.64883C4.13324 10.0407 1.74413 12.0519 0.736892 12.6559C0.245557 12.9349 -0.215069 13.1096 0.107369 11.9569C0.144219 11.8251 0.199494 11.6503 0.242486 11.5246" fill="#F97316"/>
      <path d="M1.39995 8.85126C3.14419 5.69956 4.41245 6.15637 4.64583 6.87685C4.73796 7.15891 4.78402 7.76594 4.07465 8.64891C4.02552 8.06946 3.50655 7.84259 2.84632 8.10932C1.84215 8.52934 1.17271 9.64531 0.920898 10.0653C0.920898 9.91204 0.954678 9.65451 1.39995 8.83899" fill="#F97316"/>
      <path d="M0.306903 17.5061C0.233203 14.0754 2.92633 11.5155 3.80459 12.2942C3.90271 12.4131 3.97495 12.5511 4.01672 12.6994C4.05849 12.8478 4.06886 13.0031 4.04719 13.1557C3.99106 13.1496 3.93443 13.1496 3.87829 13.1557C2.91098 13.2569 1.11453 15.3294 1.22816 18.7202C1.16325 18.7776 1.09096 18.826 1.0132 18.8643C0.377533 19.0973 0.306903 17.8832 0.306903 17.5061Z" fill="#F97316"/>
      <path d="M1.26494 19.0329L1.2373 18.7263C2.0173 17.9752 3.91508 14.6794 4.03484 13.1649C5.74837 13.5543 2.94469 20.2777 2.21997 20.6578L2.14934 20.6854C1.61502 20.7927 1.34785 19.6982 1.27415 19.0329" fill="#F97316"/>
      <path d="M15.3542 4.06848C17.0247 2.03889 21.8306 1.65872 21.9565 3.06595C21.943 3.33216 21.834 3.58464 21.6494 3.77722C18.8672 3.16405 15.9499 4.41492 15.5077 5.54622C14.5404 5.12007 15.1147 4.30148 15.3143 4.05928" fill="#F97316"/>
      <path d="M15.5597 5.56765C15.6426 5.59831 15.7071 5.6167 15.7531 5.62897C17.2056 5.98767 20.3932 5.1415 21.6614 3.78946C23.3381 4.21561 23.6452 5.21201 22.3401 6.00913C21.2745 6.66522 18.6551 7.29679 16.5239 6.77559C16.183 6.66522 15.2802 6.36477 15.532 5.54925H15.5597" fill="#F97316"/>
      <path d="M10.6404 15.1271C10.8185 14.6427 11.1931 14.0724 11.967 14.1092C11.2607 15.6973 12.7163 18.9716 14.74 20.3697C14.3346 22.0252 13.6068 22.1785 13.0694 22.016C11.3743 21.3078 9.89417 17.1107 10.6312 15.1271" fill="#F97316"/>
      <path d="M12.0037 14.0356C12.9987 12.1777 16.1279 14.2073 17 17.2824C17.5742 19.2997 16.9109 21.1882 15.2005 20.5996C15.0409 20.5357 14.8868 20.4588 14.7398 20.3697C15.225 17.5368 13.7449 14.5844 12.191 14.1521C12.1211 14.1289 12.0491 14.1125 11.9761 14.1031C11.9808 14.0772 11.9869 14.0516 11.9945 14.0264" fill="#F97316"/>
      <path d="M6.53758 3.11498C6.58364 3.08125 7.67072 2.2872 8.14363 2.14617C6.14144 3.535 6.44852 4.46702 7.18553 4.59885C7.26613 4.60799 7.34752 4.60799 7.42812 4.59885C7.49261 4.59885 7.52025 4.59885 7.59395 4.57432C7.19541 5.05702 6.63828 5.38293 6.02168 5.49408C4.94381 5.58299 4.66436 4.96675 5.39215 4.12058C5.73648 3.74508 6.12053 3.40791 6.53758 3.11498Z" fill="#F97316"/>
      <path d="M8.79171 1.75373C9.2815 1.47777 9.79543 1.24688 10.3271 1.06392C10.5789 0.996468 10.6926 1.00873 10.6127 1.26933C10.6127 1.29692 9.44273 4.17576 7.61865 4.58045C8.42935 3.67602 8.84699 2.04805 8.23282 2.12777H8.15298C8.34644 2.00513 8.52455 1.88863 8.80093 1.73534" fill="#F97316"/>
    </svg>
  )
}
