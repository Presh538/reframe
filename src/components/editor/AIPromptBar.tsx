'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SPRING } from '@/lib/motion'
import { useEditorStore, liveSvgRef } from '@/lib/store/editor'
import {
  trackAiPromptSubmitted,
  trackAiPromptSucceeded,
  trackAiPromptFailed,
} from '@/lib/analytics'
import type { AnimateResponse } from '@/app/api/ai-animate/route'
import type { AnimParams } from '@/types'

// ── Types ─────────────────────────────────────────────────────

type Status = 'idle' | 'loading' | 'success' | 'error'

// ── Component ─────────────────────────────────────────────────

export function AIPromptBar({ isLight = false }: { isLight?: boolean }) {
  const [value, setValue]               = useState('')
  const [status, setStatus]             = useState<Status>('idle')
  const [explanation, setExplanation]   = useState('')
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [aiActive, setAiActive]         = useState(false)
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
  const isActive  = value.trim().length > 0
  const showAiState = aiActive || suggestionsOpen
  const aiOverlayBounds = useSvgViewportBounds(showAiState)

  useEffect(() => {
    if (!showAiState) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('[data-ai-overlay="true"]')) return

      setAiActive(false)
      setSuggestionsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [showAiState])

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
    trackAiPromptSubmitted({ promptLength: prompt.length, hasActivePreset: !!activePresetId })

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
      trackAiPromptSucceeded({ presetId: data.presetId, promptLength: prompt.length })
      setExplanation(data.explanation)
      setStatus('success')
      setTimeout(() => setStatus('idle'), 3000)

    } catch (err) {
      console.error('[AIPromptBar]', err)
      const reason = err instanceof Error ? err.message : 'Something went wrong'
      trackAiPromptFailed({ reason })
      setExplanation(reason)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <>
      <AnimatePresence>
        {showAiState && (
          <>
            <AIArtworkHighlight key="ai-highlight" bounds={aiOverlayBounds} />
            <AIHelperCard
              key="ai-helper"
              bounds={aiOverlayBounds}
              onPick={(text) => {
                setValue(text)
                setAiActive(true)
                setTimeout(() => inputRef.current?.focus(), 0)
              }}
            />
            <AISuggestions
              key="ai-suggestions"
              onPick={(text) => {
                setValue(text)
                setAiActive(true)
                setTimeout(() => inputRef.current?.focus(), 0)
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Main bar */}
      <motion.div
        data-ai-overlay="true"
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
            background: 'var(--aibar-bg)',
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
              onFocus={() => {
                setAiActive(true)
                setSuggestionsOpen(false)
              }}
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
                     : 'var(--aibar-text)',
                caretColor: '#D06523',
              }}
            />
          </div>

          {/* Send / loading button */}
          <motion.button
            onClick={isLoading ? undefined : handleSubmit}
            animate={{
              backgroundColor: isLoading
                ? 'rgba(208, 101, 35, 0.35)'
                : isActive
                  ? '#D06523'
                  : isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.10)',
            }}
            whileHover={isLoading ? {} : {
              backgroundColor: isActive ? '#E0762D' : isLight ? 'rgba(0, 0, 0, 0.14)' : 'rgba(255, 255, 255, 0.18)',
              scale: 1.06,
            }}
            whileTap={isLoading ? {} : { scale: 0.88 }}
            transition={{ backgroundColor: { duration: 0.18, ease: 'easeOut' }, scale: { type: 'spring', stiffness: 500, damping: 28 } }}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: 'none',
              cursor: isLoading ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isLoading
              ? <SpinnerIcon />
              : (
                <motion.img
                  src="/figma-icons/send-arrow.svg"
                  alt=""
                  width={20}
                  height={20}
                  animate={{ opacity: isActive ? 1 : 0.45 }}
                  transition={{ duration: 0.18 }}
                  style={{ filter: !isActive && isLight ? 'invert(1)' : 'none' }}
                />
              )
            }
          </motion.button>
        </div>
      </motion.div>
    </>
  )
}

const AI_STYLE_SUGGESTIONS = ['Playful', 'Bold', 'Soft', 'Elegant', 'Cinematic']

const AI_PROMPT_SUGGESTIONS = [
  'Make it float gently',
  'Animate like a loading spinner',
  'Make each element bounce in sequence',
  'Rotate continuously',
]

type HighlightBounds = {
  left: number
  top: number
  width: number
  height: number
}

function useSvgViewportBounds(active: boolean): HighlightBounds | null {
  const [bounds, setBounds] = useState<HighlightBounds | null>(null)

  useEffect(() => {
    if (!active) {
      setBounds(null)
      return
    }

    let frame = 0

    const measure = () => {
      const svg = liveSvgRef.current
      if (!svg) {
        setBounds(null)
        frame = requestAnimationFrame(measure)
        return
      }

      svg.style.overflow = 'hidden'

      const next = getVisibleSvgBounds(svg)
      setBounds(prev => {
        if (
          prev &&
          Math.abs(prev.left - next.left) < 0.5 &&
          Math.abs(prev.top - next.top) < 0.5 &&
          Math.abs(prev.width - next.width) < 0.5 &&
          Math.abs(prev.height - next.height) < 0.5
        ) {
          return prev
        }
        return next
      })

      frame = requestAnimationFrame(measure)
    }

    measure()
    return () => cancelAnimationFrame(frame)
  }, [active])

  return bounds
}

