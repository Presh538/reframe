'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { clsx } from 'clsx'

// ── Types ─────────────────────────────────────────────────────

type ToastType = 'info' | 'success' | 'error'

interface ToastMessage {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

// ── Context ───────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  let counter = 0

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++counter
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 2800)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50 pointer-events-none" style={{ bottom: 88 }}>
        {toasts.map(t => (
          <div
            key={t.id}
            className={clsx(
              'px-4 py-2.5 rounded-lg text-[12px] font-medium border whitespace-nowrap',
              'animate-slide-up shadow-lg backdrop-blur-sm',
              'bg-surface-2/95 text-[var(--text)]',
              t.type === 'success' && 'border-success/40',
              t.type === 'error'   && 'border-danger/40',
              t.type === 'info'    && 'border-border'
            )}
          >
            {t.type === 'success' && <span className="mr-1.5 text-success">✓</span>}
            {t.type === 'error'   && <span className="mr-1.5 text-danger">✕</span>}
            {t.message}
          </div>
        ))}
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
