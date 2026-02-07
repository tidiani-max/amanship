import { pgTable, foreignKey, varchar, integer, text, jsonb, boolean, numeric, timestamp, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const cartItems = pgTable("cart_items", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	productId: varchar("product_id").notNull(),
	quantity: integer().default(1).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "cart_items_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "cart_items_product_id_products_id_fk"
		}),
]);

export const products = pgTable("products", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	brand: text().default('Generic').notNull(),
	price: integer().notNull(),
	originalPrice: integer("original_price"),
	image: text(),
	categoryId: varchar("category_id").notNull(),
	description: text(),
	nutrition: jsonb(),
	isRamadanSpecial: boolean("is_ramadan_special").default(false).notNull(),
	ramadanDiscount: integer("ramadan_discount"),
}, (table) => [
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "products_category_id_categories_id_fk"
		}),
]);

export const stores = pgTable("stores", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	address: text().notNull(),
	latitude: numeric({ precision: 10, scale:  7 }).notNull(),
	longitude: numeric({ precision: 10, scale:  7 }).notNull(),
	ownerId: varchar("owner_id"),
	codAllowed: boolean("cod_allowed").default(true).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [users.id],
			name: "stores_owner_id_users_id_fk"
		}),
]);

export const otpCodes = pgTable("otp_codes", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	phone: text().notNull(),
	code: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	verified: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const orders = pgTable("orders", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	orderNumber: text("order_number").notNull(),
	userId: varchar("user_id").notNull(),
	storeId: varchar("store_id"),
	pickerId: varchar("picker_id"),
	driverId: varchar("driver_id"),
	items: jsonb().notNull(),
	status: text().default('pending').notNull(),
	total: integer().notNull(),
	deliveryFee: integer("delivery_fee").default(10000).notNull(),
	addressId: varchar("address_id"),
	paymentMethod: text("payment_method").default('midtrans'),
	paymentStatus: text("payment_status").default('pending'),
	codCollected: boolean("cod_collected").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	pickedAt: timestamp("picked_at", { mode: 'string' }),
	packedAt: timestamp("packed_at", { mode: 'string' }),
	deliveredAt: timestamp("delivered_at", { mode: 'string' }),
	estimatedDelivery: timestamp("estimated_delivery", { mode: 'string' }),
	customerLat: numeric("customer_lat", { precision: 10, scale:  7 }),
	customerLng: numeric("customer_lng", { precision: 10, scale:  7 }),
	deliveryPin: text("delivery_pin").notNull(),
	subtotal: integer().notNull(),
	discount: integer().default(0).notNull(),
	appliedPromotionId: varchar("applied_promotion_id"),
	appliedVoucherId: varchar("applied_voucher_id"),
	promotionDiscount: integer("promotion_discount").default(0).notNull(),
	voucherDiscount: integer("voucher_discount").default(0).notNull(),
	freeDelivery: boolean("free_delivery").default(false).notNull(),
	estimatedArrival: timestamp("estimated_arrival", { mode: 'string' }),
	actualDistance: numeric("actual_distance", { precision: 6, scale:  2 }),
	trackingStarted: timestamp("tracking_started", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "orders_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.pickerId],
			foreignColumns: [users.id],
			name: "orders_picker_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.driverId],
			foreignColumns: [users.id],
			name: "orders_driver_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.addressId],
			foreignColumns: [addresses.id],
			name: "orders_address_id_addresses_id_fk"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "orders_store_id_stores_id_fk"
		}),
	foreignKey({
			columns: [table.appliedPromotionId],
			foreignColumns: [promotions.id],
			name: "orders_applied_promotion_id_promotions_id_fk"
		}),
	foreignKey({
			columns: [table.appliedVoucherId],
			foreignColumns: [vouchers.id],
			name: "orders_applied_voucher_id_vouchers_id_fk"
		}),
	unique("orders_order_number_unique").on(table.orderNumber),
]);

export const storeStaff = pgTable("store_staff", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	storeId: varchar("store_id").notNull(),
	role: text().notNull(),
	status: text().default('offline').notNull(),
	lastStatusChange: timestamp("last_status_change", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "store_staff_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "store_staff_store_id_stores_id_fk"
		}),
]);

export const storeInventory = pgTable("store_inventory", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	storeId: varchar("store_id").notNull(),
	productId: varchar("product_id").notNull(),
	stockCount: integer("stock_count").default(0).notNull(),
	isAvailable: boolean("is_available").default(true).notNull(),
	location: text(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "store_inventory_product_id_products_id_fk"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "store_inventory_store_id_stores_id_fk"
		}),
]);

export const categories = pgTable("categories", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	icon: text().notNull(),
	color: text().notNull(),
	image: text(),
});

