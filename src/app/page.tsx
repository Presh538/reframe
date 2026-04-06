// The editor is fully client-side (animations, file I/O, canvas).
// We render it from a server component so Next.js can still apply
// layout-level streaming and metadata without shipping server code
// into the client bundle.
//
// Suspense triggers loading.tsx immediately (server-rendered) so the
// browser gets a painted canvas shell for FCP before any JS downloads.

import { Suspense } from 'react'
import { EditorLayout } from '@/components/editor/EditorLayout'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

export default function EditorPage() {
  return (
    <ErrorBoundary>
      <Suspense>
        <EditorLayout />
      </Suspense>
    </ErrorBoundary>
  )
}
