/**
 * Lottie JSON Exporter
 *
 * Two-pass pipeline:
 *
 * Pass 1 — Geometry:
 *   For each animated SVG element, collect all descendant shapes (path, rect,
 *   circle, ellipse, polyline, polygon, line), convert them to Lottie bezier
 *   path items, and capture their fill / stroke colours.
 *
 * Pass 2 — Motion:
 *   Sample the live CSS animation at 30 fps using stepToTime (same negative-
 *   delay trick used by the GIF exporter). Read computed opacity and transform
 *   matrix at each frame, encode as Lottie opacity / position / scale / rotation
 *   keyframe arrays.
 *
 * The two passes are combined into Lottie shape layers (ty:4) — one per
 * animated SVG element — producing a standard Lottie 5.7.4 JSON that plays
 * in LottieFiles, Lottie Lab, and web Lottie players.
 */

import { stepToTime, restorePlayback } from '@/lib/svg/animate'
import type { Preset, AnimParams } from '@/types'
import { triggerDownload } from './css'

// ── Types ─────────────────────────────────────────────────────

export interface LottieDocument {
  v:      string
  nm:     string
  fr:     number
  ip:     number
  op:     number
  w:      number
  h:      number
  ddd:    number
  assets: unknown[]
  layers: LottieLayer[]
  meta:   Record<string, unknown>
}

interface LottieLayer {
  ddd:    number
  ind:    number
  ty:     number
  nm:     string
  sr:     number
  ks:     Record<string, unknown>
  shapes: unknown[]
  ao:     number
  ip:     number
  op:     number
  st:     number
  bm:     number
}

type Pt = [number, number]

interface LottieBezier {
  v: Pt[]   // vertices
  i: Pt[]   // in-tangents  (relative to vertex)
  o: Pt[]   // out-tangents (relative to vertex)
  c: boolean
}

// ── Config ────────────────────────────────────────────────────

const LOTTIE_VERSION = '5.7.4'
const FRAME_RATE     = 30

// ── SVG path → Lottie bezier ──────────────────────────────────

/**
 * Converts an SVG arc segment to one or more cubic bezier curves.
 * Based on the algorithm in the SVG spec (Appendix B.2).
 */
