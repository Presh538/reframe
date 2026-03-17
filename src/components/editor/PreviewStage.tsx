'use client'

import { useRef, useEffect, useCallback, useState, type DragEvent, type ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useEditorStore, selectSvgReady } from '@/lib/store/editor'
import { getPreset } from '@/lib/presets'
import { clearAnimations, computeSequenceDuration } from '@/lib/svg/animate'
import { validateSvgFile, sanitizeSvgClient, normalizeSvgElement, extractLayerInfo } from '@/lib/svg/sanitize'
import { useToast } from '@/components/ui/Toast'

const ZOOM_MIN = 0.1
const ZOOM_MAX = 1        // never scale past original 100%
const ZOOM_FACTOR = 1.08  // per scroll tick

export function PreviewStage() {
  const containerRef  = useRef<HTMLDivElement>(null)
  const canvasRef     = useRef<HTMLDivElement>(null)   // receives the CSS transform
  const sectionRef    = useRef<HTMLElement>(null)
  const svgRef        = useRef<SVGSVGElement | null>(null)
  const fileInputRef  = useRef<HTMLInputElement>(null)
  const { toast }     = useToast()

  // ── View transform (managed via DOM refs — no React re-render per frame) ──
  const view  = useRef({ zoom: 1, panX: 0, panY: 0 })
  const isPanning   = useRef(false)
  const panStart    = useRef({ x: 0, y: 0 })
  const isSpaceDown = useRef(false)

  // ── Store subscriptions ───────────────────────────────────────
  const svgSource      = useEditorStore(s => s.svgSource)
  const activePresetId = useEditorStore(s => s.activePresetId)
  const params         = useEditorStore(s => s.params)
  const isPlaying      = useEditorStore(s => s.isPlaying)
  const restartTick    = useEditorStore(s => s.restartTick)
  const svgReady       = useEditorStore(selectSvgReady)
  const viewResetTick  = useEditorStore(s => s.viewResetTick)

  const isPanMode      = useEditorStore(s => s.isPanMode)

  const setSvgSource    = useEditorStore(s => s.setSvgSource)
  const setActivePreset = useEditorStore(s => s.setActivePreset)
  const setPlaying      = useEditorStore(s => s.setPlaying)
  const setZoom         = useEditorStore(s => s.setZoom)

  const [isDragOver, setIsDragOver] = useState(false)
  const dragDepth = useRef(0)

  // Always-current refs so effects and timers avoid stale closures
  const paramsRef          = useRef(params)
  const activePresetIdRef  = useRef(activePresetId)
  const isPlayingRef       = useRef(isPlaying)
  paramsRef.current        = params
  activePresetIdRef.current = activePresetId
  isPlayingRef.current     = isPlaying

  // JS-managed loop restart — fires after the full staggered sequence ends
  const loopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearLoopTimer = useCallback(() => {
    if (loopTimerRef.current !== null) {
      clearTimeout(loopTimerRef.current)
      loopTimerRef.current = null
    }
  }, [])

  /**
   * Schedules a clean restart of the current preset once the full staggered
   * sequence has played out.  All elements restart together — no phase drift.
   * Only arms itself when loop mode is 'loop' or 'bounce'.
   */
  const scheduleLoop = useCallback(() => {
    clearLoopTimer()
    if (!svgRef.current) return
    const loop = paramsRef.current.loop
    if (loop === 'once') return

    const totalMs = computeSequenceDuration(svgRef.current)
    // 'bounce' plays forward→backward (2 CSS iterations), so wait 2× duration.
    // 'in-out' also runs 2 iterations (forward + reverse in once mode), so same rule.
    // computeSequenceDuration captures the per-element duration; we double it here.
    const direction = paramsRef.current.direction
    const waitMs = (loop === 'bounce' || direction === 'in-out') ? totalMs * 2 : totalMs

    loopTimerRef.current = setTimeout(() => {
      if (!svgRef.current || !isPlayingRef.current) return
      const presetId = activePresetIdRef.current
      if (!presetId) return
      const preset = getPreset(presetId)
      if (!preset) return

      // CSS animation restart trick — avoids the clear→unanimated-state flash.
      // Briefly set animation to 'none' on each element to reset the iteration
      // counter, force a style recalculation (not a visual repaint), then restore.
      // Since all DOM writes happen in one synchronous JS task the browser never
      // paints the intermediate 'none' state.
      const svgEl = svgRef.current
      const animEls = Array.from(svgEl.querySelectorAll<SVGElement>('[data-rf-anim]'))
      const savedAnimations = animEls.map(el => el.style.animation)
      const savedDelays     = animEls.map(el => parseFloat(el.getAttribute('data-rf-delay') ?? '0'))

      animEls.forEach(el => { el.style.animation = 'none' })
      void svgEl.getBoundingClientRect() // force layout flush to reset the animation iteration counter
      animEls.forEach((el, i) => {
        el.style.animation          = savedAnimations[i]
        el.style.animationDelay     = `${savedDelays[i]}s`
        el.style.animationPlayState = 'running'
      })

      // Arm the next loop
      scheduleLoop()
    }, waitMs)
  }, [clearLoopTimer])

  // ── Apply CSS transform directly to the canvas div ───────────
  const applyTransform = useCallback(() => {
    const el = canvasRef.current
    if (!el) return
    const { zoom, panX, panY } = view.current
    el.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`
  }, [])

  // ── Reset view when store signals it ─────────────────────────
  useEffect(() => {
    view.current = { zoom: 1, panX: 0, panY: 0 }
    applyTransform()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewResetTick])

  // ── Wheel → zoom to cursor ────────────────────────────────────
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const handler = (e: WheelEvent) => {
      // Only zoom when an SVG is loaded
      if (!svgReady) return
      e.preventDefault()

      const rect = section.getBoundingClientRect()
      // Mouse position relative to viewport centre (which is our transform origin)
      const mouseX = e.clientX - rect.left - rect.width  / 2
      const mouseY = e.clientY - rect.top  - rect.height / 2

      const { zoom, panX, panY } = view.current
      const delta    = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR
      const newZoom  = Math.min(Math.max(zoom * delta, ZOOM_MIN), ZOOM_MAX)
      const ratio    = newZoom / zoom

      view.current = {
        zoom: newZoom,
        panX: mouseX + (panX - mouseX) * ratio,
        panY: mouseY + (panY - mouseY) * ratio,
      }

      applyTransform()
      setZoom(newZoom)
    }

    section.addEventListener('wheel', handler, { passive: false })
    return () => section.removeEventListener('wheel', handler)
  }, [applyTransform, setZoom, svgReady])

  // ── isPanMode → persistent cursor ─────────────────────────────
  useEffect(() => {
    if (!sectionRef.current) return
    if (isPanMode) {
      sectionRef.current.style.cursor = 'grab'
    } else if (!isSpaceDown.current && !isPanning.current) {
      sectionRef.current.style.cursor = ''
    }
  }, [isPanMode])

  // ── Space key → pan cursor ────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' && !e.repeat &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault()
        isSpaceDown.current = true
        if (sectionRef.current) sectionRef.current.style.cursor = 'grab'
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpaceDown.current = false
        if (sectionRef.current && !isPanning.current) {
          // Keep grab cursor if pan mode is still on
          sectionRef.current.style.cursor = isPanMode ? 'grab' : ''
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPanMode])

  // ── Mouse pan ─────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!svgReady) return
    const isMiddle  = e.button === 1
    const isSpace   = isSpaceDown.current && e.button === 0
    const isPanBtn  = isPanMode && e.button === 0
    if (!isMiddle && !isSpace && !isPanBtn) return
    e.preventDefault()
    isPanning.current = true
    panStart.current  = { x: e.clientX - view.current.panX, y: e.clientY - view.current.panY }
    if (sectionRef.current) sectionRef.current.style.cursor = 'grabbing'
  }, [isPanMode])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return
    view.current.panX = e.clientX - panStart.current.x
    view.current.panY = e.clientY - panStart.current.y
    applyTransform()
  }, [applyTransform])

  const onMouseUp = useCallback(() => {
    if (!isPanning.current) return
    isPanning.current = false
    if (sectionRef.current) {
      sectionRef.current.style.cursor = (isSpaceDown.current || isPanMode) ? 'grab' : ''
    }
  }, [isPanMode, svgReady])

  // ── SVG injection ─────────────────────────────────────────────
  const injectSvg = useCallback((source: string) => {
    if (!containerRef.current) return

    // Quick structural check before touching the DOM
    const probe = new DOMParser().parseFromString(source, 'image/svg+xml')
    if (probe.querySelector('parsererror')) { toast('Could not parse SVG', 'error'); return }
    if (!probe.querySelector('svg')) { toast('No <svg> element found', 'error'); return }

    // innerHTML injection is far more reliable than DOMParser + appendChild:
    //   • <style> blocks apply correctly (same document context)
    //   • url(#id) references inside <defs> resolve without issues
    //   • No namespace adoption step that can silently drop attributes
    containerRef.current.innerHTML = source
    const svgEl = containerRef.current.querySelector('svg') as SVGSVGElement | null
    if (!svgEl) { toast('Could not render SVG', 'error'); return }

    normalizeSvgElement(svgEl)
    svgRef.current = svgEl
  }, [toast])

  // ── Apply preset ──────────────────────────────────────────────
  useEffect(() => {
    if (!svgSource || !containerRef.current) return
    injectSvg(svgSource)
    clearLoopTimer()
    if (!activePresetId) return
    const preset = getPreset(activePresetId)
    if (!preset || !svgRef.current) return
    clearAnimations(svgRef.current)
    preset.apply(svgRef.current, params)
    setPlaying(true)
    // Arm JS-managed loop restart for 'loop' and 'bounce' modes
    scheduleLoop()
    return () => { clearLoopTimer() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svgSource, activePresetId, params, injectSvg, setPlaying])

  // ── Detect animation completion (once mode only) ───────────────
  // For loop/bounce the JS timer handles restart; for 'once' we stop playback.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const check = () => {
      if (!svgRef.current) return
      if (paramsRef.current.loop !== 'once') return  // loop/bounce handled by JS timer
      const els = Array.from(svgRef.current.querySelectorAll<SVGElement>('[data-rf-anim]'))
      if (!els.length) return
      const allDone = els.every(el => el.getAnimations().every(a => a.playState === 'finished' || a.playState === 'idle'))
      if (allDone) setPlaying(false)
    }
    container.addEventListener('animationend', check)
    return () => container.removeEventListener('animationend', check)
  }, [setPlaying])

  // ── Play / pause ──────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current) return
    const els = Array.from(svgRef.current.querySelectorAll<SVGElement>('[data-rf-anim]'))
    if (isPlaying) {
      // Check if all animations have already finished (once mode — user hit play again)
      const allDone = els.length > 0 && els.every(
        el => el.getAnimations().every(a => a.playState === 'finished' || a.playState === 'idle')
      )
      if (allDone) {
        // Hard restart from frame 0
        const preset = activePresetIdRef.current ? getPreset(activePresetIdRef.current) : null
        if (preset && svgRef.current) {
          clearAnimations(svgRef.current)
          preset.apply(svgRef.current, paramsRef.current)
          scheduleLoop()
        }
      } else {
        els.forEach(el => { el.style.animationPlayState = 'running' })
        // Re-arm loop timer if it was cleared by a pause
        if (paramsRef.current.loop !== 'once' && loopTimerRef.current === null) {
          scheduleLoop()
        }
      }
    } else {
      // Pause: freeze animations and disarm the loop timer so it doesn't
      // fire and restart while the user has explicitly paused.
      clearLoopTimer()
      els.forEach(el => { el.style.animationPlayState = 'paused' })
    }
  }, [isPlaying, scheduleLoop, clearLoopTimer])

  // ── Restart button (restartTick increments) ───────────────────
  // Fires when the user presses the Restart button in BottomBar.
  // Does a full clear + re-apply so the animation always starts from frame 0,
  // even when params haven't changed (unlike the loop restart trick above).
  useEffect(() => {
    if (!restartTick || !svgRef.current || !activePresetId) return
    const preset = getPreset(activePresetId)
    if (!preset) return
    clearLoopTimer()
    clearAnimations(svgRef.current)
    preset.apply(svgRef.current, paramsRef.current)
    setPlaying(true)
    scheduleLoop()
  // restartTick intentionally omitted from dep array — effect is only needed on increment
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartTick])

  // ── File upload ───────────────────────────────────────────────

  /** Shows an info toast if the SVG contains <image> elements (raster embeds). */
  const warnIfHasImages = useCallback((svgStr: string) => {
    if (/<image[\s>]/i.test(svgStr)) {
      toast("Contains images — those layers won't animate", 'info')
    }
  }, [toast])

  const handleFile = useCallback(async (file: File) => {
    const validation = validateSvgFile(file)
    if (!validation.ok) {
      // TODO (pricing): swap this for a Pro upgrade modal once billing is live
      toast(validation.requiresPro ? '✦ Pro plan required — files over 10 MB' : validation.error!, 'error')
      return
    }
    const raw = await file.text()
    const sanitized = await sanitizeSvgClient(raw)
    try {
      const res = await fetch('/api/validate-svg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ svg: sanitized }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Validation failed', 'error'); return }
      setSvgSource(data.sanitized, file.name, data.layers)
      setActivePreset(null)
      toast(`${file.name} loaded`, 'success')
      warnIfHasImages(data.sanitized)
    } catch {
      const doc = new DOMParser().parseFromString(sanitized, 'image/svg+xml')
      const svgEl = doc.querySelector('svg') as SVGSVGElement | null
      if (svgEl) {
        normalizeSvgElement(svgEl)
        setSvgSource(sanitized, file.name, extractLayerInfo(svgEl))
        setActivePreset(null)
        toast(`${file.name} loaded`, 'success')
        warnIfHasImages(sanitized)
      }
    }
  }, [toast, setSvgSource, setActivePreset, warnIfHasImages])

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const onDragEnter = (e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    dragDepth.current++
    if (dragDepth.current === 1) setIsDragOver(true)
  }
  const onDragLeave = (e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    dragDepth.current--
    if (dragDepth.current === 0) setIsDragOver(false)
  }
  const onDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    dragDepth.current = 0
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <section
      ref={sectionRef}
      className="absolute inset-0 overflow-hidden"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onDragOver={e => e.preventDefault()}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        // Both background and outlineColor transition at the same speed — previously
        // the border snapped on/off while the background faded, creating two-speed feedback.
        transition: 'background 0.15s, outline-color 0.15s',
        background: isDragOver ? 'rgba(63,55,201,0.06)' : 'transparent',
        outline: '2px dashed',
        outlineColor: isDragOver ? 'rgba(63,55,201,0.35)' : 'transparent',
        outlineOffset: -8,
      }}
    >
      {/* ── Zoomable / pannable canvas ────────────────────────── */}
      <div
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      >
        {/* Preview container — always mounted so containerRef is never null
            when the inject useEffect fires after svgSource changes.
            With AnimatePresence mode="wait" the ref would be null during the
            empty-state exit animation, causing silent injection failures.     */}
        <div
          ref={containerRef}
          className="rf-preview-container flex items-center justify-center"
          style={{ width: '100%', height: '100%', padding: '100px 48px', overflow: 'hidden' }}
        />

        <AnimatePresence>
          {!svgReady && (
            /* Empty state — Figma 297:5830 */
            <motion.div
              key="empty"
              className="flex flex-col items-center gap-[16px] text-center cursor-pointer select-none absolute inset-0 justify-center"
              style={{ background: 'transparent' }}
              onClick={() => fileInputRef.current?.click()}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50" fill="none">
                <path d="M39.5833 20.8333H10.4167C8.11875 20.8333 6.25 22.7021 6.25 25V41.6667C6.25 43.9646 8.11875 45.8333 10.4167 45.8333H39.5833C41.8812 45.8333 43.75 43.9646 43.75 41.6667V25C43.75 22.7021 41.8812 20.8333 39.5833 20.8333ZM10.4167 12.5H39.5833V16.6667H10.4167V12.5ZM14.5833 4.16666H35.4167V8.33332H14.5833V4.16666Z" fill="#545454"/>
              </svg>

              <div className="flex flex-col gap-[8px] items-center w-full">
                <p style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontWeight: 500, fontSize: 22, lineHeight: '24px', color: '#111111' }}>
                  Drop an SVG to get started
                </p>
                <p style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontWeight: 500, fontSize: 16, lineHeight: '24px', color: '#545454' }}>
                  or click to browse
                </p>
              </div>

              <button
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                style={{
                  background: '#3f37c9', borderRadius: 74, padding: '12px 18px',
                  fontFamily: 'var(--font-geist-sans), sans-serif', fontWeight: 500,
                  fontSize: 16, lineHeight: '24px', color: 'white', whiteSpace: 'nowrap',
                  border: 'none', cursor: 'pointer', transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Upload SVG File
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".svg,image/svg+xml"
        className="hidden"
        onChange={onInputChange}
      />
    </section>
  )
}
