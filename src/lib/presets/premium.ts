import { B, type Preset } from './types'

export const premiumPresets: Preset[] = [
  {
    id: 'morph',
    name: 'Morph',
    category: 'Premium',
    icon: '🔮',
    pro: true,
    baseDuration: 1.5,
    description: 'SVG shape morphing via skew + scale — fluid organic transformation.',
    apply(el, p) {
      const d = B.dur(1.5, p)
      B.css(el, `
        @keyframes rf-morph { 0%,100% { transform: scale(1); filter: none } 25% { transform: scale(1.1,.9) skewX(6deg); filter: hue-rotate(40deg) } 50% { transform: scale(.9,1.1) skewX(-6deg); filter: hue-rotate(80deg) } 75% { transform: scale(1.06,.94) skewX(2deg) } }
      `)
      B.targets(el, p.scope).forEach(e => {
        e.style.transformOrigin = 'center'
        B.anim(e, `rf-morph ${d} ${p.delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} ease-in-out`, p.delay)
      })
    },
  },

  {
    id: 'typewriter',
    name: 'Typewriter',
    category: 'Premium',
    icon: '⌨️',
    pro: true,
    baseDuration: 1.5,
    description: 'clip-path reveal from left — great for text and horizontal layouts.',
    apply(el, p) {
      const d = B.dur(1.5, p)
      B.css(el, `
        @keyframes rf-type { from { clip-path: inset(0 100% 0 0) } to { clip-path: inset(0 0% 0 0) } }
      `)
      B.targets(el, p.scope).forEach((e, i) => {
        const delay = p.delay + i * 0.2
        B.anim(e, `rf-type ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both steps(20, end)`, delay)
      })
    },
  },

  {
    id: 'confetti-burst',
    name: 'Confetti Burst',
    category: 'Premium',
    icon: '🎉',
    pro: true,
    baseDuration: 1.0,
    description: 'Particle explosion from center — five directional keyframe variants.',
    apply(el, p) {
      const d = B.dur(1.0, p)
      B.css(el, `
        @keyframes rf-c0 { from { transform: translate(0) rotate(0) scale(0); opacity: 1 } to { transform: translate(-32px,-44px) rotate(720deg) scale(1); opacity: 0 } }
        @keyframes rf-c1 { from { transform: translate(0) rotate(0) scale(0); opacity: 1 } to { transform: translate(32px,-44px) rotate(-720deg) scale(1); opacity: 0 } }
        @keyframes rf-c2 { from { transform: translate(0) rotate(0) scale(0); opacity: 1 } to { transform: translate(-44px,22px) rotate(540deg) scale(.8); opacity: 0 } }
        @keyframes rf-c3 { from { transform: translate(0) rotate(0) scale(0); opacity: 1 } to { transform: translate(44px,22px) rotate(-540deg) scale(.8); opacity: 0 } }
        @keyframes rf-c4 { from { transform: translate(0) rotate(0) scale(0); opacity: 1 } to { transform: translate(0,-54px) rotate(900deg) scale(1.2); opacity: 0 } }
      `)
      B.targets(el, p.scope).forEach((e, i) => {
        e.style.transformOrigin = 'center'
        const delay = p.delay + i * 0.04
        B.anim(e, `rf-c${i % 5} ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} ease-out both`, delay)
      })
    },
  },

  {
    id: 'elastic-unfold',
    name: 'Elastic Unfold',
    category: 'Premium',
    icon: '📐',
    pro: true,
    baseDuration: 1.0,
    description: 'Accordion-style scaleY expansion with spring overshoot.',
    apply(el, p) {
      const d = B.dur(1.0, p)
      B.css(el, `
        @keyframes rf-eu { 0% { transform: scaleY(0); opacity: 0 } 55% { transform: scaleY(1.14) } 78% { transform: scaleY(.95) } 100% { transform: scaleY(1); opacity: 1 } }
      `)
      B.targets(el, p.scope).forEach((e, i) => {
        e.style.transformOrigin = 'top center'
        const delay = p.delay + i * 0.1
        B.anim(e, `rf-eu ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both cubic-bezier(.34,1.56,.64,1)`, delay)
      })
    },
  },
]
