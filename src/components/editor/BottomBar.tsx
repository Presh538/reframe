'use client'

import { useState, useRef, useEffect } from 'react'
import { useEditorStore } from '@/lib/store/editor'
import { Slider } from '@/components/ui/Slider'
import { Segmented } from '@/components/ui/Segmented'
import type { AnimParams } from '@/types'

type ActiveControl = 'speed' | 'delay' | 'loop' | 'direction' | 'target' | null

// Shared styles matching Figma 297:5439 "Edit Tools"
const pillStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.6)',
  border: '1px solid white',
  borderRadius: 34,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 12px',
  cursor: 'pointer',
  fontFamily: 'var(--font-geist-sans), sans-serif',
  fontWeight: 500,
  fontSize: 16,
  lineHeight: '24px',
  color: '#545454',
  whiteSpace: 'nowrap' as const,
  transition: 'background 0.12s',
  flexShrink: 0,
}

const pillActiveStyle: React.CSSProperties = {
  ...pillStyle,
  background: 'rgba(255,255,255,0.95)',
}

const iconPillStyle: React.CSSProperties = {
  ...pillStyle,
  padding: 12,
}

export function BottomBar() {
  const [active, setActive] = useState<ActiveControl>(null)
  const barRef = useRef<HTMLDivElement>(null)

  const params      = useEditorStore(s => s.params)
  const isPlaying   = useEditorStore(s => s.isPlaying)
  const svgSource   = useEditorStore(s => s.svgSource)
  const updateParam = useEditorStore(s => s.updateParam)
  const setPlaying  = useEditorStore(s => s.setPlaying)

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

  const toggle = (c: ActiveControl) => setActive(prev => prev === c ? null : c)

  const handleRestart = () => {
    const cur = params.speed
    updateParam('speed', cur)
  }

  return (
    <div
      ref={barRef}
      className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto"
    >
      {/* Popovers — above the bar */}
      <Popover open={active === 'speed'}>
        <div className="space-y-2 p-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#545454]">Speed</span>
            <span className="text-xs font-semibold text-[#3f37c9] tabular-nums">{params.speed}×</span>
          </div>
          <Slider label="Speed" value={params.speed} min={0.25} max={3} step={0.25}
            displayValue={`${params.speed}×`} onChange={set('speed')} compact />
        </div>
      </Popover>

      <Popover open={active === 'delay'}>
        <div className="space-y-2 p-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#545454]">Delay</span>
            <span className="text-xs font-semibold text-[#3f37c9] tabular-nums">{params.delay.toFixed(1)}s</span>
          </div>
          <Slider label="Delay" value={params.delay} min={0} max={2} step={0.1}
            displayValue={`${params.delay.toFixed(1)}s`} onChange={set('delay')} compact />
        </div>
      </Popover>

      <Popover open={active === 'loop'}>
        <Segmented
          options={[{value:'once',label:'Once'},{value:'loop',label:'Loop'},{value:'bounce',label:'Bounce'}]}
          value={params.loop} onChange={v => { set('loop')(v); setActive(null) }} />
      </Popover>

      <Popover open={active === 'direction'}>
        <Segmented
          options={[{value:'in',label:'In'},{value:'out',label:'Out'},{value:'in-out',label:'In↔Out'}]}
          value={params.direction} onChange={v => { set('direction')(v); setActive(null) }} />
      </Popover>

      <Popover open={active === 'target'}>
        <Segmented
          options={[{value:'all',label:'All'},{value:'groups',label:'Groups'},{value:'paths',label:'Paths'}]}
          value={params.scope} onChange={v => { set('scope')(v); setActive(null) }} />
      </Popover>

      {/* ── Bar — Figma 297:5439 "Edit Tools"
           bg: rgba(251,251,251,0.6), radius: 74px, px-8 py-6
           groups separated by 1px vertical lines (26px tall)     */}
      <div
        className="flex items-center gap-[8px] px-[8px] py-[6px] backdrop-blur-md"
        style={{ borderRadius: 74, background: 'rgba(251,251,251,0.6)' }}
      >
        {/* Group 1: Speed + Delay */}
        <button
          style={active === 'speed' ? pillActiveStyle : pillStyle}
          onClick={() => toggle('speed')}
        >
          <span className="w-[20px] h-[20px] flex items-center justify-center flex-shrink-0">
            <FlashIcon />
          </span>
          Speed
        </button>

        <button
          style={active === 'delay' ? pillActiveStyle : pillStyle}
          onClick={() => toggle('delay')}
        >
          <span className="w-[20px] h-[20px] flex items-center justify-center flex-shrink-0">
            <DelayIcon />
          </span>
          Delay
        </button>

        <Divider />

        {/* Group 2: Loop + Direction */}
        <button
          style={active === 'loop' ? pillActiveStyle : pillStyle}
          onClick={() => toggle('loop')}
        >
          <span className="w-[20px] h-[20px] flex items-center justify-center flex-shrink-0">
            <LoopIcon />
          </span>
          Loop
        </button>

        <button
          style={active === 'direction' ? pillActiveStyle : pillStyle}
          onClick={() => toggle('direction')}
        >
          <span className="w-[20px] h-[20px] flex items-center justify-center flex-shrink-0">
            <DirectionIcon />
          </span>
          Direction
        </button>

        <Divider />

        {/* Group 3: Target */}
        <button
          style={active === 'target' ? pillActiveStyle : pillStyle}
          onClick={() => toggle('target')}
        >
          <span className="w-[20px] h-[20px] flex items-center justify-center flex-shrink-0">
            <TargetIcon />
          </span>
          Target
        </button>

        <Divider />

        {/* Group 4: Restart + Play */}
        <button
          style={iconPillStyle}
          onClick={handleRestart}
          disabled={!svgSource}
          title="Restart"
        >
          <span className="w-[20px] h-[20px] flex items-center justify-center">
            <RestartIcon />
          </span>
        </button>

        <button
          style={{ ...iconPillStyle, background: '#3f37c9', border: '1px solid white' }}
          onClick={() => setPlaying(!isPlaying)}
          disabled={!svgSource}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          <span className="w-[20px] h-[20px] flex items-center justify-center">
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </span>
        </button>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────

function Popover({ open, children }: { open: boolean; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div
      className="animate-pop-in"
      style={{
        position: 'fixed',
        bottom: 96,           // 20px bar offset + 56px bar height + 20px gap
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        background: 'white',
        border: '1px solid #e5e5e5',
        borderRadius: 20,
        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        padding: 16,
        minWidth: 240,
      }}
    >
      {children}
    </div>
  )
}

function Divider() {
  return (
    <div style={{ width: 1, height: 26, background: 'rgba(0,0,0,0.08)', flexShrink: 0, marginLeft: 2, marginRight: 2 }} />
  )
}

// ── Icons ──────────────────────────────────────────────────────
function FlashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M3.6098 11.9503C3.71648 12.1598 3.93167 12.2917 4.16675 12.2917H8.54175V17.5C8.54175 17.7708 8.71603 18.0107 8.97347 18.0944C9.23092 18.1781 9.51299 18.0866 9.67221 17.8677L16.3389 8.70098C16.4771 8.51087 16.497 8.25925 16.3904 8.04976C16.2837 7.84028 16.0685 7.70838 15.8334 7.70838H11.4584V2.50004C11.4584 2.22933 11.2841 1.98939 11.0267 1.90568C10.7693 1.82196 10.4872 1.9135 10.328 2.13244L3.66129 11.2991C3.52302 11.4892 3.50313 11.7408 3.6098 11.9503ZM10.2084 4.42203V8.33338C10.2084 8.67855 10.4882 8.95838 10.8334 8.95838H14.6061L9.79175 15.5781V11.6667C9.79175 11.3215 9.51193 11.0417 9.16675 11.0417H5.39411L10.2084 4.42203Z" fill="#AFAFAF"/>
    </svg>
  )
}

function DelayIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M9.99995 5.625C9.62116 5.625 9.24911 5.65227 8.88558 5.70488C8.54396 5.75431 8.22695 5.51744 8.17752 5.17582C8.12809 4.8342 8.36495 4.51719 8.70657 4.46776C9.1292 4.40661 9.56107 4.375 9.99995 4.375C10.3959 4.375 10.7862 4.40073 11.1692 4.45069C11.5115 4.49533 11.7528 4.809 11.7081 5.15128C11.6635 5.49356 11.3498 5.73483 11.0075 5.69019C10.678 5.64721 10.3417 5.625 9.99995 5.625ZM12.6125 5.39293C12.7447 5.07408 13.1104 4.92279 13.4293 5.05501C14.1579 5.35716 14.8377 5.75254 15.454 6.2261C15.7277 6.43642 15.7791 6.8288 15.5687 7.1025C15.3584 7.3762 14.966 7.42757 14.6923 7.21725C14.1617 6.80949 13.5768 6.46939 12.9504 6.20967C12.6316 6.07744 12.4803 5.71178 12.6125 5.39293ZM7.05584 5.50983C7.20143 5.8228 7.06574 6.19453 6.75276 6.34012C6.07263 6.65651 5.44603 7.06941 4.89067 7.5614C4.6323 7.7903 4.2373 7.7664 4.0084 7.50803C3.77951 7.24966 3.80341 6.85465 4.06178 6.62576C4.70654 6.05456 5.43454 5.57471 6.22554 5.20675C6.53851 5.06116 6.91025 5.19685 7.05584 5.50983ZM16.2308 7.76456C16.5045 7.55423 16.8969 7.60561 17.1072 7.8793C17.5807 8.49555 17.9761 9.1754 18.2783 9.90403C18.4105 10.2229 18.2592 10.5885 17.9404 10.7208C17.6215 10.853 17.2558 10.7017 17.1236 10.3828C16.8639 9.75652 16.5238 9.17158 16.116 8.64096C15.9057 8.36726 15.9571 7.97488 16.2308 7.76456ZM3.25284 8.40175C3.54579 8.58431 3.63528 8.96978 3.45273 9.26274C3.25656 9.57753 3.08252 9.90742 2.93274 10.2502C2.79454 10.5665 2.42609 10.7109 2.10979 10.5727C1.79348 10.4345 1.6491 10.0661 1.7873 9.74977C1.96153 9.35101 2.16389 8.96747 2.39185 8.60165C2.57441 8.30869 2.95988 8.2192 3.25284 8.40175ZM18.182 11.6252C18.5243 11.5805 18.8379 11.8218 18.8826 12.1641C18.9326 12.547 18.9583 12.9373 18.9583 13.3333C18.9583 13.6785 18.6785 13.9583 18.3333 13.9583C17.9881 13.9583 17.7083 13.6785 17.7083 13.3333C17.7083 12.9915 17.6861 12.6553 17.6431 12.3258C17.5984 11.9835 17.8397 11.6698 18.182 11.6252Z" fill="#AFAFAF"/>
      <path d="M1.66659 14.1666C2.12682 14.1666 2.49992 13.7935 2.49992 13.3333C2.49992 12.8731 2.12682 12.5 1.66659 12.5C1.20635 12.5 0.833252 12.8731 0.833252 13.3333C0.833252 13.7935 1.20635 14.1666 1.66659 14.1666Z" fill="#AFAFAF"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M0.208252 13.3333C0.208252 14.1387 0.86117 14.7916 1.66659 14.7916C2.472 14.7916 3.12492 14.1387 3.12492 13.3333C3.12492 12.5279 2.472 11.875 1.66659 11.875C0.86117 11.875 0.208252 12.5279 0.208252 13.3333ZM1.66659 13.5416C1.55153 13.5416 1.45825 13.4484 1.45825 13.3333C1.45825 13.2182 1.55153 13.125 1.66659 13.125C1.78164 13.125 1.87492 13.2182 1.87492 13.3333C1.87492 13.4484 1.78164 13.5416 1.66659 13.5416Z" fill="#AFAFAF"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M1.04175 13.3334C1.04175 12.9882 1.32157 12.7084 1.66675 12.7084H10.0001C10.3453 12.7084 10.6251 12.9882 10.6251 13.3334C10.6251 13.6786 10.3453 13.9584 10.0001 13.9584H1.66675C1.32157 13.9584 1.04175 13.6786 1.04175 13.3334Z" fill="#AFAFAF"/>
      <path d="M10.0001 14.1666C10.4603 14.1666 10.8334 13.7935 10.8334 13.3333C10.8334 12.8731 10.4603 12.5 10.0001 12.5C9.53984 12.5 9.16675 12.8731 9.16675 13.3333C9.16675 13.7935 9.53984 14.1666 10.0001 14.1666Z" fill="#AFAFAF"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M8.54175 13.3333C8.54175 14.1387 9.19467 14.7916 10.0001 14.7916C10.8055 14.7916 11.4584 14.1387 11.4584 13.3333C11.4584 12.5279 10.8055 11.875 10.0001 11.875C9.19467 11.875 8.54175 12.5279 8.54175 13.3333ZM10.0001 13.5416C9.88502 13.5416 9.79175 13.4484 9.79175 13.3333C9.79175 13.2182 9.88502 13.125 10.0001 13.125C10.1151 13.125 10.2084 13.2182 10.2084 13.3333C10.2084 13.4484 10.1151 13.5416 10.0001 13.5416Z" fill="#AFAFAF"/>
    </svg>
  )
}

function LoopIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M6.08824 4.79163C5.45433 4.79163 4.96739 5.35307 5.05704 5.98061L6.24752 14.3139C6.32083 14.8271 6.76033 15.2083 7.27872 15.2083H7.72106C8.23945 15.2083 8.67895 14.8271 8.75226 14.3139L9.94274 5.98061C10.0324 5.35307 9.54545 4.79163 8.91154 4.79163H6.08824ZM3.81961 6.15738C3.62238 4.77681 4.69365 3.54163 6.08824 3.54163H8.91154C10.3061 3.54163 11.3774 4.77681 11.1802 6.15738L9.9897 14.4907C9.82841 15.6197 8.86151 16.4583 7.72106 16.4583H7.27872C6.13827 16.4583 5.17137 15.6197 5.01008 14.4907L3.81961 6.15738Z" fill="#AFAFAF"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M1.04175 10C1.04175 9.65482 1.32157 9.375 1.66675 9.375H5.00008C5.34526 9.375 5.62508 9.65482 5.62508 10C5.62508 10.3452 5.34526 10.625 5.00008 10.625H1.66675C1.32157 10.625 1.04175 10.3452 1.04175 10ZM9.37508 10C9.37508 9.65482 9.6549 9.375 10.0001 9.375L18.3334 9.375C18.6786 9.375 18.9584 9.65482 18.9584 10C18.9584 10.3452 18.6786 10.625 18.3334 10.625L10.0001 10.625C9.6549 10.625 9.37508 10.3452 9.37508 10Z" fill="#AFAFAF"/>
    </svg>
  )
}

function DirectionIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M15.8333 3.125C16.4086 3.125 16.875 3.59137 16.875 4.16667C16.875 4.74196 16.4086 5.20833 15.8333 5.20833C15.258 5.20833 14.7917 4.74196 14.7917 4.16667C14.7917 3.59137 15.258 3.125 15.8333 3.125ZM18.125 4.16667C18.125 2.90101 17.099 1.875 15.8333 1.875C14.5677 1.875 13.5417 2.90101 13.5417 4.16667C13.5417 5.43232 14.5677 6.45833 15.8333 6.45833C17.099 6.45833 18.125 5.43232 18.125 4.16667Z" fill="#AFAFAF"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M13.2383 7.79741C13.5343 7.97501 13.6303 8.35892 13.4527 8.65491C12.2516 10.6568 11.0234 14.3285 10.6166 16.7694C10.5721 17.0365 10.3607 17.2445 10.093 17.2847C9.82532 17.325 9.56214 17.1883 9.44107 16.9462C8.42473 14.9135 7.46377 13.9141 6.5543 13.481C5.66728 13.0586 4.70652 13.1178 3.53106 13.5096C3.2036 13.6188 2.84965 13.4418 2.74049 13.1143C2.63134 12.7869 2.80831 12.4329 3.13578 12.3238C4.46032 11.8822 5.79123 11.7331 7.09171 12.3524C8.04381 12.8058 8.90952 13.6386 9.73031 14.9161C10.3152 12.5531 11.3393 9.74768 12.3808 8.01179C12.5584 7.7158 12.9423 7.61982 13.2383 7.79741Z" fill="#AFAFAF"/>
    </svg>
  )
}

function TargetIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M3.84542 16.2436C2.36514 16.3916 1.13837 15.1119 1.34876 13.6392L1.8476 10.1473C1.86156 10.0496 1.86156 9.95039 1.8476 9.85267L1.34876 6.3608C1.13837 4.88808 2.36514 3.60838 3.84543 3.75641L9.89634 4.3615C9.96527 4.3684 10.0347 4.3684 10.1036 4.3615L16.1546 3.75641C17.6348 3.60838 18.8616 4.88808 18.6512 6.36079L18.1524 9.85267C18.1384 9.95039 18.1384 10.0496 18.1524 10.1473L18.6512 13.6392C18.8616 15.1119 17.6348 16.3916 16.1546 16.2436L10.1036 15.6385C10.0347 15.6316 9.96527 15.6316 9.89634 15.6385L3.84542 16.2436ZM2.5862 13.816C2.49057 14.4854 3.04819 15.067 3.72104 14.9998L9.77196 14.3947C9.9236 14.3795 10.0764 14.3795 10.228 14.3947L16.2789 14.9998C16.9518 15.067 17.5094 14.4854 17.4138 13.816L16.9149 10.3241C16.8842 10.1091 16.8842 9.89086 16.9149 9.6759L17.4138 6.18402C17.5094 5.5146 16.9518 4.93292 16.2789 5.00021L10.228 5.6053C10.0764 5.62046 9.9236 5.62046 9.77196 5.6053L3.72105 5.00021C3.04819 4.93292 2.49057 5.51461 2.5862 6.18402L3.08504 9.6759C3.11575 9.89087 3.11575 10.1091 3.08504 10.3241L2.5862 13.816Z" fill="#AFAFAF"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M13.6668 7.87496C13.4597 7.59882 13.5156 7.20707 13.7918 6.99996L17.1251 4.49996C17.4013 4.29286 17.793 4.34882 18.0001 4.62496C18.2072 4.90111 18.1513 5.29286 17.8751 5.49996L14.5418 7.99996C14.2656 8.20707 13.8739 8.15111 13.6668 7.87496Z" fill="#AFAFAF"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M2.00004 15.375C1.79293 15.0988 1.84889 14.7071 2.12504 14.5L5.45837 12C5.73451 11.7929 6.12626 11.8488 6.33337 12.125C6.54048 12.4011 6.48451 12.7929 6.20837 13L2.87504 15.5C2.59889 15.7071 2.20714 15.6511 2.00004 15.375Z" fill="#AFAFAF"/>
    </svg>
  )
}

function RestartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M16.5751 8.42079C16.3968 7.99996 16.1759 7.59163 15.9176 7.20746L14.5359 8.13996C14.7343 8.43329 14.9034 8.74579 15.0393 9.06913C15.1793 9.40079 15.2868 9.74663 15.3584 10.0941C15.4318 10.455 15.4693 10.8258 15.4693 11.1975C15.4693 11.5691 15.4318 11.9416 15.3584 12.3008C15.2868 12.6491 15.1801 12.9933 15.0384 13.3266C14.9034 13.6483 14.7343 13.9608 14.5359 14.2533C14.3409 14.5425 14.1151 14.815 13.8668 15.0641C13.6193 15.3116 13.3468 15.5358 13.0559 15.7325C12.7626 15.9308 12.4509 16.1 12.1276 16.2358C11.7984 16.375 11.4534 16.4825 11.1034 16.555C10.3834 16.7008 9.61509 16.7008 8.89842 16.555C8.54676 16.4825 8.20092 16.375 7.87092 16.235C7.54842 16.0991 7.23676 15.93 6.94342 15.7316C6.65426 15.5375 6.38259 15.3125 6.13426 15.065C5.88509 14.815 5.66009 14.5416 5.46509 14.2541C5.26759 13.9616 5.09842 13.6491 4.96092 13.325C4.82176 12.995 4.71509 12.6508 4.64259 12.3C4.56926 11.9408 4.53176 11.57 4.53176 11.1975C4.53176 10.825 4.56926 10.4541 4.64342 10.0941C4.71509 9.74413 4.82176 9.39913 4.96092 9.06913C5.09842 8.74413 5.26842 8.43163 5.46509 8.14079C5.66009 7.85163 5.88509 7.57913 6.13342 7.33079C6.38009 7.08329 6.65259 6.85829 6.94342 6.66246C7.23509 6.46579 7.54759 6.29579 7.87176 6.15829C8.20092 6.01913 8.54676 5.91163 8.89676 5.83996C8.98592 5.82163 9.07676 5.81329 9.16676 5.79913V8.33329L13.3334 4.99996L9.16676 1.66663V4.11496C8.96426 4.13913 8.76176 4.16663 8.56259 4.20746C8.10426 4.30163 7.65259 4.44163 7.22259 4.62413C6.79842 4.80329 6.39009 5.02496 6.01009 5.28246C5.63176 5.53746 5.27676 5.82996 4.95426 6.15246C4.63092 6.47579 4.33842 6.83079 4.08342 7.20746C3.82592 7.58829 3.60509 7.99579 3.42509 8.41996C3.24259 8.85163 3.10259 9.30246 3.00926 9.75996C2.91259 10.2291 2.86426 10.7133 2.86426 11.1983C2.86426 11.6833 2.91342 12.1666 3.00926 12.6358C3.10342 13.095 3.24342 13.5458 3.42509 13.975C3.60426 14.3991 3.82592 14.8075 4.08342 15.1883C4.33759 15.5633 4.63009 15.9183 4.95426 16.245C5.27842 16.5683 5.63259 16.8608 6.00842 17.1141C6.39092 17.3733 6.79926 17.595 7.22176 17.7725C7.65176 17.9541 8.10259 18.095 8.56259 18.1891C9.03259 18.2841 9.51592 18.3333 10.0001 18.3333C10.4843 18.3333 10.9676 18.2841 11.4393 18.1883C11.8984 18.0933 12.3493 17.9533 12.7759 17.7725C13.1984 17.595 13.6076 17.3733 13.9901 17.1141C14.3676 16.8591 14.7226 16.5666 15.0468 16.2425C15.3701 15.9183 15.6626 15.5641 15.9176 15.1875C16.1776 14.8025 16.3976 14.3941 16.5743 13.975C16.7576 13.5416 16.8984 13.0908 16.9909 12.635C17.0868 12.1658 17.1359 11.6816 17.1359 11.1975C17.1359 10.7141 17.0868 10.23 16.9909 9.75996C16.8976 9.30496 16.7568 8.85413 16.5751 8.42079Z" fill="#AFAFAF"/>
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4.61341 18.2383C4.73508 18.3016 4.86758 18.3333 5.00008 18.3333C5.16675 18.3333 5.33175 18.2833 5.47425 18.185L16.3076 10.685C16.5326 10.5291 16.6667 10.2733 16.6667 9.99996C16.6667 9.72663 16.5326 9.47079 16.3076 9.31496L5.47425 1.81496C5.22008 1.63913 4.88758 1.61829 4.61341 1.76163C4.33841 1.90579 4.16675 2.18996 4.16675 2.49996V17.5C4.16675 17.81 4.33841 18.0941 4.61341 18.2383Z" fill="white"/>
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
