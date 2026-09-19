import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  char,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

type JsonObject = Record<string, unknown>
const timestamptz = (name: string) => timestamp(name, { withTimezone: true })

export const appUsers = pgTable('app_user', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  status: text('status').notNull().default('active'),
  primaryEmail: text('primary_email'),
  displayName: text('display_name'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  deletedAt: timestamptz('deleted_at'),
}, (table) => [
  check('app_user_status_check', sql`${table.status} in ('active', 'suspended', 'deleted')`),
])

export const billingCustomers = pgTable('billing_customer', {
  userId: uuid('user_id').primaryKey().references(() => appUsers.id),
  provider: text('provider').notNull().default('polar'),
  providerCustomerId: text('provider_customer_id').unique(),
  externalCustomerId: text('external_customer_id').notNull().unique(),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
}, (table) => [
  check('billing_customer_provider_check', sql`${table.provider} = 'polar'`),
  check('billing_customer_external_id_check', sql`${table.externalCustomerId} = ${table.userId}::text`),
])

export const billingProducts = pgTable('billing_product', {
  productKey: text('product_key').primaryKey(),
  provider: text('provider').notNull().default('polar'),
  providerProductId: text('provider_product_id').notNull().unique(),
  kind: text('kind').notNull(),
  fulfillmentRecipe: jsonb('fulfillment_recipe').$type<JsonObject>().notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
}, (table) => [
  check('billing_product_provider_check', sql`${table.provider} = 'polar'`),
  check('billing_product_kind_check', sql`${table.kind} in ('one_time', 'subscription')`),
])

export const checkoutIntents = pgTable('checkout_intent', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => appUsers.id),
  productKey: text('product_key').notNull().references(() => billingProducts.productKey),
  providerCheckoutId: text('provider_checkout_id').unique(),
  status: text('status').notNull().default('pending'),
  idempotencyKey: text('idempotency_key').notNull(),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('checkout_intent_user_idempotency_uidx').on(table.userId, table.idempotencyKey),
  check('checkout_intent_status_check', sql`${table.status} in ('pending', 'open', 'succeeded', 'expired', 'failed')`),
])

export const billingOrders = pgTable('billing_order', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => appUsers.id),
  providerOrderId: text('provider_order_id').notNull().unique(),
  providerCheckoutId: text('provider_checkout_id'),
  providerSubscriptionId: text('provider_subscription_id'),
  periodStart: timestamptz('period_start'),
  periodEnd: timestamptz('period_end'),
  netAmountMinor: bigint('net_amount_minor', { mode: 'number' }).notNull().default(0),
  refundedAmountMinor: bigint('refunded_amount_minor', { mode: 'number' }).notNull().default(0),
  status: text('status').notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
  paidAt: timestamptz('paid_at'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
}, (table) => [
  index('billing_order_user_created_idx').on(table.userId, table.createdAt),
  check('billing_order_status_check', sql`${table.status} in ('pending', 'paid', 'refunded', 'partially_refunded', 'disputed')`),
  check('billing_order_amount_check', sql`${table.amountMinor} >= 0`),
])

export const billingOrderItems = pgTable('billing_order_item', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => billingOrders.id),
  productKey: text('product_key').notNull().references(() => billingProducts.productKey),
  providerProductId: text('provider_product_id').notNull(),
  quantity: integer('quantity').notNull().default(1),
  amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
}, (table) => [
  uniqueIndex('billing_order_item_order_product_uidx').on(table.orderId, table.providerProductId),
  check('billing_order_item_quantity_check', sql`${table.quantity} > 0`),
  check('billing_order_item_amount_check', sql`${table.amountMinor} >= 0`),
])

export const subscriptions = pgTable('subscription', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => appUsers.id),
  productKey: text('product_key').notNull().references(() => billingProducts.productKey),
  providerSubscriptionId: text('provider_subscription_id').notNull().unique(),
  status: text('status').notNull(),
  currentPeriodStart: timestamptz('current_period_start'),
  currentPeriodEnd: timestamptz('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  canceledAt: timestamptz('canceled_at'),
  endedAt: timestamptz('ended_at'),
  providerUpdatedAt: timestamptz('provider_updated_at'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
}, (table) => [
  index('subscription_user_status_idx').on(table.userId, table.status, table.currentPeriodEnd),
  check('subscription_status_check', sql`${table.status} in ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'revoked', 'unpaid', 'paused')`),
])

export const webhookEvents = pgTable('webhook_event', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').notNull(),
  providerEventId: text('provider_event_id').notNull(),
  eventType: text('event_type').notNull(),
  payloadSha256: text('payload_sha256').notNull(),
  payload: jsonb('payload').$type<JsonObject>(),
  status: text('status').notNull().default('received'),
  attempts: integer('attempts').notNull().default(0),
  lastErrorCode: text('last_error_code'),
  receivedAt: timestamptz('received_at').notNull().defaultNow(),
  processedAt: timestamptz('processed_at'),
}, (table) => [
  uniqueIndex('webhook_event_provider_event_uidx').on(table.provider, table.providerEventId),
  index('webhook_event_status_received_idx').on(table.status, table.receivedAt),
  check('webhook_event_provider_check', sql`${table.provider} in ('polar', 'clerk')`),
  check('webhook_event_status_check', sql`${table.status} in ('received', 'processing', 'processed', 'failed', 'ignored')`),
  check('webhook_event_attempts_check', sql`${table.attempts} >= 0`),
])

