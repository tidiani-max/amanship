import { relations } from "drizzle-orm/relations";
import { users, cartItems, products, categories, stores, orders, addresses, promotions, vouchers, storeStaff, storeInventory, promotionUsageLog, userClaimedPromotions, driverLocations, voucherUsageLog, userAssignedVouchers, messages, userPromotionUsage, voucherTriggerLog, orderItems, userVoucherUsage } from "./schema";

export const cartItemsRelations = relations(cartItems, ({one}) => ({
	user: one(users, {
		fields: [cartItems.userId],
		references: [users.id]
	}),
	product: one(products, {
		fields: [cartItems.productId],
		references: [products.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	cartItems: many(cartItems),
	stores: many(stores),
	orders_userId: many(orders, {
		relationName: "orders_userId_users_id"
	}),
	orders_pickerId: many(orders, {
		relationName: "orders_pickerId_users_id"
	}),
	orders_driverId: many(orders, {
		relationName: "orders_driverId_users_id"
	}),
	storeStaffs: many(storeStaff),
	addresses: many(addresses),
	promotions: many(promotions),
	promotionUsageLogs: many(promotionUsageLog),
	driverLocations: many(driverLocations),
	voucherUsageLogs: many(voucherUsageLog),
	messages: many(messages),
	userPromotionUsages: many(userPromotionUsage),
	voucherTriggerLogs: many(voucherTriggerLog),
	userAssignedVouchers: many(userAssignedVouchers),
	userClaimedPromotions: many(userClaimedPromotions),
	userVoucherUsages: many(userVoucherUsage),
}));

export const productsRelations = relations(products, ({one, many}) => ({
	cartItems: many(cartItems),
	category: one(categories, {
		fields: [products.categoryId],
		references: [categories.id]
	}),
	storeInventories: many(storeInventory),
	orderItems: many(orderItems),
}));

export const categoriesRelations = relations(categories, ({many}) => ({
	products: many(products),
}));

export const storesRelations = relations(stores, ({one, many}) => ({
	user: one(users, {
		fields: [stores.ownerId],
		references: [users.id]
	}),
	orders: many(orders),
	storeStaffs: many(storeStaff),
	storeInventories: many(storeInventory),
	promotions: many(promotions),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	user_userId: one(users, {
		fields: [orders.userId],
		references: [users.id],
		relationName: "orders_userId_users_id"
	}),
	user_pickerId: one(users, {
		fields: [orders.pickerId],
		references: [users.id],
		relationName: "orders_pickerId_users_id"
	}),
	user_driverId: one(users, {
		fields: [orders.driverId],
		references: [users.id],
		relationName: "orders_driverId_users_id"
	}),
	address: one(addresses, {
		fields: [orders.addressId],
		references: [addresses.id]
	}),
	store: one(stores, {
		fields: [orders.storeId],
		references: [stores.id]
	}),
	promotion: one(promotions, {
		fields: [orders.appliedPromotionId],
		references: [promotions.id]
	}),
	voucher: one(vouchers, {
		fields: [orders.appliedVoucherId],
		references: [vouchers.id]
	}),
	promotionUsageLogs: many(promotionUsageLog),
	driverLocations: many(driverLocations),
	voucherUsageLogs: many(voucherUsageLog),
	messages: many(messages),
	userPromotionUsages: many(userPromotionUsage),
	orderItems: many(orderItems),
	userVoucherUsages: many(userVoucherUsage),
}));

export const addressesRelations = relations(addresses, ({one, many}) => ({
	orders: many(orders),
	user: one(users, {
		fields: [addresses.userId],
		references: [users.id]
	}),
}));

export const promotionsRelations = relations(promotions, ({one, many}) => ({
	orders: many(orders),
	store: one(stores, {
		fields: [promotions.storeId],
		references: [stores.id]
	}),
	user: one(users, {
		fields: [promotions.createdBy],
		references: [users.id]
	}),
	promotionUsageLogs: many(promotionUsageLog),
	userPromotionUsages: many(userPromotionUsage),
	userClaimedPromotions: many(userClaimedPromotions),
}));

export const vouchersRelations = relations(vouchers, ({many}) => ({
	orders: many(orders),
	voucherUsageLogs: many(voucherUsageLog),
	voucherTriggerLogs: many(voucherTriggerLog),
	userAssignedVouchers: many(userAssignedVouchers),
	userVoucherUsages: many(userVoucherUsage),
}));

export const storeStaffRelations = relations(storeStaff, ({one}) => ({
	user: one(users, {
		fields: [storeStaff.userId],
		references: [users.id]
	}),
	store: one(stores, {
		fields: [storeStaff.storeId],
		references: [stores.id]
	}),
}));

export const storeInventoryRelations = relations(storeInventory, ({one}) => ({
	product: one(products, {
		fields: [storeInventory.productId],
		references: [products.id]
	}),
	store: one(stores, {
		fields: [storeInventory.storeId],
		references: [stores.id]
	}),
}));

export const promotionUsageLogRelations = relations(promotionUsageLog, ({one}) => ({
	user: one(users, {
		fields: [promotionUsageLog.userId],
		references: [users.id]
	}),
	promotion: one(promotions, {
		fields: [promotionUsageLog.promotionId],
		references: [promotions.id]
	}),
	userClaimedPromotion: one(userClaimedPromotions, {
		fields: [promotionUsageLog.claimedPromotionId],
		references: [userClaimedPromotions.id]
	}),
	order: one(orders, {
		fields: [promotionUsageLog.orderId],
		references: [orders.id]
	}),
}));

export const userClaimedPromotionsRelations = relations(userClaimedPromotions, ({one, many}) => ({
	promotionUsageLogs: many(promotionUsageLog),
	user: one(users, {
		fields: [userClaimedPromotions.userId],
		references: [users.id]
	}),
	promotion: one(promotions, {
		fields: [userClaimedPromotions.promotionId],
		references: [promotions.id]
	}),
}));

export const driverLocationsRelations = relations(driverLocations, ({one}) => ({
	user: one(users, {
		fields: [driverLocations.driverId],
		references: [users.id]
	}),
	order: one(orders, {
		fields: [driverLocations.orderId],
		references: [orders.id]
	}),
}));

export const voucherUsageLogRelations = relations(voucherUsageLog, ({one}) => ({
	user: one(users, {
		fields: [voucherUsageLog.userId],
		references: [users.id]
	}),
	voucher: one(vouchers, {
		fields: [voucherUsageLog.voucherId],
		references: [vouchers.id]
	}),
	userAssignedVoucher: one(userAssignedVouchers, {
		fields: [voucherUsageLog.assignedVoucherId],
		references: [userAssignedVouchers.id]
	}),
	order: one(orders, {
		fields: [voucherUsageLog.orderId],
		references: [orders.id]
	}),
}));

export const userAssignedVouchersRelations = relations(userAssignedVouchers, ({one, many}) => ({
	voucherUsageLogs: many(voucherUsageLog),
	voucherTriggerLogs: many(voucherTriggerLog),
	user: one(users, {
		fields: [userAssignedVouchers.userId],
		references: [users.id]
	}),
	voucher: one(vouchers, {
		fields: [userAssignedVouchers.voucherId],
		references: [vouchers.id]
	}),
}));

export const messagesRelations = relations(messages, ({one}) => ({
	order: one(orders, {
		fields: [messages.orderId],
		references: [orders.id]
	}),
	user: one(users, {
		fields: [messages.userId],
		references: [users.id]
	}),
}));

export const userPromotionUsageRelations = relations(userPromotionUsage, ({one}) => ({
	user: one(users, {
		fields: [userPromotionUsage.userId],
		references: [users.id]
	}),
	promotion: one(promotions, {
		fields: [userPromotionUsage.promotionId],
		references: [promotions.id]
	}),
	order: one(orders, {
		fields: [userPromotionUsage.orderId],
		references: [orders.id]
	}),
}));

export const voucherTriggerLogRelations = relations(voucherTriggerLog, ({one}) => ({
	user: one(users, {
		fields: [voucherTriggerLog.userId],
		references: [users.id]
	}),
	voucher: one(vouchers, {
		fields: [voucherTriggerLog.voucherId],
		references: [vouchers.id]
	}),
	userAssignedVoucher: one(userAssignedVouchers, {
		fields: [voucherTriggerLog.assignedVoucherId],
		references: [userAssignedVouchers.id]
	}),
}));

export const orderItemsRelations = relations(orderItems, ({one}) => ({
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id]
	}),
	product: one(products, {
		fields: [orderItems.productId],
		references: [products.id]
	}),
}));

export const userVoucherUsageRelations = relations(userVoucherUsage, ({one}) => ({
	user: one(users, {
		fields: [userVoucherUsage.userId],
		references: [users.id]
	}),
	voucher: one(vouchers, {
		fields: [userVoucherUsage.voucherId],
		references: [vouchers.id]
	}),
	order: one(orders, {
		fields: [userVoucherUsage.orderId],
		references: [orders.id]
	}),
}));