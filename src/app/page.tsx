// Server Component — renders instantly, streams the loading skeleton to the
// browser while the client bundle downloads in the background.
//
// EditorLayoutClient is a thin 'use client' wrapper around next/dynamic
// (ssr: false is only valid inside Client Components in Next.js 15+).

import { preload } from 'react-dom'
import Link from 'next/link'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { MobileGate } from '@/components/ui/MobileGate'
import { LANDING_PAGES } from '@/lib/seo/pages'
import { EditorLayoutClient } from './editor-client'

export default function EditorPage() {
  // The editor renders client-side only, so the start modal's artwork (the
  // largest paint on a first visit) would otherwise be discovered only after
  // the editor bundle has loaded and run. Fetch it alongside the JS instead.
  // `type` makes browsers without AVIF skip the hint rather than waste bytes.
  preload('/figma-icons/start-modal-preview.avif', {
    as: 'image', type: 'image/avif', fetchPriority: 'high',
  })

  return (
    <>
      {/* The editor renders client-side only, so without this the homepage
          reaches crawlers and screen readers as an empty shell: no heading,
          no text, no links to the guides. It is server-rendered, describes
          exactly what the page is, and is visually hidden only because the
          editor fills the screen. Like a skip link, it appears while a
          keyboard user is tabbing through it, so no focus stop is invisible. */}
      <header className="sr-only focus-within:not-sr-only focus-within:fixed focus-within:left-4 focus-within:top-4 focus-within:z-[100] focus-within:max-w-sm focus-within:rounded-xl focus-within:bg-[#141414] focus-within:p-4 focus-within:text-sm focus-within:text-white focus-within:shadow-2xl">
        <h1>Reframe — free AI SVG animator</h1>
        <p>
          Upload an SVG and animate it in your browser: describe the motion in
          plain English or pick a preset, then export a GIF, WebM video or
          Lottie JSON.
        </p>
        <nav aria-label="Guides">
          <ul>
            {LANDING_PAGES.map(page => (
              <li key={page.path}><Link href={page.path}>{page.label}</Link></li>
            ))}
          </ul>
        </nav>
      </header>
      <MobileGate />
      <ErrorBoundary>
        <EditorLayoutClient />
      </ErrorBoundary>
    </>
  )
}
