import { B, type Preset } from './types'

export const illustrationPresets: Preset[] = [
  {
    id: 'float-loop',
    name: 'Float Loop',
    category: 'Illustration',
    icon: '🌊',
    pro: false,
    baseDuration: 2.6,
    description: 'Slow, organic up-down drift. Works beautifully with hero illustrations.',
    apply(el, p) {
      const d = B.dur(2.6, p)
      B.css(el, `
        @keyframes rf-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-13px) } }
      `)
      B.targets(el, p.scope).forEach(e => {
        B.anim(e, `rf-float ${d} ${p.delay.toFixed(3)}s infinite ease-in-out`, p.delay)
      })
    },
  },

  {
    id: 'shake',
    name: 'Shake',
    category: 'Illustration',
    icon: '📳',
    pro: false,
    baseDuration: 0.5,
    description: 'Rapid jitter — signals an error state or urgency.',
    apply(el, p) {
      const d = B.dur(0.5, p)
      B.css(el, `
        @keyframes rf-shake { 0%,100% { transform: translateX(0) } 10%,50%,90% { transform: translateX(-6px) rotate(-1deg) } 30%,70% { transform: translateX(6px) rotate(1deg) } }
      `)
      B.targets(el, p.scope).forEach(e => {
        B.anim(e, `rf-shake ${d} ${p.delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both`, p.delay)
      })
    },
  },

  {
    id: 'wave-path',
    name: 'Wave Path',
    category: 'Illustration',
    icon: '🌀',
    pro: false,
    baseDuration: 2.0,
    description: 'Organic skew-based ripple. Each layer offsets in time for depth.',
    apply(el, p) {
      const d = B.dur(2.0, p)
      B.css(el, `
        @keyframes rf-wave { 0%,100% { transform: skewX(0) translateX(0) } 25% { transform: skewX(4deg) translateX(4px) } 75% { transform: skewX(-4deg) translateX(-4px) } }
      `)
      B.targets(el, p.scope).forEach((e, i) => {
        const delay = p.delay + i * 0.15
        B.anim(e, `rf-wave ${d} ${delay.toFixed(3)}s infinite ease-in-out`, delay)
      })
    },
  },

  {
    id: 'stagger-reveal',
    name: 'Stagger Reveal',
    category: 'Illustration',
    icon: '📊',
    pro: false,
    baseDuration: 1.2,
    description: 'Child layers appear sequentially — creates a strong sense of progression.',
    apply(el, p) {
      const d = B.dur(0.45, p)
      B.css(el, `
        @keyframes rf-stag { from { opacity: 0; transform: translateY(14px) scale(.9) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `)
      B.allTargets(el).forEach((e, i) => {
        e.style.transformOrigin = 'center'
        e.style.opacity = '0'
        const delay = p.delay + i * 0.11
        B.anim(e, `rf-stag ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both ease-out`, delay)
      })
    },
  },
]
