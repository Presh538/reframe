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
]
