import { loadEnvConfig } from '@next/env'
import { defineConfig } from 'drizzle-kit'

// drizzle-kit runs as a standalone CLI and, unlike `next dev`, does not read
// .env.local on its own. Loading it through Next's own loader keeps the
// precedence rules identical (.env.local overrides .env), so the database the
// CLI talks to is always the one the app talks to.
loadEnvConfig(process.cwd())

// Migrations need a direct connection: Neon's pooled endpoint goes through
// PgBouncer, which cannot reliably run DDL. Falling back to DATABASE_URL keeps
// the tooling working in environments that only expose one connection string.
const url = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL

if (!url) {
  throw new Error(
    'DATABASE_MIGRATION_URL or DATABASE_URL is required for database tooling. ' +
      'Add it to .env.local (the direct, non-pooled Neon connection string).',
  )
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema.ts',
  out: './db/migrations',
  dbCredentials: { url },
  strict: true,
  verbose: true,
})
