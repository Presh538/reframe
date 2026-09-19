import 'server-only'

import { z } from 'zod'
import { requireServerEnv } from '@/lib/env'

export const ProductKeySchema = z.enum([
  'export_4k_single',
  'project_pass_7d',
  'ai_credits_25',
  'pro_monthly',
  'pro_yearly',
])

export type ProductKey = z.infer<typeof ProductKeySchema>

const catalog: Record<ProductKey, {
  envName: string
  kind: 'one_time' | 'subscription'
  fulfillmentRecipe: Record<string, unknown>
}> = {
  export_4k_single: {
    envName: 'POLAR_PRODUCT_EXPORT_4K_SINGLE',
    kind: 'one_time',
    fulfillmentRecipe: { exportPass: 'single_4k', rerenderHours: 24 },
  },
  project_pass_7d: {
    envName: 'POLAR_PRODUCT_PROJECT_PASS_7D',
    kind: 'one_time',
    fulfillmentRecipe: { exportPass: 'project_7d', validityDays: 7, aiCredits: 20 },
  },
  ai_credits_25: {
    envName: 'POLAR_PRODUCT_AI_CREDITS_25',
    kind: 'one_time',
    fulfillmentRecipe: { aiCredits: 25, expires: false },
  },
  pro_monthly: {
    envName: 'POLAR_PRODUCT_PRO_MONTHLY',
    kind: 'subscription',
    fulfillmentRecipe: { plan: 'pro', aiCreditsMonthly: 300 },
  },
  pro_yearly: {
    envName: 'POLAR_PRODUCT_PRO_YEARLY',
    kind: 'subscription',
    fulfillmentRecipe: { plan: 'pro', aiCreditsMonthly: 300 },
  },
}

export function getCatalogProduct(productKey: ProductKey) {
  const product = catalog[productKey]
  return {
    productKey,
    providerProductId: requireServerEnv(product.envName),
    kind: product.kind,
    fulfillmentRecipe: product.fulfillmentRecipe,
  }
}
