import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import {
  users,
  categories,
  products,
  addresses,
  cartItems,
  orders,
  vouchers,
  stores,
  storeStaff,
  storeInventory,
  type User,
  type InsertUser,
  type Category,
  type InsertCategory,
  type Product,
  type InsertProduct,
  type Address,
  type InsertAddress,
  type CartItem,
  type InsertCartItem,
  type Order,
  type InsertOrder,
  type Voucher,
  type InsertVoucher,
  type Store,
  type InsertStore,
  type StoreStaff,
  type InsertStoreStaff,
  type StoreInventory,
  type InsertStoreInventory,
} from "@shared/schema";

export interface IStorage {
  // User Methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersByRole(role: string): Promise<User[]>;
  
  // Address Methods
  getUserAddresses(userId: string): Promise<Address[]>;
  createAddress(address: InsertAddress): Promise<Address>;
  
  // Category Methods
  getCategories(): Promise<Category[]>;
  getCategoryById(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Product Methods
  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  getProductsByCategory(categoryId: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined>;
  getProductsWithInventory(
  storeId: string,
  categoryId?: string
): Promise<{
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice: number | null;
  image: string | null;
  categoryId: string;
  description: string | null;
  nutrition: any;
  stockCount: number;
  isAvailable: boolean;
}[]>;

  
  // Cart Methods
  getCartItems(userId: string): Promise<CartItem[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItemQuantity(id: string, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: string): Promise<void>;
  clearCart(userId: string): Promise<void>;
  
  // Order Methods
  getOrders(userId: string): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  getAllOrders(): Promise<Order[]>;
  getOrdersByStore(storeId: string): Promise<Order[]>;
  assignPickerToOrder(orderId: string, pickerId: string): Promise<Order | undefined>;
  assignDriverToOrder(orderId: string, driverId: string): Promise<Order | undefined>;
  updateOrderWithTimestamp(id: string, status: string, timestamp: 'pickedAt' | 'packedAt' | 'deliveredAt'): Promise<Order | undefined>;
  getOrdersByPicker(pickerId: string): Promise<Order[]>;
  getOrdersByDriver(driverId: string): Promise<Order[]>;
  
  // Voucher Methods
  getVouchers(): Promise<Voucher[]>;
  getVoucherByCode(code: string): Promise<Voucher | undefined>;
  
  // Store Methods
  getStores(): Promise<Store[]>;
  getStoreById(id: string): Promise<Store | undefined>;
  createStore(store: InsertStore): Promise<Store>;
  getStoresByOwner(ownerId: string): Promise<Store[]>;
  updateStore(id: string, updates: Partial<Store>): Promise<Store | undefined>;
  
  // Store Staff Methods
  getStoreStaff(storeId: string): Promise<StoreStaff[]>;
  getStoreStaffByUserId(userId: string): Promise<StoreStaff | undefined>;
  createStoreStaff(staff: InsertStoreStaff): Promise<StoreStaff>;
  updateStaffStatus(userId: string, status: string): Promise<StoreStaff | undefined>;
  getOnlineStaffByStore(storeId: string): Promise<{ pickers: StoreStaff[]; drivers: StoreStaff[] }>;
  
  // Store Inventory Methods
  getStoreInventory(storeId: string): Promise<StoreInventory[]>;
  getStoreInventoryWithProducts(storeId: string): Promise<(StoreInventory & { product: Product })[]>;
  createStoreInventory(inventory: InsertStoreInventory): Promise<StoreInventory>;
  updateStoreInventory(id: string, stockCount: number, isAvailable: boolean): Promise<StoreInventory | undefined>;
  deleteStoreInventory(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // --- USER IMPLEMENTATIONS ---
  async getUser(id: string): Promise<User | undefined> {
    const [result] = await db.select().from(users).where(eq(users.id, id));
    return result;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [result] = await db.select().from(users).where(eq(users.username, username));
    return result;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [result] = await db.select().from(users).where(eq(users.phone, phone));
    return result;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [result] = await db.select().from(users).where(eq(users.email, email));
    return result;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [result] = await db.insert(users).values(insertUser).returning();
    return result;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role));
  }

  // --- ADDRESS IMPLEMENTATIONS ---
  async createAddress(address: InsertAddress): Promise<Address> {
    const [newAddress] = await db.insert(addresses).values({
      ...address,
      latitude: String(address.latitude),
      longitude: String(address.longitude),
      isDefault: address.isDefault ?? false,
    }).returning();
    return newAddress;
  }

  async getUserAddresses(userId: string): Promise<Address[]> {
    return db.select().from(addresses)
      .where(eq(addresses.userId, userId))
      .orderBy(sql`${addresses.isDefault} DESC, ${addresses.id} DESC`);
  }

  // --- CATEGORY IMPLEMENTATIONS ---
  async getCategories(): Promise<Category[]> {
    return db.select().from(categories);
  }

  async getCategoryById(id: string): Promise<Category | undefined> {
    const [result] = await db.select().from(categories).where(eq(categories.id, id));
    return result;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [result] = await db.insert(categories).values(category).returning();
    return result;
  }

  // --- PRODUCT IMPLEMENTATIONS ---
  async getProducts(): Promise<Product[]> {
    return db.select().from(products);
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const [result] = await db.select().from(products).where(eq(products.id, id));
    return result;
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    return db.select().from(products).where(eq(products.categoryId, categoryId));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [result] = await db.insert(products).values(product).returning();
    return result;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
  const [result] = await db.update(products)
    .set(updates)
    .where(eq(products.id, id))
    .returning();
  return result;
}
async getProductsWithInventory(storeId: string, categoryId?: string) {
  const query = db
    .select({
      id: products.id,
      name: products.name,
      brand: products.brand,
      price: products.price,
      originalPrice: products.originalPrice,
      image: products.image,
      categoryId: products.categoryId,
      description: products.description,
      nutrition: products.nutrition,

      stockCount: sql<number>`COALESCE(${storeInventory.stockCount}, 0)`,
      isAvailable: sql<boolean>`COALESCE(${storeInventory.isAvailable}, false)`,
    })
    .from(products)
    .leftJoin(
      storeInventory,
      and(
        eq(storeInventory.productId, products.id),
        eq(storeInventory.storeId, storeId)
      )
    );

  if (categoryId) {
    query.where(eq(products.categoryId, categoryId));
  }

  return query;
}


  // --- CART IMPLEMENTATIONS ---
  async getCartItems(userId: string): Promise<CartItem[]> {
    return db.select().from(cartItems).where(eq(cartItems.userId, userId));
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    const [existing] = await db.select().from(cartItems)
      .where(and(eq(cartItems.userId, item.userId), eq(cartItems.productId, item.productId)));
    
    if (existing) {
      const [updated] = await db.update(cartItems)
        .set({ quantity: existing.quantity + (item.quantity || 1) })
        .where(eq(cartItems.id, existing.id))
        .returning();
      return updated;
    }
    
    const [result] = await db.insert(cartItems).values(item).returning();
    return result;
  }

  async updateCartItemQuantity(id: string, quantity: number): Promise<CartItem | undefined> {
    const [result] = await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, id)).returning();
    return result;
  }

