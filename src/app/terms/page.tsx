import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/LegalPage'
import { LEGAL } from '@/components/legal/legal-config'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms for using Reframe, including credits, subscriptions and your content.',
  alternates: { canonical: `${LEGAL.site}/terms` },
}

export default function TermsPage() {
  const email = <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>

  return (
    <LegalPage
      title="Terms of Service"
      summary="You own what you make. AI credits pay for AI generations and come back if one fails. Subscriptions renew monthly and you can cancel anytime. Payments are handled by Polar."
    >
      <p>
        These terms govern your use of {LEGAL.product} at {LEGAL.site}, operated by {LEGAL.operator}. By using
        Reframe you agree to them. If you don’t agree, please don’t use the service.
      </p>

      <h2>1. The service</h2>
      <p>
        Reframe is a browser-based tool for animating SVG files, with presets, AI-assisted animation and export.
        Much of it is free to use without an account; some features, such as additional AI generations, require an
        account or a purchase. GIF and WebM exports made on the free tier include a small Reframe watermark. Spending one credit removes it
        from a single export, and a Pro subscription removes it from every export. We may add, change or remove features over time.
      </p>

      <h2>2. Your account</h2>
      <p>
        You’re responsible for activity on your account and for keeping your sign-in secure. Give accurate
        information and tell us promptly if you suspect unauthorised use. You must be at least 13, or the minimum
        age required where you live.
      </p>

      <h2>3. AI credits</h2>
      <ul>
        <li>Each AI generation uses one credit. One credit also removes the Reframe watermark from a single GIF or WebM export.</li>
        <li>If a generation fails or produces nothing usable, the credit is returned.</li>
        <li>Free visitors get a small daily allowance; new accounts receive a one-time set of free credits.</li>
        <li><strong>Credit packs</strong> you buy don’t expire.</li>
        <li>
          <strong>Subscription credits</strong> are granted for each monthly billing period and expire at the end of
          it. They don’t roll over.
        </li>
        <li>Credits have no cash value and can’t be transferred or exchanged.</li>
      </ul>

      <h2>4. Purchases and subscriptions</h2>
      <p>
        Payments are processed by <strong>Polar</strong>, which acts as the merchant of record and reseller of
        Reframe. Polar’s terms apply to the payment itself, and Polar calculates and collects any applicable tax.
        Prices are shown at checkout.
      </p>
      <ul>
        <li>
          Subscriptions <strong>renew automatically</strong> each billing period until you cancel. You can cancel
          anytime from <strong>your avatar → Billing → Manage billing</strong>.
        </li>
        <li>After you cancel, you keep access until the end of the period you’ve paid for.</li>
        <li>
          Refunds are handled case by case and wherever required by law. If a purchase is refunded, its unused
          credits are removed.
        </li>
      </ul>

      <h2>5. Your content</h2>
      <p>
        You keep all rights to the SVGs you upload and the animations you create. You give us a limited licence to
        process your content only as needed to provide the service, for example to generate an animation or host a
        share link. You confirm you have the rights to anything you upload.
      </p>

      <h2>6. AI-generated output</h2>
      <p>
        AI suggestions are produced automatically and may not always be accurate or suitable. Review the result
        before you use it; you’re responsible for how you use it. AI requests are processed by Anthropic.
      </p>

      <h2>7. Acceptable use</h2>
      <p>Don’t use Reframe to:</p>
      <ul>
        <li>upload content that is illegal, infringes someone else’s rights, or is harmful;</li>
        <li>interfere with the service, test its security without permission, or bypass rate limits and free allowances;</li>
        <li>scrape or access it through automated means beyond normal use of the site;</li>
        <li>resell or redistribute the service itself without our permission.</li>
      </ul>
      <p>We may suspend or remove access that breaks these terms.</p>

      <h2>8. Availability</h2>
      <p>
        We work to keep Reframe available and reliable, but can’t guarantee it will always be uninterrupted or
        error-free. Keep your own copies of important files.
      </p>

      <h2>9. Disclaimer</h2>
      <p>
        Reframe is provided “as is” and “as available”, without warranties of any kind to the fullest extent
        permitted by law.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, we’re not liable for indirect, incidental or consequential damages,
        and our total liability for any claim is limited to the amount you paid us in the 12 months before the
        claim. Nothing in these terms limits liability that can’t be limited by law, or rights you have as a consumer.
      </p>

      <h2>11. Ending your use</h2>
      <p>
        You can stop using Reframe and delete your account at any time. We may suspend or end access for serious or
        repeated breaches of these terms.
      </p>

      <h2>12. Governing law</h2>
      <p>These terms are governed by the laws of {LEGAL.governingLaw}, without affecting your consumer rights where you live.</p>

      <h2>13. Changes</h2>
      <p>
        We may update these terms. We’ll change the effective date above and, for significant changes, let signed-in
        users know. Continuing to use Reframe after a change means you accept the updated terms.
      </p>

      <h2>14. Contact</h2>
      <p>{LEGAL.operator} · {email}</p>
    </LegalPage>
  )
}
