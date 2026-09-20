'use client'

import { SignInButton, useAuth } from '@clerk/nextjs'
import { useCallback, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { startCheckout } from '@/lib/billing/checkout-client'
import styles from './UpgradeModal.module.css'
import { useModalDismiss } from './useModalDismiss'
import modalBackdropStyles from './ModalBackdrop.module.css'
import modalSurfaceStyles from './ModalSurface.module.css'

/**
 * Upgrade modal — Figma node 102:1913.
 *
 * Offers the two things a customer can actually buy: the Pro subscription and
 * the one-off credit pack. Each plan states only what Pro enforces today — the
 * AI allowance and the billing terms. The source design listed template counts,
 * project limits and export tiers from the template it was built from; none of
 * those are gated in this codebase, so advertising them here would charge for
 * what free accounts already get. When a gate lands (4K export is the obvious
 * first one), add its line to the Pro plan below.
 *
 * Prices are display copy and must match the Polar products behind each
 * `productKey`: Polar is the source of truth at checkout, so a mismatch would
 * show the customer one price and charge another.
 */
type Plan = {
  id: string
  tab: string
  productKey: string
  chip: string
  title: string
  lede: string
  price: string
  meta: [string, string]
  features: string[]
  cta: string
}

const PLANS: Plan[] = [
  {
    id: 'pro',
    tab: 'Monthly plan',
    productKey: 'pro_monthly',
    chip: 'PRO ✦ Plan',
    title: 'Upgrade to',
    lede: 'Keep animating without running out. Pro gives you 300 AI generations every month.',
    price: '$11.99',
    meta: ['per month', 'billed monthly'],
    features: [
      '300 AI generations every month',
      'Fresh credits each billing period',
      'Failed generations are never charged',
      'Cancel anytime, access runs to the period end',
      'Secure checkout — we never see your card',
    ],
    cta: 'Upgrade Now',
  },
  {
    id: 'credits',
    tab: 'Credit pack',
    productKey: 'ai_credits_25',
    chip: '25 CREDITS',
    title: 'Top up with',
    lede: 'A one-off pack for when you just need a few more generations. No subscription.',
    price: '$4.99',
    meta: ['one-time', 'no renewal'],
    features: [
      '25 AI generations',
      'Credits never expire',
      'Failed generations are never charged',
      'Stacks with Pro, and is used last',
      'Secure checkout — we never see your card',
    ],
    cta: 'Buy 25 credits',
  },
]

export function UpgradeModal({ onClose }: { onClose: () => void }) {
  const { isSignedIn } = useAuth()
  const [planId, setPlanId] = useState(PLANS[0].id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const plan = PLANS.find((candidate) => candidate.id === planId) ?? PLANS[0]

  useModalDismiss(dialogRef, closeRef, onClose)

  const selectPlan = useCallback((id: string) => {
    setPlanId(id)
    // A failure belongs to the plan it happened on, not to the next one.
    setError('')
  }, [])

  // Left/right arrows move between tabs, as a tablist is expected to.
  const onTabKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const index = PLANS.findIndex((candidate) => candidate.id === planId)
    const next = event.key === 'ArrowRight' ? index + 1 : index - 1
    const target = PLANS[(next + PLANS.length) % PLANS.length]
    selectPlan(target.id)
    document.getElementById(`upgrade-tab-${target.id}`)?.focus()
  }, [planId, selectPlan])

  const buy = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      // Navigates away on success, so `busy` is never cleared on the happy path.
      await startCheckout(plan.productKey)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We couldn’t start checkout.')
      setBusy(false)
    }
  }, [plan.productKey])

  return (
    <motion.div
      className={`${styles.overlay} ${modalBackdropStyles.backdrop}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      // Only a click that starts and ends on the backdrop dismisses, so a
      // drag that ends outside the dialog does not close it by accident.
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <motion.div
        ref={dialogRef}
        className={`${styles.dialog} ${modalSurfaceStyles.surface}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        <button ref={closeRef} type="button" className={modalSurfaceStyles.close} onClick={onClose} aria-label="Close">
          <img src="/figma-icons/xmark.svg" alt="" width={24} height={24} />
        </button>

        <div className={styles.head}>
          <div className={styles.titleRow}>
            <h2 id="upgrade-title" className={styles.title}>{plan.title}</h2>
            <span className={styles.planChip}>{plan.chip}</span>
          </div>
          <p className={styles.lede}>{plan.lede}</p>
        </div>

        <div className={styles.tabs} role="tablist" aria-label="Choose a plan">
          {PLANS.map((candidate) => {
            const selected = candidate.id === plan.id
            return (
              <button
                key={candidate.id}
                id={`upgrade-tab-${candidate.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="upgrade-panel"
                tabIndex={selected ? 0 : -1}
                className={`${styles.tab} ${selected ? styles.tabActive : ''}`}
                onClick={() => selectPlan(candidate.id)}
                onKeyDown={onTabKeyDown}
              >
                {candidate.tab}
              </button>
            )
          })}
        </div>

        <div id="upgrade-panel" role="tabpanel" aria-labelledby={`upgrade-tab-${plan.id}`} className={styles.panel}>
          <div className={styles.priceRow}>
            <p className={styles.price}>{plan.price}</p>
            <div className={styles.priceMeta}>
              <span>{plan.meta[0]}</span>
              <span>{plan.meta[1]}</span>
            </div>
          </div>

          <ul className={styles.features}>
            {plan.features.map((feature) => (
              <li key={feature} className={styles.feature}>
                <img src="/figma-icons/check-small.svg" alt="" width={12} height={12} />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}

        {isSignedIn ? (
          <button type="button" className={styles.cta} onClick={buy} disabled={busy}>
            {busy ? 'Opening checkout…' : plan.cta}
          </button>
        ) : (
          <SignInButton mode="modal">
            <button type="button" className={styles.cta}>Sign in to continue</button>
          </SignInButton>
        )}

        <p className={styles.footnote}>
          Billed by Polar, our merchant of record. Manage or cancel anytime from your avatar → Billing.
        </p>
      </motion.div>
    </motion.div>
  )
}
