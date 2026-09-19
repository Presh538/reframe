'use client'

import { motion } from 'motion/react'

export type CanvasTheme = 'dark' | 'light'

/**
 * Canvas background switch. Lives in the TopBar beside Upgrade and Export
 * (Figma node 101:513); it previously floated at the bottom-left of the canvas.
 *
 * Kept as a radiogroup rather than a single toggle button so the current
 * background is announced, and so both options are reachable in one step.
 */
export function CanvasThemeToggle({
  theme,
  onChange,
}: {
  theme: CanvasTheme
  onChange: (theme: CanvasTheme) => void
}) {
  const isLight = theme === 'light'
  const options: { value: CanvasTheme; label: string; src: string }[] = [
    { value: 'dark',  label: 'Dark canvas background',  src: '/figma-icons/icon-moon.svg' },
    { value: 'light', label: 'Light canvas background', src: '/figma-icons/icon-sun.svg' },
  ]

  return (
    <div
      role="radiogroup"
      aria-label="Canvas background"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: 14,
        borderRadius: 50,
        border: isLight ? 'none' : '0.8px solid rgba(255,255,255,0.06)',
        background: isLight ? '#EDEDED' : 'rgba(255,255,255,0.06)',
        boxShadow: isLight ? 'none' : '0 2px 4px 1px rgba(0,0,0,0.65), inset 0 2px 4px rgba(57,57,57,0.45)',
        backdropFilter: isLight ? 'none' : 'blur(17px)',
        WebkitBackdropFilter: isLight ? 'none' : 'blur(17px)',
      }}
    >
      {options.map(({ value, label, src }) => {
        const active = theme === value
        return (
          <motion.button
            key={value}
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => onChange(value)}
            whileHover={!active ? { backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.09)' } : undefined}
            whileTap={{ scale: 0.9 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              padding: 4,
              borderRadius: 20,
              border: 'none',
              background: active ? '#FFFFFF' : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            <img src={src} alt="" width={22} height={22} style={{ display: 'block', flexShrink: 0 }} />
          </motion.button>
        )
      })}
    </div>
  )
}
