/**
 * /animated-svg-logo — SEO landing page targeting "animated SVG logo".
 * Server-rendered, crawlable content that links into the editor. See Landing.tsx.
 *
 * Every claim here is one the product can be held to: free and account-free,
 * AI or preset animation, GIF/WebM/Lottie export, watermark on free raster
 * exports only. No resolution claims, and nothing about CSS export while it is
 * still unreleased.
 */

import { LandingPage, buildLandingMetadata } from '@/components/seo/Landing'
import { config } from './content'

export const metadata = buildLandingMetadata(config)

export default function Page() {
  return <LandingPage config={config} />
}
