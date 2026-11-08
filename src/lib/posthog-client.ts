'use client'

import type { PostHog } from 'posthog-js'

/**
 * Lazily loaded PostHog.
 *
 * posthog-js is ~255 KB of JavaScript, and session recording and surveys pull
 * in ~280 KB more. None of it is needed to paint the editor, so it is loaded
 * with a dynamic import once the page is idle rather than shipped in the
 * first-load bundle. Calls made before then are queued and replayed in order
 * after init, so callers never need to know whether PostHog has arrived.
 *
 * Nothing here may import posthog-js statically, or the bundler pulls it back
 * into the critical path.
 */

type Call = (posthog: PostHog) => void

const queue: Call[] = []
let instance: PostHog | null = null
let loading: Promise<void> | null = null

/** Longest we wait for an idle moment before loading anyway. */
const IDLE_TIMEOUT_MS = 2500
/** Bounds memory if PostHog never loads (blocked by an extension, offline). */
const MAX_QUEUED = 200

function load(): Promise<void> {
  loading ??= import('posthog-js').then(({ default: posthog }) => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[PostHog] NEXT_PUBLIC_POSTHOG_KEY is not set — analytics disabled')
      }
      queue.length = 0
      return
    }
    posthog.init(key, {
      api_host:          '/ingest',
      ui_host:           'https://us.posthog.com',
      capture_pageview:  false,             // sent manually (SPA navigation)
      capture_pageleave: true,
      person_profiles:   'identified_only', // no anonymous profiles by default
      autocapture:       false,             // explicit events only
    })
    instance = posthog
    for (const call of queue.splice(0)) run(call)
  }).catch(() => {
    // Analytics must never break the app; drop what was queued.
    queue.length = 0
  })
  return loading
}

function run(call: Call) {
  try { call(instance!) } catch { /* analytics must never throw */ }
}

/**
 * Starts loading PostHog when the browser is idle. Safe to call repeatedly.
 */
export function schedulePostHog(): void {
  if (typeof window === 'undefined' || loading) return
  const start = () => {
    const idle = (window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    }).requestIdleCallback
    if (idle) idle(() => { void load() }, { timeout: IDLE_TIMEOUT_MS })
    else setTimeout(() => { void load() }, 1)
  }
  if (document.readyState === 'complete') start()
  else window.addEventListener('load', start, { once: true })
}

/** Runs `call` now if PostHog is ready, otherwise once it has loaded. */
export function withPostHog(call: Call): void {
  if (typeof window === 'undefined') return
  if (instance) run(call)
  else if (queue.length < MAX_QUEUED) queue.push(call)
}

/** The live instance, or null before init. For code that must not queue. */
export function loadedPostHog(): PostHog | null {
  return instance
}
