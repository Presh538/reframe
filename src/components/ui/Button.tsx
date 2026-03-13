'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'

type Variant = 'primary' | 'ghost' | 'export' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  isLoading?: boolean
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-accent hover:bg-accent-hover text-white border-transparent shadow-sm',
  ghost:
    'bg-transparent text-muted hover:bg-surface-2 hover:text-[var(--text)] border-border',
  export:
    'bg-gradient-to-r from-accent to-[#4f9eff] text-white border-transparent shadow-md hover:opacity-90',
  danger:
    'bg-transparent text-danger hover:bg-danger/10 border-danger/40',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-2.5 py-1.5 text-[11px] rounded-[5px] gap-1.5',
  md: 'px-3.5 py-2 text-[12px] rounded-[7px] gap-2',
  lg: 'px-4 py-2.5 text-[13px] rounded-[8px] gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'ghost',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          'inline-flex items-center justify-center font-medium border transition-all duration-150 whitespace-nowrap select-none',
          'disabled:opacity-40 disabled:pointer-events-none',
          'active:scale-[0.97]',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block w-3.5 h-3.5 border-2 border-white/25 border-t-white rounded-full animate-spin" />
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
