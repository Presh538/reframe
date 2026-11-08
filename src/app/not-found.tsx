import type { Metadata } from 'next'
import Link from 'next/link'
import { LANDING_PAGES } from '@/lib/seo/pages'

/**
 * Branded 404. The framework default was a bare "This page could not be
 * found" with no way back, so a mistyped or stale link ended the visit.
 * Still answers with HTTP 404, so search engines drop the URL.
 */
export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
}

const f = { fontFamily: 'var(--font-geist-sans), sans-serif' } as const

export default function NotFound() {
  return (
    <main
      style={{
        ...f,
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        boxSizing: 'border-box',
        background: '#0D0D0D',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1.5px, transparent 1.5px)',
        backgroundSize: '27px 27px',
        color: '#fff',
      }}
    >
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 13, letterSpacing: 2, color: '#D06523' }}>404</p>
        <h1 style={{ margin: '12px 0 8px', fontSize: 24, fontWeight: 600 }}>This page doesn’t exist</h1>
        <p style={{ margin: '0 0 24px', fontSize: 15, lineHeight: 1.5, color: 'rgba(255,255,255,0.55)' }}>
          The link may be old or mistyped. You can head straight to the animator, or pick a guide.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '11px 20px',
            borderRadius: 999,
            background: '#D06523',
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Open the animator →
        </Link>
        <nav aria-label="Guides" style={{ marginTop: 28 }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 16px' }}>
            {LANDING_PAGES.map(page => (
              <li key={page.path}>
                <Link href={page.path} style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
                  {page.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  )
}
