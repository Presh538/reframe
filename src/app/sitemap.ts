import type { MetadataRoute } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://reframeo.com'

const LANDING_PATHS = [
  '/animate-svg-with-ai',
  '/svg-to-gif',
  '/svg-to-lottie',
  '/free-svg-animator',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    {
      url: APP_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...LANDING_PATHS.map((path) => ({
      url: `${APP_URL}${path}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ]
}
