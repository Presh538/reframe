/**
 * /svg-to-lottie — SEO landing page targeting "SVG to Lottie".
 * Server-rendered, crawlable content that links into the editor. See Landing.tsx.
 */

import { LandingPage, buildLandingMetadata, type LandingConfig } from '@/components/seo/Landing'

const config: LandingConfig = {
  path: '/svg-to-lottie',
  eyebrow: 'SVG to Lottie',
  title: 'SVG to Lottie — Animate & Export Lottie JSON Free | Reframe',
  description:
    'Convert SVG to Lottie JSON for free. Animate any SVG with AI or a preset in your browser, then export lightweight Lottie JSON for web and app. No After Effects or Bodymovin plugin needed.',
  h1: 'SVG to Lottie — animate it, then export Lottie JSON',
  heroSubhead:
    'Reframe animates your SVG and exports it as Lottie JSON — the lightweight, scalable format for web and mobile. Add motion with an AI prompt or a preset, then export Lottie without After Effects or the Bodymovin plugin.',
  primaryCta: 'Export SVG to Lottie free →',
  howHeading: 'How to convert an SVG to Lottie JSON',
  howSubhead: 'Animate in the browser, export production-ready Lottie.',
  steps: [
    ['Upload your SVG', 'Drag and drop any SVG into Reframe. It runs entirely in your browser — no install, no upload to a server.'],
    ['Animate it', 'Describe the motion in plain English for the AI, or choose from 30+ presets, then fine-tune speed and easing.'],
    ['Preview the motion', 'Play the animation live and adjust which elements move until it’s right.'],
    ['Export Lottie JSON', 'Export to Lottie JSON, ready to drop into a website or app with lottie-web, lottie-react, or any Lottie player.'],
  ],
  whyHeading: 'Why use Lottie instead of GIF or video?',
  whyParagraphs: [
    'Lottie is a JSON-based animation format that renders as vectors, so it stays razor-sharp at any size and any screen density — unlike GIF, which is raster and often heavy. Lottie files are typically a fraction of the size of an equivalent GIF or video, which keeps pages and apps fast.',
    'Traditionally, producing Lottie meant animating in After Effects and exporting with the Bodymovin plugin — a steep, paid workflow. Reframe gives you Lottie JSON straight from an SVG in the browser: animate with AI or a preset, then export. Free, no plugins, no desktop software.',
  ],
  faqs: [
    ['How do I convert an SVG to Lottie?', 'Upload your SVG to Reframe, animate it with an AI prompt or a preset, then export to Lottie JSON. No After Effects or Bodymovin required.'],
    ['What is Lottie JSON good for?', 'Lottie is ideal for web and mobile UI animation — onboarding, icons, loaders, and micro-interactions — because it’s vector-based, tiny, and scales perfectly on any screen.'],
    ['Do I need After Effects to make a Lottie file?', 'No. Reframe exports Lottie JSON directly from your animated SVG in the browser, with no After Effects or Bodymovin plugin.'],
    ['Is exporting to Lottie free?', 'Yes. Reframe is free to use, with no account required.'],
  ],
  finalHeading: 'Export your SVG as Lottie',
  finalSubhead: 'Animate in the browser and export lightweight Lottie JSON — free, no plugins.',
  breadcrumbName: 'SVG to Lottie',
  howToName: 'How to convert an SVG to Lottie JSON',
  howToDescription: 'Animate an SVG in the browser and export it as lightweight Lottie JSON.',
}

export const metadata = buildLandingMetadata(config)

export default function Page() {
  return <LandingPage config={config} />
}
