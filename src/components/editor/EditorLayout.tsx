'use client'

import { PresetBrowser } from './PresetBrowser'
import { PreviewStage } from './PreviewStage'
import { ControlsPanel } from './ControlsPanel'
import { ExportPanel } from './ExportPanel'
import { useEditorStore } from '@/lib/store/editor'

export function EditorLayout() {
  const svgFileName = useEditorStore(s => s.svgFileName)

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg text-[var(--text)]">
      {/* ── Titlebar ─────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center h-[38px] px-4 bg-surface border-b border-border gap-3 select-none">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="6" height="6" rx="1.5" fill="#7c5cfc"/>
            <rect x="9" y="1" width="6" height="6" rx="1.5" fill="#7c5cfc" opacity=".5"/>
            <rect x="1" y="9" width="6" height="6" rx="1.5" fill="#7c5cfc" opacity=".5"/>
            <rect x="9" y="9" width="6" height="6" rx="1.5" fill="#7c5cfc"/>
          </svg>
          <span className="text-xs font-semibold tracking-[-0.2px] text-[var(--text)]">Reframe</span>
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-border flex-shrink-0" />

        {/* File name */}
        <div className="flex-1 min-w-0">
          {svgFileName ? (
            <span className="text-xs text-muted truncate block max-w-[260px]">{svgFileName}</span>
          ) : (
            <span className="text-xs text-muted/50 italic">No file open</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => document.querySelector<HTMLInputElement>('input[type="file"][accept]')?.click()}
            className="h-[26px] px-2.5 text-xs text-muted hover:text-[var(--text)] hover:bg-surface-2 rounded transition-colors"
          >
            Open SVG
          </button>
          <button className="h-[26px] px-2.5 text-xs bg-accent hover:bg-accent-hover text-white rounded transition-colors font-medium">
            Sign in
          </button>
        </div>
      </header>

      {/* ── Three-column workspace ────────────────────────── */}
      <main className="flex flex-1 overflow-hidden">
        <PresetBrowser />
        <PreviewStage />

        {/* Right panel */}
        <aside className="w-[252px] flex-shrink-0 flex flex-col bg-surface border-l border-border overflow-hidden">
          <ControlsPanel />
          <ExportPanel />
        </aside>
      </main>
    </div>
  )
}
