'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useEditorStore } from '@/lib/store/editor'
import { IconBounce } from '@/components/ui/IconBounce'
import { Tooltip } from '@/components/ui/Tooltip'
import type { AnimParams } from '@/types'
import {
  Play, Repeat2, RefreshCw,
  LogIn, LogOut, ArrowLeftRight,
  Layers, Box, Spline,
} from 'lucide-react'

type ActiveControl = 'speed' | 'delay' | 'loop' | 'direction' | 'target' | null

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.5, 2.5] as const

// Shared styles matching Figma 297:5439 "Edit Tools"
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

const pillActiveStyle: React.CSSProperties = {
  ...pillStyle,
  background: 'rgba(255,255,255,0.95)',
  border: '1px solid rgba(63,55,201,0.2)',
  boxShadow: '0 0 0 1.5px #3f37c9',
  color: '#3f37c9',
}

const iconPillStyle: React.CSSProperties = {
  ...pillStyle,
  padding: 9,
}

export function BottomBar() {
  const [active, setActive] = useState<ActiveControl>(null)
  const barRef = useRef<HTMLDivElement>(null)

  const params      = useEditorStore(s => s.params)
  const isPlaying   = useEditorStore(s => s.isPlaying)
  const svgSource   = useEditorStore(s => s.svgSource)
  const zoom        = useEditorStore(s => s.zoom)
  const isPanMode   = useEditorStore(s => s.isPanMode)
  const updateParam = useEditorStore(s => s.updateParam)
  const setPlaying  = useEditorStore(s => s.setPlaying)
  const resetView   = useEditorStore(s => s.resetView)
  const setPanMode  = useEditorStore(s => s.setPanMode)

  const set = <K extends keyof AnimParams>(key: K) => (value: AnimParams[K]) => updateParam(key, value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setActive(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // H key → toggle pan mode (Figma-style shortcut)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === 'h' || e.key === 'H' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        setPanMode(!isPanMode)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isPanMode, setPanMode])

  const toggle = (c: ActiveControl) => setActive(prev => prev === c ? null : c)

  const handleRestart = () => {
    const cur = params.speed
    updateParam('speed', cur)
  }

  return (
    // Outer div owns the centering transform — motion must not touch it
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
    <motion.div
      ref={barRef}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28, delay: 0.05 }}
    >
      {/* Popovers — rendered as portals fixed above the bar */}
      <AnimatePresence>
        {active === 'speed' && (
          <Popover key="speed" bare>
            <div style={{
              display: 'flex',
              gap: 4,
              padding: 8,
              borderRadius: 14,
              background: 'rgba(251,251,251,0.72)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.06)',
            }}>
              {SPEED_OPTIONS.map((val, idx) => {
                const sel = params.speed === val
                return (
                  <motion.button
                    key={val}
                    onClick={() => { set('speed')(val); setActive(null) }}
                    initial={{ opacity: 0, y: 6, scale: 0.88 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 560, damping: 26, delay: idx * 0.04 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: 8,
                      borderRadius: 8,
                      border: 'none',
                      background: sel ? '#eeeeee' : 'transparent',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-geist-sans), sans-serif',
                      fontWeight: 500,
                      fontSize: 14,
                      lineHeight: '20px',
                      color: sel ? '#000' : '#545454',
                      whiteSpace: 'nowrap',
                      transition: 'background 0.1s',
                    }}
                  >
                    <SpeedometerIcon color={sel ? '#3f37c9' : '#afafaf'} />
                    {val}x
                  </motion.button>
                )
              })}
            </div>
          </Popover>
        )}
        {active === 'delay' && (
          <Popover key="delay" bare>
            <DelaySlider value={params.delay} onChange={set('delay')} />
          </Popover>
        )}
        {active === 'loop' && (
          <Popover key="loop" bare>
            <ChipPanel
              value={params.loop}
              onChange={v => { set('loop')(v as AnimParams['loop']); setActive(null) }}
              options={LOOP_OPTIONS}
            />
          </Popover>
        )}
        {active === 'direction' && (
          <Popover key="direction" bare>
            <ChipPanel
              value={params.direction}
              onChange={v => { set('direction')(v as AnimParams['direction']); setActive(null) }}
              options={DIRECTION_OPTIONS}
            />
          </Popover>
        )}
        {active === 'target' && (
          <Popover key="target" bare>
            <ChipPanel
              value={params.scope}
              onChange={v => { set('scope')(v as AnimParams['scope']); setActive(null) }}
              options={TARGET_OPTIONS}
            />
          </Popover>
        )}
      </AnimatePresence>

      {/* ── Bar — Figma 297:5439 "Edit Tools"
           bg: rgba(251,251,251,0.6), radius: 74px, px-8 py-6
           groups separated by 1px vertical lines (26px tall)     */}
      <div
        className="flex items-center gap-[6px] px-[6px] py-[5px] backdrop-blur-md"
        style={{ borderRadius: 74, background: 'rgba(251,251,251,0.6)' }}
      >
        {/* Group 1: Speed + Delay */}
        <Tooltip label="Playback speed" disabled={active === 'speed'}>
          <motion.button
            style={active === 'speed' ? pillActiveStyle : pillStyle}
            onClick={() => toggle('speed')}
            initial="rest" whileHover="hover"
          >
            <IconBounce type="zap" className="w-[16px] h-[16px] flex-shrink-0">
              <SpeedometerIcon color={active === 'speed' ? '#3f37c9' : '#AFAFAF'} />
            </IconBounce>
            Speed
          </motion.button>
        </Tooltip>

        <Tooltip label="Start delay" disabled={active === 'delay'}>
          <motion.button
            style={active === 'delay' ? pillActiveStyle : pillStyle}
            onClick={() => toggle('delay')}
            initial="rest" whileHover="hover"
          >
            <IconBounce type="tick" className="w-[16px] h-[16px] flex-shrink-0">
              <DelayIcon color={active === 'delay' ? '#3f37c9' : '#AFAFAF'} />
            </IconBounce>
            Delay
          </motion.button>
        </Tooltip>

        <Divider />

        {/* Group 2: Loop + Direction */}
        <Tooltip label="Loop behavior" disabled={active === 'loop'}>
          <motion.button
            style={active === 'loop' ? pillActiveStyle : pillStyle}
            onClick={() => toggle('loop')}
            initial="rest" whileHover="hover"
          >
            <IconBounce type="tug" className="w-[16px] h-[16px] flex-shrink-0">
              <LoopIcon color={active === 'loop' ? '#3f37c9' : '#AFAFAF'} />
            </IconBounce>
            Loop
          </motion.button>
        </Tooltip>

        <Tooltip label="Animation direction" disabled={active === 'direction'}>
          <motion.button
            style={active === 'direction' ? pillActiveStyle : pillStyle}
            onClick={() => toggle('direction')}
            initial="rest" whileHover="hover"
          >
            <IconBounce type="nudge" className="w-[16px] h-[16px] flex-shrink-0">
              <DirectionIcon color={active === 'direction' ? '#3f37c9' : '#AFAFAF'} />
            </IconBounce>
            Direction
          </motion.button>
        </Tooltip>

        <Divider />

        {/* Group 3: Target */}
        <Tooltip label="Target elements" disabled={active === 'target'}>
          <motion.button
            style={active === 'target' ? pillActiveStyle : pillStyle}
            onClick={() => toggle('target')}
            initial="rest" whileHover="hover"
          >
            <IconBounce type="focus" className="w-[16px] h-[16px] flex-shrink-0">
              <TargetIcon color={active === 'target' ? '#3f37c9' : '#AFAFAF'} />
            </IconBounce>
            Target
          </motion.button>
        </Tooltip>

        <Divider />

        {/* Group 4: Zoom % + Pan toggle */}
        <Tooltip label="Reset zoom">
          <motion.button
            style={pillStyle}
            onClick={resetView}
            initial="rest" whileHover="hover"
          >
            <IconBounce type="focus" className="w-[16px] h-[16px] flex-shrink-0">
              <ZoomIcon />
            </IconBounce>
            <span style={{ minWidth: 32, textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </span>
          </motion.button>
        </Tooltip>

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

        {/* Group 5: Restart + Play */}
        <Tooltip label="Restart animation">
          <motion.button
            style={iconPillStyle}
            onClick={handleRestart}
            disabled={!svgSource}
            initial="rest" whileHover="hover"
          >
            <IconBounce type="rewind" className="w-[16px] h-[16px]">
              <RestartIcon />
            </IconBounce>
          </motion.button>
        </Tooltip>

        <Tooltip label={isPlaying ? 'Pause' : 'Play'} kbd="⎵">
          <motion.button
            style={{ ...iconPillStyle, background: '#3f37c9', border: '1px solid white' }}
            onClick={() => setPlaying(!isPlaying)}
            disabled={!svgSource}
            initial="rest" whileHover="hover"
            whileTap={svgSource ? { scale: 0.84 } : {}}
            transition={{ type: 'spring', stiffness: 600, damping: 18 }}
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

// ── Sub-components ─────────────────────────────────────────────

// Popover — rendered inside AnimatePresence, so enter + exit are both animated
function Popover({ children, bare }: { children: React.ReactNode; bare?: boolean }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 52,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
      }}
    >
      <motion.div
        // Origin is bottom-center — panel grows upward from the bar
        initial={{ opacity: 0, y: 12, scale: 0.90, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: 8, scale: 0.94, filter: 'blur(4px)' }}
        transition={{ type: 'spring', stiffness: 480, damping: 28, mass: 0.55 }}
        style={{
          transformOrigin: 'center bottom',
          ...(bare ? {} : {
            background: 'white',
            border: '1px solid #e5e5e5',
            borderRadius: 20,
            boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            padding: 16,
            minWidth: 240,
          }),
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}

function Divider() {
  return (
    <div style={{ width: 1, height: 26, background: 'rgba(0,0,0,0.08)', flexShrink: 0, marginLeft: 2, marginRight: 2 }} />
  )
}

// ── Icons ──────────────────────────────────────────────────────
// Speedometer arc icon — used in the Speed chip selector
function SpeedometerIcon({ color = '#AFAFAF' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      {/* Main arc: center (8,11.5), r=6.5 — sweeps over the top */}
      <path d="M 1.5,11.5 A 6.5,6.5 0 0,1 14.5,11.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      {/* Left tick at arc end */}
      <line x1="1.5" y1="11.5" x2="2.6" y2="8.9" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      {/* Right tick at arc end */}
      <line x1="14.5" y1="11.5" x2="13.4" y2="8.9" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      {/* Center needle pointing straight up */}
      <line x1="8" y1="11.5" x2="8" y2="4.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      {/* Needle base dot */}
      <circle cx="8" cy="11.5" r="1.5" fill={color}/>
    </svg>
  )
}


function DelayIcon({ color = '#AFAFAF' }: { color?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M9.99995 5.625C9.62116 5.625 9.24911 5.65227 8.88558 5.70488C8.54396 5.75431 8.22695 5.51744 8.17752 5.17582C8.12809 4.8342 8.36495 4.51719 8.70657 4.46776C9.1292 4.40661 9.56107 4.375 9.99995 4.375C10.3959 4.375 10.7862 4.40073 11.1692 4.45069C11.5115 4.49533 11.7528 4.809 11.7081 5.15128C11.6635 5.49356 11.3498 5.73483 11.0075 5.69019C10.678 5.64721 10.3417 5.625 9.99995 5.625ZM12.6125 5.39293C12.7447 5.07408 13.1104 4.92279 13.4293 5.05501C14.1579 5.35716 14.8377 5.75254 15.454 6.2261C15.7277 6.43642 15.7791 6.8288 15.5687 7.1025C15.3584 7.3762 14.966 7.42757 14.6923 7.21725C14.1617 6.80949 13.5768 6.46939 12.9504 6.20967C12.6316 6.07744 12.4803 5.71178 12.6125 5.39293ZM7.05584 5.50983C7.20143 5.8228 7.06574 6.19453 6.75276 6.34012C6.07263 6.65651 5.44603 7.06941 4.89067 7.5614C4.6323 7.7903 4.2373 7.7664 4.0084 7.50803C3.77951 7.24966 3.80341 6.85465 4.06178 6.62576C4.70654 6.05456 5.43454 5.57471 6.22554 5.20675C6.53851 5.06116 6.91025 5.19685 7.05584 5.50983ZM16.2308 7.76456C16.5045 7.55423 16.8969 7.60561 17.1072 7.8793C17.5807 8.49555 17.9761 9.1754 18.2783 9.90403C18.4105 10.2229 18.2592 10.5885 17.9404 10.7208C17.6215 10.853 17.2558 10.7017 17.1236 10.3828C16.8639 9.75652 16.5238 9.17158 16.116 8.64096C15.9057 8.36726 15.9571 7.97488 16.2308 7.76456ZM3.25284 8.40175C3.54579 8.58431 3.63528 8.96978 3.45273 9.26274C3.25656 9.57753 3.08252 9.90742 2.93274 10.2502C2.79454 10.5665 2.42609 10.7109 2.10979 10.5727C1.79348 10.4345 1.6491 10.0661 1.7873 9.74977C1.96153 9.35101 2.16389 8.96747 2.39185 8.60165C2.57441 8.30869 2.95988 8.2192 3.25284 8.40175ZM18.182 11.6252C18.5243 11.5805 18.8379 11.8218 18.8826 12.1641C18.9326 12.547 18.9583 12.9373 18.9583 13.3333C18.9583 13.6785 18.6785 13.9583 18.3333 13.9583C17.9881 13.9583 17.7083 13.6785 17.7083 13.3333C17.7083 12.9915 17.6861 12.6553 17.6431 12.3258C17.5984 11.9835 17.8397 11.6698 18.182 11.6252Z" fill={color}/>
      <path d="M1.66659 14.1666C2.12682 14.1666 2.49992 13.7935 2.49992 13.3333C2.49992 12.8731 2.12682 12.5 1.66659 12.5C1.20635 12.5 0.833252 12.8731 0.833252 13.3333C0.833252 13.7935 1.20635 14.1666 1.66659 14.1666Z" fill={color}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M0.208252 13.3333C0.208252 14.1387 0.86117 14.7916 1.66659 14.7916C2.472 14.7916 3.12492 14.1387 3.12492 13.3333C3.12492 12.5279 2.472 11.875 1.66659 11.875C0.86117 11.875 0.208252 12.5279 0.208252 13.3333ZM1.66659 13.5416C1.55153 13.5416 1.45825 13.4484 1.45825 13.3333C1.45825 13.2182 1.55153 13.125 1.66659 13.125C1.78164 13.125 1.87492 13.2182 1.87492 13.3333C1.87492 13.4484 1.78164 13.5416 1.66659 13.5416Z" fill={color}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M1.04175 13.3334C1.04175 12.9882 1.32157 12.7084 1.66675 12.7084H10.0001C10.3453 12.7084 10.6251 12.9882 10.6251 13.3334C10.6251 13.6786 10.3453 13.9584 10.0001 13.9584H1.66675C1.32157 13.9584 1.04175 13.6786 1.04175 13.3334Z" fill={color}/>
      <path d="M10.0001 14.1666C10.4603 14.1666 10.8334 13.7935 10.8334 13.3333C10.8334 12.8731 10.4603 12.5 10.0001 12.5C9.53984 12.5 9.16675 12.8731 9.16675 13.3333C9.16675 13.7935 9.53984 14.1666 10.0001 14.1666Z" fill={color}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M8.54175 13.3333C8.54175 14.1387 9.19467 14.7916 10.0001 14.7916C10.8055 14.7916 11.4584 14.1387 11.4584 13.3333C11.4584 12.5279 10.8055 11.875 10.0001 11.875C9.19467 11.875 8.54175 12.5279 8.54175 13.3333ZM10.0001 13.5416C9.88502 13.5416 9.79175 13.4484 9.79175 13.3333C9.79175 13.2182 9.88502 13.125 10.0001 13.125C10.1151 13.125 10.2084 13.2182 10.2084 13.3333C10.2084 13.4484 10.1151 13.5416 10.0001 13.5416Z" fill={color}/>
    </svg>
  )
}

function LoopIcon({ color = '#AFAFAF' }: { color?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M6.08824 4.79163C5.45433 4.79163 4.96739 5.35307 5.05704 5.98061L6.24752 14.3139C6.32083 14.8271 6.76033 15.2083 7.27872 15.2083H7.72106C8.23945 15.2083 8.67895 14.8271 8.75226 14.3139L9.94274 5.98061C10.0324 5.35307 9.54545 4.79163 8.91154 4.79163H6.08824ZM3.81961 6.15738C3.62238 4.77681 4.69365 3.54163 6.08824 3.54163H8.91154C10.3061 3.54163 11.3774 4.77681 11.1802 6.15738L9.9897 14.4907C9.82841 15.6197 8.86151 16.4583 7.72106 16.4583H7.27872C6.13827 16.4583 5.17137 15.6197 5.01008 14.4907L3.81961 6.15738Z" fill={color}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M1.04175 10C1.04175 9.65482 1.32157 9.375 1.66675 9.375H5.00008C5.34526 9.375 5.62508 9.65482 5.62508 10C5.62508 10.3452 5.34526 10.625 5.00008 10.625H1.66675C1.32157 10.625 1.04175 10.3452 1.04175 10ZM9.37508 10C9.37508 9.65482 9.6549 9.375 10.0001 9.375L18.3334 9.375C18.6786 9.375 18.9584 9.65482 18.9584 10C18.9584 10.3452 18.6786 10.625 18.3334 10.625L10.0001 10.625C9.6549 10.625 9.37508 10.3452 9.37508 10Z" fill={color}/>
    </svg>
  )
}

function DirectionIcon({ color = '#AFAFAF' }: { color?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M15.8333 3.125C16.4086 3.125 16.875 3.59137 16.875 4.16667C16.875 4.74196 16.4086 5.20833 15.8333 5.20833C15.258 5.20833 14.7917 4.74196 14.7917 4.16667C14.7917 3.59137 15.258 3.125 15.8333 3.125ZM18.125 4.16667C18.125 2.90101 17.099 1.875 15.8333 1.875C14.5677 1.875 13.5417 2.90101 13.5417 4.16667C13.5417 5.43232 14.5677 6.45833 15.8333 6.45833C17.099 6.45833 18.125 5.43232 18.125 4.16667Z" fill={color}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M13.2383 7.79741C13.5343 7.97501 13.6303 8.35892 13.4527 8.65491C12.2516 10.6568 11.0234 14.3285 10.6166 16.7694C10.5721 17.0365 10.3607 17.2445 10.093 17.2847C9.82532 17.325 9.56214 17.1883 9.44107 16.9462C8.42473 14.9135 7.46377 13.9141 6.5543 13.481C5.66728 13.0586 4.70652 13.1178 3.53106 13.5096C3.2036 13.6188 2.84965 13.4418 2.74049 13.1143C2.63134 12.7869 2.80831 12.4329 3.13578 12.3238C4.46032 11.8822 5.79123 11.7331 7.09171 12.3524C8.04381 12.8058 8.90952 13.6386 9.73031 14.9161C10.3152 12.5531 11.3393 9.74768 12.3808 8.01179C12.5584 7.7158 12.9423 7.61982 13.2383 7.79741Z" fill={color}/>
    </svg>
  )
}

function TargetIcon({ color = '#AFAFAF' }: { color?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M3.84542 16.2436C2.36514 16.3916 1.13837 15.1119 1.34876 13.6392L1.8476 10.1473C1.86156 10.0496 1.86156 9.95039 1.8476 9.85267L1.34876 6.3608C1.13837 4.88808 2.36514 3.60838 3.84543 3.75641L9.89634 4.3615C9.96527 4.3684 10.0347 4.3684 10.1036 4.3615L16.1546 3.75641C17.6348 3.60838 18.8616 4.88808 18.6512 6.36079L18.1524 9.85267C18.1384 9.95039 18.1384 10.0496 18.1524 10.1473L18.6512 13.6392C18.8616 15.1119 17.6348 16.3916 16.1546 16.2436L10.1036 15.6385C10.0347 15.6316 9.96527 15.6316 9.89634 15.6385L3.84542 16.2436ZM2.5862 13.816C2.49057 14.4854 3.04819 15.067 3.72104 14.9998L9.77196 14.3947C9.9236 14.3795 10.0764 14.3795 10.228 14.3947L16.2789 14.9998C16.9518 15.067 17.5094 14.4854 17.4138 13.816L16.9149 10.3241C16.8842 10.1091 16.8842 9.89086 16.9149 9.6759L17.4138 6.18402C17.5094 5.5146 16.9518 4.93292 16.2789 5.00021L10.228 5.6053C10.0764 5.62046 9.9236 5.62046 9.77196 5.6053L3.72105 5.00021C3.04819 4.93292 2.49057 5.51461 2.5862 6.18402L3.08504 9.6759C3.11575 9.89087 3.11575 10.1091 3.08504 10.3241L2.5862 13.816Z" fill={color}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M13.6668 7.87496C13.4597 7.59882 13.5156 7.20707 13.7918 6.99996L17.1251 4.49996C17.4013 4.29286 17.793 4.34882 18.0001 4.62496C18.2072 4.90111 18.1513 5.29286 17.8751 5.49996L14.5418 7.99996C14.2656 8.20707 13.8739 8.15111 13.6668 7.87496Z" fill={color}/>
      <path fillRule="evenodd" clipRule="evenodd" d="M2.00004 15.375C1.79293 15.0988 1.84889 14.7071 2.12504 14.5L5.45837 12C5.73451 11.7929 6.12626 11.8488 6.33337 12.125C6.54048 12.4011 6.48451 12.7929 6.20837 13L2.87504 15.5C2.59889 15.7071 2.20714 15.6511 2.00004 15.375Z" fill={color}/>
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

function ZoomIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M9.16667 3.125C5.82995 3.125 3.125 5.82995 3.125 9.16667C3.125 12.5034 5.82995 15.2083 9.16667 15.2083C10.7906 15.2083 12.2637 14.5638 13.3481 13.5168L13.5168 13.3481C14.5638 12.2637 15.2083 10.7906 15.2083 9.16667C15.2083 5.82995 12.5034 3.125 9.16667 3.125ZM1.875 9.16667C1.875 5.13959 5.13959 1.875 9.16667 1.875C13.1937 1.875 16.4583 5.13959 16.4583 9.16667C16.4583 10.9518 15.8217 12.5889 14.7654 13.8722L17.9464 17.0533C18.1905 17.2973 18.1905 17.6927 17.9464 17.9367C17.7024 18.1808 17.307 18.1808 17.063 17.9367L13.8819 14.7557C12.5986 15.812 11.0216 16.4583 9.16667 16.4583C5.13959 16.4583 1.875 13.1937 1.875 9.16667ZM9.16667 6.45833C9.51184 6.45833 9.79167 6.73816 9.79167 7.08333V8.54167H11.25C11.5952 8.54167 11.875 8.82149 11.875 9.16667C11.875 9.51184 11.5952 9.79167 11.25 9.79167H9.79167V11.25C9.79167 11.5952 9.51184 11.875 9.16667 11.875C8.82149 11.875 8.54167 11.5952 8.54167 11.25V9.79167H7.08333C6.73816 9.79167 6.45833 9.51184 6.45833 9.16667C6.45833 8.82149 6.73816 8.54167 7.08333 8.54167H8.54167V7.08333C8.54167 6.73816 8.82149 6.45833 9.16667 6.45833Z" fill="#AFAFAF"/>
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

// ── Chip Panel (Loop / Direction / Target popovers) ─────────────

interface ChipOption {
  value: string
  label: string
  renderIcon: (active: boolean) => React.ReactNode
}

const chipF: React.CSSProperties = {
  fontFamily: 'var(--font-geist-sans), sans-serif',
}

// Wraps a lucide icon in a motion.span that responds to parent hover variants
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HoverIcon({
  children,
  anim,
  transition,
}: {
  children: React.ReactNode
  anim: any
  transition?: any
}) {
  return (
    <motion.span
      variants={{ rest: {}, hover: anim }}
      transition={transition ?? { type: 'spring', stiffness: 480, damping: 22 }}
      style={{ display: 'inline-flex', flexShrink: 0, transformOrigin: 'center' }}
    >
      {children}
    </motion.span>
  )
}

function ChipPanel({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: ChipOption[]
}) {
  return (
    <div style={{
      display: 'flex',
      gap: 4,
      padding: 8,
      borderRadius: 14,
      background: 'rgba(251,251,251,0.72)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.06)',
    }}>
      {options.map((opt, idx) => {
        const sel = value === opt.value
        return (
          <motion.button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            // Staggered entrance — initial obj + animate obj coexist fine with whileHover string
            initial={{ opacity: 0, y: 6, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 560, damping: 26, delay: idx * 0.04 }}
            whileHover="hover"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: 8,
              borderRadius: 8,
              border: 'none',
              background: sel ? '#eeeeee' : 'transparent',
              cursor: 'pointer',
              ...chipF,
              fontWeight: 500,
              fontSize: 14,
              lineHeight: '20px',
              color: sel ? '#000' : '#545454',
              whiteSpace: 'nowrap',
              transition: 'background 0.1s',
            }}
          >
            {opt.renderIcon(sel)}
            {opt.label}
          </motion.button>
        )
      })}
    </div>
  )
}

// ── Loop options ─────────────────────────────────────────────────

const LOOP_OPTIONS: ChipOption[] = [
  {
    value: 'once',
    label: 'Once',
    renderIcon: (sel) => (
      <HoverIcon anim={{ x: 2 }}>
        <Play size={14} color={sel ? '#111' : '#afafaf'} fill={sel ? '#111' : '#afafaf'} />
      </HoverIcon>
    ),
  },
  {
    value: 'loop',
    label: 'Loop',
    renderIcon: (sel) => (
      <HoverIcon anim={{ rotate: 180 }} transition={{ type: 'tween', duration: 0.45, ease: 'easeInOut' }}>
        <Repeat2 size={14} color={sel ? '#111' : '#afafaf'} />
      </HoverIcon>
    ),
  },
  {
    value: 'bounce',
    label: 'Bounce',
    renderIcon: (sel) => (
      <HoverIcon anim={{ y: -3 }} transition={{ type: 'spring', stiffness: 600, damping: 10 }}>
        <RefreshCw size={14} color={sel ? '#111' : '#afafaf'} />
      </HoverIcon>
    ),
  },
]

// ── Direction options ─────────────────────────────────────────────

const DIRECTION_OPTIONS: ChipOption[] = [
  {
    value: 'in',
    label: 'In',
    renderIcon: (sel) => (
      <HoverIcon anim={{ x: 2 }}>
        <LogIn size={14} color={sel ? '#111' : '#afafaf'} />
      </HoverIcon>
    ),
  },
  {
    value: 'out',
    label: 'Out',
    renderIcon: (sel) => (
      <HoverIcon anim={{ x: -2 }}>
        <LogOut size={14} color={sel ? '#111' : '#afafaf'} />
      </HoverIcon>
    ),
  },
  {
    value: 'in-out',
    label: 'In + Out',
    renderIcon: (sel) => (
      <HoverIcon anim={{ scaleX: 1.2 }}>
        <ArrowLeftRight size={14} color={sel ? '#111' : '#afafaf'} />
      </HoverIcon>
    ),
  },
]

// ── Target options ────────────────────────────────────────────────

const TARGET_OPTIONS: ChipOption[] = [
  {
    value: 'all',
    label: 'All',
    renderIcon: (sel) => (
      <HoverIcon anim={{ y: -2 }}>
        <Layers size={14} color={sel ? '#111' : '#afafaf'} />
      </HoverIcon>
    ),
  },
  {
    value: 'groups',
    label: 'Groups',
    renderIcon: (sel) => (
      <HoverIcon anim={{ scale: 1.15 }}>
        <Box size={14} color={sel ? '#111' : '#afafaf'} />
      </HoverIcon>
    ),
  },
  {
    value: 'paths',
    label: 'Paths',
    renderIcon: (sel) => (
      <HoverIcon anim={{ rotate: -12 }}>
        <Spline size={14} color={sel ? '#111' : '#afafaf'} />
      </HoverIcon>
    ),
  },
]

// ── Delay Slider ────────────────────────────────────────────────

function DelaySlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const MIN = 0, MAX = 2, STEP = 0.1
  const pct = (value - MIN) / (MAX - MIN)

  const snap = (raw: number) =>
    Math.round(Math.max(MIN, Math.min(MAX, raw)) / STEP) * STEP

  const posToValue = (clientX: number) => {
    const track = trackRef.current
    if (!track) return value
    const rect = track.getBoundingClientRect()
    const THUMB_R = 8
    const usable = rect.width - THUMB_R * 2
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left - THUMB_R) / usable))
    return snap(ratio * (MAX - MIN) + MIN)
  }

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    onChange(posToValue(e.clientX))

    const move = (ev: PointerEvent) => onChange(posToValue(ev.clientX))
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const f: React.CSSProperties = { fontFamily: 'var(--font-geist-sans), sans-serif' }
  const THUMB_R = 8

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 520, damping: 28 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '11px 8px',
        borderRadius: 14,
        background: 'rgba(251,251,251,0.72)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.06)',
        width: 280,
      }}>
      {/* Track hit area */}
      <div
        ref={trackRef}
        onPointerDown={startDrag}
        style={{
          flex: 1,
          height: 28,
          position: 'relative',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Dashed background track */}
        <div style={{
          position: 'absolute',
          left: THUMB_R,
          right: THUMB_R,
          height: 4,
          background: 'repeating-linear-gradient(90deg,#d0d0d0 0,#d0d0d0 3px,transparent 3px,transparent 7px)',
          borderRadius: 2,
        }} />
        {/* Filled track */}
        <div style={{
          position: 'absolute',
          left: THUMB_R,
          width: `calc(${pct * 100}% - ${THUMB_R * 2 * pct}px)`,
          height: 4,
          borderRadius: 2,
          background: '#3f37c9',
        }} />
        {/* End-cap dot on dashed side */}
        <div style={{
          position: 'absolute',
          right: THUMB_R - 1,
          width: 2,
          height: 4,
          borderRadius: 1,
          background: '#afafaf',
        }} />
        {/* Thumb */}
        <div style={{
          position: 'absolute',
          left: `calc(${THUMB_R}px + ${pct} * (100% - ${THUMB_R * 2}px))`,
          transform: 'translateX(-50%)',
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: 'white',
          boxShadow: '0 1px 6px rgba(0,0,0,0.18), 0 0 0 1.5px rgba(0,0,0,0.08)',
          zIndex: 1,
          pointerEvents: 'none',
        }} />
      </div>

      {/* Value label */}
      <span style={{
        ...f,
        fontSize: 14,
        fontWeight: 500,
        color: '#545454',
        minWidth: 34,
        textAlign: 'right',
        flexShrink: 0,
      }}>
        {value.toFixed(1)}s
      </span>
    </motion.div>
  )
}
