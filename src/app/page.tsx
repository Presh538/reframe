// Server Component — renders instantly, streams the loading skeleton to the
// browser while the client bundle downloads in the background.
//
// EditorLayoutClient is a thin 'use client' wrapper around next/dynamic
// (ssr: false is only valid inside Client Components in Next.js 15+).

import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { EditorLayoutClient } from './editor-client'

export default function EditorPage() {
  return (
    <ErrorBoundary>
      <EditorLayoutClient />
    </ErrorBoundary>
  )
}
