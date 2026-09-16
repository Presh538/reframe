/**
 * Server environment helpers.
 *
 * Do not validate every integration at module load: public pages and local-only
 * editing must continue to build when optional services are not configured.
 * Protected routes call requireServerEnv() and fail closed with a generic error.
 */

export function requireServerEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required server configuration: ${name}`)
  return value
}

export function hasServerEnv(...names: string[]): boolean {
  return names.every((name) => Boolean(process.env[name]?.trim()))
}

export const integrationStatus = {
  clerk: () => hasServerEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY'),
  database: () => hasServerEnv('DATABASE_URL'),
  polar: () => hasServerEnv('POLAR_ACCESS_TOKEN', 'POLAR_WEBHOOK_SECRET'),
  redis: () => hasServerEnv('UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'),
} as const
