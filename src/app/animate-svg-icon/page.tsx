/**
 * /animate-svg-icon — SEO landing page targeting "animate SVG icon".
 * Server-rendered, crawlable content that links into the editor. See Landing.tsx.
 */

import { LandingPage, buildLandingMetadata } from '@/components/seo/Landing'
import { config } from './content'

export const metadata = buildLandingMetadata(config)

export default function Page() {
  return <LandingPage config={config} />
}