export const users = pgTable("users", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	username: text().notNull(),
	password: text().notNull(),
	phone: text(),
	email: text(),
	appleId: text("apple_id"),
	googleId: text("google_id"),
	role: text().default('customer').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	areaId: integer("area_id"),
	storeId: integer("store_id"),
	name: text(),
	pushToken: text("push_token"),
	accountStatus: text("account_status").default('active').notNull(),
	firstLogin: boolean("first_login").default(true).notNull(),
	isNewUser: boolean("is_new_user").default(true).notNull(),
	firstOrderAt: timestamp("first_order_at", { mode: 'string' }),
	totalOrders: integer("total_orders").default(0).notNull(),
	totalSpent: integer("total_spent").default(0).notNull(),
	lastOrderAt: timestamp("last_order_at", { mode: 'string' }),
	birthdate: timestamp({ mode: 'string' }),
}, (table) => [
	unique("users_username_unique").on(table.username),
]);

export const addresses = pgTable("addresses", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	label: text().notNull(),
	fullAddress: text("full_address").notNull(),
	details: text(),
	isDefault: boolean("is_default").default(false).notNull(),
	latitude: numeric({ precision: 10, scale:  7 }).notNull(),
	longitude: numeric({ precision: 10, scale:  7 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "addresses_user_id_users_id_fk"
		}),
]);

export const vouchers = pgTable("vouchers", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	code: text().notNull(),
	discount: integer().notNull(),
	discountType: text("discount_type").notNull(),
	minOrder: integer("min_order").default(0).notNull(),
	validUntil: timestamp("valid_until", { mode: 'string' }).notNull(),
	description: text().notNull(),
	title: text().notNull(),
	type: text().notNull(),
	trigger: text().notNull(),
	maxDiscount: integer("max_discount"),
	autoAssign: boolean("auto_assign").default(true).notNull(),
	assignmentRules: jsonb("assignment_rules"),
	validFrom: timestamp("valid_from", { mode: 'string' }).defaultNow().notNull(),
	daysValid: integer("days_valid").default(30).notNull(),
	usageLimit: integer("usage_limit"),
	usedCount: integer("used_count").default(0).notNull(),
	userLimit: integer("user_limit").default(1).notNull(),
	targetUsers: text("target_users").default('all'),
	icon: text().default('gift'),
	color: text().default('#10b981'),
	priority: integer().default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	isRamadanSpecial: boolean("is_ramadan_special").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("vouchers_code_unique").on(table.code),
]);

export const promotions = pgTable("promotions", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	type: text().notNull(),
	discountValue: integer("discount_value"),
	maxDiscount: integer("max_discount"),
	minOrder: integer("min_order").default(0).notNull(),
	buyQuantity: integer("buy_quantity"),
	getQuantity: integer("get_quantity"),
	applicableProductIds: jsonb("applicable_product_ids"),
	bundleItems: jsonb("bundle_items"),
	bundlePrice: integer("bundle_price"),
	storeId: varchar("store_id"),
	createdBy: varchar("created_by").notNull(),
	scope: text().default('store').notNull(),
	applicableStoreIds: jsonb("applicable_store_ids"),
	image: text(),
	bannerImage: text("banner_image"),
	icon: text().default('gift'),
	color: text().default('#f59e0b'),
	priority: integer().default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	usageLimit: integer("usage_limit"),
	usedCount: integer("used_count").default(0).notNull(),
	userLimit: integer("user_limit").default(1).notNull(),
	targetUsers: text("target_users").default('all'),
	specificUserIds: jsonb("specific_user_ids"),
	validFrom: timestamp("valid_from", { mode: 'string' }).defaultNow().notNull(),
	validUntil: timestamp("valid_until", { mode: 'string' }).notNull(),
	isRamadanSpecial: boolean("is_ramadan_special").default(false).notNull(),
	isFeatured: boolean("is_featured").default(false).notNull(),
	showInBanner: boolean("show_in_banner").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "promotions_store_id_stores_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "promotions_created_by_users_id_fk"
		}),
]);

export const promotionUsageLog = pgTable("promotion_usage_log", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	promotionId: varchar("promotion_id").notNull(),
	claimedPromotionId: varchar("claimed_promotion_id").notNull(),
	orderId: varchar("order_id"),
	discountApplied: integer("discount_applied").notNull(),
	usedAt: timestamp("used_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "promotion_usage_log_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.promotionId],
			foreignColumns: [promotions.id],
			name: "promotion_usage_log_promotion_id_promotions_id_fk"
		}),
	foreignKey({
			columns: [table.claimedPromotionId],
			foreignColumns: [userClaimedPromotions.id],
			name: "promotion_usage_log_claimed_promotion_id_user_claimed_promotion"
		}),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "promotion_usage_log_order_id_orders_id_fk"
		}),
]);

