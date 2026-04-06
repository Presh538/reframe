'use client'

/**
 * ThreeDEasingPanel — "Easing" tab for Sculpt mode.
 *
 * Shows 4 orbit-feel presets that control how the 3D model responds to
 * drag (orbitSpeed) and how much inertia it has (dampingFactor). The
 * curve preview is a rough visualisation of position-over-time after
 * releasing the drag, so users can intuit what each feel is like.
 */

import { motion, AnimatePresence } from 'motion/react'
import { ORBIT_FEELS, type ThreeDOrbitFeel } from '@/lib/presets3d'
import { useThreeDStore } from '@/lib/store/threed'

const f: React.CSSProperties = { fontFamily: 'var(--font-geist-sans), sans-serif' }

interface Props { onClose: () => void }

export function ThreeDEasingPanel({ onClose }: Props) {
  const activeId = useThreeDStore(s => {
    const { orbitSpeed, dampingFactor } = s
    return ORBIT_FEELS.find(
      f => Math.abs(f.orbitSpeed - orbitSpeed) < 0.001 &&
           Math.abs(f.dampingFactor - dampingFactor) < 0.001
    )?.id ?? null
  })
  const applyFeel = useThreeDStore(s => s.applyFeelPreset)

  const handleSelect = (feel: ThreeDOrbitFeel) => {
    applyFeel(feel)
    // Panel stays open so users can try each feel and see the difference on the model.
    // Clicking outside (the backdrop div) still closes it.
  }

  return (
    <>
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
          borderRadius: 14,
          background: 'rgba(251,251,251,0.82)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
        }}>

          {/* Panel header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px 6px' }}>
            <span style={{ ...f, fontSize: 12, fontWeight: 600, color: '#888', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Orbit Feel
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

          {/* 2×2 grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {ORBIT_FEELS.map((feel, i) => (
              <FeelCard
                key={feel.id}
                feel={feel}
                isActive={activeId === feel.id}
                onSelect={handleSelect}
                index={i}
              />
            ))}
          </div>

          {/* Footer hint */}
          <p style={{
            ...f, fontSize: 10, color: '#ccc',
            textAlign: 'center', padding: '8px 0 2px', margin: 0,
          }}>
            Controls how the model responds to drag rotation
          </p>
        </div>
      </motion.div>
    </>
  )
}

// ── Feel card ─────────────────────────────────────────────────────

function FeelCard({
  feel, isActive, onSelect, index,
}: {
  feel:     ThreeDOrbitFeel
  isActive: boolean
  onSelect: (f: ThreeDOrbitFeel) => void
  index:    number
}) {
  const accent = isActive ? '#3f37c9' : '#afafaf'

  return (
    <motion.button
      onClick={() => onSelect(feel)}
      initial={{ opacity: 0, y: 6, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1    }}
      transition={{ type: 'spring', stiffness: 480, damping: 30, delay: index * 0.04 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 8,
        padding: '10px 12px 10px',
        borderRadius: 10,
        border: isActive ? '1.5px solid rgba(63,55,201,0.4)' : '1.5px solid rgba(0,0,0,0.06)',
        background: isActive ? 'rgba(63,55,201,0.06)' : 'rgba(255,255,255,0.55)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.15s, border 0.15s',
      }}
    >
      {/* Curve preview */}
      <svg width="44" height="28" viewBox="0 0 44 28" fill="none" style={{ flexShrink: 0 }}>
        {/* Baseline */}
        <line x1="2" y1="26" x2="42" y2="26" stroke="rgba(0,0,0,0.07)" strokeWidth="1"/>
        {/* Feel curve */}
        <path d={feel.curvePath} stroke={accent} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
        {/* Speed dots — higher speed = dots closer together */}
        {[0, 1, 2].map(i => (
          <circle
            key={i}
            cx={2 + i * (8 - (feel.orbitSpeed - 0.55) * 4)}
            cy={4}
            r="1.5"
            fill={accent}
            opacity={0.5 - i * 0.12}
          />
        ))}
      </svg>

      {/* Labels */}
      <div>
        <p style={{
          ...f, fontSize: 13, fontWeight: 600, lineHeight: '18px',
          color: isActive ? '#3f37c9' : '#222',
          margin: 0,
        }}>
          {feel.name}
        </p>
        <p style={{
          ...f, fontSize: 11, lineHeight: '16px',
          color: '#aaa', margin: 0, marginTop: 1,
        }}>
          {feel.description}
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
              position: 'absolute', top: 8, right: 8,
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
