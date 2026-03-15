'use client'

import { clsx } from 'clsx'
import { CATEGORIES, getPresetsByCategory } from '@/lib/presets'
import { useEditorStore } from '@/lib/store/editor'
import type { PresetCategory } from '@/types'

interface PresetPanelProps {
  onClose: () => void
}

export function PresetPanel({ onClose }: PresetPanelProps) {
  const activePresetId = useEditorStore(s => s.activePresetId)
  const setActivePreset = useEditorStore(s => s.setActivePreset)

  const handleSelect = (id: string) => {
    setActivePreset(id)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-20"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute left-4 top-[68px] z-30 w-[220px] bg-surface/95 backdrop-blur border border-border rounded-2xl shadow-2xl overflow-hidden animate-pop-in">
        <div className="flex items-center px-4 h-[40px] border-b border-border">
          <span className="text-2xs font-semibold uppercase tracking-[0.7px] text-muted">Presets</span>
        </div>

        <div className="overflow-y-auto max-h-[calc(100vh-160px)] scrollbar-thin py-1">
          {CATEGORIES.map(cat => (
            <CategorySection
              key={cat}
              category={cat}
              activeId={activePresetId}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </div>
    </>
  )
}

function CategorySection({
  category, activeId, onSelect,
}: {
  category: PresetCategory
  activeId: string | null
  onSelect: (id: string) => void
}) {
  const presets = getPresetsByCategory(category)
  return (
    <div>
      <p className="px-4 pt-3 pb-1 text-2xs font-semibold uppercase tracking-[0.6px] text-faint">
        {category}
      </p>
      {presets.map(preset => {
        const isActive = activeId === preset.id
        return (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.id)}
            className={clsx(
              'relative w-full flex items-center gap-2.5 px-4 py-[6px] text-left transition-colors duration-100',
              isActive
                ? 'bg-accent/[0.12] text-[var(--text)]'
                : 'text-soft hover:bg-surface-2 hover:text-[var(--text)]'
            )}
          >
            {isActive && (
              <span className="absolute left-0 top-[5px] bottom-[5px] w-[2px] bg-accent rounded-r" />
            )}
            <span className={clsx(
              'w-[28px] h-[28px] flex-shrink-0 flex items-center justify-center text-[13px] rounded-lg',
              isActive ? 'bg-accent/20' : 'bg-surface-3'
            )}>
              {preset.icon}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium truncate">{preset.name}</span>
                {preset.pro && (
                  <span className="flex-shrink-0 text-[8px] font-bold px-1 py-px rounded-sm bg-warning/15 text-warning tracking-wide">PRO</span>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