function arcToCubics(
  x1: number, y1: number, x2: number, y2: number,
  rx: number, ry: number, phi: number,
  largeArc: boolean, sweep: boolean,
): Array<[number,number,number,number,number,number]> {
  if (rx === 0 || ry === 0) return [[x1, y1, x2, y2, x2, y2]]

  const cosPhi = Math.cos(phi), sinPhi = Math.sin(phi)
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2
  const x1p =  cosPhi * dx + sinPhi * dy
  const y1p = -sinPhi * dx + cosPhi * dy
  let rxSq = rx * rx, rySq = ry * ry
  const x1pSq = x1p * x1p, y1pSq = y1p * y1p

  const lam = x1pSq / rxSq + y1pSq / rySq
  if (lam > 1) {
    const sq = Math.sqrt(lam)
    rx *= sq; ry *= sq; rxSq = rx * rx; rySq = ry * ry
  }

  let sq = Math.max(0, (rxSq*rySq - rxSq*y1pSq - rySq*x1pSq) / (rxSq*y1pSq + rySq*x1pSq))
  sq = Math.sqrt(sq) * (largeArc === sweep ? -1 : 1)

  const cxp =  sq * rx * y1p / ry
  const cyp = -sq * ry * x1p / rx
  const cx  = cosPhi*cxp - sinPhi*cyp + (x1+x2)/2
  const cy  = sinPhi*cxp + cosPhi*cyp + (y1+y2)/2

  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const n  = Math.sqrt(ux*ux+uy*uy) * Math.sqrt(vx*vx+vy*vy)
    const c  = Math.max(-1, Math.min(1, (ux*vx+uy*vy) / n))
    return (ux*vy - uy*vx < 0 ? -1 : 1) * Math.acos(c)
  }

  const ux = (x1p-cxp)/rx, uy = (y1p-cyp)/ry
  const vx = (-x1p-cxp)/rx, vy = (-y1p-cyp)/ry
  let theta1 = ang(1,0,ux,uy)
  let dtheta  = ang(ux,uy,vx,vy)
  if (!sweep && dtheta > 0) dtheta -= 2*Math.PI
  if ( sweep && dtheta < 0) dtheta += 2*Math.PI

  const segs = Math.ceil(Math.abs(dtheta) / (Math.PI/2))
  const dt   = dtheta / segs
  const out: Array<[number,number,number,number,number,number]> = []
  let px = x1, py = y1, t = theta1

  for (let s = 0; s < segs; s++) {
    const t2   = t + dt
    const alpha = Math.sin(dt) * (Math.sqrt(4 + 3*Math.tan(dt/2)**2) - 1) / 3
    const c1 = Math.cos(t),  s1 = Math.sin(t)
    const c2 = Math.cos(t2), s2 = Math.sin(t2)
    const dx1 = -(cosPhi*rx*s1 + sinPhi*ry*c1)
    const dy1 = -(sinPhi*rx*s1 - cosPhi*ry*c1)
    const dx2 = -(cosPhi*rx*s2 + sinPhi*ry*c2)
    const dy2 = -(sinPhi*rx*s2 - cosPhi*ry*c2)
    const ex  = cx + cosPhi*rx*c2 - sinPhi*ry*s2
    const ey  = cy + sinPhi*rx*c2 + cosPhi*ry*s2
    out.push([px+alpha*dx1, py+alpha*dy1, ex-alpha*dx2, ey-alpha*dy2, ex, ey])
    px = ex; py = ey; t = t2
  }
  return out
}

/**
 * Parses an SVG path `d` attribute into Lottie bezier sub-paths.
 * Handles M L H V C S Q T A Z (upper and lower case).
 */
