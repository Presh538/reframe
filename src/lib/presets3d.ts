/**
 * 3D asset types, material definitions, and per-mesh entry animations
 * for the SVG / Image → 3D mode.
 */

import * as THREE from 'three'

// ── Asset types ───────────────────────────────────────────────────

export type AssetKind = 'svg' | 'image'

export interface ThreeDAsset {
  /** 'svg' = SVG markup string; 'image' = data URL (PNG/JPG/WebP) */
  kind: AssetKind
  data: string
  name: string
}

// ── Material styles ───────────────────────────────────────────────

export type MaterialStyle = 'flat' | 'glass'

export interface MaterialOption {
  id:   MaterialStyle
  name: string
}

export const MATERIAL_OPTIONS: MaterialOption[] = [
  { id: 'flat',  name: 'Flat' },
  { id: 'glass', name: 'Glam' },
]

/**
 * Create a Three.js material for the given style + SVG fill colour.
 *
 * Flat  — MeshStandardMaterial: smooth matte surface, no cel-shading bands.
 * Glass — MeshPhysicalMaterial: refractive, looks best on simple paths.
 */
export function makeMaterial(style: MaterialStyle, color: THREE.Color): THREE.Material {
  switch (style) {
    case 'flat':
      return new THREE.MeshStandardMaterial({
        color,
        roughness:       0.82,
        metalness:       0.0,
        envMapIntensity: 0.15,  // low env influence — keeps diffuse colour close to the SVG original
        transparent:     true,  // must be true so opacity can be animated at runtime
        opacity:         1.0,
        side: THREE.FrontSide,
      })

    case 'glass':
      return new THREE.MeshPhysicalMaterial({
        color,
        transmission:    0.82,
        roughness:       0.04,
        metalness:       0,
        thickness:       2.0,
        transparent:     true,
        opacity:         0.78,
        side:            THREE.FrontSide,  // same reason as flat
        envMapIntensity: 1.2,
      })
  }
}

/**
 * Fallback colour when an SVG has no fill attributes at all.
 * Matches the app accent so things still look intentional.
 */
export const FALLBACK_COLOR = new THREE.Color(0x3f37c9)

// ── 3D Look presets ───────────────────────────────────────────────
//
// Each preset describes a complete visual "look": material surface,
// extrusion depth, and light intensity. They are applied via the
// Sculpt mode Presets panel and stored in useThreeDStore.

export interface ThreeDPreset {
  id:          string
  name:        string
  category:    string
  description: string
  material:    MaterialStyle
  depth:       number
  light:       number
}

export const LOOK_PRESETS: ThreeDPreset[] = [
  // ── Clean ──────────────────────────────────────────────────────
  {
    id: 'studio',       name: 'Studio',
    category: 'Clean',  description: 'Balanced light, solid surface',
    material: 'flat',   depth: 28,  light: 1.0,
  },
  {
    id: 'minimal',      name: 'Minimal',
    category: 'Clean',  description: 'Shallow depth, soft shadows',
    material: 'flat',   depth: 10,  light: 0.75,
  },
  {
    id: 'print',        name: 'Print',
    category: 'Clean',  description: 'Near-flat with tight edges',
    material: 'flat',   depth: 6,   light: 0.9,
  },

  // ── Bold ───────────────────────────────────────────────────────
  {
    id: 'bold',         name: 'Bold',
    category: 'Bold',   description: 'Deep extrusion, punchy light',
    material: 'flat',   depth: 52,  light: 1.2,
  },
  {
    id: 'carved',       name: 'Carved',
    category: 'Bold',   description: 'Maximum depth, dramatic shadow',
    material: 'flat',   depth: 72,  light: 1.4,
  },
  {
    id: 'shadow',       name: 'Shadow',
    category: 'Bold',   description: 'Deep and dimly lit',
    material: 'flat',   depth: 40,  light: 0.5,
  },

  // ── Glam ───────────────────────────────────────────────────────
  {
    id: 'crystal',      name: 'Crystal',
    category: 'Glam',   description: 'Glass surface, medium depth',
    material: 'glass',  depth: 24,  light: 1.3,
  },
  {
    id: 'prism',        name: 'Prism',
    category: 'Glam',   description: 'Deep glass with bright fill',
    material: 'glass',  depth: 44,  light: 1.6,
  },
  {
    id: 'neon',         name: 'Neon',
    category: 'Glam',   description: 'Glowing glass, max intensity',
    material: 'glass',  depth: 18,  light: 2.0,
  },
  {
    id: 'frosted',      name: 'Frosted',
    category: 'Glam',   description: 'Translucent, low-key lighting',
    material: 'glass',  depth: 28,  light: 0.7,
  },
]

export const LOOK_CATEGORIES = ['Clean', 'Bold', 'Glam'] as const
export type LookCategory = typeof LOOK_CATEGORIES[number]

export function getPresetsByLookCategory(cat: LookCategory): ThreeDPreset[] {
  return LOOK_PRESETS.filter(p => p.category === cat)
}

// ── 3D Orbit-feel presets ─────────────────────────────────────────
//
// Each preset describes how the OrbitControls "feel" to the user:
// rotateSpeed (how fast dragging spins the model) and dampingFactor
// (how much inertia/smoothness there is after releasing the drag).

export interface ThreeDOrbitFeel {
  id:           string
  name:         string
  description:  string
  orbitSpeed:   number  // controls.rotateSpeed
  dampingFactor:number  // controls.dampingFactor
  // SVG path in a 44×28 canvas representing the damping feel
  curvePath:    string
}

export const ORBIT_FEELS: ThreeDOrbitFeel[] = [
  {
    id: 'crisp',
    name: 'Crisp',
    description: 'Instant response, no tail',
    orbitSpeed: 1.8, dampingFactor: 0.02,
    curvePath: 'M 2,24 L 10,4 L 42,4',
  },
  {
    id: 'default',
    name: 'Default',
    description: 'Balanced speed and smoothness',
    orbitSpeed: 1.0, dampingFactor: 0.06,
    curvePath: 'M 2,24 C 12,24 8,4 42,4',
  },
  {
    id: 'smooth',
    name: 'Smooth',
    description: 'Gentle drag with a soft follow',
    orbitSpeed: 0.8, dampingFactor: 0.12,
    curvePath: 'M 2,24 C 18,24 24,4 42,4',
  },
  {
    id: 'fluid',
    name: 'Fluid',
    description: 'Heavy feel, long inertia tail',
    orbitSpeed: 0.55, dampingFactor: 0.20,
    curvePath: 'M 2,24 C 28,24 36,4 42,4',
  },
]

