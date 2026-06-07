'use client'

/**
 * PostHogProvider — initialises posthog-js and provides the React context.
 *
 * Split into two components so useSearchParams() is isolated in its own
 * Suspense boundary, which Next.js App Router requires.
 *
 * Usage: wrap children in layout.tsx.
 */

import posthog            from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense }          from 'react'

// ── Init ─────────────────────────────────────────────────────────

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key  = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'

    if (!key) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[PostHog] NEXT_PUBLIC_POSTHOG_KEY is not set — analytics disabled')
      }
      return
    }

    posthog.init(key, {
      api_host:            host,
      ui_host:             'https://us.posthog.com',
      capture_pageview:    false,  // handled manually below (SPA)
      capture_pageleave:   true,
      person_profiles:     'identified_only',  // no anonymous profiles by default
      autocapture:         false,              // explicit events only — no noisy click noise
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </PHProvider>
  )
}

// ── Page view tracker (needs Suspense boundary) ───────────────────

function PageViewTracker() {
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) return
    const url = window.location.origin + pathname +
      (searchParams?.toString() ? '?' + searchParams.toString() : '')
    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])

  return null
}
