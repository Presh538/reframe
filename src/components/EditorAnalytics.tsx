'use client'

/**
 * EditorAnalytics — headless store observer.
 *
 * Mounts inside the editor layout. Watches the Zustand store and fires
 * PostHog events when key state changes. No UI rendered.
 *
 * Keeping tracking here (rather than inside store actions) means the store
 * stays pure and analytics can be audited / removed in one place.
 */

import { useEffect, useRef } from 'react'
import { useEditorStore }    from '@/lib/store/editor'
import {
  trackSvgUploaded,
  trackPresetApplied,
} from '@/lib/analytics'

export function EditorAnalytics() {
  const svgSource      = useEditorStore(s => s.svgSource)
  const svgFileName    = useEditorStore(s => s.svgFileName)
  const svgLayers      = useEditorStore(s => s.svgLayers)
  const activePresetId = useEditorStore(s => s.activePresetId)

  // ── Track SVG uploads ─────────────────────────────────────────
  // Fires once per distinct svgSource value (catches both fresh uploads
  // and file replacements).
  const prevSource = useRef<string | null>(null)

  useEffect(() => {
    if (!svgSource || svgSource === prevSource.current) return
    prevSource.current = svgSource

    trackSvgUploaded({
      fileName:   svgFileName ?? 'unknown',
      fileSizeKb: Math.round(svgSource.length / 1024),
      layers:     svgLayers?.total  ?? 0,
      groups:     svgLayers?.groups ?? 0,
      hasText:    svgLayers?.hasText ?? false,
    })
  }, [svgSource, svgFileName, svgLayers])

  // ── Track preset changes ──────────────────────────────────────
  // Fires whenever the user picks a preset (or switches preset).
  const prevPreset = useRef<string | null>(null)

  useEffect(() => {
    if (!activePresetId || activePresetId === prevPreset.current) return
    prevPreset.current = activePresetId

    trackPresetApplied({ presetId: activePresetId })
  }, [activePresetId])

  return null
}
