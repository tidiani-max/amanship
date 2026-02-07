import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Enums ---
export const userRoles = ["customer", "picker", "driver", "owner", "store_owner", "admin"] as const;
export type UserRole = typeof userRoles[number];

export const staffStatuses = ["online", "offline"] as const;
export type StaffStatus = typeof staffStatuses[number];

export const orderStatuses = ["pending", "confirmed", "picking", "packed", "delivering", "delivered", "cancelled"] as const;
export type OrderStatus = typeof orderStatuses[number];

export const paymentMethodTypes = ["midtrans", "cod"] as const;
export type PaymentMethodType = typeof paymentMethodTypes[number];

export const promotionTypes = ["percentage", "fixed_amount", "buy_x_get_y", "free_delivery", "bundle"] as const;
export type PromotionType = typeof promotionTypes[number];

export const promotionScopes = ["store", "app"] as const;
export type PromotionScope = typeof promotionScopes[number];

export const voucherTypes = ["welcome", "loyalty", "winback", "birthday", "seasonal"] as const;
export type VoucherType = typeof voucherTypes[number];

export const voucherTriggers = ["first_signup", "nth_order", "inactive_period", "high_value_order", "birthday", "special_event"] as const;
export type VoucherTrigger = typeof voucherTriggers[number];

// --- Tables ---

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
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
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: varchar("order_id", { length: 255 }).notNull(),
  senderId: varchar("user_id", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).default("text").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stores = pgTable("stores", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  address: text("address").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  ownerId: varchar("owner_id", { length: 255 }),
  codAllowed: boolean("cod_allowed").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const storeStaff = pgTable("store_staff", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 255 }).notNull(),
  storeId: varchar("store_id", { length: 255 }).notNull(),
  role: text("role").notNull(),
  status: text("status").notNull().default("offline"),
  lastStatusChange: timestamp("last_status_change").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  image: text("image"),
});

export const products = pgTable("products", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  brand: text("brand").notNull().default("Generic"),
  
  // ✅ CRITICAL: costPrice is now REQUIRED
  costPrice: integer("cost_price").notNull(), 
  
  // ✅ Price will be auto-calculated by database trigger
  // BUT we keep it as required in schema because it will always have a value
  price: integer("price").notNull(),  
  // ✅ Margin defaults to 15% but can be customized per product
  margin: decimal("margin", { precision: 5, scale: 2 }).default("15.00").notNull(),
  
  
  // Optional fields
  originalPrice: integer("original_price"), // For showing "Was $X, Now $Y" discounts
  image: text("image"),
  categoryId: varchar("category_id", { length: 255 }).notNull(),
  description: text("description"),
  nutrition: jsonb("nutrition"),
  isRamadanSpecial: boolean("is_ramadan_special").default(false).notNull(),
  ramadanDiscount: integer("ramadan_discount"),
  isFresh: boolean("is_fresh").default(false).notNull(),
  expiryDate: timestamp("expiry_date"),
  shelfLife: integer("shelf_life"),
  temperatureMin: decimal("temperature_min", { precision: 4, scale: 1 }),
  temperatureMax: decimal("temperature_max", { precision: 4, scale: 1 }),
  requiresRefrigeration: boolean("requires_refrigeration").default(false).notNull(),
  requiresFreezer: boolean("requires_freezer").default(false).notNull(),
  specialPackaging: text("special_packaging"),
  handlingInstructions: text("handling_instructions"),
  freshnessPriority: integer("freshness_priority").default(0).notNull(),
});

export const storeInventory = pgTable("store_inventory", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  storeId: varchar("store_id", { length: 255 }).notNull(),
  productId: varchar("product_id", { length: 255 }).notNull(),
  stockCount: integer("stock_count").notNull().default(0),
  location: text("location"),
  isAvailable: boolean("is_available").default(true).notNull(),
});

export const addresses = pgTable("addresses", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 255 }).notNull(),
  label: text("label").notNull(),
  fullAddress: text("full_address").notNull(),
  details: text("details"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
});

export const cartItems = pgTable("cart_items", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 255 }).notNull(),
  productId: varchar("product_id", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
});

