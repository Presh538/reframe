/**
 * Editor Store — Zustand
 *
 * Single source of truth for the editor UI. React components
 * subscribe to slices they need; unrelated renders are skipped.
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { EditorState, AnimParams, ExportFormat, SvgLayerInfo } from '@/types'
import { DEFAULT_PARAMS } from '@/types'
import { fragmentSvg } from '@/lib/svg/fragment'
import { extractLayerInfo, normalizeSvgElement } from '@/lib/svg/sanitize'

// ── Actions ───────────────────────────────────────────────────

interface EditorActions {
  /** Store a sanitized SVG source string after successful upload */
  setSvgSource: (source: string, fileName: string, layers: SvgLayerInfo) => void
  /** Clear the current SVG and reset the editor */
  clearSvg: () => void
  /** Set the active preset */
  setActivePreset: (id: string | null) => void
  /** Update a single animation parameter */
  updateParam: <K extends keyof AnimParams>(key: K, value: AnimParams[K]) => void
  /** Replace all params at once (e.g. on preset change) */
  resetParams: () => void
  /** Set export format */
  setFormat: (format: ExportFormat) => void
  /** Toggle play/pause */
  setPlaying: (playing: boolean) => void
  /** Update export progress state */
  setExportState: (state: Partial<EditorState['export']>) => void
  /**
   * Fragment the current SVG into individually animatable elements.
   * Splits compound paths and promotes nested groups to the top level.
   */
  fragmentElements: () => void
}

// ── Initial state ─────────────────────────────────────────────

const INITIAL_STATE: EditorState = {
  svgSource: null,
  svgFileName: '',
  svgLayers: null,
  activePresetId: null,
  params: DEFAULT_PARAMS,
  format: 'gif',
  isPlaying: true,
  isFragmented: false,
  export: {
    isRunning: false,
    progress: 0,
    error: null,
  },
}

// ── Store ─────────────────────────────────────────────────────

export const useEditorStore = create<EditorState & EditorActions>()(
  devtools(
    (set, get) => ({
      ...INITIAL_STATE,

      setSvgSource: (source, fileName, layers) =>
        set({ svgSource: source, svgFileName: fileName, svgLayers: layers, isFragmented: false }, false, 'setSvgSource'),

      clearSvg: () =>
        set({ ...INITIAL_STATE }, false, 'clearSvg'),

      setActivePreset: (id) =>
        set({ activePresetId: id }, false, 'setActivePreset'),

      updateParam: (key, value) =>
        set(
          (s) => ({ params: { ...s.params, [key]: value } }),
          false,
          `updateParam/${key}`
        ),

      resetParams: () =>
        set({ params: DEFAULT_PARAMS }, false, 'resetParams'),

      setFormat: (format) =>
        set({ format }, false, 'setFormat'),

      setPlaying: (isPlaying) =>
        set({ isPlaying }, false, 'setPlaying'),

      setExportState: (exportState) =>
        set(
          (s) => ({ export: { ...s.export, ...exportState } }),
          false,
          'setExportState'
        ),

      fragmentElements: () => {
        const { svgSource } = get()
        if (!svgSource) return

        const result = fragmentSvg(svgSource)

        // Re-extract layer info from the fragmented SVG so the panel updates
        try {
          const doc = new DOMParser().parseFromString(result.svg, 'image/svg+xml')
          const svgEl = doc.querySelector('svg') as SVGSVGElement | null
          if (svgEl) {
            normalizeSvgElement(svgEl)
            const layers = extractLayerInfo(svgEl)
            set(
              { svgSource: result.svg, svgLayers: layers, isFragmented: true, activePresetId: null },
              false,
              'fragmentElements'
            )
            return
          }
        } catch { /* fall through */ }

        set({ svgSource: result.svg, isFragmented: true, activePresetId: null }, false, 'fragmentElements')
      },
    }),
    { name: 'reframe-editor' }
  )
)

// ── Selectors (memoised for performance) ──────────────────────

export const selectSvgReady = (s: EditorState) => s.svgSource !== null
export const selectCanExport = (s: EditorState) =>
  s.svgSource !== null && s.activePresetId !== null && !s.export.isRunning
