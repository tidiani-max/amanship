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
  areaId: integer("area_id"),
  storeId: integer("store_id"),
  pushToken: text("push_token"),
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
export const messagesRelations = relations(messages, ({ one }) => ({
  order: one(orders, {
    fields: [messages.orderId],
    references: [orders.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

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

// ... existing imports

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
});


export const storeInventory = pgTable("store_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  stockCount: integer("stock_count").notNull().default(0),
  location: text("location"), // Added: "Aisle 4", "Shelf B", etc.
  isAvailable: boolean("is_available").default(true).notNull(),
});

// ... rest of the file (don't forget to update relations if they change)

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
  deliveryFee: integer("delivery_fee").notNull().default(10000),
  addressId: varchar("address_id").references(() => addresses.id),
  paymentMethod: text("payment_method").default("midtrans"),
  paymentStatus: text("payment_status").default("pending"),
  codCollected: boolean("cod_collected").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  pickedAt: timestamp("picked_at"),
  packedAt: timestamp("packed_at"),
  deliveredAt: timestamp("delivered_at"),
  estimatedDelivery: timestamp("estimated_delivery"),
  customerLat: decimal("customer_lat", { precision: 10, scale: 7 }),
  customerLng: decimal("customer_lng", { precision: 10, scale: 7 }),
});



export const vouchers = pgTable("vouchers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  discount: integer("discount").notNull(),
  discountType: text("discount_type").notNull(),
  minOrder: integer("min_order").default(0).notNull(),
  validUntil: timestamp("valid_until").notNull(),
  description: text("description"),
});

// --- Relations ---

export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  cartItems: many(cartItems),
  orders: many(orders, { relationName: "customer_orders" }),
  assignmentsAsPicker: many(orders, { relationName: "picker_orders" }),
  assignmentsAsDriver: many(orders, { relationName: "driver_orders" }),
  storeStaff: many(storeStaff),
  ownedStores: many(stores),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
    relationName: "customer_orders",
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
    relationName: "picker_orders",
  }),
  driver: one(users, {
    fields: [orders.driverId],
    references: [users.id],
    relationName: "driver_orders",
  }),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
  owner: one(users, {
    fields: [stores.ownerId],
    references: [users.id],
  }),
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

// --- Insert Schemas ---
// Find this line near the bottom:
export const insertUserSchema = createInsertSchema(users).pick({
  username: true, 
  password: true, 
  phone: true, 
  role: true, 
  name: true, 
  areaId: true, 
  storeId: true,
  email: true,    // Add this
  googleId: true, // Add this
  appleId: true   // Add this
});
// Add this to shared/schema.ts

export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  priceAtEntry: decimal("price_at_entry", { precision: 10, scale: 2 }).notNull(),
});

// Also add the Zod schema and Type export at the bottom of the file
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export const insertStoreSchema = createInsertSchema(stores).omit({ id: true, createdAt: true });
export const insertStoreStaffSchema = createInsertSchema(storeStaff).omit({ id: true, createdAt: true, lastStatusChange: true });
export const insertStoreInventorySchema = createInsertSchema(storeInventory).omit({ id: true });
export const insertCategorySchema = createInsertSchema(categories).pick({ name: true, icon: true, color: true, image: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertAddressSchema = createInsertSchema(addresses).omit({ id: true });
export const insertCartItemSchema = createInsertSchema(cartItems).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertVoucherSchema = createInsertSchema(vouchers).omit({ id: true });

export type Message = typeof messages.$inferSelect;
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });

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

export type Voucher = typeof vouchers.$inferSelect;
export type InsertVoucher = z.infer<typeof insertVoucherSchema>;