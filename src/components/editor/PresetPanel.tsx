'use client'

import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { PRESETS, CATEGORIES, getPresetsByCategory } from '@/lib/presets'
import { useEditorStore } from '@/lib/store/editor'
import type { PresetCategory } from '@/types'

interface PresetPanelProps {
  onClose: () => void
}

// ── Animation family per preset ──────────────────────────────────
type AnimFamily =
  | 'draw'       // path strokes itself on
  | 'rise'       // element moves up
  | 'bounce'     // spring scale pop
  | 'spin'       // rotation
  | 'pulse'      // scale breathe
  | 'shake'      // horizontal oscillation
  | 'cascade'    // staggered bars
  | 'slide'      // slides in from right
  | 'reveal'     // opacity + rise
  | 'check'      // checkmark draws on
  | 'typewriter' // text line grows + cursor blinks
  | 'unfold'     // scaleX elastic expand
  | 'morph'      // circle squish/stretch
  | 'sweep'      // fill sweeps left→right

const PRESET_FAMILY: Record<string, AnimFamily> = {
  'draw-on':        'draw',
  'fade-up-scale':  'rise',
  'bounce-in':      'bounce',
  'blur-rise':      'rise',
  'skew-reveal':    'slide',
  'fill-reveal':    'reveal',
  'cascade':        'cascade',
  'wiggle':         'shake',
  'pulse-breathe':  'pulse',
  'spin-loop':      'spin',
  'path-in':        'draw',
  'pop-settle':     'bounce',
  'glow-pulse':     'pulse',
  'color-pop':      'pulse',
  'float-loop':     'rise',
  'shake':          'shake',
  'wave-path':      'shake',
  'scale-stagger':  'cascade',
  'stagger-reveal': 'cascade',
  'checkmark-draw': 'check',
  'loading-spin':   'spin',
  'arrow-slide-in': 'slide',
  'fade-blur':      'reveal',
  'typewriter':     'typewriter',
  'elastic-unfold': 'unfold',
  'liquid-morph':   'morph',
  'hue-sweep':      'sweep',
}

const PANEL_HEIGHT = 480

const f: React.CSSProperties = {
  fontFamily: 'var(--font-geist-sans), sans-serif',
}

export function PresetPanel({ onClose }: PresetPanelProps) {
  const [query, setQuery] = useState('')
  const activePresetId  = useEditorStore(s => s.activePresetId)
  const setActivePreset = useEditorStore(s => s.setActivePreset)

  const handleSelect = (id: string) => {
    setActivePreset(id)
    onClose()
  }

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return PRESETS.filter(p => p.name.toLowerCase().includes(q))
  }, [query])

  // Cumulative start index per category — used to stagger rows continuously across groups
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
      <div className="fixed inset-0 z-20" onClick={onClose} />

      <motion.div
        className="fixed left-1/2 z-30"
        style={{ top: 76, translateX: '-50%' }}
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -6 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
      >
        <div style={{
          width: 396,
          height: PANEL_HEIGHT,
          padding: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          borderRadius: 14,
          background: 'rgba(251,251,251,0.80)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
        }}>

          {/* Search bar */}
          <div style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(255,255,255,0.55)',
            border: '1px solid rgba(255,255,255,0.9)',
            borderRadius: 9,
            padding: '7px 10px',
          }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, opacity: 0.38 }}>
              <circle cx="6.5" cy="6.5" r="4" stroke="#111" strokeWidth="1.4"/>
              <path d="M9.5 9.5L12.5 12.5" stroke="#111" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input
              placeholder="Search presets…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
              style={{
                ...f,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: 13,
                lineHeight: '20px',
                color: '#111',
                width: '100%',
                caretColor: '#3f37c9',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0, display: 'flex' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3L11 11M11 3L3 11" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>

          {/* List */}
          <div className="scrollbar-thin" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {searchResults ? (
              searchResults.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {searchResults.map((preset, idx) => (
                    <Row key={preset.id} preset={preset} isActive={activePresetId === preset.id} onSelect={handleSelect} index={idx} />
                  ))}
                </div>
              ) : (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  style={{ ...f, textAlign: 'center', fontSize: 12, color: '#aaa', padding: '20px 0', margin: 0 }}
                >
                  No presets found
                </motion.p>
              )
            ) : (
              CATEGORIES.map(cat => (
                <Group key={cat} category={cat} activeId={activePresetId} onSelect={handleSelect} startIndex={catStartIndices[cat]} />
              ))
            )}
          </div>

        </div>
      </motion.div>
    </>
  )
}

