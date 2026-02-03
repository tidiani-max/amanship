CREATE TABLE "driver_locations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" varchar NOT NULL,
	"order_id" varchar,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"heading" numeric(5, 2),
	"speed" numeric(5, 2),
	"accuracy" numeric(6, 2),
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_usage_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"promotion_id" varchar NOT NULL,
	"claimed_promotion_id" varchar NOT NULL,
	"order_id" varchar,
	"discount_applied" integer NOT NULL,
	"used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"discount_value" integer,
	"max_discount" integer,
	"min_order" integer DEFAULT 0 NOT NULL,
	"buy_quantity" integer,
	"get_quantity" integer,
	"applicable_product_ids" jsonb,
	"bundle_items" jsonb,
	"bundle_price" integer,
	"store_id" varchar,
	"created_by" varchar NOT NULL,
	"scope" text DEFAULT 'store' NOT NULL,
	"applicable_store_ids" jsonb,
	"image" text,
	"banner_image" text,
	"icon" text DEFAULT 'gift',
	"color" text DEFAULT '#f59e0b',
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"usage_limit" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"user_limit" integer DEFAULT 1 NOT NULL,
	"target_users" text DEFAULT 'all',
	"specific_user_ids" jsonb,
	"valid_from" timestamp DEFAULT now() NOT NULL,
	"valid_until" timestamp NOT NULL,
	"is_ramadan_special" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"show_in_banner" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_assigned_vouchers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"voucher_id" varchar NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by" text DEFAULT 'system' NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_claimed_promotions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"promotion_id" varchar NOT NULL,
	"claimed_at" timestamp DEFAULT now() NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_promotion_usage" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"promotion_id" varchar NOT NULL,
	"order_id" varchar,
	"used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_voucher_usage" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"voucher_id" varchar NOT NULL,
	"order_id" varchar,
	"used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voucher_trigger_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"voucher_id" varchar NOT NULL,
	"trigger" text NOT NULL,
	"triggered_at" timestamp DEFAULT now() NOT NULL,
	"assigned_voucher_id" varchar
);
--> statement-breakpoint
CREATE TABLE "voucher_usage_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"voucher_id" varchar NOT NULL,
	"assigned_voucher_id" varchar NOT NULL,
	"order_id" varchar,
	"discount_applied" integer NOT NULL,
	"used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vouchers" ALTER COLUMN "description" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "is_free_item" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "promotion_applied" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "subtotal" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "applied_promotion_id" varchar;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "applied_voucher_id" varchar;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "promotion_discount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "voucher_discount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "free_delivery" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "estimated_arrival" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "actual_distance" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_started" timestamp;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_ramadan_special" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "ramadan_discount" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "first_login" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_new_user" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "first_order_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "total_orders" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "total_spent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_order_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "birthdate" timestamp;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "trigger" text NOT NULL;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "max_discount" integer;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "auto_assign" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "assignment_rules" jsonb;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "valid_from" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "days_valid" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "usage_limit" integer;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "used_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "user_limit" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "target_users" text DEFAULT 'all';--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "icon" text DEFAULT 'gift';--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "color" text DEFAULT '#10b981';--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "priority" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "is_ramadan_special" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "driver_locations" ADD CONSTRAINT "driver_locations_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_locations" ADD CONSTRAINT "driver_locations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_usage_log" ADD CONSTRAINT "promotion_usage_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_usage_log" ADD CONSTRAINT "promotion_usage_log_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_usage_log" ADD CONSTRAINT "promotion_usage_log_claimed_promotion_id_user_claimed_promotions_id_fk" FOREIGN KEY ("claimed_promotion_id") REFERENCES "public"."user_claimed_promotions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_usage_log" ADD CONSTRAINT "promotion_usage_log_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_assigned_vouchers" ADD CONSTRAINT "user_assigned_vouchers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_assigned_vouchers" ADD CONSTRAINT "user_assigned_vouchers_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_claimed_promotions" ADD CONSTRAINT "user_claimed_promotions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_claimed_promotions" ADD CONSTRAINT "user_claimed_promotions_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_promotion_usage" ADD CONSTRAINT "user_promotion_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_promotion_usage" ADD CONSTRAINT "user_promotion_usage_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_promotion_usage" ADD CONSTRAINT "user_promotion_usage_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_voucher_usage" ADD CONSTRAINT "user_voucher_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_voucher_usage" ADD CONSTRAINT "user_voucher_usage_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_voucher_usage" ADD CONSTRAINT "user_voucher_usage_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_trigger_log" ADD CONSTRAINT "voucher_trigger_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_trigger_log" ADD CONSTRAINT "voucher_trigger_log_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_trigger_log" ADD CONSTRAINT "voucher_trigger_log_assigned_voucher_id_user_assigned_vouchers_id_fk" FOREIGN KEY ("assigned_voucher_id") REFERENCES "public"."user_assigned_vouchers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_usage_log" ADD CONSTRAINT "voucher_usage_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_usage_log" ADD CONSTRAINT "voucher_usage_log_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_usage_log" ADD CONSTRAINT "voucher_usage_log_assigned_voucher_id_user_assigned_vouchers_id_fk" FOREIGN KEY ("assigned_voucher_id") REFERENCES "public"."user_assigned_vouchers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_usage_log" ADD CONSTRAINT "voucher_usage_log_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_applied_promotion_id_promotions_id_fk" FOREIGN KEY ("applied_promotion_id") REFERENCES "public"."promotions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_applied_voucher_id_vouchers_id_fk" FOREIGN KEY ("applied_voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE no action ON UPDATE no action;