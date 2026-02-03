import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Enums ---
export const userRoles = ["customer", "picker", "driver", "owner", "admin"] as const;
export type UserRole = typeof userRoles[number];

export const staffStatuses = ["online", "offline"] as const;
export type StaffStatus = typeof staffStatuses[number];

export const orderStatuses = ["pending", "confirmed", "picking", "packed", "delivering", "delivered", "cancelled"] as const;
export type OrderStatus = typeof orderStatuses[number];

export const paymentMethodTypes = ["midtrans", "cod"] as const;
export type PaymentMethodType = typeof paymentMethodTypes[number];

// ===== PROMOTIONS: Store/Admin Created, User Claims =====
export const promotionTypes = ["percentage", "fixed_amount", "buy_x_get_y", "free_delivery", "bundle"] as const;
export type PromotionType = typeof promotionTypes[number];

export const promotionScopes = ["store", "app"] as const;
export type PromotionScope = typeof promotionScopes[number];

// ===== VOUCHERS: System-Generated, Auto-Assigned =====
export const voucherTypes = ["welcome", "loyalty", "winback", "birthday", "seasonal"] as const;
export type VoucherType = typeof voucherTypes[number];

export const voucherTriggers = ["first_signup", "nth_order", "inactive_period", "high_value_order", "birthday", "special_event"] as const;
export type VoucherTrigger = typeof voucherTriggers[number];

// --- Tables ---

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  phone: text("phone"),
  email: text("email"),
  appleId: text("apple_id"),
  googleId: text("google_id"),
  role: text("role").notNull().default("customer"),
  accountStatus: text("account_status").notNull().default("active"), 
  areaId: integer("area_id"),
  storeId: integer("store_id"),
  pushToken: text("push_token"),
  firstLogin: boolean("first_login").default(true).notNull(),
  isNewUser: boolean("is_new_user").default(true).notNull(),
  firstOrderAt: timestamp("first_order_at"),
  totalOrders: integer("total_orders").default(0).notNull(),
  totalSpent: integer("total_spent").default(0).notNull(),
  lastOrderAt: timestamp("last_order_at"),
  birthdate: timestamp("birthdate"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const otpCodes = pgTable("otp_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  senderId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").default("text").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stores = pgTable("stores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  ownerId: varchar("owner_id").references(() => users.id),
  codAllowed: boolean("cod_allowed").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const storeStaff = pgTable("store_staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  role: text("role").notNull(),
  status: text("status").notNull().default("offline"),
  lastStatusChange: timestamp("last_status_change").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  image: text("image"),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  brand: text("brand").notNull().default("Generic"),
  price: integer("price").notNull(),
  originalPrice: integer("original_price"),
  image: text("image"),
  categoryId: varchar("category_id").notNull().references(() => categories.id),
  description: text("description"),
  nutrition: jsonb("nutrition"),
  isRamadanSpecial: boolean("is_ramadan_special").default(false).notNull(),
  ramadanDiscount: integer("ramadan_discount"),
});

export const storeInventory = pgTable("store_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  stockCount: integer("stock_count").notNull().default(0),
  location: text("location"),
  isAvailable: boolean("is_available").default(true).notNull(),
});

export const addresses = pgTable("addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  label: text("label").notNull(),
  fullAddress: text("full_address").notNull(),
  details: text("details"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
});

export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  userId: varchar("user_id").notNull().references(() => users.id),
  storeId: varchar("store_id").references(() => stores.id),
  pickerId: varchar("picker_id").references(() => users.id),
  driverId: varchar("driver_id").references(() => users.id),
  items: jsonb("items").notNull(),
  status: text("status").notNull().default("pending"),
  total: integer("total").notNull(),
  subtotal: integer("subtotal").notNull(),
  deliveryFee: integer("delivery_fee").notNull().default(10000),
  discount: integer("discount").default(0).notNull(),
  appliedPromotionId: varchar("applied_promotion_id").references(() => promotions.id),
  appliedVoucherId: varchar("applied_voucher_id").references(() => vouchers.id),
  promotionDiscount: integer("promotion_discount").default(0).notNull(),
  voucherDiscount: integer("voucher_discount").default(0).notNull(),
  freeDelivery: boolean("free_delivery").default(false).notNull(),
  addressId: varchar("address_id").references(() => addresses.id),
  paymentMethod: text("payment_method").default("midtrans"),
  paymentStatus: text("payment_status").default("pending"),
  codCollected: boolean("cod_collected").default(false),
  deliveryPin: text("delivery_pin").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  pickedAt: timestamp("picked_at"),
  packedAt: timestamp("packed_at"),
  deliveredAt: timestamp("delivered_at"),
  estimatedDelivery: timestamp("estimated_delivery"),
  customerLat: decimal("customer_lat", { precision: 10, scale: 7 }),
  customerLng: decimal("customer_lng", { precision: 10, scale: 7 }),
  estimatedArrival: timestamp("estimated_arrival"),
  actualDistance: decimal("actual_distance", { precision: 6, scale: 2 }),
  trackingStarted: timestamp("tracking_started"),
});

