import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/LegalPage'
import { LEGAL } from '@/components/legal/legal-config'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Reframe collects, uses and protects your information.',
  alternates: { canonical: `${LEGAL.site}/privacy` },
}

export default function PrivacyPage() {
  const email = <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>

  return (
    <LegalPage
      title="Privacy Policy"
      summary="Your SVGs stay in your browser unless you share them or use AI. We never see your card details, we don't sell your data, and we don't show ads."
    >
      <p>
        This policy explains what information {LEGAL.product} (“we”, “us”), operated by {LEGAL.operator}, collects
        when you use {LEGAL.site}, how we use it, and the choices you have. Questions: {email}.
      </p>

      <h2>What we collect</h2>

      <h3>Your account</h3>
      <p>
        You can use Reframe without an account. If you sign in, our authentication provider, Clerk, stores your
        email address and, if you sign in with Google, your name and profile photo. We keep an internal account
        identifier linked to that sign-in.
      </p>

      <h3>Payments</h3>
      <p>
        Purchases are processed by <strong>Polar</strong>, which acts as the <strong>merchant of record</strong>:
        Polar is the seller, collects your payment details and billing information, and handles tax. We never
        receive or store your card number. We receive a record of each order: the product, amount, status, date
        and a Polar customer reference.
      </p>

      <h3>Your SVGs and animations</h3>
      <ul>
        <li>Files you open are processed <strong>in your browser</strong>. We don’t store them.</li>
        <li>
          An SVG may be sent to our server to be checked for unsafe content before it is shown. It is not stored.
        </li>
        <li>
          If you <strong>create a share link</strong>, that animation is stored so the link works, and is deleted
          automatically after <strong>7 days</strong>.
        </li>
        <li>
          If you <strong>use AI</strong>, your prompt, the file name and a description of your SVG’s structure (its
          element names and layout) are sent to Anthropic to generate the animation. We don’t keep your prompt.
        </li>
      </ul>

      <h3>Credits and usage</h3>
      <p>
        If you have an account, we record your AI credit balance and each AI request (time, outcome and the
        amount of AI processing used) so we can charge credits accurately and return them when a request fails.
      </p>

      <h3>Analytics and error reports</h3>
      <p>
        We use <strong>PostHog</strong> to understand how Reframe is used and to fix problems. This includes
        product events (for example, that an export started), error reports, and <strong>session recordings</strong>,
        which capture how you interact with the page, including what is displayed on it, so we can see and fix bugs.
        We also use Vercel Analytics for aggregate page views and performance.
      </p>

      <h3>Preventing abuse</h3>
      <p>
        To stop free AI allowances and our services being abused, we use your IP address to apply rate limits. It is
        converted to a one-way hash before being stored, so we don’t keep the address itself. Visitors who aren’t
        signed in get a random identifier in a cookie (<code>rf_guest</code>) that tracks the free daily AI
        allowance and expires after 24 hours.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>To run Reframe, including AI generation, sharing and your account.</li>
        <li>To process purchases, credits and subscriptions.</li>
        <li>To prevent fraud and abuse and keep the service secure.</li>
        <li>To fix bugs and improve the product.</li>
        <li>To contact you about your account or purchases.</li>
      </ul>
      <p><strong>We don’t sell your personal information and we don’t use it for advertising.</strong></p>

      <h2>Who we share it with</h2>
      <p>We use these providers to run the service. Each processes data only for the purpose listed.</p>
      <table>
        <thead>
          <tr><th scope="col">Provider</th><th scope="col">Purpose</th></tr>
        </thead>
        <tbody>
          <tr><td>Vercel</td><td>Hosting, share-link storage, page analytics</td></tr>
          <tr><td>Clerk</td><td>Sign-in and account management</td></tr>
          <tr><td>Google</td><td>“Continue with Google” sign-in, if you choose it</td></tr>
          <tr><td>Neon</td><td>Database for accounts, credits and orders</td></tr>
          <tr><td>Upstash</td><td>Rate limiting and the free AI allowance</td></tr>
          <tr><td>Polar</td><td>Payments, tax and invoices, as merchant of record</td></tr>
          <tr><td>Anthropic</td><td>Generating animations from AI prompts</td></tr>
          <tr><td>PostHog</td><td>Product analytics, error reports and session recordings</td></tr>
        </tbody>
      </table>
      <p>
        We may also disclose information if required by law, or to protect the rights and safety of our users or
        the service. These providers may process data in the United States and other countries.
      </p>

      <h2>Cookies</h2>
      <ul>
        <li><strong>Essential:</strong> Clerk session cookies keep you signed in; <code>rf_guest</code> tracks the free AI allowance.</li>
        <li><strong>Analytics:</strong> PostHog uses cookies or local storage to recognise returning sessions.</li>
      </ul>

      <h2>How long we keep it</h2>
      <ul>
        <li>Account information: until you delete your account.</li>
        <li>Order and payment records: as long as needed for accounting, tax and dispute handling.</li>
        <li>Share links: 7 days.</li>
        <li>Guest allowance cookie and rate-limit records: up to 24 hours.</li>
      </ul>

      <h2>Your choices and rights</h2>
      <p>
        You can update your profile or delete your account from your avatar menu. You can also ask us to access,
        correct, export or delete your personal information by emailing {email}. Depending on where you live, you
        may have additional rights under laws such as the GDPR or CCPA, including the right to complain to your
        local data protection authority. Payment records held by Polar are covered by Polar’s own privacy policy.
      </p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit, payment details never touch our servers, and access to account and billing
        data is restricted to what the service needs to operate. No system is perfectly secure, but we work to
        protect your information.
      </p>

      <h2>Children</h2>
      <p>
        Reframe is not directed at children under 13, or under 16 where local law requires, and we don’t knowingly
        collect their information. If you believe a child has given us personal information, contact us and we’ll
        delete it.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy, we’ll update the effective date above, and for significant changes we’ll let
        signed-in users know.
      </p>

      <h2>Contact</h2>
      <p>{LEGAL.operator} · {email}</p>
    </LegalPage>
  )
}
