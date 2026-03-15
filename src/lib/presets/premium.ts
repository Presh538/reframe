import { B, type Preset } from './types'

export const premiumPresets: Preset[] = [

  {
    id: 'typewriter',
    name: 'Typewriter',
    category: 'Premium',
    icon: '⌨️',
    pro: true,
    baseDuration: 1.5,
    description: 'Stepped clip-path reveal from left — perfectly mimics a typewriter typing out.',
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
    id: 'elastic-unfold',
    name: 'Elastic Unfold',
    category: 'Premium',
    icon: '📏',
    pro: true,
    baseDuration: 1.0,
    description: 'Accordion-style scaleY expansion from the top edge with spring overshoot.',
    apply(el, p) {
      const d = B.dur(1.0, p)
      B.css(el, `
        @keyframes rf-eu-in  { 0% { transform: scaleY(0); opacity: 0 } 55% { transform: scaleY(1.14) } 78% { transform: scaleY(.95) } 100% { transform: scaleY(1); opacity: 1 } }
        @keyframes rf-eu-out { 0% { transform: scaleY(1); opacity: 1 } 30% { transform: scaleY(1.06) } 100% { transform: scaleY(0); opacity: 0 } }
      `)
      B.targets(el, p.scope).forEach((e, i) => {
        e.style.transformOrigin = 'top center'
        const delay = p.delay + i * 0.1
        const kf = p.direction === 'out' ? 'rf-eu-out' : 'rf-eu-in'
        B.anim(e, `${kf} ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both cubic-bezier(.34,1.56,.64,1)`, delay)
      })
    },
  },

  // ── motion.dev-inspired ──────────────────────────────────────

  {
    id: 'liquid-morph',
    name: 'Liquid Morph',
    category: 'Premium',
    icon: '🫧',
    pro: true,
    baseDuration: 1.6,
    description: 'Shapes condense from an organic blob into sharp form — CSS blur+contrast path morphing.',
    apply(el, p) {
      const d = B.dur(1.6, p)
      // The blur+contrast gooey technique: high blur makes edges bleed together into
      // organic blob shapes. As blur drops toward 0, elements resolve into their final
      // crisp form — a convincing generic path morphing effect that needs zero path data.
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
      // Apply to the SVG root so blur+contrast acts on all children together
      // (the gooey effect only works when applied to a parent containing all shapes)
      const kf = p.direction === 'out' ? 'rf-lm-out' : 'rf-lm-in'
      B.anim(el as unknown as SVGElement, `${kf} ${d} ${p.delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both ${B.ease(p)}`, p.delay)
    },
  },

  {
    id: 'hue-sweep',
    name: 'Hue Sweep',
    category: 'Premium',
    icon: '🌈',
    pro: true,
    baseDuration: 1.2,
    description: 'A smooth hue rotation washes across each element on entrance — filter-based.',
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
]
