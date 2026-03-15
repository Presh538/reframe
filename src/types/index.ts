// ── Easing ────────────────────────────────────────────────────
export type EasingType =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'spring'
  | 'back'
  | 'snappy'

/** Maps EasingType to CSS timing-function values */
export const EASING_CSS: Record<EasingType, string> = {
  'linear':      'linear',
  'ease':        'ease',
  'ease-in':     'ease-in',
  'ease-out':    'ease-out',
  'ease-in-out': 'ease-in-out',
  'spring':      'cubic-bezier(0.34, 1.56, 0.64, 1)',
  'back':        'cubic-bezier(0.36, 0, 0.66, -0.56)',
  'snappy':      'cubic-bezier(0.2, 0, 0, 1)',
}

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
  /** CSS timing function for the animation */
  easing: EasingType
}

export const DEFAULT_PARAMS: AnimParams = {
  speed: 1,
  delay: 0,
  loop: 'once',
  direction: 'in',
  scope: 'all',
  easing: 'ease-in-out',
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
  /** Canvas zoom level (1 = 100%) */
  zoom: number
  /** Increments each time resetView is called — PreviewStage watches this to reset pan */
  viewResetTick: number
  /** Whether the hand / pan tool is locked on */
  isPanMode: boolean
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
