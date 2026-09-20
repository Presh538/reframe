/**
 * /animated-svg-logo — SEO landing page targeting "animated SVG logo".
 * Server-rendered, crawlable content that links into the editor. See Landing.tsx.
 *
 * Every claim here is one the product can be held to: free and account-free,
 * AI or preset animation, GIF/WebM/Lottie export, watermark on free raster
 * exports only. No resolution claims, and nothing about CSS export while it is
 * still unreleased.
 */

import { LandingPage, buildLandingMetadata, type LandingConfig } from '@/components/seo/Landing'

const config: LandingConfig = {
  path: '/animated-svg-logo',
  eyebrow: 'Animated logo',
  title: 'Animated SVG Logo — Animate Your Logo Free in the Browser | Reframe',
  description:
    'Turn your SVG logo into an animation free, in your browser. Describe the motion in plain English or pick a preset, then export GIF, WebM, or Lottie. No After Effects, no account.',
  h1: 'Make an animated SVG logo',
  heroSubhead:
    'Upload your logo, describe how it should move, and Reframe animates it. Export a GIF with a transparent background for a deck, or Lottie JSON for your site — without opening After Effects.',
  primaryCta: 'Animate your logo free →',
  howHeading: 'How to animate a logo',
  howSubhead: 'From a static SVG to a moving logo in about a minute.',
  steps: [
    ['Upload your logo', 'Drop in your SVG. It is processed in your browser and never stored on a server.'],
    ['Describe the motion', 'Type something like “draw the logo on, then settle” — or start from one of 30+ presets built for logos, icons and illustrations.'],
    ['Tune the timing', 'Adjust speed, easing, delay and direction, and choose whether whole groups or individual paths move.'],
    ['Export it', 'GIF with a transparent background for slides and email, WebM for video, or Lottie JSON for web and app.'],
  ],
  whyHeading: 'Why animate your logo as an SVG?',
  whyParagraphs: [
    'A logo is usually already an SVG, which makes it the ideal thing to animate: the paths, groups and shapes your designer drew are exactly what the animation moves. Nothing is traced, redrawn or rasterised first, so the result stays true to the original artwork.',
    'The traditional route is After Effects plus the Bodymovin plugin — paid software and a workflow built for motion designers, not for someone who just wants their logo to move on a landing page. Reframe runs in the browser, needs no account, and exports the formats you actually ship: GIF, WebM and Lottie JSON.',
  ],
  faqs: [
    ['How do I make an animated logo from an SVG?', 'Upload your SVG logo to Reframe, describe the motion in plain English or pick a preset, adjust the timing, then export to GIF, WebM, or Lottie JSON.'],
    ['Can I export a logo animation with a transparent background?', 'Yes. GIF export supports a transparent background, so the animation sits on any colour in a slide, email or page.'],
    ['Do I need After Effects to animate a logo?', 'No. Reframe animates and exports entirely in the browser — no After Effects, no Bodymovin plugin, no install.'],
    ['Is it free to animate my logo?', 'Yes, and no account is required. GIF and WebM exports carry a small Reframe watermark on the free tier. One AI credit removes it from an export, and Pro removes it from every export. Lottie exports are never watermarked.'],
  ],
  finalHeading: 'Animate your logo',
  finalSubhead: 'Upload an SVG, describe the motion, export in seconds — free, in your browser.',
  breadcrumbName: 'Animated SVG logo',
  howToName: 'How to make an animated SVG logo',
  howToDescription: 'Animate an SVG logo in the browser and export it as GIF, WebM, or Lottie JSON.',
}

export const metadata = buildLandingMetadata(config)

export default function Page() {
  return <LandingPage config={config} />
}
