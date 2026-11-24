// Content for reframe-vs-svgator, shared by the page and its social image.
//
// Every SVGator claim below comes from the pages in `comparison.sources`,
// read on 23 Nov 2026. Prices are deliberately left out: SVGator was running a
// time-limited discount when checked. Re-check before editing a claim.
import type { LandingConfig } from '@/components/seo/Landing'

export const config: LandingConfig = {
  path: '/reframe-vs-svgator',
  eyebrow: 'Reframe vs SVGator',
  title: 'Reframe vs SVGator: Free SVG Animator Alternative | Reframe',
  description:
    'Reframe vs SVGator compared honestly. SVGator’s free plan exports static SVG only; Reframe exports animated SVG and Lottie free, never watermarked.',
  h1: 'Reframe vs SVGator',
  heroSubhead:
    'SVGator is a full SVG animation editor with a keyframe timeline, interactivity and app exports. Reframe is narrower: you bring an SVG, describe the motion or pick a preset, and export. The biggest practical difference is cost to export: SVGator’s free plan exports static SVG only, while Reframe exports animated SVG and Lottie free.',
  primaryCta: 'Try Reframe free →',
  comparison: {
    heading: 'At a glance',
    competitor: 'SVGator',
    rows: [
      ['Animated SVG export', 'Free, never watermarked', 'Paid plans (Starter and up). The Free plan exports static SVG only'],
      ['Lottie JSON export', 'Free, never watermarked', 'Paid plans (Starter and up)'],
      ['GIF and video export', 'GIF and WebM free, with a small watermark that a credit or Pro removes', 'Pro plan and up'],
      ['How you animate', 'Plain-English AI prompt, one-click presets, then speed, easing and delay controls', 'Keyframe timeline with per-element control; AI generation through an MCP connector to your AI assistant'],
      ['Interactivity (hover, click, scroll)', 'Not supported', 'Supported, from the Starter plan'],
      ['React Native and Flutter', 'Not supported', 'Exported as SVG in a webview, from the Starter plan'],
      ['Imports', 'SVG', 'SVG, Lottie, PNG, JPEG and GIF'],
    ],
    checkedOn: '23 November 2026',
    sources: [
      ['SVGator pricing', 'https://www.svgator.com/pricing'],
      ['What’s not included in the Free version', 'https://www.svgator.com/help/payments-and-invoices/whats-not-included-in-the-free-version'],
      ['Interactive SVG animation', 'https://www.svgator.com/interactive-svg-animation'],
      ['React Native animation', 'https://www.svgator.com/create-react-native-animation'],
      ['SVGator MCP', 'https://www.svgator.com/mcp-for-ai-animations'],
    ],
  },
  howHeading: 'How animating an SVG works in Reframe',
  howSubhead: 'No timeline to learn.',
  steps: [
    ['Upload your SVG', 'Drag in any SVG up to 50 MB. It’s checked and cleaned for safety, and we don’t keep a copy.'],
    ['Describe the motion or pick a preset', 'Type something like “make the logo bounce in slowly” and the AI chooses from 35 animation styles, or pick a one-click preset.'],
    ['Fine-tune', 'Adjust speed, easing, delay and direction, and choose which elements move.'],
    ['Export', 'Download animated SVG, Lottie JSON, GIF or WebM.'],
  ],
  whyHeading: 'Which one should you use?',
  whyParagraphs: [
    'Choose SVGator if you need precise, frame-by-frame control over a complex animation, interactive SVGs that react to hover, click or scroll, or exports for React Native and Flutter apps. It’s a mature editor built for designers who animate regularly, and its paid plans are what unlock animated export.',
    'Choose Reframe if you already have an SVG (a logo, icon, loader or illustration) and want it moving and exported without paying or learning a timeline. Animated SVG and Lottie exports are free and never watermarked, there’s no export limit, and you don’t need an account to start.',
    'Reframe’s Lottie export carries opacity, position, scale and rotation, but not stroke drawing, clip wipes, filters or colour changes yet. If your animation depends on those, export animated SVG from Reframe, or use a timeline tool.',
  ],
  faqs: [
    ['Is there a free alternative to SVGator?', 'Yes. Reframe exports animated SVG and Lottie JSON for free with no watermark and no account. SVGator’s free plan lets you use the editor but only exports static SVG; animated exports need a paid plan.'],
    ['Can I export animated SVG from SVGator for free?', 'No. SVGator’s Free plan exports unlimited static SVG files. Animated SVG, Lottie, React Native, Flutter, GIF and video exports all need a paid plan, according to SVGator’s help centre.'],
    ['Does SVGator have AI animation?', 'Yes, through an MCP connector: you connect SVGator to an AI assistant and describe the animation in chat. Exporting the result still follows your SVGator plan. Reframe has an AI prompt built into the editor.'],
    ['Which is better for a logo animation?', 'For a straightforward logo entrance, loop or loader, Reframe is quicker and free to export. For a long, multi-step animation with interactivity, SVGator’s timeline gives you more control.'],
    ['Can Reframe make interactive SVG animations?', 'Not yet. Reframe’s animations play on load and can loop. SVGator supports hover, click and scroll triggers on its paid plans.'],
  ],
  finalHeading: 'Try it on your own SVG',
  finalSubhead: 'Free animated SVG and Lottie export. No account, no watermark on either.',
  breadcrumbName: 'Reframe vs SVGator',
  howToName: 'How to animate an SVG in Reframe',
  howToDescription: 'Upload an SVG, describe the motion or pick a preset, fine-tune, and export animated SVG, Lottie, GIF or WebM.',
}
