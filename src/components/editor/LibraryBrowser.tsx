'use client'

/**
 * LibraryBrowser — full-screen SVG template gallery.
 *
 * Used in two contexts:
 *  1. Empty state  → rendered directly in the canvas area (no close button)
 *  2. Mid-session  → rendered as an overlay from the TopBar "Library" button
 *
 * Clicking a card parses the SVG, extracts layer info, and calls
 * useEditorStore.setSvgSource so the rest of the app picks it up
 * exactly as if the user had uploaded the file themselves.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  LIBRARY_ITEMS,
  LIBRARY_CATEGORIES,
  getLibraryItems,
  type LibraryCategory,
  type LibraryItem,
} from '@/lib/svg-library'
import { useEditorStore } from '@/lib/store/editor'
import { normalizeSvgElement, extractLayerInfo } from '@/lib/svg/sanitize'

interface LibraryBrowserProps {
  /** Called after a template is selected and loaded. */
  onClose?: () => void
  /** Called when the user clicks "Upload your own SVG". */
  onUpload?: () => void
  /** When true, renders as a floating overlay with a backdrop. */
  isModal?: boolean
  /**
   * Override the default behaviour (setSvgSource in the editor store).
   * Used by 3D mode, which manages its own asset state separately.
   */
  onSelectSvg?: (svg: string, name: string) => void
  /** Label for the upload button — defaults to "Upload SVG". */
  uploadLabel?: string
}

// ── Helpers ───────────────────────────────────────────────────────

function loadLibraryItem(item: LibraryItem, setSvgSource: (s: string, n: string, l: ReturnType<typeof extractLayerInfo>) => void) {
  const parser = new DOMParser()
  const doc    = parser.parseFromString(item.svg, 'image/svg+xml')
  const svgEl  = doc.querySelector('svg') as SVGSVGElement | null
  if (!svgEl) return
  normalizeSvgElement(svgEl)
  const layers = extractLayerInfo(svgEl)
  // Re-serialise after normalization so the stored source is clean
  const source = new XMLSerializer().serializeToString(svgEl)
  setSvgSource(source, `${item.name}.svg`, layers)
}

// ── Sub-components ────────────────────────────────────────────────

function CategoryTab({ id, label, active, onClick }: {
  id: LibraryCategory; label: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px',
        borderRadius: 34,
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font-geist-sans), sans-serif',
        fontWeight: 500,
        fontSize: 13,
        lineHeight: '20px',
        whiteSpace: 'nowrap',
        transition: 'background 0.15s, color 0.15s',
        background: active ? '#3f37c9'            : 'rgba(0,0,0,0.05)',
        color:      active ? 'white'              : '#545454',
        boxShadow:  active ? '0 1px 6px rgba(63,55,201,0.25)' : 'none',
      }}
    >
      {label}
    </button>
  )
}

