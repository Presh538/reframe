CREATE TABLE "account_access_snapshot" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"plan_key" text DEFAULT 'free' NOT NULL,
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"entitlement_version" bigint DEFAULT 0 NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"primary_email" text,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "app_user_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "app_user_status_check" CHECK ("app_user"."status" in ('active', 'suspended', 'deleted'))
);
--> statement-breakpoint
CREATE TABLE "audit_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"user_id" uuid,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"request_id" text,
	"ip_hmac" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_event_actor_check" CHECK ("audit_event"."actor_type" in ('user', 'system', 'admin', 'provider'))
);
--> statement-breakpoint
CREATE TABLE "billing_customer" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'polar' NOT NULL,
	"provider_customer_id" text,
	"external_customer_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_customer_provider_customer_id_unique" UNIQUE("provider_customer_id"),
	CONSTRAINT "billing_customer_external_customer_id_unique" UNIQUE("external_customer_id"),
	CONSTRAINT "billing_customer_provider_check" CHECK ("billing_customer"."provider" = 'polar'),
	CONSTRAINT "billing_customer_external_id_check" CHECK ("billing_customer"."external_customer_id" = "billing_customer"."user_id"::text)
);
--> statement-breakpoint
CREATE TABLE "billing_order_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_key" text NOT NULL,
	"provider_product_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"amount_minor" bigint NOT NULL,
	CONSTRAINT "billing_order_item_quantity_check" CHECK ("billing_order_item"."quantity" > 0),
	CONSTRAINT "billing_order_item_amount_check" CHECK ("billing_order_item"."amount_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "billing_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_order_id" text NOT NULL,
	"provider_checkout_id" text,
	"status" text NOT NULL,
	"currency" char(3) NOT NULL,
	"amount_minor" bigint NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_order_provider_order_id_unique" UNIQUE("provider_order_id"),
	CONSTRAINT "billing_order_status_check" CHECK ("billing_order"."status" in ('pending', 'paid', 'refunded', 'partially_refunded', 'disputed')),
	CONSTRAINT "billing_order_amount_check" CHECK ("billing_order"."amount_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "billing_product" (
	"product_key" text PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'polar' NOT NULL,
	"provider_product_id" text NOT NULL,
	"kind" text NOT NULL,
	"fulfillment_recipe" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_product_provider_product_id_unique" UNIQUE("provider_product_id"),
	CONSTRAINT "billing_product_provider_check" CHECK ("billing_product"."provider" = 'polar'),
	CONSTRAINT "billing_product_kind_check" CHECK ("billing_product"."kind" in ('one_time', 'subscription'))
);
--> statement-breakpoint
CREATE TABLE "checkout_intent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"product_key" text NOT NULL,
	"provider_checkout_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkout_intent_provider_checkout_id_unique" UNIQUE("provider_checkout_id"),
	CONSTRAINT "checkout_intent_status_check" CHECK ("checkout_intent"."status" in ('pending', 'open', 'succeeded', 'expired', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "credit_account" (
	"user_id" uuid NOT NULL,
	"credit_type" text NOT NULL,
	"available" bigint DEFAULT 0 NOT NULL,
	"reserved" bigint DEFAULT 0 NOT NULL,
	"version" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_account_user_id_credit_type_pk" PRIMARY KEY("user_id","credit_type"),
	CONSTRAINT "credit_account_type_check" CHECK ("credit_account"."credit_type" = 'ai_generation'),
	CONSTRAINT "credit_account_available_check" CHECK ("credit_account"."available" >= 0),
	CONSTRAINT "credit_account_reserved_check" CHECK ("credit_account"."reserved" >= 0)
);
--> statement-breakpoint
CREATE TABLE "credit_grant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"credit_type" text NOT NULL,
	"grant_type" text NOT NULL,
	"source_id" text NOT NULL,
	"amount" bigint NOT NULL,
	"remaining" bigint NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_grant_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "credit_grant_type_check" CHECK ("credit_grant"."credit_type" = 'ai_generation'),
	CONSTRAINT "credit_grant_kind_check" CHECK ("credit_grant"."grant_type" in ('free_allowance', 'purchase', 'subscription', 'promotion', 'admin')),
	CONSTRAINT "credit_grant_amount_check" CHECK ("credit_grant"."amount" > 0),
	CONSTRAINT "credit_grant_remaining_check" CHECK ("credit_grant"."remaining" >= 0 and "credit_grant"."remaining" <= "credit_grant"."amount"),
	CONSTRAINT "credit_grant_expiry_check" CHECK ("credit_grant"."expires_at" is null or "credit_grant"."expires_at" > "credit_grant"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"credit_type" text NOT NULL,
	"entry_type" text NOT NULL,
	"delta_available" bigint DEFAULT 0 NOT NULL,
	"delta_reserved" bigint DEFAULT 0 NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"credit_grant_id" uuid,
	"idempotency_key" text NOT NULL,
	"expires_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_ledger_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "credit_ledger_type_check" CHECK ("credit_ledger"."credit_type" = 'ai_generation'),
	CONSTRAINT "credit_ledger_entry_check" CHECK ("credit_ledger"."entry_type" in ('grant', 'purchase', 'reserve', 'release', 'consume', 'expire', 'refund', 'adjustment')),
	CONSTRAINT "credit_ledger_source_check" CHECK ("credit_ledger"."source_type" in ('free_allowance', 'order', 'subscription', 'usage', 'refund', 'admin', 'reconciliation'))
);
--> statement-breakpoint
CREATE TABLE "entitlement_grant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"feature_key" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"scope_type" text DEFAULT 'account' NOT NULL,
	"scope_id" text,
	"quantity" bigint,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"idempotency_key" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entitlement_grant_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "entitlement_grant_source_check" CHECK ("entitlement_grant"."source_type" in ('order', 'subscription', 'promotion', 'admin')),
	CONSTRAINT "entitlement_grant_scope_check" CHECK ("entitlement_grant"."scope_type" in ('account', 'project')),
	CONSTRAINT "entitlement_grant_scope_id_check" CHECK (("entitlement_grant"."scope_type" = 'account' and "entitlement_grant"."scope_id" is null) or ("entitlement_grant"."scope_type" = 'project' and "entitlement_grant"."scope_id" is not null)),
	CONSTRAINT "entitlement_grant_quantity_check" CHECK ("entitlement_grant"."quantity" is null or "entitlement_grant"."quantity" >= 0),
	CONSTRAINT "entitlement_grant_expiry_check" CHECK ("entitlement_grant"."expires_at" is null or "entitlement_grant"."expires_at" > "entitlement_grant"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "export_pass" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"order_id" uuid,
	"pass_type" text NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"source_fingerprint" text,
	"available_until" timestamp with time zone,
	"bound_at" timestamp with time zone,
	"rerender_until" timestamp with time zone,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "export_pass_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "export_pass_type_check" CHECK ("export_pass"."pass_type" in ('single_4k', 'project_7d')),
	CONSTRAINT "export_pass_status_check" CHECK ("export_pass"."status" in ('available', 'bound', 'expired', 'revoked'))
);
--> statement-breakpoint
CREATE TABLE "render_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"export_pass_id" uuid,
	"status" text DEFAULT 'queued' NOT NULL,
	"source_fingerprint" text NOT NULL,
	"input_blob_key" text NOT NULL,
	"output_blob_key" text,
	"format" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"fps" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "render_job_status_check" CHECK ("render_job"."status" in ('queued', 'running', 'succeeded', 'failed', 'expired')),
	CONSTRAINT "render_job_format_check" CHECK ("render_job"."format" in ('webm', 'gif', 'mp4')),
	CONSTRAINT "render_job_width_check" CHECK ("render_job"."width" between 1 and 4096),
	CONSTRAINT "render_job_height_check" CHECK ("render_job"."height" between 1 and 4096),
	CONSTRAINT "render_job_fps_check" CHECK ("render_job"."fps" between 1 and 120),
	CONSTRAINT "render_job_duration_check" CHECK ("render_job"."duration_ms" between 1 and 60000)
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"product_key" text NOT NULL,
	"provider_subscription_id" text NOT NULL,
	"status" text NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_provider_subscription_id_unique" UNIQUE("provider_subscription_id"),
	CONSTRAINT "subscription_status_check" CHECK ("subscription"."status" in ('incomplete', 'active', 'past_due', 'canceled', 'revoked'))
);
--> statement-breakpoint
CREATE TABLE "usage_credit_allocation" (
	"usage_operation_id" uuid NOT NULL,
	"credit_grant_id" uuid NOT NULL,
	"units" bigint NOT NULL,
	CONSTRAINT "usage_credit_allocation_usage_operation_id_credit_grant_id_pk" PRIMARY KEY("usage_operation_id","credit_grant_id"),
	CONSTRAINT "usage_credit_allocation_units_check" CHECK ("usage_credit_allocation"."units" > 0)
);
--> statement-breakpoint
CREATE TABLE "usage_operation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"operation_type" text NOT NULL,
	"status" text NOT NULL,
	"units" integer DEFAULT 1 NOT NULL,
	"idempotency_key" text NOT NULL,
	"provider_request_id" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"estimated_cost_micros" bigint,
	"error_code" text,
	"reserved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "usage_operation_type_check" CHECK ("usage_operation"."operation_type" = 'ai_animation'),
	CONSTRAINT "usage_operation_status_check" CHECK ("usage_operation"."status" in ('reserved', 'running', 'succeeded', 'failed', 'released')),
	CONSTRAINT "usage_operation_units_check" CHECK ("usage_operation"."units" > 0)
);
--> statement-breakpoint
CREATE TABLE "webhook_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload_sha256" text NOT NULL,
	"payload" jsonb,
	"status" text DEFAULT 'received' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error_code" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "webhook_event_provider_check" CHECK ("webhook_event"."provider" in ('polar', 'clerk')),
	CONSTRAINT "webhook_event_status_check" CHECK ("webhook_event"."status" in ('received', 'processing', 'processed', 'failed', 'ignored')),
	CONSTRAINT "webhook_event_attempts_check" CHECK ("webhook_event"."attempts" >= 0)
);
--> statement-breakpoint
ALTER TABLE "account_access_snapshot" ADD CONSTRAINT "account_access_snapshot_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_customer" ADD CONSTRAINT "billing_customer_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_order_item" ADD CONSTRAINT "billing_order_item_order_id_billing_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."billing_order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_order_item" ADD CONSTRAINT "billing_order_item_product_key_billing_product_product_key_fk" FOREIGN KEY ("product_key") REFERENCES "public"."billing_product"("product_key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_order" ADD CONSTRAINT "billing_order_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_intent" ADD CONSTRAINT "checkout_intent_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_intent" ADD CONSTRAINT "checkout_intent_product_key_billing_product_product_key_fk" FOREIGN KEY ("product_key") REFERENCES "public"."billing_product"("product_key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_account" ADD CONSTRAINT "credit_account_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_grant" ADD CONSTRAINT "credit_grant_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_credit_grant_id_credit_grant_id_fk" FOREIGN KEY ("credit_grant_id") REFERENCES "public"."credit_grant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlement_grant" ADD CONSTRAINT "entitlement_grant_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_pass" ADD CONSTRAINT "export_pass_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_pass" ADD CONSTRAINT "export_pass_order_id_billing_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."billing_order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "render_job" ADD CONSTRAINT "render_job_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "render_job" ADD CONSTRAINT "render_job_export_pass_id_export_pass_id_fk" FOREIGN KEY ("export_pass_id") REFERENCES "public"."export_pass"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_product_key_billing_product_product_key_fk" FOREIGN KEY ("product_key") REFERENCES "public"."billing_product"("product_key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_credit_allocation" ADD CONSTRAINT "usage_credit_allocation_usage_operation_id_usage_operation_id_fk" FOREIGN KEY ("usage_operation_id") REFERENCES "public"."usage_operation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_credit_allocation" ADD CONSTRAINT "usage_credit_allocation_credit_grant_id_credit_grant_id_fk" FOREIGN KEY ("credit_grant_id") REFERENCES "public"."credit_grant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_operation" ADD CONSTRAINT "usage_operation_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_event_user_created_idx" ON "audit_event" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_order_item_order_product_uidx" ON "billing_order_item" USING btree ("order_id","provider_product_id");--> statement-breakpoint
CREATE INDEX "billing_order_user_created_idx" ON "billing_order" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_intent_user_idempotency_uidx" ON "checkout_intent" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "credit_grant_spendable_idx" ON "credit_grant" USING btree ("user_id","credit_type","expires_at","created_at");--> statement-breakpoint
CREATE INDEX "credit_ledger_user_created_idx" ON "credit_ledger" USING btree ("user_id","credit_type","created_at");--> statement-breakpoint
CREATE INDEX "entitlement_grant_user_feature_idx" ON "entitlement_grant" USING btree ("user_id","feature_key","expires_at");--> statement-breakpoint
CREATE INDEX "export_pass_user_status_idx" ON "export_pass" USING btree ("user_id","pass_type","status","available_until");--> statement-breakpoint
CREATE INDEX "render_job_user_created_idx" ON "render_job" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "render_job_status_created_idx" ON "render_job" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "subscription_user_status_idx" ON "subscription" USING btree ("user_id","status","current_period_end");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_operation_user_idempotency_uidx" ON "usage_operation" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "usage_operation_status_reserved_idx" ON "usage_operation" USING btree ("status","reserved_at");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_event_provider_event_uidx" ON "webhook_event" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "webhook_event_status_received_idx" ON "webhook_event" USING btree ("status","received_at");