'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface ShortcutRow {
  keys: string[]
  label: string
}

const SHORTCUTS: { group: string; rows: ShortcutRow[] }[] = [
  {
    group: 'Playback',
    rows: [
      { keys: ['Space'],      label: 'Play / Pause' },
      { keys: ['R'],          label: 'Restart animation' },
      { keys: ['['],          label: 'Decrease speed' },
      { keys: [']'],          label: 'Increase speed' },
    ],
  },
  {
    group: 'Canvas',
    rows: [
      { keys: ['H'],          label: 'Toggle pan mode' },
      { keys: ['Scroll'],     label: 'Zoom in / out' },
      { keys: ['0'],          label: 'Reset zoom & pan' },
    ],
  },
  {
    group: 'Edit',
    rows: [
      { keys: ['⌘', 'Z'],    label: 'Undo' },
      { keys: ['⌘', '⇧', 'Z'], label: 'Redo' },
    ],
  },
  {
    group: 'App',
    rows: [
      { keys: ['1'],          label: 'Switch to Flow mode' },
      { keys: ['2'],          label: 'Switch to Sculpt mode' },
      { keys: ['?'],          label: 'Toggle this overlay' },
    ],
  },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function KeyboardShortcutsOverlay({ open, onClose }: Props) {
  // Close on Escape or ? again
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="shortcuts-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.32)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={e => e.stopPropagation()}
            style={{
              background: 'rgba(251,251,251,0.96)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRadius: 20,
              boxShadow: '0 24px 80px rgba(0,0,0,0.20), 0 0 0 1px rgba(0,0,0,0.06)',
              padding: '28px 32px',
              minWidth: 360,
              maxWidth: 440,
              fontFamily: 'var(--font-geist-sans), sans-serif',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111', lineHeight: '22px' }}>
                  Keyboard Shortcuts
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888', lineHeight: '18px' }}>
                  Press ? to open / close
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 30, height: 30, borderRadius: '50%', border: 'none',
                  background: 'rgba(0,0,0,0.07)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.13)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.07)')}
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1L13 13M13 1L1 13" stroke="#555" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Groups */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 28px' }}>
              {SHORTCUTS.map(group => (
                <div key={group.group}>
                  <p style={{
                    margin: '0 0 8px',
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#afafaf',
                  }}>
                    {group.group}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {group.rows.map((row, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 12, color: '#555', lineHeight: '18px' }}>
                          {row.label}
                        </span>
                        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                          {row.keys.map((k, ki) => (
                            <kbd key={ki} style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              minWidth: 22, height: 22, padding: '0 5px',
                              borderRadius: 5,
                              background: 'white',
                              border: '1px solid rgba(0,0,0,0.12)',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                              fontSize: 11,
                              fontWeight: 500,
                              color: '#333',
                              fontFamily: 'var(--font-geist-mono, monospace)',
                              lineHeight: 1,
                            }}>
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
