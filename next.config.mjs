

const nextConfig = {
  // Strict mode catches subtle bugs early
  reactStrictMode: true,

  // Don't advertise which server software is running
  poweredByHeader: false,

  // Security: restrict which domains images can load from
  images: {
    domains: [],
  },

  // Expose only public env vars to the client bundle
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    NEXT_PUBLIC_APP_NAME: 'The Reframe',
  },

  // Route PostHog ingestion through the app's own domain so the browser CSP
  // covers it via 'self' without needing external connect-src entries.
  async rewrites() {
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? ''
    const assetHost = host.replace('us.i.', 'us-assets.i.')
    return [
      { source: '/ingest/static/:path*', destination: `${assetHost}/static/:path*` },
      { source: '/ingest/array/:path*',  destination: `${assetHost}/array/:path*`  },
      { source: '/ingest/:path*',        destination: `${host}/:path*`             },
    ]
  },

  // Required for PostHog trailing-slash API requests to pass through correctly
  skipTrailingSlashRedirect: true,

  // HTTP security headers — applied to every route.
  // NOTE: serverActions.bodySizeLimit (below) only applies to Server Actions,
  // NOT to App Router route handlers. /api/validate-svg uses its own Zod
  // schema to enforce the 50 MB cap; the hosting platform (Vercel Node runtime)
  // applies its own platform-level body limit independently.
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production'

    // Clerk serves clerk.browser.js and ui.browser.js from an instance-specific
    // Frontend API host. That host is encoded in the publishable key, so it is
    // derived here rather than hardcoded or wildcarded: a pk_test_ key resolves
    // to <instance>.clerk.accounts.dev and a pk_live_ key to the production
    // domain, with no config change between environments.
    //
    // Clerk's own clerkMiddleware({ contentSecurityPolicy }) helper is
    // deliberately NOT used: its default script-src includes bare `https:` and
    // `http:`, which would permit scripts from any origin.
    const clerkOrigin = (() => {
      const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
      if (!key) return null
      try {
        const host = Buffer.from(key.replace(/^pk_(test|live)_/, ''), 'base64')
          .toString('utf8')
          .replace(/\$+$/, '')
        return /^[a-z0-9.-]+$/i.test(host) ? `https://${host}` : null
      } catch {
        return null
      }
    })()

    // Each entry stays empty until Clerk is configured, so the policy is
    // byte-identical to today's until authentication is actually provisioned.
    const clerkScript  = clerkOrigin ? ` ${clerkOrigin}` : ''
    const clerkConnect = clerkOrigin ? ` ${clerkOrigin}` : ''
    // Avatars rendered by <UserButton>.
    const clerkImg     = clerkOrigin ? ' https://img.clerk.com' : ''
    // Cloudflare Turnstile, used by Clerk's bot protection on sign-up.
    const clerkFrame   = clerkOrigin ? ' https://challenges.cloudflare.com' : ''

    // In development Next.js uses eval() for HMR / source maps, so we must
    // allow 'unsafe-eval'. In production we omit it for a tighter policy.
    // Similarly, HMR opens a WebSocket to the dev server, so connect-src must
    // include ws://localhost:* in development.
    const scriptSrc = (isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:"
      : "script-src 'self' 'unsafe-inline' blob:") + clerkScript

    const connectSrc = (isDev
      ? "connect-src 'self' ws://localhost:* wss://localhost:*"
      : "connect-src 'self' https://vitals.vercel-insights.com") + clerkConnect

    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent the app from being embedded in a foreign iframe (clickjacking)
          { key: 'X-Frame-Options',        value: 'DENY' },
          // Stop browsers from MIME-sniffing responses away from the declared content-type
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Don't send the Referer header when navigating to external sites
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
          // Enforce HTTPS for 2 years; include sub-domains (only meaningful in production)
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Permissions policy — lock down browser features the app doesn't need
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          // Content Security Policy
          // — scripts: self + unsafe-inline (Next.js inline scripts) + blob: (gif.js worker)
          //            + unsafe-eval in dev only (Next.js HMR / source maps)
          // — styles: self + unsafe-inline (Tailwind + Framer Motion inline styles)
          // — images: self + data: + blob: (canvas capture for GIF export)
          //            + api.producthunt.com (live "Follow on Product Hunt" badge on landing pages)
          // — connect: self + ws: in dev (Next.js HMR websocket)
          // — worker-src: blob: (gif.js web worker)
          // — frame-ancestors: none (belt-and-suspenders with X-Frame-Options)
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline'",
              `img-src 'self' data: blob: https://api.producthunt.com${clerkImg}`,
              connectSrc,
              "font-src 'self'",
              "worker-src 'self' blob:",
              `frame-src 'self'${clerkFrame}`,
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },

  // Turbopack (default in Next.js 16) — no extra config needed for this app.
  // The webpack fallback below is kept for webpack-mode compatibility.
  turbopack: {},

  // Webpack: handle gif.js worker file correctly (used when --webpack flag is passed)
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    }
    return config
  },
}

export default nextConfig
