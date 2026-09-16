import 'server-only'

import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { requireServerEnv } from '@/lib/env'
import * as schema from './schema'

type ReframeDatabase = PostgresJsDatabase<typeof schema>

let database: ReframeDatabase | undefined

/**
 * Lazily creates one pooled database client per warm serverless instance.
 * max=1 prevents a horizontally scaled deployment from exhausting Postgres.
 */
export function getDatabase(): ReframeDatabase {
  if (database) return database

  const client = postgres(requireServerEnv('DATABASE_URL'), {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    ssl: 'require',
  })

  database = drizzle(client, { schema })
  return database
}
