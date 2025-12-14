import { db } from "./db";
import { eq, and } from "drizzle-orm";
import {
  users,
  categories,
  products,
  addresses,
  cartItems,
  orders,
  vouchers,
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
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getCategories(): Promise<Category[]>;
  getCategoryById(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  getProductsByCategory(categoryId: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  
  getAddressesByUserId(userId: string): Promise<Address[]>;
  createAddress(address: InsertAddress): Promise<Address>;
  
  getCartItems(userId: string): Promise<CartItem[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItemQuantity(id: string, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: string): Promise<void>;
  clearCart(userId: string): Promise<void>;
  
  getOrders(userId: string): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  
  getVouchers(): Promise<Voucher[]>;
  getVoucherByCode(code: string): Promise<Voucher | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getCategories(): Promise<Category[]> {
    return db.select().from(categories);
  }

  async getCategoryById(id: string): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.id, id));
    return result[0];
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const result = await db.insert(categories).values(category).returning();
    return result[0];
  }

  async getProducts(): Promise<Product[]> {
    return db.select().from(products);
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id));
    return result[0];
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    return db.select().from(products).where(eq(products.categoryId, categoryId));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await db.insert(products).values(product).returning();
    return result[0];
  }

  async getAddressesByUserId(userId: string): Promise<Address[]> {
    return db.select().from(addresses).where(eq(addresses.userId, userId));
  }

  async createAddress(address: InsertAddress): Promise<Address> {
    const result = await db.insert(addresses).values(address).returning();
    return result[0];
  }

  async getCartItems(userId: string): Promise<CartItem[]> {
    return db.select().from(cartItems).where(eq(cartItems.userId, userId));
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    const existing = await db.select().from(cartItems)
      .where(and(eq(cartItems.userId, item.userId), eq(cartItems.productId, item.productId)));
    
    if (existing.length > 0) {
      const updated = await db.update(cartItems)
        .set({ quantity: existing[0].quantity + (item.quantity || 1) })
        .where(eq(cartItems.id, existing[0].id))
        .returning();
      return updated[0];
    }
    
    const result = await db.insert(cartItems).values(item).returning();
    return result[0];
  }

  async updateCartItemQuantity(id: string, quantity: number): Promise<CartItem | undefined> {
    const result = await db.update(cartItems)
      .set({ quantity })
      .where(eq(cartItems.id, id))
      .returning();
    return result[0];
  }

  async removeFromCart(id: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.id, id));
  }

  async clearCart(userId: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.userId, userId));
  }

  async getOrders(userId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.userId, userId));
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.id, id));
    return result[0];
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const result = await db.insert(orders).values(order).returning();
    return result[0];
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const result = await db.update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();
    return result[0];
  }

  async getVouchers(): Promise<Voucher[]> {
    return db.select().from(vouchers);
  }

  async getVoucherByCode(code: string): Promise<Voucher | undefined> {
    const result = await db.select().from(vouchers).where(eq(vouchers.code, code));
    return result[0];
  }
}

export const storage = new DatabaseStorage();
