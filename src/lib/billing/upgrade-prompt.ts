'use client'

import { useEffect } from 'react'

/**
 * Lets any part of the editor ask for the upgrade modal.
 *
 * The modal lives in TopBar, but the moments that call for it (the AI bar
 * running out of credits) happen elsewhere. A window event keeps the two
 * decoupled without lifting modal state into the editor store.
 */
const EVENT = 'reframe:upgrade-requested'

export type UpgradeRequestSource = 'ai_out_of_credits' | 'ai_guest_limit'

export function requestUpgrade(source: UpgradeRequestSource) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { source } }))
}

export function useUpgradeRequests(onRequest: (source: UpgradeRequestSource) => void) {
  useEffect(() => {
    const handler = (event: Event) => {
      onRequest((event as CustomEvent<{ source: UpgradeRequestSource }>).detail.source)
    }
    window.addEventListener(EVENT, handler)
    return () => window.removeEventListener(EVENT, handler)
  }, [onRequest])
}
