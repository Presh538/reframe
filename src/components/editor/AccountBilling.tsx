'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import styles from './AccountBilling.module.css'
import { startCheckout, trustedPolarUrl } from '@/lib/billing/checkout-client'

type BillingStatus = {
  plan: string
  credits: { available: number; reserved: number }
  subscriptions: { productKey: string; status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean }[]
  orders: { id?: string; status: string; amountMinor: number; currency: string; createdAt: string; productKey?: string | null }[]
  checkout: { status: string } | null
}

type Tone = 'positive' | 'warning' | 'critical' | 'neutral'

// ── Presentation maps ─────────────────────────────────────────
// Raw provider values never reach the screen: they are opaque to customers
// ("past_due", "pro_monthly") and a screen reader would read them literally.

const PRODUCT_NAMES: Record<string, string> = {
  pro_monthly: 'Pro Monthly',
  pro_yearly: 'Pro Yearly',
  ai_credits_25: '25 AI Credits',
  export_4k_single: '4K Export Pass',
  project_pass_7d: '7-Day Project Pass',
}

const PLAN_NAMES: Record<string, string> = { free: 'Free', pro: 'Pro', studio: 'Studio' }

const SUBSCRIPTION_STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'positive' },
  trialing: { label: 'Trial', tone: 'positive' },
  past_due: { label: 'Payment due', tone: 'warning' },
  incomplete: { label: 'Incomplete', tone: 'warning' },
  unpaid: { label: 'Unpaid', tone: 'critical' },
  incomplete_expired: { label: 'Expired', tone: 'neutral' },
  paused: { label: 'Paused', tone: 'neutral' },
  canceled: { label: 'Canceled', tone: 'neutral' },
  revoked: { label: 'Ended', tone: 'neutral' },
}

const ORDER_STATUS: Record<string, { label: string; tone: Tone }> = {
  paid: { label: 'Paid', tone: 'positive' },
  pending: { label: 'Pending', tone: 'warning' },
  refunded: { label: 'Refunded', tone: 'neutral' },
  partially_refunded: { label: 'Partly refunded', tone: 'neutral' },
  disputed: { label: 'Disputed', tone: 'critical' },
}

const DOT: Record<Tone, string> = {
  positive: styles.dotPositive,
  warning: styles.dotWarning,
  critical: styles.dotCritical,
  neutral: '',
}

function titleCase(key: string): string {
  return key.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function productName(key: string | null | undefined): string {
  if (!key) return 'Payment'
  return PRODUCT_NAMES[key] ?? titleCase(key)
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

function DateText({ iso }: { iso: string }) {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return null
  return <time dateTime={date.toISOString()}>{dateFormat.format(date)}</time>
}

function formatMoney(amountMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amountMinor / 100)
  } catch {
    // An unexpected currency code must not take the whole panel down.
    return `${(amountMinor / 100).toFixed(2)} ${currency}`
  }
}

function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span className={styles.status}>
      <span className={`${styles.dot} ${DOT[tone]}`} aria-hidden="true" />
      {label}
    </span>
  )
}

function subscriptionMeta(sub: BillingStatus['subscriptions'][number]) {
  if (!sub.currentPeriodEnd) return null
  const ended = new Date(sub.currentPeriodEnd).getTime() <= Date.now()
  const date = <DateText iso={sub.currentPeriodEnd} />

  if (sub.status === 'revoked') return <>Access ended</>
  if (sub.cancelAtPeriodEnd) return <>Ends {date} · won’t renew</>
  if (sub.status === 'canceled') return ended ? <>Ended {date}</> : <>Access until {date}</>
  if (['active', 'trialing', 'past_due'].includes(sub.status)) return <>Renews {date}</>
  return <>Period ends {date}</>
}

// Marks a trip to the Polar portal, so the return can trigger one repair sync.
const PORTAL_VISIT_KEY = 'rf-billing-portal-visit'

function takePortalVisit(): boolean {
  try {
    const at = Number(sessionStorage.getItem(PORTAL_VISIT_KEY))
    if (!at) return false
    sessionStorage.removeItem(PORTAL_VISIT_KEY)
    return Date.now() - at < 60 * 60 * 1000
  } catch {
    return false // storage unavailable (private mode): webhooks and the daily cron still cover it
  }
}

const PURCHASES: { key: string; label: string }[] = [
  { key: 'pro_monthly', label: 'Upgrade to Pro' },
  { key: 'ai_credits_25', label: 'Buy 25 AI credits' },
]

// ── Component ─────────────────────────────────────────────────

