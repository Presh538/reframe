// The editor is fully client-side (animations, file I/O, canvas).
//
// EditorLayout is lazy-loaded (ssr: false) so the server immediately streams
// the loading skeleton — that's what triggers FCP (~TTFB + a few ms).
// The full JS bundle (motion/react, SVG utilities, etc.) then downloads in
// parallel and replaces the skeleton once ready.  Without this, Next.js would
// SSR an empty shell, the browser would get it quickly but see nothing
// meaningful until the entire bundle parsed and hydrated — hence the 5 s FCP.

import dynamic from 'next/dynamic'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import Loading from './loading'

const EditorLayout = dynamic(
  () => import('@/components/editor/EditorLayout').then(m => ({ default: m.EditorLayout })),
  {
    ssr:     false,         // don't SSR an empty shell — serve the real skeleton instead
    loading: () => <Loading />,  // painted immediately while the bundle downloads
  }
)

export default function EditorPage() {
  return (
    <ErrorBoundary>
      <EditorLayout />
    </ErrorBoundary>
  )
}
