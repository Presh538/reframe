/**
 * loading.tsx — server-rendered shell for the editor.
 *
 * Next.js streams this to the browser immediately (zero JS required)
 * while the client bundle downloads and hydrates. This is what triggers
 * FCP — the browser paints the canvas background + top bar skeleton
 * instead of a blank white page.
 */

export default function Loading() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#e8e8e8',
        backgroundImage: 'radial-gradient(circle, #e0e0e0 1.5px, transparent 1.5px)',
        backgroundSize: '27px 27px',
        overflow: 'hidden',
      }}
    >
      {/* Top bar skeleton */}
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
        {/* Left — Presets / Easing tabs */}
        <div style={{ display: 'flex', gap: 8 }}>
          {['Presets', 'Easing'].map(label => (
            <div
              key={label}
              style={{
                height: 36,
                borderRadius: 100,
                background: 'rgba(255,255,255,0.72)',
                backdropFilter: 'blur(8px)',
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: 3, background: '#d4d4d4' }} />
              <div style={{ width: label === 'Presets' ? 48 : 42, height: 12, borderRadius: 6, background: '#d4d4d4' }} />
            </div>
          ))}
        </div>

        {/* Right — Export button skeleton */}
        <div
          style={{
            height: 36,
            width: 140,
            borderRadius: 100,
            background: '#3f37c9',
            opacity: 0.25,
          }}
        />
      </div>
    </div>
  )
}
