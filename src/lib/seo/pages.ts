/**
 * The site's indexable pages, in one place.
 *
 * Feeds the sitemap, the related-links footer on every landing page and the
 * crawlable links on the homepage, so a new landing page only needs adding
 * here to be linked and listed everywhere.
 *
 * `updated` is the date the page's content last changed. Bump it when the
 * copy changes, not on every deploy: a lastmod that moves with each build
 * teaches Google to ignore it.
 */
export type SitePage = { path: string; label: string; updated: string }

export const LANDING_PAGES: SitePage[] = [
  { path: '/animate-svg-with-ai',   label: 'Animate SVG with AI',   updated: '2026-11-08' },
  { path: '/svg-to-gif',            label: 'SVG to GIF',            updated: '2026-11-08' },
  { path: '/svg-to-lottie',         label: 'SVG to Lottie',         updated: '2026-11-08' },
  { path: '/free-svg-animator',     label: 'Free SVG animator',     updated: '2026-11-08' },
  { path: '/animated-svg-logo',     label: 'Animated SVG logo',     updated: '2026-11-08' },
  { path: '/svg-loading-animation', label: 'SVG loading animation', updated: '2026-11-08' },
  { path: '/animate-svg-icon',      label: 'Animate SVG icon',      updated: '2026-11-08' },
]

export const LEGAL_PAGES: SitePage[] = [
  { path: '/privacy', label: 'Privacy Policy',   updated: '2026-09-19' },
  { path: '/terms',   label: 'Terms of Service', updated: '2026-09-20' },
]

/** When the homepage's indexable content (metadata, intro) last changed. */
export const HOME_UPDATED = '2026-11-08'
