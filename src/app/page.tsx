// The editor is fully client-side (animations, file I/O, canvas).
// We render it from a server component so Next.js can still apply
// layout-level streaming and metadata without shipping server code
// into the client bundle.

import { EditorLayout } from '@/components/editor/EditorLayout'

export default function EditorPage() {
  return <EditorLayout />
}
