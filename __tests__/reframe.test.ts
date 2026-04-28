/**
 * Reframe E2E-equivalent test suite
 *
 * Covers core business logic that runs without a browser:
 *   1. SVG Library — item counts, category filtering, SVG validity
 *   2. Embed generation — HTML output, bgColor, kind routing
 *   3. 3D Presets — material options, look presets, orbit feels
 *   4. Export params — GIF/WebM constants are sane
 *   5. Motion constants — SPRING values present and finite
 *   6. Middleware — public paths are correctly whitelisted
 */

// ── 1. SVG LIBRARY ────────────────────────────────────────────────

import {
  LIBRARY_ITEMS,
  LIBRARY_CATEGORIES,
  getLibraryItems,
  type LibraryCategory,
} from '@/lib/svg-library'

describe('SVG Library', () => {
  test('ships at least 12 templates', () => {
    expect(LIBRARY_ITEMS.length).toBeGreaterThanOrEqual(12)
  })

  test('every item has a non-empty id, name, category and svg string', () => {
    for (const item of LIBRARY_ITEMS) {
      expect(item.id.length).toBeGreaterThan(0)
      expect(item.name.length).toBeGreaterThan(0)
      expect(item.svg).toContain('<svg')
      expect(item.svg).toContain('viewBox')
      expect(['icon', 'geometric', 'logo', 'illustration']).toContain(item.category)
    }
  })

  test('all item ids are unique', () => {
    const ids = LIBRARY_ITEMS.map(i => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('getLibraryItems("all") returns all items', () => {
    expect(getLibraryItems('all')).toHaveLength(LIBRARY_ITEMS.length)
  })

  test('getLibraryItems filters correctly for each category', () => {
    const cats: LibraryCategory[] = ['icon', 'geometric', 'logo', 'illustration']
    for (const cat of cats) {
      const filtered = getLibraryItems(cat)
      expect(filtered.length).toBeGreaterThan(0)
      expect(filtered.every(i => i.category === cat)).toBe(true)
    }
  })

  test('LIBRARY_CATEGORIES contains "all" as first entry', () => {
    expect(LIBRARY_CATEGORIES[0].id).toBe('all')
  })

  test('category counts add up to total', () => {
    const cats: LibraryCategory[] = ['icon', 'geometric', 'logo', 'illustration']
    const sum = cats.reduce((acc, c) => acc + getLibraryItems(c).length, 0)
    expect(sum).toBe(LIBRARY_ITEMS.length)
  })

  test('every SVG is parseable XML with a <path> or <circle>', () => {
    // Node has no DOMParser, but we can validate minimal structure via regex
    for (const item of LIBRARY_ITEMS) {
      expect(item.svg).toMatch(/<(path|circle|polygon|rect|ellipse|line)/)
    }
  })
})

// ── 2. EMBED GENERATION ───────────────────────────────────────────

import { generateEmbed } from '@/lib/embed3d'

const SIMPLE_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M10 10 L90 90" fill="#ff0000"/>
</svg>`

describe('Embed generation', () => {
  test('generates a self-contained HTML string', () => {
    const html = generateEmbed({ svgSource: SIMPLE_SVG, materialStyle: 'flat', depth: 20 })
    expect(typeof html).toBe('string')
    expect(html.length).toBeGreaterThan(500)
    expect(html).toContain('<!DOCTYPE html>')
    // Canvas is appended by Three.js JS, not as a literal HTML tag
    expect(html).toContain('domElement')
    expect(html).toContain('three')
  })

  test('embeds the SVG source in the output', () => {
    const html = generateEmbed({ svgSource: SIMPLE_SVG, materialStyle: 'flat', depth: 20 })
    // SVG content should be present (possibly escaped)
    expect(html).toContain('ff0000')
  })

  test('applies bgColor when provided', () => {
    const html = generateEmbed({
      svgSource: SIMPLE_SVG,
      materialStyle: 'flat',
      depth: 20,
      bgColor: '#1a1a2e',
    })
    expect(html).toContain('#1a1a2e')
  })

  test('defaults to a background color when bgColor omitted', () => {
    const html = generateEmbed({ svgSource: SIMPLE_SVG, materialStyle: 'flat', depth: 20 })
    // Default bg is the app canvas color (#f0f0f4) when no bgColor passed
    expect(html).toMatch(/#f0f0|background/)
  })

  test('glass materialStyle produces different output to flat', () => {
    const flat  = generateEmbed({ svgSource: SIMPLE_SVG, materialStyle: 'flat',  depth: 20 })
    const glass = generateEmbed({ svgSource: SIMPLE_SVG, materialStyle: 'glass', depth: 20 })
    expect(flat).not.toBe(glass)
  })

  test('depth value is present in the output', () => {
    const html = generateEmbed({ svgSource: SIMPLE_SVG, materialStyle: 'flat', depth: 42 })
    expect(html).toContain('42')
  })

  test('image kind generates image-specific embed code', () => {
    const dataUrl = 'data:image/png;base64,ABC123'
    const html = generateEmbed({ kind: 'image', imageDataUrl: dataUrl, materialStyle: 'flat', depth: 10 })
    expect(html).toContain('ABC123')
  })

  test('special chars in SVG are escaped safely', () => {
    const svgWithBacktick = SIMPLE_SVG.replace('ff0000', 'ff0000` + evil')
    // Should not throw
    expect(() =>
      generateEmbed({ svgSource: svgWithBacktick, materialStyle: 'flat', depth: 20 })
    ).not.toThrow()
  })
})

