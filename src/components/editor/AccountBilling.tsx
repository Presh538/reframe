'use client'

import { useCallback, useEffect, useState } from 'react'

type BillingStatus = {
  plan: string
  credits: { available: number; reserved: number }
  subscriptions: { productKey: string; status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean }[]
  orders: { status: string; amountMinor: number; currency: string; createdAt: string }[]
  checkout: { status: string } | null
}

export function AccountBilling() {
  const [data, setData] = useState<BillingStatus | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/billing/status', { cache: 'no-store', signal })
      if (!response.ok) throw new Error('Unable to load billing. Please try again.')
      setData(await response.json())
      setError('')
    } catch (e) {
      if (!signal?.aborted) setError(e instanceof Error ? e.message : 'Unable to load billing.')
    }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal)
    const onFocus = () => { void refresh(controller.signal) }
    window.addEventListener('focus', onFocus)
    return () => { controller.abort(); window.removeEventListener('focus', onFocus) }
  }, [refresh])

  async function openPortal() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' })
      if (!response.ok) throw new Error('Unable to open billing management. Please try again.')
      const { portalUrl } = await response.json()
      const url = new URL(portalUrl)
      if (url.protocol !== 'https:' || !['polar.sh', 'sandbox.polar.sh'].includes(url.hostname)) {
        throw new Error('Invalid billing portal destination.')
      }
      window.location.assign(url.toString())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to open billing management.')
      setBusy(false)
    }
  }

  async function syncStatus() {
    setSyncing(true)
    try {
      const response = await fetch('/api/billing/reconcile', { method: 'POST' })
      if (!response.ok) throw new Error('Unable to complete subscription sync. Please refresh your status and try again shortly.')
      await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to sync subscriptions.') }
    finally { setSyncing(false) }
  }

  return <section style={{ display: 'grid', gap: 16 }}>
    <h2>Billing & credits</h2>
    {error && <p role="alert">{error}</p>}
    {!data && !error && <p role="status">Loading billing…</p>}
    {data && <>
      <p>Plan: <strong>{data.plan}</strong> · {data.credits.available} AI credits available
        {data.credits.reserved > 0 && ` (${data.credits.reserved} in use)`}</p>
      <h3>Subscriptions</h3>
      {data.subscriptions.length === 0 && <p>No subscription recorded yet.</p>}
      {data.subscriptions.map((subscription, index) => <p key={index}>
        {subscription.productKey.replaceAll('_', ' ')}: {subscription.status}
        {subscription.currentPeriodEnd && ` · ${subscription.cancelAtPeriodEnd ? 'Cancellation scheduled for' : 'Current period ends'} ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
      </p>)}
      <h3>Recent payments</h3>
      {data.orders.length === 0 && <p>No payments recorded yet.</p>}
      {data.orders.map((order, index) => <p key={index}>
        {new Intl.NumberFormat(undefined, { style: 'currency', currency: order.currency }).format(order.amountMinor / 100)}
        {' · '}{order.status}{' · '}{new Date(order.createdAt).toLocaleDateString()}
      </p>)}
      <p>Manage subscriptions, payment methods, and invoices securely through Polar.</p>
    </>}
    <div style={{ display: 'flex', gap: 12 }}>
      <button type="button" disabled={busy} onClick={openPortal}>{busy ? 'Opening…' : 'Manage billing'}</button>
      <button type="button" onClick={() => { void refresh() }}>Refresh status</button>
      <button type="button" disabled={syncing} onClick={syncStatus}>{syncing ? 'Syncing…' : 'Sync subscription'}</button>
    </div>
  </section>
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
          setMessage('Payment recorded. View your credits and plan in Account → Billing.')
          return
        }
        if (['unknown', 'failed', 'expired'].includes(status.checkout?.status ?? 'unknown')) {
          setMessage('Payment could not be confirmed. Check Account → Billing before trying again.')
          return
        }
      } catch {
        if (controller.signal.aborted) return
      }
      if (++attempts < 10) timer = setTimeout(check, 3000)
      else setMessage('Still waiting for payment confirmation. Check Account → Billing shortly; do not pay again.')
    }
    void check()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [])
  if (!message) return null
  return <div role="status" style={{ position: 'fixed', bottom: 24, left: 24, right: 24,
    zIndex: 50, background: '#202020', color: '#fff', padding: 16, borderRadius: 12,
    display: 'flex', justifyContent: 'space-between', gap: 12 }}>
    <span>{message}</span><button type="button" aria-label="Dismiss payment status" onClick={() => setMessage('')}>Dismiss</button>
  </div>
}
