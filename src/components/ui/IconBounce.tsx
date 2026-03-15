'use client'

/**
 * IconBounce — Rive-style icon micro-animations via motion variants.
 *
 * Usage:
 *   Wrap a parent button with `initial="rest" whileHover="hover"` (no variants
 *   needed on the button itself — it's just used to set the variant context).
 *   Wrap the icon with <IconBounce type="zap"> and it auto-responds to the
 *   parent's hover state through motion's variant propagation system.
 *
 *   <motion.button initial="rest" whileHover="hover">
 *     <IconBounce type="zap"><FlashIcon /></IconBounce>
 *     Speed
 *   </motion.button>
 */

import { motion, type TargetAndTransition } from 'motion/react'

// ── Animation catalogue ───────────────────────────────────────
export type IconAnimType =
  | 'zap'      // electric jolt — Speed
  | 'tick'     // clockwise tick — Delay
  | 'tug'      // loop tug — Loop
  | 'nudge'    // lateral nudge — Direction
  | 'focus'    // scale pulse — Target
  | 'rewind'   // counter-clockwise tug — Restart
  | 'beat'     // scale heartbeat — Play/Pause
  | 'pop'      // bounce up — Presets / Export
  | 'squeeze'  // horizontal squeeze — Smoothing

// Each variant ends at its starting value so hover/unhover transitions are clean
const HOVER_ANIM: Record<IconAnimType, TargetAndTransition> = {
  zap:     { rotate: [0, -22, 16, -8, 0],        transition: { duration: 0.38, ease: 'easeOut' } },
  tick:    { rotate: [0, 30, -6, 0],              transition: { duration: 0.32, ease: 'easeOut' } },
  tug:     { rotate: [0, 20, -10, 4, 0],          transition: { duration: 0.4,  ease: 'easeOut' } },
  nudge:   { x:      [0, 4, -2, 1, 0],            transition: { duration: 0.35, ease: 'easeOut' } },
  focus:   { scale:  [1, 0.76, 1.16, 0.94, 1],   transition: { duration: 0.38, ease: 'easeOut' } },
  rewind:  { rotate: [0, -30, 10, -3, 0],         transition: { duration: 0.38, ease: 'easeOut' } },
  beat:    { scale:  [1, 1.24, 0.86, 1.08, 1],   transition: { duration: 0.4,  ease: 'easeOut' } },
  pop:     { y:      [0, -4, 1, -1, 0],           transition: { duration: 0.35, ease: 'easeOut' } },
  squeeze: { scaleX: [1, 0.68, 1.18, 0.96, 1],   transition: { duration: 0.38, ease: 'easeOut' } },
}

// ── Component ─────────────────────────────────────────────────
interface IconBounceProps {
  type: IconAnimType
  children: React.ReactNode
  /** Extra class names forwarded to the span (e.g. sizing). */
  className?: string
}

export function IconBounce({ type, children, className }: IconBounceProps) {
  return (
    <motion.span
      className={className}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      variants={{
        rest:  {},
        hover: HOVER_ANIM[type],
      }}
    >
      {children}
    </motion.span>
  )
}
