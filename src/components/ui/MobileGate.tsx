import { MobileGateActions } from './MobileGateActions'

/**
 * MobileGate — covers the editor on narrow viewports (< 768px / md breakpoint).
 * CSS-only visibility: zero hydration mismatch, no JS required.
 * Design: Figma node 53-457
 *
 * Mounted by the editor route only. It used to sit in the root layout, which
 * hid every landing page, the legal pages and shared animation links from
 * phone visitors as well.
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
          alt="Reframe"
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

        <MobileGateActions />
      </div>
    </div>
  )
}
