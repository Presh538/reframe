// Content for reframe-vs-lottie-creator, shared by the page and its social image.
//
// Every Lottie Creator claim below comes from the pages in
// `comparison.sources`, read on 23 Nov 2026. The free export cap is quoted as
// LottieFiles' FAQ states it ("five animations"); the same page's structured
// data says 50, so re-check before changing that line.
import type { LandingConfig } from '@/components/seo/Landing'

export const config: LandingConfig = {
  path: '/reframe-vs-lottie-creator',
  eyebrow: 'Reframe vs Lottie Creator',
  title: 'Reframe vs Lottie Creator: Free Lottie Export, No Cap | Reframe',
  description:
    'Reframe vs LottieFiles’ Lottie Creator compared. Creator caps free exports; Reframe turns an SVG into Lottie JSON or animated SVG free, with no export limit.',
  h1: 'Reframe vs Lottie Creator',
  heroSubhead:
    'Lottie Creator from LottieFiles is a browser timeline editor built for Lottie, with AI help and the wider LottieFiles platform behind it. Reframe does one job: turn an SVG you already have into an animation and export it, with no cap on free Lottie exports.',
  primaryCta: 'Make a Lottie file free →',
  comparison: {
    heading: 'At a glance',
    competitor: 'Lottie Creator',
    rows: [
      ['Free Lottie export', 'Unlimited, never watermarked', 'Capped on the free plan (its FAQ says five animations); paid plans unlock unlimited exports'],
      ['Paid plan', 'Optional: credits for extra AI generations, or Pro', 'Individual plan, $19.99 per user per month, billed annually'],
      ['Other export formats', 'Animated SVG and Lottie free; GIF and WebM free with a small watermark', 'dotLottie, GIF, MP4, MOV and WebM; formats beyond Lottie are on paid plans'],
      ['Animated SVG export', 'Yes', 'Not listed'],
      ['How you animate', 'Plain-English AI prompt or one-click presets, then speed, easing and delay controls', 'Keyframe timeline, plus Motion Copilot, which builds motion from a description'],
      ['Imports', 'SVG', 'Lottie JSON, dotLottie and SVG'],
    ],
    checkedOn: '23 November 2026',
    sources: [
      ['Lottie Creator', 'https://lottiefiles.com/lottie-creator'],
      ['LottieFiles pricing', 'https://lottiefiles.com/pricing'],
    ],
  },
  howHeading: 'How making a Lottie file works in Reframe',
  howSubhead: 'From an SVG to Lottie JSON without a timeline.',
  steps: [
    ['Upload your SVG', 'Drag in any SVG up to 50 MB. It’s checked and cleaned for safety, and we don’t keep a copy.'],
    ['Describe the motion or pick a preset', 'Type something like “make the logo bounce in slowly” and the AI chooses from 35 animation styles, or pick a one-click preset.'],
    ['Fine-tune', 'Adjust speed, easing, delay and direction, and choose which elements move.'],
    ['Export Lottie JSON', 'Download a Lottie 5.7.4 file of shape layers, ready for lottie-web, lottie-react or any Lottie player.'],
  ],
  whyHeading: 'Which one should you use?',
  whyParagraphs: [
    'Choose Lottie Creator if Lottie is your main output and you want a timeline made for it: editing existing Lottie and dotLottie files, keyframing every property yourself, AI tools for themes and state machines, and LottieFiles’ hosting and players. If your team already works in the LottieFiles platform, it fits naturally, and a paid plan unlocks unlimited exports.',
    'Choose Reframe if you have an SVG and need it as a Lottie file without hitting an export cap or paying. Lottie exports are free, unlimited and never watermarked, and the same animation also exports as animated SVG, GIF or WebM.',
    'Be clear on what Reframe’s Lottie export carries: opacity, position, scale and rotation, sampled at 30 fps, on shape layers with their fill and stroke colours. Stroke drawing, clip wipes, blur and glow filters, and colour changes don’t convert yet, and Reframe warns you in the export dialog before you download. For those effects, export animated SVG instead.',
  ],
  faqs: [
    ['Is Lottie Creator free?', 'Lottie Creator is free to use, but free users can only export a limited number of animations; its FAQ says five. Paid LottieFiles plans unlock unlimited exports.'],
    ['Is there a free Lottie Creator alternative with unlimited exports?', 'Yes. Reframe exports Lottie JSON free with no export limit and no watermark. It starts from an SVG rather than a blank timeline.'],
    ['Can I edit an existing Lottie file in Reframe?', 'No. Reframe imports SVG only. To edit an existing Lottie or dotLottie file, use Lottie Creator or another Lottie editor.'],
    ['Does Lottie Creator export animated SVG?', 'Animated SVG isn’t among the export formats LottieFiles lists for Lottie Creator (Lottie JSON, dotLottie, GIF, MP4, MOV and WebM). Reframe exports animated SVG as well as Lottie.'],
    ['Do both use AI?', 'Yes. Lottie Creator has Motion Copilot, which builds motion from a description. Reframe’s AI prompt applies and tunes one of 35 animation styles to your SVG.'],
  ],
  finalHeading: 'Turn your SVG into Lottie',
  finalSubhead: 'Free, unlimited Lottie exports. No account, no watermark.',
  breadcrumbName: 'Reframe vs Lottie Creator',
  howToName: 'How to make a Lottie file from an SVG in Reframe',
  howToDescription: 'Upload an SVG, describe the motion or pick a preset, fine-tune, and export Lottie JSON.',
}
