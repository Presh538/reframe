'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useEditorStore } from '@/lib/store/editor'
import { PRESETS, CATEGORIES, getPresetsByCategory } from '@/lib/presets'
import { SPRING } from '@/lib/motion'
import type { EasingType, PresetCategory } from '@/types'

const f: React.CSSProperties = { fontFamily: 'var(--font-geist-sans), sans-serif' }

type ActiveSection = 'presets' | 'easing' | null

// ── Preset animation families ────────────────────────────────
type AnimFamily = 'draw' | 'rise' | 'bounce' | 'spin' | 'pulse' | 'shake' | 'cascade' | 'slide' | 'reveal' | 'check' | 'typewriter' | 'unfold' | 'morph' | 'sweep'

const PRESET_FAMILY: Record<string, AnimFamily> = {
  // Logo
  'draw-on': 'draw', 'fade-up-scale': 'rise', 'bounce-in': 'bounce', 'blur-rise': 'rise',
  'skew-reveal': 'slide', 'fill-reveal': 'reveal', 'cascade': 'cascade',
  'slide-in': 'slide', 'zoom-in': 'rise',
  // Icon
  'wiggle': 'shake', 'pulse-breathe': 'pulse', 'spin-loop': 'spin', 'path-in': 'draw',
  'pop-settle': 'bounce', 'glow-pulse': 'pulse', 'color-pop': 'pulse',
  'tada': 'shake', 'bounce-loop': 'bounce', 'flip': 'spin',
  // Illustration
  'float-loop': 'rise', 'shake': 'shake', 'wave-path': 'shake',
  'scale-stagger': 'cascade', 'stagger-reveal': 'cascade',
  'parallax-drift': 'rise', 'liquid-morph': 'morph', 'hue-sweep': 'sweep',
  // UI
  'checkmark-draw': 'check', 'loading-spin': 'spin', 'arrow-slide-in': 'slide',
  'fade-blur': 'reveal', 'typewriter': 'typewriter', 'elastic-unfold': 'unfold',
  'progress-fill': 'reveal', 'ping': 'pulse',
}

// ── Easing definitions ────────────────────────────────────────
const MOTION_EASE: Record<EasingType, string | number[]> = {
  'linear': 'linear', 'ease': [0.25, 0.1, 0.25, 1], 'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1], 'ease-in-out': [0.42, 0, 0.58, 1],
  'spring': [0.34, 1.56, 0.64, 1], 'back': [0.36, 0, 0.66, -0.56], 'snappy': [0.2, 0, 0, 1],
}

interface EasingDef { id: EasingType; name: string; description: string; path: string }

const EASING_GROUPS: { label: string; items: EasingDef[] }[] = [
  {
    label: 'Standard',
    items: [
      { id: 'linear', name: 'Linear', description: 'Constant speed — no acceleration', path: 'M 2,18 L 26,2' },
      { id: 'ease', name: 'Ease', description: 'Gentle start and end', path: 'M 2,18 C 8,16 8,2 26,2' },
      { id: 'ease-in', name: 'Ease In', description: 'Slow start, fast finish', path: 'M 2,18 C 12,18 26,2 26,2' },
      { id: 'ease-out', name: 'Ease Out', description: 'Fast start, slow finish', path: 'M 2,18 C 2,18 16,2 26,2' },
      { id: 'ease-in-out', name: 'Ease In Out', description: 'Accelerates then decelerates', path: 'M 2,18 C 12,18 16,2 26,2' },
    ],
  },
  {
    label: 'Expressive',
    items: [
      { id: 'spring', name: 'Spring', description: 'Overshoots the target then settles', path: 'M 2,18 C 10,-7 17,2 26,2' },
      { id: 'back', name: 'Back', description: 'Pulls back before launching forward', path: 'M 2,18 C 11,18 18,27 26,2' },
      { id: 'snappy', name: 'Snappy', description: 'Instant start, long smooth tail', path: 'M 2,18 C 7,18 2,2 26,2' },
    ],
  },
]

// ── Main component ────────────────────────────────────────────

