'use client'

import { useEditorStore } from '@/lib/store/editor'
import type { EasingType } from '@/types'

interface Props {
  onClose: () => void
}

// ── Easing definitions ─────────────────────────────────────────
interface EasingDef {
  id: EasingType
  label: string
  /** Cubic bezier [x1,y1,x2,y2] for the curve preview */
  curve: [number, number, number, number]
}

const EASINGS: EasingDef[] = [
  { id: 'linear',      label: 'Linear',       curve: [0,    0,    1,    1   ] },
  { id: 'ease-in',     label: 'Ease In',      curve: [0.42, 0,    1,    1   ] },
  { id: 'ease-in-out', label: 'Ease In Out',  curve: [0.42, 0,    0.58, 1   ] },
  { id: 'ease-out',    label: 'Ease Out',     curve: [0,    0,    0.58, 1   ] },
  { id: 'back',        label: 'Back In',      curve: [0.36, 0,    0.66, -0.56] },
  { id: 'spring',      label: 'Back In Out',  curve: [0.68, -0.6, 0.32, 1.6 ] },
  { id: 'snappy',      label: 'Back Out',     curve: [0.34, 1.56, 0.64, 1   ] },
]

export function SmoothingPanel({ onClose }: Props) {
  const easing      = useEditorStore(s => s.params.easing)
  const updateParam = useEditorStore(s => s.updateParam)

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-20" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed left-4 z-30 pointer-events-auto animate-panel-in"
        style={{ top: 92 }}
      >
        <div
          style={{
            width: 320,
            background: 'rgba(251,251,251,0.95)',
            border: '1px solid rgba(255,255,255,0.9)',
            borderRadius: 20,
            boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
            backdropFilter: 'blur(16px)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 16px 12px',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              fontFamily: 'var(--font-geist-sans), sans-serif',
              fontWeight: 600,
              fontSize: 13,
              color: '#111',
            }}
          >
            Easing
          </div>

          {/* List */}
          <div style={{ padding: '8px 8px' }}>
            {EASINGS.map(opt => {
              const active = easing === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => updateParam('easing', opt.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '8px 10px',
                    borderRadius: 12,
                    border: 'none',
                    background: active ? 'rgba(63,55,201,0.07)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => {
                    if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'
                  }}
                  onMouseLeave={e => {
                    if (!active) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {/* Left: checkmark + name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Checkmark — shown when active, invisible otherwise (preserves spacing) */}
                    <svg
                      width="14" height="14" viewBox="0 0 14 14" fill="none"
                      style={{ flexShrink: 0, opacity: active ? 1 : 0 }}
                    >
                      <path d="M2.5 7L5.5 10L11.5 4" stroke="#3f37c9" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>

                    <span style={{
                      fontFamily: 'var(--font-geist-sans), sans-serif',
                      fontWeight: active ? 600 : 500,
                      fontSize: 15,
                      color: active ? '#3f37c9' : '#111',
                      whiteSpace: 'nowrap',
                    }}>
                      {opt.label}
                    </span>
                  </div>

                  {/* Right: curve preview card */}
                  <CurveCard curve={opt.curve} active={active} />
                </button>
              )
            })}
          </div>

          {/* Footer: selected curve description */}
          <div style={{
            padding: '10px 16px 14px',
            borderTop: '1px solid rgba(0,0,0,0.06)',
            fontFamily: 'var(--font-geist-sans), sans-serif',
            fontSize: 11,
            color: '#999',
            textAlign: 'center',
          }}>
            {EASING_DESCRIPTIONS[easing] ?? ''}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Descriptions ───────────────────────────────────────────────
const EASING_DESCRIPTIONS: Partial<Record<EasingType, string>> = {
  'linear':      'Constant speed from start to finish',
  'ease-in':     'Starts slow, accelerates toward the end',
  'ease-in-out': 'Slow start and end, fast in the middle',
  'ease-out':    'Starts fast, decelerates to a smooth stop',
  'back':        'Pulls back slightly before moving forward',
  'spring':      'Anticipates and overshoots — bouncy feel',
  'snappy':      'Overshoots past the target then snaps back',
}

// ── Curve preview card ─────────────────────────────────────────
// Matches image 3: dark bg, blue endpoint dots, gray handle dots,
// control-handle lines, and a light curve path.

function CurveCard({
  curve,
  active,
}: {
  curve: [number, number, number, number]
  active: boolean
}) {
  const [x1, y1, x2, y2] = curve

  // Canvas: 72×52 with 8px padding
  const W = 72, H = 52
  const pad = 10
  const pw  = W - pad * 2   // plot width  = 52
  const ph  = H - pad * 2   // plot height = 32

  // Coordinate helpers (unit → SVG, origin = bottom-left)
  const sx = (u: number) => pad + u * pw
  const sy = (u: number) => (H - pad) - u * ph  // flip Y

  const startX = sx(0), startY = sy(0)
  const endX   = sx(1), endY   = sy(1)
  const cp1x   = sx(x1), cp1y = sy(y1)
  const cp2x   = sx(x2), cp2y = sy(y2)

  const bgColor     = active ? '#1e1b4b' : '#1a1a2e'
  const curveColor  = active ? '#c7d2fe' : '#d1d5db'
  const dotColor    = '#3b82f6'            // blue endpoints (image 3)
  const handleColor = '#6b7280'            // gray handles

  return (
    <svg
      width={W} height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{
        flexShrink: 0,
        borderRadius: 8,
        background: bgColor,
        display: 'block',
      }}
    >
      {/* Subtle grid lines */}
      <line x1={pad} y1={H/2} x2={W-pad} y2={H/2}
        stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
      <line x1={W/2} y1={pad} x2={W/2} y2={H-pad}
        stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>

      {/* Control handle lines */}
      <line x1={startX} y1={startY} x2={cp1x} y2={cp1y}
        stroke={handleColor} strokeWidth="1" opacity="0.6"/>
      <line x1={endX} y1={endY} x2={cp2x} y2={cp2y}
        stroke={handleColor} strokeWidth="1" opacity="0.6"/>

      {/* The curve */}
      <path
        d={`M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`}
        stroke={curveColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Control-handle dots (gray) */}
      <circle cx={cp1x} cy={cp1y} r="2.5" fill={handleColor} opacity="0.8"/>
      <circle cx={cp2x} cy={cp2y} r="2.5" fill={handleColor} opacity="0.8"/>

      {/* Endpoint dots (blue) */}
      <circle cx={startX} cy={startY} r="3" fill={dotColor}/>
      <circle cx={endX}   cy={endY}   r="3" fill={dotColor}/>
    </svg>
  )
}
