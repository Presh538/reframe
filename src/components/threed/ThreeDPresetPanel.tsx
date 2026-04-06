'use client'

/**
 * ThreeDPresetPanel — "Presets" tab for Sculpt mode.
 *
 * Shows curated look presets (material + depth + light) grouped into
 * Clean / Bold / Glam categories. Selecting one writes to useThreeDStore
 * so ThreeDMode's SceneRenderer reacts instantly.
 */

import { motion, AnimatePresence } from 'motion/react'
import {
  LOOK_PRESETS, LOOK_CATEGORIES, getPresetsByLookCategory,
  type ThreeDPreset, type LookCategory,
} from '@/lib/presets3d'
import { useThreeDStore } from '@/lib/store/threed'

const f: React.CSSProperties = { fontFamily: 'var(--font-geist-sans), sans-serif' }

interface Props { onClose: () => void }

export function ThreeDPresetPanel({ onClose }: Props) {
  const activeId      = useThreeDStore(s => {
    // Identify active preset by matching all three values
    const { material, depth, light } = s
    return LOOK_PRESETS.find(p => p.material === material && p.depth === depth && p.light === light)?.id ?? null
  })
  const applyPreset = useThreeDStore(s => s.applyLookPreset)

  const handleSelect = (preset: ThreeDPreset) => {
    applyPreset(preset)
    // Panel stays open so users can see the effect on the object and browse other presets.
  }

  return (
    <>
      {/* Backdrop — click outside closes */}
      <div className="fixed inset-0 z-20" onClick={onClose} />

      <motion.div
        className="fixed left-1/2 z-30"
        style={{ top: 76, translateX: '-50%' }}
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.97, y: -6  }}
        transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
      >
        <div style={{
          width: 396,
          padding: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          borderRadius: 14,
          background: 'rgba(251,251,251,0.82)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
        }}>

          {/* Panel header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px 2px' }}>
            <span style={{ ...f, fontSize: 12, fontWeight: 600, color: '#888', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Style Presets
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '50%',
                width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0, transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.12)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
              aria-label="Close"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="#888" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {LOOK_CATEGORIES.map((cat, ci) => (
            <CategoryGroup
              key={cat}
              category={cat}
              activeId={activeId}
              onSelect={handleSelect}
              startIndex={ci * 3}
            />
          ))}

        </div>
      </motion.div>
    </>
  )
}

// ── Category group ────────────────────────────────────────────────

function CategoryGroup({
  category, activeId, onSelect, startIndex,
}: {
  category:   LookCategory
  activeId:   string | null
  onSelect:   (p: ThreeDPreset) => void
  startIndex: number
}) {
  const presets = getPresetsByLookCategory(category)

  return (
    <div style={{ marginBottom: 2 }}>
      {/* Category label */}
      <motion.p
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30, delay: startIndex * 0.03 }}
        style={{ ...f, fontSize: 11, fontWeight: 400, color: '#afafaf', padding: '6px 8px 4px', margin: 0 }}
      >
        {category}
      </motion.p>

      {/* 3-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
        {presets.map((preset, i) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            isActive={activeId === preset.id}
            onSelect={onSelect}
            index={startIndex + i}
          />
        ))}
      </div>
    </div>
  )
}

// ── Preset card ───────────────────────────────────────────────────

function PresetCard({
  preset, isActive, onSelect, index,
}: {
  preset:   ThreeDPreset
  isActive: boolean
  onSelect: (p: ThreeDPreset) => void
  index:    number
}) {
  return (
    <motion.button
      onClick={() => onSelect(preset)}
      initial={{ opacity: 0, y: 6, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1    }}
      transition={{ type: 'spring', stiffness: 480, damping: 30, delay: index * 0.03 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 6,
        padding: '10px 10px 8px',
        borderRadius: 10,
        border: isActive ? '1.5px solid rgba(63,55,201,0.4)' : '1.5px solid rgba(0,0,0,0.06)',
        background: isActive ? 'rgba(63,55,201,0.06)' : 'rgba(255,255,255,0.55)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.15s, border 0.15s',
      }}
    >
      {/* Visual thumbnail */}
      <PresetThumb preset={preset} isActive={isActive} />

      {/* Labels */}
      <div>
        <p style={{
          ...f, fontSize: 12, fontWeight: 600, lineHeight: '16px',
          color: isActive ? '#3f37c9' : '#222',
          margin: 0,
        }}>
          {preset.name}
        </p>
        <p style={{
          ...f, fontSize: 10, lineHeight: '14px',
          color: '#aaa', margin: 0, marginTop: 1,
        }}>
          {preset.description}
        </p>
      </div>

      {/* Active check */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            key="check"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            style={{
              position: 'absolute', top: 7, right: 7,
              width: 14, height: 14,
              borderRadius: '50%',
              background: '#3f37c9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// ── Thumbnail — small 3D visual showing depth + material feel ─────

function PresetThumb({ preset, isActive }: { preset: ThreeDPreset; isActive: boolean }) {
  const accent = isActive ? '#3f37c9' : '#545454'
  // Depth bar: normalise depth 6-80 → 10-36px
  const depthW = 10 + ((preset.depth - 6) / (80 - 6)) * 26
  // Light circle: normalise light 0.3-2 → 4-14px
  const lightR = 4 + ((preset.light - 0.3) / (2 - 0.3)) * 10

  return (
    <div style={{
      width: '100%', height: 46,
      borderRadius: 6,
      background: 'rgba(0,0,0,0.04)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Isometric cube that encodes depth */}
      <svg width="44" height="38" viewBox="0 0 44 38" fill="none">
        {preset.material === 'glass' ? (
          // Glass: outlined faces
          <>
            {/* Top face */}
            <path d="M22 4 L40 13 L22 22 L4 13 Z"
              fill="rgba(63,55,201,0.08)" stroke={accent} strokeWidth="1.2"/>
            {/* Left face */}
            <path d={`M4 13 L4 ${13 + depthW * 0.55} L22 ${22 + depthW * 0.55} L22 22 Z`}
              fill="rgba(63,55,201,0.05)" stroke={accent} strokeWidth="1.2"/>
            {/* Right face */}
            <path d={`M40 13 L40 ${13 + depthW * 0.55} L22 ${22 + depthW * 0.55} L22 22 Z`}
              fill="rgba(63,55,201,0.1)" stroke={accent} strokeWidth="1.2"/>
          </>
        ) : (
          // Flat: filled faces with tonal contrast
          <>
            <path d="M22 4 L40 13 L22 22 L4 13 Z" fill={accent} opacity="0.75"/>
            <path d={`M4 13 L4 ${13 + depthW * 0.55} L22 ${22 + depthW * 0.55} L22 22 Z`}
              fill={accent} opacity="0.35"/>
            <path d={`M40 13 L40 ${13 + depthW * 0.55} L22 ${22 + depthW * 0.55} L22 22 Z`}
              fill={accent} opacity="0.55"/>
          </>
        )}
      </svg>

      {/* Light intensity dot */}
      <div style={{
        width: lightR, height: lightR,
        borderRadius: '50%',
        background: isActive ? '#3f37c9' : '#c8c8d0',
        opacity: 0.7,
        flexShrink: 0,
      }} />
    </div>
  )
}
