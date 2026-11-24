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
import { detectAiSource }               from '@/lib/ai-referral'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    schedulePostHog()
    tagAiReferral()
  }, [])

  return (
    <>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </>
  )
}

/**
 * Tag visits that came from an AI assistant (see @/lib/ai-referral).
 *
 * Runs once per page load. document.referrer keeps the original referrer
 * across client-side navigations, so reading it here is enough.
 *  - `ai_source` is a session property: every event in this visit carries it,
 *    so exports and sign-ups can be broken down by AI source.
 *  - `first_ai_source` is set once and kept, for first-touch attribution.
 *  - `ai_referral` is a dedicated event, for a simple count per source.
 */
function tagAiReferral() {
  const source = detectAiSource(document.referrer, window.location.search)
  if (!source) return
  const props = {
    ai_source:     source,
    landing_path:  window.location.pathname,
    referrer_host: (() => { try { return new URL(document.referrer).hostname } catch { return null } })(),
  }
  withPostHog(posthog => {
    posthog.register_for_session({ ai_source: source })
    posthog.register_once({ first_ai_source: source })
    posthog.capture('ai_referral', props)
  })
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
