'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { clsx } from 'clsx'
import { IconBounce, type IconAnimType } from '@/components/ui/IconBounce'
import { useEditorStore, selectCanExport } from '@/lib/store/editor'
import { runExport } from '@/lib/export/runExport'
import { SPRING } from '@/lib/motion'
import { useToast } from '@/components/ui/Toast'
import type { ExportFormat } from '@/types'

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'gif',    label: 'Export GIF' },
  { value: 'css',    label: 'Export CSS' },
  { value: 'lottie', label: 'Export Lottie' },
]

interface TopBarProps {
  activeTab: 'presets' | 'smoothing'
  onTabChange: (tab: 'presets' | 'smoothing') => void
}

export function TopBar({ activeTab, onTabChange }: TopBarProps) {
  const [formatOpen, setFormatOpen] = useState(false)

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
    if (!canExport || !activePresetId) return
    setExportState({ isRunning: true, progress: 0, error: null })
    await runExport({
      format,
      activePresetId,
      params,
      onProgress: (p) => setExportState({ progress: p }),
      onError:    (msg) => { setExportState({ error: msg }); toast(msg, 'error') },
      onSuccess:  (msg) => toast(msg, 'success'),
    })
    setExportState({ isRunning: false, progress: 0 })
  }

  const exportLabel = exportState.isRunning
    ? 'Processing'
    : `Export ${format.toUpperCase()}`

  return (
    <motion.div
      className="absolute top-0 left-0 right-0 flex items-start justify-between px-4 pt-6 pointer-events-none z-30"
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING.entrance, delay: 0.03 }}
    >

      {/* ── Logo pill — Figma 297:10656 ────────────────────────────
           bg: rgba(229,229,229,0.6), radius: 34px, px-12 py-13
           logo (spinning) | divider | file icon + name + Change  */}
      <div className="pointer-events-auto">
        <div
          className="flex items-center gap-[10px] px-[10px] py-[9px] backdrop-blur-md"
          style={{ borderRadius: 34, background: 'rgba(229,229,229,0.60)' }}
        >
          {/* Reframe logo mark — spins continuously */}
          <ReframeLogo />

          {/* File info — only when a file is loaded */}
          {svgFileName && (
            <>
              {/* Vertical divider */}
              <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.1)', flexShrink: 0 }} />

              {/* File icon */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M15.8333 8.33333H4.16667C3.2475 8.33333 2.5 9.08083 2.5 10V16.6667C2.5 17.5858 3.2475 18.3333 4.16667 18.3333H15.8333C16.7525 18.3333 17.5 17.5858 17.5 16.6667V10C17.5 9.08083 16.7525 8.33333 15.8333 8.33333ZM4.16667 5H15.8333V6.66667H4.16667V5ZM5.83333 1.66667H14.1667V3.33333H5.83333V1.66667Z" fill="#AFAFAF"/>
                </svg>
                <span style={{
                  fontFamily: 'var(--font-geist-sans), sans-serif',
                  fontWeight: 500,
                  fontSize: 14,
                  lineHeight: '20px',
                  color: '#545454',
                  whiteSpace: 'nowrap',
                  maxWidth: 180,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {svgFileName}
                </span>
              </div>

              {/* Change button — opens the file picker in PreviewStage */}
              <button
                onClick={() => document.querySelector<HTMLInputElement>('input[type="file"][accept*="svg"]')?.click()}
                style={{
                  background: 'rgba(63,55,201,0.05)',
                  borderRadius: 34,
                  padding: '3px 10px',
                  fontFamily: 'var(--font-geist-sans), sans-serif',
                  fontWeight: 500,
                  fontSize: 14,
                  lineHeight: '24px',
                  color: '#3f37c9',
                  whiteSpace: 'nowrap',
                  border: 'none',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(63,55,201,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(63,55,201,0.05)')}
              >
                Change
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Centre tabs — Figma 297:5431 "Animation" ─────────────
           outer: rgba(251,251,251,0.6), radius: 74px, px-8 py-6
           each pill: rgba(255,255,255,0.6), border-white, radius 34px  */}
      <div className="pointer-events-auto absolute left-1/2 -translate-x-1/2 top-6">
        <div
          className="flex items-center px-[6px] py-[5px] backdrop-blur-md gap-[6px]"
          style={{ borderRadius: 74, background: 'rgba(251,251,251,0.6)' }}
        >
          <TabBtn
            active={activeTab === 'presets'}
            onClick={() => onTabChange('presets')}
            icon={<PresetsIcon />}
            iconAnim="pop"
          >
            Presets
          </TabBtn>
          <TabBtn
            active={activeTab === 'smoothing'}
            onClick={() => onTabChange('smoothing')}
            icon={<SmoothingIcon />}
            iconAnim="squeeze"
          >
            Easing
          </TabBtn>
        </div>
      </div>

      {/* ── Export — Figma 297:5619 ───────────────────────────────
           bg: #3f37c9, radius: 74px, px-18 py-16
           icon + label + chevron, all white                       */}
      <div className="pointer-events-auto relative">
        <motion.div
          className="flex items-center gap-[6px] px-[14px] py-[9px] backdrop-blur-sm cursor-pointer"
          style={{
            borderRadius: 74,
            background: '#3f37c9',
            opacity: canExport ? 1 : 0.45,
            cursor: canExport && !exportState.isRunning ? 'pointer' : canExport ? 'default' : 'not-allowed',
            transition: 'opacity 0.2s',
          }}
          onClick={canExport && !exportState.isRunning ? handleExport : undefined}
          whileHover={canExport ? { scale: 1.02 } : undefined}
        >
          {/* Spinner — SVG animateTransform is independent of CSS / Framer Motion */}
          {exportState.isRunning && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 12 12"
                  to="360 12 12"
                  dur="0.75s"
                  repeatCount="indefinite"
                />
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </g>
            </svg>
          )}


          {/* Label */}
          <span
            className="whitespace-nowrap"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontWeight: 500, fontSize: 14, lineHeight: '20px', color: 'white' }}
          >
            {exportState.isRunning ? exportLabel : canExport ? exportLabel : 'Export GIF'}
          </span>

          {/* Dropdown chevron — opens format picker */}
          <div
            className="w-[16px] h-[16px] flex items-center justify-center flex-shrink-0"
            onClick={e => { e.stopPropagation(); setFormatOpen(o => !o) }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 5L7 9L11 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </motion.div>

        {/* Format dropdown */}
        <AnimatePresence>
          {formatOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setFormatOpen(false)} />
              <motion.div
                className="absolute right-0 top-[calc(100%+8px)] bg-white border border-[#e5e5e5] rounded-2xl shadow-xl overflow-hidden min-w-[160px] z-50"
                initial={{ opacity: 0, scale: 0.90, y: -8, filter: 'blur(6px)' }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.95, y: -4, filter: 'blur(3px)' }}
                transition={SPRING.dropdown}
                style={{ transformOrigin: 'top right' }}
              >
                {FORMATS.map((fmt, idx) => (
                  <motion.button
                    key={fmt.value}
                    onClick={() => { setFormat(fmt.value); setFormatOpen(false) }}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...SPRING.stagger, delay: idx * 0.05 }}
                    className={clsx(
                      'w-full text-left px-4 py-2.5 text-[14px] font-medium transition-colors block',
                      format === fmt.value
                        ? 'text-[#3f37c9] bg-[#3f37c9]/8'
                        : 'text-[#545454] hover:bg-[#f5f5f5]'
                    )}
                  >
                    {fmt.label}
                  </motion.button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ── Tab button ─────────────────────────────────────────────────
function TabBtn({
  children, active, onClick, icon, iconAnim,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  iconAnim: IconAnimType
}) {
  return (
    <motion.button
      onClick={onClick}
      className="flex items-center gap-[6px] px-[10px] py-[7px] transition-all duration-150 cursor-pointer"
      style={{
        borderRadius: 34,
        background: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
        border: '1px solid white',
        fontFamily: 'var(--font-geist-sans), sans-serif',
        fontWeight: 500,
        fontSize: 14,
        lineHeight: '20px',
        color: '#545454',
        whiteSpace: 'nowrap',
      }}
      initial="rest"
      whileHover="hover"
    >
      <IconBounce type={iconAnim} className="w-[16px] h-[16px] flex-shrink-0">
        {icon}
      </IconBounce>
      {children}
    </motion.button>
  )
}

// ── Icons ──────────────────────────────────────────────────────
function PresetsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path d="M14.9999 14.1667C15.9191 14.1667 16.6666 13.4192 16.6666 12.5V4.16667C16.6666 3.2475 15.9191 2.5 14.9999 2.5H4.99992C4.08075 2.5 3.33325 3.2475 3.33325 4.16667V12.5C3.33325 13.4192 4.08075 14.1667 4.99992 14.1667H14.9999ZM3.33325 15.8333H16.6666V17.5H3.33325V15.8333Z" fill="#00C945"/>
    </svg>
  )
}

function SmoothingIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path d="M13.3334 2.5H6.66675C5.74758 2.5 5.00008 3.2475 5.00008 4.16667V15.8333C5.00008 16.7525 5.74758 17.5 6.66675 17.5H13.3334C14.2526 17.5 15.0001 16.7525 15.0001 15.8333V4.16667C15.0001 3.2475 14.2526 2.5 13.3334 2.5ZM1.66675 5.83333V14.1667C1.66675 15.0858 2.41425 15.8333 3.33341 15.8333V4.16667C2.41425 4.16667 1.66675 4.91417 1.66675 5.83333ZM16.6667 4.16667V15.8333C17.5859 15.8333 18.3334 15.0858 18.3334 14.1667V5.83333C18.3334 4.91417 17.5859 4.16667 16.6667 4.16667Z" fill="#854BE2"/>
    </svg>
  )
}

