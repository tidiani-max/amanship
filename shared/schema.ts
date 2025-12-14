import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
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
  items: jsonb("items").notNull(),
  status: text("status").notNull().default("pending"),
  total: integer("total").notNull(),
  deliveryFee: integer("delivery_fee").notNull().default(10000),
  addressId: varchar("address_id").references(() => addresses.id),
  paymentMethodId: text("payment_method_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  estimatedDelivery: timestamp("estimated_delivery"),
  riderInfo: jsonb("rider_info"),
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
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
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
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  phone: true,
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  icon: true,
  color: true,
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
});

export const insertVoucherSchema = createInsertSchema(vouchers).omit({
  id: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
