/**
 * loading.tsx — server-rendered shell for the editor.
 *
 * Next.js streams this to the browser immediately while the client bundle
 * compiles / downloads. Dark theme matches the actual editor so the
 * loading → loaded transition is invisible.
 */

export default function Loading() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#0D0D0D',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1.5px, transparent 1.5px)',
        backgroundSize: '27px 27px',
        overflow: 'hidden',
      }}
    >
      {/* Top bar skeleton — mirrors TopBar layout */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '24px 16px 0',
          pointerEvents: 'none',
        }}
      >
        {/* Left — Presets / Easing tab skeletons */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[48, 42].map((w, i) => (
            <div
              key={i}
              style={{
                height: 36,
                borderRadius: 100,
                background: 'rgba(255,255,255,0.06)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(255,255,255,0.12)' }} />
              <div style={{ width: w, height: 11, borderRadius: 6, background: 'rgba(255,255,255,0.10)' }} />
            </div>
          ))}
        </div>

        {/* Right — Export button skeleton */}
        <div
          style={{
            height: 36,
            width: 130,
            borderRadius: 100,
            background: 'rgba(249,115,22,0.18)',
            border: '0.5px solid rgba(249,115,22,0.25)',
          }}
        />
      </div>
    </div>
  )
}
