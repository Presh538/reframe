

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

    // In development Next.js uses eval() for HMR / source maps, so we must
    // allow 'unsafe-eval'. In production we omit it for a tighter policy.
    // Similarly, HMR opens a WebSocket to the dev server, so connect-src must
    // include ws://localhost:* in development.
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:"
      : "script-src 'self' 'unsafe-inline' blob:"

    const connectSrc = isDev
      ? "connect-src 'self' ws://localhost:* wss://localhost:*"
      : "connect-src 'self' https://vitals.vercel-insights.com"

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
              "img-src 'self' data: blob: https://api.producthunt.com",
              connectSrc,
              "font-src 'self'",
              "worker-src 'self' blob:",
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
