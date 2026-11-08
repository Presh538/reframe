'use client'

import Link from 'next/link'
import { useState } from 'react'

const f = { fontFamily: 'var(--font-geist-sans), sans-serif' } as const

/**
 * The way forward from the mobile gate. Most phone visitors arrive from a
 * search result or a shared link; telling them "desktop only" with nothing
 * to do next lost them. They can send the editor to themselves for later,
 * or read what it does now.
 */
export function MobileGateActions() {
  const [state, setState] = useState<'idle' | 'copied'>('idle')

  const sendToSelf = async () => {
    const url = window.location.origin
    try {
      // The share sheet lets them mail or message it to themselves.
      if (navigator.share) {
        await navigator.share({ title: 'Reframe — free AI SVG animator', url })
        return
      }
      await navigator.clipboard.writeText(url)
      setState('copied')
      setTimeout(() => setState('idle'), 2500)
    } catch {
      // Share sheet dismissed, or clipboard blocked: nothing to recover.
    }
  }

  return (
    <div style={{ marginTop: 34, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <button
        type="button"
        onClick={sendToSelf}
        style={{
          ...f,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px',
          borderRadius: 40,
          border: '0.8px solid rgba(255,255,255,0.10)',
          background: 'rgba(255,255,255,0.08)',
          color: '#ffffff',
          fontSize: 14,
          letterSpacing: 0.028,
          whiteSpace: 'nowrap',
          cursor: 'pointer',
        }}
      >
        {state === 'copied' ? 'Link copied — open it on desktop' : 'Send the link to my desktop'}
      </button>
      <Link href="/free-svg-animator" style={{ ...f, fontSize: 14, color: '#D06523', textDecoration: 'none' }}>
        See what it can do →
      </Link>
    </div>
  )
}
