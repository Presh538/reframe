import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ToastProvider } from '@/components/ui/Toast'
import { MobileGate } from '@/components/ui/MobileGate'
import './globals.css'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://reframeo.com'
const APP_NAME = 'Reframe'
const TITLE = 'Reframe — Free SVG Animator Online'
const DESCRIPTION =
  'The easiest SVG animator online. Upload any SVG, pick from 30+ animation presets, fine-tune speed and easing, then export as GIF, CSS, or Lottie JSON. No code, no After Effects — just instant motion in seconds.'

const OG_IMAGE = 'https://ik.imagekit.io/legacystudio/Reframe/Meta%20Image.png'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),

  title: {
    default: TITLE,
    template: `%s — ${APP_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: APP_NAME,
  keywords: [
    'SVG animator',
    'SVG animation online',
    'animate SVG online',
    'free SVG animation tool',
    'SVG to GIF',
    'SVG to Lottie',
    'SVG to CSS animation',
    'Lottie JSON export',
    'GIF export',
    'CSS animation generator',
    'no-code animation',
    'logo animation',
    'icon animation',
    'motion design tool',
    'web animation tool',
    'animate logo SVG',
    'SVG motion',
    'Lottie creator',
  ],
  authors: [{ name: APP_NAME, url: APP_URL }],
  creator: APP_NAME,
  publisher: APP_NAME,

  // ── Open Graph ──────────────────────────────────────────────────
  openGraph: {
    type: 'website',
    url: APP_URL,
    siteName: APP_NAME,
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_US',
    images: [
      {
        url: OG_IMAGE,
        width: 2400,
        height: 1260,
        alt: 'Reframe — Free SVG Animator Online',
        type: 'image/png',
      },
    ],
  },

  // ── Twitter / X ─────────────────────────────────────────────────
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },

  // ── Google Search Console verification ──────────────────────────
  verification: {
    google: 'google49b892ae08a2d470',
  },

  // ── Icons ────────────────────────────────────────────────────────
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },

  // ── Robots ───────────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // ── Canonical ────────────────────────────────────────────────────
  alternates: {
    canonical: APP_URL,
  },
}

export const viewport: Viewport = {
  themeColor: '#e8e8e8',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: APP_NAME,
  url: APP_URL,
  description: DESCRIPTION,
  applicationCategory: 'DesignApplication',
  applicationSubCategory: 'SVG Animation Tool',
  operatingSystem: 'Web',
  browserRequirements: 'Requires JavaScript. Works in all modern browsers.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  screenshot: OG_IMAGE,
  image: OG_IMAGE,
  featureList: [
    '30+ animation presets',
    'Export animated SVG as GIF',
    'Export as CSS animation',
    'Export as Lottie JSON',
    'Transparent background GIF',
    'No code required',
    'Drag and drop SVG upload',
    'Speed and easing controls',
    'Per-element animation targeting',
  ],
  author: {
    '@type': 'Organization',
    name: APP_NAME,
    url: APP_URL,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className={GeistSans.className}>
        {/* JSON-LD — structured data for Google rich results and AI search tools */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <MobileGate />
        <ToastProvider>{children}</ToastProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
