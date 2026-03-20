'use client'

import { useEffect } from 'react'
import { motion } from 'motion/react'
import { useEditorStore } from '@/lib/store/editor'
import { getPreset } from '@/lib/presets'
import { SPRING } from '@/lib/motion'
import { IconBounce } from '@/components/ui/IconBounce'
import { Tooltip } from '@/components/ui/Tooltip'

const pillStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.6)',
  border: '1px solid white',
  borderRadius: 34,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 10px',
  cursor: 'pointer',
  fontFamily: 'var(--font-geist-sans), sans-serif',
  fontWeight: 500,
  fontSize: 14,
  lineHeight: '20px',
  color: '#545454',
  whiteSpace: 'nowrap' as const,
  transition: 'background 0.12s',
  flexShrink: 0,
}

const iconPillStyle: React.CSSProperties = {
  ...pillStyle,
  padding: 9,
}

export function BottomBar() {
  const isPlaying      = useEditorStore(s => s.isPlaying)
  const svgSource      = useEditorStore(s => s.svgSource)
  const zoom           = useEditorStore(s => s.zoom)
  const isPanMode      = useEditorStore(s => s.isPanMode)
  const activePresetId = useEditorStore(s => s.activePresetId)
  const setPlaying     = useEditorStore(s => s.setPlaying)
  const resetView      = useEditorStore(s => s.resetView)
  const setPanMode     = useEditorStore(s => s.setPanMode)
  const restartAnimation = useEditorStore(s => s.restartAnimation)

  const activePreset = activePresetId ? getPreset(activePresetId) : null

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const inInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
      if ((e.key === 'h' || e.key === 'H') && !inInput) setPanMode(!isPanMode)
      if (e.code === 'Space' && !e.repeat && !inInput && svgSource) {
        e.preventDefault()
        setPlaying(!isPlaying)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isPanMode, setPanMode, isPlaying, setPlaying, svgSource])

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING.entrance, delay: 0.05 }}
      >
        <div
          className="flex items-center gap-[6px] px-[6px] py-[5px] backdrop-blur-md"
          style={{ borderRadius: 74, background: 'rgba(251,251,251,0.6)' }}
        >
          {/* Active preset name */}
          {activePreset && (
            <>
              <div style={{ ...pillStyle, cursor: 'default', color: '#3d3d3d' }}>
                {activePreset.name}
              </div>
              <Divider />
            </>
          )}

          {/* Zoom % */}
          <Tooltip label="Reset zoom">
            <motion.button style={pillStyle} onClick={resetView} initial="rest" whileHover="hover">
              <IconBounce type="focus" className="w-[16px] h-[16px] flex-shrink-0">
                <ZoomIcon />
              </IconBounce>
              <span style={{ minWidth: 32, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
            </motion.button>
          </Tooltip>

          {/* Pan */}
          <Tooltip label="Pan mode" kbd="H">
            <motion.button
              style={isPanMode ? { ...iconPillStyle, background: 'rgba(63,55,201,0.12)', border: '1px solid rgba(63,55,201,0.25)' } : iconPillStyle}
              onClick={() => setPanMode(!isPanMode)}
              initial="rest" whileHover="hover"
            >
              <IconBounce type="nudge" className="w-[16px] h-[16px]">
                <PanIcon active={isPanMode} />
              </IconBounce>
            </motion.button>
          </Tooltip>

          <Divider />

          {/* Restart */}
          <Tooltip label="Restart animation">
            <motion.button style={iconPillStyle} onClick={restartAnimation} disabled={!svgSource} initial="rest" whileHover="hover">
              <IconBounce type="rewind" className="w-[16px] h-[16px]">
                <RestartIcon />
              </IconBounce>
            </motion.button>
          </Tooltip>

          {/* Play/Pause */}
          <Tooltip label={isPlaying ? 'Pause' : 'Play'} kbd="⎵">
            <motion.button
              style={{ ...iconPillStyle, background: '#3f37c9', border: '1px solid white' }}
              onClick={() => setPlaying(!isPlaying)}
              disabled={!svgSource}
              initial="rest" whileHover="hover"
              whileTap={svgSource ? { scale: 0.84 } : {}}
              transition={SPRING.snappy}
            >
              <IconBounce type="beat" className="w-[16px] h-[16px]">
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </IconBounce>
            </motion.button>
          </Tooltip>
        </div>
      </motion.div>
    </div>
  )
}

