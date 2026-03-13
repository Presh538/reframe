/**
 * Preset registry — the single source of truth for all presets.
 * Import from here everywhere; never import individual category files directly.
 */

import { logoPresets } from './logo'
import { iconPresets } from './icon'
import { illustrationPresets } from './illustration'
import { uiPresets } from './ui'
import { premiumPresets } from './premium'
import type { Preset, PresetCategory } from '@/types'

export const PRESETS: Preset[] = [
  ...logoPresets,
  ...iconPresets,
  ...illustrationPresets,
  ...uiPresets,
  ...premiumPresets,
]

export const PRESET_MAP = new Map<string, Preset>(
  PRESETS.map(p => [p.id, p])
)

export const CATEGORIES: PresetCategory[] = [
  'Logo',
  'Icon',
  'Illustration',
  'UI',
  'Premium',
]

export function getPreset(id: string): Preset | undefined {
  return PRESET_MAP.get(id)
}

export function getPresetsByCategory(category: PresetCategory): Preset[] {
  return PRESETS.filter(p => p.category === category)
}

export { type Preset, type PresetCategory }
