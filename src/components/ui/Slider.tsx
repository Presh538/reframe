'use client'

import { type ChangeEvent } from 'react'
import { clsx } from 'clsx'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  displayValue: string
  onChange: (value: number) => void
  className?: string
  /** Compact mode: hides the label/value header row, just shows the track */
  compact?: boolean
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
  className,
  compact = false,
}: SliderProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value))
  }

  return (
    <div className={clsx(!compact && 'space-y-1.5', className)}>
      {!compact && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-[var(--text-soft)]">{label}</span>
          <span className="text-[11px] font-semibold text-accent">{displayValue}</span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className={clsx(
          'w-full h-[3px] rounded-full bg-border appearance-none cursor-pointer outline-none',
          '[&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:w-[13px]',
          '[&::-webkit-slider-thumb]:h-[13px]',
          '[&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:bg-accent',
          '[&::-webkit-slider-thumb]:cursor-pointer',
          '[&::-webkit-slider-thumb]:transition-transform',
          '[&::-webkit-slider-thumb]:hover:scale-125',
          '[&::-moz-range-thumb]:w-[13px]',
          '[&::-moz-range-thumb]:h-[13px]',
          '[&::-moz-range-thumb]:rounded-full',
          '[&::-moz-range-thumb]:bg-accent',
          '[&::-moz-range-thumb]:border-none',
          '[&::-moz-range-thumb]:cursor-pointer'
        )}
      />
    </div>
  )
}