// ── Icons & helpers ─────────────────────────────────────────────

function Divider() {
  return <div style={{ width: 1, height: 26, background: 'rgba(0,0,0,0.08)', flexShrink: 0, marginLeft: 2, marginRight: 2 }} />
}

function ZoomIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M9.16667 3.125C5.82995 3.125 3.125 5.82995 3.125 9.16667C3.125 12.5034 5.82995 15.2083 9.16667 15.2083C10.7906 15.2083 12.2637 14.5638 13.3481 13.5168L13.5168 13.3481C14.5638 12.2637 15.2083 10.7906 15.2083 9.16667C15.2083 5.82995 12.5034 3.125 9.16667 3.125ZM1.875 9.16667C1.875 5.13959 5.13959 1.875 9.16667 1.875C13.1937 1.875 16.4583 5.13959 16.4583 9.16667C16.4583 10.9518 15.8217 12.5889 14.7654 13.8722L17.9464 17.0533C18.1905 17.2973 18.1905 17.6927 17.9464 17.9367C17.7024 18.1808 17.307 18.1808 17.063 17.9367L13.8819 14.7557C12.5986 15.812 11.0216 16.4583 9.16667 16.4583C5.13959 16.4583 1.875 13.1937 1.875 9.16667ZM9.16667 6.45833C9.51184 6.45833 9.79167 6.73816 9.79167 7.08333V8.54167H11.25C11.5952 8.54167 11.875 8.82149 11.875 9.16667C11.875 9.51184 11.5952 9.79167 11.25 9.79167H9.79167V11.25C9.79167 11.5952 9.51184 11.875 9.16667 11.875C8.82149 11.875 8.54167 11.5952 8.54167 11.25V9.79167H7.08333C6.73816 9.79167 6.45833 9.51184 6.45833 9.16667C6.45833 8.82149 6.73816 8.54167 7.08333 8.54167H8.54167V7.08333C8.54167 6.73816 8.82149 6.45833 9.16667 6.45833Z" fill="#AFAFAF"/>
    </svg>
  )
}

