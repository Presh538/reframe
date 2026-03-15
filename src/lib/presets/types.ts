import type { AnimParams, Preset, PresetCategory } from '@/types'
import { EASING_CSS } from '@/types'
import {
  getTargets,
  getStrokeTargets,
  getAllTargets,
  injectKeyframes,
  animateElement,
  pathLength,
  iterationCount,
  animationDirection,
} from '@/lib/svg/animate'

// ── Builder helpers ───────────────────────────────────────────
// Shared utilities passed into preset modules so they import
// from one place and the engine stays decoupled from the presets.

export type PresetBuilder = {
  targets: typeof getTargets
  strokeTargets: typeof getStrokeTargets
  allTargets: typeof getAllTargets
  css: typeof injectKeyframes
  anim: typeof animateElement
  plen: typeof pathLength
  iter: typeof iterationCount
  dir: typeof animationDirection
  /** CSS timing function from params */
  ease: (p: AnimParams) => string
  /** Computed duration: baseDuration / speed */
  dur: (base: number, p: AnimParams) => string
  /** Formatted delay for element i with stagger */
  delay: (p: AnimParams, i?: number, stagger?: number) => string
}

export const B: PresetBuilder = {
  targets: getTargets,
  strokeTargets: getStrokeTargets,
  allTargets: getAllTargets,
  css: injectKeyframes,
  anim: animateElement,
  plen: pathLength,
  iter: iterationCount,
  dir: animationDirection,
  ease: (p) => EASING_CSS[p.easing] ?? 'ease-in-out',
  dur: (base, p) => (base / p.speed).toFixed(3) + 's',
  delay: (p, i = 0, stagger = 0) => (p.delay + i * stagger).toFixed(3) + 's',
}

export type { Preset, PresetCategory, AnimParams }
