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

  // ── motion.dev Batch 1 ──────────────────────────────────────

  {
    id: 'scale-stagger',
    name: 'Scale Stagger',
    category: 'Illustration',
    icon: '🔲',
    pro: false,
    baseDuration: 0.5,
    description: 'Each element scales in from 0 with a spring overshoot — motion.dev\'s staggerChildren showcase.',
    apply(el, p) {
      const d = B.dur(0.5, p)
      // Spring-like cubic-bezier: overshoots to 1.15 then settles
      B.css(el, `
        @keyframes rf-ss-in  { 0% { opacity: 0; transform: scale(0) } 60% { opacity: 1; transform: scale(1.14) } 80% { transform: scale(.96) } 100% { opacity: 1; transform: scale(1) } }
        @keyframes rf-ss-out { 0% { opacity: 1; transform: scale(1) } 40% { transform: scale(1.06); opacity: 1 } 100% { opacity: 0; transform: scale(0) } }
      `)
      B.allTargets(el).forEach((e, i) => {
        e.style.transformOrigin = 'center'
        const delay = p.delay + i * 0.05   // tight 50 ms stagger
        const kf = p.direction === 'out' ? 'rf-ss-out' : 'rf-ss-in'
        B.anim(e, `${kf} ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both`, delay)
      })
    },
  },

  {
    id: 'parallax-drift',
    name: 'Parallax Drift',
    category: 'Illustration',
    icon: '🌌',
    pro: false,
    baseDuration: 3.0,
    description: 'Each layer floats at a different depth and speed — creates an organic 3D parallax illusion.',
    apply(el, p) {
      const targets = B.targets(el, p.scope)
      targets.forEach((e, i) => {
        const depth  = 1 + i / Math.max(targets.length - 1, 1) // 1.0 → 2.0
        const dur    = (3.0 * depth / p.speed).toFixed(3)
        const yAmt   = Math.round(8 + i * 4)
        const xAmt   = Math.round(3 + i * 2)
        const kfName = `rf-pdrift-${i}`
        B.css(el, `
          @keyframes ${kfName} {
            0%,100% { transform: translate(0, 0) }
            25%     { transform: translate(${xAmt}px, -${yAmt}px) }
            50%     { transform: translate(0, -${Math.round(yAmt * 1.4)}px) }
            75%     { transform: translate(-${xAmt}px, -${yAmt}px) }
          }
        `)
        const delay = p.delay + i * 0.3
        B.anim(e, `${kfName} ${dur}s ${delay.toFixed(3)}s infinite ease-in-out`, delay)
      })
    },
  },

  // ── formerly premium — now free ─────────────────────────────

  {
    id: 'liquid-morph',
    name: 'Liquid Morph',
    category: 'Illustration',
    icon: '🫧',
    pro: false,
    baseDuration: 1.6,
    description: 'Shapes condense from an organic blob into sharp form — CSS blur+contrast path morphing.',
    apply(el, p) {
      const d = B.dur(1.6, p)
      B.css(el, `
        @keyframes rf-lm-in {
          0%   { filter: blur(14px) contrast(18) saturate(0); opacity: 0; transform: scale(0.92) }
          18%  { opacity: 1 }
          60%  { filter: blur(5px)  contrast(12) saturate(1.4); transform: scale(1.02) }
          100% { filter: blur(0px)  contrast(1)  saturate(1);   transform: scale(1) }
        }
        @keyframes rf-lm-out {
          0%   { filter: blur(0px)  contrast(1)  saturate(1);   transform: scale(1) }
          40%  { filter: blur(5px)  contrast(12) saturate(1.4); transform: scale(1.02) }
          82%  { opacity: 1 }
          100% { filter: blur(14px) contrast(18) saturate(0);   transform: scale(0.92); opacity: 0 }
        }
      `)
      const kf = p.direction === 'out' ? 'rf-lm-out' : 'rf-lm-in'
      B.anim(el as unknown as SVGElement, `${kf} ${d} ${p.delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both ${B.ease(p)}`, p.delay)
    },
  },

  {
    id: 'hue-sweep',
    name: 'Hue Sweep',
    category: 'Illustration',
    icon: '🌈',
    pro: false,
    baseDuration: 1.2,
    description: 'A smooth hue rotation washes across each element on entrance — filter-based colour shift.',
    apply(el, p) {
      const d = B.dur(1.2, p)
      B.css(el, `
        @keyframes rf-hue-in {
          0%   { opacity: 0; filter: saturate(0) hue-rotate(0deg)   brightness(0.7); transform: scale(0.94) }
          30%  { opacity: 1; filter: saturate(2) hue-rotate(120deg) brightness(1.2); transform: scale(1.02) }
          65%  {             filter: saturate(1.5) hue-rotate(240deg) brightness(1.1) }
          100% {             filter: saturate(1) hue-rotate(360deg) brightness(1);   transform: scale(1) }
        }
        @keyframes rf-hue-out {
          0%   {             filter: saturate(1) hue-rotate(0deg) brightness(1);     transform: scale(1) }
          35%  {             filter: saturate(1.5) hue-rotate(120deg) brightness(1.1) }
          70%  { opacity: 1; filter: saturate(2) hue-rotate(240deg) brightness(1.2); transform: scale(1.02) }
          100% { opacity: 0; filter: saturate(0) hue-rotate(360deg) brightness(0.7); transform: scale(0.94) }
        }
      `)
      B.targets(el, p.scope).forEach((e, i) => {
        e.style.transformOrigin = 'center'
        const delay = p.delay + i * 0.09
        const kf = p.direction === 'out' ? 'rf-hue-out' : 'rf-hue-in'
        B.anim(e, `${kf} ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both ${B.ease(p)}`, delay)
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
        B.anim(e, `rf-stag ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both ${B.ease(p)}`, delay)
      })
    },
  },
]
