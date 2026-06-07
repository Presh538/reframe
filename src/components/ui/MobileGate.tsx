/**
 * MobileGate — shown exclusively on narrow viewports (< 768px / md breakpoint).
 * CSS-only visibility: zero hydration mismatch, no JS required.
 * Design: Figma node 53-457
 */
export function MobileGate() {
  return (
    <div
      aria-modal="true"
      role="alertdialog"
      aria-label="Desktop required"
      className="md:hidden"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#0e0e0f',
        overflow: 'hidden',
      }}
    >
      {/* Dot-grid texture */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1.5px, transparent 1.5px)',
          backgroundSize: '27px 27px',
        }}
      />

      {/* Radial glow — matches the large centered vector in Figma */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 952,
          height: 867,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 55%)',
        }}
      />

      {/* Content block — pinned from top to match Figma proportions */}
      <div
        style={{
          position: 'absolute',
          top: 243,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Pixel-grid logo — 42px as per Figma */}
        <img
          src="/logo.svg"
          alt="Reframeo"
          width={42}
          height={42}
          style={{ display: 'block', flexShrink: 0 }}
        />

        {/* Heading */}
        <p
          style={{
            marginTop: 25,
            width: 299,
            textAlign: 'center',
            fontFamily: 'var(--font-geist-sans), sans-serif',
            fontSize: 18,
            fontWeight: 500,
            color: '#ffffff',
            letterSpacing: 0.036,
            lineHeight: 'normal',
          }}
        >
          Built for bigger screens
        </p>

        {/* Body */}
        <p
          style={{
            marginTop: 8,
            width: 321,
            textAlign: 'center',
            fontFamily: 'var(--font-geist-sans), sans-serif',
            fontSize: 14,
            fontWeight: 400,
            color: '#979797',
            letterSpacing: 0.028,
            lineHeight: 'normal',
          }}
        >
          The SVG Animator works best on a tablet or desktop. Open it on a wider screen to get started.
        </p>

        {/* "Available only on desktop" chip */}
        <div
          style={{
            marginTop: 34,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: 10,
            borderRadius: 40,
            border: '0.8px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <ComputerIcon />
          <span
            style={{
              fontFamily: 'var(--font-geist-sans), sans-serif',
              fontSize: 14,
              fontWeight: 400,
              color: '#ffffff',
              letterSpacing: 0.028,
              whiteSpace: 'nowrap',
            }}
          >
            Available only on desktop
          </span>
        </div>
      </div>
    </div>
  )
}

function ComputerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path fillRule="evenodd" clipRule="evenodd" d="M0.9375 15.75C0.9375 15.4393 1.18934 15.1875 1.5 15.1875L12.75 15.1875C13.0607 15.1875 13.3125 15.4393 13.3125 15.75C13.3125 16.0607 13.0607 16.3125 12.75 16.3125L1.5 16.3125C1.18934 16.3125 0.9375 16.0607 0.9375 15.75Z" fill="white" />
      <path fillRule="evenodd" clipRule="evenodd" d="M15.1875 15.75C15.1875 15.4393 15.4393 15.1875 15.75 15.1875L16.5 15.1875C16.8107 15.1875 17.0625 15.4393 17.0625 15.75C17.0625 16.0607 16.8107 16.3125 16.5 16.3125L15.75 16.3125C15.4393 16.3125 15.1875 16.0607 15.1875 15.75Z" fill="white" />
      <path fillRule="evenodd" clipRule="evenodd" d="M2.0625 2.8125V12.1875H15.9375V2.8125H2.0625ZM0.9375 2.7C0.9375 2.14081 1.39081 1.6875 1.95 1.6875H16.05C16.6092 1.6875 17.0625 2.14081 17.0625 2.7V12.3C17.0625 12.8592 16.6092 13.3125 16.05 13.3125H1.95C1.39081 13.3125 0.9375 12.8592 0.9375 12.3V2.7Z" fill="white" />
    </svg>
  )
}