function svgDToLottieBeziers(d: string): LottieBezier[] {
  const subpaths: LottieBezier[] = []
  let cur: LottieBezier = { v: [], i: [], o: [], c: false }
  let x = 0, y = 0, startX = 0, startY = 0
  let lastCpX = 0, lastCpY = 0, lastCmd = ''

  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? []
  let idx = 0
  const n = () => parseFloat(tokens[idx++] ?? '0')

  while (idx < tokens.length) {
    const cmd = tokens[idx++]
    if (!cmd) continue
    const rel = cmd === cmd.toLowerCase() && !/^[zZ]$/.test(cmd)
    const ax  = (v: number) => rel ? x + v : v
    const ay  = (v: number) => rel ? y + v : v

    const push = (vx: number, vy: number, ix: number, iy: number, prevOx: number, prevOy: number) => {
      const last = cur.v.length - 1
      if (last >= 0) { cur.o[last] = [prevOx - x, prevOy - y] }
      cur.v.push([vx, vy])
      cur.i.push([ix - vx, iy - vy])
      cur.o.push([0, 0])
      x = vx; y = vy
    }

    const C = cmd.toUpperCase()

    if (C === 'M') {
      if (cur.v.length > 0) { subpaths.push(cur); cur = { v: [], i: [], o: [], c: false } }
      x = ax(n()); y = ay(n()); startX = x; startY = y
      cur.v.push([x, y]); cur.i.push([0,0]); cur.o.push([0,0])
      // Subsequent coords after M behave as L
      while (idx < tokens.length && !/[A-Za-z]/.test(tokens[idx] ?? '')) {
        const nx = ax(n()), ny = ay(n())
        cur.v.push([nx, ny]); cur.i.push([0,0]); cur.o.push([0,0])
        x = nx; y = ny
      }
    } else if (C === 'L') {
      const nx = ax(n()), ny = ay(n())
      cur.v.push([nx, ny]); cur.i.push([0,0])
      if (cur.o.length < cur.v.length) cur.o.push([0,0])
      else cur.o[cur.o.length-1] = [0,0]
      x = nx; y = ny
    } else if (C === 'H') {
      const nx = ax(n())
      cur.v.push([nx, y]); cur.i.push([0,0]); cur.o.push([0,0]); x = nx
    } else if (C === 'V') {
      const ny = ay(n())
      cur.v.push([x, ny]); cur.i.push([0,0]); cur.o.push([0,0]); y = ny
    } else if (C === 'C') {
      const cp1x = ax(n()), cp1y = ay(n())
      const cp2x = ax(n()), cp2y = ay(n())
      const nx = ax(n()), ny = ay(n())
      push(nx, ny, cp2x, cp2y, cp1x, cp1y)
      lastCpX = cp2x; lastCpY = cp2y
    } else if (C === 'S') {
      const cp1x = (lastCmd==='C'||lastCmd==='S') ? 2*x-lastCpX : x
      const cp1y = (lastCmd==='C'||lastCmd==='S') ? 2*y-lastCpY : y
      const cp2x = ax(n()), cp2y = ay(n())
      const nx = ax(n()), ny = ay(n())
      push(nx, ny, cp2x, cp2y, cp1x, cp1y)
      lastCpX = cp2x; lastCpY = cp2y
    } else if (C === 'Q') {
      const qx = ax(n()), qy = ay(n())
      const nx = ax(n()), ny = ay(n())
      push(nx, ny, nx + 2/3*(qx-nx), ny + 2/3*(qy-ny), x + 2/3*(qx-x), y + 2/3*(qy-y))
      lastCpX = qx; lastCpY = qy
    } else if (C === 'T') {
      const qx = (lastCmd==='Q'||lastCmd==='T') ? 2*x-lastCpX : x
      const qy = (lastCmd==='Q'||lastCmd==='T') ? 2*y-lastCpY : y
      const nx = ax(n()), ny = ay(n())
      push(nx, ny, nx + 2/3*(qx-nx), ny + 2/3*(qy-ny), x + 2/3*(qx-x), y + 2/3*(qy-y))
      lastCpX = qx; lastCpY = qy
    } else if (C === 'A') {
      const rx = Math.abs(n()), ry = Math.abs(n())
      const phi = n() * Math.PI / 180
      const la = !!n(), sw = !!n()
      const nx = ax(n()), ny = ay(n())
      const arcs = arcToCubics(x, y, nx, ny, rx, ry, phi, la, sw)
      for (const [cp1x,cp1y,cp2x,cp2y,ex,ey] of arcs) {
        push(ex, ey, cp2x, cp2y, cp1x, cp1y)
        lastCpX = cp2x; lastCpY = cp2y
      }
    } else if (C === 'Z') {
      cur.c = true; x = startX; y = startY
    }

    if (!/^[Mm]$/.test(cmd)) lastCmd = C
  }

  if (cur.v.length >= 2) subpaths.push(cur)
  return subpaths
}

// ── Shape element → path d ────────────────────────────────────

