'use client'

import { useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useEditorStore } from '@/lib/store/editor'
import { SPRING } from '@/lib/motion'
import type { AnimParams, EasingType } from '@/types'
import { PRESETS } from '@/lib/presets'

const f: React.CSSProperties = { fontFamily: 'var(--font-geist-sans), sans-serif' }

const EASING_NAMES: Record<EasingType, string> = {
  'linear':      'Linear',
  'ease':        'Ease',
  'ease-in':     'Ease In',
  'ease-out':    'Ease Out',
  'ease-in-out': 'Ease In Out',
  'spring':      'Spring',
  'back':        'Back',
  'snappy':      'Snappy',
}

interface ControlsSidebarProps {
  onOpenPresets:  () => void
  onOpenEasing:   () => void
  presetsOpen:    boolean
  easingOpen:     boolean
}

export function ControlsSidebar({ onOpenPresets, onOpenEasing, presetsOpen, easingOpen }: ControlsSidebarProps) {
  const svgSource        = useEditorStore(s => s.svgSource)
  const isPlaying        = useEditorStore(s => s.isPlaying)
  const params           = useEditorStore(s => s.params)
  const zoom             = useEditorStore(s => s.zoom)
  const activePresetId   = useEditorStore(s => s.activePresetId)
  const setPlaying       = useEditorStore(s => s.setPlaying)
  const updateParam      = useEditorStore(s => s.updateParam)
  const restartAnimation = useEditorStore(s => s.restartAnimation)
  const resetView        = useEditorStore(s => s.resetView)

  const hasFile = svgSource !== null

  const set = <K extends keyof AnimParams>(key: K) => (value: AnimParams[K]) => updateParam(key, value)

  const activePreset = PRESETS.find(p => p.id === activePresetId)

  return (
    <motion.div
      className="absolute left-5 z-30 pointer-events-none"
      style={{ top: 76, width: 280 }}
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...SPRING.entrance, delay: 0.04 }}
    >
      <div
        className="pointer-events-auto"
        style={{
          background: '#141414',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        {/* ── Playback controls ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
          {/* Play */}
          <CtrlBtn
            onClick={() => setPlaying(!isPlaying)}
            disabled={!hasFile}
            accent
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </CtrlBtn>

          {/* Restart */}
          <CtrlBtn
            onClick={restartAnimation}
            disabled={!hasFile}
            title="Restart"
          >
            <RestartIcon />
          </CtrlBtn>

          <div style={{ flex: 1 }} />

          {/* Zoom % */}
          <button
            onClick={resetView}
            title="Reset view"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              ...f,
              fontSize: 12,
              fontWeight: 500,
              color: '#555',
              padding: '4px 6px',
              borderRadius: 6,
              transition: 'color 0.12s, background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#888'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.background = 'transparent' }}
          >
            {Math.round(zoom * 100)}%
          </button>
        </div>

        <Separator />

        {/* ── Preset row ── */}
        <SelectorRow
          label="Preset"
          value={activePreset?.name ?? 'Select…'}
          icon={<KeyframesIcon />}
          onClick={onOpenPresets}
          active={presetsOpen}
          disabled={!hasFile}
        />

        <Separator />

        {/* ── Easing row ── */}
        <SelectorRow
          label="Easing"
          value={EASING_NAMES[params.easing]}
          icon={<KeyframesIcon />}
          onClick={onOpenEasing}
          active={easingOpen}
          disabled={!hasFile}
        />

        {/* ── Smooth & Edit section — only when file loaded ── */}
        <AnimatePresence>
          {hasFile && (
            <motion.div
              key="smooth-edit"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={SPRING.panel}
              style={{ overflow: 'hidden' }}
            >
              <Separator />

              <div style={{ padding: '10px 12px 12px' }}>
                <p style={{ ...f, fontSize: 11, fontWeight: 500, color: '#555', margin: '0 0 10px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Smooth &amp; Edit
                </p>

                {/* Target */}
                <ParamRow label="Target">
                  <ChipGroup
                    options={[
                      { value: 'all',    label: 'All Layers' },
                      { value: 'groups', label: 'Groups' },
                      { value: 'paths',  label: 'Paths' },
                    ]}
                    value={params.scope}
                    onChange={v => set('scope')(v as AnimParams['scope'])}
                  />
                </ParamRow>

                {/* Speed */}
                <ParamRow label="Speed" value={`${params.speed % 1 === 0 ? params.speed : parseFloat(params.speed.toFixed(2))}x`}>
                  <Slider
                    value={params.speed} min={0.25} max={4} step={0.25}
                    onChange={v => set('speed')(v)}
                  />
                </ParamRow>

                {/* Delay */}
                <ParamRow label="Delay" value={`${params.delay.toFixed(1)}s`}>
                  <Slider
                    value={params.delay} min={0} max={2} step={0.1}
                    onChange={v => set('delay')(v)}
                  />
                </ParamRow>

                {/* Loop */}
                <ParamRow label="Loop">
                  <ChipGroup
                    options={[
                      { value: 'once',  label: 'Once' },
                      { value: 'loop',  label: 'Loop' },
                      { value: 'bounce',label: 'Bounce' },
                    ]}
                    value={params.loop}
                    onChange={v => set('loop')(v as AnimParams['loop'])}
                  />
                </ParamRow>

                {/* Direction */}
                <ParamRow label="Direction">
                  <ChipGroup
                    options={[
                      { value: 'in',     label: 'In' },
                      { value: 'out',    label: 'Out' },
                      { value: 'in-out', label: 'In & Out' },
                    ]}
                    value={params.direction}
                    onChange={v => set('direction')(v as AnimParams['direction'])}
                  />
                </ParamRow>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ── Sub-components ──────────────────────────────────────────────

function Separator() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginLeft: 12, marginRight: 12 }} />
}

function CtrlBtn({
  children, onClick, disabled, accent, title,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  accent?: boolean
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        border: 'none',
        background: accent ? '#F97316' : 'rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        flexShrink: 0,
        transition: 'background 0.12s, opacity 0.12s',
      }}
      onMouseEnter={e => {
        if (disabled) return
        e.currentTarget.style.background = accent ? '#ea6d0e' : 'rgba(255,255,255,0.12)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = accent ? '#F97316' : 'rgba(255,255,255,0.07)'
      }}
    >
      {children}
    </button>
  )
}