export function LeftSidebar() {
  const svgSource   = useEditorStore(s => s.svgSource)
  const svgFileName = useEditorStore(s => s.svgFileName)
  const hasFile     = svgSource !== null

  const [openSection, setOpenSection] = useState<ActiveSection>(null)

  useEffect(() => {
    if (hasFile) setOpenSection('presets')
    else setOpenSection(null)
  }, [hasFile])

  const toggleSection = (section: 'presets' | 'easing') => {
    setOpenSection(prev => prev === section ? null : section)
  }

  return (
    <motion.div
      className="absolute left-4 top-6 z-30 pointer-events-none"
      style={{ width: 240, display: 'flex', flexDirection: 'column', gap: 8 }}
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...SPRING.entrance, delay: 0.02 }}
    >
      {/* ── Logo + File pill ──────────────────────────────────── */}
      <div
        className="pointer-events-auto flex items-center gap-[10px] px-[10px] py-[9px] backdrop-blur-md"
        style={{ borderRadius: 34, background: 'rgba(229,229,229,0.60)' }}
      >
        <ReframeLogo />
        {svgFileName && (
          <>
            <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.1)', flexShrink: 0 }} />
            <FileIcon />
            <span style={{
              ...f, fontWeight: 500, fontSize: 13, lineHeight: '20px', color: '#545454',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0,
            }}>
              {svgFileName}
            </span>
            <button
              onClick={() => document.querySelector<HTMLInputElement>('input[type="file"][accept*="svg"]')?.click()}
              style={{
                background: 'rgba(63,55,201,0.05)', borderRadius: 34, padding: '3px 8px',
                ...f, fontWeight: 500, fontSize: 12, lineHeight: '24px', color: '#3f37c9',
                whiteSpace: 'nowrap', border: 'none', cursor: 'pointer', flexShrink: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(63,55,201,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(63,55,201,0.05)')}
            >
              Change
            </button>
          </>
        )}
      </div>

      {/* ── Accordion sections (appear when file loaded) ──────── */}
      <AnimatePresence>
        {hasFile && (
          <motion.div
            key="accordions"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={SPRING.panel}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            <AccordionCard
              title="Presets"
              icon={<PresetsIcon />}
              isOpen={openSection === 'presets'}
              onToggle={() => toggleSection('presets')}
            >
              <PresetContent />
            </AccordionCard>

            <AccordionCard
              title="Easing"
              icon={<EasingIcon />}
              isOpen={openSection === 'easing'}
              onToggle={() => toggleSection('easing')}
            >
              <EasingContent />
            </AccordionCard>

          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Accordion card ────────────────────────────────────────────

function AccordionCard({
  title, icon, isOpen, onToggle, children,
}: {
  title: string
  icon: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="pointer-events-auto"
      style={{
        borderRadius: 14,
        background: 'rgba(251,251,251,0.80)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px', border: 'none', background: 'transparent', cursor: 'pointer',
        }}
      >
        {icon}
        <span style={{ ...f, flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 500, color: '#111', lineHeight: '20px' }}>
          {title}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={SPRING.snappy}
          style={{ display: 'flex', flexShrink: 0 }}
        >
          <ChevronIcon />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING.panel}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingBottom: 4 }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Preset content ────────────────────────────────────────────

function PresetContent() {
  const [query, setQuery] = useState('')
  const activePresetId  = useEditorStore(s => s.activePresetId)
  const setActivePreset = useEditorStore(s => s.setActivePreset)

  const handleSelect = (id: string) => setActivePreset(id)

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return PRESETS.filter(p => p.name.toLowerCase().includes(q))
  }, [query])

  const catStartIndices = useMemo(() => {
    let offset = 0
    return Object.fromEntries(
      CATEGORIES.map(cat => {
        const start = offset
        offset += getPresetsByCategory(cat).length
        return [cat, start] as [string, number]
      })
    ) as Record<string, number>
  }, [])

  return (
    <>
      <div style={{
        margin: '6px 8px',
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.9)',
        borderRadius: 9, padding: '6px 10px',
      }}>
        <svg width="13" height="13" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, opacity: 0.38 }}>
          <circle cx="6.5" cy="6.5" r="4" stroke="#111" strokeWidth="1.4"/>
          <path d="M9.5 9.5L12.5 12.5" stroke="#111" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <input
          placeholder="Search presets…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ ...f, border: 'none', background: 'transparent', outline: 'none', fontSize: 12, lineHeight: '20px', color: '#111', width: '100%', caretColor: '#3f37c9' }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0, display: 'flex' }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M3 3L11 11M11 3L3 11" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      <div className="scrollbar-thin" style={{ maxHeight: 280, overflowY: 'auto', padding: '0 4px' }}>
        {searchResults ? (
          searchResults.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {searchResults.map((preset, idx) => (
                <PresetRow key={preset.id} preset={preset} isActive={activePresetId === preset.id} onSelect={handleSelect} index={idx} />
              ))}
            </div>
          ) : (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
              style={{ ...f, textAlign: 'center', fontSize: 12, color: '#aaa', padding: '16px 0', margin: 0 }}>
              No presets found
            </motion.p>
          )
        ) : (
          CATEGORIES.map(cat => (
            <PresetGroup key={cat} category={cat} activeId={activePresetId} onSelect={handleSelect} startIndex={catStartIndices[cat]} />
          ))
        )}
      </div>
    </>
  )
}

function PresetGroup({ category, activeId, onSelect, startIndex }: {
  category: PresetCategory; activeId: string | null; onSelect: (id: string) => void; startIndex: number
}) {
  const presets = getPresetsByCategory(category)
  if (!presets.length) return null
  return (
    <div style={{ marginBottom: 4 }}>
      <motion.p
        initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30, delay: Math.min(startIndex * 0.025, 0.3) }}
        style={{ ...f, fontSize: 10, fontWeight: 400, lineHeight: '16px', color: '#afafaf', padding: '4px 8px 2px', margin: 0 }}
      >
        {category}
      </motion.p>
      {presets.map((preset, i) => (
        <PresetRow key={preset.id} preset={preset} isActive={activeId === preset.id} onSelect={onSelect} index={startIndex + i} />
      ))}
    </div>
  )
}

