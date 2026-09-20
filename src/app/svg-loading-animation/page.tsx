/**
 * /svg-loading-animation — SEO landing page targeting "SVG loading animation"
 * and the loader/spinner queries developers actually search.
 * Server-rendered, crawlable content that links into the editor. See Landing.tsx.
 *
 * Lottie leads here on purpose: it is the format developers ship loaders in,
 * and it is the one export that is never watermarked.
 */

import { LandingPage, buildLandingMetadata, type LandingConfig } from '@/components/seo/Landing'

const config: LandingConfig = {
  path: '/svg-loading-animation',
  eyebrow: 'Loaders & spinners',
  title: 'SVG Loading Animation — Make a Loader or Spinner Free | Reframe',
  description:
    'Make an SVG loading animation in your browser. Animate any SVG with AI or a preset and export Lottie JSON for the web, or a GIF with a transparent background. Free, no account.',
  h1: 'Make an SVG loading animation',
  heroSubhead:
    'Turn an icon or mark into a loader. Animate it with a prompt or a preset, loop it continuously, and export Lottie JSON to drop straight into your app — or a transparent GIF if you need a file.',
  primaryCta: 'Build a loader free →',
  howHeading: 'How to make a loading animation',
  howSubhead: 'A looping loader from any SVG, in the browser.',
  steps: [
    ['Start from an SVG', 'Upload an icon, logo mark or simple shape. It is processed in your browser and never stored.'],
    ['Add the motion', 'Describe it in plain English, or pick a preset. Set the loop to run continuously so it never stops while your page waits.'],
    ['Get the timing right', 'Tune speed, easing and delay, and target whole groups or individual paths so only the parts you want move.'],
    ['Export Lottie or GIF', 'Lottie JSON for lottie-web, lottie-react or any Lottie player, or a GIF with a transparent background.'],
  ],
  whyHeading: 'Why Lottie for a loader?',
  whyParagraphs: [
    'A loader is on screen while someone waits, so it needs to be small and sharp. Lottie renders as vectors from a JSON file, which keeps it crisp on any screen density and typically far lighter than an equivalent GIF — and it loops cleanly without the colour banding raster formats introduce.',
    'It also drops straight into a codebase. A Lottie file plays with lottie-web, lottie-react or any standard player, so a loader goes from artwork to shipped component without a designer round-trip or an After Effects licence.',
  ],
  faqs: [
    ['How do I make an SVG loading spinner?', 'Upload an SVG to Reframe, animate it with an AI prompt or a preset, set the loop to continuous, then export Lottie JSON or a GIF.'],
    ['Can I loop the animation forever?', 'Yes. Set the loop to continuous and the animation repeats until it is removed from the page.'],
    ['What format should a web loader be?', 'Lottie JSON is usually best: it is vector-based, small, loops cleanly and plays with standard players. A transparent GIF works when you need a single file with no player.'],
    ['Is it free?', 'Yes, with no account required. Lottie exports are never watermarked. GIF and WebM exports carry a small Reframe watermark on the free tier, removed by one AI credit per export or by Pro.'],
  ],
  finalHeading: 'Build your loader',
  finalSubhead: 'Animate an SVG, loop it, and export Lottie JSON — free, in your browser.',
  breadcrumbName: 'SVG loading animation',
  howToName: 'How to make an SVG loading animation',
  howToDescription: 'Animate an SVG into a looping loader and export it as Lottie JSON or a GIF.',
}

export const metadata = buildLandingMetadata(config)

export default function Page() {
  return <LandingPage config={config} />
}
