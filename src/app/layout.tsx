import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ToastProvider } from '@/components/ui/Toast'
import { MobileGate } from '@/components/ui/MobileGate'
import './globals.css'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://reframe.so'
const APP_NAME = 'Reframe'
const TITLE = 'Reframe — Animate your SVGs in seconds'
const DESCRIPTION =
  'Upload your SVG, pick from 30+ animation presets, fine-tune speed and timing, and export as GIF or Lottie. No code. No After Effects. Just instant motion.'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),

  title: {
    default: TITLE,
    template: `%s — ${APP_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: APP_NAME,
  keywords: [
    'SVG animation',
    'SVG animator',
    'animate SVG',
    'Lottie export',
    'GIF export',
    'motion design',
    'design tool',
    'no-code animation',
    'SVG to GIF',
    'SVG to Lottie',
    'web animation',
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
        url: '/og.png',
        width: 2400,
        height: 1260,
        alt: 'Reframe — Animate your SVGs in seconds',
        type: 'image/png',
      },
    ],
  },

  // ── Twitter / X ─────────────────────────────────────────────────
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og.png'],
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={GeistSans.className}>
        <MobileGate />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
