'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { SPRING } from '@/lib/motion'

interface CodeSheetProps {
  code: string
  title?: string
  onClose: () => void
}

export function CodeSheet({ code, title = 'Embed Code', onClose }: CodeSheetProps) {
  const [copied, setCopied] = useState(false)
  const codeRef = useRef<HTMLPreElement>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select the text
      if (codeRef.current) {
        const range = document.createRange()
        range.selectNodeContents(codeRef.current)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
      style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.36)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ ...SPRING.entrance }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 640,
            background: 'rgba(251,251,251,0.95)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: 18,
            boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.07)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'calc(100vh - 80px)',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px 12px',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CodeIcon />
              <span style={{
                fontFamily: 'var(--font-geist-sans), sans-serif',
                fontWeight: 600, fontSize: 14, color: '#111', lineHeight: '20px',
              }}>
                {title}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Copy button */}
              <motion.button
                onClick={handleCopy}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 14px',
                  borderRadius: 34,
                  background: copied ? '#00c945' : '#3f37c9',
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-geist-sans), sans-serif',
                  fontWeight: 500, fontSize: 13, color: 'white',
                  transition: 'background 0.18s',
                  lineHeight: '20px',
                }}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? 'Copied!' : 'Copy'}
              </motion.button>
              {/* Close button */}
              <button
                onClick={onClose}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.06)', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          {/* Helper text */}
          <div style={{
            padding: '10px 16px 6px',
            flexShrink: 0,
          }}>
            <p style={{
              margin: 0,
              fontFamily: 'var(--font-geist-sans), sans-serif',
              fontSize: 12, color: '#888', lineHeight: '18px',
            }}>
              Drop this snippet anywhere in your HTML. No dependencies required.
            </p>
          </div>

          {/* Code block */}
          <div style={{ flex: 1, overflow: 'auto', padding: '0 12px 12px' }}>
            <div style={{
              background: 'rgba(0,0,0,0.035)',
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.07)',
              overflow: 'auto',
            }}>
              <pre
                ref={codeRef}
                style={{
                  margin: 0,
                  padding: '14px 16px',
                  fontFamily: 'var(--font-geist-mono), "Geist Mono", "SF Mono", "Fira Code", monospace',
                  fontSize: 12,
                  lineHeight: '1.65',
                  color: '#2d2d2d',
                  whiteSpace: 'pre',
                  tabSize: 2,
                  userSelect: 'text',
                }}
              >
                {code}
              </pre>
            </div>
          </div>
        </motion.div>
      </motion.div>
    ,
    document.body,
  )
}

// ── Icons ──────────────────────────────────────────────────────

function CodeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M5 4L1 8L5 12" stroke="#3f37c9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11 4L15 8L11 12" stroke="#3f37c9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.5 2.5L6.5 13.5" stroke="#3f37c9" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="white" strokeWidth="1.4"/>
      <path d="M2 10V3C2 2.44772 2.44772 2 3 2H10" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="#666" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}