function shapeToD(el: SVGElement): string | null {
  const tag = el.tagName.toLowerCase()
  if (tag === 'path') return el.getAttribute('d')

  const g = (a: string) => parseFloat(el.getAttribute(a) ?? '0')

  if (tag === 'rect') {
    const x = g('x'), y = g('y'), w = g('width'), h = g('height')
    const rx = Math.min(g('rx') || g('ry'), w/2)
    const ry = Math.min(g('ry') || g('rx'), h/2)
    if (rx === 0) return `M${x},${y} H${x+w} V${y+h} H${x} Z`
    const k = 0.5523 // cubic bezier approx for quarter-circle
    return [
      `M${x+rx},${y}`,
      `H${x+w-rx} C${x+w-rx+rx*k},${y} ${x+w},${y+ry-ry*k} ${x+w},${y+ry}`,
      `V${y+h-ry} C${x+w},${y+h-ry+ry*k} ${x+w-rx+rx*k},${y+h} ${x+w-rx},${y+h}`,
      `H${x+rx} C${x+rx-rx*k},${y+h} ${x},${y+h-ry+ry*k} ${x},${y+h-ry}`,
      `V${y+ry} C${x},${y+ry-ry*k} ${x+rx-rx*k},${y} ${x+rx},${y} Z`,
    ].join(' ')
  }
  if (tag === 'circle') {
    const cx = g('cx'), cy = g('cy'), r = g('r'), k = r * 0.5523
    return `M${cx},${cy-r} C${cx+k},${cy-r} ${cx+r},${cy-k} ${cx+r},${cy} C${cx+r},${cy+k} ${cx+k},${cy+r} ${cx},${cy+r} C${cx-k},${cy+r} ${cx-r},${cy+k} ${cx-r},${cy} C${cx-r},${cy-k} ${cx-k},${cy-r} ${cx},${cy-r} Z`
  }
  if (tag === 'ellipse') {
    const cx = g('cx'), cy = g('cy'), rx = g('rx'), ry = g('ry')
    const kx = rx * 0.5523, ky = ry * 0.5523
    return `M${cx},${cy-ry} C${cx+kx},${cy-ry} ${cx+rx},${cy-ky} ${cx+rx},${cy} C${cx+rx},${cy+ky} ${cx+kx},${cy+ry} ${cx},${cy+ry} C${cx-kx},${cy+ry} ${cx-rx},${cy+ky} ${cx-rx},${cy} C${cx-rx},${cy-ky} ${cx-kx},${cy-ry} ${cx},${cy-ry} Z`
  }
  if (tag === 'line') {
    return `M${g('x1')},${g('y1')} L${g('x2')},${g('y2')}`
  }
  if (tag === 'polyline' || tag === 'polygon') {
    const pts = (el.getAttribute('points') ?? '').trim().split(/[\s,]+/)
    if (pts.length < 2) return null
    let d = `M${pts[0]},${pts[1]}`
    for (let i = 2; i < pts.length - 1; i += 2) d += ` L${pts[i]},${pts[i+1]}`
    if (tag === 'polygon') d += ' Z'
    return d
  }
  return null
}

// ── Colour helpers ────────────────────────────────────────────

type RGBA = [number, number, number, number]

