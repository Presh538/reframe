'use client'

import { SignInButton, UserButton, useAuth } from '@clerk/nextjs'
import { CreditCard } from 'lucide-react'
import { AccountBilling, CheckoutFeedback } from './AccountBilling'

/**
 * Sign-in affordance for the TopBar.
 *
 * Renders nothing until Clerk is configured, so the editor stays usable — and
 * the bar stays visually unchanged — before authentication is provisioned.
 * The publishable key is the same signal AuthProvider uses to mount
 * ClerkProvider, so the control can never appear without its provider.
 *
 * Uses the useAuth() hook rather than Clerk's <Show> control component: this
 * renders inside TopBar, which is a client component, and <Show> is typed as a
 * server component. The hook also exposes `isLoaded`, which lets the control
 * stay hidden until the session resolves instead of flashing "Sign in" at a
 * user who is already signed in.
 *
 * Note for future edits: <SignedIn>, <SignedOut> and <Protect> were removed in
 * Clerk Core 3 and now throw at render even though they are still exported.
 */
const CLERK_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)

// Matched to the existing TopBar pills: Export stays the only accent-filled
// control, so sign-in reads as secondary on the same surface treatment.
const PILL: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px 28px',
  borderRadius: 40,
  border: 'none',
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(17px)',
  WebkitBackdropFilter: 'blur(17px)',
  boxShadow: 'inset 0px 2px 4px rgba(57,57,57,0.45)',
  cursor: 'pointer',
  transition: 'background 0.15s',
  fontFamily: 'var(--font-geist-sans), sans-serif',
  fontWeight: 400,
  fontSize: 14,
  letterSpacing: 0.028,
  color: '#D06523',
  whiteSpace: 'nowrap',
}

function AuthControlInner() {
  const { isLoaded, isSignedIn } = useAuth()

  // Reserve nothing while resolving: the bar simply looks as it does today.
  if (!isLoaded) return null

  if (isSignedIn) {
    return (
      <>
      <CheckoutFeedback />
      <UserButton
        appearance={{
          elements: {
            // Sized to sit level with the Export pill beside it.
            userButtonAvatarBox: { width: 46, height: 46 },
            userButtonTrigger: {
              borderRadius: 40,
              boxShadow: 'inset 0px 2px 4px rgba(57,57,57,0.45)',
            },
          },
        }}
      >
        <UserButton.UserProfilePage label="Billing" url="billing" labelIcon={<CreditCard size={16} />}>
          <AccountBilling />
        </UserButton.UserProfilePage>
      </UserButton>
      </>
    )
  }

  return (
    <SignInButton mode="modal">
      <button
        type="button"
        style={PILL}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
      >
        Sign in
      </button>
    </SignInButton>
  )
}

export function AuthControl() {
  // Guarded at the boundary so the Clerk hook is never called without a
  // provider mounted above it.
  if (!CLERK_CONFIGURED) return null
  return <AuthControlInner />
}