export const orders = pgTable("orders", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderNumber: text("order_number").notNull().unique(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  storeId: varchar("store_id", { length: 255 }),
  pickerId: varchar("picker_id", { length: 255 }),
  driverId: varchar("driver_id", { length: 255 }),
  items: jsonb("items").notNull(),
  status: text("status").notNull().default("pending"),
  total: integer("total").notNull(),
  subtotal: integer("subtotal").notNull(),
  productCost: integer("product_cost").default(0).notNull(),
  deliveryFee: integer("delivery_fee").notNull().default(12000),
  discount: integer("discount").default(0).notNull(),
  appliedPromotionId: varchar("applied_promotion_id", { length: 255 }),
  appliedVoucherId: varchar("applied_voucher_id", { length: 255 }),
  promotionDiscount: integer("promotion_discount").default(0).notNull(),
  voucherDiscount: integer("voucher_discount").default(0).notNull(),
  freeDelivery: boolean("free_delivery").default(false).notNull(),
  addressId: varchar("address_id", { length: 255 }),
  paymentMethod: text("payment_method").default("midtrans"),
  paymentStatus: text("payment_status").default("pending"),
  codCollected: boolean("cod_collected").default(false),
  deliveryPin: text("delivery_pin").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  qrisConfirmed: boolean("qris_confirmed").default(false).notNull(),
  pickedAt: timestamp("picked_at"),
  packedAt: timestamp("packed_at"),
  deliveredAt: timestamp("delivered_at"),
  estimatedDelivery: timestamp("estimated_delivery"),
  customerLat: decimal("customer_lat", { precision: 10, scale: 7 }),
  customerLng: decimal("customer_lng", { precision: 10, scale: 7 }),
  estimatedArrival: timestamp("estimated_arrival"),
  actualDistance: decimal("actual_distance", { precision: 6, scale: 2 }),
  trackingStarted: timestamp("tracking_started"),
  // ✅ NEW: Track who created applied promotion for cost attribution
 promotionCreator: varchar("promotion_creator", { length: 255 }),
 promotionScope: text("promotion_scope"), // 'app' or 'store'
});

export const orderItems = pgTable("order_items", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: varchar("order_id", { length: 255 }).notNull(),
  productId: varchar("product_id", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  priceAtEntry: decimal("price_at_entry", { precision: 10, scale: 2 }).notNull(),
  costAtEntry: decimal("cost_at_entry", { precision: 10, scale: 2 }),
  isFreeItem: boolean("is_free_item").default(false).notNull(),
  promotionApplied: text("promotion_applied"),
});

