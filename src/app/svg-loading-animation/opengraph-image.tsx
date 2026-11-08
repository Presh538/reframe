import { renderLandingOg } from '@/components/seo/landing-og'
import { config } from './content'

export const alt = config.h1
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return renderLandingOg(config)
}