export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  priceAtEntry: decimal("price_at_entry", { precision: 10, scale: 2 }).notNull(),
  isFreeItem: boolean("is_free_item").default(false).notNull(),
  promotionApplied: text("promotion_applied"),
});

export const driverLocations = pgTable("driver_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull().references(() => users.id),
  orderId: varchar("order_id").references(() => orders.id),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  heading: decimal("heading", { precision: 5, scale: 2 }),
  speed: decimal("speed", { precision: 5, scale: 2 }),
  accuracy: decimal("accuracy", { precision: 6, scale: 2 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// ===== PROMOTIONS: User Claims Once, Then Uses Multiple Times =====
export const promotions = pgTable("promotions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  
  // Discount details
  discountValue: integer("discount_value"),
  maxDiscount: integer("max_discount"),
  minOrder: integer("min_order").default(0).notNull(),
  
  // Buy X Get Y details
  buyQuantity: integer("buy_quantity"),
  getQuantity: integer("get_quantity"),
  applicableProductIds: jsonb("applicable_product_ids"),
  
  // Bundle details
  bundleItems: jsonb("bundle_items"),
  bundlePrice: integer("bundle_price"),
  
  // Store scope
  storeId: varchar("store_id").references(() => stores.id),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  scope: text("scope").default("store").notNull(),
  applicableStoreIds: jsonb("applicable_store_ids"),
  
  // Display
  image: text("image"),
  bannerImage: text("banner_image"),
  icon: text("icon").default("gift"),
  color: text("color").default("#f59e0b"),
  priority: integer("priority").default(0).notNull(),
  
  // Limits - FIXED NAMING
  isActive: boolean("is_active").default(true).notNull(),
  usageLimit: integer("usage_limit"), // Total global limit
  usedCount: integer("used_count").default(0).notNull(),
  userLimit: integer("user_limit").default(1).notNull(), // Per-user limit
  
  // Targeting
  targetUsers: text("target_users").default("all"), // "all", "new_users", "returning_users", "specific_users"
  specificUserIds: jsonb("specific_user_ids"),
  
  // Schedule
  validFrom: timestamp("valid_from").defaultNow().notNull(),
  validUntil: timestamp("valid_until").notNull(),
  
  // Special flags
  isRamadanSpecial: boolean("is_ramadan_special").default(false).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  showInBanner: boolean("show_in_banner").default(false).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== VOUCHERS: System Auto-Generated, Auto-Assigned =====
export const vouchers = pgTable("vouchers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  
  // Voucher type and trigger
  type: text("type").notNull(),
  trigger: text("trigger").notNull(),
  
  // Discount details
  discountType: text("discount_type").notNull(),
  discount: integer("discount").notNull(),
  maxDiscount: integer("max_discount"),
  minOrder: integer("min_order").default(0).notNull(),
  
  // Auto-assignment rules
  autoAssign: boolean("auto_assign").default(true).notNull(),
  assignmentRules: jsonb("assignment_rules"),
  
  // Validity
  validFrom: timestamp("valid_from").defaultNow().notNull(),
  validUntil: timestamp("valid_until").notNull(),
  daysValid: integer("days_valid").default(30).notNull(),
  
  // Usage limits
  usageLimit: integer("usage_limit"), // Total global limit
  usedCount: integer("used_count").default(0).notNull(),
  userLimit: integer("user_limit").default(1).notNull(), // Per-user limit
  
  // Targeting
  targetUsers: text("target_users").default("all"), // "all", "new_users", "returning_users"
  
  // Display
  icon: text("icon").default("gift"),
  color: text("color").default("#10b981"),
  priority: integer("priority").default(0).notNull(),
  
  isActive: boolean("is_active").default(true).notNull(),
  isRamadanSpecial: boolean("is_ramadan_special").default(false).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== USER CLAIMED PROMOTIONS (One-Time Claim) =====
export const userClaimedPromotions = pgTable("user_claimed_promotions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  promotionId: varchar("promotion_id").notNull().references(() => promotions.id),
  claimedAt: timestamp("claimed_at").defaultNow().notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// ===== USER ASSIGNED VOUCHERS (Auto-Assigned) =====
export const userAssignedVouchers = pgTable("user_assigned_vouchers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  voucherId: varchar("voucher_id").notNull().references(() => vouchers.id),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  assignedBy: text("assigned_by").default("system").notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// ===== PROMOTION USAGE TRACKING (Per Order) - RENAMED FOR CLARITY =====
export const promotionUsageLog = pgTable("promotion_usage_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  promotionId: varchar("promotion_id").notNull().references(() => promotions.id),
  claimedPromotionId: varchar("claimed_promotion_id").notNull().references(() => userClaimedPromotions.id),
  orderId: varchar("order_id").references(() => orders.id),
  discountApplied: integer("discount_applied").notNull(),
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

// ✅ ADDED: User Promotion Usage (for quick counting)
export const userPromotionUsage = pgTable("user_promotion_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  promotionId: varchar("promotion_id").notNull().references(() => promotions.id),
  orderId: varchar("order_id").references(() => orders.id),
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

// ===== VOUCHER USAGE TRACKING (Per Order) =====
export const voucherUsageLog = pgTable("voucher_usage_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  voucherId: varchar("voucher_id").notNull().references(() => vouchers.id),
  assignedVoucherId: varchar("assigned_voucher_id").notNull().references(() => userAssignedVouchers.id),
  orderId: varchar("order_id").references(() => orders.id),
  discountApplied: integer("discount_applied").notNull(),
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

// ✅ ADDED: User Voucher Usage (for quick counting)
export const userVoucherUsage = pgTable("user_voucher_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  voucherId: varchar("voucher_id").notNull().references(() => vouchers.id),
  orderId: varchar("order_id").references(() => orders.id),
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

// ===== VOUCHER AUTO-ASSIGNMENT TRIGGERS =====
export const voucherTriggerLog = pgTable("voucher_trigger_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  voucherId: varchar("voucher_id").notNull().references(() => vouchers.id),
  trigger: text("trigger").notNull(),
  triggeredAt: timestamp("triggered_at").defaultNow().notNull(),
  assignedVoucherId: varchar("assigned_voucher_id").references(() => userAssignedVouchers.id),
});

// --- Relations ---

export const messagesRelations = relations(messages, ({ one }) => ({
  order: one(orders, { fields: [messages.orderId], references: [orders.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  cartItems: many(cartItems),
  orders: many(orders, { relationName: "customer_orders" }),
  assignmentsAsPicker: many(orders, { relationName: "picker_orders" }),
  assignmentsAsDriver: many(orders, { relationName: "driver_orders" }),
  storeStaff: many(storeStaff),
  ownedStores: many(stores),
  driverLocations: many(driverLocations),
  claimedPromotions: many(userClaimedPromotions),
  assignedVouchers: many(userAssignedVouchers),
  createdPromotions: many(promotions),
  promotionUsage: many(userPromotionUsage),
  voucherUsage: many(userVoucherUsage),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id], relationName: "customer_orders" }),
  address: one(addresses, { fields: [orders.addressId], references: [addresses.id] }),
  store: one(stores, { fields: [orders.storeId], references: [stores.id] }),
  picker: one(users, { fields: [orders.pickerId], references: [users.id], relationName: "picker_orders" }),
  driver: one(users, { fields: [orders.driverId], references: [users.id], relationName: "driver_orders" }),
  appliedPromotion: one(promotions, { fields: [orders.appliedPromotionId], references: [promotions.id] }),
  appliedVoucher: one(vouchers, { fields: [orders.appliedVoucherId], references: [vouchers.id] }),
  driverLocations: many(driverLocations),
}));

export const promotionsRelations = relations(promotions, ({ one, many }) => ({
  store: one(stores, { fields: [promotions.storeId], references: [stores.id] }),
  creator: one(users, { fields: [promotions.createdBy], references: [users.id] }),
  orders: many(orders),
  claims: many(userClaimedPromotions),
  usageLog: many(promotionUsageLog),
  userUsage: many(userPromotionUsage),
}));

export const vouchersRelations = relations(vouchers, ({ many }) => ({
  orders: many(orders),
  assignments: many(userAssignedVouchers),
  usageLog: many(voucherUsageLog),
  triggerLog: many(voucherTriggerLog),
  userUsage: many(userVoucherUsage),
}));

export const userClaimedPromotionsRelations = relations(userClaimedPromotions, ({ one, many }) => ({
  user: one(users, { fields: [userClaimedPromotions.userId], references: [users.id] }),
  promotion: one(promotions, { fields: [userClaimedPromotions.promotionId], references: [promotions.id] }),
  usageLog: many(promotionUsageLog),
}));

export const userAssignedVouchersRelations = relations(userAssignedVouchers, ({ one, many }) => ({
  user: one(users, { fields: [userAssignedVouchers.userId], references: [users.id] }),
  voucher: one(vouchers, { fields: [userAssignedVouchers.voucherId], references: [vouchers.id] }),
  usageLog: many(voucherUsageLog),
}));

export const driverLocationsRelations = relations(driverLocations, ({ one }) => ({
  driver: one(users, { fields: [driverLocations.driverId], references: [users.id] }),
  order: one(orders, { fields: [driverLocations.orderId], references: [orders.id] }),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
  owner: one(users, { fields: [stores.ownerId], references: [users.id] }),
  staff: many(storeStaff),
  inventory: many(storeInventory),
  orders: many(orders),
  promotions: many(promotions),
}));

export const storeStaffRelations = relations(storeStaff, ({ one }) => ({
  user: one(users, { fields: [storeStaff.userId], references: [users.id] }),
  store: one(stores, { fields: [storeStaff.storeId], references: [stores.id] }),
}));

export const storeInventoryRelations = relations(storeInventory, ({ one }) => ({
  store: one(stores, { fields: [storeInventory.storeId], references: [stores.id] }),
  product: one(products, { fields: [storeInventory.productId], references: [products.id] }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  inventory: many(storeInventory),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, { fields: [addresses.userId], references: [users.id] }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, { fields: [cartItems.userId], references: [users.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
}));

// --- Insert Schemas ---
export const insertUserSchema = createInsertSchema(users);
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertStoreSchema = createInsertSchema(stores).omit({ id: true, createdAt: true });
export const insertStoreStaffSchema = createInsertSchema(storeStaff).omit({ id: true, createdAt: true, lastStatusChange: true });
export const insertStoreInventorySchema = createInsertSchema(storeInventory).omit({ id: true });
export const insertCategorySchema = createInsertSchema(categories).pick({ name: true, icon: true, color: true, image: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertAddressSchema = createInsertSchema(addresses).omit({ id: true });
export const insertCartItemSchema = createInsertSchema(cartItems).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertVoucherSchema = createInsertSchema(vouchers).omit({ id: true, createdAt: true, usedCount: true });
export const insertPromotionSchema = createInsertSchema(promotions).omit({ id: true, createdAt: true, usedCount: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertDriverLocationSchema = createInsertSchema(driverLocations).omit({ id: true, timestamp: true });
export const insertUserClaimedPromotionSchema = createInsertSchema(userClaimedPromotions).omit({ id: true, claimedAt: true });
export const insertUserAssignedVoucherSchema = createInsertSchema(userAssignedVouchers).omit({ id: true, assignedAt: true });

// --- Type Exports ---
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type StoreStaff = typeof storeStaff.$inferSelect;
export type InsertStoreStaff = z.infer<typeof insertStoreStaffSchema>;
export type StoreInventory = typeof storeInventory.$inferSelect;
export type InsertStoreInventory = z.infer<typeof insertStoreInventorySchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Address = typeof addresses.$inferSelect;
export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type Voucher = typeof vouchers.$inferSelect;
export type InsertVoucher = z.infer<typeof insertVoucherSchema>;
export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;
export type UserClaimedPromotion = typeof userClaimedPromotions.$inferSelect;
export type InsertUserClaimedPromotion = z.infer<typeof insertUserClaimedPromotionSchema>;
export type UserAssignedVoucher = typeof userAssignedVouchers.$inferSelect;
export type InsertUserAssignedVoucher = z.infer<typeof insertUserAssignedVoucherSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type DriverLocation = typeof driverLocations.$inferSelect;
export type InsertDriverLocation = z.infer<typeof insertDriverLocationSchema>;
export type PromotionUsageLog = typeof promotionUsageLog.$inferSelect;
export type VoucherUsageLog = typeof voucherUsageLog.$inferSelect;
export type VoucherTriggerLog = typeof voucherTriggerLog.$inferSelect;
export type UserPromotionUsage = typeof userPromotionUsage.$inferSelect;
export type UserVoucherUsage = typeof userVoucherUsage.$inferSelect;