function PresetRow({ preset, isActive, onSelect, index = 0 }: {
  preset: { id: string; name: string; icon: string; pro?: boolean }
  isActive: boolean; onSelect: (id: string) => void; index?: number
}) {
  const [hovered, setHovered] = useState(false)
  const family = PRESET_FAMILY[preset.id] ?? 'rise'
  const color = isActive ? '#3f37c9' : '#888'

  return (
    <motion.button
      onClick={() => onSelect(preset.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30, delay: Math.min(index * 0.025, 0.35) }}
      style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
    >
      {isActive && <span style={{ position: 'absolute', inset: 0, borderRadius: 8, background: 'rgba(63,55,201,0.08)', zIndex: 0 }} />}
      <AnimatePresence>
        {hovered && !isActive && (
          <motion.span layoutId="preset-hover-sidebar"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 36 }}
            style={{ position: 'absolute', inset: 0, borderRadius: 8, background: 'rgba(0,0,0,0.04)', zIndex: 0 }}
          />
        )}
      </AnimatePresence>
      <span style={{
        position: 'relative', zIndex: 1, width: 28, height: 24, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isActive ? 'rgba(63,55,201,0.07)' : 'rgba(0,0,0,0.04)',
        borderRadius: 5, overflow: 'hidden',
      }}>
        <PresetAnimIcon family={family} color={color} hovered={hovered} />
      </span>
      <span style={{ ...f, position: 'relative', zIndex: 1, fontWeight: isActive ? 500 : 400, fontSize: 12, lineHeight: '20px', color: isActive ? '#111' : '#3d3d3d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
        {preset.name}
      </span>
    </motion.button>
  )
}

