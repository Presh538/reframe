/**
 * Landing.tsx — shared, server-rendered SEO landing page scaffold.
 *
 * Why this exists: the editor at "/" renders no crawlable body text (ssr:false),
 * so dedicated content routes are what Google can index and rank. Every such
 * page shares the same structure (hero → how-to → why → FAQ → CTA) and the same
 * page-scoped structured data (WebPage + BreadcrumbList + HowTo + FAQPage).
 * This module centralises both so each route file is just content config.
 *
 * Fully static: no 'use client', no data fetching → prerendered at build time,
 * served instantly, trivially crawlable. Pages link INTO the editor; they never
 * touch the editor UI.
 */

import type { Metadata } from 'next'
import Link from 'next/link'

const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://reframeo.com'
const APP_NAME = 'Reframe'

// Self-hosted, optimized OG image (1200x630, ~360 KB) — see public/og-image.jpg.
const OG_IMAGE = `${APP_URL}/og-image.jpg`

export interface LandingConfig {
  /** Route path, e.g. '/svg-to-gif' (leading slash, no trailing slash). */
  path: string
  /** Small uppercase eyebrow above the H1. */
  eyebrow: string
  /** <title> + OG/Twitter title. */
  title: string
  /** Meta description + OG/Twitter description. */
  description: string
  /** Main H1. */
  h1: string
  /** Hero paragraph under the H1. */
  heroSubhead: string
  /** Primary CTA label (links to editor). */
  primaryCta: string
  /** Section: "How to…" heading + subhead. */
  howHeading: string
  howSubhead: string
  /** 4 steps: [title, body]. */
  steps: [string, string][]
  /** Section: "Why…" heading + paragraphs. */
  whyHeading: string
  whyParagraphs: string[]
  /** FAQ: [question, answer]. Mirrored into FAQPage schema. */
  faqs: [string, string][]
  /** Final CTA heading + subhead. */
  finalHeading: string
  finalSubhead: string
  /** Breadcrumb label for this page. */
  breadcrumbName: string
  /** HowTo schema name + description. */
  howToName: string
  howToDescription: string
}

/** Build Next.js Metadata for a landing page from its config. */
export function buildLandingMetadata(c: LandingConfig): Metadata {
  const pageUrl = `${APP_URL}${c.path}`
  return {
    title:       c.title,
    description: c.description,
    alternates:  { canonical: pageUrl },
    openGraph: {
      type:        'website',
      url:         pageUrl,
      siteName:    APP_NAME,
      title:       c.title,
      description: c.description,
      images:      [{ url: OG_IMAGE, width: 1200, height: 630, alt: `${c.breadcrumbName} — ${APP_NAME}` }],
    },
    twitter: {
      card:        'summary_large_image',
      title:       c.title,
      description: c.description,
      images:      [OG_IMAGE],
    },
    robots: { index: true, follow: true },
  }
}

function buildJsonLd(c: LandingConfig) {
  const pageUrl = `${APP_URL}${c.path}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}/#webpage`,
        url: pageUrl,
        name: c.title,
        description: c.description,
        isPartOf: { '@id': `${APP_URL}/#software` },
        primaryImageOfPage: OG_IMAGE,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: APP_URL },
          { '@type': 'ListItem', position: 2, name: c.breadcrumbName, item: pageUrl },
        ],
      },
      {
        '@type': 'HowTo',
        name: c.howToName,
        description: c.howToDescription,
        totalTime: 'PT1M',
        step: c.steps.map(([name, text], i) => ({
          '@type': 'HowToStep', position: i + 1, name, text,
        })),
      },
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}/#faq`,
        mainEntity: c.faqs.map(([q, a]) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
  }
}

/** Related-link set rendered in the footer for internal linking (SEO). */
const ALL_PAGES: { path: string; label: string }[] = [
  { path: '/animate-svg-with-ai', label: 'Animate SVG with AI' },
  { path: '/svg-to-gif',          label: 'SVG to GIF' },
  { path: '/svg-to-lottie',       label: 'SVG to Lottie' },
  { path: '/free-svg-animator',   label: 'Free SVG animator' },
]

const s = {
  page: { height: '100dvh', overflowY: 'auto' as const, background: 'var(--bg)', color: 'var(--text)' },
  wrap: { maxWidth: 760, margin: '0 auto', padding: '0 24px', boxSizing: 'border-box' as const },
}

