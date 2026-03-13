/**
 * Lottie JSON Exporter
 *
 * Phase 1: Emits a structurally valid Lottie JSON skeleton with
 * correct metadata. Full bodymovin serialisation (animating
 * individual shape properties) is a Phase 2 feature.
 *
 * The output is importable by LottieFiles / After Effects and
 * includes enough metadata for a Pro-tier server-side renderer
 * to pick up the job.
 */

import type { Preset, AnimParams } from '@/types'
import { triggerDownload } from './css'

export interface LottieDocument {
  v: string
  nm: string
  fr: number
  ip: number
  op: number
  w: number
  h: number
  ddd: number
  assets: unknown[]
  layers: LottieLayer[]
  meta: Record<string, unknown>
}

interface LottieLayer {
  ddd: number
  ind: number
  ty: number
  nm: string
  sr: number
  ks: Record<string, unknown>
  ao: number
  ip: number
  op: number
  st: number
  bm: number
}

const LOTTIE_VERSION = '5.7.4'
const FRAME_RATE = 30

export function buildLottieJson(
  svgEl: SVGSVGElement,
  preset: Preset,
  params: AnimParams
): LottieDocument {
  const vb = svgEl.viewBox?.baseVal
  const W = vb?.width ?? 400
  const H = vb?.height ?? 400
  const duration = preset.baseDuration / params.speed
  const totalFrames = Math.round(duration * FRAME_RATE)

  const animatedEls = [...svgEl.querySelectorAll<SVGElement>('[data-rf-anim]')]

  const layers: LottieLayer[] = animatedEls.map((el, i) => ({
    ddd: 0,
    ind: i + 1,
    ty: 4, // shape layer
    nm: el.id || el.tagName + ` ${i + 1}`,
    sr: 1,
    ks: {
      // Transform properties — full keyframe values require Phase 2
      o: { a: 0, k: 100 },
      r: { a: 0, k: 0 },
      p: { a: 0, k: [W / 2, H / 2, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] },
    },
    ao: 0,
    ip: Math.round(params.delay * FRAME_RATE),
    op: totalFrames,
    st: 0,
    bm: 0,
  }))

  return {
    v: LOTTIE_VERSION,
    nm: `Reframe — ${preset.name}`,
    fr: FRAME_RATE,
    ip: 0,
    op: totalFrames,
    w: W,
    h: H,
    ddd: 0,
    assets: [],
    layers,
    meta: {
      g: 'The Reframe',
      preset: preset.id,
      category: preset.category,
      generatedAt: new Date().toISOString(),
      note: 'Full shape-level keyframe data available with The Reframe Pro server export.',
    },
  }
}

export function exportLottie(
  svgEl: SVGSVGElement,
  preset: Preset,
  params: AnimParams
): void {
  const doc = buildLottieJson(svgEl, preset, params)
  const json = JSON.stringify(doc, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  triggerDownload(blob, `reframe-${preset.id}.json`)
}
