import { ClerkProvider } from '@clerk/nextjs'
import type { ReactNode } from 'react'
/**
 * Keeps public/local editing operational until Clerk keys are configured.
 *
 * Gated on the publishable key alone because that is the only signal the
 * browser can see: AuthControl uses the same check, so the sign-in UI and its
 * provider can never disagree. Server-side authorization still requires the
 * secret key too, and resolves to an anonymous visitor without it.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return children

  // Telemetry is disabled so the browser makes no call to clerk-telemetry.com.
  // That keeps the CSP limited to the Frontend API origin and avoids sending
  // usage data about this app to a third party.
  return <ClerkProvider telemetry={false}>{children}</ClerkProvider>
}