function PresetAnimIcon({ family, color, hovered }: { family: AnimFamily; color: string; hovered: boolean }) {
  const t = { type: 'spring', stiffness: 500, damping: 22, mass: 0.6 } as const
  switch (family) {
    case 'draw':
      return <svg width="22" height="18" viewBox="0 0 24 20" fill="none" style={{ overflow: 'visible' }}><motion.path d="M 4,15 L 10,6 L 20,10" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: hovered ? 1 : 0 }} transition={{ duration: 0.45, ease: 'easeOut' }} /></svg>
    case 'check':
      return <svg width="22" height="18" viewBox="0 0 24 20" fill="none" style={{ overflow: 'visible' }}><motion.path d="M 4,10 L 9,15 L 20,5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: hovered ? 1 : 0 }} transition={{ duration: 0.4, ease: 'easeOut' }} /></svg>
    case 'rise':
      return <svg width="22" height="18" viewBox="0 0 24 20" fill="none" style={{ overflow: 'visible' }}><motion.rect x="9" y="8" width="6" height="6" rx="1.5" fill={color} initial={{ y: 0, opacity: 0.7 }} animate={hovered ? { y: -4, opacity: 1 } : { y: 0, opacity: 0.7 }} transition={t} /></svg>
    case 'bounce':
      return <svg width="22" height="18" viewBox="0 0 24 20" fill="none"><motion.circle cx="12" cy="10" r="4.5" fill="none" stroke={color} strokeWidth="1.5" animate={hovered ? { scale: [1, 0.45, 1.35, 0.88, 1.08, 1] } : { scale: 1 }} style={{ originX: '12px', originY: '10px' }} transition={{ duration: 0.55, ease: 'easeOut' }} /></svg>
    case 'spin':
      return <svg width="22" height="18" viewBox="0 0 24 20" fill="none"><motion.path d="M 12,4 A 6,6 0 1 1 6.5,7.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" animate={hovered ? { rotate: 360 } : { rotate: 0 }} style={{ originX: '12px', originY: '10px' }} transition={{ duration: 0.55, ease: 'easeInOut' }} /><motion.path d="M 5.5,5.5 L 6.5,7.5 L 8.5,6.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" animate={hovered ? { rotate: 360 } : { rotate: 0 }} style={{ originX: '12px', originY: '10px' }} transition={{ duration: 0.55, ease: 'easeInOut' }} /></svg>
    case 'pulse':
      return <svg width="22" height="18" viewBox="0 0 24 20" fill="none"><motion.circle cx="12" cy="10" r="4" fill={color} initial={{ scale: 1, opacity: 0.8 }} animate={hovered ? { scale: [1, 1.45, 0.9, 1.2, 1], opacity: [0.8, 0.5, 0.9, 0.65, 0.8] } : { scale: 1, opacity: 0.8 }} style={{ originX: '12px', originY: '10px' }} transition={{ duration: 0.7, ease: 'easeInOut' }} /></svg>
    case 'shake':
      return <svg width="22" height="18" viewBox="0 0 24 20" fill="none"><motion.rect x="8" y="7" width="8" height="6" rx="2" fill="none" stroke={color} strokeWidth="1.5" animate={hovered ? { x: [0, -4, 4, -3, 3, -1.5, 1.5, 0] } : { x: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }} /></svg>
    case 'cascade':
      return <svg width="22" height="18" viewBox="0 0 24 20" fill="none" style={{ overflow: 'visible' }}>{[0, 1, 2].map(i => <motion.rect key={i} x={5 + i * 6} y="8" width="4" height="5" rx="1" fill={color} initial={{ scaleY: 0.2, opacity: 0.25 }} animate={hovered ? { scaleY: 1, opacity: 1 } : { scaleY: 0.2, opacity: 0.25 }} style={{ originY: '100%', originX: `${5 + i * 6 + 2}px` }} transition={{ ...t, delay: hovered ? i * 0.08 : 0 }} />)}</svg>
    case 'slide':
      return <svg width="22" height="18" viewBox="0 0 24 20" fill="none" style={{ overflow: 'hidden' }}><motion.rect x="8" y="7" width="8" height="6" rx="2" fill="none" stroke={color} strokeWidth="1.5" initial={{ x: 7, opacity: 0 }} animate={hovered ? { x: 0, opacity: 1 } : { x: 7, opacity: 0 }} transition={t} /></svg>
    case 'typewriter':
      return <svg width="22" height="18" viewBox="0 0 24 20" fill="none" style={{ overflow: 'visible' }}><motion.path d="M 4,10 H 17" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: hovered ? 1 : 0 }} transition={{ duration: 0.35, ease: 'linear' }} /><motion.line x1="18.5" y1="7" x2="18.5" y2="13" stroke={color} strokeWidth="1.4" strokeLinecap="round" initial={{ opacity: 0 }} animate={hovered ? { opacity: [0, 1, 0, 1, 0, 1] } : { opacity: 0 }} transition={{ duration: 0.7, ease: 'linear', delay: 0.3 }} /></svg>
    case 'unfold':
      return <svg width="22" height="18" viewBox="0 0 24 20" fill="none"><motion.rect x="7" y="8" width="10" height="4" rx="1.5" fill="none" stroke={color} strokeWidth="1.5" initial={{ scaleX: 0.12, opacity: 0.35 }} animate={hovered ? { scaleX: 1, opacity: 1 } : { scaleX: 0.12, opacity: 0.35 }} style={{ originX: '12px', originY: '10px' }} transition={{ type: 'spring', stiffness: 600, damping: 11, mass: 0.5 }} /></svg>
    case 'morph':
      return <svg width="22" height="18" viewBox="0 0 24 20" fill="none"><motion.circle cx="12" cy="10" r="4.5" fill={color} opacity={0.75} animate={hovered ? { scaleX: [1, 1.55, 0.7, 1.25, 0.88, 1], scaleY: [1, 0.6, 1.45, 0.82, 1.12, 1] } : { scaleX: 1, scaleY: 1 }} style={{ originX: '12px', originY: '10px' }} transition={{ duration: 0.65, ease: 'easeInOut' }} /></svg>
    case 'sweep':
      return <svg width="22" height="18" viewBox="0 0 24 20" fill="none" style={{ overflow: 'hidden' }}><rect x="4" y="7.5" width="16" height="5" rx="1.5" fill={color} opacity={0.15} /><motion.rect x="4" y="7.5" width="16" height="5" rx="1.5" fill={color} opacity={0.75} animate={hovered ? { scaleX: 1 } : { scaleX: 0 }} style={{ originX: '4px' }} transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }} /></svg>
    case 'reveal':
    default:
      return <svg width="22" height="18" viewBox="0 0 24 20" fill="none" style={{ overflow: 'visible' }}><motion.rect x="8" y="7" width="8" height="6" rx="2" fill="none" stroke={color} strokeWidth="1.5" initial={{ y: 4, opacity: 0 }} animate={hovered ? { y: 0, opacity: 1 } : { y: 4, opacity: 0 }} transition={t} /></svg>
  }
}

// ── Easing content ────────────────────────────────────────────

function EasingContent() {
  const easing      = useEditorStore(s => s.params.easing)
  const updateParam = useEditorStore(s => s.updateParam)
  const handleSelect = (id: EasingType) => updateParam('easing', id)

  return (
    <div className="scrollbar-thin" style={{ maxHeight: 280, overflowY: 'auto', padding: '4px 4px' }}>
      {EASING_GROUPS.map(group => (
        <EasingGroup key={group.label} label={group.label} items={group.items} activeId={easing} onSelect={handleSelect} />
      ))}
    </div>
  )
}

