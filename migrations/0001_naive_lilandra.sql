ALTER TABLE "orders" ADD COLUMN "delivery_pin" text NOT NULL;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "in_stock";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "stock_count";