export function LandingPage({ config: c }: { config: LandingConfig }) {
  const related = ALL_PAGES.filter(p => p.path !== c.path)

  return (
    <main className="scrollbar-thin" style={s.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(c)) }}
      />

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header style={{ ...s.wrap, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--text)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Reframe logo" width={26} height={26} style={{ display: 'block' }} />
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: 0.2 }}>Reframe</span>
        </Link>
        <Link href="/" style={{ fontSize: 14, fontWeight: 500, textDecoration: 'none', color: '#fff', background: '#D06523', padding: '9px 18px', borderRadius: 'var(--radius-pill)' }}>
          Open the animator →
        </Link>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="canvas-bg" style={{ borderBottom: '1px solid var(--border)' }}>
        <div style={{ ...s.wrap, padding: '72px 24px 80px' }}>
          <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 500, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--accent)' }}>
            {c.eyebrow}
          </p>
          <h1 style={{ margin: 0, fontSize: 'clamp(34px, 6vw, 52px)', lineHeight: 1.08, fontWeight: 700, letterSpacing: -0.5 }}>
            {c.h1}
          </h1>
          <p style={{ margin: '24px 0 0', fontSize: 18, lineHeight: 1.55, color: 'var(--text-soft)', maxWidth: 620 }}>
            {c.heroSubhead}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 32 }}>
            <Link href="/" style={{ fontSize: 15, fontWeight: 600, textDecoration: 'none', color: '#fff', background: '#D06523', padding: '13px 26px', borderRadius: 'var(--radius-pill)' }}>
              {c.primaryCta}
            </Link>
            <Link href="/" style={{ fontSize: 15, fontWeight: 500, textDecoration: 'none', color: 'var(--text)', background: 'var(--surface-2)', border: '1px solid var(--border-strong)', padding: '13px 26px', borderRadius: 'var(--radius-pill)' }}>
              Try an example
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section style={{ ...s.wrap, padding: '72px 24px' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 600, letterSpacing: -0.2 }}>{c.howHeading}</h2>
        <p style={{ margin: '0 0 36px', fontSize: 16, color: 'var(--text-soft)' }}>{c.howSubhead}</p>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 20 }}>
          {c.steps.map(([title, body], i) => (
            <li key={title} style={{ display: 'flex', gap: 18 }}>
              <span style={{ flexShrink: 0, width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--accent-subtle)', color: 'var(--accent)', fontSize: 15, fontWeight: 600 }}>{i + 1}</span>
              <div>
                <h3 style={{ margin: '4px 0 4px', fontSize: 17, fontWeight: 600 }}>{title}</h3>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: 'var(--text-soft)' }}>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Why ─────────────────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ ...s.wrap, padding: '72px 24px' }}>
          <h2 style={{ margin: '0 0 24px', fontSize: 28, fontWeight: 600, letterSpacing: -0.2 }}>{c.whyHeading}</h2>
          {c.whyParagraphs.map((para, i) => (
            <p key={i} style={{ margin: i === 0 ? '0 0 18px' : 0, fontSize: 16, lineHeight: 1.65, color: 'var(--text-soft)' }}>{para}</p>
          ))}
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section style={{ ...s.wrap, padding: '72px 24px' }}>
        <h2 style={{ margin: '0 0 32px', fontSize: 28, fontWeight: 600, letterSpacing: -0.2 }}>Frequently asked questions</h2>
        <div style={{ display: 'grid', gap: 28 }}>
          {c.faqs.map(([q, a]) => (
            <div key={q}>
              <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 600 }}>{q}</h3>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--text-soft)' }}>{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid var(--border)' }}>
        <div style={{ ...s.wrap, padding: '72px 24px 64px', textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 700, letterSpacing: -0.3 }}>{c.finalHeading}</h2>
          <p style={{ margin: '0 auto 28px', fontSize: 17, color: 'var(--text-soft)', maxWidth: 480 }}>{c.finalSubhead}</p>
          <Link href="/" style={{ display: 'inline-block', fontSize: 16, fontWeight: 600, textDecoration: 'none', color: '#fff', background: '#D06523', padding: '15px 32px', borderRadius: 'var(--radius-pill)' }}>
            {c.primaryCta}
          </Link>
        </div>
      </section>

      {/* ── Related (internal links) ────────────────────────────── */}
      <section style={{ borderTop: '1px solid var(--border)' }}>
        <div style={{ ...s.wrap, padding: '40px 24px' }}>
          <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 600, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--text-faint)' }}>
            More ways to use Reframe
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {related.map(r => (
              <Link key={r.path} href={r.path} style={{ fontSize: 14, textDecoration: 'none', color: 'var(--text-soft)', background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '8px 14px', borderRadius: 'var(--radius-pill)' }}>
                {r.label} →
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--border)' }}>
        <div style={{ ...s.wrap, padding: '28px 24px 56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>
            © {new Date().getFullYear()} Reframe — free online SVG animator.
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            {/* Product Hunt — reciprocal link / trust signal */}
            <a
              href="https://www.producthunt.com/products/reframe-3"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Find Reframe on Product Hunt"
              style={{ display: 'inline-flex', lineHeight: 0 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://api.producthunt.com/widgets/embed-image/v1/follow.svg?product_id=1188299&theme=dark"
                alt="Follow Reframe on Product Hunt"
                width={86}
                height={32}
                style={{ display: 'block', height: 32, width: 'auto' }}
              />
            </a>
            <Link href="/" style={{ fontSize: 13, color: 'var(--text-soft)', textDecoration: 'none' }}>reframeo.com →</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
