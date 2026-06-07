'use client'

/**
 * Error boundary for /s/[token] share preview pages.
 * Catches any unhandled errors from the server component (e.g. crypto failures)
 * and shows a clean message instead of the Next.js error overlay.
 */
export default function ShareError() {
  return (
    <div
      style={{
        position:        'fixed',
        inset:           0,
        backgroundColor: '#0D0D0D',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1.5px, transparent 1.5px)',
        backgroundSize:  '27px 27px',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
      }}
    >
      <div style={{ textAlign: 'center', padding: '0 24px' }}>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', margin: '0 0 20px', lineHeight: 1.5 }}>
          This share link couldn&apos;t be loaded.
        </p>
        <a
          href="/"
          style={{
            display:         'inline-block',
            padding:         '10px 20px',
            backgroundColor: 'rgba(255,255,255,0.08)',
            border:          '1px solid rgba(255,255,255,0.12)',
            borderRadius:    8,
            color:           'rgba(255,255,255,0.7)',
            fontSize:        14,
            textDecoration:  'none',
          }}
        >
          Animate your own SVG →
        </a>
      </div>
    </div>
  )
}