export const creditAccounts = pgTable('credit_account', {
  userId: uuid('user_id').notNull().references(() => appUsers.id),
  creditType: text('credit_type').notNull(),
  available: bigint('available', { mode: 'number' }).notNull().default(0),
  reserved: bigint('reserved', { mode: 'number' }).notNull().default(0),
  version: bigint('version', { mode: 'number' }).notNull().default(0),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.creditType] }),
  check('credit_account_type_check', sql`${table.creditType} = 'ai_generation'`),
  check('credit_account_available_check', sql`${table.available} >= 0`),
  check('credit_account_reserved_check', sql`${table.reserved} >= 0`),
])

export const creditGrants = pgTable('credit_grant', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => appUsers.id),
  creditType: text('credit_type').notNull(),
  grantType: text('grant_type').notNull(),
  sourceId: text('source_id').notNull(),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  remaining: bigint('remaining', { mode: 'number' }).notNull(),
  startsAt: timestamptz('starts_at').notNull().defaultNow(),
  expiresAt: timestamptz('expires_at'),
  revokedAt: timestamptz('revoked_at'),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
}, (table) => [
  index('credit_grant_spendable_idx').on(table.userId, table.creditType, table.expiresAt, table.createdAt),
  check('credit_grant_type_check', sql`${table.creditType} = 'ai_generation'`),
  check('credit_grant_kind_check', sql`${table.grantType} in ('free_allowance', 'purchase', 'subscription', 'promotion', 'admin')`),
  check('credit_grant_amount_check', sql`${table.amount} > 0`),
  check('credit_grant_remaining_check', sql`${table.remaining} >= 0 and ${table.remaining} <= ${table.amount}`),
  check('credit_grant_expiry_check', sql`${table.expiresAt} is null or ${table.expiresAt} > ${table.startsAt}`),
])

export const creditLedger = pgTable('credit_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => appUsers.id),
  creditType: text('credit_type').notNull(),
  entryType: text('entry_type').notNull(),
  deltaAvailable: bigint('delta_available', { mode: 'number' }).notNull().default(0),
  deltaReserved: bigint('delta_reserved', { mode: 'number' }).notNull().default(0),
  sourceType: text('source_type').notNull(),
  sourceId: text('source_id').notNull(),
  creditGrantId: uuid('credit_grant_id').references(() => creditGrants.id),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  expiresAt: timestamptz('expires_at'),
  metadata: jsonb('metadata').$type<JsonObject>().notNull().default({}),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
}, (table) => [
  index('credit_ledger_user_created_idx').on(table.userId, table.creditType, table.createdAt),
  check('credit_ledger_type_check', sql`${table.creditType} = 'ai_generation'`),
  check('credit_ledger_entry_check', sql`${table.entryType} in ('grant', 'purchase', 'reserve', 'release', 'consume', 'expire', 'refund', 'adjustment')`),
  check('credit_ledger_source_check', sql`${table.sourceType} in ('free_allowance', 'order', 'subscription', 'usage', 'refund', 'admin', 'reconciliation')`),
])

export const usageOperations = pgTable('usage_operation', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => appUsers.id),
  operationType: text('operation_type').notNull(),
  status: text('status').notNull(),
  units: integer('units').notNull().default(1),
  idempotencyKey: text('idempotency_key').notNull(),
  providerRequestId: text('provider_request_id'),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  estimatedCostMicros: bigint('estimated_cost_micros', { mode: 'number' }),
  errorCode: text('error_code'),
  reservedAt: timestamptz('reserved_at').notNull().defaultNow(),
  completedAt: timestamptz('completed_at'),
}, (table) => [
  uniqueIndex('usage_operation_user_idempotency_uidx').on(table.userId, table.idempotencyKey),
  index('usage_operation_status_reserved_idx').on(table.status, table.reservedAt),
  check('usage_operation_type_check', sql`${table.operationType} = 'ai_animation'`),
  check('usage_operation_status_check', sql`${table.status} in ('reserved', 'running', 'succeeded', 'failed', 'released')`),
  check('usage_operation_units_check', sql`${table.units} > 0`),
])

export const usageCreditAllocations = pgTable('usage_credit_allocation', {
  usageOperationId: uuid('usage_operation_id').notNull().references(() => usageOperations.id),
  creditGrantId: uuid('credit_grant_id').notNull().references(() => creditGrants.id),
  units: bigint('units', { mode: 'number' }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.usageOperationId, table.creditGrantId] }),
  check('usage_credit_allocation_units_check', sql`${table.units} > 0`),
])

