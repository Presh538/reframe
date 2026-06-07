'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
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

const PRIMARY_PRESET_IDS = ['draw-on', 'fade-up-scale', 'bounce-in', 'blur-rise', 'skew-reveal', 'fill-reveal']
const DROPDOWN_PRESETS = PRIMARY_PRESET_IDS
  .map(id => PRESETS.find(p => p.id === id))
  .filter((preset): preset is NonNullable<typeof preset> => Boolean(preset))

// All 8 easing types — derived from EASING_NAMES so they stay in sync
const EASING_OPTIONS: { id: EasingType; name: string }[] = (
  Object.entries(EASING_NAMES) as [EasingType, string][]
).map(([id, name]) => ({ id, name }))

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
  const isPanMode        = useEditorStore(s => s.isPanMode)
  const activePresetId   = useEditorStore(s => s.activePresetId)
  const setPlaying       = useEditorStore(s => s.setPlaying)
  const setActivePreset  = useEditorStore(s => s.setActivePreset)
  const updateParam      = useEditorStore(s => s.updateParam)
  const restartAnimation = useEditorStore(s => s.restartAnimation)
  const setPanMode       = useEditorStore(s => s.setPanMode)

  const hasFile = svgSource !== null

  const set = <K extends keyof AnimParams>(key: K) => (value: AnimParams[K]) => updateParam(key, value)

  const activePreset = PRESETS.find(p => p.id === activePresetId)

  const selectPreset = (id: string) => {
    setActivePreset(id)
    if (presetsOpen) onOpenPresets()
  }

  const selectEasing = (id: EasingType) => {
    updateParam('easing', id)
    if (easingOpen) onOpenEasing()
  }

  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!presetsOpen && !easingOpen) return
    const handleMouseDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        if (presetsOpen) onOpenPresets()
        if (easingOpen) onOpenEasing()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [presetsOpen, easingOpen, onOpenPresets, onOpenEasing])

  return (
    <motion.div
      className="absolute left-10 z-30 pointer-events-none"
      style={{ top: 108, width: 365 }}
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...SPRING.entrance, delay: 0.04 }}
    >
      <div
        ref={panelRef}
        className="pointer-events-auto"
        style={{
          background: '#1B1B1B',
          position: 'relative',
          border: '0.5px solid rgba(36,36,49,0.64)',
          borderRadius: 28,
          overflow: 'visible',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          padding: '16px 0',
        }}
      >
        {/* ── Playback controls ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: 333 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
            <div style={{ width: 76, flexShrink: 0 }}>
              <CtrlBtn
                onClick={() => setPlaying(!isPlaying)}
                disabled={!hasFile}
                title={isPlaying ? 'Pause' : 'Play'}
                label={isPlaying ? 'Pause' : 'Play'}
                fullWidth
              >
                <Icon src={isPlaying ? '/figma-icons/pause.svg' : '/figma-icons/play.svg'} size={18} />
              </CtrlBtn>
            </div>
            <CtrlBtn onClick={restartAnimation} disabled={!hasFile} title="Restart">
              <Icon src="/figma-icons/refresh.svg" size={18} />
            </CtrlBtn>
          </div>

          {/* Zoom / pan toggle */}
          <motion.button
            onClick={() => setPanMode(!isPanMode)}
            title={isPanMode ? 'Disable pan tool' : 'Enable pan tool'}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{
              width: 91, height: 38,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: 'rgba(255,255,255,0.05)',
              border: 'none', cursor: 'pointer',
              ...f, fontSize: 14, fontWeight: 400, letterSpacing: 0.028,
              color: isPanMode ? '#D06523' : '#979797',
              padding: '10px', borderRadius: 40,
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
          >
            <Icon src={isPanMode ? '/figma-icons/drag-left-primary.svg' : '/figma-icons/drag-left.svg'} size={18} />
            <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />
            {Math.round(zoom * 100)}%
          </motion.button>
        </div>

        <Separator />

        {/* ── Preset row ── */}
        <div style={{ position: 'relative', width: 333 }}>
          <SelectorRow
            label="Preset"
            value={activePreset?.name ?? '— Please select'}
            icon={activePresetId ? <PresetIcon id={activePresetId} /> : <Icon src="/figma-icons/keyframes.svg" size={18} />}
            onClick={onOpenPresets}
            active={presetsOpen}
            disabled={!hasFile}
          />
          <AnimatePresence>
            {presetsOpen && (
              <DropdownMenu key="preset-dropdown">
                {DROPDOWN_PRESETS.map(preset => (
                  <DropdownItem
                    key={preset.id}
                    label={preset.name}
                    active={preset.id === activePresetId}
                    onClick={() => selectPreset(preset.id)}
                    icon={<PresetIcon id={preset.id} />}
                  />
                ))}
              </DropdownMenu>
            )}
          </AnimatePresence>
        </div>

        <Separator />

        {/* ── Easing row ── */}
        <div style={{ position: 'relative', width: 333 }}>
          <SelectorRow
            label="Easing"
            value={EASING_NAMES[params.easing]}
            icon={<EasingCurveIcon id={params.easing} />}
            onClick={onOpenEasing}
            active={easingOpen}
            disabled={!hasFile}
          />
          <AnimatePresence>
            {easingOpen && (
              <DropdownMenu key="easing-dropdown">
                {EASING_OPTIONS.map(option => (
                  <DropdownItem
                    key={option.id}
                    label={option.name}
                    active={option.id === params.easing}
                    onClick={() => selectEasing(option.id)}
                    icon={<EasingCurveIcon id={option.id} />}
                  />
                ))}
              </DropdownMenu>
            )}
          </AnimatePresence>
        </div>

        {/* ── Smooth & Edit section — only when file loaded ── */}
        <AnimatePresence>
          {hasFile && (
            <motion.div
              key="smooth-edit"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={SPRING.panel}
              style={{ overflow: 'hidden', alignSelf: 'stretch' }}
            >
              <Separator />

              <div style={{ width: 333, margin: '16px auto 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ ...f, fontSize: 14, fontWeight: 500, color: '#FFFFFF', margin: 0, letterSpacing: 0.028, width: '100%' }}>
                  Smooth &amp; Edit
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
                  <ParamRow label="Target">
                    <ChipGroup
                      options={[
                        { value: 'all',    label: 'All' },
                        { value: 'groups', label: 'Groups' },
                        { value: 'paths',  label: 'Paths' },
                      ]}
                      value={params.scope}
                      onChange={v => set('scope')(v as AnimParams['scope'])}
                    />
                  </ParamRow>

                  <ParamRow label="Speed">
                    <Slider
                      value={params.speed} min={0.25} max={4} step={0.25}
                      displayValue={`${params.speed % 1 === 0 ? params.speed : parseFloat(params.speed.toFixed(2))}x`}
                      onChange={set('speed')}
                    />
                  </ParamRow>

                  <ParamRow label="Delay">
                    <Slider
                      value={params.delay} min={0} max={2} step={0.1}
                      displayValue={`${params.delay.toFixed(1)}s`}
                      onChange={set('delay')}
                    />
                  </ParamRow>

                  <ParamRow label="Loop">
                    <ChipGroup
                      options={[
                        { value: 'once',   label: 'Play Once' },
                        { value: 'loop',   label: 'Loop' },
                        { value: 'bounce', label: 'Bounce' },
                      ]}
                      value={params.loop}
                      onChange={v => set('loop')(v as AnimParams['loop'])}
                    />
                  </ParamRow>

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
  return <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)', width: '100%' }} />
}

function CtrlBtn({
  children, onClick, disabled, title, label, fullWidth,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  title?: string
  label?: string
  fullWidth?: boolean
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      title={title}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      style={{
        width: fullWidth ? '100%' : undefined,
        height: 38, borderRadius: 40, border: 'none',
        background: 'rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: label ? 2 : 0, padding: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        flexShrink: 0,
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        transition: 'background 0.15s, opacity 0.15s',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
    >
      {children}
      {label && (
        <span style={{ ...f, color: '#FFFFFF', fontSize: 14, fontWeight: 400, letterSpacing: 0.028, lineHeight: '18px' }}>
          {label}
        </span>
      )}
    </motion.button>
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
    <div style={{ width: 333, opacity: disabled ? 0.4 : 1 }}>
      <span style={{ ...f, display: 'block', fontSize: 14, fontWeight: 500, color: '#FFFFFF', marginBottom: 8, textAlign: 'left', letterSpacing: 0.028 }}>
        {label}
      </span>
      <motion.button
        onClick={disabled ? undefined : onClick}
        whileTap={!disabled ? { scale: 0.985 } : undefined}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          width: '100%', height: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, padding: '16px 8px', borderRadius: 8,
          border: active ? '0.3px solid rgba(211,211,211,0.31)' : '0.3px solid transparent',
          background: active ? '#000000' : '#0E0E0F',
          cursor: disabled ? 'default' : 'pointer',
          outline: 'none', boxSizing: 'border-box',
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = active ? '#000000' : '#151516' }}
        onMouseLeave={e => { e.currentTarget.style.background = active ? '#000000' : '#0E0E0F' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ color: '#979797', display: 'flex', flexShrink: 0 }}>{icon}</span>
          <span style={{ ...f, fontSize: 14, fontWeight: 400, color: '#979797', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: 0.028 }}>
            {value}
          </span>
        </span>
        <motion.img
          src="/figma-icons/chevron-down.svg"
          alt=""
          width={14}
          height={14}
          animate={{ rotate: active ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          style={{ flexShrink: 0 }}
        />
      </motion.button>
    </div>
  )
}

function DropdownMenu({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 520, damping: 28, mass: 0.55 }}
      style={{
        position: 'absolute', left: 0, top: 'calc(100% + 6px)',
        width: '100%', zIndex: 10,
        display: 'flex', flexDirection: 'column',
        padding: '6px 8px',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'rgba(36,36,36,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.35), 0 0 0 0.5px rgba(255,255,255,0.08)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
        {children}
      </div>
    </motion.div>
  )
}

function DropdownItem({
  label, active, onClick, icon,
}: {
  label: string; active: boolean; onClick: () => void; icon?: React.ReactNode
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      style={{
        width: '100%', height: 38,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', border: 'none', borderRadius: 8,
        background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
        cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
      onMouseLeave={e => { e.currentTarget.style.background = active ? 'rgba(255,255,255,0.08)' : 'transparent' }}
    >
      <span style={{ color: active ? '#FFFFFF' : 'rgba(255,255,255,0.32)', display: 'flex', flexShrink: 0 }}>
        {icon}
      </span>
      <span style={{
        ...f, flex: 1,
        fontSize: 14, fontWeight: active ? 500 : 400,
        lineHeight: 'normal', letterSpacing: 0.028,
        color: active ? '#FFFFFF' : '#AAAAAA',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <AnimatePresence>
        {active && (
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 520, damping: 24 }}
            style={{ display: 'flex', flexShrink: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7L5.5 10L11.5 4" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

function ParamRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%' }}>
      <span style={{ ...f, width: 57, flexShrink: 0, fontSize: 14, fontWeight: 400, color: '#979797', letterSpacing: 0.028 }}>{label}</span>
      <div style={{ width: 266, minWidth: 0, position: 'relative' }}>
        {children}
      </div>
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
    <div style={{ display: 'flex', gap: 5, width: '100%' }}>
      {options.map(opt => {
        const isActive = value === opt.value
        return (
          <ChipButton
            key={opt.value}
            label={opt.label}
            isActive={isActive}
            onClick={() => onChange(opt.value)}
          />
        )
      })}
    </div>
  )
}

function ChipButton({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      style={{
        flex: 1, height: 34, padding: '8px',
        borderRadius: 8, border: 'none',
        background: isActive ? '#232323' : '#0E0E0F',
        ...f, fontSize: 13, fontWeight: isActive ? 500 : 400,
        color: isActive ? '#E8E8E8' : '#979797',
        letterSpacing: 0.028, lineHeight: '18px',
        cursor: 'pointer',
        transition: 'background 0.12s, color 0.12s',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        outline: 'none',
        boxShadow: isActive ? 'inset 0 0 0 0.5px rgba(255,255,255,0.12)' : 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = isActive ? '#2A2A2A' : '#181818'
        e.currentTarget.style.color = '#E0E0E0'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = isActive ? '#232323' : '#0E0E0F'
        e.currentTarget.style.color = isActive ? '#E8E8E8' : '#979797'
      }}
    >
      {label}
    </motion.button>
  )
}

function Slider({ value, min, max, step, displayValue, onChange }: {
  value: number; min: number; max: number; step: number; displayValue: string; onChange: (v: number) => void
}) {
  const trackRef   = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const [localValue, setLocalValue] = useState(value)
  const THUMB_W = 16

  // Keep local in sync when store changes (e.g. preset switch) but not during drag
  useEffect(() => {
    if (!draggingRef.current) setLocalValue(value)
  }, [value])

  const snap = useCallback((raw: number) =>
    Math.round(Math.max(min, Math.min(max, raw)) / step) * step,
    [min, max, step]
  )

  const posToValue = useCallback((clientX: number) => {
    const track = trackRef.current
    if (!track) return min
    const rect   = track.getBoundingClientRect()
    const usable = rect.width - THUMB_W
    const ratio  = Math.max(0, Math.min(1, (clientX - rect.left - THUMB_W / 2) / usable))
    return snap(ratio * (max - min) + min)
  }, [max, min, snap])

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    draggingRef.current = true
    const initial = posToValue(e.clientX)
    setLocalValue(initial)

    const move = (ev: PointerEvent) => {
      const v = posToValue(ev.clientX)
      setLocalValue(v)
    }
    const up = (ev: PointerEvent) => {
      draggingRef.current = false
      const final = posToValue(ev.clientX)
      setLocalValue(final)
      onChange(final)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let next = localValue
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp')  next = snap(localValue + step)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = snap(localValue - step)
    else if (e.key === 'Home') next = min
    else if (e.key === 'End')  next = max
    else return
    e.preventDefault()
    setLocalValue(next)
    onChange(next)
  }

  const pct = (localValue - min) / (max - min)

  // Always derive display label from local value — smooth during drag
  const lv = localValue
  const computedDisplay = displayValue.endsWith('x')
    ? `${lv % 1 === 0 ? lv : parseFloat(lv.toFixed(2))}x`
    : `${lv.toFixed(1)}s`

  return (
    <div
      ref={trackRef}
      onPointerDown={startDrag}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={localValue}
      style={{ position: 'relative', width: 266, height: 34, cursor: 'pointer', background: '#0E0E0F', borderRadius: 8, overflow: 'hidden', outline: 'none' }}
    >
      <img
        src="/figma-icons/slider-grid.svg"
        alt=""
        width={528}
        height={481}
        draggable={false}
        style={{
          position: 'absolute',
          left: 'calc(50% - 17px)', top: 'calc(50% + 0.5px)',
          width: 528, height: 481, maxWidth: 'none',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none', userSelect: 'none',
        }}
      />
      <div style={{
        position: 'absolute', left: 0, top: -4,
        width: `calc(${pct} * (100% - ${THUMB_W}px) + ${THUMB_W / 2}px)`,
        height: 42, background: '#232323', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        left: `calc(${pct} * (100% - ${THUMB_W}px))`,
        width: 16, height: 34, borderRadius: 10,
        background: '#565656', zIndex: 1, pointerEvents: 'none',
      }} />
      <span style={{
        ...f, position: 'absolute', left: 258, top: 8,
        transform: 'translateX(-100%)',
        fontSize: 14, fontWeight: 400, lineHeight: 'normal',
        color: '#979797', textAlign: 'right', letterSpacing: 0.028,
        whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 2,
      }}>
        {computedDisplay}
      </span>
    </div>
  )
}

// ── Icons ───────────────────────────────────────────────────────

function Icon({ src, size }: { src: string; size: number }) {
  return <img src={src} alt="" width={size} height={size} style={{ flexShrink: 0 }} />
}

// Per-preset motion-concept outline icons
function PresetIcon({ id }: { id: string }) {
  switch (id) {
    case 'draw-on':
      return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3.5 13.5C6 8.5 10 6.5 14.5 7.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
          <circle cx="14.5" cy="7.5" r="1.5" fill="currentColor"/>
        </svg>
      )
    case 'fade-up-scale':
      return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 13V5.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
          <path d="M6.2 8L9 5.5L11.8 8" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M4.5 14.5H13.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3"/>
        </svg>
      )
    case 'bounce-in':
      return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.35"/>
          <path d="M5.5 14.5C6.5 12.5 7.5 11.5 9 13C10.5 14.5 12 13.5 12.5 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.45"/>
        </svg>
      )
    case 'blur-rise':
      return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M4.5 13.5H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.2"/>
          <path d="M4.5 10H13.5"   stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.55"/>
          <path d="M4.5 6.5H13.5"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )
    case 'skew-reveal':
      return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M5 14L8 4H13L10 14H5Z" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    case 'fill-reveal':
      return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="3.5" y="3.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.35"/>
          <rect x="3.5" y="9" width="11" height="5.5" rx="1.5" fill="currentColor" opacity="0.28"/>
        </svg>
      )
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M5 9H13M9 5L13 9L9 13" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
  }
}

// Mini bezier-curve preview for each easing type
const EASING_PATHS_MINI: Record<string, string> = {
  'linear':      'M 2,14 L 14,2',
  'ease':        'M 2,14 C 5,13 5,2 14,2',
  'ease-in':     'M 2,14 C 9,14 14,4 14,2',
  'ease-out':    'M 2,14 C 2,12 7,2 14,2',
  'ease-in-out': 'M 2,14 C 8,14 8,2 14,2',
  'spring':      'M 2,14 C 5,-3 11,2 14,2',
  'back':        'M 2,14 C 9,14 10,19 14,2',
  'snappy':      'M 2,14 C 5,14 2,2 14,2',
}

function EasingCurveIcon({ id }: { id: string }) {
  const path = EASING_PATHS_MINI[id] ?? EASING_PATHS_MINI.linear
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <line x1="2" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="0.75" opacity="0.18"/>
      <line x1="2" y1="2"  x2="14" y2="2"  stroke="currentColor" strokeWidth="0.75" opacity="0.18"/>
      <path d={path} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  )
}
