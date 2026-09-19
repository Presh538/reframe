import 'server-only'

import { getDatabase } from '@/lib/db/client'
import { auditEvents } from '@/lib/db/schema'

type AuditInput = {
  actorType: 'user' | 'system' | 'admin' | 'provider'
  action: string
  targetType: string
  targetId?: string | null
  userId?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Appends a security audit entry.
 *
 * Never throws: an audit write must not be able to fail a payment that has
 * already been collected. Metadata is caller-controlled and must therefore
 * carry identifiers only -- never payloads, prompts, emails, or secrets.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await getDatabase().insert(auditEvents).values({
      actorType: input.actorType,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      userId: input.userId ?? null,
      metadata: (input.metadata ?? {}) as Record<string, never>,
    })
  } catch (error) {
    console.error('[audit] write failed', {
      action: input.action,
      error: error instanceof Error ? error.name : 'unknown',
    })
  }
}