export const driverLocations = pgTable("driver_locations", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  driverId: varchar("driver_id", { length: 255 }).notNull(),
  orderId: varchar("order_id", { length: 255 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  heading: decimal("heading", { precision: 5, scale: 2 }),
  speed: decimal("speed", { precision: 5, scale: 2 }),
  accuracy: decimal("accuracy", { precision: 6, scale: 2 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const promotions = pgTable("promotions", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  discountValue: integer("discount_value"),
  maxDiscount: integer("max_discount"),
  minOrder: integer("min_order").default(0).notNull(),
  buyQuantity: integer("buy_quantity"),
  getQuantity: integer("get_quantity"),
  applicableProductIds: jsonb("applicable_product_ids"),
  bundleItems: jsonb("bundle_items"),
  bundlePrice: integer("bundle_price"),
  storeId: varchar("store_id", { length: 255 }),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  scope: text("scope").default("store").notNull(),
  applicableStoreIds: jsonb("applicable_store_ids"),
  image: text("image"),
  bannerImage: text("banner_image"),
  icon: text("icon").default("gift"),
  color: text("color").default("#f59e0b"),
  priority: integer("priority").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").default(0).notNull(),
  userLimit: integer("user_limit").default(1).notNull(),
  targetUsers: text("target_users").default("all"),
  specificUserIds: jsonb("specific_user_ids"),
  validFrom: timestamp("valid_from").defaultNow().notNull(),
  validUntil: timestamp("valid_until").notNull(),
  isRamadanSpecial: boolean("is_ramadan_special").default(false).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  showInBanner: boolean("show_in_banner").default(false).notNull(),
  // ✅ NEW: Track total cost of this promotion
  totalCostIncurred: integer("total_cost_incurred").default(0).notNull(),
 // ✅ NEW: Track revenue generated with this promotion
  totalRevenueGenerated: integer("total_revenue_generated").default(0).notNull(),
 // ✅ NEW: ROI tracking
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vouchers = pgTable("vouchers", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  trigger: text("trigger").notNull(),
  discountType: text("discount_type").notNull(),
  discount: integer("discount").notNull(),
  maxDiscount: integer("max_discount"),
  minOrder: integer("min_order").default(0).notNull(),
  autoAssign: boolean("auto_assign").default(true).notNull(),
  assignmentRules: jsonb("assignment_rules"),
  validFrom: timestamp("valid_from").defaultNow().notNull(),
  validUntil: timestamp("valid_until").notNull(),
  daysValid: integer("days_valid").default(30).notNull(),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").default(0).notNull(),
  userLimit: integer("user_limit").default(1).notNull(),
  targetUsers: text("target_users").default("all"),
  icon: text("icon").default("gift"),
  color: text("color").default("#10b981"),
  priority: integer("priority").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isRamadanSpecial: boolean("is_ramadan_special").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userClaimedPromotions = pgTable("user_claimed_promotions", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 255 }).notNull(),
  promotionId: varchar("promotion_id", { length: 255 }).notNull(),
  claimedAt: timestamp("claimed_at").defaultNow().notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const userAssignedVouchers = pgTable("user_assigned_vouchers", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 255 }).notNull(),
  voucherId: varchar("voucher_id", { length: 255 }).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  assignedBy: text("assigned_by").default("system").notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const promotionUsageLog = pgTable("promotion_usage_log", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 255 }).notNull(),
  promotionId: varchar("promotion_id", { length: 255 }).notNull(),
  claimedPromotionId: varchar("claimed_promotion_id", { length: 255 }).notNull(),
  orderId: varchar("order_id", { length: 255 }),
  discountApplied: integer("discount_applied").notNull(),
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

export const userPromotionUsage = pgTable("user_promotion_usage", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 255 }).notNull(),
  promotionId: varchar("promotion_id", { length: 255 }).notNull(),
  orderId: varchar("order_id", { length: 255 }),
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

export const voucherUsageLog = pgTable("voucher_usage_log", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 255 }).notNull(),
  voucherId: varchar("voucher_id", { length: 255 }).notNull(),
  assignedVoucherId: varchar("assigned_voucher_id", { length: 255 }).notNull(),
  orderId: varchar("order_id", { length: 255 }),
  discountApplied: integer("discount_applied").notNull(),
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

export const userVoucherUsage = pgTable("user_voucher_usage", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 255 }).notNull(),
  voucherId: varchar("voucher_id", { length: 255 }).notNull(),
  orderId: varchar("order_id", { length: 255 }),
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

export const voucherTriggerLog = pgTable("voucher_trigger_log", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 255 }).notNull(),
  voucherId: varchar("voucher_id", { length: 255 }).notNull(),
  trigger: text("trigger").notNull(),
  triggeredAt: timestamp("triggered_at").defaultNow().notNull(),
  assignedVoucherId: varchar("assigned_voucher_id", { length: 255 }),
});

// ==================== 💰 FINANCIAL TRACKING TABLES ====================

