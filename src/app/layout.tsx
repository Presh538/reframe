import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ToastProvider } from '@/components/ui/Toast'
import { MobileGate } from '@/components/ui/MobileGate'
import './globals.css'

export const metadata: Metadata = {
  title: 'The Reframe — SVG Animator',
  description:
    'Upload SVG → Pick preset → Tweak → Export. The fastest way to animate SVGs. Under 2 minutes.',
  keywords: ['SVG animation', 'Lottie', 'GIF export', 'motion design', 'design tool'],
  authors: [{ name: 'The Reframe' }],
  openGraph: {
    title: 'The Reframe — SVG Animator',
    description: 'Upload SVG → Pick preset → Tweak → Export.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#e8e8e8',
  colorScheme: 'light',
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
