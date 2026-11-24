// Content for svg-to-lottie, shared by the page and its social image.
import type { LandingConfig } from '@/components/seo/Landing'

export const config: LandingConfig = {
  path: '/svg-to-lottie',
  eyebrow: 'SVG to Lottie',
  title: 'SVG to Lottie JSON Converter — Free Online | Reframe',
  description:
    'Convert SVG to Lottie JSON free. Animate with AI or a preset in your browser, then export Lottie 5.7.4 shape layers. No After Effects or Bodymovin.',
  h1: 'SVG to Lottie — animate it, then export Lottie JSON',
  heroSubhead:
    'Reframe animates your SVG and exports it as Lottie JSON, the lightweight vector format for web and app UI. Describe the motion in plain English or pick a preset, then export. No After Effects, no Bodymovin plugin, no account.',
  primaryCta: 'Export SVG to Lottie free →',
  howHeading: 'How to convert an SVG to Lottie JSON',
  howSubhead: 'Animate in the browser, export standard Lottie.',
  steps: [
    ['Upload your SVG', 'Drag and drop any SVG up to 50 MB. It’s checked and cleaned for safety (on our server for most files, in your browser for very large ones), and we don’t keep a copy.'],
    ['Animate it', 'Describe the motion in plain English and the AI chooses from 35 animation styles, or pick a one-click preset. Then fine-tune speed, easing, delay and direction.'],
    ['Preview the motion', 'Play it live and choose which elements move: everything, groups, or individual paths.'],
    ['Export Lottie JSON', 'Download a Lottie 5.7.4 JSON file, ready for lottie-web, lottie-react or any other Lottie player.'],
  ],
  whyHeading: 'What the Lottie export includes, and what it doesn’t',
  whyParagraphs: [
    'Each animated element becomes its own Lottie shape layer. Paths, rectangles, circles, ellipses, polygons, polylines and lines are converted to Lottie vector shapes with their fill and stroke colours. Motion is sampled at 30 frames per second and written as opacity, position, scale and rotation keyframes, so entrances, bounces, slides, spins, floats and pulses come through intact.',
    'Some effects live in SVG properties Lottie export doesn’t sample yet: stroke drawing (draw-on, typewriter), clip wipes (fill reveal), blur and glow filters, and colour changes. For those, the file keeps the motion but loses the effect, and Reframe warns you in the export dialog before you download. Embedded bitmap images and SVGs that already contain SMIL animation aren’t supported yet, so export your artwork as plain vector shapes first. If you need an effect Lottie can’t carry, export an animated SVG instead: it keeps every keyframe.',
    'The usual way to make Lottie is to animate in After Effects and export with the Bodymovin plugin, a paid desktop workflow with a steep learning curve. Reframe goes from an SVG you already have to a Lottie file in the browser. Lottie exports are free and never watermarked.',
  ],
  faqs: [
    ['How do I convert an SVG to Lottie?', 'Upload your SVG to Reframe, animate it with an AI prompt or a preset, then export Lottie JSON. No After Effects or Bodymovin required.'],
    ['Do I need After Effects to make a Lottie file?', 'No. Reframe builds the Lottie file from your animated SVG in the browser, with no After Effects, Bodymovin or other plugin.'],
    ['What carries over to Lottie?', 'Vector shapes with their fill and stroke colours, plus opacity, position, scale and rotation motion sampled at 30 fps. Each animated element becomes its own shape layer.'],
    ['Which effects don’t convert to Lottie?', 'Stroke drawing, clip wipes, blur and glow filters, and colour changes. The motion is kept but the effect is lost, and the export dialog warns you first. Export an animated SVG if you need those effects.'],
    ['Which Lottie version does Reframe export?', 'Standard Lottie JSON, version 5.7.4, made of shape layers. Use it with lottie-web, lottie-react or any other Lottie player.'],
    ['Is exporting to Lottie free?', 'Yes. No account is needed, and Lottie exports are never watermarked. The watermark only applies to free GIF and WebM exports.'],
    ['Can I use the Lottie files in commercial apps?', 'Yes. You keep all rights to the SVGs you upload and the animations you create, so you can use them in commercial work, client projects and products you sell, as long as you have the rights to the original SVG. Reframe doesn’t claim ownership or ask for credit. Ship the Lottie JSON in apps, websites and client work.'],
    ['Is my SVG stored?', 'No. When you open a file it’s checked and cleaned for safety, on our server for most files and in your browser for very large ones, and no copy is kept. AI prompts send your text and a summary of the file’s layers, not the file itself.'],
  ],
  finalHeading: 'Export your SVG as Lottie',
  finalSubhead: 'Animate in the browser and export Lottie JSON. Free, no plugins, never watermarked.',
  breadcrumbName: 'SVG to Lottie',
  howToName: 'How to convert an SVG to Lottie JSON',
  howToDescription: 'Animate an SVG in the browser and export it as lightweight Lottie JSON.',
}
