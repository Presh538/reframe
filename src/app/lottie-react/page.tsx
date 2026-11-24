/**
 * /lottie-react — guide page targeting "Lottie in React" / "lottie-react".
 * Server-rendered, crawlable content that links into the editor. See Landing.tsx.
 */

import { LandingPage, buildLandingMetadata } from '@/components/seo/Landing'
import { config } from './content'

export const metadata = buildLandingMetadata(config)

export default function Page() {
  return <LandingPage config={config} />
}
