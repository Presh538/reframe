'use client'

/**
 * MobileGate
 *
 * Shown exclusively on narrow viewports (< 768 px / md breakpoint).
 * Uses CSS-only show/hide so there is zero hydration mismatch.
 */
export function MobileGate() {
  return (
    <>
      {/* Visible only on screens narrower than the `md` breakpoint */}
      <div
        aria-modal="true"
        role="alertdialog"
        aria-label="Desktop required"
        className="
          fixed inset-0 z-[9999]
          flex flex-col items-center justify-center gap-6
          px-8 text-center
          md:hidden
        "
        style={{ background: 'var(--bg)' }}
      >
        {/* Dot-grid pattern behind content */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle, var(--canvas-tile) 1.5px, transparent 1.5px)',
            backgroundSize: '27px 27px',
          }}
        />

        {/* Icon */}
        <div
          className="relative z-10 flex items-center justify-center w-14 h-14 rounded-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {/* Monitor icon */}
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
        </div>

        {/* Heading */}
        <div className="relative z-10 flex flex-col gap-2 max-w-xs">
          <h1
            className="text-[18px] font-semibold tracking-tight"
            style={{ color: 'var(--text)' }}
          >
            Built for bigger screens
          </h1>
          <p
            className="text-[14px] leading-relaxed"
            style={{ color: 'var(--text-soft)' }}
          >
            The SVG Animator works best on a tablet or desktop. Open it on a
            wider screen to get started.
          </p>
        </div>
      </div>
    </>
  )
}
