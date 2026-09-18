import { and, eq } from 'drizzle-orm'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { AuthenticationRequiredError, requireCurrentAppUser } from '@/lib/auth/current-user'
import { getCatalogProduct, ProductKeySchema } from '@/lib/billing/catalog'
import { getPolarClient } from '@/lib/billing/polar'
import { getDatabase } from '@/lib/db/client'
import { billingProducts, checkoutIntents } from '@/lib/db/schema'
import { returnOriginFor } from '@/lib/app-origin'
import { checkRateLimit, RateLimitUnavailableError } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RequestSchema = z.object({
  productKey: ProductKeySchema,
  idempotencyKey: z.string().uuid(),
})

function response(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, { name: 'billing-checkout', limit: 10, window: '1 h' })
    if (!rateLimit.success) return response({ error: 'Too many checkout attempts' }, 429)
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) return response({ error: 'Checkout temporarily unavailable' }, 503)
    throw error
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return response({ error: 'Invalid JSON body' }, 400)
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) return response({ error: 'Invalid checkout request' }, 400)

  let user
  try {
    user = await requireCurrentAppUser()
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return response({ error: 'Authentication required' }, 401)
    throw error
  }

  const product = getCatalogProduct(parsed.data.productKey)
  const db = getDatabase()

  await db.insert(billingProducts).values({
    productKey: product.productKey,
    providerProductId: product.providerProductId,
    kind: product.kind,
    fulfillmentRecipe: product.fulfillmentRecipe,
  }).onConflictDoUpdate({
    target: billingProducts.productKey,
    set: {
      providerProductId: product.providerProductId,
      kind: product.kind,
      fulfillmentRecipe: product.fulfillmentRecipe,
      active: true,
      updatedAt: new Date(),
    },
  })

  const [createdIntent] = await db.insert(checkoutIntents).values({
    userId: user.id,
    productKey: product.productKey,
    idempotencyKey: parsed.data.idempotencyKey,
  }).onConflictDoNothing().returning()

  if (!createdIntent) {
    const [existing] = await db.select().from(checkoutIntents).where(and(
      eq(checkoutIntents.userId, user.id),
      eq(checkoutIntents.idempotencyKey, parsed.data.idempotencyKey),
    )).limit(1)

    if (!existing?.providerCheckoutId) {
      return response({ error: 'Checkout creation is already in progress' }, 409)
    }

    try {
      const checkout = await getPolarClient().checkouts.get({ id: existing.providerCheckoutId })
      return response({ checkoutUrl: checkout.url }, 200)
    } catch {
      return response({ error: 'Unable to recover checkout' }, 503)
    }
  }

  // Return to the deployment the purchase started on (e.g. a preview), never to
  // an arbitrary Host header.
  const appUrl = returnOriginFor(request)
  const customerIpAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined

  try {
    const checkout = await getPolarClient().checkouts.create({
      products: [product.providerProductId],
      externalCustomerId: user.id,
      customerIpAddress,
      successUrl: `${appUrl}/?billing=success&checkout_id={CHECKOUT_ID}`,
      returnUrl: appUrl,
      metadata: {
        checkout_intent_id: createdIntent.id,
        product_key: product.productKey,
      },
      allowDiscountCodes: false,
    }, { timeoutMs: 10_000 })

    await db.update(checkoutIntents).set({
      providerCheckoutId: checkout.id,
      status: 'open',
      updatedAt: new Date(),
    }).where(eq(checkoutIntents.id, createdIntent.id))

    return response({ checkoutUrl: checkout.url }, 201)
  } catch (error) {
    await db.update(checkoutIntents).set({
      status: 'failed',
      updatedAt: new Date(),
    }).where(eq(checkoutIntents.id, createdIntent.id))

    console.error('[billing-checkout] Polar checkout creation failed', {
      intentId: createdIntent.id,
      error: error instanceof Error ? error.name : 'unknown',
    })
    return response({ error: 'Checkout temporarily unavailable' }, 503)
  }
}