function SVGCard({ item, onSelect }: { item: LibraryItem; onSelect: (item: LibraryItem) => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.button
      onClick={() => onSelect(item)}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={()  => setHovered(false)}
      initial={false}
      animate={{ scale: hovered ? 1.04 : 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      style={{
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           10,
        padding:       '16px 12px 14px',
        borderRadius:  16,
        border:        hovered ? '1.5px solid rgba(63,55,201,0.35)' : '1.5px solid rgba(0,0,0,0.06)',
        background:    hovered ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.82)',
        boxShadow:     hovered
          ? '0 8px 24px rgba(63,55,201,0.12), 0 2px 8px rgba(0,0,0,0.06)'
          : '0 1px 4px rgba(0,0,0,0.06)',
        cursor:        'pointer',
        transition:    'border 0.15s, background 0.15s, box-shadow 0.15s',
        width:         '100%',
      }}
    >
      {/* SVG preview */}
      <div
        style={{
          width: '100%',
          aspectRatio: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 10,
          background: 'rgba(0,0,0,0.02)',
          overflow: 'hidden',
          padding: 10,
        }}
        /* Library SVGs are authored by us — dangerouslySetInnerHTML is safe here */
        dangerouslySetInnerHTML={{ __html: item.svg }}
      />

      {/* Name */}
      <span style={{
        fontFamily: 'var(--font-geist-sans), sans-serif',
        fontWeight: 500,
        fontSize:   13,
        lineHeight: '18px',
        color:      hovered ? '#3f37c9' : '#545454',
        transition: 'color 0.15s',
      }}>
        {item.name}
      </span>
    </motion.button>
  )
}

// ── Main component ────────────────────────────────────────────────

export function LibraryBrowser({
  onClose, onUpload, isModal = false,
  onSelectSvg, uploadLabel = 'Upload SVG',
}: LibraryBrowserProps) {
  const [category, setCategory] = useState<LibraryCategory>('all')
  const setSvgSource = useEditorStore(s => s.setSvgSource)

  const items = getLibraryItems(category)

  const handleSelect = (item: LibraryItem) => {
    if (onSelectSvg) {
      // 3D mode (or any consumer that manages its own asset state)
      onSelectSvg(item.svg, `${item.name}.svg`)
    } else {
      // Flow mode — write directly into the editor store
      loadLibraryItem(item, setSvgSource)
    }
    onClose?.()
  }

  const content = (
    <div
      style={{
        position:  'absolute',
        inset:     0,
        display:   'flex',
        flexDirection: 'column',
        overflow:  'hidden',
      }}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '22px 28px 0',
        flexShrink:     0,
      }}>
        <div>
          <h2 style={{
            fontFamily: 'var(--font-geist-sans), sans-serif',
            fontWeight: 600,
            fontSize:   20,
            lineHeight: '28px',
            color:      '#111',
            margin:     0,
          }}>
            Start with a template
          </h2>
          <p style={{
            fontFamily: 'var(--font-geist-sans), sans-serif',
            fontWeight: 400,
            fontSize:   13,
            lineHeight: '20px',
            color:      '#888',
            margin:     '2px 0 0',
          }}>
            Click any template to animate it instantly
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onUpload && (
            <button
              onClick={onUpload}
              style={{
                padding:    '8px 16px',
                borderRadius: 34,
                border:     '1.5px solid rgba(0,0,0,0.12)',
                background: 'rgba(255,255,255,0.8)',
                fontFamily: 'var(--font-geist-sans), sans-serif',
                fontWeight: 500,
                fontSize:   13,
                color:      '#545454',
                cursor:     'pointer',
                transition: 'background 0.12s, border-color 0.12s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)' }}
            >
              {uploadLabel}
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close library"
              style={{
                width:      34,
                height:     34,
                borderRadius: '50%',
                border:     'none',
                background: 'rgba(0,0,0,0.07)',
                cursor:     'pointer',
                display:    'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.12s',
                flexShrink: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.13)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.07)')}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1L13 13M13 1L1 13" stroke="#545454" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Category tabs ────────────────────────────────────── */}
      <div style={{
        display:    'flex',
        gap:        6,
        padding:    '16px 28px 0',
        flexShrink: 0,
        flexWrap:   'wrap',
      }}>
        {LIBRARY_CATEGORIES.map(cat => (
          <CategoryTab
            key={cat.id}
            id={cat.id}
            label={cat.label}
            active={category === cat.id}
            onClick={() => setCategory(cat.id)}
          />
        ))}
      </div>

      {/* ── Grid ─────────────────────────────────────────────── */}
      <div style={{
        flex:       1,
        overflowY:  'auto',
        padding:    '20px 28px 32px',
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{    opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
              gap:                 14,
            }}
          >
            {items.map(item => (
              <SVGCard key={item.id} item={item} onSelect={handleSelect} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )

  // ── Modal wrapper (mid-session) ───────────────────────────────
  if (isModal) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{    opacity: 0 }}
        transition={{ duration: 0.18 }}
        style={{
          position: 'absolute',
          inset:    0,
          zIndex:   40,
          background: 'var(--bg, #f0f0f0)',
          // dot pattern matching the artboard
          backgroundImage: 'radial-gradient(circle, #d8d8d8 1.5px, transparent 1.5px)',
          backgroundSize:  '27px 27px',
        }}
      >
        {content}
      </motion.div>
    )
  }

  // ── Inline (empty state) ──────────────────────────────────────
  return content
}
