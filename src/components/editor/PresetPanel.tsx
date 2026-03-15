'use client'

import { useState } from 'react'
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
      {/* Backdrop — fixed so it covers the whole viewport */}
      <div
        className="fixed inset-0 z-20"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed left-4 z-30 pointer-events-auto animate-panel-in"
        style={{ top: 92 }}
      >
        <div
          style={{
            width: 260,
            background: 'rgba(251,251,251,0.95)',
            border: '1px solid rgba(255,255,255,0.9)',
            borderRadius: 20,
            boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
            backdropFilter: 'blur(16px)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 16px 12px',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              fontFamily: 'var(--font-geist-sans), sans-serif',
              fontWeight: 600,
              fontSize: 13,
              color: '#111',
            }}
          >
            Presets
          </div>

          {/* Scrollable list */}
          <div
            className="scrollbar-thin"
            style={{
              overflowY: 'auto',
              maxHeight: 'calc(100vh - 180px)',
              padding: '6px 0',
            }}
          >
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
      <p
        style={{
          padding: '10px 16px 4px',
          fontFamily: 'var(--font-geist-sans), sans-serif',
          fontWeight: 600,
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: '#aaa',
        }}
      >
        {category}
      </p>
      {presets.map(preset => (
        <PresetRow
          key={preset.id}
          preset={preset}
          isActive={activeId === preset.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

function PresetRow({
  preset,
  isActive,
  onSelect,
}: {
  preset: { id: string; name: string; icon: string; pro?: boolean }
  isActive: boolean
  onSelect: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)

  const rowBg = isActive
    ? 'rgba(63,55,201,0.07)'
    : hovered
    ? 'rgba(0,0,0,0.04)'
    : 'transparent'

  return (
    <button
      onClick={() => onSelect(preset.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 12px',
        border: 'none',
        background: rowBg,
        cursor: 'pointer',
        transition: 'background 0.1s',
        textAlign: 'left',
      }}
    >
      {/* Active left bar */}
      {isActive && (
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: 6,
            bottom: 6,
            width: 2,
            background: '#3f37c9',
            borderRadius: '0 2px 2px 0',
          }}
        />
      )}

      {/* Icon */}
      <span
        style={{
          width: 28,
          height: 28,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          borderRadius: 8,
          background: isActive ? 'rgba(63,55,201,0.15)' : 'rgba(0,0,0,0.05)',
          transition: 'background 0.1s',
        }}
      >
        {preset.icon}
      </span>

      {/* Name + PRO badge */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontFamily: 'var(--font-geist-sans), sans-serif',
              fontWeight: isActive ? 600 : 500,
              fontSize: 12,
              color: isActive ? '#3f37c9' : '#111',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              transition: 'color 0.1s',
            }}
          >
            {preset.name}
          </span>
          {preset.pro && (
            <span
              style={{
                flexShrink: 0,
                fontSize: 8,
                fontWeight: 700,
                padding: '1px 4px',
                borderRadius: 4,
                background: 'rgba(245,166,35,0.15)',
                color: '#c77c1a',
                letterSpacing: '0.05em',
              }}
            >
              PRO
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
