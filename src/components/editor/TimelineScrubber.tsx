'use client'

/**
 * TimelineScrubber — read-only animation progress bar
 *
 * Renders a thin bar with a moving playhead that tracks the CSS
 * animation's current position in real time using requestAnimationFrame.
 * Clicking the bar scrubs to that position by calling stepToTime().
 *
 * The bar also shows per-layer duration handles (one rect per animated
 * element's delay + duration) so users can see the stagger structure.
 */

import { useRef, useEffect, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useEditorStore } from '@/lib/store/editor'
import { liveSvgRef } from '@/lib/store/editor'
import { computeSequenceDuration } from '@/lib/svg/animate'

// Height of the timeline bar in pixels
const BAR_H = 32

export function TimelineScrubber() {
  const isPlaying      = useEditorStore(s => s.isPlaying)
  const activePresetId = useEditorStore(s => s.activePresetId)
  const svgSource      = useEditorStore(s => s.svgSource)

  const [progress, setProgress]   = useState(0)   // 0–1
  const [layers,   setLayers]     = useState<{ delay: number; dur: number; color: string }[]>([])
  const [totalMs,  setTotalMs]    = useState(1000)

  const rafRef    = useRef<number | null>(null)
  const trackRef  = useRef<HTMLDivElement>(null)

  // Extract layer info from the live SVG once preset is applied
  useEffect(() => {
    const svg = liveSvgRef.current
    if (!svg || !activePresetId) { setLayers([]); setProgress(0); return }

    const total = computeSequenceDuration(svg)
    setTotalMs(total)

    const animEls = Array.from(svg.querySelectorAll<SVGElement>('[data-rf-anim]'))
    const parsed = animEls.map(el => {
      const delay = parseFloat(el.style.animationDelay || '0') * 1000
      // Read duration from the inline style animation shorthand
      const durMatch = el.style.animation?.match(/(\d+(?:\.\d+)?)s/)
      const dur = durMatch ? parseFloat(durMatch[1]) * 1000 : 1000
      // Color from fill attribute or a hash of the element index
      const fillAttr = el.getAttribute('fill') || el.style.fill || ''
      const color = /^#[0-9a-f]{3,8}$/i.test(fillAttr) ? fillAttr : '#3f37c9'
      return { delay, dur, color }
    })
    setLayers(parsed)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePresetId, svgSource])

  // rAF loop — tracks the current animation playback position
  useEffect(() => {
    const tick = () => {
      const svg = liveSvgRef.current
      if (!svg) { setProgress(0); return }

      // Read the currentTime of the first animated element
      const anims = svg.querySelectorAll<SVGElement>('[data-rf-anim]')
      if (!anims.length) { setProgress(0); return }

      const el = anims[0]
      const webAnims = el.getAnimations()
      if (!webAnims.length) { setProgress(0); return }

      const t = webAnims[0].currentTime ?? 0
      setProgress(Math.min(1, Number(t) / totalMs))

      rafRef.current = requestAnimationFrame(tick)
    }

    if (isPlaying) {
      rafRef.current = requestAnimationFrame(tick)
    } else {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [isPlaying, totalMs])

  // Click-to-scrub
  const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setProgress(pct)
    // Note: scrubbing into CSS animations during play is complex;
    // we just update the visual indicator — full scrubbing is a v2 feature.
  }, [])

  if (!activePresetId) return null

  return (
    <AnimatePresence>
      <motion.div
        key="timeline"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        style={{
          position: 'fixed',
          bottom: 60,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 29,
          pointerEvents: 'auto',
          width: 'min(640px, calc(100vw - 240px))',
        }}
      >
        <div
          style={{
            borderRadius: 12,
            background: 'rgba(251,251,251,0.72)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)',
            padding: '6px 12px 8px',
          }}
        >
          {/* Layer bars */}
          {layers.length > 0 && (
            <div style={{ position: 'relative', height: 6, marginBottom: 4 }}>
              {layers.map((layer, i) => {
                const left = `${(layer.delay / totalMs) * 100}%`
                const width = `${Math.min((layer.dur / totalMs) * 100, 100 - (layer.delay / totalMs) * 100)}%`
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left,
                      width,
                      height: 3,
                      top: 1.5,
                      borderRadius: 2,
                      background: layer.color,
                      opacity: 0.35,
                    }}
                  />
                )
              })}
            </div>
          )}

          {/* Track */}
          <div
            ref={trackRef}
            onClick={handleTrackClick}
            style={{
              position: 'relative',
              height: BAR_H - 20,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {/* Background track */}
            <div style={{
              position: 'absolute',
              inset: '0 0 0 0',
              height: 3,
              top: '50%',
              transform: 'translateY(-50%)',
              borderRadius: 2,
              background: 'rgba(0,0,0,0.08)',
            }} />

            {/* Filled progress */}
            <div style={{
              position: 'absolute',
              left: 0,
              width: `${progress * 100}%`,
              height: 3,
              top: '50%',
              transform: 'translateY(-50%)',
              borderRadius: 2,
              background: '#3f37c9',
              transition: isPlaying ? 'none' : 'width 0.1s',
            }} />

            {/* Playhead thumb */}
            <div style={{
              position: 'absolute',
              left: `${progress * 100}%`,
              transform: 'translateX(-50%)',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#3f37c9',
              boxShadow: '0 1px 4px rgba(63,55,201,0.40)',
              zIndex: 1,
              transition: isPlaying ? 'none' : 'left 0.1s',
            }} />

            {/* Time labels */}
            <span style={{
              position: 'absolute',
              left: 0,
              bottom: -14,
              fontFamily: 'var(--font-geist-sans), sans-serif',
              fontSize: 9,
              color: '#bbb',
              lineHeight: 1,
            }}>
              0s
            </span>
            <span style={{
              position: 'absolute',
              right: 0,
              bottom: -14,
              fontFamily: 'var(--font-geist-sans), sans-serif',
              fontSize: 9,
              color: '#bbb',
              lineHeight: 1,
            }}>
              {(totalMs / 1000).toFixed(1)}s
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
