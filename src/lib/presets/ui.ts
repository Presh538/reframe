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
        B.anim(e, `rf-ck ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both ease-in-out`, delay)
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
        B.anim(e, `${kf} ${d} ${delay.toFixed(3)}s ${B.iter(p)} ${B.dir(p)} both ease-out`, delay)
      })
    },
  },
]
