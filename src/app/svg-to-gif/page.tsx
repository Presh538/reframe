/**
 * /svg-to-gif — SEO landing page targeting "SVG to GIF".
 * Server-rendered, crawlable content that links into the editor. See Landing.tsx.
 */

import { LandingPage, buildLandingMetadata, type LandingConfig } from '@/components/seo/Landing'

const config: LandingConfig = {
  path: '/svg-to-gif',
  eyebrow: 'SVG to GIF Converter',
  title: 'SVG to GIF — Animate & Export Free Online | Reframe',
  description:
    'Convert SVG to an animated GIF for free. Animate any SVG with AI or a preset, then export a high-quality GIF — including transparent background — with adjustable frame rate. No After Effects, no code.',
  h1: 'SVG to GIF — animate it, then export a clean GIF',
  heroSubhead:
    'Reframe turns static SVGs into animated GIFs in your browser, free. Add motion with an AI prompt or a one-click preset, then export a crisp GIF with a transparent background and the frame rate and quality you choose.',
  primaryCta: 'Convert SVG to GIF free →',
  howHeading: 'How to convert an SVG to a GIF',
  howSubhead: 'Animate first, then export — all in the browser.',
  steps: [
    ['Upload your SVG', 'Drag and drop any SVG file into Reframe. Nothing is installed and the file stays in your browser.'],
    ['Add motion', 'Describe the animation in plain English for the AI to apply, or pick from 30+ presets. A static SVG works too if you just want a clean loop.'],
    ['Set quality and frame rate', 'Choose your export quality (10–100%) and frame rate (5–50 FPS). Higher values give smoother, sharper GIFs; lower values keep file size down.'],
    ['Export the GIF', 'Export to GIF — with an optional transparent background — and download instantly.'],
  ],
  whyHeading: 'Why export SVG as GIF?',
  whyParagraphs: [
    'SVG is perfect for the web, but GIF goes everywhere SVG can’t — Slack, email, X/Twitter, Discord, README files, and presentations all accept GIF but not animated SVG. Converting an animated SVG to GIF lets your motion play anywhere, with no embed code or special support required.',
    'Reframe handles the whole pipeline in one place: animate the SVG, then export a GIF tuned to your needs — transparent background for overlays, higher frame rate for smooth motion, or lower quality for a lightweight file. It’s free, browser-based, and needs no After Effects, plugins, or code.',
  ],
  faqs: [
    ['How do I convert an SVG to an animated GIF?', 'Upload your SVG to Reframe, animate it with an AI prompt or a preset, set your quality and frame rate, then export to GIF. It all happens in your browser, free.'],
    ['Can I export a GIF with a transparent background?', 'Yes. Reframe supports transparent-background GIF export, so your animation sits cleanly over any color or image.'],
    ['Can I control the GIF quality and frame rate?', 'Yes. You can set quality from 10% to 100% and frame rate from 5 to 50 FPS, trading smoothness and sharpness against file size.'],
    ['Is the SVG to GIF converter free?', 'Yes. Reframe is free to use in the browser, with no account required.'],
  ],
  finalHeading: 'Turn your SVG into a GIF',
  finalSubhead: 'Animate it, tune the quality, and export a clean GIF — free, in seconds.',
  breadcrumbName: 'SVG to GIF',
  howToName: 'How to convert an SVG to an animated GIF',
  howToDescription: 'Animate an SVG and export it as a high-quality GIF with adjustable frame rate.',
}

export const metadata = buildLandingMetadata(config)

export default function Page() {
  return <LandingPage config={config} />
}
