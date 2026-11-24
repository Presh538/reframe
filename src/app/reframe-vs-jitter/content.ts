// Content for reframe-vs-jitter, shared by the page and its social image.
//
// Every Jitter claim below comes from the pages in `comparison.sources`, read
// on 23 Nov 2026. Jitter's prices weren't readable from its pricing page, and
// its help centre doesn't say whether the free watermark applies to Lottie, so
// neither is claimed here. Re-check before adding either.
import type { LandingConfig } from '@/components/seo/Landing'

export const config: LandingConfig = {
  path: '/reframe-vs-jitter',
  eyebrow: 'Reframe vs Jitter',
  title: 'Reframe vs Jitter: Animate an SVG, Export SVG or Lottie | Reframe',
  description:
    'Reframe vs Jitter compared. Jitter is a motion design canvas for product videos; Reframe animates an existing SVG and exports animated SVG or Lottie free.',
  h1: 'Reframe vs Jitter',
  heroSubhead:
    'Jitter is a motion design tool for product videos and UI animation, with a design canvas, Figma import and video export. Reframe is for a smaller job: animating an SVG you already have, and exporting it as animated SVG, Lottie, GIF or WebM.',
  primaryCta: 'Animate your SVG free →',
  comparison: {
    heading: 'At a glance',
    competitor: 'Jitter',
    rows: [
      ['Best for', 'Animating one existing SVG: a logo, icon, loader or illustration', 'Designing multi-scene motion: product videos, social clips, UI animations'],
      ['Animated SVG export', 'Yes, free and never watermarked', 'Not among its export formats'],
      ['Lottie export', 'Free, never watermarked', 'Available on the free plan'],
      ['Video and GIF', 'GIF and WebM, free with a small watermark that a credit or Pro removes', 'GIF, MP4, WebM and MOV; the free plan exports at 720p and 30 fps with a Jitter watermark'],
      ['Starting point', 'Upload an SVG', 'Design on Jitter’s canvas, or import from Figma'],
      ['AI', 'Plain-English prompt that applies and tunes an animation', 'AI Brainstorm and AI effects, with limited AI credits on the free plan'],
      ['Free plan limits', 'No file or export limit; a daily allowance of AI generations', '3 workspace files and 20 MB uploads'],
    ],
    checkedOn: '23 November 2026',
    sources: [
      ['Jitter pricing', 'https://jitter.video/pricing/'],
      ['Compare Jitter’s plans', 'https://help.jitter.video/en/articles/14809073-compare-jitter-s-subscription-plans'],
      ['Export your work', 'https://help.jitter.video/en/articles/5369843-export-your-work'],
    ],
  },
  howHeading: 'How animating an SVG works in Reframe',
  howSubhead: 'No canvas to set up. Start from the file you have.',
  steps: [
    ['Upload your SVG', 'Drag in any SVG up to 50 MB. It’s checked and cleaned for safety, and we don’t keep a copy.'],
    ['Describe the motion or pick a preset', 'Type something like “make the logo bounce in slowly” and the AI chooses from 35 animation styles, or pick a one-click preset.'],
    ['Fine-tune', 'Adjust speed, easing, delay and direction, and choose which elements move.'],
    ['Export', 'Download animated SVG, Lottie JSON, GIF or WebM.'],
  ],
  whyHeading: 'Which one should you use?',
  whyParagraphs: [
    'Choose Jitter if you’re designing motion from scratch: a product launch video, a sequence of UI screens, or social content with several scenes. It works like a design tool, imports from Figma, and its paid plans export high-resolution video without a watermark.',
    'Choose Reframe if you already have the artwork as an SVG and need it moving on a website or in an app. Reframe exports animated SVG, which plays in any browser with no player library and stays small for simple artwork, and Lottie JSON, both free and never watermarked.',
    'The two overlap less than they seem. Jitter is for making motion pieces; Reframe is for giving an existing vector graphic motion and getting it into a web-ready format quickly.',
  ],
  faqs: [
    ['Can Jitter export animated SVG?', 'Animated SVG isn’t among the export formats Jitter lists in its help centre (GIF, MP4, WebM, MOV and Lottie). Reframe exports animated SVG free.'],
    ['Is Jitter free?', 'Jitter has a free plan with 3 workspace files and video, GIF and Lottie export at 720p and 30 fps. Free exports carry a Jitter watermark, which paid plans remove.'],
    ['Is Reframe a Jitter alternative?', 'For animating a single SVG and exporting it for the web, yes. For multi-scene product videos and social content, Jitter is the better fit.'],
    ['Which is better for an animated logo?', 'If the logo is already an SVG and you want it on a website or in an app, Reframe is quicker and its animated SVG and Lottie exports are free and unwatermarked. If the logo is part of a larger video, use Jitter.'],
    ['Can I import from Figma into Reframe?', 'Not directly. Export your frame or logo from Figma as SVG, then upload it to Reframe.'],
  ],
  finalHeading: 'Try it on your own SVG',
  finalSubhead: 'Animated SVG and Lottie export, free and never watermarked. No account needed.',
  breadcrumbName: 'Reframe vs Jitter',
  howToName: 'How to animate an SVG in Reframe',
  howToDescription: 'Upload an SVG, describe the motion or pick a preset, fine-tune, and export animated SVG, Lottie, GIF or WebM.',
}
