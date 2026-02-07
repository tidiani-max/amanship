CREATE TABLE "admin_financials" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"total_revenue" numeric(12, 2) DEFAULT '0' NOT NULL,
	"product_revenue" numeric(12, 2) DEFAULT '0' NOT NULL,
	"delivery_revenue" numeric(12, 2) DEFAULT '0' NOT NULL,
	"product_costs" numeric(12, 2) DEFAULT '0' NOT NULL,
	"staff_bonuses" numeric(12, 2) DEFAULT '0' NOT NULL,
	"admin_promotion_costs" numeric(12, 2) DEFAULT '0' NOT NULL,
	"voucher_costs" numeric(12, 2) DEFAULT '0' NOT NULL,
	"gross_profit" numeric(12, 2) DEFAULT '0' NOT NULL,
	"net_profit" numeric(12, 2) DEFAULT '0' NOT NULL,
	"target_profit" numeric(12, 2) DEFAULT '50000000' NOT NULL,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_freshness" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"product_id" varchar(255) NOT NULL,
	"is_fresh" boolean DEFAULT false NOT NULL,
	"expiry_date" timestamp,
	"shelf_life" integer,
	"temperature_min" numeric(4, 1),
	"temperature_max" numeric(4, 1),
	"requires_refrigeration" boolean DEFAULT false NOT NULL,
	"requires_freezer" boolean DEFAULT false NOT NULL,
	"special_packaging" text,
	"handling_instructions" text,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_freshness_product_id_unique" UNIQUE("product_id")
);
--> statement-breakpoint
CREATE TABLE "promotion_cost_log" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"promotion_id" varchar(255) NOT NULL,
	"order_id" varchar(255) NOT NULL,
	"store_id" varchar(255),
	"discount_amount" integer NOT NULL,
	"cost_bearer" text NOT NULL,
	"order_total" integer NOT NULL,
	"product_cost" integer NOT NULL,
	"applied_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_owner_daily_earnings" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"store_owner_id" varchar(255) NOT NULL,
	"store_id" varchar(255) NOT NULL,
	"date" timestamp NOT NULL,
	"total_revenue" numeric(12, 2) DEFAULT '0' NOT NULL,
	"product_costs" numeric(12, 2) DEFAULT '0' NOT NULL,
	"delivery_revenue" numeric(12, 2) DEFAULT '0' NOT NULL,
	"store_promo_costs" numeric(12, 2) DEFAULT '0' NOT NULL,
	"staff_bonuses" numeric(12, 2) DEFAULT '0' NOT NULL,
	"gross_profit" numeric(12, 2) DEFAULT '0' NOT NULL,
	"net_profit" numeric(12, 2) DEFAULT '0' NOT NULL,
	"orders_completed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_owners" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"store_id" varchar(255) NOT NULL,
	"commission_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"onboarded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "store_owners_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "store_owners_store_id_unique" UNIQUE("store_id")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "qris_confirmed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "promotion_creator" varchar(255);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "promotion_scope" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_fresh" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "expiry_date" timestamp;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "shelf_life" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "temperature_min" numeric(4, 1);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "temperature_max" numeric(4, 1);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "requires_refrigeration" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "requires_freezer" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "special_packaging" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "handling_instructions" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "freshness_priority" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "total_cost_incurred" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "total_revenue_generated" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "last_used_at" timestamp;--> statement-breakpoint
ALTER TABLE "store_daily_financials" ADD COLUMN "admin_promotion_discounts" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "store_daily_financials" ADD COLUMN "store_promotion_discounts" numeric(12, 2) DEFAULT '0' NOT NULL;