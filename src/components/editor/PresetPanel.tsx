'use client'

import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import {
  Pencil, ArrowUp, Zap, Wind, Scissors, Paintbrush2, Layers,
  Activity, Heart, RotateCcw, PenLine, Target, Sparkles, Palette,
  LayoutGrid, AlignLeft, CheckCircle2, Loader2,
  ArrowRight, CloudFog, Keyboard, Expand, Droplets, LucideIcon,
} from 'lucide-react'
import { PRESETS, CATEGORIES, getPresetsByCategory } from '@/lib/presets'
import { useEditorStore } from '@/lib/store/editor'
import type { PresetCategory } from '@/types'

interface PresetPanelProps {
  onClose: () => void
}

// ── Icon mapping per preset ID ───────────────────────────────────
const PRESET_ICONS: Record<string, LucideIcon> = {
  // Logo presets
  'draw-on':        Pencil,
  'fade-up-scale':  ArrowUp,
  'bounce-in':      Zap,
  'blur-rise':      CloudFog,
  'skew-reveal':    Scissors,
  'fill-reveal':    Paintbrush2,
  'cascade':        Layers,
  // Icon presets
  'wiggle':         Activity,
  'pulse-breathe':  Heart,
  'spin-loop':      RotateCcw,
  'path-in':        PenLine,
  'pop-settle':     Target,
  'glow-pulse':     Sparkles,
  'color-pop':      Palette,
  // Illustration presets
  'float-loop':     Wind,
  'shake':          Activity,
  'wave-path':      Activity,
  'scale-stagger':  LayoutGrid,
  'stagger-reveal': AlignLeft,
  // UI presets
  'checkmark-draw': CheckCircle2,
  'loading-spin':   Loader2,
  'arrow-slide-in': ArrowRight,
  'fade-blur':      CloudFog,
  // Premium presets
  'typewriter':     Keyboard,
  'elastic-unfold': Expand,
  'liquid-morph':   Droplets,
  'hue-sweep':      Palette,
}

const PANEL_HEIGHT = 480

const f: React.CSSProperties = {
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

      {/* Panel — centered horizontally, 4px below the tab bar */}
      <motion.div
        className="fixed left-1/2 z-30"
        style={{ top: 72, translateX: '-50%' }}
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -6 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
      >
        <div style={{
          width: 396,
          height: PANEL_HEIGHT,
          padding: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          borderRadius: 14,
          background: 'rgba(251,251,251,0.80)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
        }}>

          {/* Search bar */}
          <div style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(255,255,255,0.55)',
            border: '1px solid rgba(255,255,255,0.9)',
            borderRadius: 9,
            padding: '7px 10px',
          }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, opacity: 0.38 }}>
              <circle cx="6.5" cy="6.5" r="4" stroke="#111" strokeWidth="1.4"/>
              <path d="M9.5 9.5L12.5 12.5" stroke="#111" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input
              placeholder="Search presets…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
              style={{
                ...f,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: 13,
                lineHeight: '20px',
                color: '#111',
                width: '100%',
                caretColor: '#3f37c9',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0, display: 'flex' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3L11 11M11 3L3 11" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>

          {/* Scrollable list */}
          <div
            className="scrollbar-thin"
            style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
          >
            {searchResults ? (
              searchResults.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {searchResults.map(preset => (
                    <Row
                      key={preset.id}
                      preset={preset}
                      isActive={activePresetId === preset.id}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              ) : (
                <p style={{ ...f, textAlign: 'center', fontSize: 12, color: '#aaa', padding: '20px 0' }}>
                  No presets found
                </p>
              )
            ) : (
              CATEGORIES.map(cat => (
                <Group
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

// ── Category group ───────────────────────────────────────────────

function Group({
  category, activeId, onSelect,
}: {
  category: PresetCategory
  activeId: string | null
  onSelect: (id: string) => void
}) {
  const presets = getPresetsByCategory(category)
  if (!presets.length) return null

  return (
    <div style={{ marginBottom: 4 }}>
      <p style={{
        ...f,
        fontSize: 11,
        fontWeight: 400,
        lineHeight: '16px',
        color: '#afafaf',
        padding: '6px 8px 2px',
        margin: 0,
      }}>
        {category}
      </p>
      {presets.map(preset => (
        <Row
          key={preset.id}
          preset={preset}
          isActive={activeId === preset.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

// ── Row ─────────────────────────────────────────────────────────

function Row({
  preset,
  isActive,
  onSelect,
}: {
  preset: { id: string; name: string; icon: string; pro?: boolean }
  isActive: boolean
  onSelect: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const Icon = PRESET_ICONS[preset.id]

  return (
    <button
      onClick={() => onSelect(preset.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        borderRadius: 8,
        border: 'none',
        background: isActive ? 'rgba(63,55,201,0.08)' : hovered ? 'rgba(0,0,0,0.04)' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.1s',
      }}
    >
      {/* Icon */}
      <span style={{
        width: 20,
        height: 20,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isActive ? '#3f37c9' : '#888',
      }}>
        {Icon
          ? <Icon size={14} strokeWidth={1.8} />
          : <span style={{ fontSize: 13, lineHeight: 1 }}>{preset.icon}</span>
        }
      </span>

      {/* Name */}
      <span style={{
        ...f,
        fontWeight: isActive ? 500 : 400,
        fontSize: 13,
        lineHeight: '20px',
        color: isActive ? '#111' : '#3d3d3d',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flex: 1,
      }}>
        {preset.name}
      </span>

      {/* PRO badge */}
      {preset.pro && (
        <span style={{
          ...f,
          flexShrink: 0,
          fontSize: 9,
          fontWeight: 600,
          padding: '2px 5px',
          borderRadius: 4,
          background: 'rgba(245,166,35,0.12)',
          color: '#c07a12',
          letterSpacing: '0.04em',
          lineHeight: '14px',
        }}>
          PRO
        </span>
      )}
    </button>
  )
}
