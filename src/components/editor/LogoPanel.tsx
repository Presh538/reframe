'use client'

interface LogoPanelProps {
  fileName?: string
}

export function LogoPanel({ fileName }: LogoPanelProps) {
  return (
    <div
      className="flex items-center gap-[13px] px-3 py-3"
      style={{
        backgroundColor: 'rgba(229, 229, 229, 0.6)',
        borderRadius: '34px',
      }}
      data-node-id="298:100"
    >
      {/* Logo SVG */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        className="flex-shrink-0"
      >
        <circle cx="11" cy="11" r="10" stroke="#7c5cfc" strokeWidth="1.5" />
        {/* asterisk */}
        <line x1="11" y1="5" x2="11" y2="17" stroke="#7c5cfc" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="5.27" y1="8" x2="16.73" y2="14" stroke="#7c5cfc" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="5.27" y1="14" x2="16.73" y2="8" stroke="#7c5cfc" strokeWidth="1.5" strokeLinecap="round" />
      </svg>

      {/* File name (optional) */}
      {fileName && (
        <>
          <span className="text-[var(--text-very-faint)]">·</span>
          <span className="text-xs text-[var(--muted)] max-w-[160px] truncate">
            {fileName}
          </span>
        </>
      )}
    </div>
  )
}
