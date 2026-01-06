"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertMessageSchema = exports.insertVoucherSchema = exports.insertOrderSchema = exports.insertCartItemSchema = exports.insertAddressSchema = exports.insertProductSchema = exports.insertCategorySchema = exports.insertStoreInventorySchema = exports.insertStoreStaffSchema = exports.insertStoreSchema = exports.insertOrderItemSchema = exports.orderItems = exports.insertUserSchema = exports.cartItemsRelations = exports.addressesRelations = exports.productsRelations = exports.categoriesRelations = exports.storeInventoryRelations = exports.storeStaffRelations = exports.storesRelations = exports.ordersRelations = exports.usersRelations = exports.vouchers = exports.orders = exports.cartItems = exports.addresses = exports.storeInventory = exports.products = exports.categories = exports.storeStaff = exports.stores = exports.messagesRelations = exports.messages = exports.otpCodes = exports.users = exports.paymentMethodTypes = exports.orderStatuses = exports.staffStatuses = exports.userRoles = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_zod_1 = require("drizzle-zod");
// --- Enums ---
exports.userRoles = ["customer", "picker", "driver", "owner", "admin"];
exports.staffStatuses = ["online", "offline"];
exports.orderStatuses = ["pending", "confirmed", "picking", "packed", "delivering", "delivered", "cancelled"];
exports.paymentMethodTypes = ["midtrans", "cod"];
// --- Tables ---
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    username: (0, pg_core_1.text)("username").notNull().unique(),
    password: (0, pg_core_1.text)("password").notNull(),
    name: (0, pg_core_1.text)("name"),
    phone: (0, pg_core_1.text)("phone"),
    email: (0, pg_core_1.text)("email"),
    appleId: (0, pg_core_1.text)("apple_id"),
    googleId: (0, pg_core_1.text)("google_id"),
    role: (0, pg_core_1.text)("role").notNull().default("customer"),
    areaId: (0, pg_core_1.integer)("area_id"),
    storeId: (0, pg_core_1.integer)("store_id"),
    pushToken: (0, pg_core_1.text)("push_token"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.otpCodes = (0, pg_core_1.pgTable)("otp_codes", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    phone: (0, pg_core_1.text)("phone").notNull(),
    code: (0, pg_core_1.text)("code").notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(),
    verified: (0, pg_core_1.boolean)("verified").default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.messages = (0, pg_core_1.pgTable)("messages", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    orderId: (0, pg_core_1.varchar)("order_id").notNull().references(() => exports.orders.id),
    senderId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    type: (0, pg_core_1.varchar)("type").default("text").notNull(),
    content: (0, pg_core_1.text)("content").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.messagesRelations = (0, drizzle_orm_1.relations)(exports.messages, ({ one }) => ({
    order: one(exports.orders, {
        fields: [exports.messages.orderId],
        references: [exports.orders.id],
    }),
    sender: one(exports.users, {
        fields: [exports.messages.senderId],
        references: [exports.users.id],
    }),
}));
exports.stores = (0, pg_core_1.pgTable)("stores", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    name: (0, pg_core_1.text)("name").notNull(),
    address: (0, pg_core_1.text)("address").notNull(),
    latitude: (0, pg_core_1.decimal)("latitude", { precision: 10, scale: 7 }).notNull(),
    longitude: (0, pg_core_1.decimal)("longitude", { precision: 10, scale: 7 }).notNull(),
    ownerId: (0, pg_core_1.varchar)("owner_id").references(() => exports.users.id),
    codAllowed: (0, pg_core_1.boolean)("cod_allowed").default(true).notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.storeStaff = (0, pg_core_1.pgTable)("store_staff", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    storeId: (0, pg_core_1.varchar)("store_id").notNull().references(() => exports.stores.id),
    role: (0, pg_core_1.text)("role").notNull(),
    status: (0, pg_core_1.text)("status").notNull().default("offline"),
    lastStatusChange: (0, pg_core_1.timestamp)("last_status_change").defaultNow().notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.categories = (0, pg_core_1.pgTable)("categories", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    name: (0, pg_core_1.text)("name").notNull(),
    icon: (0, pg_core_1.text)("icon").notNull(),
    color: (0, pg_core_1.text)("color").notNull(),
    image: (0, pg_core_1.text)("image"),
});
// ... existing imports
exports.products = (0, pg_core_1.pgTable)("products", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    name: (0, pg_core_1.text)("name").notNull(),
    brand: (0, pg_core_1.text)("brand").notNull().default("Generic"),
    price: (0, pg_core_1.integer)("price").notNull(),
    originalPrice: (0, pg_core_1.integer)("original_price"),
    image: (0, pg_core_1.text)("image"),
    categoryId: (0, pg_core_1.varchar)("category_id").notNull().references(() => exports.categories.id),
    description: (0, pg_core_1.text)("description"),
    nutrition: (0, pg_core_1.jsonb)("nutrition"),
});
exports.storeInventory = (0, pg_core_1.pgTable)("store_inventory", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    storeId: (0, pg_core_1.varchar)("store_id").notNull().references(() => exports.stores.id),
    productId: (0, pg_core_1.varchar)("product_id").notNull().references(() => exports.products.id),
    stockCount: (0, pg_core_1.integer)("stock_count").notNull().default(0),
    location: (0, pg_core_1.text)("location"), // Added: "Aisle 4", "Shelf B", etc.
    isAvailable: (0, pg_core_1.boolean)("is_available").default(true).notNull(),
});
// ... rest of the file (don't forget to update relations if they change)
exports.addresses = (0, pg_core_1.pgTable)("addresses", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    label: (0, pg_core_1.text)("label").notNull(),
    fullAddress: (0, pg_core_1.text)("full_address").notNull(),
    details: (0, pg_core_1.text)("details"),
    latitude: (0, pg_core_1.decimal)("latitude", { precision: 10, scale: 7 }).notNull(),
    longitude: (0, pg_core_1.decimal)("longitude", { precision: 10, scale: 7 }).notNull(),
    isDefault: (0, pg_core_1.boolean)("is_default").default(false).notNull(),
});
exports.cartItems = (0, pg_core_1.pgTable)("cart_items", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    productId: (0, pg_core_1.varchar)("product_id").notNull().references(() => exports.products.id),
    quantity: (0, pg_core_1.integer)("quantity").notNull().default(1),
});
exports.orders = (0, pg_core_1.pgTable)("orders", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    orderNumber: (0, pg_core_1.text)("order_number").notNull().unique(),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    storeId: (0, pg_core_1.varchar)("store_id").references(() => exports.stores.id),
    pickerId: (0, pg_core_1.varchar)("picker_id").references(() => exports.users.id),
    driverId: (0, pg_core_1.varchar)("driver_id").references(() => exports.users.id),
    items: (0, pg_core_1.jsonb)("items").notNull(),
    status: (0, pg_core_1.text)("status").notNull().default("pending"),
    total: (0, pg_core_1.integer)("total").notNull(),
    deliveryFee: (0, pg_core_1.integer)("delivery_fee").notNull().default(10000),
    addressId: (0, pg_core_1.varchar)("address_id").references(() => exports.addresses.id),
    paymentMethod: (0, pg_core_1.text)("payment_method").default("midtrans"),
    paymentStatus: (0, pg_core_1.text)("payment_status").default("pending"),
    codCollected: (0, pg_core_1.boolean)("cod_collected").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    pickedAt: (0, pg_core_1.timestamp)("picked_at"),
    packedAt: (0, pg_core_1.timestamp)("packed_at"),
    deliveredAt: (0, pg_core_1.timestamp)("delivered_at"),
    estimatedDelivery: (0, pg_core_1.timestamp)("estimated_delivery"),
    customerLat: (0, pg_core_1.decimal)("customer_lat", { precision: 10, scale: 7 }),
    customerLng: (0, pg_core_1.decimal)("customer_lng", { precision: 10, scale: 7 }),
});
exports.vouchers = (0, pg_core_1.pgTable)("vouchers", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    code: (0, pg_core_1.text)("code").notNull().unique(),
    discount: (0, pg_core_1.integer)("discount").notNull(),
    discountType: (0, pg_core_1.text)("discount_type").notNull(),
    minOrder: (0, pg_core_1.integer)("min_order").default(0).notNull(),
    validUntil: (0, pg_core_1.timestamp)("valid_until").notNull(),
    description: (0, pg_core_1.text)("description"),
});
// --- Relations ---
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ many }) => ({
    addresses: many(exports.addresses),
    cartItems: many(exports.cartItems),
    orders: many(exports.orders, { relationName: "customer_orders" }),
    assignmentsAsPicker: many(exports.orders, { relationName: "picker_orders" }),
    assignmentsAsDriver: many(exports.orders, { relationName: "driver_orders" }),
    storeStaff: many(exports.storeStaff),
    ownedStores: many(exports.stores),
}));
exports.ordersRelations = (0, drizzle_orm_1.relations)(exports.orders, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.orders.userId],
        references: [exports.users.id],
        relationName: "customer_orders",
    }),
    address: one(exports.addresses, {
        fields: [exports.orders.addressId],
        references: [exports.addresses.id],
    }),
    store: one(exports.stores, {
        fields: [exports.orders.storeId],
        references: [exports.stores.id],
    }),
    picker: one(exports.users, {
        fields: [exports.orders.pickerId],
        references: [exports.users.id],
        relationName: "picker_orders",
    }),
    driver: one(exports.users, {
        fields: [exports.orders.driverId],
        references: [exports.users.id],
        relationName: "driver_orders",
    }),
}));
exports.storesRelations = (0, drizzle_orm_1.relations)(exports.stores, ({ one, many }) => ({
    owner: one(exports.users, {
        fields: [exports.stores.ownerId],
        references: [exports.users.id],
    }),
    staff: many(exports.storeStaff),
    inventory: many(exports.storeInventory),
    orders: many(exports.orders),
}));
exports.storeStaffRelations = (0, drizzle_orm_1.relations)(exports.storeStaff, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.storeStaff.userId],
        references: [exports.users.id],
    }),
    store: one(exports.stores, {
        fields: [exports.storeStaff.storeId],
        references: [exports.stores.id],
    }),
}));
exports.storeInventoryRelations = (0, drizzle_orm_1.relations)(exports.storeInventory, ({ one }) => ({
    store: one(exports.stores, {
        fields: [exports.storeInventory.storeId],
        references: [exports.stores.id],
    }),
    product: one(exports.products, {
        fields: [exports.storeInventory.productId],
        references: [exports.products.id],
    }),
}));
exports.categoriesRelations = (0, drizzle_orm_1.relations)(exports.categories, ({ many }) => ({
    products: many(exports.products),
}));
exports.productsRelations = (0, drizzle_orm_1.relations)(exports.products, ({ one, many }) => ({
    category: one(exports.categories, {
        fields: [exports.products.categoryId],
        references: [exports.categories.id],
    }),
    inventory: many(exports.storeInventory),
}));
exports.addressesRelations = (0, drizzle_orm_1.relations)(exports.addresses, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.addresses.userId],
        references: [exports.users.id],
    }),
}));
exports.cartItemsRelations = (0, drizzle_orm_1.relations)(exports.cartItems, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.cartItems.userId],
        references: [exports.users.id],
    }),
    product: one(exports.products, {
        fields: [exports.cartItems.productId],
        references: [exports.products.id],
    }),
}));
// --- Insert Schemas ---
// Find this line near the bottom:
exports.insertUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users).pick({
    username: true,
    password: true,
    phone: true,
    role: true,
    name: true,
    areaId: true,
    storeId: true,
    email: true, // Add this
    googleId: true, // Add this
    appleId: true // Add this
});
// Add this to shared/schema.ts
exports.orderItems = (0, pg_core_1.pgTable)("order_items", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    orderId: (0, pg_core_1.varchar)("order_id").references(() => exports.orders.id).notNull(),
    productId: (0, pg_core_1.varchar)("product_id").references(() => exports.products.id).notNull(),
    quantity: (0, pg_core_1.integer)("quantity").notNull(),
    priceAtEntry: (0, pg_core_1.decimal)("price_at_entry", { precision: 10, scale: 2 }).notNull(),
});
// Also add the Zod schema and Type export at the bottom of the file
exports.insertOrderItemSchema = (0, drizzle_zod_1.createInsertSchema)(exports.orderItems).omit({ id: true });
exports.insertStoreSchema = (0, drizzle_zod_1.createInsertSchema)(exports.stores).omit({ id: true, createdAt: true });
exports.insertStoreStaffSchema = (0, drizzle_zod_1.createInsertSchema)(exports.storeStaff).omit({ id: true, createdAt: true, lastStatusChange: true });
exports.insertStoreInventorySchema = (0, drizzle_zod_1.createInsertSchema)(exports.storeInventory).omit({ id: true });
exports.insertCategorySchema = (0, drizzle_zod_1.createInsertSchema)(exports.categories).pick({ name: true, icon: true, color: true, image: true });
exports.insertProductSchema = (0, drizzle_zod_1.createInsertSchema)(exports.products).omit({ id: true });
exports.insertAddressSchema = (0, drizzle_zod_1.createInsertSchema)(exports.addresses).omit({ id: true });
exports.insertCartItemSchema = (0, drizzle_zod_1.createInsertSchema)(exports.cartItems).omit({ id: true });
exports.insertOrderSchema = (0, drizzle_zod_1.createInsertSchema)(exports.orders).omit({ id: true, createdAt: true });
exports.insertVoucherSchema = (0, drizzle_zod_1.createInsertSchema)(exports.vouchers).omit({ id: true });
exports.insertMessageSchema = (0, drizzle_zod_1.createInsertSchema)(exports.messages).omit({ id: true, createdAt: true });