function EasingGroup({ label, items, activeId, onSelect }: {
  label: string; items: EasingDef[]; activeId: EasingType; onSelect: (id: EasingType) => void
}) {
  return (
    <div style={{ marginBottom: 4 }}>
      <p style={{ ...f, fontSize: 10, fontWeight: 400, lineHeight: '16px', color: '#afafaf', padding: '4px 8px 2px', margin: 0 }}>{label}</p>
      {items.map(item => <EasingRow key={item.id} item={item} isActive={activeId === item.id} onSelect={onSelect} />)}
    </div>
  )
}

function EasingRow({ item, isActive, onSelect }: {
  item: EasingDef; isActive: boolean; onSelect: (id: EasingType) => void
}) {
  const [hovered, setHovered] = useState(false)
  const color = isActive ? '#3f37c9' : '#999'
  return (
    <motion.button
      onClick={() => onSelect(item.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
        borderRadius: 8, border: 'none',
        background: isActive ? 'rgba(63,55,201,0.08)' : hovered ? 'rgba(0,0,0,0.04)' : 'transparent',
        cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
      }}
    >
      <span style={{
        width: 32, height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isActive ? 'rgba(63,55,201,0.07)' : 'rgba(0,0,0,0.04)', borderRadius: 5,
      }}>
        <svg width="24" height="18" viewBox="0 0 28 20" fill="none" style={{ overflow: 'visible' }}>
          <line x1="2" y1="18" x2="26" y2="18" stroke={isActive ? 'rgba(63,55,201,0.12)' : 'rgba(0,0,0,0.08)'} strokeWidth="0.75"/>
          <line x1="2" y1="2"  x2="26" y2="2"  stroke={isActive ? 'rgba(63,55,201,0.12)' : 'rgba(0,0,0,0.08)'} strokeWidth="0.75"/>
          <path d={item.path} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="2" cy="18" r="1.5" fill={color} />
          <circle cx="26" cy="2" r="1.5" fill={color} />
          <motion.circle r={2} fill={isActive ? '#3f37c9' : '#555'}
            initial={{ cx: 2, cy: 18 }}
            animate={hovered ? { cx: 26, cy: 2 } : { cx: 2, cy: 18 }}
            transition={{
              cx: { duration: 0.7, ease: 'linear' },
              cy: { duration: 0.7, ease: MOTION_EASE[item.id] as never },
            }}
          />
        </svg>
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ ...f, display: 'block', fontWeight: isActive ? 500 : 400, fontSize: 12, lineHeight: '18px', color: isActive ? '#111' : '#3d3d3d' }}>{item.name}</span>
        <span style={{ ...f, display: 'block', fontSize: 10, lineHeight: '14px', color: isActive ? 'rgba(63,55,201,0.7)' : '#aaa' }}>{item.description}</span>
      </span>
    </motion.button>
  )
}


// ── Icons ─────────────────────────────────────────────────────

function PresetsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <path d="M14.9999 14.1667C15.9191 14.1667 16.6666 13.4192 16.6666 12.5V4.16667C16.6666 3.2475 15.9191 2.5 14.9999 2.5H4.99992C4.08075 2.5 3.33325 3.2475 3.33325 4.16667V12.5C3.33325 13.4192 4.08075 14.1667 4.99992 14.1667H14.9999ZM3.33325 15.8333H16.6666V17.5H3.33325V15.8333Z" fill="#00C945"/>
    </svg>
  )
}

function EasingIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <path d="M13.3334 2.5H6.66675C5.74758 2.5 5.00008 3.2475 5.00008 4.16667V15.8333C5.00008 16.7525 5.74758 17.5 6.66675 17.5H13.3334C14.2526 17.5 15.0001 16.7525 15.0001 15.8333V4.16667C15.0001 3.2475 14.2526 2.5 13.3334 2.5ZM1.66675 5.83333V14.1667C1.66675 15.0858 2.41425 15.8333 3.33341 15.8333V4.16667C2.41425 4.16667 1.66675 4.91417 1.66675 5.83333ZM16.6667 4.16667V15.8333C17.5859 15.8333 18.3334 15.0858 18.3334 14.1667V5.83333C18.3334 4.91417 17.5859 4.16667 16.6667 4.16667Z" fill="#854BE2"/>
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 5L7 9L11 5" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}


function FileIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <path d="M15.8333 8.33333H4.16667C3.2475 8.33333 2.5 9.08083 2.5 10V16.6667C2.5 17.5858 3.2475 18.3333 4.16667 18.3333H15.8333C16.7525 18.3333 17.5 17.5858 17.5 16.6667V10C17.5 9.08083 16.7525 8.33333 15.8333 8.33333ZM4.16667 5H15.8333V6.66667H4.16667V5ZM5.83333 1.66667H14.1667V3.33333H5.83333V1.66667Z" fill="#AFAFAF"/>
    </svg>
  )
}

function ReframeLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <g opacity="0.15">
        <path d="M4.95897 20.1488C4.79007 16.8622 6.52817 14.7621 7.52005 15.6758C7.55076 15.7034 7.58761 15.7463 7.61525 15.7769C6.03377 17.0953 6.14124 20.5106 7.23754 22.8774C6.93045 23.5366 6.74927 23.7451 6.4299 23.7696C5.75125 23.6868 5.0511 21.9608 4.95897 20.1488Z" fill="#3F37C9"/><path d="M7.33916 22.623C7.35451 22.5739 8.94828 17.7575 7.61553 15.7769C9.20009 14.7652 10.2503 18.1836 9.48875 21.8718C9.283 22.8836 8.89607 24.0731 8.26041 23.9965C7.88884 23.8861 7.64624 23.604 7.25317 22.8774L7.35451 22.623" fill="#3F37C9"/><path d="M13.2626 1.22643C14.2422 0.742025 16.6559 0.0889989 16.4348 0.81254C13.7294 1.38585 12.0435 2.99236 12.5624 3.90598C12.3305 3.97973 12.0868 4.00987 11.8439 3.99489C10.7783 3.80788 11.1007 2.61219 12.458 1.67098C12.7153 1.50381 12.9841 1.35524 13.2626 1.22643Z" fill="#3F37C9"/><path d="M16.6713 0.769676C17.3346 0.662371 18.8025 0.506013 18.1484 1.38285C17.568 2.14931 14.7704 4.28314 13.0385 4.14211C12.8554 4.12941 12.6846 4.04579 12.5625 3.90911C14.6077 3.20396 16.2905 1.11612 16.4348 0.815664L16.6713 0.772742" fill="#3F37C9"/><path d="M15.354 10.985C15.465 10.8005 15.6161 10.6434 15.7962 10.5251C16.1032 11.6288 17.7093 12.3646 18.3849 12.6099C18.717 12.73 19.0552 12.8323 19.3983 12.9165C20.3886 13.1999 21.4281 13.27 22.4476 13.1219C23.6759 15.4918 21.9102 16.2951 19.5457 15.5317C19.3583 15.4734 19.1127 15.3753 18.9315 15.3048C16.6253 14.3176 14.6323 12.3401 15.357 10.9697" fill="#3F37C9"/><path d="M15.9897 9.54409C17.5712 7.45624 23.7805 9.11487 23.9954 11.6902C24.0845 12.7632 22.85 13.0514 22.46 13.1465C21.6981 11.9483 20.5598 11.0362 19.2233 10.5528C17.8752 10.0438 16.5609 10.0346 15.7932 10.5252C15.747 10.3577 15.7407 10.1817 15.7748 10.0113C15.8089 9.84097 15.8826 9.68095 15.9897 9.54409Z" fill="#3F37C9"/><path d="M0.543397 12.0182C0.72845 11.5117 0.957592 11.0223 1.2282 10.5558C1.2589 10.8317 1.40323 10.8869 1.84236 10.798C1.98994 10.759 2.13463 10.7099 2.27535 10.6508C3.08145 10.3115 3.79971 9.79357 4.37581 9.13628C4.4403 10.5312 2.05118 12.5424 1.04394 13.1464C0.546468 13.4223 0.0889127 13.5971 0.40828 12.4474C0.44513 12.3186 0.500406 12.1408 0.546468 12.0182" fill="#3F37C9"/><path d="M1.69811 9.33865C3.44542 6.19002 4.71061 6.64377 4.94399 7.35811C5.03612 7.64324 5.08525 8.25028 4.37281 9.13018C4.32675 8.55073 3.80471 8.32386 3.14448 8.59059C2.14952 9.01674 1.47394 10.1358 1.22827 10.5558C1.22827 10.4025 1.26205 10.145 1.70732 9.32946" fill="#3F37C9"/><path d="M0.592429 17.9936C0.5218 14.5659 3.21186 12.006 4.09012 12.7816C4.18873 12.9002 4.26128 13.0382 4.30308 13.1866C4.34487 13.335 4.35496 13.4906 4.33271 13.6431C4.27761 13.6369 4.22199 13.6369 4.16689 13.6431C3.20879 13.7504 1.40313 15.8107 1.53825 19.2107C1.47231 19.269 1.39901 19.3185 1.32022 19.3579C0.678413 19.5878 0.601642 18.3737 0.592429 17.9966" fill="#3F37C9"/><path d="M1.5629 19.5204L1.53833 19.2138C2.31832 18.4627 4.21303 15.1669 4.3328 13.6524C6.04633 14.0356 3.24265 20.759 2.51793 21.1545L2.44116 21.1852C1.90683 21.2955 1.63967 20.198 1.5629 19.5327" fill="#3F37C9"/><path d="M15.6398 4.55896C17.3257 2.52937 22.1285 2.14614 22.2544 3.56563C22.2418 3.83116 22.1326 4.08298 21.9473 4.27384C19.1805 3.67906 16.2755 4.9054 15.8333 6.0459C14.8629 5.61668 15.4402 4.7981 15.6398 4.55896Z" fill="#3F37C9"/><path d="M15.8575 6.05514C15.9219 6.07996 15.9875 6.10145 16.0541 6.11952C17.5066 6.47823 20.6941 5.63205 21.9624 4.28001C23.6268 4.70923 23.9308 5.70563 22.638 6.50276C21.5724 7.16191 18.953 7.79348 16.8249 7.27228C16.484 7.15885 15.5965 6.86146 15.833 6.04594H15.8575" fill="#3F37C9"/><path d="M10.9381 15.6175C11.1162 15.1301 11.4939 14.5598 12.2677 14.5997C11.5584 16.1878 13.017 19.4621 15.0468 20.8479C14.6415 22.5065 13.9137 22.6598 13.3732 22.4942C11.6812 21.7891 10.201 17.5889 10.935 15.6083" fill="#3F37C9"/><path d="M12.3047 14.5261C13.2966 12.6651 16.4258 14.6978 17.301 17.7697C17.8721 19.7871 17.2119 21.6756 15.4984 21.087C15.3404 21.0223 15.1892 20.9422 15.047 20.8479C15.5322 18.0181 14.0489 15.0626 12.4982 14.6303C12.4272 14.6134 12.3555 14.6001 12.2832 14.5905C12.2864 14.5653 12.2926 14.5406 12.3016 14.5169" fill="#3F37C9"/><path d="M6.83862 3.60554C6.88468 3.57181 7.97176 2.77776 8.44467 2.63673C6.43019 4.02249 6.74342 4.95451 7.48349 5.08941C7.56414 5.0978 7.64544 5.0978 7.72609 5.08941L7.89191 5.06795C7.49373 5.55106 6.93644 5.87707 6.31964 5.9877C5.24485 6.07661 4.96233 5.46037 5.70547 4.6142C6.04997 4.23977 6.43401 3.90364 6.8509 3.61167" fill="#3F37C9"/><path d="M9.09274 2.24429C9.58089 1.9651 10.0951 1.73407 10.6282 1.55447C10.883 1.48702 10.9967 1.49929 10.9137 1.75988C10.9137 1.78748 9.74683 4.66324 7.91968 5.071C8.73038 4.15125 9.14801 2.53861 8.53385 2.61832L8.454 2.63672C8.6444 2.51408 8.82558 2.39758 9.10195 2.24429" fill="#3F37C9"/>
      </g>
      <path d="M4.65843 19.6614C4.48954 16.3625 6.22763 14.2747 7.21952 15.1853L7.31778 15.2864C5.73323 16.6047 5.83457 20.0232 6.937 22.3808C6.62991 23.043 6.44873 23.2515 6.12937 23.276C5.45378 23.1902 4.75056 21.4641 4.65843 19.6553" fill="#3F37C9"/><path d="M7.03835 22.1325C7.05677 22.0865 8.64747 17.267 7.3178 15.2864C8.90235 14.2747 9.95258 17.6931 9.19101 21.3844C8.98219 22.3962 8.59527 23.5857 7.94425 23.5091C7.57268 23.3956 7.33008 23.1136 6.93701 22.387C6.96772 22.3103 7.01071 22.2091 7.03835 22.1325Z" fill="#3F37C9"/><path d="M12.965 0.726704C13.9446 0.254563 16.3583 -0.401529 16.1341 0.322012C13.4287 0.898392 11.7459 2.5049 12.2648 3.41852C12.0326 3.49088 11.789 3.51998 11.5463 3.50437C10.4807 3.31735 10.8031 2.12473 12.1604 1.18352C12.4141 1.01389 12.6788 0.861284 12.9527 0.726704" fill="#3F37C9"/><path d="M16.3737 0.279079C17.0339 0.171774 18.5048 0.0184815 17.8477 0.892249C17.2673 1.65871 14.4698 3.78948 12.7409 3.65151C12.5579 3.63849 12.3872 3.55493 12.2649 3.41851C14.307 2.71336 15.9929 0.613256 16.1342 0.322001L16.3737 0.279079Z" fill="#3F37C9"/><path d="M15.047 10.4975C15.1562 10.3127 15.3064 10.1554 15.4861 10.0377C15.7932 11.1414 17.4023 11.8618 18.0748 12.1224C18.4076 12.2478 18.747 12.3553 19.0913 12.4444C20.0818 12.7271 21.1213 12.796 22.1406 12.6467C23.369 15.0197 21.6032 15.8229 19.2356 15.0595C19.0483 14.9982 18.8026 14.9032 18.6214 14.8296C16.3152 13.8454 14.3223 11.868 15.0501 10.4975" fill="#3F37C9"/><path d="M15.6918 9.05655C17.2702 6.9687 23.4795 8.62733 23.6945 11.2026C23.7835 12.2757 22.5521 12.5608 22.159 12.6559C21.397 11.4655 20.264 10.5584 18.9346 10.0744C17.5896 9.56548 16.2753 9.55321 15.5045 10.0468C15.459 9.87906 15.4533 9.70301 15.4879 9.53268C15.5226 9.36235 15.5966 9.20246 15.7041 9.06574" fill="#3F37C9"/><path d="M0.242486 11.5277C0.427282 11.0221 0.654299 10.5329 0.921142 10.0653C0.94878 10.3412 1.09311 10.3994 1.53531 10.3075C1.68406 10.2704 1.82982 10.2222 1.97137 10.1634C2.77637 9.82207 3.49422 9.30446 4.07183 8.64883C4.13324 10.0407 1.74413 12.0519 0.736892 12.6559C0.245557 12.9349 -0.215069 13.1096 0.107369 11.9569C0.144219 11.8251 0.199494 11.6503 0.242486 11.5246" fill="#3F37C9"/><path d="M1.39995 8.85126C3.14419 5.69956 4.41245 6.15637 4.64583 6.87685C4.73796 7.15891 4.78402 7.76594 4.07465 8.64891C4.02552 8.06946 3.50655 7.84259 2.84632 8.10932C1.84215 8.52934 1.17271 9.64531 0.920898 10.0653C0.920898 9.91204 0.954678 9.65451 1.39995 8.83899" fill="#3F37C9"/><path d="M0.306903 17.5061C0.233203 14.0754 2.92633 11.5155 3.80459 12.2942C3.90271 12.4131 3.97495 12.5511 4.01672 12.6994C4.05849 12.8478 4.06886 13.0031 4.04719 13.1557C3.99106 13.1496 3.93443 13.1496 3.87829 13.1557C2.91098 13.2569 1.11453 15.3294 1.22816 18.7202C1.16325 18.7776 1.09096 18.826 1.0132 18.8643C0.377533 19.0973 0.306903 17.8832 0.306903 17.5061Z" fill="#3F37C9"/><path d="M1.26494 19.0329L1.2373 18.7263C2.0173 17.9752 3.91508 14.6794 4.03484 13.1649C5.74837 13.5543 2.94469 20.2777 2.21997 20.6578L2.14934 20.6854C1.61502 20.7927 1.34785 19.6982 1.27415 19.0329" fill="#3F37C9"/><path d="M15.3542 4.06848C17.0247 2.03889 21.8306 1.65872 21.9565 3.06595C21.943 3.33216 21.834 3.58464 21.6494 3.77722C18.8672 3.16405 15.9499 4.41492 15.5077 5.54622C14.5404 5.12007 15.1147 4.30148 15.3143 4.05928" fill="#3F37C9"/><path d="M15.5597 5.56765C15.6426 5.59831 15.7071 5.6167 15.7531 5.62897C17.2056 5.98767 20.3932 5.1415 21.6614 3.78946C23.3381 4.21561 23.6452 5.21201 22.3401 6.00913C21.2745 6.66522 18.6551 7.29679 16.5239 6.77559C16.183 6.66522 15.2802 6.36477 15.532 5.54925H15.5597" fill="#3F37C9"/><path d="M10.6404 15.1271C10.8185 14.6427 11.1931 14.0724 11.967 14.1092C11.2607 15.6973 12.7163 18.9716 14.74 20.3697C14.3346 22.0252 13.6068 22.1785 13.0694 22.016C11.3743 21.3078 9.89417 17.1107 10.6312 15.1271" fill="#3F37C9"/><path d="M12.0037 14.0356C12.9987 12.1777 16.1279 14.2073 17 17.2824C17.5742 19.2997 16.9109 21.1882 15.2005 20.5996C15.0409 20.5357 14.8868 20.4588 14.7398 20.3697C15.225 17.5368 13.7449 14.5844 12.191 14.1521C12.1211 14.1289 12.0491 14.1125 11.9761 14.1031C11.9808 14.0772 11.9869 14.0516 11.9945 14.0264" fill="#3F37C9"/><path d="M6.53758 3.11498C6.58364 3.08125 7.67072 2.2872 8.14363 2.14617C6.14144 3.535 6.44852 4.46702 7.18553 4.59885C7.26613 4.60799 7.34752 4.60799 7.42812 4.59885C7.49261 4.59885 7.52025 4.59885 7.59395 4.57432C7.19541 5.05702 6.63828 5.38293 6.02168 5.49408C4.94381 5.58299 4.66436 4.96675 5.39215 4.12058C5.73648 3.74508 6.12053 3.40791 6.53758 3.11498Z" fill="#3F37C9"/><path d="M8.79171 1.75373C9.2815 1.47777 9.79543 1.24688 10.3271 1.06392C10.5789 0.996468 10.6926 1.00873 10.6127 1.26933C10.6127 1.29692 9.44273 4.17576 7.61865 4.58045C8.42935 3.67602 8.84699 2.04805 8.23282 2.12777H8.15298C8.34644 2.00513 8.52455 1.88863 8.80093 1.73534" fill="#3F37C9"/>
    </svg>
  )
}