// Reframe brand logo mark — spins continuously
function ReframeLogo() {
  return (
    <svg
      width="24" height="24" viewBox="0 0 24 24" fill="none"
      style={{ flexShrink: 0 }}
    >
      <g opacity="0.15">
        <path d="M4.95897 20.1488C4.79007 16.8622 6.52817 14.7621 7.52005 15.6758C7.55076 15.7034 7.58761 15.7463 7.61525 15.7769C6.03377 17.0953 6.14124 20.5106 7.23754 22.8774C6.93045 23.5366 6.74927 23.7451 6.4299 23.7696C5.75125 23.6868 5.0511 21.9608 4.95897 20.1488Z" fill="#3F37C9"/>
        <path d="M7.33916 22.623C7.35451 22.5739 8.94828 17.7575 7.61553 15.7769C9.20009 14.7652 10.2503 18.1836 9.48875 21.8718C9.283 22.8836 8.89607 24.0731 8.26041 23.9965C7.88884 23.8861 7.64624 23.604 7.25317 22.8774L7.35451 22.623" fill="#3F37C9"/>
        <path d="M13.2626 1.22643C14.2422 0.742025 16.6559 0.0889989 16.4348 0.81254C13.7294 1.38585 12.0435 2.99236 12.5624 3.90598C12.3305 3.97973 12.0868 4.00987 11.8439 3.99489C10.7783 3.80788 11.1007 2.61219 12.458 1.67098C12.7153 1.50381 12.9841 1.35524 13.2626 1.22643Z" fill="#3F37C9"/>
        <path d="M16.6713 0.769676C17.3346 0.662371 18.8025 0.506013 18.1484 1.38285C17.568 2.14931 14.7704 4.28314 13.0385 4.14211C12.8554 4.12941 12.6846 4.04579 12.5625 3.90911C14.6077 3.20396 16.2905 1.11612 16.4348 0.815664L16.6713 0.772742" fill="#3F37C9"/>
        <path d="M15.354 10.985C15.465 10.8005 15.6161 10.6434 15.7962 10.5251C16.1032 11.6288 17.7093 12.3646 18.3849 12.6099C18.717 12.73 19.0552 12.8323 19.3983 12.9165C20.3886 13.1999 21.4281 13.27 22.4476 13.1219C23.6759 15.4918 21.9102 16.2951 19.5457 15.5317C19.3583 15.4734 19.1127 15.3753 18.9315 15.3048C16.6253 14.3176 14.6323 12.3401 15.357 10.9697" fill="#3F37C9"/>
        <path d="M15.9897 9.54409C17.5712 7.45624 23.7805 9.11487 23.9954 11.6902C24.0845 12.7632 22.85 13.0514 22.46 13.1465C21.6981 11.9483 20.5598 11.0362 19.2233 10.5528C17.8752 10.0438 16.5609 10.0346 15.7932 10.5252C15.747 10.3577 15.7407 10.1817 15.7748 10.0113C15.8089 9.84097 15.8826 9.68095 15.9897 9.54409Z" fill="#3F37C9"/>
        <path d="M0.543397 12.0182C0.72845 11.5117 0.957592 11.0223 1.2282 10.5558C1.2589 10.8317 1.40323 10.8869 1.84236 10.798C1.98994 10.759 2.13463 10.7099 2.27535 10.6508C3.08145 10.3115 3.79971 9.79357 4.37581 9.13628C4.4403 10.5312 2.05118 12.5424 1.04394 13.1464C0.546468 13.4223 0.0889127 13.5971 0.40828 12.4474C0.44513 12.3186 0.500406 12.1408 0.546468 12.0182" fill="#3F37C9"/>
        <path d="M1.69811 9.33865C3.44542 6.19002 4.71061 6.64377 4.94399 7.35811C5.03612 7.64324 5.08525 8.25028 4.37281 9.13018C4.32675 8.55073 3.80471 8.32386 3.14448 8.59059C2.14952 9.01674 1.47394 10.1358 1.22827 10.5558C1.22827 10.4025 1.26205 10.145 1.70732 9.32946" fill="#3F37C9"/>
        <path d="M0.592429 17.9936C0.5218 14.5659 3.21186 12.006 4.09012 12.7816C4.18873 12.9002 4.26128 13.0382 4.30308 13.1866C4.34487 13.335 4.35496 13.4906 4.33271 13.6431C4.27761 13.6369 4.22199 13.6369 4.16689 13.6431C3.20879 13.7504 1.40313 15.8107 1.53825 19.2107C1.47231 19.269 1.39901 19.3185 1.32022 19.3579C0.678413 19.5878 0.601642 18.3737 0.592429 17.9966" fill="#3F37C9"/>
        <path d="M1.5629 19.5204L1.53833 19.2138C2.31832 18.4627 4.21303 15.1669 4.3328 13.6524C6.04633 14.0356 3.24265 20.759 2.51793 21.1545L2.44116 21.1852C1.90683 21.2955 1.63967 20.198 1.5629 19.5327" fill="#3F37C9"/>
        <path d="M15.6398 4.55896C17.3257 2.52937 22.1285 2.14614 22.2544 3.56563C22.2418 3.83116 22.1326 4.08298 21.9473 4.27384C19.1805 3.67906 16.2755 4.9054 15.8333 6.0459C14.8629 5.61668 15.4402 4.7981 15.6398 4.55896Z" fill="#3F37C9"/>
        <path d="M15.8575 6.05514C15.9219 6.07996 15.9875 6.10145 16.0541 6.11952C17.5066 6.47823 20.6941 5.63205 21.9624 4.28001C23.6268 4.70923 23.9308 5.70563 22.638 6.50276C21.5724 7.16191 18.953 7.79348 16.8249 7.27228C16.484 7.15885 15.5965 6.86146 15.833 6.04594H15.8575" fill="#3F37C9"/>
        <path d="M10.9381 15.6175C11.1162 15.1301 11.4939 14.5598 12.2677 14.5997C11.5584 16.1878 13.017 19.4621 15.0468 20.8479C14.6415 22.5065 13.9137 22.6598 13.3732 22.4942C11.6812 21.7891 10.201 17.5889 10.935 15.6083" fill="#3F37C9"/>
        <path d="M12.3047 14.5261C13.2966 12.6651 16.4258 14.6978 17.301 17.7697C17.8721 19.7871 17.2119 21.6756 15.4984 21.087C15.3404 21.0223 15.1892 20.9422 15.047 20.8479C15.5322 18.0181 14.0489 15.0626 12.4982 14.6303C12.4272 14.6134 12.3555 14.6001 12.2832 14.5905C12.2864 14.5653 12.2926 14.5406 12.3016 14.5169" fill="#3F37C9"/>
        <path d="M6.83862 3.60554C6.88468 3.57181 7.97176 2.77776 8.44467 2.63673C6.43019 4.02249 6.74342 4.95451 7.48349 5.08941C7.56414 5.0978 7.64544 5.0978 7.72609 5.08941L7.89191 5.06795C7.49373 5.55106 6.93644 5.87707 6.31964 5.9877C5.24485 6.07661 4.96233 5.46037 5.70547 4.6142C6.04997 4.23977 6.43401 3.90364 6.8509 3.61167" fill="#3F37C9"/>
        <path d="M9.09274 2.24429C9.58089 1.9651 10.0951 1.73407 10.6282 1.55447C10.883 1.48702 10.9967 1.49929 10.9137 1.75988C10.9137 1.78748 9.74683 4.66324 7.91968 5.071C8.73038 4.15125 9.14801 2.53861 8.53385 2.61832L8.454 2.63672C8.6444 2.51408 8.82558 2.39758 9.10195 2.24429" fill="#3F37C9"/>
      </g>
      <path d="M4.65843 19.6614C4.48954 16.3625 6.22763 14.2747 7.21952 15.1853L7.31778 15.2864C5.73323 16.6047 5.83457 20.0232 6.937 22.3808C6.62991 23.043 6.44873 23.2515 6.12937 23.276C5.45378 23.1902 4.75056 21.4641 4.65843 19.6553" fill="#3F37C9"/>
      <path d="M7.03835 22.1325C7.05677 22.0865 8.64747 17.267 7.3178 15.2864C8.90235 14.2747 9.95258 17.6931 9.19101 21.3844C8.98219 22.3962 8.59527 23.5857 7.94425 23.5091C7.57268 23.3956 7.33008 23.1136 6.93701 22.387C6.96772 22.3103 7.01071 22.2091 7.03835 22.1325Z" fill="#3F37C9"/>
      <path d="M12.965 0.726704C13.9446 0.254563 16.3583 -0.401529 16.1341 0.322012C13.4287 0.898392 11.7459 2.5049 12.2648 3.41852C12.0326 3.49088 11.789 3.51998 11.5463 3.50437C10.4807 3.31735 10.8031 2.12473 12.1604 1.18352C12.4141 1.01389 12.6788 0.861284 12.9527 0.726704" fill="#3F37C9"/>
      <path d="M16.3737 0.279079C17.0339 0.171774 18.5048 0.0184815 17.8477 0.892249C17.2673 1.65871 14.4698 3.78948 12.7409 3.65151C12.5579 3.63849 12.3872 3.55493 12.2649 3.41851C14.307 2.71336 15.9929 0.613256 16.1342 0.322001L16.3737 0.279079Z" fill="#3F37C9"/>
      <path d="M15.047 10.4975C15.1562 10.3127 15.3064 10.1554 15.4861 10.0377C15.7932 11.1414 17.4023 11.8618 18.0748 12.1224C18.4076 12.2478 18.747 12.3553 19.0913 12.4444C20.0818 12.7271 21.1213 12.796 22.1406 12.6467C23.369 15.0197 21.6032 15.8229 19.2356 15.0595C19.0483 14.9982 18.8026 14.9032 18.6214 14.8296C16.3152 13.8454 14.3223 11.868 15.0501 10.4975" fill="#3F37C9"/>
      <path d="M15.6918 9.05655C17.2702 6.9687 23.4795 8.62733 23.6945 11.2026C23.7835 12.2757 22.5521 12.5608 22.159 12.6559C21.397 11.4655 20.264 10.5584 18.9346 10.0744C17.5896 9.56548 16.2753 9.55321 15.5045 10.0468C15.459 9.87906 15.4533 9.70301 15.4879 9.53268C15.5226 9.36235 15.5966 9.20246 15.7041 9.06574" fill="#3F37C9"/>
      <path d="M0.242486 11.5277C0.427282 11.0221 0.654299 10.5329 0.921142 10.0653C0.94878 10.3412 1.09311 10.3994 1.53531 10.3075C1.68406 10.2704 1.82982 10.2222 1.97137 10.1634C2.77637 9.82207 3.49422 9.30446 4.07183 8.64883C4.13324 10.0407 1.74413 12.0519 0.736892 12.6559C0.245557 12.9349 -0.215069 13.1096 0.107369 11.9569C0.144219 11.8251 0.199494 11.6503 0.242486 11.5246" fill="#3F37C9"/>
      <path d="M1.39995 8.85126C3.14419 5.69956 4.41245 6.15637 4.64583 6.87685C4.73796 7.15891 4.78402 7.76594 4.07465 8.64891C4.02552 8.06946 3.50655 7.84259 2.84632 8.10932C1.84215 8.52934 1.17271 9.64531 0.920898 10.0653C0.920898 9.91204 0.954678 9.65451 1.39995 8.83899" fill="#3F37C9"/>
      <path d="M0.306903 17.5061C0.233203 14.0754 2.92633 11.5155 3.80459 12.2942C3.90271 12.4131 3.97495 12.5511 4.01672 12.6994C4.05849 12.8478 4.06886 13.0031 4.04719 13.1557C3.99106 13.1496 3.93443 13.1496 3.87829 13.1557C2.91098 13.2569 1.11453 15.3294 1.22816 18.7202C1.16325 18.7776 1.09096 18.826 1.0132 18.8643C0.377533 19.0973 0.306903 17.8832 0.306903 17.5061Z" fill="#3F37C9"/>
      <path d="M1.26494 19.0329L1.2373 18.7263C2.0173 17.9752 3.91508 14.6794 4.03484 13.1649C5.74837 13.5543 2.94469 20.2777 2.21997 20.6578L2.14934 20.6854C1.61502 20.7927 1.34785 19.6982 1.27415 19.0329" fill="#3F37C9"/>
      <path d="M15.3542 4.06848C17.0247 2.03889 21.8306 1.65872 21.9565 3.06595C21.943 3.33216 21.834 3.58464 21.6494 3.77722C18.8672 3.16405 15.9499 4.41492 15.5077 5.54622C14.5404 5.12007 15.1147 4.30148 15.3143 4.05928" fill="#3F37C9"/>
      <path d="M15.5597 5.56765C15.6426 5.59831 15.7071 5.6167 15.7531 5.62897C17.2056 5.98767 20.3932 5.1415 21.6614 3.78946C23.3381 4.21561 23.6452 5.21201 22.3401 6.00913C21.2745 6.66522 18.6551 7.29679 16.5239 6.77559C16.183 6.66522 15.2802 6.36477 15.532 5.54925H15.5597" fill="#3F37C9"/>
      <path d="M10.6404 15.1271C10.8185 14.6427 11.1931 14.0724 11.967 14.1092C11.2607 15.6973 12.7163 18.9716 14.74 20.3697C14.3346 22.0252 13.6068 22.1785 13.0694 22.016C11.3743 21.3078 9.89417 17.1107 10.6312 15.1271" fill="#3F37C9"/>
      <path d="M12.0037 14.0356C12.9987 12.1777 16.1279 14.2073 17 17.2824C17.5742 19.2997 16.9109 21.1882 15.2005 20.5996C15.0409 20.5357 14.8868 20.4588 14.7398 20.3697C15.225 17.5368 13.7449 14.5844 12.191 14.1521C12.1211 14.1289 12.0491 14.1125 11.9761 14.1031C11.9808 14.0772 11.9869 14.0516 11.9945 14.0264" fill="#3F37C9"/>
      <path d="M6.53758 3.11498C6.58364 3.08125 7.67072 2.2872 8.14363 2.14617C6.14144 3.535 6.44852 4.46702 7.18553 4.59885C7.26613 4.60799 7.34752 4.60799 7.42812 4.59885C7.49261 4.59885 7.52025 4.59885 7.59395 4.57432C7.19541 5.05702 6.63828 5.38293 6.02168 5.49408C4.94381 5.58299 4.66436 4.96675 5.39215 4.12058C5.73648 3.74508 6.12053 3.40791 6.53758 3.11498Z" fill="#3F37C9"/>
      <path d="M8.79171 1.75373C9.2815 1.47777 9.79543 1.24688 10.3271 1.06392C10.5789 0.996468 10.6926 1.00873 10.6127 1.26933C10.6127 1.29692 9.44273 4.17576 7.61865 4.58045C8.42935 3.67602 8.84699 2.04805 8.23282 2.12777H8.15298C8.34644 2.00513 8.52455 1.88863 8.80093 1.73534" fill="#3F37C9"/>
    </svg>
  )
}

