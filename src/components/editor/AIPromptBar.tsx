'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SPRING } from '@/lib/motion'
import { useEditorStore } from '@/lib/store/editor'
import type { AnimateResponse } from '@/app/api/ai-animate/route'
import type { AnimParams } from '@/types'

// ── Types ─────────────────────────────────────────────────────

type Status = 'idle' | 'loading' | 'success' | 'error'

// ── Component ─────────────────────────────────────────────────

export function AIPromptBar() {
  const [value, setValue]               = useState('')
  const [status, setStatus]             = useState<Status>('idle')
  const [explanation, setExplanation]   = useState('')
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Store selectors
  const activePresetId  = useEditorStore(s => s.activePresetId)
  const params          = useEditorStore(s => s.params)
  const svgLayers       = useEditorStore(s => s.svgLayers)
  const svgFileName     = useEditorStore(s => s.svgFileName)
  const setActivePreset = useEditorStore(s => s.setActivePreset)
  const updateParam     = useEditorStore(s => s.updateParam)
  const restartAnimation = useEditorStore(s => s.restartAnimation)
  const setPlaying      = useEditorStore(s => s.setPlaying)

  const isLoading = status === 'loading'

  // ── Submit ───────────────────────────────────────────────────

  const handleSubmit = async () => {
    const prompt = value.trim()

    // Empty input → toggle suggestions panel
    if (!prompt) {
      setSuggestionsOpen(open => !open)
      return
    }

    setSuggestionsOpen(false)
    setStatus('loading')
    setValue('')

    try {
      const res = await fetch('/api/ai-animate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          context: {
            currentPresetId: activePresetId,
            currentParams: params,
            svgLayers: svgLayers
              ? { groups: svgLayers.groups, paths: svgLayers.paths, total: svgLayers.total }
              : null,
            svgFileName: svgFileName || '',
          },
        }),
      })

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(error || `HTTP ${res.status}`)
      }

      const data: AnimateResponse = await res.json()

      // Apply preset
      setActivePreset(data.presetId)

      // Apply each param individually
      const paramKeys = Object.keys(data.params) as (keyof AnimParams)[]
      for (const key of paramKeys) {
        updateParam(key, data.params[key] as never)
      }

      // Restart + play so the user sees the result immediately
      restartAnimation()
      setPlaying(true)

      // Show explanation briefly
      setExplanation(data.explanation)
      setStatus('success')
      setTimeout(() => setStatus('idle'), 3000)

    } catch (err) {
      console.error('[AIPromptBar]', err)
      setExplanation(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <>
      {/* Suggestions backdrop */}
      {suggestionsOpen && (
        <button
          aria-label="Close smart suggestions"
          onClick={() => setSuggestionsOpen(false)}
          className="fixed inset-0 z-20 cursor-default"
          style={{ background: 'transparent', border: 'none' }}
        />
      )}

      {/* Suggestions panel */}
      <AnimatePresence>
        {suggestionsOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={SPRING.dropdown}
            className="absolute z-40 pointer-events-auto"
            style={{
              left: 'calc(50% - 141px)',
              bottom: 'calc(50px + 54px + 8px)',
              width: 283,
              borderRadius: 14,
              background: 'rgba(39,39,39,0.70)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              padding: 12,
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 18, marginBottom: 6 }}>
              <AILogoMark size={18} />
              <span style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 14, fontWeight: 400, color: '#979797', letterSpacing: 0.028 }}>
                Try asking…
              </span>
            </div>
            <div style={{ display: 'grid', gap: 4 }}>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => {
                    setValue(s)
                    setSuggestionsOpen(false)
                    setTimeout(() => inputRef.current?.focus(), 0)
                  }}
                  style={{
                    height: 34,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '0 8px',
                    border: 'none',
                    borderRadius: 8,
                    background: 'transparent',
                    cursor: 'pointer',
                    color: '#FFFFFF',
                    width: '100%',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <img src="/figma-icons/keyframes.svg" alt="" width={16} height={16} style={{ flexShrink: 0, opacity: 0.6 }} />
                  <span style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 13, fontWeight: 400, letterSpacing: 0.02 }}>
                    {s}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main bar */}
      <motion.div
        className="absolute bottom-[50px] left-1/2 z-30 pointer-events-auto"
        initial={{ opacity: 0, scale: 0.96, x: '-50%', y: 8 }}
        animate={{ opacity: 1, scale: 1, x: '-50%', y: 0 }}
        transition={{ ...SPRING.entrance, delay: 0.06 }}
        style={{
          borderRadius: 999,
          padding: '1px',
          background: 'linear-gradient(90deg, #FF5C35 0%, #D44FD8 50%, #5B4BF5 100%)',
        }}
      >
        <div
          className="flex items-center gap-[6px] pl-[14px] pr-[8px] py-[8px]"
          style={{
            borderRadius: 999,
            background: '#1B1B1B',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            width: 436,
          }}
        >
          {/* Logo */}
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            <AILogoMark size={20} />
          </div>

          {/* Input / status */}
          <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            <input
              ref={inputRef}
              className="ai-prompt-input"
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !isLoading) handleSubmit() }}
              placeholder={
                status === 'loading' ? 'Applying…'
                : status === 'success' ? explanation
                : status === 'error'   ? explanation
                : 'Refine your animation…'
              }
              disabled={isLoading}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: 'var(--font-geist-sans), sans-serif',
                fontSize: 14,
                fontWeight: 400,
                color: status === 'error' ? '#F87171'
                     : status === 'success' ? '#F97316'
                     : '#CCCCCC',
                caretColor: '#D06523',
              }}
            />
          </div>

          {/* Send / loading button */}
          <motion.button
            onClick={isLoading ? undefined : handleSubmit}
            whileHover={isLoading ? {} : { scale: 1.06, backgroundColor: '#E0762D' }}
            whileTap={isLoading ? {} : { scale: 0.88 }}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: isLoading ? 'rgba(208,101,35,0.4)' : '#D06523',
              border: 'none',
              cursor: isLoading ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
          >
            {isLoading ? <SpinnerIcon /> : <img src="/figma-icons/send-arrow.svg" alt="" width={20} height={20} />}
          </motion.button>
        </div>
      </motion.div>
    </>
  )
}

// ── Suggestions ───────────────────────────────────────────────

const SUGGESTIONS = [
  'Make it bounce in slowly',
  'Loop it continuously',
  'Draw the paths one by one',
  'Make it feel snappy and fast',
]

// ── Spinner ───────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 16 16" fill="none"
      style={{ animation: 'ai-spin 0.8s linear infinite', flexShrink: 0 }}
    >
      <style>{`@keyframes ai-spin { to { transform: rotate(360deg) } }`}</style>
      <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="2" strokeLinecap="round"
        strokeDasharray="24 12" />
    </svg>
  )
}

// ── Logo mark ─────────────────────────────────────────────────

function AILogoMark({ size = 20 }: { size?: number }) {
  return <img src="/figma-icons/ai-logo.svg" alt="" width={size} height={size} style={{ flexShrink: 0 }} />
}