function PanIcon({ active }: { active: boolean }) {
  const fill = active ? '#3f37c9' : '#AFAFAF'
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M15.8333 5.98218C16.1784 5.98218 16.4583 6.262 16.4583 6.60718V13.75C16.4583 13.75 16.4583 13.7499 16.4583 13.75C16.4583 14.9281 16.0781 15.9332 15.3545 16.6438C14.6328 17.3527 13.6308 17.7084 12.4999 17.7084H8.64898C8.0063 17.7084 7.3943 17.4385 6.96044 16.9652L3.8072 13.5253C3.06202 12.7124 3.00151 11.484 3.66318 10.6018L5.33325 8.37503C5.54036 8.09889 5.93211 8.04293 6.20825 8.25003C6.48439 8.45714 6.54036 8.84889 6.33325 9.12503L4.66318 11.3518C4.36242 11.7528 4.38992 12.3112 4.72864 12.6807L7.88188 16.1206C8.0794 16.336 8.3573 16.4584 8.64898 16.4584H12.4999C13.369 16.4584 14.0337 16.189 14.4786 15.752C14.9218 15.3168 15.2083 14.6552 15.2083 13.75C15.2083 13.75 15.2083 13.7501 15.2083 13.75V6.60718C15.2083 6.262 15.4881 5.98218 15.8333 5.98218Z" fill={fill}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M14.1693 5.97406C14.0642 6.0808 13.9583 6.27346 13.9583 6.60704V7.08258C13.9583 7.42776 13.6784 7.70823 13.3333 7.70823C12.9881 7.70823 12.7083 7.42841 12.7083 7.08323V6.60704C12.7083 5.98824 12.9148 5.46661 13.2785 5.09716C13.637 4.73294 14.113 4.55347 14.5833 4.55347C15.0535 4.55347 15.5295 4.73294 15.888 5.09716C16.2517 5.46661 16.4583 5.98824 16.4583 6.60704C16.4583 6.95222 16.1784 7.23204 15.8333 7.23204C15.4881 7.23204 15.2083 6.95222 15.2083 6.60704C15.2083 6.27346 15.1023 6.0808 14.9972 5.97406C14.887 5.86209 14.738 5.80347 14.5833 5.80347C14.4285 5.80347 14.2795 5.86209 14.1693 5.97406Z" fill={fill}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M11.6693 5.22296C11.5642 5.3297 11.4583 5.52236 11.4583 5.85594V7.08329L10.8333 7.08338L10.2083 7.08337V5.85594C10.2083 5.23714 10.4148 4.71551 10.7785 4.34606C11.137 3.98184 11.613 3.80237 12.0833 3.80237C12.5535 3.80237 13.0295 3.98184 13.388 4.34606C13.7517 4.71551 13.9583 5.23714 13.9583 5.85594V7.08273C13.9583 7.42791 13.6784 7.70838 13.3333 7.70838C12.9881 7.70838 12.7083 7.42856 12.7083 7.08338V5.85594C12.7083 5.52236 12.6023 5.3297 12.4972 5.22296C12.387 5.11099 12.238 5.05237 12.0833 5.05237C11.9285 5.05237 11.7795 5.11099 11.6693 5.22296ZM10.8333 7.70838C10.4881 7.70838 10.2083 7.42855 10.2083 7.08337L10.8333 7.08338L11.4583 7.08329C11.4583 7.42847 11.1784 7.70838 10.8333 7.70838Z" fill={fill}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M9.16928 4.78375C9.06421 4.89049 8.95825 5.08315 8.95825 5.41673V7.08278L8.33325 7.0834L7.70825 7.08339V5.41673C7.70825 4.79793 7.91479 4.27631 8.27847 3.90685C8.637 3.54263 9.11305 3.36316 9.58325 3.36316C10.0535 3.36316 10.5295 3.54263 10.888 3.90685C11.2517 4.27631 11.4583 4.79793 11.4583 5.41673V7.08331L10.8333 7.0834L10.2083 7.08339V5.4168C10.2083 5.08322 10.1023 4.89049 9.99722 4.78375C9.887 4.67178 9.73805 4.61316 9.58325 4.61316C9.42846 4.61316 9.2795 4.67178 9.16928 4.78375ZM10.8333 7.0834L10.2083 7.08339C10.2083 7.42857 10.4881 7.7084 10.8333 7.7084C11.1784 7.7084 11.4583 7.42849 11.4583 7.08331L10.8333 7.0834ZM8.33325 7.7084C7.98807 7.7084 7.70825 7.42857 7.70825 7.08339L8.33325 7.0834L8.95825 7.08278C8.95825 7.42796 8.67843 7.7084 8.33325 7.7084Z" fill={fill}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M7.08325 4.79175C6.73807 4.79175 6.45825 5.07157 6.45825 5.41675V11.2501C6.45825 11.5953 6.17843 11.8751 5.83325 11.8751C5.48807 11.8751 5.20825 11.5953 5.20825 11.2501V5.41675C5.20825 4.38121 6.04772 3.54175 7.08325 3.54175C8.05028 3.54175 8.95825 4.2195 8.95825 5.31977V7.0828L8.33325 7.08342L7.70825 7.08341V5.32014C7.70825 5.0397 7.49694 4.79175 7.08325 4.79175ZM8.33325 7.70842C7.98807 7.70842 7.70825 7.42859 7.70825 7.08341L8.33325 7.08342L8.95825 7.0828C8.95825 7.42798 8.67843 7.70842 8.33325 7.70842Z" fill={fill}/>
    </svg>
  )
}

function RestartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path d="M16.5751 8.42079C16.3968 7.99996 16.1759 7.59163 15.9176 7.20746L14.5359 8.13996C14.7343 8.43329 14.9034 8.74579 15.0393 9.06913C15.1793 9.40079 15.2868 9.74663 15.3584 10.0941C15.4318 10.455 15.4693 10.8258 15.4693 11.1975C15.4693 11.5691 15.4318 11.9416 15.3584 12.3008C15.2868 12.6491 15.1801 12.9933 15.0384 13.3266C14.9034 13.6483 14.7343 13.9608 14.5359 14.2533C14.3409 14.5425 14.1151 14.815 13.8668 15.0641C13.6193 15.3116 13.3468 15.5358 13.0559 15.7325C12.7626 15.9308 12.4509 16.1 12.1276 16.2358C11.7984 16.375 11.4534 16.4825 11.1034 16.555C10.3834 16.7008 9.61509 16.7008 8.89842 16.555C8.54676 16.4825 8.20092 16.375 7.87092 16.235C7.54842 16.0991 7.23676 15.93 6.94342 15.7316C6.65426 15.5375 6.38259 15.3125 6.13426 15.065C5.88509 14.815 5.66009 14.5416 5.46509 14.2541C5.26759 13.9616 5.09842 13.6491 4.96092 13.325C4.82176 12.995 4.71509 12.6508 4.64259 12.3C4.56926 11.9408 4.53176 11.57 4.53176 11.1975C4.53176 10.825 4.56926 10.4541 4.64342 10.0941C4.71509 9.74413 4.82176 9.39913 4.96092 9.06913C5.09842 8.74413 5.26842 8.43163 5.46509 8.14079C5.66009 7.85163 5.88509 7.57913 6.13342 7.33079C6.38009 7.08329 6.65259 6.85829 6.94342 6.66246C7.23509 6.46579 7.54759 6.29579 7.87176 6.15829C8.20092 6.01913 8.54676 5.91163 8.89676 5.83996C8.98592 5.82163 9.07676 5.81329 9.16676 5.79913V8.33329L13.3334 4.99996L9.16676 1.66663V4.11496C8.96426 4.13913 8.76176 4.16663 8.56259 4.20746C8.10426 4.30163 7.65259 4.44163 7.22259 4.62413C6.79842 4.80329 6.39009 5.02496 6.01009 5.28246C5.63176 5.53746 5.27676 5.82996 4.95426 6.15246C4.63092 6.47579 4.33842 6.83079 4.08342 7.20746C3.82592 7.58829 3.60509 7.99579 3.42509 8.41996C3.24259 8.85163 3.10259 9.30246 3.00926 9.75996C2.91259 10.2291 2.86426 10.7133 2.86426 11.1983C2.86426 11.6833 2.91342 12.1666 3.00926 12.6358C3.10342 13.095 3.24342 13.5458 3.42509 13.975C3.60426 14.3991 3.82592 14.8075 4.08342 15.1883C4.33759 15.5633 4.63009 15.9183 4.95426 16.245C5.27842 16.5683 5.63259 16.8608 6.00842 17.1141C6.39092 17.3733 6.79926 17.595 7.22176 17.7725C7.65176 17.9541 8.10259 18.095 8.56259 18.1891C9.03259 18.2841 9.51592 18.3333 10.0001 18.3333C10.4843 18.3333 10.9676 18.2841 11.4393 18.1883C11.8984 18.0933 12.3493 17.9533 12.7759 17.7725C13.1984 17.595 13.6076 17.3733 13.9901 17.1141C14.3676 16.8591 14.7226 16.5666 15.0468 16.2425C15.3701 15.9183 15.6626 15.5641 15.9176 15.1875C16.1776 14.8025 16.3976 14.3941 16.5743 13.975C16.7576 13.5416 16.8984 13.0908 16.9909 12.635C17.0868 12.1658 17.1359 11.6816 17.1359 11.1975C17.1359 10.7141 17.0868 10.23 16.9909 9.75996C16.8976 9.30496 16.7568 8.85413 16.5751 8.42079Z" fill="#AFAFAF"/>
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path d="M4.61317 18.2383C4.73484 18.3016 4.86734 18.3333 4.99984 18.3333C5.1665 18.3333 5.3315 18.2833 5.474 18.185L16.3073 10.685C16.5323 10.5291 16.6665 10.2733 16.6665 9.99996C16.6665 9.72663 16.5323 9.47079 16.3073 9.31496L5.474 1.81496C5.21984 1.63913 4.88734 1.61829 4.61317 1.76163C4.33817 1.90579 4.1665 2.18996 4.1665 2.49996V17.5C4.1665 17.81 4.33817 18.0941 4.61317 18.2383Z" fill="white"/>
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="white">
      <rect x="4"  y="3" width="4" height="14" rx="1.5"/>
      <rect x="12" y="3" width="4" height="14" rx="1.5"/>
    </svg>
  )
}
