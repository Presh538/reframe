'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { AnimatePresence } from 'motion/react'
import { PreviewStage } from './PreviewStage'
import { TopBar } from './TopBar'

// Lazy-load heavy panels — only needed when the user opens them
const PresetPanel    = dynamic(() => import('./PresetPanel').then(m => ({ default: m.PresetPanel })),       { ssr: false })
const SmoothingPanel = dynamic(() => import('./SmoothingPanel').then(m => ({ default: m.SmoothingPanel })), { ssr: false })

// Lazy-load BottomBar — large icon + motion bundle, not needed for initial paint
const BottomBar = dynamic(() => import('./BottomBar').then(m => ({ default: m.BottomBar })), { ssr: false })

type ActiveTab = 'presets' | 'smoothing'

export function EditorLayout() {
  const [activeTab, setActiveTab] = useState<ActiveTab | null>(null)

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(prev => prev === tab ? null : tab)
  }

  const closePanel = () => setActiveTab(null)

  return (
    <div className="relative h-screen w-screen overflow-hidden canvas-bg">
      {/* Full-canvas preview */}
      <PreviewStage />

      {/* Floating UI layers */}
      <TopBar
        activeTab={activeTab ?? 'presets'}
        onTabChange={handleTabChange}
      />

      {/* Panels with spring enter + exit */}
      <AnimatePresence>
        {activeTab === 'presets'   && <PresetPanel    key="presets"   onClose={closePanel} />}
        {activeTab === 'smoothing' && <SmoothingPanel key="smoothing" onClose={closePanel} />}
      </AnimatePresence>

      <BottomBar />
    </div>
  )
}