function SelectorRow({
  label, value, icon, onClick, active, disabled,
}: {
  label:    string
  value:    string
  icon:     React.ReactNode
  onClick:  () => void
  active:   boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '9px 12px',
        border: 'none',
        background: active ? 'rgba(249,115,22,0.07)' : 'transparent',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (!disabled && !active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
      onMouseLeave={e => { e.currentTarget.style.background = active ? 'rgba(249,115,22,0.07)' : 'transparent' }}
    >
      <span style={{ color: '#444', display: 'flex', flexShrink: 0 }}>{icon}</span>
      <span style={{ ...f, fontSize: 12, fontWeight: 500, color: '#666', minWidth: 44, flexShrink: 0 }}>{label}</span>
      <span style={{ ...f, fontSize: 13, fontWeight: 500, color: active ? '#F97316' : '#CCC', flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </span>
      <ChevronIcon active={active} />
    </button>
  )
}

function ParamRow({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ ...f, fontSize: 11, fontWeight: 500, color: '#555' }}>{label}</span>
        {value && <span style={{ ...f, fontSize: 11, fontWeight: 500, color: '#888' }}>{value}</span>}
      </div>
      {children}
    </div>
  )
}

function ChipGroup({
  options, value, onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1,
            padding: '5px 4px',
            borderRadius: 7,
            border: 'none',
            background: value === opt.value ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)',
            ...f,
            fontSize: 11,
            fontWeight: 500,
            color: value === opt.value ? '#F97316' : '#666',
            cursor: 'pointer',
            transition: 'background 0.1s, color 0.1s',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          onMouseEnter={e => { if (value !== opt.value) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#888' } }}
          onMouseLeave={e => {
            e.currentTarget.style.background = value === opt.value ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)'
            e.currentTarget.style.color = value === opt.value ? '#F97316' : '#666'
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function Slider({ value, min, max, step, onChange }: {
  value: number; min: number; max: number; step: number; onChange: (v: number) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const pct = (value - min) / (max - min)
  const THUMB_R = 7

  const snap = (raw: number) => Math.round(Math.max(min, Math.min(max, raw)) / step) * step

  const posToValue = (clientX: number) => {
    const track = trackRef.current
    if (!track) return value
    const rect   = track.getBoundingClientRect()
    const usable = rect.width - THUMB_R * 2
    const ratio  = Math.max(0, Math.min(1, (clientX - rect.left - THUMB_R) / usable))
    return snap(ratio * (max - min) + min)
  }

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    onChange(posToValue(e.clientX))
    const move = (ev: PointerEvent) => onChange(posToValue(ev.clientX))
    const up   = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div
      ref={trackRef}
      onPointerDown={startDrag}
      style={{ position: 'relative', height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
    >
      {/* Track */}
      <div style={{ position: 'absolute', left: THUMB_R, right: THUMB_R, height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 1 }} />
      {/* Fill */}
      <div style={{
        position: 'absolute', left: THUMB_R,
        width: `calc(${pct * 100}% - ${THUMB_R * 2 * pct}px)`,
        height: 2, borderRadius: 1, background: '#F97316',
      }} />
      {/* Thumb */}
      <div style={{
        position: 'absolute',
        left: `calc(${THUMB_R}px + ${pct} * (100% - ${THUMB_R * 2}px))`,
        transform: 'translateX(-50%)',
        width: 14, height: 14, borderRadius: '50%',
        background: '#F97316',
        boxShadow: '0 0 0 3px rgba(249,115,22,0.18)',
        zIndex: 1, pointerEvents: 'none',
      }} />
    </div>
  )
}

// ── Icons ───────────────────────────────────────────────────────

function PlayIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
      <path d="M4.6 18.2C4.7 18.3 4.9 18.3 5 18.3C5.2 18.3 5.3 18.3 5.5 18.2L16.3 10.7C16.5 10.5 16.7 10.3 16.7 10C16.7 9.7 16.5 9.5 16.3 9.3L5.5 1.8C5.2 1.6 4.9 1.6 4.6 1.8C4.3 1.9 4.2 2.2 4.2 2.5V17.5C4.2 17.8 4.3 18.1 4.6 18.2Z" fill="white"/>
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="white">
      <rect x="4"  y="3" width="4" height="14" rx="1.5"/>
      <rect x="12" y="3" width="4" height="14" rx="1.5"/>
    </svg>
  )
}

function RestartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
      <path d="M16.6 8.4C16.4 8 16.2 7.6 15.9 7.2L14.5 8.1C14.7 8.4 14.9 8.7 15 9.1C15.2 9.4 15.3 9.7 15.4 10.1C15.5 10.5 15.5 10.8 15.5 11.2C15.5 11.6 15.4 11.9 15.4 12.3C15.3 12.6 15.2 13 15 13.3C14.9 13.6 14.7 13.9 14.5 14.3C14.3 14.5 14.1 14.8 13.9 15.1C13.6 15.3 13.3 15.5 13.1 15.7C12.8 15.9 12.5 16.1 12.1 16.2C11.8 16.4 11.5 16.5 11.1 16.6C10.4 16.7 9.6 16.7 8.9 16.6C8.5 16.5 8.2 16.4 7.9 16.2C7.5 16.1 7.2 15.9 6.9 15.7C6.7 15.5 6.4 15.3 6.1 15.1C5.9 14.8 5.7 14.5 5.5 14.3C5.3 14 5.1 13.6 5 13.3C4.8 13 4.7 12.6 4.6 12.3C4.6 11.9 4.5 11.6 4.5 11.2C4.5 10.8 4.6 10.5 4.6 10.1C4.7 9.7 4.8 9.4 5 9.1C5.1 8.7 5.3 8.4 5.5 8.1C5.7 7.9 5.9 7.6 6.1 7.3C6.4 7.1 6.7 6.9 6.9 6.7C7.2 6.5 7.5 6.3 7.9 6.2C8.2 6 8.5 5.9 8.9 5.8C9 5.8 9.1 5.8 9.2 5.8V8.3L13.3 5L9.2 1.7V4.1C9 4.1 8.8 4.2 8.6 4.2C8.1 4.3 7.7 4.4 7.2 4.6C6.8 4.8 6.4 5 6 5.3C5.6 5.5 5.3 5.8 4.9 6.2C4.6 6.5 4.3 6.8 4.1 7.2C3.8 7.6 3.6 8 3.4 8.4C3.2 8.9 3.1 9.3 3 9.8C2.9 10.2 2.9 10.7 2.9 11.2C2.9 11.7 2.9 12.2 3 12.6C3.1 13.1 3.2 13.5 3.4 13.9C3.6 14.4 3.8 14.8 4.1 15.2C4.3 15.6 4.6 15.9 4.9 16.2C5.3 16.6 5.6 16.9 6 17.1C6.4 17.4 6.8 17.6 7.2 17.8C7.7 17.9 8.1 18.1 8.6 18.2C9 18.3 9.5 18.3 10 18.3C10.5 18.3 11 18.3 11.4 18.2C11.9 18.1 12.3 17.9 12.8 17.8C13.2 17.6 13.6 17.4 14 17.1C14.4 16.9 14.7 16.6 15.1 16.2C15.4 15.9 15.7 15.6 15.9 15.2C16.2 14.8 16.4 14.4 16.6 14C16.8 13.5 16.9 13.1 17 12.6C17.1 12.2 17.1 11.7 17.1 11.2C17.1 10.7 17.1 10.2 17 9.8C16.9 9.3 16.8 8.9 16.6 8.4Z" fill="#888888"/>
    </svg>
  )
}

function KeyframesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
      <path d="M14.9999 14.1667C15.9191 14.1667 16.6666 13.4192 16.6666 12.5V4.16667C16.6666 3.2475 15.9191 2.5 14.9999 2.5H4.99992C4.08075 2.5 3.33325 3.2475 3.33325 4.16667V12.5C3.33325 13.4192 4.08075 14.1667 4.99992 14.1667H14.9999ZM3.33325 15.8333H16.6666V17.5H3.33325V15.8333Z" fill="#444"/>
    </svg>
  )
}

function ChevronIcon({ active }: { active: boolean }) {
  return (
    <motion.svg
      width="14" height="14" viewBox="0 0 14 14" fill="none"
      animate={{ rotate: active ? 180 : 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{ flexShrink: 0 }}
    >
      <path d="M3 5L7 9L11 5" stroke={active ? '#F97316' : '#444'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </motion.svg>
  )
}