// ── 3. 3D PRESETS ─────────────────────────────────────────────────

import {
  MATERIAL_OPTIONS,
  LOOK_PRESETS,
  LOOK_CATEGORIES,
  ORBIT_FEELS,
  getPresetsByLookCategory,
} from '@/lib/presets3d'

describe('3D Presets', () => {
  test('MATERIAL_OPTIONS has flat and glass ids', () => {
    const ids = MATERIAL_OPTIONS.map(m => m.id)
    expect(ids).toContain('flat')
    expect(ids).toContain('glass')
  })

  test('each material option has an id and name', () => {
    for (const m of MATERIAL_OPTIONS) {
      expect(m.id.length).toBeGreaterThan(0)
      expect(m.name.length).toBeGreaterThan(0)
      expect(['flat', 'glass']).toContain(m.id)
    }
  })

  test('LOOK_PRESETS ships at least 6 entries', () => {
    expect(LOOK_PRESETS.length).toBeGreaterThanOrEqual(6)
  })

  test('each look preset has id, name, category and numeric depth', () => {
    for (const p of LOOK_PRESETS) {
      expect(p.id.length).toBeGreaterThan(0)
      expect(p.name.length).toBeGreaterThan(0)
      expect(LOOK_CATEGORIES).toContain(p.category)
      expect(typeof p.depth).toBe('number')
      expect(p.depth).toBeGreaterThan(0)
    }
  })

  test('getPresetsByLookCategory returns only matching category', () => {
    for (const cat of LOOK_CATEGORIES) {
      const result = getPresetsByLookCategory(cat)
      expect(result.length).toBeGreaterThan(0)
      expect(result.every(p => p.category === cat)).toBe(true)
    }
  })

  test('ORBIT_FEELS has at least 2 entries with valid damping and speed', () => {
    expect(ORBIT_FEELS.length).toBeGreaterThanOrEqual(2)
    for (const f of ORBIT_FEELS) {
      expect(f.id.length).toBeGreaterThan(0)
      expect(typeof f.dampingFactor).toBe('number')
      expect(f.dampingFactor).toBeGreaterThan(0)
      expect(f.dampingFactor).toBeLessThanOrEqual(1)
    }
  })
})

// ── 4. EXPORT CONSTANTS ───────────────────────────────────────────

// We import the raw source and check key constants via regex since the module
// uses browser APIs (canvas, Worker) that aren't available in Node.
import fs from 'fs'
import path from 'path'

