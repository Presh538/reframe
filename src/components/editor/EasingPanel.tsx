'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { useEditorStore } from '@/lib/store/editor'
import type { EasingType } from '@/types'

// Maps each easing to a motion-compatible cubic-bezier array
// (cx is always linear; cy uses this to trace the actual curve)
const MOTION_EASE: Record<EasingType, string | number[]> = {
  'linear':      'linear',
  'ease':        [0.25, 0.1, 0.25, 1],
  'ease-in':     [0.42, 0, 1, 1],
  'ease-out':    [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
  'spring':      [0.34, 1.56, 0.64, 1],
  'back':        [0.36, 0, 0.66, -0.56],
  'snappy':      [0.2, 0, 0, 1],
}

interface EasingPanelProps {
  onClose: () => void
}

// ── Easing definitions ───────────────────────────────────────────

interface EasingDef {
  id: EasingType
  name: string
  description: string
  // SVG cubic-bezier path in a 28×20 canvas (time→x, value→y, y-inverted)
  path: string
}

const EASING_GROUPS: { label: string; items: EasingDef[] }[] = [
  {
    label: 'Standard',
    items: [
      {
        id: 'linear',
        name: 'Linear',
        description: 'Constant speed — no acceleration',
        path: 'M 2,18 L 26,2',
      },
      {
        id: 'ease',
        name: 'Ease',
        description: 'Gentle start and end',
        path: 'M 2,18 C 8,16 8,2 26,2',
      },
      {
        id: 'ease-in',
        name: 'Ease In',
        description: 'Slow start, fast finish',
        path: 'M 2,18 C 12,18 26,2 26,2',
      },
      {
        id: 'ease-out',
        name: 'Ease Out',
        description: 'Fast start, slow finish',
        path: 'M 2,18 C 2,18 16,2 26,2',
      },
      {
        id: 'ease-in-out',
        name: 'Ease In Out',
        description: 'Accelerates then decelerates',
        path: 'M 2,18 C 12,18 16,2 26,2',
      },
    ],
  },
  {
    label: 'Expressive',
    items: [
      {
        id: 'spring',
        name: 'Spring',
        description: 'Overshoots the target then settles',
        path: 'M 2,18 C 10,-7 17,2 26,2',
      },
      {
        id: 'back',
        name: 'Back',
        description: 'Pulls back before launching forward',
        path: 'M 2,18 C 11,18 18,27 26,2',
      },
      {
        id: 'snappy',
        name: 'Snappy',
        description: 'Instant start, long smooth tail',
        path: 'M 2,18 C 7,18 2,2 26,2',
      },
    ],
  },
]

const PANEL_HEIGHT = 480

const f: React.CSSProperties = {
  fontFamily: 'var(--font-geist-sans), sans-serif',
}

export function EasingPanel({ onClose }: EasingPanelProps) {
  const easing      = useEditorStore(s => s.params.easing)
  const updateParam = useEditorStore(s => s.updateParam)

  const handleSelect = (id: EasingType) => {
    updateParam('easing', id)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-20" onClick={onClose} />

      {/* Panel */}
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

          {/* Header */}
          <div style={{
            flexShrink: 0,
            padding: '6px 8px 0',
          }}>
            <p style={{
              ...f,
              fontSize: 13,
              fontWeight: 500,
              color: '#111',
              margin: 0,
              lineHeight: '20px',
            }}>
              Easing
            </p>
            <p style={{
              ...f,
              fontSize: 11,
              fontWeight: 400,
              color: '#afafaf',
              margin: '2px 0 0',
              lineHeight: '16px',
            }}>
              Controls how the animation accelerates over time
            </p>
          </div>

          {/* Divider */}
          <div style={{ flexShrink: 0, height: 1, background: 'rgba(0,0,0,0.06)', margin: '0 4px' }} />

          {/* Scrollable list */}
          <div
            className="scrollbar-thin"
            style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
          >
            {EASING_GROUPS.map(group => (
              <Group
                key={group.label}
                label={group.label}
                items={group.items}
                activeId={easing}
                onSelect={handleSelect}
              />
            ))}
          </div>

        </div>
      </motion.div>
    </>
  )
}

// ── Group ────────────────────────────────────────────────────────

function Group({
  label, items, activeId, onSelect,
}: {
  label: string
  items: EasingDef[]
  activeId: EasingType
  onSelect: (id: EasingType) => void
}) {
  return (
    <div style={{ marginBottom: 4 }}>
      <p style={{
        ...f,
        fontSize: 11,
        fontWeight: 400,
        lineHeight: '16px',
        color: '#afafaf',
        padding: '6px 8px 2px',
        margin: 0,
      }}>
        {label}
      </p>
      {items.map(item => (
        <Row
          key={item.id}
          item={item}
          isActive={activeId === item.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

// ── Row ──────────────────────────────────────────────────────────

function Row({
  item,
  isActive,
  onSelect,
}: {
  item: EasingDef
  isActive: boolean
  onSelect: (id: EasingType) => void
}) {
  const [hovered, setHovered] = useState(false)
  const color = isActive ? '#3f37c9' : '#999'

  return (
    <motion.button
      initial="rest"
      whileHover="hover"
      onClick={() => onSelect(item.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 8px',
        borderRadius: 8,
        border: 'none',
        background: isActive ? 'rgba(63,55,201,0.08)' : hovered ? 'rgba(0,0,0,0.04)' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.1s',
      }}
    >
      {/* Bezier curve preview — dot travels the curve on hover */}
      <span style={{
        width: 36,
        height: 28,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isActive ? 'rgba(63,55,201,0.07)' : 'rgba(0,0,0,0.04)',
        borderRadius: 6,
        transition: 'background 0.1s',
      }}>
        <svg width="28" height="20" viewBox="0 0 28 20" fill="none" style={{ overflow: 'visible' }}>
          {/* Grid lines */}
          <line x1="2" y1="18" x2="26" y2="18" stroke={isActive ? 'rgba(63,55,201,0.12)' : 'rgba(0,0,0,0.08)'} strokeWidth="0.75"/>
          <line x1="2" y1="2"  x2="26" y2="2"  stroke={isActive ? 'rgba(63,55,201,0.12)' : 'rgba(0,0,0,0.08)'} strokeWidth="0.75"/>
          {/* Static curve */}
          <path
            d={item.path}
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Static endpoint dots */}
          <circle cx="2"  cy="18" r="1.5" fill={color} />
          <circle cx="26" cy="2"  r="1.5" fill={color} />
          {/* Traveling dot — cx linear, cy uses the actual easing */}
          <motion.circle
            r={2}
            fill={isActive ? '#3f37c9' : '#555'}
            initial={{ cx: 2, cy: 18 }}
            animate={hovered ? { cx: 26, cy: 2 } : { cx: 2, cy: 18 }}
            transition={{
              cx: { duration: 0.7, ease: 'linear',               delay: hovered ? 0 : 0 },
              cy: { duration: 0.7, ease: MOTION_EASE[item.id] as never, delay: hovered ? 0 : 0 },
            }}
          />
        </svg>
      </span>

      {/* Text */}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          ...f,
          display: 'block',
          fontWeight: isActive ? 500 : 400,
          fontSize: 13,
          lineHeight: '20px',
          color: isActive ? '#111' : '#3d3d3d',
        }}>
          {item.name}
        </span>
        <span style={{
          ...f,
          display: 'block',
          fontSize: 11,
          lineHeight: '16px',
          color: isActive ? 'rgba(63,55,201,0.7)' : '#aaa',
        }}>
          {item.description}
        </span>
      </span>
    </motion.button>
  )
}
