'use client'

import { createContext, useContext, useRef, useState, useCallback, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'

// ── Types ─────────────────────────────────────────────────────

type ToastType = 'loading' | 'success' | 'error' | 'info'

interface ToastMessage {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

// ── Icons ─────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      style={{ flexShrink: 0, animation: 'toast-spin 0.9s linear infinite' }}
    >
      <circle
        cx="6" cy="6" r="4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="16 9"
        strokeDashoffset="0"
        opacity="0.9"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M2 6.5L4.5 9L10 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M6 1L11 10.5H1L6 1Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M6 5V7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="6" cy="9.5" r="0.5" fill="currentColor" />
    </svg>
  )
}

// ── Context ───────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  // useRef keeps a stable counter that survives re-renders without causing them.
  // A module-level `let counter` would reset to 0 on hot-reload and could
  // theoretically overflow JS's safe integer range in very long sessions.
  const counterRef = useRef(0)

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++counterRef.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 2800)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Keyframe styles injected once */}
      <style>{`
        @keyframes toast-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* Toast container — sits just above the bottom bar */}
      <div
        style={{
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: 88,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          zIndex: 50,
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 10, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 440, damping: 32, mass: 0.6 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                borderRadius: 54,
                background: 'rgba(251, 251, 251, 0.60)',
                border: '1px solid rgba(255, 255, 255, 1)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: 'rgba(0, 0, 0, 0.55)',
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
                fontFamily: 'inherit',
              }}
            >
              {t.type === 'loading' && <SpinnerIcon />}
              {t.type === 'success' && <CheckIcon />}
              {t.type === 'error'   && <WarningIcon />}
              {t.type === 'info'    && null}
              <span>{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
