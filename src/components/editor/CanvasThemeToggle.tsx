'use client'

import { motion } from 'motion/react'

export type CanvasTheme = 'dark' | 'light'

/**
 * Compact canvas-background switch from the new header (Figma 102:765).
 * The icon shows the theme that pressing the button will activate.
 */
export function CanvasThemeToggle({
  theme,
  onChange,
}: {
  theme: CanvasTheme
  onChange: (theme: CanvasTheme) => void
}) {
  const nextTheme: CanvasTheme = theme === 'dark' ? 'light' : 'dark'
  const label = `Switch to ${nextTheme} canvas background`

  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => onChange(nextTheme)}
      whileTap={{ scale: 0.9 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        padding: 0,
        border: 0,
        borderRadius: 8,
        background: 'transparent',
        cursor: 'pointer',
      }}
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
    >
      <img
        src={nextTheme === 'light' ? '/figma-icons/icon-sun.svg' : '/figma-icons/icon-moon.svg'}
        alt=""
        width={15}
        height={15}
        style={{ display: 'block', opacity: 0.72, filter: nextTheme === 'light' ? 'invert(1)' : undefined }}
      />
    </motion.button>
  )
}
