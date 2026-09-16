import 'server-only'

import { Redis } from '@upstash/redis'
import { integrationStatus, requireServerEnv } from '@/lib/env'

let redis: Redis | undefined

/**
 * Shared Upstash client. Returns null when Redis is not configured so that
 * callers can degrade to their authoritative Postgres path instead of failing.
 * Redis is only ever a cache or a guest counter here — never the authority for
 * a paid decision.
 */
export function getRedis(): Redis | null {
  if (!integrationStatus.redis()) return null
  if (!redis) {
    redis = new Redis({
      url: requireServerEnv('UPSTASH_REDIS_REST_URL'),
      token: requireServerEnv('UPSTASH_REDIS_REST_TOKEN'),
    })
  }
  return redis
}
