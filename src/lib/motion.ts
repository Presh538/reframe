/**
 * Shared motion presets
 *
 * All spring configs live here so the app's motion personality is tunable
 * in one place. Import SPRING and spread into transition props:
 *
 *   transition={{ ...SPRING.entrance, delay: 0.03 }}
 */

import type { Transition } from 'motion/react'

export const SPRING = {
  /** Bar slide-in — TopBar and BottomBar entrances */
  entrance: { type: 'spring', stiffness: 320, damping: 28 } satisfies Transition,

  /** Panel open — EasingPanel, PresetPanel, SmoothingPanel overlays */
  panel:    { type: 'spring', stiffness: 440, damping: 30, mass: 0.7 } satisfies Transition,

  /** Dropdown open — format picker, BottomBar popovers */
  dropdown: { type: 'spring', stiffness: 480, damping: 28, mass: 0.55 } satisfies Transition,

  /** List-item stagger entrance inside popovers */
  stagger:  { type: 'spring', stiffness: 560, damping: 26 } satisfies Transition,

  /** Snappy tap feedback — play button, icon micro-animations */
  snappy:   { type: 'spring', stiffness: 600, damping: 18 } satisfies Transition,
} as const
