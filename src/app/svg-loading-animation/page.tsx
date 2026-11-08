/**
 * /svg-loading-animation — SEO landing page targeting "SVG loading animation"
 * and the loader/spinner queries developers actually search.
 * Server-rendered, crawlable content that links into the editor. See Landing.tsx.
 *
 * Lottie leads here on purpose: it is the format developers ship loaders in,
 * and it is the one export that is never watermarked.
 */

import { LandingPage, buildLandingMetadata } from '@/components/seo/Landing'
import { config } from './content'

export const metadata = buildLandingMetadata(config)

export default function Page() {
  return <LandingPage config={config} />
}
