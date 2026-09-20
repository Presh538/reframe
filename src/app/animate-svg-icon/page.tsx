/**
 * /animate-svg-icon — SEO landing page targeting "animate SVG icon".
 * Server-rendered, crawlable content that links into the editor. See Landing.tsx.
 */

import { LandingPage, buildLandingMetadata, type LandingConfig } from '@/components/seo/Landing'

const config: LandingConfig = {
  path: '/animate-svg-icon',
  eyebrow: 'Icon animation',
  title: 'Animate an SVG Icon — Free Icon Animation in the Browser | Reframe',
  description:
    'Animate SVG icons free in your browser. Describe the motion or pick a preset, then export Lottie JSON for your UI or a GIF with a transparent background. No After Effects, no account.',
  h1: 'Animate an SVG icon',
  heroSubhead:
    'Give an icon a bit of motion — a draw-on, a fade, a bounce — without a motion designer. Animate it in the browser and export Lottie JSON for your interface or a transparent GIF for anywhere else.',
  primaryCta: 'Animate an icon free →',
  howHeading: 'How to animate an icon',
  howSubhead: 'Icons are small and clean, which makes them the easiest thing to animate well.',
  steps: [
    ['Drop in the icon', 'Upload any SVG icon. It is processed in your browser and never stored on a server.'],
    ['Pick the motion', 'Choose a preset, or describe what you want in plain English and let the AI apply it.'],
    ['Target what moves', 'Animate all layers, only groups, or individual paths — useful when one stroke should draw while the rest holds still.'],
    ['Export for your UI', 'Lottie JSON for web and mobile interfaces, or a GIF with a transparent background.'],
  ],
  whyHeading: 'Why animate icons at all?',
  whyParagraphs: [
    'An icon that responds — a checkmark that draws itself, a menu that folds, a heart that pulses — tells someone their action registered. It is the cheapest kind of interface feedback, because the artwork already exists and only the motion is new.',
    'Icons are also the easiest SVGs to animate cleanly. They are small, have few paths, and are usually drawn on a tidy grid, so a draw-on or a scale reads clearly instead of turning to mush. That is why Reframe ships presets built specifically for icons alongside those for logos and illustrations.',
  ],
  faqs: [
    ['How do I animate an SVG icon?', 'Upload the icon to Reframe, pick a preset or describe the motion in plain English, choose whether groups or individual paths move, then export Lottie JSON or a GIF.'],
    ['Can I animate just one path in the icon?', 'Yes. Target all layers, groups, or paths, so a single stroke can draw while the rest of the icon stays still.'],
    ['What format is best for an animated icon in a UI?', 'Lottie JSON — it is vector-based, small, and plays with standard players on web and mobile. Use a transparent GIF when you need a plain file instead.'],
    ['Is animating icons free?', 'Yes, and no account is needed. Lottie exports are never watermarked. Free GIF and WebM exports carry a small Reframe watermark, removed by one AI credit per export or by Pro.'],
  ],
  finalHeading: 'Animate your icon',
  finalSubhead: 'Upload an SVG icon, add motion, export Lottie or GIF — free, in your browser.',
  breadcrumbName: 'Animate SVG icon',
  howToName: 'How to animate an SVG icon',
  howToDescription: 'Animate an SVG icon in the browser and export it as Lottie JSON or a GIF.',
}

export const metadata = buildLandingMetadata(config)

export default function Page() {
  return <LandingPage config={config} />
}