export function AccountBilling() {
  const titleId = useId()
  const subsId = useId()
  const paymentsId = useId()
  const [data, setData] = useState<BillingStatus | null>(null)
  const [error, setError] = useState('')
  // Retry reloads billing data, so it is offered only when loading failed --
  // not after a checkout or portal error, where it would do the wrong thing.
  const [canRetry, setCanRetry] = useState(false)
  const [busy, setBusy] = useState(false)
  const [buying, setBuying] = useState<string | null>(null)
  // Polite announcements for assistive tech; errors use role="alert" instead.
  const [announcement, setAnnouncement] = useState('')

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/billing/status', { cache: 'no-store', signal })
      if (!response.ok) throw new Error('We couldn’t load your billing details.')
      setData(await response.json())
      setError('')
      setCanRetry(false)
    } catch (e) {
      if (!signal?.aborted) {
        setError(e instanceof Error ? e.message : 'We couldn’t load your billing details.')
        setCanRetry(true)
      }
    }
  }, [])

  // Status refreshes on open and whenever the window regains focus -- which is
  // exactly when a customer returns from Polar -- so no manual refresh button.
  useEffect(() => {
    const controller = new AbortController()

    // Returning from the Polar portal is the one moment a customer's change
    // (cancel, undo, plan switch) may not have arrived by webhook yet. Repair
    // once, silently: webhooks and the daily cron remain the primary path, so
    // a failure here is not the customer's problem to act on.
    const load = async () => {
      if (takePortalVisit()) {
        await fetch('/api/billing/reconcile', { method: 'POST', signal: controller.signal }).catch(() => undefined)
      }
      await refresh(controller.signal)
    }

    void load()
    const onFocus = () => { void load() }
    window.addEventListener('focus', onFocus)
    return () => { controller.abort(); window.removeEventListener('focus', onFocus) }
  }, [refresh])

  async function openPortal() {
    setBusy(true)
    setError('')
    setAnnouncement('Opening Polar billing…')
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' })
      if (!response.ok) throw new Error('We couldn’t open billing management. Please try again.')
      const { portalUrl } = await response.json()
      const destination = trustedPolarUrl(portalUrl)
      try { sessionStorage.setItem(PORTAL_VISIT_KEY, String(Date.now())) } catch { /* optional */ }
      window.location.assign(destination)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We couldn’t open billing management.')
      setCanRetry(false)
      setAnnouncement('')
      setBusy(false)
    }
  }

  async function buy(productKey: string, label: string) {
    setBuying(productKey)
    setError('')
    setAnnouncement(`Opening checkout for ${label}…`)
    try {
      await startCheckout(productKey)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We couldn’t start checkout.')
      setCanRetry(false)
      setAnnouncement('')
      setBuying(null)
    }
  }

  const loading = !data && !error
  const planKey = data?.plan ?? 'free'
  const reserved = data?.credits.reserved ?? 0
  const subscribed = (data?.subscriptions ?? []).some((sub) => ['active', 'trialing', 'past_due'].includes(sub.status))
  // The portal needs an existing Polar customer; without any purchase it would
  // only fail, so it is offered once there is something to manage.
  const hasBillingHistory = (data?.orders.length ?? 0) > 0 || (data?.subscriptions.length ?? 0) > 0
  const offers = PURCHASES.filter((offer) => !(offer.key === 'pro_monthly' && subscribed))

  return (
    <section className={styles.root} aria-labelledby={titleId} aria-busy={loading || buying !== null}>
      <header className={styles.header}>
        <h2 id={titleId} className={styles.title}>Billing</h2>
        <p className={styles.subtitle}>Your plan, AI credits and payments.</p>
      </header>

      <div className={styles.srOnly} aria-live="polite" aria-atomic="true">{announcement}</div>

      {error && (
        <div className={styles.alert} role="alert">
          <p className={styles.alertText}>{error}</p>
          {canRetry && (
            <button type="button" className={styles.linkButton} onClick={() => { setError(''); void refresh() }}>
              Retry
            </button>
          )}
        </div>
      )}

      {loading && (
        <div>
          <span className={styles.srOnly}>Loading billing details…</span>
          {[0, 1, 2].map((row) => (
            <div key={row} className={styles.row} aria-hidden="true">
              <span className={styles.skeleton} style={{ width: 64 }} />
              <div className={styles.content}>
                <span className={styles.skeleton} style={{ width: '55%' }} />
                <span className={styles.skeleton} style={{ width: '35%' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {data && (
        <>
          <div className={styles.row}>
            <h3 className={styles.label}>Plan</h3>
            <div className={styles.content}>
              <div className={styles.planLine}>
                <span className={`${styles.badge} ${planKey !== 'free' ? styles.badgePaid : ''}`}>
                  {PLAN_NAMES[planKey] ?? titleCase(planKey)}
                </span>
              </div>
              <p className={styles.credits} style={{ margin: 0 }}>
                <span className={styles.creditsValue}>{data.credits.available.toLocaleString()}</span>
                <span className={styles.muted}>AI credits available</span>
              </p>
              {reserved > 0 && (
                <p className={styles.caption}>
                  {reserved} {reserved === 1 ? 'credit is' : 'credits are'} held for a generation in progress.
                </p>
              )}
            </div>
          </div>

          <div className={styles.row}>
            <h3 id={subsId} className={styles.label}>Subscription</h3>
            <div className={styles.content}>
              {data.subscriptions.length === 0 ? (
                <p className={styles.empty}>No active subscription.</p>
              ) : (
                <ul className={styles.list} aria-labelledby={subsId}>
                  {data.subscriptions.map((sub) => {
                    const status = SUBSCRIPTION_STATUS[sub.status] ?? { label: titleCase(sub.status), tone: 'neutral' as Tone }
                    const meta = subscriptionMeta(sub)
                    return (
                      <li key={`${sub.productKey}-${sub.currentPeriodEnd ?? sub.status}`} className={styles.item}>
                        <p className={styles.itemName}>{productName(sub.productKey)}</p>
                        {meta && <p className={styles.itemMeta}>{meta}</p>}
                        <div className={styles.itemEnd}>
                          <StatusPill label={status.label} tone={status.tone} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className={styles.row}>
            <h3 id={paymentsId} className={styles.label}>Payments</h3>
            <div className={styles.content}>
              {data.orders.length === 0 ? (
                <p className={styles.empty}>No payments yet.</p>
              ) : (
                <ul className={styles.list} aria-labelledby={paymentsId}>
                  {data.orders.map((order, index) => {
                    const status = ORDER_STATUS[order.status] ?? { label: titleCase(order.status), tone: 'neutral' as Tone }
                    return (
                      <li key={order.id ?? `${order.createdAt}-${index}`} className={styles.item}>
                        <p className={styles.itemName}>{productName(order.productKey)}</p>
                        <p className={styles.itemMeta}><DateText iso={order.createdAt} /></p>
                        <div className={styles.itemEnd}>
                          <StatusPill label={status.label} tone={status.tone} />
                          <span className={styles.amount}>{formatMoney(order.amountMinor, order.currency)}</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {data && offers.length > 0 && (
        <div className={styles.row}>
          <h3 className={styles.label}>Get more</h3>
          <div className={styles.content}>
            <div className={styles.actions}>
              {offers.map((offer, index) => (
                <button
                  key={offer.key}
                  type="button"
                  // The first offer is the primary action unless the customer
                  // already has a subscription to manage.
                  className={`${styles.button} ${index === 0 && !subscribed ? styles.primary : ''}`}
                  disabled={buying !== null}
                  aria-busy={buying === offer.key}
                  onClick={() => { void buy(offer.key, offer.label) }}
                >
                  {buying === offer.key ? 'Opening checkout…' : offer.label}
                </button>
              ))}
            </div>
            <p className={styles.caption}>
              {subscribed ? 'Credit packs never expire.' : 'Pro includes 300 AI credits every month. Credit packs never expire.'}
              {' '}Payment is handled securely by Polar.
            </p>
          </div>
        </div>
      )}

      {data && hasBillingHistory && (
        <div className={styles.row}>
          <h3 className={styles.label}>Manage</h3>
          <div className={styles.content}>
            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.button} ${subscribed ? styles.primary : ''}`}
                disabled={busy}
                aria-busy={busy}
                onClick={openPortal}
              >
                {busy ? 'Opening…' : 'Manage billing'}
                <ExternalLink size={14} aria-hidden="true" />
                <span className={styles.srOnly}> (opens Polar)</span>
              </button>
            </div>
            <p className={styles.caption}>Payment method, invoices and cancellation are handled on Polar.</p>
          </div>
        </div>
      )}
    </section>
  )
}

/** Bounded polling; the return URL cannot grant access or assert a successful payment. */
export function CheckoutFeedback() {
  const [message, setMessage] = useState('')
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const checkoutId = params.get('checkout_id')
    if (params.get('billing') !== 'success' || !checkoutId) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    let attempts = 0
    setMessage('Checking your payment…')
    async function check() {
      try {
        const response = await fetch(`/api/billing/status?checkout_id=${encodeURIComponent(checkoutId!)}`, {
          cache: 'no-store', signal: controller.signal,
        })
        if (!response.ok) throw new Error('Status unavailable')
        const status: BillingStatus = await response.json()
        if (controller.signal.aborted) return
        if (status.checkout?.status === 'succeeded') {
          setMessage('Payment recorded. Your credits and plan are in Account → Billing.')
          return
        }
        if (['unknown', 'failed', 'expired'].includes(status.checkout?.status ?? 'unknown')) {
          setMessage('We couldn’t confirm this payment. Check Account → Billing before trying again.')
          return
        }
      } catch {
        if (controller.signal.aborted) return
      }
      if (++attempts < 10) timer = setTimeout(check, 3000)
      else setMessage('Still confirming your payment. Check Account → Billing shortly — please don’t pay again.')
    }
    void check()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [])
  if (!message) return null
  return (
    <div className={styles.toast} role="status" aria-live="polite" aria-atomic="true">
      <p className={styles.toastText}>{message}</p>
      <button type="button" className={styles.toastButton} aria-label="Dismiss payment status" onClick={() => setMessage('')}>
        Dismiss
      </button>
    </div>
  )
}
