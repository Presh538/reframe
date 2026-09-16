-- Reframe billing/auth schema proposal for PostgreSQL.
-- This is design DDL, not yet an applied migration.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE app_user (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id         text NOT NULL UNIQUE,
  status                text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'suspended', 'deleted')),
  primary_email         text,
  display_name          text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz
);

CREATE TABLE billing_customer (
  user_id               uuid PRIMARY KEY REFERENCES app_user(id),
  provider              text NOT NULL DEFAULT 'polar' CHECK (provider = 'polar'),
  provider_customer_id  text UNIQUE,
  external_customer_id  text NOT NULL UNIQUE,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (external_customer_id = user_id::text)
);

CREATE TABLE billing_product (
  product_key           text PRIMARY KEY,
  provider              text NOT NULL DEFAULT 'polar' CHECK (provider = 'polar'),
  provider_product_id   text NOT NULL UNIQUE,
  kind                  text NOT NULL
                        CHECK (kind IN ('one_time', 'subscription')),
  fulfillment_recipe   jsonb NOT NULL,
  active                boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE checkout_intent (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES app_user(id),
  product_key           text NOT NULL REFERENCES billing_product(product_key),
  provider_checkout_id  text UNIQUE,
  status                text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'open', 'succeeded', 'expired', 'failed')),
  idempotency_key       text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE TABLE billing_order (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES app_user(id),
  provider_order_id     text NOT NULL UNIQUE,
  provider_checkout_id  text,
  status                text NOT NULL
                        CHECK (status IN ('pending', 'paid', 'refunded', 'partially_refunded', 'disputed')),
  currency              char(3) NOT NULL,
  amount_minor          bigint NOT NULL CHECK (amount_minor >= 0),
  paid_at               timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX billing_order_user_created_idx
  ON billing_order (user_id, created_at DESC);

CREATE TABLE billing_order_item (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              uuid NOT NULL REFERENCES billing_order(id),
  product_key           text NOT NULL REFERENCES billing_product(product_key),
  provider_product_id   text NOT NULL,
  quantity              integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  amount_minor          bigint NOT NULL CHECK (amount_minor >= 0),
  UNIQUE (order_id, provider_product_id)
);

CREATE TABLE subscription (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES app_user(id),
  product_key              text NOT NULL REFERENCES billing_product(product_key),
  provider_subscription_id text NOT NULL UNIQUE,
  status                   text NOT NULL
                           CHECK (status IN ('incomplete', 'active', 'past_due', 'canceled', 'revoked')),
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean NOT NULL DEFAULT false,
  canceled_at              timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX subscription_user_status_idx
  ON subscription (user_id, status, current_period_end DESC);

CREATE TABLE webhook_event (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider              text NOT NULL CHECK (provider IN ('polar', 'clerk')),
  provider_event_id     text NOT NULL,
  event_type            text NOT NULL,
  payload_sha256        text NOT NULL,
  payload               jsonb,
  status                text NOT NULL DEFAULT 'received'
                        CHECK (status IN ('received', 'processing', 'processed', 'failed', 'ignored')),
  attempts              integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error_code       text,
  received_at           timestamptz NOT NULL DEFAULT now(),
  processed_at          timestamptz,
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX webhook_event_unprocessed_idx
  ON webhook_event (status, received_at)
  WHERE status IN ('received', 'failed');

CREATE TABLE credit_account (
  user_id               uuid NOT NULL REFERENCES app_user(id),
  credit_type           text NOT NULL CHECK (credit_type IN ('ai_generation')),
  available             bigint NOT NULL DEFAULT 0 CHECK (available >= 0),
  reserved              bigint NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  version               bigint NOT NULL DEFAULT 0,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, credit_type)
);

CREATE TABLE credit_grant (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES app_user(id),
  credit_type           text NOT NULL CHECK (credit_type IN ('ai_generation')),
  grant_type            text NOT NULL
                        CHECK (grant_type IN ('free_allowance', 'purchase', 'subscription', 'promotion', 'admin')),
  source_id             text NOT NULL,
  amount                bigint NOT NULL CHECK (amount > 0),
  remaining             bigint NOT NULL CHECK (remaining >= 0 AND remaining <= amount),
  starts_at             timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz,
  revoked_at            timestamptz,
  idempotency_key       text NOT NULL UNIQUE,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at IS NULL OR expires_at > starts_at)
);

CREATE INDEX credit_grant_spendable_idx
  ON credit_grant (user_id, credit_type, expires_at, created_at)
  WHERE remaining > 0 AND revoked_at IS NULL;

CREATE TABLE credit_ledger (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES app_user(id),
  credit_type           text NOT NULL CHECK (credit_type IN ('ai_generation')),
  entry_type            text NOT NULL
                        CHECK (entry_type IN ('grant', 'purchase', 'reserve', 'release', 'consume', 'expire', 'refund', 'adjustment')),
  delta_available       bigint NOT NULL DEFAULT 0,
  delta_reserved        bigint NOT NULL DEFAULT 0,
  source_type           text NOT NULL
                        CHECK (source_type IN ('free_allowance', 'order', 'subscription', 'usage', 'refund', 'admin', 'reconciliation')),
  source_id             text NOT NULL,
  credit_grant_id       uuid REFERENCES credit_grant(id),
  idempotency_key       text NOT NULL UNIQUE,
  expires_at            timestamptz,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX credit_ledger_user_created_idx
  ON credit_ledger (user_id, credit_type, created_at DESC);

CREATE TABLE usage_operation (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES app_user(id),
  operation_type        text NOT NULL CHECK (operation_type IN ('ai_animation')),
  status                text NOT NULL
                        CHECK (status IN ('reserved', 'running', 'succeeded', 'failed', 'released')),
  units                 integer NOT NULL DEFAULT 1 CHECK (units > 0),
  idempotency_key       text NOT NULL,
  provider_request_id   text,
  input_tokens          integer CHECK (input_tokens >= 0),
  output_tokens         integer CHECK (output_tokens >= 0),
  estimated_cost_micros bigint CHECK (estimated_cost_micros >= 0),
  error_code            text,
  reserved_at           timestamptz NOT NULL DEFAULT now(),
  completed_at          timestamptz,
  UNIQUE (user_id, idempotency_key)
);

CREATE TABLE usage_credit_allocation (
  usage_operation_id    uuid NOT NULL REFERENCES usage_operation(id),
  credit_grant_id       uuid NOT NULL REFERENCES credit_grant(id),
  units                 bigint NOT NULL CHECK (units > 0),
  PRIMARY KEY (usage_operation_id, credit_grant_id)
);

CREATE INDEX usage_operation_stale_idx
  ON usage_operation (reserved_at)
  WHERE status IN ('reserved', 'running');

CREATE TABLE entitlement_grant (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES app_user(id),
  feature_key           text NOT NULL,
  source_type           text NOT NULL
                        CHECK (source_type IN ('order', 'subscription', 'promotion', 'admin')),
  source_id             text NOT NULL,
  scope_type            text NOT NULL DEFAULT 'account'
                        CHECK (scope_type IN ('account', 'project')),
  scope_id              text,
  quantity              bigint CHECK (quantity IS NULL OR quantity >= 0),
  starts_at             timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz,
  revoked_at            timestamptz,
  idempotency_key       text NOT NULL UNIQUE,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CHECK ((scope_type = 'account' AND scope_id IS NULL) OR
         (scope_type = 'project' AND scope_id IS NOT NULL)),
  CHECK (expires_at IS NULL OR expires_at > starts_at)
);

CREATE INDEX entitlement_active_user_idx
  ON entitlement_grant (user_id, feature_key, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE export_pass (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES app_user(id),
  order_id              uuid REFERENCES billing_order(id),
  pass_type             text NOT NULL CHECK (pass_type IN ('single_4k', 'project_7d')),
  status                text NOT NULL DEFAULT 'available'
                        CHECK (status IN ('available', 'bound', 'expired', 'revoked')),
  source_fingerprint    text,
  available_until       timestamptz,
  bound_at              timestamptz,
  rerender_until        timestamptz,
  idempotency_key       text NOT NULL UNIQUE,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX export_pass_available_idx
  ON export_pass (user_id, pass_type, status, available_until);

CREATE TABLE render_job (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES app_user(id),
  export_pass_id        uuid REFERENCES export_pass(id),
  status                text NOT NULL DEFAULT 'queued'
                        CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'expired')),
  source_fingerprint    text NOT NULL,
  input_blob_key        text NOT NULL,
  output_blob_key       text,
  format                text NOT NULL CHECK (format IN ('webm', 'gif', 'mp4')),
  width                 integer NOT NULL CHECK (width BETWEEN 1 AND 4096),
  height                integer NOT NULL CHECK (height BETWEEN 1 AND 4096),
  fps                   integer NOT NULL CHECK (fps BETWEEN 1 AND 120),
  duration_ms           integer NOT NULL CHECK (duration_ms BETWEEN 1 AND 60000),
  error_code            text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  started_at            timestamptz,
  completed_at          timestamptz,
  expires_at            timestamptz NOT NULL
);

CREATE INDEX render_job_user_created_idx
  ON render_job (user_id, created_at DESC);

CREATE INDEX render_job_queue_idx
  ON render_job (created_at)
  WHERE status = 'queued';

CREATE TABLE account_access_snapshot (
  user_id               uuid PRIMARY KEY REFERENCES app_user(id),
  plan_key              text NOT NULL DEFAULT 'free',
  features              jsonb NOT NULL DEFAULT '{}'::jsonb,
  entitlement_version   bigint NOT NULL DEFAULT 0,
  computed_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_event (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type            text NOT NULL CHECK (actor_type IN ('user', 'system', 'admin', 'provider')),
  actor_id              text,
  user_id               uuid REFERENCES app_user(id),
  action                text NOT NULL,
  target_type           text NOT NULL,
  target_id             text,
  request_id            text,
  ip_hmac               text,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_event_user_created_idx
  ON audit_event (user_id, created_at DESC);

-- Application invariants that must be enforced in service transactions:
-- 1. Every credit_account mutation has a matching credit_ledger entry.
-- 2. A reservation atomically decrements available, increments reserved, and
--    decrements eligible credit_grant buckets in earliest-expiry-first order.
-- 3. A completion atomically decrements reserved and appends consume.
-- 4. A failure atomically decrements reserved, increments available, restores
--    the original grant buckets, and appends release.
-- 5. Webhook fulfillment and its grants share the same database transaction.
-- 6. billing_product.fulfillment_recipe is read only from trusted server code.
