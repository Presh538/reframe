'use client'

import { useState, useRef, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'

interface TooltipProps {
  label: string
  /** Space-separated key tokens e.g. "⌘ K" or "H" */
  kbd?: string
  /** Suppress the tooltip entirely — use when the trigger already shows a popover */
  disabled?: boolean
  children: ReactNode
}

interface Pos { x: number; y: number }

export function Tooltip({ label, kbd, children, disabled }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos]         = useState<Pos>({ x: 0, y: 0 })
  const wrapRef  = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback(() => {
    if (disabled) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (!wrapRef.current) return
      const r = wrapRef.current.getBoundingClientRect()
      setPos({ x: r.left + r.width / 2, y: r.top })
      setVisible(true)
    }, 140)
  }, [disabled])

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }, [])

  const keys = kbd ? kbd.split(' ').filter(Boolean) : []

  return (
    <>
      <div
        ref={wrapRef}
        style={{ display: 'inline-flex', flexShrink: 0 }}
        onMouseEnter={show}
        onMouseLeave={hide}
        onMouseDown={hide}
      >
        {children}
      </div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {visible && (
            // Outer div owns the CSS centering — motion must NOT touch it
            <div
              style={{
                position:      'fixed',
                left:          pos.x,
                top:           pos.y - 10,
                transform:     'translate(-50%, -100%)',
                zIndex:        99999,
                pointerEvents: 'none',
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.88 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 560, damping: 32, mass: 0.45 }}
                style={{
                  display:              'flex',
                  alignItems:           'center',
                  gap:                  4,
                  background:           'rgba(22, 22, 24, 0.96)',
                  backdropFilter:       'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  borderRadius:         9,
                  padding:              '5px 8px',
                  whiteSpace:           'nowrap',
                  fontFamily:           'var(--font-geist-sans), sans-serif',
                  fontSize:             12,
                  fontWeight:           500,
                  lineHeight:           '16px',
                  color:                'rgba(255,255,255,0.88)',
                  boxShadow:            '0 2px 12px rgba(0,0,0,0.36), 0 0 0 0.5px rgba(255,255,255,0.08)',
                }}
              >
                {label}
                {keys.map((k, i) => (
                  <span
                    key={i}
                    style={{
                      display:        'inline-flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      minWidth:       18,
                      height:         18,
                      padding:        '0 4px',
                      background:     'rgba(255,255,255,0.12)',
                      border:         '0.5px solid rgba(255,255,255,0.16)',
                      borderRadius:   5,
                      fontSize:       11,
                      fontWeight:     600,
                      lineHeight:     '18px',
                      color:          'rgba(255,255,255,0.6)',
                      letterSpacing:  '0.01em',
                    }}
                  >
                    {k}
                  </span>
                ))}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
