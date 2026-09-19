ALTER TABLE "subscription" DROP CONSTRAINT "subscription_status_check";--> statement-breakpoint
ALTER TABLE "billing_order" ADD COLUMN "provider_subscription_id" text;--> statement-breakpoint
ALTER TABLE "billing_order" ADD COLUMN "period_start" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "billing_order" ADD COLUMN "period_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "billing_order" ADD COLUMN "net_amount_minor" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "billing_order" ADD COLUMN "refunded_amount_minor" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "ended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "provider_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_status_check" CHECK ("subscription"."status" in ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'revoked', 'unpaid', 'paused'));--> statement-breakpoint
UPDATE billing_order o SET net_amount_minor = i.amount
FROM (SELECT order_id, sum(amount_minor)::bigint AS amount FROM billing_order_item GROUP BY order_id) i
WHERE o.id = i.order_id;--> statement-breakpoint
-- Backfill provider references only from authenticated, successfully processed order events.
WITH latest AS (
  SELECT DISTINCT ON (payload->'data'->>'id') payload->'data' AS data
  FROM webhook_event
  WHERE provider='polar' AND status='processed' AND event_type LIKE 'order.%'
  ORDER BY payload->'data'->>'id', received_at DESC
)
UPDATE billing_order o SET
  provider_subscription_id = coalesce(latest.data->>'subscription_id', latest.data->'subscription'->>'id'),
  period_start = (latest.data->'subscription'->>'current_period_start')::timestamptz,
  period_end = (latest.data->'subscription'->>'current_period_end')::timestamptz,
  refunded_amount_minor = coalesce((latest.data->>'refunded_amount')::bigint, 0)
FROM latest WHERE o.provider_order_id = latest.data->>'id';
