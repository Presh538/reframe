/**
 * Zustand store for the Sculpt (3D) mode's scene parameters.
 *
 * Kept separate from the Animate editor store so the two modes
 * don't interfere with each other's state. Both ThreeDMode and
 * the 3D preset/easing panels read and write from here.
 */

import { create } from 'zustand'
import type { MaterialStyle } from '@/lib/presets3d'
import type { ThreeDPreset, ThreeDOrbitFeel } from '@/lib/presets3d'

interface ThreeDState {
  material:      MaterialStyle
  depth:         number
  light:         number
  orbitSpeed:    number
  dampingFactor: number
  /** Whether the active motion is currently playing. */
  isPlaying:     boolean
  /**
   * Which motion style plays when isPlaying = true.
   *   spin    – turntable auto-rotation (original behaviour)
   *   float   – gentle sine-wave Y bob
   *   sway    – slow pendulum rock on Z axis
   *   breathe – rhythmic scale pulse
   *   wobble  – organic multi-axis drift
   */
  motionType:    'spin' | 'float' | 'sway' | 'breathe' | 'wobble'

  setMaterial:      (m: MaterialStyle)                                   => void
  setDepth:         (d: number)                                          => void
  setLight:         (l: number)                                          => void
  setOrbitSpeed:    (s: number)                                          => void
  setDampingFactor: (d: number)                                          => void
  setIsPlaying:     (p: boolean)                                         => void
  togglePlaying:    ()                                                   => void
  setMotionType:    (t: 'spin' | 'float' | 'sway' | 'breathe' | 'wobble') => void

  /** Apply a full look preset (material + depth + light). */
  applyLookPreset: (p: ThreeDPreset)     => void
  /** Apply an orbit-feel preset (orbitSpeed + dampingFactor). */
  applyFeelPreset: (f: ThreeDOrbitFeel)  => void
}

export const useThreeDStore = create<ThreeDState>()(set => ({
  material:      'flat',
  depth:         28,
  light:         1.0,
  orbitSpeed:    1.0,
  dampingFactor: 0.06,
  isPlaying:     false,
  motionType:    'spin',

  setMaterial:      material      => set({ material }),
  setDepth:         depth         => set({ depth }),
  setLight:         light         => set({ light }),
  setOrbitSpeed:    orbitSpeed    => set({ orbitSpeed }),
  setDampingFactor: dampingFactor => set({ dampingFactor }),
  setIsPlaying:     isPlaying     => set({ isPlaying }),
  togglePlaying:    ()            => set(s => ({ isPlaying: !s.isPlaying })),
  setMotionType:    motionType    => set({ motionType, isPlaying: true }),

  applyLookPreset: ({ material, depth, light }) =>
    set({ material, depth, light }),

  applyFeelPreset: ({ orbitSpeed, dampingFactor }) =>
    set({ orbitSpeed, dampingFactor }),
}))
