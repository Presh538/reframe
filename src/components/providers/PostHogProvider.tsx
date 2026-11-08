'use client'

/**
 * PostHogProvider — schedules the deferred PostHog load and sends page views.
 *
 * posthog-js itself is loaded lazily by @/lib/posthog-client once the page is
 * idle, so it stays out of the first-load bundle. Page views fired before then
 * are queued and replayed in order.
 *
 * useSearchParams() lives in its own Suspense boundary, which the App Router
 * requires.
 */

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense }          from 'react'
import { schedulePostHog, withPostHog } from '@/lib/posthog-client'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => { schedulePostHog() }, [])

  return (
    <>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </>
  )
}

function PageViewTracker() {
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) return
    // Resolved now, not at replay time, so a queued view keeps its own URL.
    const url = window.location.origin + pathname +
      (searchParams?.toString() ? '?' + searchParams.toString() : '')
    withPostHog(posthog => posthog.capture('$pageview', { $current_url: url }))
  }, [pathname, searchParams])

  return null
}