export const entitlementGrants = pgTable('entitlement_grant', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => appUsers.id),
  featureKey: text('feature_key').notNull(),
  sourceType: text('source_type').notNull(),
  sourceId: text('source_id').notNull(),
  scopeType: text('scope_type').notNull().default('account'),
  scopeId: text('scope_id'),
  quantity: bigint('quantity', { mode: 'number' }),
  startsAt: timestamptz('starts_at').notNull().defaultNow(),
  expiresAt: timestamptz('expires_at'),
  revokedAt: timestamptz('revoked_at'),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  metadata: jsonb('metadata').$type<JsonObject>().notNull().default({}),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
}, (table) => [
  index('entitlement_grant_user_feature_idx').on(table.userId, table.featureKey, table.expiresAt),
  check('entitlement_grant_source_check', sql`${table.sourceType} in ('order', 'subscription', 'promotion', 'admin')`),
  check('entitlement_grant_scope_check', sql`${table.scopeType} in ('account', 'project')`),
  check('entitlement_grant_scope_id_check', sql`(${table.scopeType} = 'account' and ${table.scopeId} is null) or (${table.scopeType} = 'project' and ${table.scopeId} is not null)`),
  check('entitlement_grant_quantity_check', sql`${table.quantity} is null or ${table.quantity} >= 0`),
  check('entitlement_grant_expiry_check', sql`${table.expiresAt} is null or ${table.expiresAt} > ${table.startsAt}`),
])

export const exportPasses = pgTable('export_pass', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => appUsers.id),
  orderId: uuid('order_id').references(() => billingOrders.id),
  passType: text('pass_type').notNull(),
  status: text('status').notNull().default('available'),
  sourceFingerprint: text('source_fingerprint'),
  availableUntil: timestamptz('available_until'),
  boundAt: timestamptz('bound_at'),
  rerenderUntil: timestamptz('rerender_until'),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
}, (table) => [
  index('export_pass_user_status_idx').on(table.userId, table.passType, table.status, table.availableUntil),
  check('export_pass_type_check', sql`${table.passType} in ('single_4k', 'project_7d')`),
  check('export_pass_status_check', sql`${table.status} in ('available', 'bound', 'expired', 'revoked')`),
])

export const renderJobs = pgTable('render_job', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => appUsers.id),
  exportPassId: uuid('export_pass_id').references(() => exportPasses.id),
  status: text('status').notNull().default('queued'),
  sourceFingerprint: text('source_fingerprint').notNull(),
  inputBlobKey: text('input_blob_key').notNull(),
  outputBlobKey: text('output_blob_key'),
  format: text('format').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  fps: integer('fps').notNull(),
  durationMs: integer('duration_ms').notNull(),
  errorCode: text('error_code'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
  startedAt: timestamptz('started_at'),
  completedAt: timestamptz('completed_at'),
  expiresAt: timestamptz('expires_at').notNull(),
}, (table) => [
  index('render_job_user_created_idx').on(table.userId, table.createdAt),
  index('render_job_status_created_idx').on(table.status, table.createdAt),
  check('render_job_status_check', sql`${table.status} in ('queued', 'running', 'succeeded', 'failed', 'expired')`),
  check('render_job_format_check', sql`${table.format} in ('webm', 'gif', 'mp4')`),
  check('render_job_width_check', sql`${table.width} between 1 and 4096`),
  check('render_job_height_check', sql`${table.height} between 1 and 4096`),
  check('render_job_fps_check', sql`${table.fps} between 1 and 120`),
  check('render_job_duration_check', sql`${table.durationMs} between 1 and 60000`),
])

export const accountAccessSnapshots = pgTable('account_access_snapshot', {
  userId: uuid('user_id').primaryKey().references(() => appUsers.id),
  planKey: text('plan_key').notNull().default('free'),
  features: jsonb('features').$type<Record<string, boolean>>().notNull().default({}),
  entitlementVersion: bigint('entitlement_version', { mode: 'number' }).notNull().default(0),
  computedAt: timestamptz('computed_at').notNull().defaultNow(),
})

export const auditEvents = pgTable('audit_event', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorType: text('actor_type').notNull(),
  actorId: text('actor_id'),
  userId: uuid('user_id').references(() => appUsers.id),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id'),
  requestId: text('request_id'),
  ipHmac: text('ip_hmac'),
  metadata: jsonb('metadata').$type<JsonObject>().notNull().default({}),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
}, (table) => [
  index('audit_event_user_created_idx').on(table.userId, table.createdAt),
  check('audit_event_actor_check', sql`${table.actorType} in ('user', 'system', 'admin', 'provider')`),
])

export type AppUser = typeof appUsers.$inferSelect
export type CreditAccount = typeof creditAccounts.$inferSelect
export type EntitlementGrant = typeof entitlementGrants.$inferSelect