  async removeFromCart(id: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.id, id));
  }

  async clearCart(userId: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.userId, userId));
  }

  // --- ORDER IMPLEMENTATIONS ---
  async getOrders(userId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.userId, userId));
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const [result] = await db.select().from(orders).where(eq(orders.id, id));
    return result;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [result] = await db.insert(orders).values(order).returning();
    return result;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const [result] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return result;
  }

  async getAllOrders(): Promise<Order[]> {
    return db.select().from(orders);
  }

  async getOrdersByStore(storeId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.storeId, storeId));
  }

  async assignPickerToOrder(orderId: string, pickerId: string): Promise<Order | undefined> {
    const [result] = await db.update(orders)
      .set({ pickerId, status: "picking", pickedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    return result;
  }

  async assignDriverToOrder(orderId: string, driverId: string): Promise<Order | undefined> {
    const [result] = await db.update(orders)
      .set({ driverId, status: "delivering" })
      .where(eq(orders.id, orderId))
      .returning();
    return result;
  }

  async getOrdersByPicker(pickerId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.pickerId, pickerId));
  }

  async getOrdersByDriver(driverId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.driverId, driverId));
  }

  async updateOrderWithTimestamp(id: string, status: string, timestamp: 'pickedAt' | 'packedAt' | 'deliveredAt'): Promise<Order | undefined> {
    const [result] = await db.update(orders)
      .set({ [timestamp]: new Date(), status })
      .where(eq(orders.id, id))
      .returning();
    return result;
  }

  // --- VOUCHER IMPLEMENTATIONS ---
  async getVouchers(): Promise<Voucher[]> {
    return db.select().from(vouchers);
  }

  async getVoucherByCode(code: string): Promise<Voucher | undefined> {
    const [result] = await db.select().from(vouchers).where(eq(vouchers.code, code));
    return result;
  }

  // --- STORE IMPLEMENTATIONS ---
  async getStores(): Promise<Store[]> {
    return db.select().from(stores).where(eq(stores.isActive, true));
  }

  async getStoreById(id: string): Promise<Store | undefined> {
    const [result] = await db.select().from(stores).where(eq(stores.id, id));
    return result;
  }

  async createStore(store: InsertStore): Promise<Store> {
    const [result] = await db.insert(stores).values(store).returning();
    return result;
  }

  async getStoresByOwner(ownerId: string): Promise<Store[]> {
    return db.select().from(stores).where(eq(stores.ownerId, ownerId));
  }

  async updateStore(id: string, updates: Partial<Store>): Promise<Store | undefined> {
    const [result] = await db.update(stores).set(updates).where(eq(stores.id, id)).returning();
    return result;
  }

  // --- STAFF IMPLEMENTATIONS ---
  async getStoreStaff(storeId: string): Promise<StoreStaff[]> {
    return db.select().from(storeStaff).where(eq(storeStaff.storeId, storeId));
  }

  async getStoreStaffByUserId(userId: string): Promise<StoreStaff | undefined> {
    const [result] = await db.select().from(storeStaff).where(eq(storeStaff.userId, userId));
    return result;
  }

  async createStoreStaff(staff: InsertStoreStaff): Promise<StoreStaff> {
    const [result] = await db.insert(storeStaff).values(staff).returning();
    return result;
  }

  async updateStaffStatus(userId: string, status: string): Promise<StoreStaff | undefined> {
    const [result] = await db.update(storeStaff)
      .set({ status, lastStatusChange: new Date() })
      .where(eq(storeStaff.userId, userId))
      .returning();
    return result;
  }

  async getOnlineStaffByStore(storeId: string): Promise<{ pickers: StoreStaff[]; drivers: StoreStaff[] }> {
    const staff = await db.select().from(storeStaff)
      .where(and(eq(storeStaff.storeId, storeId), eq(storeStaff.status, "online")));
    return {
      pickers: staff.filter(s => s.role === "picker"),
      drivers: staff.filter(s => s.role === "driver")
    };
  }

  // --- INVENTORY IMPLEMENTATIONS ---
  async getStoreInventory(storeId: string): Promise<StoreInventory[]> {
    return db.select().from(storeInventory).where(eq(storeInventory.storeId, storeId));
  }

  async getStoreInventoryWithProducts(storeId: string): Promise<(StoreInventory & { product: Product })[]> {
    const inventory = await db.select().from(storeInventory)
      .where(eq(storeInventory.storeId, storeId));
    
    const result = await Promise.all(
      inventory.map(async (inv) => {
        const product = await this.getProductById(inv.productId);
        return product ? { ...inv, product } : null;
      })
    );
    return result.filter((item): item is (StoreInventory & { product: Product }) => item !== null);
  }

  async createStoreInventory(inventory: InsertStoreInventory): Promise<StoreInventory> {
    const [result] = await db.insert(storeInventory).values(inventory).returning();
    return result;
  }

  async updateStoreInventory(id: string, stockCount: number, isAvailable: boolean): Promise<StoreInventory | undefined> {
    const [result] = await db.update(storeInventory)
      .set({ stockCount, isAvailable })
      .where(eq(storeInventory.id, id))
      .returning();
    return result;
  }

  async deleteStoreInventory(id: string): Promise<void> {
    await db.delete(storeInventory).where(eq(storeInventory.id, id));
  }
}

export const storage = new DatabaseStorage();