'use client'

import { useEffect, useState } from 'react'
import type { FeatureKey } from '@/lib/billing/entitlements'

/**
 * Client-side view of what the current account may do, and what it has left.
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
  /** True until the first answer arrives. Callers should render nothing
   *  plan-dependent while loading, rather than flashing the free state. */
  loading: boolean
  authenticated: boolean
  plan: string
  /** On a paid plan. Anything that is not the free or guest tier counts. */
  isPro: boolean
  /** Spendable AI credits, or null when signed out. */
  credits: number | null
  has: (feature: FeatureKey) => boolean
}

type AccessResponse = {
  authenticated?: boolean
  plan?: string
  features?: Record<string, boolean>
  credits?: { available?: number; reserved?: number } | null
}

const FREE: AccessResponse = { authenticated: false, plan: 'guest', features: {}, credits: null }

const UNPAID_PLANS = new Set(['guest', 'free'])

// One in-flight request shared by every caller: the top bar, the export panel
// and the export modal all ask the same question on the same page.
let cached: Promise<AccessResponse> | null = null
const subscribers = new Set<(access: AccessResponse) => void>()

function fetchAccess(): Promise<AccessResponse> {
  cached ??= fetch('/api/me/access', { cache: 'no-store' })
    .then((response) => (response.ok ? response.json() : FREE))
    .catch(() => FREE)
  return cached
}

/**
 * Re-reads access from the server and updates every mounted consumer.
 *
 * Call this after anything that changes the balance or the plan — spending a
 * credit, returning from checkout — so the displayed count cannot drift from
 * the ledger.
 */
export function refreshEntitlements(): void {
  cached = null
  if (subscribers.size === 0) return
  fetchAccess().then((access) => {
    for (const notify of subscribers) notify(access)
  })
}

// Regaining focus is when a customer comes back from Polar, or switches from a
// tab where they just bought something. One listener serves every consumer.
function onWindowFocus(): void { refreshEntitlements() }

export function useEntitlements(): Entitlements {
  const [state, setState] = useState<AccessResponse | null>(null)

  useEffect(() => {
    let active = true
    const apply = (access: AccessResponse) => { if (active) setState(access) }

    fetchAccess().then(apply)
    if (subscribers.size === 0) window.addEventListener('focus', onWindowFocus)
    subscribers.add(apply)
    return () => {
      active = false
      subscribers.delete(apply)
      if (subscribers.size === 0) window.removeEventListener('focus', onWindowFocus)
    }
  }, [])

  const features = state?.features ?? {}
  const plan = state?.plan ?? 'guest'

  return {
    loading: state === null,
    authenticated: Boolean(state?.authenticated),
    plan,
    isPro: Boolean(state?.authenticated) && !UNPAID_PLANS.has(plan),
    credits: state?.credits ? (state.credits.available ?? 0) : null,
    has: (feature) => features[feature] === true,
  }
}
