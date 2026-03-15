'use client'

import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { PreviewStage } from './PreviewStage'
import { TopBar } from './TopBar'
import { BottomBar } from './BottomBar'
import { PresetPanel } from './PresetPanel'
import { SmoothingPanel } from './SmoothingPanel'

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
