/**
 * Shared layout for the Privacy Policy and Terms of Service.
 * Server-rendered and crawlable, styled to match the SEO landing pages.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'
import { LEGAL } from './legal-config'

const wrap = { maxWidth: 720, margin: '0 auto', padding: '0 24px', boxSizing: 'border-box' as const }

export function LegalPage({ title, summary, children }: { title: string; summary: string; children: ReactNode }) {
  return (
    <main className="scrollbar-thin legal" style={{ height: '100dvh', overflowY: 'auto', background: 'var(--bg)', color: 'var(--text)' }}>
      <style>{LEGAL_CSS}</style>

      <header style={{ ...wrap, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--text)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={26} height={26} style={{ display: 'block' }} />
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: 0.2 }}>Reframe</span>
        </Link>
        <Link href="/" className="legal-cta">Open the animator →</Link>
      </header>

      <article style={{ ...wrap, padding: '40px 24px 64px' }}>
        <h1>{title}</h1>
        <p className="legal-meta">Effective {LEGAL.effectiveDate}</p>
        <p className="legal-summary">{summary}</p>
        {children}
      </article>

      <footer style={{ borderTop: '1px solid var(--border)' }}>
        <nav aria-label="Legal" style={{ ...wrap, padding: '28px 24px 56px', display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
          <span style={{ color: 'var(--text-faint)' }}>© {new Date().getFullYear()} {LEGAL.product}</span>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <a href={`mailto:${LEGAL.contactEmail}`}>Contact</a>
        </nav>
      </footer>
    </main>
  )
}

// Body text uses --text on --bg (#FFF on #0D0D0D); secondary text uses
// #A3A3A3 (7.9:1) rather than the site's --text-soft (#888, 5.9:1) so long
// legal copy stays comfortable to read.
const LEGAL_CSS = `
.legal h1 { font-size: 34px; line-height: 1.2; font-weight: 600; margin: 0 0 8px; letter-spacing: -0.01em; }
.legal h2 { font-size: 20px; line-height: 1.35; font-weight: 600; margin: 40px 0 12px; }
.legal h3 { font-size: 16px; font-weight: 600; margin: 24px 0 8px; }
.legal p, .legal li { font-size: 15.5px; line-height: 1.7; color: #d4d4d4; }
.legal p { margin: 0 0 14px; }
.legal ul { margin: 0 0 14px; padding-left: 22px; }
.legal li { margin: 0 0 6px; }
.legal strong { color: var(--text); font-weight: 600; }
.legal article a { color: #fb923c; text-decoration: underline; text-underline-offset: 3px; }
.legal a:focus-visible, .legal .legal-cta:focus-visible { outline-offset: 3px; }
.legal footer a { color: #a3a3a3; text-decoration: none; }
.legal footer a:hover { color: var(--text); }
.legal .legal-meta { font-size: 13px; color: #a3a3a3; margin: 0 0 20px; }
.legal .legal-summary { font-size: 17px; color: var(--text); padding: 16px 18px; border: 1px solid var(--border-strong); border-radius: 12px; background: var(--surface); }
.legal table { width: 100%; border-collapse: collapse; margin: 8px 0 20px; font-size: 14.5px; }
.legal th, .legal td { text-align: left; vertical-align: top; padding: 10px 12px 10px 0; border-bottom: 1px solid var(--border-strong); color: #d4d4d4; line-height: 1.55; }
.legal th { color: var(--text); font-weight: 600; font-size: 13px; }
.legal .legal-cta { font-size: 14px; font-weight: 500; text-decoration: none; color: #fff; background: #B8541A; padding: 9px 18px; border-radius: var(--radius-pill); }
`
