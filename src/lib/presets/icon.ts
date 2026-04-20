import { B, type Preset } from './types'

export const iconPresets: Preset[] = [
  {
    id: 'wiggle',
    name: 'Wiggle',
    category: 'Icon',
    icon: '〰️',
    pro: false,
    baseDuration: 0.55,
    description: 'Quick left-right shake — great for notification and attention states.',
    apply(el, p) {
      const d = B.dur(0.55, p)
      B.css(el, `
        @keyframes rf-wig { 0%,100% { transform: rotate(0) } 15% { transform: rotate(-13deg) } 45% { transform: rotate(13deg) } 65% { transform: rotate(-8deg) } 80% { transform: rotate(8deg) } 92% { transform: rotate(-3deg) } }
      `)
      B.targets(el, p.scope).forEach(e => {
        e.style.transformOrigin = 'center'
        B.anim(e, `rf-wig ${d} ${p.delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both`, p.delay)
      })
    },
  },

  {
    id: 'pulse-breathe',
    name: 'Pulse / Breathe',
    category: 'Icon',
    icon: '💓',
    pro: false,
    baseDuration: 1.6,
    description: 'Gentle scale loop — perfect for live indicators and ambient status.',
    apply(el, p) {
      const d = B.dur(1.6, p)
      B.css(el, `
        @keyframes rf-pulse { 0%,100% { transform: scale(1); opacity: 1 } 50% { transform: scale(1.09); opacity: .85 } }
      `)
      B.targets(el, p.scope).forEach(e => {
        e.style.transformOrigin = 'center'
        B.anim(e, `rf-pulse ${d} ${p.delay.toFixed(3)}s infinite ease-in-out`, p.delay)
      })
    },
  },

  {
    id: 'spin-loop',
    name: 'Spin Loop',
    category: 'Icon',
    icon: '🔄',
    pro: false,
    baseDuration: 1.0,
    description: 'Continuous 360° rotation — synced to speed slider.',
    apply(el, p) {
      const d = B.dur(1.0, p)
      B.css(el, `
        @keyframes rf-spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
      `)
      B.targets(el, p.scope).forEach(e => {
        e.style.transformOrigin = 'center'
        B.anim(e, `rf-spin ${d} ${p.delay.toFixed(3)}s infinite linear`, p.delay)
      })
    },
  },

  // ── motion.dev Batch 1 ──────────────────────────────────────

  {
    id: 'path-in',
    name: 'Path In',
    category: 'Icon',
    icon: '🖊️',
    pro: false,
    baseDuration: 1.0,
    description: 'Pure stroke-trace per element — faithful to motion.dev\'s pathLength: 0 → 1 technique.',
    apply(el, p) {
      const d = B.dur(1.0, p)
      B.css(el, `
        @keyframes rf-path-in  { from { stroke-dashoffset: var(--rf-L) } to { stroke-dashoffset: 0 } }
        @keyframes rf-path-out { from { stroke-dashoffset: 0 } to { stroke-dashoffset: var(--rf-L) } }
      `)
      B.strokeTargets(el, p.scope).forEach((e, i) => {
        const L = B.plen(e)
        e.style.setProperty('--rf-L', String(L))
        e.style.strokeDasharray = String(L)
        e.style.strokeDashoffset = String(L)

        const hasStroke = e.getAttribute('stroke') && e.getAttribute('stroke') !== 'none'
        if (!hasStroke) {
          const fill = e.getAttribute('fill') ?? ''
          if (fill && fill !== 'none' && !fill.startsWith('url(')) {
            e.setAttribute('stroke', fill)
            e.setAttribute('fill', 'none')
            e.setAttribute('data-rf-stroke-added', '1')
          }
          if (!e.getAttribute('stroke-width')) {
            e.setAttribute('stroke-width', '1.5')
            e.setAttribute('data-rf-sw-added', '1')
          }
        }

        const delay = p.delay + i * 0.12
        const kf = p.direction === 'out' ? 'rf-path-out' : 'rf-path-in'
        B.anim(e, `${kf} ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both ${B.ease(p)}`, delay)
      })
    },
  },

  {
    id: 'pop-settle',
    name: 'Pop + Settle',
    category: 'Icon',
    icon: '🎯',
    pro: false,
    baseDuration: 0.7,
    description: 'Scale overshoot then settles — snappy and satisfying.',
    apply(el, p) {
      const d = B.dur(0.7, p)
      B.css(el, `
        @keyframes rf-pop { 0% { transform: scale(0); opacity: 0 } 50% { transform: scale(1.28); opacity: 1 } 75% { transform: scale(.93) } 90% { transform: scale(1.05) } 100% { transform: scale(1) } }
      `)
      B.targets(el, p.scope).forEach((e, i) => {
        e.style.transformOrigin = 'center'
        const delay = p.delay + i * 0.05
        B.anim(e, `rf-pop ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both cubic-bezier(.34,1.56,.64,1)`, delay)
      })
    },
  },

  {
    id: 'tada',
    name: 'Tada',
    category: 'Icon',
    icon: '🎉',
    pro: false,
    baseDuration: 0.9,
    description: 'Scale spike + rotation shake — the classic attention seeker for celebrations and notifications.',
    apply(el, p) {
      const d = B.dur(0.9, p)
      B.css(el, `
        @keyframes rf-tada {
          0%,100% { transform: scale(1) rotate(0deg) }
          10%,20% { transform: scale(0.9) rotate(-3deg) }
          30%,50%,70%,90% { transform: scale(1.12) rotate(3deg) }
          40%,60%,80%     { transform: scale(1.12) rotate(-3deg) }
        }
      `)
      B.targets(el, p.scope).forEach((e, i) => {
        e.style.transformOrigin = 'center'
        const delay = p.delay + i * 0.06
        B.anim(e, `rf-tada ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both`, delay)
      })
    },
  },

  {
    id: 'bounce-loop',
    name: 'Bounce Loop',
    category: 'Icon',
    icon: '⚽',
    pro: false,
    baseDuration: 0.7,
    description: 'Continuous elastic bounce — playful idle loop for interactive and hover states.',
    apply(el, p) {
      const d = B.dur(0.7, p)
      B.css(el, `
        @keyframes rf-bloop {
          0%,20%,50%,80%,100% { transform: translateY(0) }
          40% { transform: translateY(-14px) }
          60% { transform: translateY(-7px) }
        }
      `)
      B.targets(el, p.scope).forEach((e, i) => {
        const delay = p.delay + i * 0.08
        B.anim(e, `rf-bloop ${d} ${delay.toFixed(3)}s infinite ease-in-out`, delay)
      })
    },
  },

  {
    id: 'flip',
    name: 'Flip',
    category: 'Icon',
    icon: '🃏',
    pro: false,
    baseDuration: 0.65,
    description: 'Perspective Y-axis flip — coin-toss reveal with a snappy spring settle.',
    apply(el, p) {
      const d = B.dur(0.65, p)
      B.css(el, `
        @keyframes rf-flip-in  { from { opacity: 0; transform: perspective(400px) rotateY(90deg) } 40% { transform: perspective(400px) rotateY(-15deg) } 70% { transform: perspective(400px) rotateY(10deg) } to { opacity: 1; transform: perspective(400px) rotateY(0deg) } }
        @keyframes rf-flip-out { from { opacity: 1; transform: perspective(400px) rotateY(0deg) } 30% { transform: perspective(400px) rotateY(15deg) } to { opacity: 0; transform: perspective(400px) rotateY(90deg) } }
      `)
      B.targets(el, p.scope).forEach((e, i) => {
        e.style.transformOrigin = 'center'
        const delay = p.delay + i * 0.07
        const kf = p.direction === 'out' ? 'rf-flip-out' : 'rf-flip-in'
        B.anim(e, `${kf} ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both ${B.ease(p)}`, delay)
      })
    },
  },

  // ── filter-based effects ────────────────────────────────────

  {
    id: 'glow-pulse',
    name: 'Glow Pulse',
    category: 'Icon',
    icon: '✨',
    pro: false,
    baseDuration: 1.8,
    description: 'Continuous drop-shadow glow loop — great for active states and highlights.',
    apply(el, p) {
      const d = B.dur(1.8, p)
      B.css(el, `
        @keyframes rf-glow {
          0%, 100% { filter: drop-shadow(0 0 0px currentColor) brightness(1) }
          50%       { filter: drop-shadow(0 0 10px currentColor) brightness(1.25) }
        }
      `)
      B.targets(el, p.scope).forEach((e, i) => {
        const delay = p.delay + i * 0.12
        B.anim(e, `rf-glow ${d} ${delay.toFixed(3)}s infinite ease-in-out`, delay)
      })
    },
  },

  {
    id: 'color-pop',
    name: 'Color Pop',
    category: 'Icon',
    icon: '🎨',
    pro: false,
    baseDuration: 0.75,
    description: 'Starts desaturated and pops to full color with a scale — filter-based entrance.',
    apply(el, p) {
      const d = B.dur(0.75, p)
      B.css(el, `
        @keyframes rf-cpop-in  {
          0%   { filter: saturate(0) brightness(0.85); transform: scale(0.88); opacity: 0 }
          55%  { filter: saturate(2) brightness(1.15); transform: scale(1.06); opacity: 1 }
          100% { filter: saturate(1) brightness(1);    transform: scale(1);    opacity: 1 }
        }
        @keyframes rf-cpop-out {
          0%   { filter: saturate(1) brightness(1);    transform: scale(1);    opacity: 1 }
          45%  { filter: saturate(2) brightness(1.15); transform: scale(1.06); opacity: 1 }
          100% { filter: saturate(0) brightness(0.85); transform: scale(0.88); opacity: 0 }
        }
      `)
      B.targets(el, p.scope).forEach((e, i) => {
        e.style.transformOrigin = 'center'
        const delay = p.delay + i * 0.07
        const kf = p.direction === 'out' ? 'rf-cpop-out' : 'rf-cpop-in'
        B.anim(e, `${kf} ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both ${B.ease(p)}`, delay)
      })
    },
  },
]