export const driverLocations = pgTable("driver_locations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	driverId: varchar("driver_id").notNull(),
	orderId: varchar("order_id"),
	latitude: numeric({ precision: 10, scale:  7 }).notNull(),
	longitude: numeric({ precision: 10, scale:  7 }).notNull(),
	heading: numeric({ precision: 5, scale:  2 }),
	speed: numeric({ precision: 5, scale:  2 }),
	accuracy: numeric({ precision: 6, scale:  2 }),
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.driverId],
			foreignColumns: [users.id],
			name: "driver_locations_driver_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "driver_locations_order_id_orders_id_fk"
		}),
]);

export const voucherUsageLog = pgTable("voucher_usage_log", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	voucherId: varchar("voucher_id").notNull(),
	assignedVoucherId: varchar("assigned_voucher_id").notNull(),
	orderId: varchar("order_id"),
	discountApplied: integer("discount_applied").notNull(),
	usedAt: timestamp("used_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "voucher_usage_log_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.voucherId],
			foreignColumns: [vouchers.id],
			name: "voucher_usage_log_voucher_id_vouchers_id_fk"
		}),
	foreignKey({
			columns: [table.assignedVoucherId],
			foreignColumns: [userAssignedVouchers.id],
			name: "voucher_usage_log_assigned_voucher_id_user_assigned_vouchers_id"
		}),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "voucher_usage_log_order_id_orders_id_fk"
		}),
]);

export const messages = pgTable("messages", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	orderId: varchar("order_id").notNull(),
	userId: varchar("user_id").notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	type: varchar().default('text').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "messages_order_id_orders_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "messages_user_id_users_id_fk"
		}),
]);

export const userPromotionUsage = pgTable("user_promotion_usage", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	promotionId: varchar("promotion_id").notNull(),
	orderId: varchar("order_id"),
	usedAt: timestamp("used_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_promotion_usage_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.promotionId],
			foreignColumns: [promotions.id],
			name: "user_promotion_usage_promotion_id_promotions_id_fk"
		}),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "user_promotion_usage_order_id_orders_id_fk"
		}),
]);

export const voucherTriggerLog = pgTable("voucher_trigger_log", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	voucherId: varchar("voucher_id").notNull(),
	trigger: text().notNull(),
	triggeredAt: timestamp("triggered_at", { mode: 'string' }).defaultNow().notNull(),
	assignedVoucherId: varchar("assigned_voucher_id"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "voucher_trigger_log_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.voucherId],
			foreignColumns: [vouchers.id],
			name: "voucher_trigger_log_voucher_id_vouchers_id_fk"
		}),
	foreignKey({
			columns: [table.assignedVoucherId],
			foreignColumns: [userAssignedVouchers.id],
			name: "voucher_trigger_log_assigned_voucher_id_user_assigned_vouchers_"
		}),
]);

export const userAssignedVouchers = pgTable("user_assigned_vouchers", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	voucherId: varchar("voucher_id").notNull(),
	assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow().notNull(),
	assignedBy: text("assigned_by").default('system').notNull(),
	usageCount: integer("usage_count").default(0).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_assigned_vouchers_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.voucherId],
			foreignColumns: [vouchers.id],
			name: "user_assigned_vouchers_voucher_id_vouchers_id_fk"
		}),
]);

export const orderItems = pgTable("order_items", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	orderId: varchar("order_id").notNull(),
	productId: varchar("product_id").notNull(),
	quantity: integer().notNull(),
	priceAtEntry: numeric("price_at_entry", { precision: 10, scale:  2 }).notNull(),
	isFreeItem: boolean("is_free_item").default(false).notNull(),
	promotionApplied: text("promotion_applied"),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_items_order_id_orders_id_fk"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "order_items_product_id_products_id_fk"
		}),
]);

export const userClaimedPromotions = pgTable("user_claimed_promotions", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	promotionId: varchar("promotion_id").notNull(),
	claimedAt: timestamp("claimed_at", { mode: 'string' }).defaultNow().notNull(),
	usageCount: integer("usage_count").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_claimed_promotions_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.promotionId],
			foreignColumns: [promotions.id],
			name: "user_claimed_promotions_promotion_id_promotions_id_fk"
		}),
]);

export const userVoucherUsage = pgTable("user_voucher_usage", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	voucherId: varchar("voucher_id").notNull(),
	orderId: varchar("order_id"),
	usedAt: timestamp("used_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_voucher_usage_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.voucherId],
			foreignColumns: [vouchers.id],
			name: "user_voucher_usage_voucher_id_vouchers_id_fk"
		}),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "user_voucher_usage_order_id_orders_id_fk"
		}),
]);

function gen_random_uuid(): string | import("drizzle-orm").SQL<unknown> {
	throw new Error("Function not implemented.");
}
