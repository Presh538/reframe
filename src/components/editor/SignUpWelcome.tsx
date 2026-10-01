'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useRef } from 'react'
import { useEntitlements } from '@/lib/billing/useEntitlements'
import { useToast } from '@/components/ui/Toast'

/**
 * Greets a brand-new account, once.
 *
 * Signing up grants free AI credits, and until now that happened in silence --
 * the best moment in the journey to tell someone what they have was spent
 * saying nothing.
 *
 * Telling sign-up from sign-in is the whole difficulty: Clerk's modal handles
 * both and leaves the app in the same signed-in state either way, so there is
 * no event to listen for. The account's own age is the signal -- created in
 * the last few minutes means this session created it. A returning user greeted
 * as new is worse than no greeting at all, so the window is deliberately short
 * and the check errs toward staying quiet.
 */
const NEW_ACCOUNT_WINDOW_MS = 3 * 60 * 1000

/** Survives a reload inside the same tab, so a refresh cannot greet twice. */
const SEEN_KEY = 'rf-welcomed'

export function SignUpWelcome() {
  const { isLoaded, isSignedIn, user } = useUser()
  const { credits } = useEntitlements()
  const { toast } = useToast()
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    if (!isLoaded || !isSignedIn || !user) return

    const createdAt = user.createdAt?.getTime()
    if (!createdAt || Date.now() - createdAt > NEW_ACCOUNT_WINDOW_MS) return

    // Wait for the balance before speaking: the grant is written server-side as
    // the account is provisioned, so a message sent too early would either
    // quote nothing or quote zero.
    if (credits === null) return

    try {
      if (sessionStorage.getItem(SEEN_KEY) === user.id) return
      sessionStorage.setItem(SEEN_KEY, user.id)
    } catch {
      // Private mode: the ref below still prevents a repeat within this mount.
    }

    fired.current = true
    toast(
      credits > 0
        ? `Account created — ${credits} AI credits to get you started`
        : 'Account created',
      'success',
    )
  }, [isLoaded, isSignedIn, user, credits, toast])

  return null
}
