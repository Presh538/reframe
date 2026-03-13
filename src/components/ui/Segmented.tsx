'use client'

import { clsx } from 'clsx'

interface Option<T extends string> {
  value: T
  label: string
}

interface SegmentedProps<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      className={clsx(
        'flex bg-surface-2 rounded-[6px] p-[2px] gap-[2px]',
        className
      )}
    >
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={clsx(
            'flex-1 px-2 py-[5px] rounded-[4px] text-[11px] font-medium transition-all duration-120 border-none cursor-pointer',
            value === opt.value
              ? 'bg-accent text-white shadow-sm'
              : 'bg-transparent text-muted hover:text-[var(--text)]'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
