'use client'

import { useRef } from 'react'
import { motion } from 'motion/react'
import { AccountBilling } from './AccountBilling'
import { useModalDismiss } from './useModalDismiss'
import styles from './BillingModal.module.css'
import modalBackdropStyles from './ModalBackdrop.module.css'

/**
 * Billing, opened from the plan control in the header.
 *
 * Wraps the same <AccountBilling /> panel that Clerk's profile renders, rather
 * than deep-linking into Clerk's modal: the billing page is registered on
 * <UserButton> as a custom profile page, so a standalone openUserProfile() call
 * would not contain it, and the alternative depends on an API Clerk still marks
 * experimental. AccountBilling has no Clerk dependencies — it reads
 * /api/billing/status itself — so it stands on its own here, and both entry
 * points show exactly the same panel.
 */
export function BillingModal({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useModalDismiss(dialogRef, closeRef, onClose)

  return (
    <motion.div
      className={`${styles.overlay} ${modalBackdropStyles.backdrop}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      // Only a click that starts and ends on the backdrop dismisses, so a drag
      // that ends outside the dialog does not close it by accident.
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <motion.div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Billing"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Close">
          <img src="/figma-icons/xmark.svg" alt="" width={24} height={24} />
        </button>

        <AccountBilling />
      </motion.div>
    </motion.div>
  )
}