// ── Category group ───────────────────────────────────────────────

function Group({ category, activeId, onSelect, startIndex }: {
  category: PresetCategory
  activeId: string | null
  onSelect: (id: string) => void
  startIndex: number
}) {
  const presets = getPresetsByCategory(category)
  if (!presets.length) return null

  return (
    <div style={{ marginBottom: 4 }}>
      <motion.p
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30, delay: Math.min(startIndex * 0.025, 0.3) }}
        style={{ ...f, fontSize: 11, fontWeight: 400, lineHeight: '16px', color: '#afafaf', padding: '6px 8px 2px', margin: 0 }}
      >
        {category}
      </motion.p>
      {presets.map((preset, i) => (
        <Row key={preset.id} preset={preset} isActive={activeId === preset.id} onSelect={onSelect} index={startIndex + i} />
      ))}
    </div>
  )
}

// ── Row ─────────────────────────────────────────────────────────

function Row({ preset, isActive, onSelect, index = 0 }: {
  preset: { id: string; name: string; icon: string; pro?: boolean }
  isActive: boolean
  onSelect: (id: string) => void
  index?: number
}) {
  const [hovered, setHovered] = useState(false)
  const family = PRESET_FAMILY[preset.id] ?? 'rise'
  const color  = isActive ? '#3f37c9' : '#888'

  return (
    <motion.button
      onClick={() => onSelect(preset.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30, delay: Math.min(index * 0.025, 0.35) }}
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 8px',
        borderRadius: 8,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      {/* Layout-animated hover/active highlight — slides smoothly between rows */}
      {(hovered || isActive) && (
        <motion.span
          layoutId="row-highlight"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 36 }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 8,
            background: isActive ? 'rgba(63,55,201,0.08)' : 'rgba(0,0,0,0.04)',
            zIndex: 0,
          }}
        />
      )}
      {/* Animated icon chip — z-index above the highlight */}
      <span style={{
        position: 'relative', zIndex: 1,
        width: 32, height: 28, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isActive ? 'rgba(63,55,201,0.07)' : 'rgba(0,0,0,0.04)',
        borderRadius: 6, transition: 'background 0.1s', overflow: 'hidden',
      }}>
        <PresetAnimIcon family={family} color={color} hovered={hovered} />
      </span>

      {/* Name — z-index above the highlight */}
      <span style={{
        ...f, position: 'relative', zIndex: 1,
        fontWeight: isActive ? 500 : 400, fontSize: 13, lineHeight: '20px',
        color: isActive ? '#111' : '#3d3d3d',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
      }}>
        {preset.name}
      </span>

      {/* PRO badge */}
      {preset.pro && (
        <span style={{
          ...f, flexShrink: 0, position: 'relative', zIndex: 1,
          fontSize: 9, fontWeight: 600, padding: '2px 5px', borderRadius: 4,
          background: 'rgba(245,166,35,0.12)', color: '#c07a12',
          letterSpacing: '0.04em', lineHeight: '14px',
        }}>
          PRO
        </span>
      )}
    </motion.button>
  )
}

// ── Preset animated icons ────────────────────────────────────────
// Each family renders a 24×20 SVG that animates on hover to preview
// the motion concept of that preset category.

