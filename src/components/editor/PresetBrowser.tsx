'use client'

import { clsx } from 'clsx'
import { CATEGORIES, getPresetsByCategory } from '@/lib/presets'
import { useEditorStore } from '@/lib/store/editor'
import type { PresetCategory } from '@/types'

export function PresetBrowser() {
  const activePresetId = useEditorStore(s => s.activePresetId)
  const setActivePreset = useEditorStore(s => s.setActivePreset)

  return (
    <aside className="w-[200px] flex-shrink-0 flex flex-col bg-surface border-r border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-3 h-[34px] border-b border-border flex-shrink-0">
        <span className="text-2xs font-semibold uppercase tracking-[0.7px] text-muted">Presets</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-1">
        {CATEGORIES.map(cat => (
          <CategorySection
            key={cat}
            category={cat}
            activeId={activePresetId}
            onSelect={setActivePreset}
          />
        ))}
      </div>
    </aside>
  )
}

function CategorySection({
  category,
  activeId,
  onSelect,
}: {
  category: PresetCategory
  activeId: string | null
  onSelect: (id: string) => void
}) {
  const presets = getPresetsByCategory(category)

  return (
    <div>
      <p className="px-3 pt-3 pb-1 text-2xs font-semibold uppercase tracking-[0.6px] text-faint">
        {category}
      </p>

      {presets.map(preset => {
        const isActive = activeId === preset.id
        return (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.id)}
            className={clsx(
              'relative w-full flex items-center gap-2.5 px-3 py-[6px] text-left transition-colors duration-100',
              isActive
                ? 'bg-accent/[0.12] text-[var(--text)]'
                : 'text-soft hover:bg-surface-2 hover:text-[var(--text)]'
            )}
          >
            {/* Active bar */}
            {isActive && (
              <span className="absolute left-0 top-[5px] bottom-[5px] w-[2px] bg-accent rounded-r" />
            )}

            {/* Icon chip */}
            <span
              className={clsx(
                'w-[28px] h-[28px] flex-shrink-0 flex items-center justify-center text-[13px] rounded',
                isActive ? 'bg-accent/20' : 'bg-surface-3'
              )}
              aria-hidden
            >
              {preset.icon}
            </span>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium truncate">{preset.name}</span>
                {preset.pro && (
                  <span className="flex-shrink-0 text-[8px] font-bold px-1 py-px rounded-sm bg-warning/15 text-warning tracking-wide">
                    PRO
                  </span>
                )}
              </div>
              <p className="text-2xs text-faint mt-px">{preset.category}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
