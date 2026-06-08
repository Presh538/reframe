/**
 * /animate-svg-with-ai — SEO landing page targeting "animate SVG with AI".
 * Server-rendered, crawlable content that links into the editor. See Landing.tsx.
 */

import { LandingPage, buildLandingMetadata, type LandingConfig } from '@/components/seo/Landing'

const config: LandingConfig = {
  path: '/animate-svg-with-ai',
  eyebrow: 'AI SVG Animator',
  title: 'Animate SVG with AI — Free Online | Reframe',
  description:
    'Animate any SVG with AI for free. Describe the motion in plain English and Reframe applies it instantly — then export to GIF, WebM, CSS, or Lottie. No timeline, no code, no After Effects.',
  h1: 'Animate SVG with AI — describe the motion, get the animation',
  heroSubhead:
    'Reframe is a free, browser-based SVG animator powered by AI. Type how you want your logo, icon, or illustration to move — in plain English — and the AI applies a polished animation in seconds. No timelines, no keyframes, no After Effects.',
  primaryCta: 'Animate your SVG free →',
  howHeading: 'How to animate an SVG with AI',
  howSubhead: 'From a static file to an exported animation in four steps.',
  steps: [
    ['Upload your SVG', 'Drag and drop any SVG file into Reframe, or start from a built-in example. Everything runs locally in your browser.'],
    ['Describe the motion in plain English', 'Type a prompt like “fade the icon in and gently bounce the logo.” The AI interprets it and applies the right animation to the right elements — no manual timeline work.'],
    ['Fine-tune speed and easing', 'Nudge timing, easing, delay, and which layers animate. Preview plays live as you adjust.'],
    ['Export or share', 'Export to GIF (with transparent background), WebM, CSS, or Lottie JSON — or copy a shareable preview link.'],
  ],
  whyHeading: 'Why animate SVGs with AI?',
  whyParagraphs: [
    'Most graphics spend their entire lives standing still. Motion makes a logo, icon, or product illustration feel alive — but traditional animation tools demand timelines, keyframes, plugins, or expensive software like After Effects. That complexity is why most SVGs never get animated at all.',
    'Reframe removes the friction. Instead of learning a motion app, you describe the result you want and let AI handle the mechanics. It’s built for designers, developers, and marketing teams who need polished motion fast — for websites, app onboarding, social posts, pitch decks, and product launches. Free, browser-based, and no account required.',
  ],
  faqs: [
    ['Can I animate an SVG using AI?', 'Yes. Reframe has an AI prompt bar — describe the motion you want in plain English (for example, “make the logo bounce in slowly”) and the AI applies and tunes the animation for you. No timeline or code needed.'],
    ['Is AI SVG animation free?', 'Yes. Reframe is free to use in the browser. Upload an SVG, animate it with an AI prompt or a preset, and export at no cost — no account required.'],
    ['What formats can I export to?', 'GIF (including transparent background), WebM video, CSS animation, and Lottie JSON, all with adjustable quality and frame rate.'],
    ['Do I need After Effects or coding skills?', 'No. Reframe runs entirely in your browser. You can animate an SVG with a plain-English AI prompt or a one-click preset — no After Effects, plugins, or code required.'],
  ],
  finalHeading: 'Animate your SVG in seconds',
  finalSubhead: 'Free, no sign-up, no install. Describe the motion and let AI do the rest.',
  breadcrumbName: 'Animate SVG with AI',
  howToName: 'How to animate an SVG with AI',
  howToDescription: 'Animate any SVG in seconds by describing the motion to an AI prompt.',
}

export const metadata = buildLandingMetadata(config)

export default function Page() {
  return <LandingPage config={config} />
}
