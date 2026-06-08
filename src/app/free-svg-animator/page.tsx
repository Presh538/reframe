/**
 * /free-svg-animator — SEO landing page targeting "free SVG animator".
 * Server-rendered, crawlable content that links into the editor. See Landing.tsx.
 */

import { LandingPage, buildLandingMetadata, type LandingConfig } from '@/components/seo/Landing'

const config: LandingConfig = {
  path: '/free-svg-animator',
  eyebrow: 'Free SVG Animator',
  title: 'Free SVG Animator — Online, No Sign-Up | Reframe',
  description:
    'Reframe is a free online SVG animator. Animate any SVG with AI or 30+ presets, fine-tune speed and easing, then export to GIF, WebM, CSS, or Lottie. No account, no install, no After Effects.',
  h1: 'A free SVG animator that runs in your browser',
  heroSubhead:
    'Reframe is a free online SVG animator. Upload any SVG, animate it with an AI prompt or a one-click preset, fine-tune the motion, and export to GIF, WebM, CSS, or Lottie — all without an account, install, or After Effects.',
  primaryCta: 'Start animating free →',
  howHeading: 'How to animate an SVG for free',
  howSubhead: 'No sign-up, no download — just open it and go.',
  steps: [
    ['Upload your SVG', 'Drag and drop any SVG file, or start from a built-in example. Everything runs in your browser.'],
    ['Animate with AI or a preset', 'Describe the motion in plain English for the AI, or pick from 30+ hand-crafted presets.'],
    ['Fine-tune the motion', 'Adjust speed, easing, delay, and which elements animate until it feels right.'],
    ['Export or share', 'Export to GIF, WebM, CSS, or Lottie JSON, or copy a shareable preview link — all free.'],
  ],
  whyHeading: 'A genuinely free SVG animation tool',
  whyParagraphs: [
    'Most animation tools either cost money, gate exports behind a paywall, or demand a steep learning curve in software like After Effects. Reframe is different: it’s free to use, runs entirely in the browser, and asks for no account before you export your work.',
    'It’s built for designers, developers, and creators who want polished motion without the overhead — logos, icons, illustrations, and UI graphics animated in seconds. Add AI prompts, 30+ presets, fine-grained speed and easing control, and export to GIF, WebM, CSS, or Lottie, and you have a complete SVG animation workflow that costs nothing.',
  ],
  faqs: [
    ['Is Reframe really free?', 'Yes. Reframe is free to use in the browser. Upload an SVG, animate it, and export — no account and no payment required.'],
    ['What can I animate with it?', 'Any SVG — logos, icons, illustrations, and UI graphics. Use an AI prompt or pick from 30+ presets, then fine-tune speed and easing.'],
    ['What formats can I export to?', 'GIF (including transparent background), WebM video, CSS animation, and Lottie JSON, with adjustable quality and frame rate.'],
    ['Do I need to install anything or sign up?', 'No. Reframe runs entirely in your browser with no install and no account — just open it and start animating.'],
  ],
  finalHeading: 'Animate your SVG for free',
  finalSubhead: 'No account, no install, no cost. Upload an SVG and bring it to life.',
  breadcrumbName: 'Free SVG animator',
  howToName: 'How to animate an SVG for free',
  howToDescription: 'Animate any SVG free in the browser with AI or presets, then export.',
}

export const metadata = buildLandingMetadata(config)

export default function Page() {
  return <LandingPage config={config} />
}