function parseCssColor(color: string): RGBA {
  if (!color || color === 'none' || color === 'transparent') return [0, 0, 0, 0]

  const rgb = color.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/)
  if (rgb) return [+rgb[1]/255, +rgb[2]/255, +rgb[3]/255, rgb[4] !== undefined ? +rgb[4] : 1]

  const h6 = color.match(/^#([0-9a-f]{6})$/i)
  if (h6) { const v = parseInt(h6[1], 16); return [(v>>16)/255, ((v>>8)&0xff)/255, (v&0xff)/255, 1] }

  const h3 = color.match(/^#([0-9a-f]{3})$/i)
  if (h3) {
    const [,r,g,b] = h3[1].split('').map(c => parseInt(c+c, 16)/255)
    return [r, g, b, 1]
  }

  const named: Record<string, RGBA> = {
    black:[0,0,0,1], white:[1,1,1,1], red:[1,0,0,1], green:[0,.5,0,1],
    blue:[0,0,1,1], yellow:[1,1,0,1], cyan:[0,1,1,1], magenta:[1,0,1,1],
    gray:[.5,.5,.5,1], grey:[.5,.5,.5,1], orange:[1,.647,0,1],
    purple:[.5,0,.5,1], brown:[.647,.165,.165,1],
  }
  return named[color.toLowerCase()] ?? [0, 0, 0, 1]
}

// ── Shape items builder ───────────────────────────────────────

/**
 * Walks all descendant shape elements of `el`, converts each to Lottie
 * path + fill + stroke items, and returns the combined array.
 */
function buildShapeItems(el: SVGElement): unknown[] {
  const SHAPE_TAGS = new Set(['path','rect','circle','ellipse','line','polyline','polygon'])
  const items: unknown[] = []

  const shapes = SHAPE_TAGS.has(el.tagName.toLowerCase())
    ? [el]
    : [...el.querySelectorAll<SVGElement>(
        'path,rect,circle,ellipse,line,polyline,polygon'
      )]

  for (const shape of shapes) {
    const d = shapeToD(shape)
    if (!d || d.trim().length < 4) continue

    const beziers = svgDToLottieBeziers(d)
    for (const bz of beziers) {
      if (bz.v.length < 2) continue
      items.push({ ty: 'sh', ks: { a: 0, k: bz }, nm: 'Path', hd: false })
    }

    const cs   = window.getComputedStyle(shape)
    const fill = cs.fill || shape.getAttribute('fill') || 'black'

    if (fill !== 'none' && fill !== '') {
      const [r, g, b] = parseCssColor(fill)
      const fo = parseFloat(cs.fillOpacity ?? shape.getAttribute('fill-opacity') ?? '1')
      items.push({ ty: 'fl', c: { a:0, k:[r,g,b,1] }, o: { a:0, k: fo*100 }, r:1, nm:'Fill', hd:false })
    }

    const stroke = cs.stroke || shape.getAttribute('stroke') || 'none'
    if (stroke && stroke !== 'none') {
      const [r, g, b] = parseCssColor(stroke)
      const sw = parseFloat(cs.strokeWidth || shape.getAttribute('stroke-width') || '1')
      const so = parseFloat(cs.strokeOpacity ?? shape.getAttribute('stroke-opacity') ?? '1')
      items.push({ ty:'st', c:{ a:0, k:[r,g,b,1] }, o:{ a:0, k:so*100 }, w:{ a:0, k:sw }, lc:2, lj:2, nm:'Stroke', hd:false })
    }
  }

  return items
}

// ── CSS matrix decomposition ──────────────────────────────────

function decomposeCssMatrix(transform: string): { tx:number; ty:number; sx:number; sy:number; r:number } {
  const id = { tx:0, ty:0, sx:1, sy:1, r:0 }
  if (!transform || transform === 'none') return id
  const m = transform.match(/^matrix\(([^)]+)\)/)
  if (!m) return id
  const [a, b, , d, e, f] = m[1].split(',').map(Number)
  const sx = Math.sqrt(a*a + b*b)
  return { tx: e??0, ty: f??0, sx, sy: Math.sqrt((d??0)*(d??0) + (b??0)*(b??0)), r: sx<1e-6 ? 0 : Math.atan2(b, a)*(180/Math.PI) }
}

// ── Lottie property helpers ───────────────────────────────────

function lottieScalar(frames: Array<{ t:number; v:number }>): Record<string, unknown> {
  if (!frames.length) return { a:0, k:0 }
  const v0 = frames[0].v
  if (frames.every(f => Math.abs(f.v - v0) < 0.01)) return { a:0, k:v0 }
  return { a:1, k: frames.map((f,i) => {
    const nx = frames[i+1]
    return { t:f.t, s:[f.v], ...(nx ? { e:[nx.v], o:{x:[.5],y:[.5]}, i:{x:[.5],y:[.5]} } : {}) }
  })}
}

function lottieVec(frames: Array<{ t:number; v:[number,number,number] }>): Record<string, unknown> {
  if (!frames.length) return { a:0, k:[0,0,0] }
  const [x0,y0,z0] = frames[0].v
  if (frames.every(f => Math.abs(f.v[0]-x0)<0.01 && Math.abs(f.v[1]-y0)<0.01 && Math.abs(f.v[2]-z0)<0.01)) return { a:0, k:[x0,y0,z0] }
  return { a:1, k: frames.map((f,i) => {
    const nx = frames[i+1]
    return { t:f.t, s:f.v, ...(nx ? { e:nx.v, o:{x:.5,y:.5}, i:{x:.5,y:.5} } : {}) }
  })}
}

