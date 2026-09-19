import 'server-only'

import { Polar } from '@polar-sh/sdk'
import { requireServerEnv } from '@/lib/env'

let polar: Polar | undefined

export function getPolarClient(): Polar {
  if (polar) return polar

  const configuredServer = process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox'
  polar = new Polar({
    accessToken: requireServerEnv('POLAR_ACCESS_TOKEN'),
    server: configuredServer,
  })
  return polar
}
