'use client'

import { useEffect, type RefObject } from 'react'

/**
 * Shared dialog behaviour: Escape closes, focus moves into the dialog and
 * cycles inside it while open.
 *
 * Lives in one place so the upgrade and billing dialogs cannot drift apart —
 * a dialog that traps focus in one modal and not the other is the kind of gap
 * that only shows up for keyboard and screen-reader users.
 */
export function useModalDismiss(
  dialogRef: RefObject<HTMLElement | null>,
  initialFocusRef: RefObject<HTMLElement | null>,
  onClose: () => void,
): void {
  useEffect(() => {
    initialFocusRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
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
  }, [dialogRef, initialFocusRef, onClose])
}
