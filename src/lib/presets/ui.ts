import { B, type Preset } from './types'

export const uiPresets: Preset[] = [
  {
    id: 'checkmark-draw',
    name: 'Checkmark Draw',
    category: 'UI',
    icon: '✅',
    pro: false,
    baseDuration: 0.6,
    description: 'stroke-dashoffset reveal — the classic success confirmation animation.',
    apply(el, p) {
      const d = B.dur(0.6, p)
      B.css(el, `
        @keyframes rf-ck { from { stroke-dashoffset: var(--rf-L, 300); opacity: 0 } 8% { opacity: 1 } to { stroke-dashoffset: 0 } }
      `)
      B.strokeTargets(el, p.scope).forEach((e, i) => {
        const L = B.plen(e)
        e.style.setProperty('--rf-L', String(L))
        e.style.strokeDasharray = String(L)
        e.style.strokeDashoffset = String(L)
        if (!e.getAttribute('stroke')) e.setAttribute('stroke', 'currentColor')
        const delay = p.delay + i * 0.12
        B.anim(e, `rf-ck ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both ${B.ease(p)}`, delay)
      })
    },
  },

  {
    id: 'loading-spin',
    name: 'Loading Spin',
    category: 'UI',
    icon: '⏳',
    pro: false,
    baseDuration: 1.0,
    description: 'Arc rotation loop — natural loading indicator for circular icons.',
    apply(el, p) {
      const d = B.dur(1.0, p)
      B.css(el, `
        @keyframes rf-load { from { transform: rotate(0); stroke-dashoffset: 0 } to { transform: rotate(360deg); stroke-dashoffset: -70 } }
      `)
      B.targets(el, p.scope).forEach(e => {
        e.style.transformOrigin = 'center'
        const L = B.plen(e)
        if (L > 10) e.style.strokeDasharray = `${(L * 0.28).toFixed(1)} ${(L * 0.72).toFixed(1)}`
        B.anim(e, `rf-load ${d} ${p.delay.toFixed(3)}s infinite linear`, p.delay)
      })
    },
  },

  {
    id: 'arrow-slide-in',
    name: 'Arrow Slide In',
    category: 'UI',
    icon: '➡️',
    pro: false,
    baseDuration: 0.7,
    description: 'Directional slide entrance — alternates sides for multi-element SVGs.',
    apply(el, p) {
      const d = B.dur(0.7, p)
      B.css(el, `
        @keyframes rf-sl-l { from { opacity: 0; transform: translateX(-26px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes rf-sl-r { from { opacity: 0; transform: translateX(26px) } to { opacity: 1; transform: translateX(0) } }
      `)
      B.targets(el, p.scope).forEach((e, i) => {
        const kf = i % 2 === 0 ? 'rf-sl-l' : 'rf-sl-r'
        const delay = p.delay + i * 0.08
        B.anim(e, `${kf} ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both cubic-bezier(.22,1,.36,1)`, delay)
      })
    },
  },

  // ── formerly premium — now free ─────────────────────────────

  {
    id: 'typewriter',
    name: 'Typewriter',
    category: 'UI',
    icon: '⌨️',
    pro: false,
    baseDuration: 1.5,
    description: 'Stepped clip-path reveal from left — perfectly mimics a typewriter typing characters out.',
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
    category: 'UI',
    icon: '📏',
    pro: false,
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

  // ── new ──────────────────────────────────────────────────────

  {
    id: 'progress-fill',
    name: 'Progress Fill',
    category: 'UI',
    icon: '▶️',
    pro: false,
    baseDuration: 1.2,
    description: 'Scales from 0 to full width from the left edge — great for progress bars and data reveals.',
    apply(el, p) {
      const d = B.dur(1.2, p)
      B.css(el, `
        @keyframes rf-prog-in  { from { transform: scaleX(0); opacity: 0 } 5% { opacity: 1 } to { transform: scaleX(1) } }
        @keyframes rf-prog-out { from { transform: scaleX(1) } 95% { opacity: 1 } to { transform: scaleX(0); opacity: 0 } }
      `)
      B.targets(el, p.scope).forEach((e, i) => {
        e.style.transformOrigin = 'left center'
        const delay = p.delay + i * 0.1
        const kf = p.direction === 'out' ? 'rf-prog-out' : 'rf-prog-in'
        B.anim(e, `${kf} ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both cubic-bezier(.4,0,.2,1)`, delay)
      })
    },
  },

  {
    id: 'ping',
    name: 'Ping',
    category: 'UI',
    icon: '🔔',
    pro: false,
    baseDuration: 1.4,
    description: 'Scale + opacity ripple loop — radar pulse for live indicators and notification dots.',
    apply(el, p) {
      const d = B.dur(1.4, p)
      B.css(el, `
        @keyframes rf-ping {
          0%  { transform: scale(1);   opacity: 1 }
          75% { transform: scale(2.2); opacity: 0 }
          100%{ transform: scale(2.2); opacity: 0 }
        }
      `)
      B.targets(el, p.scope).forEach((e, i) => {
        e.style.transformOrigin = 'center'
        const delay = p.delay + i * 0.2
        B.anim(e, `rf-ping ${d} ${delay.toFixed(3)}s infinite ${B.ease(p)}`, delay)
      })
    },
  },

  {
    id: 'fade-blur',
    name: 'Fade + Blur',
    category: 'UI',
    icon: '🌫️',
    pro: false,
    baseDuration: 1.0,
    description: 'Defocus-to-focus reveal — premium feel with minimal motion.',
    apply(el, p) {
      const d = B.dur(1.0, p)
      B.css(el, `
        @keyframes rf-fb { from { opacity: 0; filter: blur(8px); transform: scale(1.05) } to { opacity: 1; filter: blur(0); transform: scale(1) } }
        @keyframes rf-fb-r { from { opacity: 1; filter: blur(0); transform: scale(1) } to { opacity: 0; filter: blur(8px); transform: scale(1.05) } }
      `)
      B.targets(el, p.scope).forEach((e, i) => {
        const kf = p.direction === 'out' ? 'rf-fb-r' : 'rf-fb'
        const delay = p.delay + i * 0.07
        B.anim(e, `${kf} ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both ${B.ease(p)}`, delay)
      })
    },
  },
]
