import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles enum
export const userRoles = ["customer", "picker", "driver", "admin"] as const;
export type UserRole = typeof userRoles[number];

// Staff status enum
export const staffStatuses = ["online", "offline"] as const;
export type StaffStatus = typeof staffStatuses[number];

// Order status enum for proper lifecycle tracking
export const orderStatuses = ["pending", "confirmed", "picking", "packed", "delivering", "delivered", "cancelled"] as const;
export type OrderStatus = typeof orderStatuses[number];

// Payment method types
export const paymentMethodTypes = ["midtrans", "cod"] as const;
export type PaymentMethodType = typeof paymentMethodTypes[number];

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("customer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Stores table
export const stores = pgTable("stores", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  codAllowed: boolean("cod_allowed").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Store staff assignment - links users (pickers/drivers) to stores
export const storeStaff = pgTable("store_staff", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  role: text("role").notNull(), // 'picker' or 'driver'
  status: text("status").notNull().default("offline"), // 'online' or 'offline'
  lastStatusChange: timestamp("last_status_change").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  image: text("image"),
});

export const products = pgTable("products", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  price: integer("price").notNull(),
  originalPrice: integer("original_price"),
  image: text("image"),
  categoryId: varchar("category_id").notNull().references(() => categories.id),
  description: text("description"),
  nutrition: jsonb("nutrition"),
  inStock: boolean("in_stock").default(true).notNull(),
  stockCount: integer("stock_count").default(0).notNull(),
});

export const addresses = pgTable("addresses", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  label: text("label").notNull(),
  fullAddress: text("full_address").notNull(),
  details: text("details"),
  isDefault: boolean("is_default").default(false).notNull(),
});

export const cartItems = pgTable("cart_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
});

export const orders = pgTable("orders", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  userId: varchar("user_id").notNull().references(() => users.id),
  storeId: varchar("store_id").references(() => stores.id),
  pickerId: varchar("picker_id").references(() => users.id),
  driverId: varchar("driver_id").references(() => users.id),
  items: jsonb("items").notNull(),
  status: text("status").notNull().default("pending"),
  total: integer("total").notNull(),
  deliveryFee: integer("delivery_fee").notNull().default(10000),
  addressId: varchar("address_id").references(() => addresses.id),
  paymentMethod: text("payment_method").default("midtrans"), // 'midtrans' or 'cod'
  paymentStatus: text("payment_status").default("pending"), // 'pending', 'paid', 'collected'
  codCollected: boolean("cod_collected").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  pickedAt: timestamp("picked_at"),
  packedAt: timestamp("packed_at"),
  deliveredAt: timestamp("delivered_at"),
  estimatedDelivery: timestamp("estimated_delivery"),
  customerLat: decimal("customer_lat", { precision: 10, scale: 7 }),
  customerLng: decimal("customer_lng", { precision: 10, scale: 7 }),
});

// Store inventory - links products to stores with store-specific stock
export const storeInventory = pgTable("store_inventory", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  stockCount: integer("stock_count").notNull().default(0),
  isAvailable: boolean("is_available").default(true).notNull(),
});

export const vouchers = pgTable("vouchers", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  discount: integer("discount").notNull(),
  discountType: text("discount_type").notNull(),
  minOrder: integer("min_order").default(0).notNull(),
  validUntil: timestamp("valid_until").notNull(),
  description: text("description"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  cartItems: many(cartItems),
  orders: many(orders),
  storeStaff: many(storeStaff),
}));

export const storesRelations = relations(stores, ({ many }) => ({
  staff: many(storeStaff),
  inventory: many(storeInventory),
  orders: many(orders),
}));

export const storeStaffRelations = relations(storeStaff, ({ one }) => ({
  user: one(users, {
    fields: [storeStaff.userId],
    references: [users.id],
  }),
  store: one(stores, {
    fields: [storeStaff.storeId],
    references: [stores.id],
  }),
}));

export const storeInventoryRelations = relations(storeInventory, ({ one }) => ({
  store: one(stores, {
    fields: [storeInventory.storeId],
    references: [stores.id],
  }),
  product: one(products, {
    fields: [storeInventory.productId],
    references: [products.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  inventory: many(storeInventory),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id],
  }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  address: one(addresses, {
    fields: [orders.addressId],
    references: [addresses.id],
  }),
  store: one(stores, {
    fields: [orders.storeId],
    references: [stores.id],
  }),
  picker: one(users, {
    fields: [orders.pickerId],
    references: [users.id],
  }),
  driver: one(users, {
    fields: [orders.driverId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  phone: true,
  role: true,
});

export const insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  createdAt: true,
});

export const insertStoreStaffSchema = createInsertSchema(storeStaff).omit({
  id: true,
  createdAt: true,
  lastStatusChange: true,
});

export const insertStoreInventorySchema = createInsertSchema(storeInventory).omit({
  id: true,
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  icon: true,
  color: true,
  image: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
});

export const insertAddressSchema = createInsertSchema(addresses).omit({
  id: true,
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  pickedAt: true,
  packedAt: true,
  deliveredAt: true,
});

export const insertVoucherSchema = createInsertSchema(vouchers).omit({
  id: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Store = typeof stores.$inferSelect;

export type InsertStoreStaff = z.infer<typeof insertStoreStaffSchema>;
export type StoreStaff = typeof storeStaff.$inferSelect;

export type InsertStoreInventory = z.infer<typeof insertStoreInventorySchema>;
export type StoreInventory = typeof storeInventory.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type Address = typeof addresses.$inferSelect;

export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertVoucher = z.infer<typeof insertVoucherSchema>;
export type Voucher = typeof vouchers.$inferSelect;
