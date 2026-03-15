'use client'

import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { PRESETS, CATEGORIES, getPresetsByCategory } from '@/lib/presets'
import { useEditorStore } from '@/lib/store/editor'
import type { PresetCategory } from '@/types'

interface PresetPanelProps {
  onClose: () => void
}

const font: React.CSSProperties = {
  fontFamily: 'var(--font-geist-sans), sans-serif',
}

export function PresetPanel({ onClose }: PresetPanelProps) {
  const [query, setQuery] = useState('')
  const activePresetId  = useEditorStore(s => s.activePresetId)
  const setActivePreset = useEditorStore(s => s.setActivePreset)

  const handleSelect = (id: string) => {
    setActivePreset(id)
    onClose()
  }

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return PRESETS.filter(p => p.name.toLowerCase().includes(q))
  }, [query])

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-20" onClick={onClose} />

      {/* Panel — centered below the top tabs */}
      <motion.div
        className="fixed left-1/2 -translate-x-1/2 z-30 pointer-events-auto"
        style={{ top: 88 }}
        initial={{ opacity: 0, y: -10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
      >
        <div style={{
          width: 300,
          background: 'rgba(251,251,251,0.6)',
          border: '1px solid rgba(255,255,255,0.9)',
          borderRadius: 14,
          boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>

          {/* Search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(255,255,255,0.4)',
            border: '1px solid white',
            borderRadius: 9,
            padding: '6px 8px',
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, opacity: 0.45 }}>
              <path fillRule="evenodd" clipRule="evenodd" d="M8.25 3C5.3505 3 3 5.3505 3 8.25C3 11.1495 5.3505 13.5 8.25 13.5C9.546 13.5 10.7325 13.023 11.646 12.234L14.457 15.045C14.748 15.336 15.219 15.336 15.51 15.045C15.801 14.754 15.801 14.283 15.51 13.992L12.699 11.181C13.4895 10.2675 14.4 9.03 14.4 8.25C14.4 5.3505 12.1497 3 9.25 3H8.25ZM4.5 8.25C4.5 6.1785 6.1785 4.5 8.25 4.5C10.3215 4.5 12 6.1785 12 8.25C12 10.3215 10.3215 12 8.25 12C6.1785 12 4.5 10.3215 4.5 8.25Z" fill="#111111"/>
            </svg>
            <input
              placeholder="Search..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
              style={{
                ...font,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: 12,
                color: '#111',
                width: '100%',
                caretColor: '#3f37c9',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: '#aaa', lineHeight: 1, flexShrink: 0 }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3L11 11M11 3L3 11" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>

          {/* List */}
          <div
            className="scrollbar-thin"
            style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}
          >
            {searchResults ? (
              /* ── Search results ── */
              searchResults.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {searchResults.map(preset => (
                    <MenuItem
                      key={preset.id}
                      preset={preset}
                      isActive={activePresetId === preset.id}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              ) : (
                <p style={{ ...font, textAlign: 'center', fontSize: 12, color: '#aaa', padding: '16px 0' }}>
                  No presets found
                </p>
              )
            ) : (
              /* ── Categorised list ── */
              CATEGORIES.map(cat => (
                <CategorySection
                  key={cat}
                  category={cat}
                  activeId={activePresetId}
                  onSelect={handleSelect}
                />
              ))
            )}
          </div>

        </div>
      </motion.div>
    </>
  )
}

// ── Category section ────────────────────────────────────────────

function CategorySection({
  category, activeId, onSelect,
}: {
  category: PresetCategory
  activeId: string | null
  onSelect: (id: string) => void
}) {
  const presets = getPresetsByCategory(category)
  if (!presets.length) return null

  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{
        fontFamily: 'var(--font-geist-sans), sans-serif',
        fontWeight: 400,
        fontSize: 12,
        color: '#afafaf',
        padding: '2px 8px 6px',
      }}>
        {category} presets
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {presets.map(preset => (
          <MenuItem
            key={preset.id}
            preset={preset}
            isActive={activeId === preset.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

// ── Menu item row ───────────────────────────────────────────────

function MenuItem({
  preset,
  isActive,
  onSelect,
}: {
  preset: { id: string; name: string; icon: string; pro?: boolean }
  isActive: boolean
  onSelect: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={() => onSelect(preset.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: 8,
        borderRadius: 8,
        border: 'none',
        background: isActive ? '#eeeeee' : hovered ? 'rgba(0,0,0,0.04)' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.1s',
      }}
    >
      {/* Icon */}
      <span style={{
        width: 16,
        height: 16,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        lineHeight: 1,
      }}>
        {preset.icon}
      </span>

      {/* Name */}
      <span style={{
        fontFamily: 'var(--font-geist-sans), sans-serif',
        fontWeight: 500,
        fontSize: 14,
        color: isActive ? '#111111' : '#545454',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flex: 1,
        transition: 'color 0.1s',
      }}>
        {preset.name}
      </span>

      {/* PRO badge */}
      {preset.pro && (
        <span style={{
          flexShrink: 0,
          fontSize: 8,
          fontWeight: 700,
          padding: '2px 5px',
          borderRadius: 4,
          background: 'rgba(245,166,35,0.15)',
          color: '#c77c1a',
          letterSpacing: '0.05em',
          fontFamily: 'var(--font-geist-sans), sans-serif',
        }}>
          PRO
        </span>
      )}
    </button>
  )
}
