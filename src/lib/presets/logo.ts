import { B, type Preset } from './types'

export const logoPresets: Preset[] = [
  {
    id: 'draw-on',
    name: 'Draw On',
    category: 'Logo',
    icon: '✏️',
    pro: false,
    baseDuration: 1.4,
    description: 'Traces each path outline first, then fills — a cinematic hand-drawn reveal.',
    apply(el, p) {
      const d = B.dur(1.4, p)
      // Phase 1 (0–60%): stroke traces the outline via dashoffset
      // Phase 2 (60–100%): fill fades in while stroke stays drawn
      B.css(el, `
        @keyframes rf-draw {
          0%   { stroke-dashoffset: var(--rf-L); fill-opacity: 0 }
          60%  { stroke-dashoffset: 0;           fill-opacity: 0 }
          100% { stroke-dashoffset: 0;           fill-opacity: 1 }
        }
        @keyframes rf-draw-r {
          0%   { stroke-dashoffset: 0;           fill-opacity: 1 }
          40%  { stroke-dashoffset: 0;           fill-opacity: 0 }
          100% { stroke-dashoffset: var(--rf-L); fill-opacity: 0 }
        }
      `)
      B.strokeTargets(el, p.scope).forEach((e, i) => {
        const L = B.plen(e)
        e.style.setProperty('--rf-L', String(L))
        e.style.strokeDasharray = String(L)
        e.style.strokeDashoffset = String(L)

        // If this element has no stroke, inject one matching its fill color
        // so the tracing phase is visible. Mark it for cleanup on clearAnimations.
        const hasFill   = e.getAttribute('fill') !== 'none'
        const hasStroke = e.getAttribute('stroke') || e.style.stroke
        if (hasFill && !hasStroke) {
          const fill = e.getAttribute('fill') ?? 'currentColor'
          // Skip gradient fills — they can't be used directly as stroke
          if (!fill.startsWith('url(')) {
            e.setAttribute('stroke', fill)
            e.setAttribute('data-rf-stroke-added', '1')
          }
          if (!e.getAttribute('stroke-width')) {
            e.setAttribute('stroke-width', '1.5')
            e.setAttribute('data-rf-sw-added', '1')
          }
        }

        const delay = p.delay + i * 0.1
        const kf = p.direction === 'out' ? 'rf-draw-r' : 'rf-draw'
        B.anim(e, `${kf} ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both ease-in-out`, delay)
      })
    },
  },

  {
    id: 'fade-up-scale',
    name: 'Fade Up + Scale',
    category: 'Logo',
    icon: '⬆️',
    pro: false,
    baseDuration: 0.8,
    description: 'Rises and grows into place with a smooth cubic-bezier.',
    apply(el, p) {
      const d = B.dur(0.8, p)
      B.css(el, `
        @keyframes rf-fus { from { opacity: 0; transform: translateY(16px) scale(.88) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes rf-fus-r { from { opacity: 1; transform: translateY(0) scale(1) } to { opacity: 0; transform: translateY(16px) scale(.88) } }
      `)
      B.targets(el, p.scope).forEach((e, i) => {
        e.style.transformOrigin = 'center'
        const delay = p.delay + i * 0.06
        const kf = p.direction === 'out' ? 'rf-fus-r' : 'rf-fus'
        B.anim(e, `${kf} ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both cubic-bezier(.22,1,.36,1)`, delay)
      })
    },
  },

  {
    id: 'bounce-in',
    name: 'Bounce In',
    category: 'Logo',
    icon: '🏀',
    pro: false,
    baseDuration: 0.9,
    description: 'Drops in from above with a satisfying elastic bounce.',
    apply(el, p) {
      const d = B.dur(0.9, p)
      B.css(el, `
        @keyframes rf-bi { 0% { opacity: 0; transform: translateY(-36px) scale(.9) } 55% { opacity: 1; transform: translateY(7px) scale(1.03) } 78% { transform: translateY(-3px) scale(.99) } 100% { transform: translateY(0) scale(1) } }
      `)
      B.targets(el, p.scope).forEach((e, i) => {
        e.style.transformOrigin = 'center'
        const delay = p.delay + i * 0.07
        B.anim(e, `rf-bi ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both`, delay)
      })
    },
  },

  {
    id: 'glitch-flash',
    name: 'Glitch Flash',
    category: 'Logo',
    icon: '⚡',
    pro: false,
    baseDuration: 1.0,
    description: 'Chromatic aberration flicker — high energy, very on-brand for tech.',
    apply(el, p) {
      const d = B.dur(1.0, p)
      B.css(el, `
        @keyframes rf-gl { 0%,100% { transform: translate(0); filter: none; opacity: 1 } 10% { transform: translate(-3px,1px); filter: hue-rotate(90deg) saturate(2) } 22% { transform: translate(3px,-1px); filter: hue-rotate(180deg) } 35% { transform: translate(-2px,2px); filter: hue-rotate(270deg) saturate(3); opacity: .8 } 48% { transform: translate(2px,-2px); filter: none } 60% { transform: translate(-4px,0); filter: hue-rotate(45deg) } 75% { transform: translate(0); filter: none } 86% { transform: translate(1px,-1px); filter: saturate(2); opacity: .9 } }
      `)
      B.targets(el, p.scope).forEach(e => {
        B.anim(e, `rf-gl ${d} ${p.delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)}`, p.delay)
      })
    },
  },

  {
    id: 'fill-reveal',
    name: 'Fill Reveal',
    category: 'Logo',
    icon: '🎭',
    pro: false,
    baseDuration: 0.7,
    description: 'Wipes each element into view left-to-right — a cinematic character reveal.',
    apply(el, p) {
      const d = B.dur(0.7, p)

      // Single keyframe — B.dir(p) drives all three directions correctly:
      //   'in'     → animation-direction: normal    (hidden → revealed)
      //   'out'    → animation-direction: reverse   (revealed → hidden)
      //   'in-out' → animation-direction: alternate (hidden → revealed → hidden)
      // Using a '-r' keyframe AND B.dir('out')='reverse' would double-reverse
      // back to 'in', so we let B.dir do the work exclusively.
      B.css(el, `
        @keyframes rf-fr { from { clip-path: inset(0 100% 0 0) } to { clip-path: inset(0 0% 0 0) } }
      `)

      // Honour the user's scope selection precisely:
      //   paths  → individual <path>/<shape> elements (fine-grained, letter strokes)
      //   groups → direct <g> children only (one per character / layer group)
      //   all    → smart fallback: direct groups, drilling one level in for wrapper SVGs
      let targets: SVGElement[]

      if (p.scope === 'paths') {
        targets = B.targets(el, 'paths')
      } else if (p.scope === 'groups') {
        targets = [...el.querySelectorAll<SVGElement>(':scope > g')]
        if (!targets.length) targets = B.targets(el, 'groups')
      } else {
        // 'all' — prefer top-level <g>s, drill one level deeper for single-wrapper SVGs
        targets = [...el.querySelectorAll<SVGElement>(':scope > g')]
        if (targets.length === 1) {
          const inner = [...targets[0].querySelectorAll<SVGElement>(':scope > g')]
          if (inner.length > 1) targets = inner
        }
        if (targets.length <= 1) targets = B.targets(el, p.scope)
      }

      // 120 ms stagger gives a natural, readable cadence
      targets.forEach((e, i) => {
        const delay = p.delay + i * 0.12
        B.anim(
          e,
          `rf-fr ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both cubic-bezier(0.4,0,0.2,1)`,
          delay,
        )
      })
    },
  },
]
