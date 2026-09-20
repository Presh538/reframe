'use client'

import { useEffect, useState } from 'react'
import type { FeatureKey } from '@/lib/billing/entitlements'

/**
 * Client-side view of what the current account may do.
 *
 * The answer comes from the server (`/api/me/access`), which reads the
 * entitlement ledger — the client never derives a plan from anything it can
 * see locally. Export gating built on this is still a soft gate, because
 * encoding happens in the browser; the point is that it is at least honestly
 * derived, and that one place decides.
 *
 * Fails closed to the free tier: a failed request grants nothing, so an outage
 * can never hand out paid features.
 */
export type Entitlements = {
  loading: boolean
  authenticated: boolean
  plan: string
  has: (feature: FeatureKey) => boolean
}

type AccessResponse = {
  authenticated?: boolean
  plan?: string
  features?: Record<string, boolean>
}

const FREE: { authenticated: boolean; plan: string; features: Record<string, boolean> } = {
  authenticated: false,
  plan: 'guest',
  features: {},
}

// One in-flight request per page load: the export modal and the top bar ask
// the same question, and this keeps it to a single round trip.
let cached: Promise<AccessResponse> | null = null

function fetchAccess(): Promise<AccessResponse> {
  cached ??= fetch('/api/me/access', { cache: 'no-store' })
    .then((response) => (response.ok ? response.json() : FREE))
    .catch(() => FREE)
  return cached
}

/** Drops the cached answer so the next read reflects a new purchase. */
export function refreshEntitlements(): void {
  cached = null
}

export function useEntitlements(): Entitlements {
  const [state, setState] = useState<AccessResponse | null>(null)

  useEffect(() => {
    let active = true
    fetchAccess().then((access) => { if (active) setState(access) })
    return () => { active = false }
  }, [])

  const features = state?.features ?? {}
  return {
    loading: state === null,
    authenticated: Boolean(state?.authenticated),
    plan: state?.plan ?? 'guest',
    has: (feature) => features[feature] === true,
  }
}
