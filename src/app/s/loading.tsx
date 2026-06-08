/**
 * Loading state for /s/[token] share preview pages.
 * Overrides the root app loading.tsx (which shows the editor skeleton).
 * Shows a plain dark canvas while the server component verifies the token.
 */
export default function ShareLoading() {
  return (
    <div
      style={{
        position:            'fixed',
        inset:               0,
        backgroundColor:     '#0D0D0D',
        backgroundImage:     'radial-gradient(circle, rgba(255,255,255,0.07) 1.5px, transparent 1.5px)',
        backgroundSize:      '27px 27px',
        display:             'flex',
        alignItems:          'center',
        justifyContent:      'center',
      }}
    >
      <div
        style={{
          width:        24,
          height:       24,
          borderRadius: '50%',
          border:       '2px solid rgba(255,255,255,0.12)',
          borderTopColor: 'rgba(255,255,255,0.5)',
          animation:    'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
