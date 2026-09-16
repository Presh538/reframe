import 'server-only'

/** Allowances live in one place so pricing changes never hide in route code. */
export const ALLOWANCE = {
  /** AI generations an anonymous visitor may run per rolling window. */
  guestAiPerWindow: 3,
  guestWindowSeconds: 24 * 60 * 60,
  /**
   * Secondary cap keyed by IP prefix. Clearing the guest cookie issues a new
   * identifier, so this is what actually bounds a determined visitor.
   */
  guestAiPerNetworkWindow: 12,
  /** One-time grant created when an account is first seen. */
  freeAccountAiCredits: 10,
  /** Monthly allowance attached to an active Pro subscription. */
  proMonthlyAiCredits: 300,
} as const

/** Reservations older than this are assumed orphaned by a crashed request. */
export const STALE_RESERVATION_MS = 5 * 60 * 1000