export const staffEarnings = pgTable("staff_earnings", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  staffId: varchar("staff_id", { length: 255 }).notNull(),
  storeId: varchar("store_id", { length: 255 }).notNull(),
  date: timestamp("date").notNull(),
  role: text("role").notNull(),
  ordersCompleted: integer("orders_completed").default(0).notNull(),
  deliveriesCompleted: integer("deliveries_completed").default(0).notNull(),
  bonusEarned: decimal("bonus_earned", { precision: 12, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const salaryPayments = pgTable("salary_payments", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  staffId: varchar("staff_id", { length: 255 }).notNull(),
  storeId: varchar("store_id", { length: 255 }).notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  baseSalary: decimal("base_salary", { precision: 12, scale: 2 }).notNull(),
  totalBonus: decimal("total_bonus", { precision: 12, scale: 2 }).default("0").notNull(),
  totalEarnings: decimal("total_earnings", { precision: 12, scale: 2 }).notNull(),
  totalOrders: integer("total_orders").default(0).notNull(),
  totalDeliveries: integer("total_deliveries").default(0).notNull(),
  status: text("status").default("pending").notNull(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const storeDailyFinancials = pgTable("store_daily_financials", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  storeId: varchar("store_id", { length: 255 }).notNull(),
  date: timestamp("date").notNull(),
  totalOrders: integer("total_orders").default(0).notNull(),
  grossRevenue: decimal("gross_revenue", { precision: 12, scale: 2 }).default("0").notNull(),
  deliveryFeeRevenue: decimal("delivery_fee_revenue", { precision: 12, scale: 2 }).default("0").notNull(),
  productRevenue: decimal("product_revenue", { precision: 12, scale: 2 }).default("0").notNull(),
  productCosts: decimal("product_costs", { precision: 12, scale: 2 }).default("0").notNull(),
  staffBonuses: decimal("staff_bonuses", { precision: 12, scale: 2 }).default("0").notNull(),
  promotionDiscounts: decimal("promotion_discounts", { precision: 12, scale: 2 }).default("0").notNull(),
  voucherDiscounts: decimal("voucher_discounts", { precision: 12, scale: 2 }).default("0").notNull(),
  grossProfit: decimal("gross_profit", { precision: 12, scale: 2 }).default("0").notNull(),
  netProfit: decimal("net_profit", { precision: 12, scale: 2 }).default("0").notNull(),
  adminPromotionDiscounts: decimal("admin_promotion_discounts", { precision: 12, scale: 2 }).default("0").notNull(),
  storePromotionDiscounts: decimal("store_promotion_discounts", { precision: 12, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const promotionCostLog = pgTable("promotion_cost_log", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  promotionId: varchar("promotion_id", { length: 255 }).notNull(),
  orderId: varchar("order_id", { length: 255 }).notNull(),
  storeId: varchar("store_id", { length: 255 }),
  discountAmount: integer("discount_amount").notNull(),
  costBearer: text("cost_bearer").notNull(), // 'admin' or 'store'
  orderTotal: integer("order_total").notNull(),
  productCost: integer("product_cost").notNull(),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
});

// ✅ NEW: Admin profit tracking
export const adminFinancials = pgTable("admin_financials", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  date: timestamp("date").notNull(),
  
  // Revenue streams
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).default("0").notNull(),
  productRevenue: decimal("product_revenue", { precision: 12, scale: 2 }).default("0").notNull(),
  deliveryRevenue: decimal("delivery_revenue", { precision: 12, scale: 2 }).default("0").notNull(),
  
  // Costs
  productCosts: decimal("product_costs", { precision: 12, scale: 2 }).default("0").notNull(),
  staffBonuses: decimal("staff_bonuses", { precision: 12, scale: 2 }).default("0").notNull(),
  adminPromotionCosts: decimal("admin_promotion_costs", { precision: 12, scale: 2 }).default("0").notNull(),
  voucherCosts: decimal("voucher_costs", { precision: 12, scale: 2 }).default("0").notNull(),
  
  // Profit metrics
  grossProfit: decimal("gross_profit", { precision: 12, scale: 2 }).default("0").notNull(),
  netProfit: decimal("net_profit", { precision: 12, scale: 2 }).default("0").notNull(),
  
  // Targets
  targetProfit: decimal("target_profit", { precision: 12, scale: 2 }).default("50000000").notNull(),
  
  totalOrders: integer("total_orders").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const storeOwners = pgTable("store_owners", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 255 }).notNull().unique(),
  storeId: varchar("store_id", { length: 255 }).notNull().unique(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("0").notNull(),
  status: text("status").default("active").notNull(),
  onboardedAt: timestamp("onboarded_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productFreshness = pgTable("product_freshness", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: varchar("product_id", { length: 255 }).notNull().unique(),
  isFresh: boolean("is_fresh").default(false).notNull(),
  expiryDate: timestamp("expiry_date"),
  shelfLife: integer("shelf_life"), // days
  temperatureMin: decimal("temperature_min", { precision: 4, scale: 1 }),
  temperatureMax: decimal("temperature_max", { precision: 4, scale: 1 }),
  requiresRefrigeration: boolean("requires_refrigeration").default(false).notNull(),
  requiresFreezer: boolean("requires_freezer").default(false).notNull(),
  specialPackaging: text("special_packaging"),
  handlingInstructions: text("handling_instructions"),
  priority: integer("priority").default(0).notNull(), // Higher = more urgent
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const storeOwnerDailyEarnings = pgTable("store_owner_daily_earnings", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  storeOwnerId: varchar("store_owner_id", { length: 255 }).notNull(),
  storeId: varchar("store_id", { length: 255 }).notNull(),
  date: timestamp("date").notNull(),
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).default("0").notNull(),
  productCosts: decimal("product_costs", { precision: 12, scale: 2 }).default("0").notNull(),
  deliveryRevenue: decimal("delivery_revenue", { precision: 12, scale: 2 }).default("0").notNull(),
  storePromoCosts: decimal("store_promo_costs", { precision: 12, scale: 2 }).default("0").notNull(),
  staffBonuses: decimal("staff_bonuses", { precision: 12, scale: 2 }).default("0").notNull(),
  grossProfit: decimal("gross_profit", { precision: 12, scale: 2 }).default("0").notNull(),
  netProfit: decimal("net_profit", { precision: 12, scale: 2 }).default("0").notNull(),
  ordersCompleted: integer("orders_completed").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});



export const appSettings = pgTable("app_settings", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  dataType: text("data_type").default("string").notNull(),
  category: text("category").default("general").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  staffEarnings: many(staffEarnings),
  salaryPayments: many(salaryPayments),
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
  staffEarnings: many(staffEarnings),
  salaryPayments: many(salaryPayments),
  dailyFinancials: many(storeDailyFinancials),
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

export const staffEarningsRelations = relations(staffEarnings, ({ one }) => ({
  staff: one(users, { fields: [staffEarnings.staffId], references: [users.id] }),
  store: one(stores, { fields: [staffEarnings.storeId], references: [stores.id] }),
}));

export const salaryPaymentsRelations = relations(salaryPayments, ({ one }) => ({
  staff: one(users, { fields: [salaryPayments.staffId], references: [users.id] }),
  store: one(stores, { fields: [salaryPayments.storeId], references: [stores.id] }),
}));

export const storeDailyFinancialsRelations = relations(storeDailyFinancials, ({ one }) => ({
  store: one(stores, { fields: [storeDailyFinancials.storeId], references: [stores.id] }),
}));

export const promotionCostLogRelations = relations(promotionCostLog, ({ one }) => ({
  promotion: one(promotions, { fields: [promotionCostLog.promotionId], references: [promotions.id] }),
  order: one(orders, { fields: [promotionCostLog.orderId], references: [orders.id] }),
  store: one(stores, { fields: [promotionCostLog.storeId], references: [stores.id] }),
}));

export const adminFinancialsRelations = relations(adminFinancials, ({ }) => ({}));
export const storeOwnersRelations = relations(storeOwners, ({ one }) => ({
  user: one(users, { fields: [storeOwners.userId], references: [users.id] }),
  store: one(stores, { fields: [storeOwners.storeId], references: [stores.id] }),
}));

export const productFreshnessRelations = relations(productFreshness, ({ one }) => ({
  product: one(products, { fields: [productFreshness.productId], references: [products.id] }),
}));

export const storeOwnerDailyEarningsRelations = relations(storeOwnerDailyEarnings, ({ one }) => ({
  storeOwner: one(storeOwners, { fields: [storeOwnerDailyEarnings.storeOwnerId], references: [storeOwners.id] }),
  store: one(stores, { fields: [storeOwnerDailyEarnings.storeId], references: [stores.id] }),
}));


// --- Insert Schemas ---
export const insertUserSchema = createInsertSchema(users);
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertStoreSchema = createInsertSchema(stores).omit({ id: true, createdAt: true });
export const insertStoreStaffSchema = createInsertSchema(storeStaff).omit({ id: true, createdAt: true, lastStatusChange: true });
export const insertStoreInventorySchema = createInsertSchema(storeInventory).omit({ id: true });
export const insertCategorySchema = createInsertSchema(categories).pick({ name: true, icon: true, color: true, image: true });
export const insertProductSchema = createInsertSchema(products).omit({ 
  id: true,
  price: true,      // ✅ OMIT PRICE - auto-calculated by database
}).extend({
  costPrice: z.number().int().positive({ 
    message: "Cost price must be greater than 0" 
  }),
  margin: z.number().optional().transform(val => 
    val !== undefined ? String(val) : undefined
  ),
});
export const insertAddressSchema = createInsertSchema(addresses).omit({ id: true });
export const insertCartItemSchema = createInsertSchema(cartItems).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertVoucherSchema = createInsertSchema(vouchers).omit({ id: true, createdAt: true, usedCount: true });
export const insertPromotionSchema = createInsertSchema(promotions).omit({ id: true, createdAt: true, usedCount: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertDriverLocationSchema = createInsertSchema(driverLocations).omit({ id: true, timestamp: true });
export const insertUserClaimedPromotionSchema = createInsertSchema(userClaimedPromotions).omit({ id: true, claimedAt: true });
export const insertUserAssignedVoucherSchema = createInsertSchema(userAssignedVouchers).omit({ id: true, assignedAt: true });
export const insertStaffEarningsSchema = createInsertSchema(staffEarnings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSalaryPaymentSchema = createInsertSchema(salaryPayments).omit({ id: true, createdAt: true });
export const insertStoreDailyFinancialsSchema = createInsertSchema(storeDailyFinancials).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAppSettingSchema = createInsertSchema(appSettings).omit({ id: true, updatedAt: true });
export const insertPromotionCostLogSchema = createInsertSchema(promotionCostLog).omit({ 
  id: true, 
  appliedAt: true 
});

export const insertAdminFinancialsSchema = createInsertSchema(adminFinancials).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertStoreOwnerSchema = createInsertSchema(storeOwners).omit({ id: true, createdAt: true });
export const insertProductFreshnessSchema = createInsertSchema(productFreshness).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStoreOwnerDailyEarningsSchema = createInsertSchema(storeOwnerDailyEarnings).omit({ id: true, createdAt: true, updatedAt: true });



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
export type StaffEarnings = typeof staffEarnings.$inferSelect;
export type InsertStaffEarnings = z.infer<typeof insertStaffEarningsSchema>;
export type SalaryPayment = typeof salaryPayments.$inferSelect;
export type InsertSalaryPayment = z.infer<typeof insertSalaryPaymentSchema>;
export type StoreDailyFinancials = typeof storeDailyFinancials.$inferSelect;
export type InsertStoreDailyFinancials = z.infer<typeof insertStoreDailyFinancialsSchema>;
export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = z.infer<typeof insertAppSettingSchema>;
export type PromotionCostLog = typeof promotionCostLog.$inferSelect;
export type InsertPromotionCostLog = z.infer<typeof insertPromotionCostLogSchema>;
export type AdminFinancials = typeof adminFinancials.$inferSelect;
export type InsertAdminFinancials = z.infer<typeof insertAdminFinancialsSchema>;
export type StoreOwner = typeof storeOwners.$inferSelect;
export type InsertStoreOwner = z.infer<typeof insertStoreOwnerSchema>;
export type ProductFreshness = typeof productFreshness.$inferSelect;
export type InsertProductFreshness = z.infer<typeof insertProductFreshnessSchema>;
export type StoreOwnerDailyEarnings = typeof storeOwnerDailyEarnings.$inferSelect;
export type InsertStoreOwnerDailyEarnings = z.infer<typeof insertStoreOwnerDailyEarningsSchema>;