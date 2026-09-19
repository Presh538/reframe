'use client'

import { SignInButton, useAuth } from '@clerk/nextjs'
import { useCallback, useEffect, useRef, useState } from 'react'
import { startCheckout } from '@/lib/billing/checkout-client'
import styles from './UpgradeModal.module.css'

/**
 * Upgrade modal — Figma node 102:1913.
 *
 * The bullets below state only what Pro actually enforces: the monthly AI
 * allowance, and the billing behaviour customers are entitled to. The source
 * design listed template counts, project limits and export tiers from the
 * template it was built from; none of those are gated in this codebase, so
 * advertising them here would charge for what free accounts already get.
 * When a gate lands (4K export is the obvious first one), add its line here.
 */

/**
 * Display copy for the price. This must match the Polar product behind
 * `pro_monthly` — Polar is the source of truth at checkout, and a mismatch
 * would show the customer one price and charge another.
 */
const PRICE = { amount: '$11.99', per: 'per month', billing: 'billed monthly' }

const FEATURES = [
  '300 AI generations every month',
  'Fresh credits each billing period',
  'Failed generations are never charged',
  'Cancel anytime, access runs to the period end',
  'Secure checkout — we never see your card',
]

export function UpgradeModal({ onClose }: { onClose: () => void }) {
  const { isSignedIn } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Close on Escape, and keep focus inside the dialog while it is open.
  useEffect(() => {
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const upgrade = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      // Navigates away on success, so `busy` is never cleared on the happy path.
      await startCheckout('pro_monthly')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We couldn’t start checkout.')
      setBusy(false)
    }
  }, [])

  return (
    <div
      className={styles.overlay}
      // Only a click that starts and ends on the backdrop dismisses, so a
      // drag that ends outside the dialog does not close it by accident.
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        aria-describedby="upgrade-lede"
      >
        <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Close">
          <img src="/figma-icons/xmark.svg" alt="" width={24} height={24} />
        </button>

        <div className={styles.head}>
          <div className={styles.titleRow}>
            <h2 id="upgrade-title" className={styles.title}>Upgrade to</h2>
            <span className={styles.planChip}>PRO ✦ Plan</span>
          </div>
          <p id="upgrade-lede" className={styles.lede}>
            Keep animating without running out. Pro gives you 300 AI generations every month.
          </p>
        </div>

        <div className={styles.priceRow}>
          <p className={styles.price}>{PRICE.amount}</p>
          <div className={styles.priceMeta}>
            <span>{PRICE.per}</span>
            <span>{PRICE.billing}</span>
          </div>
        </div>

        <ul className={styles.features}>
          {FEATURES.map((feature) => (
            <li key={feature} className={styles.feature}>
              <img src="/figma-icons/check-small.svg" alt="" width={12} height={12} />
              {feature}
            </li>
          ))}
        </ul>

        {error && <p className={styles.error} role="alert">{error}</p>}

        {isSignedIn ? (
          <button type="button" className={styles.cta} onClick={upgrade} disabled={busy}>
            {busy ? 'Opening checkout…' : 'Upgrade Now'}
          </button>
        ) : (
          <SignInButton mode="modal">
            <button type="button" className={styles.cta}>Sign in to upgrade</button>
          </SignInButton>
        )}

        <p className={styles.footnote}>
          Billed by Polar, our merchant of record. Cancel anytime from your avatar → Billing.
        </p>
      </div>
    </div>
  )
}