// ── Main export builder ───────────────────────────────────────

export function buildLottieJson(
  svgEl:  SVGSVGElement,
  preset: Preset,
  params: AnimParams,
): LottieDocument {
  const vb          = svgEl.viewBox?.baseVal
  const W           = vb?.width  ?? 400
  const H           = vb?.height ?? 400
  const duration    = preset.baseDuration / params.speed
  const totalFrames = Math.round(duration * FRAME_RATE)

  const animatedEls = [...svgEl.querySelectorAll<SVGElement>('[data-rf-anim]')]

  // ── Pass 1: collect shape geometry ──────────────────────────
  // getBBox() returns the bounding box in SVG user units, unaffected by CSS
  // transforms, so it gives us the element's natural resting position.
  const shapeItems   = new Map<SVGElement, unknown[]>()
  const naturalCenters = new Map<SVGElement, [number, number]>()

  animatedEls.forEach(el => {
    shapeItems.set(el, buildShapeItems(el))
    try {
      const bb = (el as SVGGraphicsElement).getBBox()
      naturalCenters.set(el, [bb.x + bb.width/2, bb.y + bb.height/2])
    } catch {
      naturalCenters.set(el, [W/2, H/2])
    }
  })

  // ── Pass 2: sample CSS animation ────────────────────────────
  type Sample = { opacity:number; tx:number; ty:number; sx:number; sy:number; r:number }
  const samples = new Map<SVGElement, Sample[]>()
  animatedEls.forEach(el => samples.set(el, []))

  for (let f = 0; f <= totalFrames; f++) {
    stepToTime(svgEl, (f / totalFrames) * duration)
    svgEl.getBoundingClientRect() // force layout flush

    animatedEls.forEach(el => {
      const cs      = window.getComputedStyle(el)
      const opacity = parseFloat(cs.opacity ?? '1')
      const dec     = decomposeCssMatrix(cs.transform ?? 'none')
      samples.get(el)!.push({ opacity, ...dec })
    })
  }

  restorePlayback(svgEl)

  // ── Build layers ─────────────────────────────────────────────
  const layers: LottieLayer[] = animatedEls.map((el, i) => {
    const data = samples.get(el)!
    const [ncx, ncy] = naturalCenters.get(el) ?? [W/2, H/2]

    const o = lottieScalar(data.map((d, f) => ({ t:f, v: d.opacity * 100 })))
    const p = lottieVec(data.map((d, f) => ({ t:f, v: [ncx + d.tx, ncy + d.ty, 0] as [number,number,number] })))
    const s = lottieVec(data.map((d, f) => ({ t:f, v: [d.sx*100, d.sy*100, 100] as [number,number,number] })))
    const r = lottieScalar(data.map((d, f) => ({ t:f, v: d.r })))

    return {
      ddd: 0, ind: i+1, ty: 4,
      nm:  el.id || `${el.tagName} ${i+1}`,
      sr:  1,
      ks:  { o, r, p, a: { a:0, k:[ncx, ncy, 0] }, s },
      shapes: shapeItems.get(el) ?? [],
      ao: 0, ip: 0, op: totalFrames, st: 0, bm: 0,
    }
  })

  return {
    v: LOTTIE_VERSION, nm: `Reframe — ${preset.name}`,
    fr: FRAME_RATE, ip: 0, op: totalFrames, w: W, h: H, ddd: 0,
    assets: [], layers,
    meta: { g:'The Reframe', preset:preset.id, category:preset.category, generatedAt:new Date().toISOString() },
  }
}

export function exportLottie(svgEl: SVGSVGElement, preset: Preset, params: AnimParams): void {
  const doc  = buildLottieJson(svgEl, preset, params)
  const json = JSON.stringify(doc, null, 2)
  triggerDownload(new Blob([json], { type:'application/json' }), `reframe-${preset.id}.json`)
}