function getVisibleSvgBounds(svg: SVGSVGElement): HighlightBounds {
  const viewport = svg.getBoundingClientRect()
  const visibleRects = Array.from(svg.querySelectorAll<SVGGraphicsElement>('*'))
    .filter(el => isMeasurableSvgElement(el))
    .map(el => el.getBoundingClientRect())
    .map(rect => intersectRects(rect, viewport))
    .filter((rect): rect is HighlightBounds => rect !== null)

  if (visibleRects.length === 0) {
    return {
      left: viewport.left,
      top: viewport.top,
      width: viewport.width,
      height: viewport.height,
    }
  }

  const left = Math.min(...visibleRects.map(rect => rect.left))
  const top = Math.min(...visibleRects.map(rect => rect.top))
  const right = Math.max(...visibleRects.map(rect => rect.left + rect.width))
  const bottom = Math.max(...visibleRects.map(rect => rect.top + rect.height))

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  }
}

function isMeasurableSvgElement(el: SVGGraphicsElement): boolean {
  const tag = el.tagName.toLowerCase()
  if (['defs', 'clipPath', 'mask', 'pattern', 'linearGradient', 'radialGradient', 'style', 'title', 'desc', 'symbol', 'svg', 'g'].includes(tag)) {
    return false
  }

  const styles = getComputedStyle(el)
  if (styles.display === 'none' || styles.visibility === 'hidden' || styles.opacity === '0') {
    return false
  }

  const hasPaint = styles.fill !== 'none' || styles.stroke !== 'none' || tag === 'image' || tag === 'use'
  if (!hasPaint) return false

  const rect = el.getBoundingClientRect()
  return rect.width > 0.5 && rect.height > 0.5
}

function intersectRects(rect: DOMRect, clip: DOMRect): HighlightBounds | null {
  const left = Math.max(rect.left, clip.left)
  const top = Math.max(rect.top, clip.top)
  const right = Math.min(rect.right, clip.right)
  const bottom = Math.min(rect.bottom, clip.bottom)

  if (right - left <= 0.5 || bottom - top <= 0.5) return null

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  }
}

function AIArtworkHighlight({ bounds }: { bounds: HighlightBounds | null }) {
  if (!bounds) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 340, damping: 30 }}
      className="fixed pointer-events-none"
      data-ai-overlay="true"
      style={{
        left: bounds.left,
        top: bounds.top,
        zIndex: 25,
        width: bounds.width,
        height: bounds.height,
        borderRadius: 22,
        border: '1px solid #FF6043',
        boxShadow: '0 0 24px 20px rgba(208,101,35,0.06)',
        background: 'transparent',
      }}
    />
  )
}

function AIHelperCard({ bounds, onPick }: { bounds: HighlightBounds | null; onPick: (text: string) => void }) {
  const helperLeft = bounds ? bounds.left + bounds.width + 8 : undefined
  const iconTop = bounds ? bounds.top + 128 : 269
  const cardTop = bounds ? iconTop + 107 : 323

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 4 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        className="fixed z-40 pointer-events-auto"
        data-ai-overlay="true"
        style={{
          left: helperLeft ?? 'calc(62.5% + 21px)',
          top: iconTop,
          width: 46,
          height: 46,
          borderRadius: 40,
          border: '0.8px solid #FF6043',
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <AILogoMark size={18} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.98 }}
        transition={SPRING.dropdown}
        className="fixed z-40 pointer-events-auto"
        data-ai-overlay="true"
        style={{
          left: helperLeft ?? 'calc(62.5% + 21px)',
          top: cardTop,
          width: 276,
          borderRadius: 14,
          background: 'rgba(39,39,39,0.70)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          padding: 12,
          overflow: 'hidden',
        }}
      >
        <p style={{ margin: 0, width: 252, fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 14, lineHeight: '18px', fontWeight: 400, color: '#FFFFFF', letterSpacing: 0.028 }}>
          Let&apos;s add a cool animation to your design. What style do you wanna try?
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, width: 252, marginTop: 10 }}>
          {AI_STYLE_SUGGESTIONS.map(label => (
            <AIChip key={label} label={label} fontSize={14} onClick={() => onPick(`Make it feel ${label.toLowerCase()}`)} />
          ))}
        </div>
      </motion.div>
    </>
  )
}

function AISuggestions({ onPick }: { onPick: (text: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={SPRING.dropdown}
      className="absolute z-40 pointer-events-auto"
      data-ai-overlay="true"
      style={{
        left: 'calc(50% - 218px)',
        bottom: 110,
        width: 436,
      }}
    >
      <p style={{ margin: '0 0 8px', width: '100%', fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: 12, lineHeight: '15px', fontWeight: 400, color: '#FFFFFF', letterSpacing: 0.024 }}>
        AI Suggestions
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, width: '100%' }}>
        {AI_PROMPT_SUGGESTIONS.map(label => (
          <AIChip key={label} label={label} fontSize={12} onClick={() => onPick(label)} />
        ))}
      </div>
    </motion.div>
  )
}

function AIChip({ label, fontSize, onClick }: { label: string; fontSize: number; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ backgroundColor: '#1B1B1B', color: '#FFFFFF' }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      style={{
        height: fontSize === 12 ? 31 : 34,
        padding: '8px 12px',
        borderRadius: 40,
        border: 'none',
        background: '#131313',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        fontFamily: 'var(--font-geist-sans), sans-serif',
        fontSize,
        lineHeight: fontSize === 12 ? '15px' : '18px',
        fontWeight: 400,
        color: '#979797',
        letterSpacing: fontSize === 12 ? 0.024 : 0.028,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
      }}
    >
      {label}
    </motion.button>
  )
}

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
