/**
 * /free-svg-animator — SEO landing page targeting "free SVG animator".
 * Server-rendered, crawlable content that links into the editor. See Landing.tsx.
 */

import { LandingPage, buildLandingMetadata } from '@/components/seo/Landing'
import { config } from './content'

export const metadata = buildLandingMetadata(config)

export default function Page() {
  return <LandingPage config={config} />
}
