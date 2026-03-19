'use client'

import { useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useEditorStore } from '@/lib/store/editor'
import { SPRING } from '@/lib/motion'
import { Play, Repeat2, RefreshCw, LogIn, LogOut, ArrowLeftRight, Layers, Box, Spline } from 'lucide-react'
import type { AnimParams } from '@/types'

const f: React.CSSProperties = { fontFamily: 'var(--font-geist-sans), sans-serif' }

export function RightControlsPanel() {
  const svgSource     = useEditorStore(s => s.svgSource)
  const params        = useEditorStore(s => s.params)
  const svgHasGroups  = useEditorStore(s => s.svgHasGroups)
  const updateParam   = useEditorStore(s => s.updateParam)
  const set = <K extends keyof AnimParams>(key: K) => (value: AnimParams[K]) => updateParam(key, value)

  return (
    <AnimatePresence>
      {svgSource && (
        <motion.div
          className="absolute right-4 z-30 pointer-events-auto"
          style={{ top: 72, width: 236 }}
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 14 }}
          transition={{ ...SPRING.entrance, delay: 0.04 }}
        >
          <div style={{
            borderRadius: 14,
            background: 'rgba(251,251,251,0.80)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
            padding: '12px 12px 8px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>

            {/* Speed */}
            <ControlRow label="Speed" value={`${params.speed % 1 === 0 ? params.speed : params.speed.toFixed(2).replace(/0+$/, '')}x`}>
              <SliderTrack value={params.speed} min={0.25} max={4} step={0.25} onChange={set('speed')} />
            </ControlRow>

            {/* Delay */}
            <ControlRow label="Delay" value={`${params.delay.toFixed(1)}s`}>
              <SliderTrack value={params.delay} min={0} max={2} step={0.1} onChange={set('delay')} />
            </ControlRow>

            <div style={{ height: 1, background: 'rgba(0,0,0,0.06)' }} />

            {/* Loop */}
            <ChipControl label="Loop">
              <Chip label="Once"   active={params.loop === 'once'}   onClick={() => set('loop')('once')}   icon={<Play size={11} color={params.loop === 'once' ? '#111' : '#afafaf'} fill={params.loop === 'once' ? '#111' : '#afafaf'} />} />
              <Chip label="Loop"   active={params.loop === 'loop'}   onClick={() => set('loop')('loop')}   icon={<Repeat2 size={11} color={params.loop === 'loop' ? '#111' : '#afafaf'} />} />
              <Chip label="Bounce" active={params.loop === 'bounce'} onClick={() => set('loop')('bounce')} icon={<RefreshCw size={11} color={params.loop === 'bounce' ? '#111' : '#afafaf'} />} />
            </ChipControl>

            {/* Direction */}
            <ChipControl label="Direction">
              <Chip label="In"      active={params.direction === 'in'}     onClick={() => set('direction')('in')}     icon={<LogIn size={11} color={params.direction === 'in' ? '#111' : '#afafaf'} />} />
              <Chip label="Out"     active={params.direction === 'out'}    onClick={() => set('direction')('out')}    icon={<LogOut size={11} color={params.direction === 'out' ? '#111' : '#afafaf'} />} />
              <Chip label="In+Out"  active={params.direction === 'in-out'} onClick={() => set('direction')('in-out')} icon={<ArrowLeftRight size={11} color={params.direction === 'in-out' ? '#111' : '#afafaf'} />} />
            </ChipControl>

            {/* Target */}
            <ChipControl label="Target">
              <Chip label="All"    active={params.scope === 'all'}    onClick={() => set('scope')('all')}    icon={<Layers size={11} color={params.scope === 'all' ? '#111' : '#afafaf'} />} />
              <Chip label="Groups" active={params.scope === 'groups'} onClick={() => set('scope')('groups')} disabled={!svgHasGroups} icon={<Box size={11} color={params.scope === 'groups' && svgHasGroups ? '#111' : '#afafaf'} />} />
              <Chip label="Paths"  active={params.scope === 'paths'}  onClick={() => set('scope')('paths')}  icon={<Spline size={11} color={params.scope === 'paths' ? '#111' : '#afafaf'} />} />
            </ChipControl>
            {!svgHasGroups && (
              <p style={{ ...f, fontSize: 10, color: '#aaa', lineHeight: '14px', marginTop: -4 }}>
                No groups in this SVG
              </p>
            )}

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Sub-components ─────────────────────────────────────────────

function ControlRow({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ ...f, fontSize: 11, fontWeight: 400, color: '#888', lineHeight: '16px' }}>{label}</span>
        <span style={{ ...f, fontSize: 12, fontWeight: 500, color: '#545454', lineHeight: '16px' }}>{value}</span>
      </div>
      {children}
    </div>
  )
}

function SliderTrack({ value, min, max, step, onChange }: {
  value: number; min: number; max: number; step: number; onChange: (v: number) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const THUMB_R = 7
  const pct = (value - min) / (max - min)

  const snap = (raw: number) => Math.round(Math.max(min, Math.min(max, raw)) / step) * step

  const posToValue = (clientX: number) => {
    const track = trackRef.current
    if (!track) return value
    const rect = track.getBoundingClientRect()
    const usable = rect.width - THUMB_R * 2
    return snap(Math.max(0, Math.min(1, (clientX - rect.left - THUMB_R) / usable)) * (max - min) + min)
  }

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    onChange(posToValue(e.clientX))
    const move = (ev: PointerEvent) => onChange(posToValue(ev.clientX))
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div ref={trackRef} onPointerDown={startDrag}
      style={{ height: 22, position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
    >
      <div style={{ position: 'absolute', left: THUMB_R, right: THUMB_R, height: 3, background: 'repeating-linear-gradient(90deg,#d0d0d0 0,#d0d0d0 3px,transparent 3px,transparent 7px)', borderRadius: 2 }} />
      <div style={{ position: 'absolute', left: THUMB_R, width: `calc(${pct * 100}% - ${THUMB_R * 2 * pct}px)`, height: 3, borderRadius: 2, background: '#3f37c9' }} />
      <div style={{ position: 'absolute', left: `calc(${THUMB_R}px + ${pct} * (100% - ${THUMB_R * 2}px))`, transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', background: 'white', boxShadow: '0 1px 6px rgba(0,0,0,0.18), 0 0 0 1.5px rgba(0,0,0,0.08)', zIndex: 1, pointerEvents: 'none' }} />
    </div>
  )
}

function ChipControl({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ ...f, fontSize: 11, fontWeight: 400, color: '#888', lineHeight: '16px' }}>{label}</span>
      <div style={{ display: 'flex', gap: 4 }}>{children}</div>
    </div>
  )
}

function Chip({ label, active, onClick, icon, disabled }: {
  label: string; active: boolean; onClick: () => void; icon: React.ReactNode; disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={disabled ? 'This SVG has no groups' : undefined}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        padding: '5px 6px', borderRadius: 8, border: 'none',
        background: active && !disabled ? '#eeeeee' : 'rgba(0,0,0,0.04)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        ...f, fontWeight: 500, fontSize: 11, lineHeight: '16px',
        color: active && !disabled ? '#000' : '#545454', whiteSpace: 'nowrap',
        transition: 'background 0.1s, opacity 0.15s', flex: 1,
      }}
    >
      {icon}
      {label}
    </button>
  )
}
