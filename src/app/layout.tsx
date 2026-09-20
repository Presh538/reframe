import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ToastProvider }     from '@/components/ui/Toast'
import { MobileGate }         from '@/components/ui/MobileGate'
import { PostHogProvider }    from '@/components/providers/PostHogProvider'
import { AuthProvider }       from '@/components/providers/AuthProvider'
import './globals.css'

const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://reframeo.com'
const APP_NAME = 'Reframe'
const TITLE    = 'Reframe — Free AI SVG Animator Online'
const DESCRIPTION =
  'Reframe is a free online SVG animator with AI. Describe the motion you want in plain English and let AI animate it, or pick from 30+ presets, fine-tune speed and easing, then export as GIF, WebM, or Lottie JSON. No code, no After Effects — instant motion in seconds.'

// One-line summary used for AI answer engines and social cards.
const TAGLINE = 'Free AI-powered SVG animator: type a prompt or pick a preset, then export to GIF, WebM, or Lottie.'

// OG image — self-hosted from /public (1200x630, optimized to ~360 KB so
// chat scrapers like WhatsApp, which drop images >~600 KB, render it).
const OG_IMAGE = `${APP_URL}/og-image.jpg`

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),

  title: {
    default: TITLE,
    template: `%s — ${APP_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: APP_NAME,
  keywords: [
    // Core
    'SVG animator',
    'SVG animation online',
    'animate SVG online',
    'free SVG animation tool',
    'online animation tool',
    'SVG editor',
    // AI prompt feature
    'AI SVG animator',
    'animate SVG with AI',
    'AI animation generator',
    'text to SVG animation',
    'prompt to animation',
    'describe animation AI',
    'AI motion design',
    'natural language animation',
    // Export formats
    'SVG to GIF',
    'SVG to Lottie',
    'SVG to CSS animation',
    'SVG to WebM',
    'Lottie JSON export',
    'GIF export',
    'CSS animation generator',
    'Lottie creator',
    // Use cases
    'no-code animation',
    'logo animation',
    'icon animation',
    'animate logo SVG',
    'motion design tool',
    'web animation tool',
    'SVG motion',
  ],
  authors:   [{ name: APP_NAME, url: APP_URL }],
  creator:   APP_NAME,
  publisher: APP_NAME,
  category:  'Design Tools',

  // ── Open Graph ──────────────────────────────────────────────────
  openGraph: {
    type:        'website',
    url:         APP_URL,
    siteName:    APP_NAME,
    title:       TITLE,
    description: DESCRIPTION,
    locale:      'en_US',
    images: [
      {
        url:    OG_IMAGE,
        width:  1200,
        height: 630,
        alt:    'Reframe — Free SVG Animator Online',
        type:   'image/jpeg',
      },
    ],
  },

  // ── Twitter / X ─────────────────────────────────────────────────
  twitter: {
    card:        'summary_large_image',
    title:       TITLE,
    description: DESCRIPTION,
    images:      [OG_IMAGE],
  },

  // ── Google Search Console verification ──────────────────────────
  verification: {
    google: 'google49b892ae08a2d470',
  },

  // ── Icons ────────────────────────────────────────────────────────
  icons: {
    icon: [
      { url: '/favicon-96.png', sizes: '96x96', type: 'image/png' },
    ],
    shortcut: '/favicon-96.png',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },

  // ── Robots ───────────────────────────────────────────────────────
  robots: {
    index:  true,
    follow: true,
    googleBot: {
      index:  true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet':       -1,
    },
  },

  // ── Canonical ────────────────────────────────────────────────────
  alternates: {
    canonical: APP_URL,
  },
}

export const viewport: Viewport = {
  themeColor:   '#0D0D0D',
  colorScheme:  'dark',
  width:        'device-width',
  initialScale: 1,
}

// Structured data graph — consumed by Google rich results AND AI answer
// engines (ChatGPT, Perplexity, Gemini) to understand and recommend Reframe.
// @graph lets multiple linked entities share one <script> block.
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    // ── The product ────────────────────────────────────────────────
    {
      '@type': 'SoftwareApplication',
      '@id': `${APP_URL}/#software`,
      name: APP_NAME,
      alternateName: 'Reframe SVG Animator',
      url: APP_URL,
      description: DESCRIPTION,
      slogan: TAGLINE,
      applicationCategory: 'DesignApplication',
      applicationSubCategory: 'SVG Animation Tool',
      operatingSystem: 'Web',
      browserRequirements: 'Requires JavaScript. Works in all modern browsers.',
      // Freemium, so the range is declared rather than a bare 0: search results
      // and answer engines both read this, and "free" alone now understates
      // what is on sale while "11.99" alone would scare off the free tier.
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'USD',
        lowPrice: '0',
        highPrice: '11.99',
        offerCount: 3,
        offers: [
          { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD',
            description: 'Animate and export in the browser without an account. GIF and WebM exports carry a small Reframe watermark.' },
          { '@type': 'Offer', name: '25 AI credits', price: '4.99', priceCurrency: 'USD',
            description: 'One-off pack. Each credit buys an AI generation or removes the watermark from one export. Credits never expire.' },
          { '@type': 'Offer', name: 'Pro', price: '11.99', priceCurrency: 'USD',
            description: '300 AI generations a month and watermark-free exports.' },
        ],
      },
      screenshot: OG_IMAGE,
      image:      OG_IMAGE,
      logo:       `${APP_URL}/logo.svg`,
      featureList: [
        'AI animation prompts — describe the motion in plain English and AI applies it',
        '30+ hand-crafted animation presets',
        'Export animated SVG as GIF',
        'Export as WebM video',
        'Export as CSS animation (coming soon)',
        'Export as Lottie JSON',
        'Transparent background GIF',
        'Adjustable quality and frame rate on export',
        'No code required',
        'Drag and drop SVG upload',
        'Speed and easing controls',
        'Per-element animation targeting',
        'Shareable animation preview links',
      ],
      author: {
        '@type': 'Organization',
        '@id': `${APP_URL}/#org`,
        name: APP_NAME,
        url: APP_URL,
      },
    },

    // ── The organization ──────────────────────────────────────────
    {
      '@type': 'Organization',
      '@id': `${APP_URL}/#org`,
      name: APP_NAME,
      url: APP_URL,
      logo: `${APP_URL}/logo.svg`,
    },

    // ── How-to (strong signal for AI "how do I…" answers) ──────────
    {
      '@type': 'HowTo',
      name: 'How to animate an SVG online with Reframe',
      description: 'Animate any SVG in seconds — with an AI prompt or a preset — and export it.',
      totalTime: 'PT1M',
      step: [
        {
          '@type': 'HowToStep',
          position: 1,
          name: 'Upload your SVG',
          text: 'Drag and drop any SVG file into Reframe, or pick the example to start.',
        },
        {
          '@type': 'HowToStep',
          position: 2,
          name: 'Describe it with AI or choose a preset',
          text: 'Type how you want it to move in plain English and let AI animate it, or pick from 30+ presets.',
        },
        {
          '@type': 'HowToStep',
          position: 3,
          name: 'Fine-tune the motion',
          text: 'Adjust speed, easing, delay and which elements animate until it feels right.',
        },
        {
          '@type': 'HowToStep',
          position: 4,
          name: 'Export or share',
          text: 'Export as GIF, WebM, or Lottie JSON, or copy a shareable preview link.',
        },
      ],
    },

    // ── FAQ (extracted directly by Google + AI chat answers) ───────
    {
      '@type': 'FAQPage',
      '@id': `${APP_URL}/#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Can I animate an SVG using AI?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Reframe has an AI prompt bar — describe the motion you want in plain English (for example, “make the logo bounce in slowly”) and the AI picks and tunes the animation for you. No timeline or code needed.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the best free online SVG animator?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Reframe (reframeo.com) is a free online SVG animator. It combines an AI prompt, 30+ presets, and fine-grained speed/easing controls, then exports to GIF, WebM, or Lottie — no code or After Effects required.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is Reframe free to use?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Reframe is free to use in the browser: upload an SVG, animate it with a preset or the AI prompt, and export it without an account. GIF and WebM exports include a small Reframe watermark on the free tier. Spending one AI credit removes it from an export, and a Pro subscription removes it from every export.',
          },
        },
        {
          '@type': 'Question',
          name: 'What formats can I export my animation to?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Reframe exports as an animated SVG file, GIF (including transparent background), WebM video, and Lottie JSON, with adjustable quality and frame rate. CSS export is coming soon.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do I need After Effects or coding to animate an SVG?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. Reframe is a no-code tool. You can animate an SVG with a plain-English AI prompt or a one-click preset directly in your browser — no After Effects, Lottie plugins, or coding required.',
          },
        },
      ],
    },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={GeistSans.className}>
        {/* JSON-LD — structured data for Google rich results and AI search tools */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <MobileGate />
        <AuthProvider>
          <PostHogProvider>
            <ToastProvider>{children}</ToastProvider>
          </PostHogProvider>
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