function PresetAnimIcon({ family, color, hovered }: {
  family: AnimFamily
  color: string
  hovered: boolean
}) {
  const t = { type: 'spring', stiffness: 500, damping: 22, mass: 0.6 } as const

  switch (family) {

    // ── A short path strokes itself on ──────────────────────────
    case 'draw':
      return (
        <svg width="24" height="20" viewBox="0 0 24 20" fill="none" style={{ overflow: 'visible' }}>
          <motion.path
            d="M 4,15 L 10,6 L 20,10"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: hovered ? 1 : 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
        </svg>
      )

    // ── Checkmark draws itself ───────────────────────────────────
    case 'check':
      return (
        <svg width="24" height="20" viewBox="0 0 24 20" fill="none" style={{ overflow: 'visible' }}>
          <motion.path
            d="M 4,10 L 9,15 L 20,5"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: hovered ? 1 : 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </svg>
      )

    // ── Small rect rises upward ──────────────────────────────────
    case 'rise':
      return (
        <svg width="24" height="20" viewBox="0 0 24 20" fill="none" style={{ overflow: 'visible' }}>
          <motion.rect
            x="9" y="8" width="6" height="6" rx="1.5"
            fill={color}
            opacity={0.85}
            animate={hovered ? { y: -4, opacity: 1 } : { y: 0, opacity: 0.7 }}
            transition={t}
          />
        </svg>
      )

    // ── Circle pops with spring overshoot ────────────────────────
    case 'bounce':
      return (
        <svg width="24" height="20" viewBox="0 0 24 20" fill="none">
          <motion.circle
            cx="12" cy="10" r="4.5"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            animate={hovered
              ? { scale: [1, 0.45, 1.35, 0.88, 1.08, 1] }
              : { scale: 1 }
            }
            style={{ originX: '12px', originY: '10px' }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          />
        </svg>
      )

    // ── Arc rotates ──────────────────────────────────────────────
    case 'spin':
      return (
        <svg width="24" height="20" viewBox="0 0 24 20" fill="none">
          <motion.path
            d="M 12,4 A 6,6 0 1 1 6.5,7.5"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            animate={hovered ? { rotate: 360 } : { rotate: 0 }}
            style={{ originX: '12px', originY: '10px' }}
            transition={{ duration: 0.55, ease: 'easeInOut' }}
          />
          {/* Arrow head at arc end */}
          <motion.path
            d="M 5.5,5.5 L 6.5,7.5 L 8.5,6.5"
            stroke={color}
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            animate={hovered ? { rotate: 360 } : { rotate: 0 }}
            style={{ originX: '12px', originY: '10px' }}
            transition={{ duration: 0.55, ease: 'easeInOut' }}
          />
        </svg>
      )

    // ── Circle breathes (scale pulse) ────────────────────────────
    case 'pulse':
      return (
        <svg width="24" height="20" viewBox="0 0 24 20" fill="none">
          <motion.circle
            cx="12" cy="10" r="4"
            fill={color}
            opacity={0.8}
            animate={hovered
              ? { scale: [1, 1.45, 0.9, 1.2, 1], opacity: [0.8, 0.5, 0.9, 0.65, 0.8] }
              : { scale: 1, opacity: 0.8 }
            }
            style={{ originX: '12px', originY: '10px' }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
          />
        </svg>
      )

    // ── Element shakes horizontally ──────────────────────────────
    case 'shake':
      return (
        <svg width="24" height="20" viewBox="0 0 24 20" fill="none">
          <motion.rect
            x="8" y="7" width="8" height="6" rx="2"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            animate={hovered
              ? { x: [0, -4, 4, -3, 3, -1.5, 1.5, 0] }
              : { x: 0 }
            }
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </svg>
      )

    // ── Three bars stagger in from left ──────────────────────────
    case 'cascade':
      return (
        <svg width="24" height="20" viewBox="0 0 24 20" fill="none" style={{ overflow: 'visible' }}>
          {[0, 1, 2].map(i => (
            <motion.rect
              key={i}
              x={5 + i * 6} y="8" width="4" height="5" rx="1"
              fill={color}
              animate={hovered ? { scaleY: 1, opacity: 1 } : { scaleY: 0.2, opacity: 0.25 }}
              style={{ originY: '100%', originX: `${5 + i * 6 + 2}px` }}
              transition={{ ...t, delay: hovered ? i * 0.08 : 0 }}
            />
          ))}
        </svg>
      )

    // ── Shape slides in from right ───────────────────────────────
    case 'slide':
      return (
        <svg width="24" height="20" viewBox="0 0 24 20" fill="none" style={{ overflow: 'hidden' }}>
          <motion.rect
            x="8" y="7" width="8" height="6" rx="2"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            animate={hovered ? { x: 0, opacity: 1 } : { x: 7, opacity: 0 }}
            transition={t}
          />
        </svg>
      )

    // ── Text line grows right + cursor blinks ────────────────────
    case 'typewriter':
      return (
        <svg width="24" height="20" viewBox="0 0 24 20" fill="none" style={{ overflow: 'visible' }}>
          <motion.path
            d="M 4,10 H 17"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: hovered ? 1 : 0 }}
            transition={{ duration: 0.35, ease: 'linear' }}
          />
          <motion.line
            x1="18.5" y1="7" x2="18.5" y2="13"
            stroke={color}
            strokeWidth="1.4"
            strokeLinecap="round"
            animate={hovered ? { opacity: [0, 1, 0, 1, 0, 1] } : { opacity: 0 }}
            transition={{ duration: 0.7, ease: 'linear', delay: 0.3 }}
          />
        </svg>
      )

    // ── Rect expands from center with elastic overshoot ──────────
    case 'unfold':
      return (
        <svg width="24" height="20" viewBox="0 0 24 20" fill="none">
          <motion.rect
            x="7" y="8" width="10" height="4" rx="1.5"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            animate={hovered ? { scaleX: 1, opacity: 1 } : { scaleX: 0.12, opacity: 0.35 }}
            style={{ originX: '12px', originY: '10px' }}
            transition={{ type: 'spring', stiffness: 600, damping: 11, mass: 0.5 }}
          />
        </svg>
      )

    // ── Circle squishes + stretches (liquid feel) ─────────────────
    case 'morph':
      return (
        <svg width="24" height="20" viewBox="0 0 24 20" fill="none">
          <motion.circle
            cx="12" cy="10" r="4.5"
            fill={color}
            opacity={0.75}
            animate={hovered
              ? { scaleX: [1, 1.55, 0.7, 1.25, 0.88, 1], scaleY: [1, 0.6, 1.45, 0.82, 1.12, 1] }
              : { scaleX: 1, scaleY: 1 }
            }
            style={{ originX: '12px', originY: '10px' }}
            transition={{ duration: 0.65, ease: 'easeInOut' }}
          />
        </svg>
      )

    // ── Fill sweeps left → right like a color wash ───────────────
    case 'sweep':
      return (
        <svg width="24" height="20" viewBox="0 0 24 20" fill="none" style={{ overflow: 'hidden' }}>
          <rect x="4" y="7.5" width="16" height="5" rx="1.5" fill={color} opacity={0.15} />
          <motion.rect
            x="4" y="7.5" width="16" height="5" rx="1.5"
            fill={color}
            opacity={0.75}
            animate={hovered ? { scaleX: 1 } : { scaleX: 0 }}
            style={{ originX: '4px' }}
            transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
          />
        </svg>
      )

    // ── Element fades up from below ──────────────────────────────
    case 'reveal':
    default:
      return (
        <svg width="24" height="20" viewBox="0 0 24 20" fill="none" style={{ overflow: 'visible' }}>
          <motion.rect
            x="8" y="7" width="8" height="6" rx="2"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            animate={hovered ? { y: 0, opacity: 1 } : { y: 4, opacity: 0 }}
            transition={t}
          />
        </svg>
      )
  }
}
