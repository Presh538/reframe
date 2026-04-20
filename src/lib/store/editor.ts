/**
 * Editor Store — Zustand
 *
 * Single source of truth for the editor UI. React components
 * subscribe to slices they need; unrelated renders are skipped.
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { temporal } from 'zundo'
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
  /** Update the canvas zoom level (for display in the UI) */
  setZoom: (zoom: number) => void
  /** Reset zoom to 100 % and signal PreviewStage to reset pan offset */
  resetView: () => void
  /** Hard-restart the current animation from frame 0 */
  restartAnimation: () => void
  /** Toggle the persistent pan (hand) mode */
  setPanMode: (isPanMode: boolean) => void
  /** Set whether the loaded SVG has meaningful <g> groups */
  setSvgHasGroups: (hasGroups: boolean) => void
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
  isPlaying: false,
  isFragmented: false,
  zoom: 1,
  viewResetTick: 0,
  restartTick: 0,
  isPanMode: false,
  svgHasGroups: true, // optimistic default; computed after each SVG is injected
  export: {
    isRunning: false,
    progress: 0,
    error: null,
  },
}

// ── Store ─────────────────────────────────────────────────────

export const useEditorStore = create<EditorState & EditorActions>()(
  devtools(
    temporal(
    (set, get) => ({

      ...INITIAL_STATE,

      setSvgSource: (source, fileName, layers) =>
        set({ svgSource: source, svgFileName: fileName, svgLayers: layers, isFragmented: false, svgHasGroups: true }, false, 'setSvgSource'),

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

      setZoom: (zoom) => set({ zoom }, false, 'setZoom'),

      resetView: () =>
        set(s => ({ zoom: 1, viewResetTick: s.viewResetTick + 1 }), false, 'resetView'),

      restartAnimation: () =>
        set(s => ({ restartTick: s.restartTick + 1 }), false, 'restartAnimation'),

      setPanMode: (isPanMode) => set({ isPanMode }, false, 'setPanMode'),

      setSvgHasGroups: (hasGroups) => set({ svgHasGroups: hasGroups }, false, 'setSvgHasGroups'),

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
    {
      // Only track undo-relevant state slices — skip ephemeral/UI state
      // so that zoom changes and export progress don't pollute the history.
      partialize: (state) => ({
        svgSource:     state.svgSource,
        svgFileName:   state.svgFileName,
        svgLayers:     state.svgLayers,
        activePresetId: state.activePresetId,
        params:        state.params,
        isFragmented:  state.isFragmented,
      }),
      // Limit history to 40 steps to keep memory bounded
      limit: 40,
    }),
    {
      name: 'reframe-editor',
      // Only activate when the Redux DevTools browser extension is actually installed.
      // Without this guard Zustand logs a noisy console warning in every dev session.
      enabled:
        process.env.NODE_ENV !== 'production' &&
        typeof window !== 'undefined' &&
        !!(window as unknown as Record<string, unknown>)['__REDUX_DEVTOOLS_EXTENSION__'],
    }
  )
)

// ── Temporal (undo/redo) helpers ──────────────────────────────
// Call directly from event handlers (outside React render).
export const undoEditor = () => useEditorStore.temporal.getState().undo()
export const redoEditor = () => useEditorStore.temporal.getState().redo()

// ── Selectors (memoised for performance) ──────────────────────

export const selectSvgReady = (s: EditorState) => s.svgSource !== null
export const selectCanExport = (s: EditorState) =>
  s.svgSource !== null && s.activePresetId !== null && !s.export.isRunning

// ── Live SVG element ref ───────────────────────────────────────
// A module-level mutable ref to the live, animated SVG element rendered inside
// PreviewStage. DOM nodes are not serialisable so they must not live in Zustand;
// this pattern keeps the ref accessible to export utilities without an
// imperative DOM query (.rf-preview-container svg class selector).
//
// PreviewStage writes to liveSvgRef.current after each inject.
// Export utilities (runExport, TopBar, ExportPanel) read from it.
export const liveSvgRef: { current: SVGSVGElement | null } = { current: null }
