'use client'

// next/dynamic with ssr: false must live in a Client Component — Server
// Components don't support it.  This thin wrapper is the only reason this
// file exists; page.tsx (Server Component) imports EditorLayoutClient instead
// of calling dynamic() directly.

import dynamic from 'next/dynamic'
import Loading from './loading'

export const EditorLayoutClient = dynamic(
  () => import('@/components/editor/EditorLayout').then(m => ({ default: m.EditorLayout })),
  {
    ssr:     false,
    loading: () => <Loading />,
  }
)
