// ── Animation parameters ──────────────────────────────────────
export interface AnimParams {
  /** Playback speed multiplier (0.25 – 3) */
  speed: number
  /** Pre-animation delay in seconds (0 – 2) */
  delay: number
  /** Iteration behaviour */
  loop: 'once' | 'loop' | 'bounce'
  /** Animation direction */
  direction: 'in' | 'out' | 'in-out'
  /** Which SVG elements to animate */
  scope: 'all' | 'groups' | 'paths'
}

export const DEFAULT_PARAMS: AnimParams = {
  speed: 1,
  delay: 0,
  loop: 'once',
  direction: 'in',
  scope: 'all',
}

// ── Preset ────────────────────────────────────────────────────
export type PresetCategory = 'Logo' | 'Icon' | 'Illustration' | 'UI' | 'Premium'
export type ExportFormat = 'gif' | 'lottie' | 'css'

export interface Preset {
  id: string
  name: string
  category: PresetCategory
  icon: string
  /** Pro-only preset */
  pro: boolean
  /** Base animation duration in seconds at 1× speed */
  baseDuration: number
  description: string
  apply: (svgEl: SVGSVGElement, params: AnimParams) => void
}

// ── SVG layer metadata ────────────────────────────────────────
export interface SvgLayerInfo {
  groups: number
  paths: number
  shapes: number
  total: number
  hasText: boolean
  viewBox: { width: number; height: number }
}

// ── Editor state ──────────────────────────────────────────────
export interface EditorState {
  /** Raw sanitized SVG string */
  svgSource: string | null
  /** Original file name */
  svgFileName: string
  /** Parsed layer metadata */
  svgLayers: SvgLayerInfo | null
  /** Active preset id */
  activePresetId: string | null
  /** Tweak params */
  params: AnimParams
  /** Selected export format */
  format: ExportFormat
  /** Whether the preview animation is playing */
  isPlaying: boolean
  /** Whether the current SVG has been fragmented into individually animatable elements */
  isFragmented: boolean
  /** Export state */
  export: {
    isRunning: boolean
    progress: number
    error: string | null
  }
}

// ── API responses ─────────────────────────────────────────────
export interface ValidateSvgResponse {
  valid: boolean
  sanitized: string
  layers: SvgLayerInfo
  warnings: string[]
}

export interface ApiError {
  error: string
  code?: string
}
