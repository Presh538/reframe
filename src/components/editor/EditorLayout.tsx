'use client'

import dynamic from 'next/dynamic'
import { PreviewStage } from './PreviewStage'

// Lazy-load heavy UI panels — not needed for initial paint
const TopBar             = dynamic(() => import('./TopBar').then(m => ({ default: m.TopBar })),                       { ssr: false })
const LeftSidebar        = dynamic(() => import('./LeftSidebar').then(m => ({ default: m.LeftSidebar })),             { ssr: false })
const RightControlsPanel = dynamic(() => import('./RightControlsPanel').then(m => ({ default: m.RightControlsPanel })), { ssr: false })
const BottomBar          = dynamic(() => import('./BottomBar').then(m => ({ default: m.BottomBar })),                 { ssr: false })

export function EditorLayout() {
  return (
    <div className="relative h-screen w-screen overflow-hidden canvas-bg">
      {/* Full-canvas preview */}
      <PreviewStage />

      {/* Floating UI layers */}
      <LeftSidebar />
      <TopBar />
      <RightControlsPanel />
      <BottomBar />
    </div>
  )
}
