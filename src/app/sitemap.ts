import type { MetadataRoute } from 'next'
import { HOME_UPDATED, LANDING_PAGES, LEGAL_PAGES } from '@/lib/seo/pages'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://reframeo.com'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: APP_URL,
      lastModified: HOME_UPDATED,
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...LANDING_PAGES.map(({ path, updated }) => ({
      url: `${APP_URL}${path}`,
      lastModified: updated,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...LEGAL_PAGES.map(({ path, updated }) => ({
      url: `${APP_URL}${path}`,
      lastModified: updated,
      changeFrequency: 'yearly' as const,
      priority: 0.2,
    })),
  ]
}
