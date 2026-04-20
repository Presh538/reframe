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

        const hasFill   = e.getAttribute('fill') !== 'none'
        const hasStroke = e.getAttribute('stroke') || e.style.stroke
        if (hasFill && !hasStroke) {
          const fill = e.getAttribute('fill') ?? 'currentColor'
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
        B.anim(e, `${kf} ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both ${B.ease(p)}`, delay)
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
        @keyframes rf-fus   { from { opacity: 0; transform: translateY(16px) scale(.88) } to { opacity: 1; transform: translateY(0) scale(1) } }
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
    id: 'blur-rise',
    name: 'Blur Rise',
    category: 'Logo',
    icon: '🌫️',
    pro: false,
    baseDuration: 0.7,
    description: 'Materialises from a soft blur — motion.dev\'s signature entrance effect.',
    apply(el, p) {
      const d = B.dur(0.7, p)
      B.css(el, `
        @keyframes rf-blur-in  { from { opacity: 0; filter: blur(10px); transform: translateY(8px) scale(.97) } to { opacity: 1; filter: blur(0px); transform: translateY(0) scale(1) } }
        @keyframes rf-blur-out { from { opacity: 1; filter: blur(0px);  transform: translateY(0) scale(1) } to { opacity: 0; filter: blur(10px); transform: translateY(8px) scale(.97) } }
      `)
      B.targets(el, p.scope).forEach((e, i) => {
        e.style.transformOrigin = 'center'
        const delay = p.delay + i * 0.07
        const kf = p.direction === 'out' ? 'rf-blur-out' : 'rf-blur-in'
        B.anim(e, `${kf} ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both ${B.ease(p)}`, delay)
      })
    },
  },

  {
    id: 'skew-reveal',
    name: 'Skew Reveal',
    category: 'Logo',
    icon: '📐',
    pro: false,
    baseDuration: 0.65,
    description: 'Each element slides in with a snap skew — motion.dev\'s slide + perspective variant.',
    apply(el, p) {
      const d = B.dur(0.65, p)
      B.css(el, `
        @keyframes rf-skew-in  { from { opacity: 0; transform: skewY(-6deg) translateY(20px) } to { opacity: 1; transform: skewY(0deg) translateY(0) } }
        @keyframes rf-skew-out { from { opacity: 1; transform: skewY(0deg) translateY(0) } to { opacity: 0; transform: skewY(-6deg) translateY(20px) } }
      `)
      B.targets(el, p.scope).forEach((e, i) => {
        e.style.transformOrigin = 'bottom center'
        const delay = p.delay + i * 0.06
        const kf = p.direction === 'out' ? 'rf-skew-out' : 'rf-skew-in'
        B.anim(e, `${kf} ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both ${B.ease(p)}`, delay)
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
      B.css(el, `
        @keyframes rf-fr { from { clip-path: inset(0 100% 0 0) } to { clip-path: inset(0 0% 0 0) } }
      `)

      let targets: SVGElement[]
      if (p.scope === 'paths') {
        targets = B.targets(el, 'paths')
      } else if (p.scope === 'groups') {
        targets = [...el.querySelectorAll<SVGElement>(':scope > g')]
        if (!targets.length) targets = B.targets(el, 'groups')
      } else {
        targets = [...el.querySelectorAll<SVGElement>(':scope > g')]
        if (targets.length === 1) {
          const inner = [...targets[0].querySelectorAll<SVGElement>(':scope > g')]
          if (inner.length > 1) targets = inner
        }
        if (targets.length <= 1) targets = B.targets(el, p.scope)
      }

      targets.forEach((e, i) => {
        const delay = p.delay + i * 0.12
        B.anim(e, `rf-fr ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both cubic-bezier(0.4,0,0.2,1)`, delay)
      })
    },
  },

  // ── motion.dev Batch 1 — Cascade ────────────────────────────

  {
    id: 'slide-in',
    name: 'Slide In',
    category: 'Logo',
    icon: '➡️',
    pro: false,
    baseDuration: 0.6,
    description: 'Sharp horizontal slide entrance — each element arrives from the left in quick succession.',
    apply(el, p) {
      const d = B.dur(0.6, p)
      B.css(el, `
        @keyframes rf-sli-in  { from { opacity: 0; transform: translateX(-32px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes rf-sli-out { from { opacity: 1; transform: translateX(0) } to { opacity: 0; transform: translateX(-32px) } }
      `)
      B.targets(el, p.scope).forEach((e, i) => {
        const delay = p.delay + i * 0.05
        const kf = p.direction === 'out' ? 'rf-sli-out' : 'rf-sli-in'
        B.anim(e, `${kf} ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both cubic-bezier(.22,1,.36,1)`, delay)
      })
    },
  },

  {
    id: 'zoom-in',
    name: 'Zoom In',
    category: 'Logo',
    icon: '🔍',
    pro: false,
    baseDuration: 0.55,
    description: 'Scales from 75 % to full size — confident entrance with no spring.',
    apply(el, p) {
      const d = B.dur(0.55, p)
      B.css(el, `
        @keyframes rf-zin  { from { opacity: 0; transform: scale(0.75) } to { opacity: 1; transform: scale(1) } }
        @keyframes rf-zout { from { opacity: 1; transform: scale(1) } to { opacity: 0; transform: scale(0.75) } }
      `)
      B.targets(el, p.scope).forEach((e, i) => {
        e.style.transformOrigin = 'center'
        const delay = p.delay + i * 0.05
        const kf = p.direction === 'out' ? 'rf-zout' : 'rf-zin'
        B.anim(e, `${kf} ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both cubic-bezier(.4,0,.2,1)`, delay)
      })
    },
  },

  {
    id: 'cascade',
    name: 'Cascade',
    category: 'Logo',
    icon: '🌊',
    pro: false,
    baseDuration: 0.55,
    description: 'Scroll-trigger-style: each element wipes in from its bottom edge, tight stagger.',
    apply(el, p) {
      const d = B.dur(0.55, p)
      B.css(el, `
        @keyframes rf-casc-in  {
          from { clip-path: inset(0 0 100% 0); opacity: 0; transform: translateY(6px) }
          8%   { opacity: 1 }
          to   { clip-path: inset(0 0 0% 0);   opacity: 1; transform: translateY(0) }
        }
        @keyframes rf-casc-out {
          from { clip-path: inset(0 0 0% 0);   opacity: 1; transform: translateY(0) }
          to   { clip-path: inset(0 0 100% 0); opacity: 0; transform: translateY(6px) }
        }
      `)
      B.targets(el, p.scope).forEach((e, i) => {
        const delay = p.delay + i * 0.08
        const kf = p.direction === 'out' ? 'rf-casc-out' : 'rf-casc-in'
        B.anim(e, `${kf} ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both ${B.ease(p)}`, delay)
      })
    },
  },
]