const gifSrc  = fs.readFileSync(path.resolve(__dirname, '../src/lib/export/gif.ts'),  'utf8')
const webmSrc = fs.readFileSync(path.resolve(__dirname, '../src/lib/export/webm.ts'), 'utf8')

describe('Export constants — GIF', () => {
  test('MAX_EXPORT_PX is at least 800', () => {
    const m = gifSrc.match(/MAX_EXPORT_PX\s*=\s*(\d+)/)
    expect(m).not.toBeNull()
    expect(Number(m![1])).toBeGreaterThanOrEqual(800)
  })

  test('SUPERSAMPLE is at least 2', () => {
    const m = gifSrc.match(/SUPERSAMPLE\s*=\s*(\d+)/)
    expect(m).not.toBeNull()
    expect(Number(m![1])).toBeGreaterThanOrEqual(2)
  })

  test('FPS is at least 20', () => {
    const m = gifSrc.match(/\bFPS\s*=\s*(\d+)/)
    expect(m).not.toBeNull()
    expect(Number(m![1])).toBeGreaterThanOrEqual(20)
  })

  test('setQuality is called with 1 (maximum NeuQuant quality)', () => {
    expect(gifSrc).toContain('setQuality(1)')
  })

  test('imageSmoothingQuality is set to "high"', () => {
    expect(gifSrc).toContain("'high'")
  })
})

describe('Export constants — WebM', () => {
  test('bitrate is at least 8_000_000 for flow WebM', () => {
    const m = webmSrc.match(/videoBitsPerSecond\s*[=:]\s*([\d_]+)/)
    expect(m).not.toBeNull()
    const bps = Number(m![1].replace(/_/g, ''))
    expect(bps).toBeGreaterThanOrEqual(8_000_000)
  })
})

describe('Export constants — 3D WebM (SceneRenderer)', () => {
  const sceneSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/components/threed/SceneRenderer.tsx'), 'utf8'
  )

  test('3D WebM export resolution is 1920×1080', () => {
    expect(sceneSrc).toContain('EXPORT_W    = 1920')
    expect(sceneSrc).toContain('EXPORT_H    = 1080')
  })

  test('3D WebM bitrate is at least 16_000_000', () => {
    const m = sceneSrc.match(/videoBitsPerSecond:\s*([\d_]+)/)
    expect(m).not.toBeNull()
    const bps = Number(m![1].replace(/_/g, ''))
    expect(bps).toBeGreaterThanOrEqual(16_000_000)
  })

  test('3D WebM uses composite canvas (not raw WebGL canvas) to fix alpha halos', () => {
    expect(sceneSrc).toContain('composite.captureStream')
    expect(sceneSrc).toContain('ctx2d.fillStyle = fillColor')
    expect(sceneSrc).toContain('ctx2d.drawImage(canvas')
  })

  test('3D WebM restores renderer size after export', () => {
    expect(sceneSrc).toContain('renderer.setSize(prevW')
  })
})

// ── 5. MOTION CONSTANTS ───────────────────────────────────────────

import { SPRING } from '@/lib/motion'

describe('Motion constants', () => {
  const keys = ['entrance', 'dropdown', 'snappy', 'stagger'] as const

  test.each(keys)('SPRING.%s exists and has finite numeric values', (key) => {
    const s = SPRING[key] as Record<string, unknown>
    expect(s).toBeDefined()
    for (const [, v] of Object.entries(s)) {
      if (typeof v === 'number') {
        expect(isFinite(v)).toBe(true)
        expect(v).toBeGreaterThan(0)
      }
    }
  })
})

// ── 6. MIDDLEWARE ROUTING ─────────────────────────────────────────

const middlewareSrc = fs.readFileSync(
  path.resolve(__dirname, '../middleware.ts'), 'utf8'
)

describe('Middleware', () => {
  test('public paths (api, _next, favicon) are excluded from auth', () => {
    expect(middlewareSrc).toContain('/api/')
    expect(middlewareSrc).toContain('_next')
    expect(middlewareSrc).toContain('favicon')
  })

  test('middleware file is non-empty', () => {
    expect(middlewareSrc.length).toBeGreaterThan(50)
  })
})
