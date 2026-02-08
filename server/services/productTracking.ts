import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";
import { 
  products, 
  storeInventory, 
  stores,
  users,
  storeOwners,
} from  "../../shared/schema"; // ⚠️ CHANGE THIS to match your schema import path

// ==================== CONFIGURATION ====================
const FRESHNESS_RULES: Record<string, number> = {
  "dairy": 7,
  "meat": 3,
  "produce": 5,
  "bakery": 2,
  "frozen": 90,
  "canned": 365,
  "beverages": 180,
  "snacks": 90,
  "default": 30,
};

const STOCK_THRESHOLDS = {
  CRITICAL: 5,
  LOW: 15,
  NORMAL: 30,
};

const PRIORITY_WEIGHTS = {
  STOCK_LEVEL: 0.4,
  FRESHNESS: 0.4,
  NEW_PRODUCT: 0.2,
};

// ==================== TYPES ====================
interface ScanResult {
  productId: string;
  productName: string;
  isFresh: boolean;
  expiryDate: Date | null;
  shelfLife: number | null;
  stockCount: number;
  stockStatus: string;
  freshnessPriority: number;
  stockPriority: number;
  newProductPriority: number;
  overallPriority: number;
}

interface StoreResults {
  storeId: string;
  storeName: string;
  productsScanned: number;
  products: ScanResult[];
}

export interface ProductAlert {
  type: 'EXPIRING_SOON' | 'OUT_OF_STOCK' | 'LOW_STOCK' | 'CRITICAL_FRESH';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  productId: string;
  productName: string;
  message: string;
  daysUntilExpiry?: number;
  stockCount?: number;
  recommendedAction: string;
}

// ==================== FRESHNESS DETECTION ====================
export function autoDetectFreshProduct(productName: string, brand: string, categoryId: string): boolean {
  const name = productName.toLowerCase();
  const brandLower = brand.toLowerCase();
  
  const freshKeywords = [
    'fresh', 'organic', 'chilled', 'refrigerated',
    'meat', 'chicken', 'beef', 'pork', 'fish',
    'milk', 'dairy', 'cheese', 'yogurt',
    'vegetable', 'fruit', 'salad', 'lettuce',
    'bread', 'bakery', 'pastry'
  ];
  
  const hasFreshKeyword = freshKeywords.some(keyword => 
    name.includes(keyword) || brandLower.includes(keyword)
  );
  
  return hasFreshKeyword;
}

export function estimateShelfLife(categoryId: string, productName: string): number {
  const name = productName.toLowerCase();
  
  for (const [category, days] of Object.entries(FRESHNESS_RULES)) {
    if (name.includes(category)) {
      return days;
    }
  }
  
  return FRESHNESS_RULES.default;
}

export function calculatePredictedExpiry(createdAt: Date, shelfLifeDays: number): Date {
  const expiry = new Date(createdAt);
  expiry.setDate(expiry.getDate() + shelfLifeDays);
  return expiry;
}

export function calculateFreshnessPriority(daysUntilExpiry: number, shelfLife: number): number {
  if (daysUntilExpiry <= 0) return 100;
  
  const percentageRemaining = (daysUntilExpiry / shelfLife) * 100;
  const priority = Math.round(100 - percentageRemaining);
  
  return Math.max(0, Math.min(100, priority));
}

// ==================== STOCK MONITORING ====================
export function calculateStockPriority(stockCount: number): number {
  if (stockCount <= 0) return 100;
  if (stockCount <= STOCK_THRESHOLDS.CRITICAL) return 90;
  if (stockCount <= STOCK_THRESHOLDS.LOW) return 60;
  if (stockCount <= STOCK_THRESHOLDS.NORMAL) return 30;
  return 0;
}

export function getStockStatus(stockCount: number): string {
  if (stockCount <= 0) return 'OUT_OF_STOCK';
  if (stockCount <= STOCK_THRESHOLDS.CRITICAL) return 'CRITICAL';
  if (stockCount <= STOCK_THRESHOLDS.LOW) return 'LOW';
  return 'NORMAL';
}

// ==================== NEW PRODUCT DETECTION ====================
export function calculateNewProductPriority(createdAt: Date): number {
  const daysSinceCreation = Math.floor(
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceCreation <= 3) return 20;
  if (daysSinceCreation <= 7) return 10;
  if (daysSinceCreation <= 14) return 5;
  return 0;
}

// ==================== OVERALL PRIORITY CALCULATION ====================
export function calculateOverallPriority(
  stockPriority: number,
  freshnessPriority: number,
  newProductPriority: number
): number {
  const overall = 
    (stockPriority * PRIORITY_WEIGHTS.STOCK_LEVEL) +
    (freshnessPriority * PRIORITY_WEIGHTS.FRESHNESS) +
    (newProductPriority * PRIORITY_WEIGHTS.NEW_PRODUCT);
  
  return Math.round(Math.max(0, Math.min(100, overall)));
}

// ==================== AUTOMATED PRODUCT SCANNING ====================
export async function scanProduct(productId: string, storeId: string): Promise<ScanResult | null> {
  console.log(`🔍 Scanning product ${productId} in store ${storeId}`);
  
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  
  if (!product) {
    console.error(`❌ Product ${productId} not found`);
    return null;
  }
  
  const [inventory] = await db
    .select()
    .from(storeInventory)
    .where(
      and(
        eq(storeInventory.productId, productId),
        eq(storeInventory.storeId, storeId)
      )
    )
    .limit(1);
  
  if (!inventory) {
    console.error(`❌ Inventory not found for product ${productId}`);
    return null;
  }
  
  const isFresh = autoDetectFreshProduct(product.name, product.brand, product.categoryId);
  
  let expiryDate: Date | null = null;
  let shelfLife: number | null = null;
  let freshnessPriority = 0;
  
  if (isFresh) {
    shelfLife = estimateShelfLife(product.categoryId, product.name);
    expiryDate = calculatePredictedExpiry(new Date(), shelfLife);
    
    const daysUntilExpiry = Math.floor(
      (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    freshnessPriority = calculateFreshnessPriority(daysUntilExpiry, shelfLife);
  }
  
  const stockPriority = calculateStockPriority(inventory.stockCount);
  const newProductPriority = calculateNewProductPriority(new Date());
  const overallPriority = calculateOverallPriority(
    stockPriority,
    freshnessPriority,
    newProductPriority
  );
  
  await db
    .update(products)
    .set({
      isFresh,
      expiryDate,
      shelfLife,
      freshnessPriority: overallPriority,
    })
    .where(eq(products.id, productId));
  
  console.log(`✅ Product ${product.name}: Priority ${overallPriority}/100`);
  
  return {
    productId,
    productName: product.name,
    isFresh,
    expiryDate,
    shelfLife,
    stockCount: inventory.stockCount,
    stockStatus: getStockStatus(inventory.stockCount),
    freshnessPriority,
    stockPriority,
    newProductPriority,
    overallPriority,
  };
}

export async function scanStoreProducts(storeId: string): Promise<ScanResult[]> {
  console.log(`🏪 Scanning all products in store ${storeId}`);
  
  const inventory = await db
    .select({
      productId: storeInventory.productId,
    })
    .from(storeInventory)
    .where(eq(storeInventory.storeId, storeId));
  
  console.log(`📦 Found ${inventory.length} products to scan`);
  
  const results: ScanResult[] = [];
  
  for (const item of inventory) {
    const result = await scanProduct(item.productId, storeId);
    if (result) {
      results.push(result);
    }
  }
  
  return results;
}

export async function scanAllProducts(): Promise<StoreResults[]> {
  console.log(`🌍 Scanning all products in all stores`);
  
  const allStores = await db.select().from(stores).where(eq(stores.isActive, true));
  
  console.log(`🏪 Found ${allStores.length} active stores`);
  
  const results: StoreResults[] = [];
  
  for (const store of allStores) {
    console.log(`\n📍 Scanning store: ${store.name}`);
    const storeResults = await scanStoreProducts(store.id);
    results.push({
      storeId: store.id,
      storeName: store.name,
      productsScanned: storeResults.length,
      products: storeResults,
    });
  }
  
  return results;
}

// ==================== ALERT GENERATION ====================
export async function generateStoreAlerts(storeId: string): Promise<ProductAlert[]> {
  console.log(`🚨 Generating alerts for store ${storeId}`);
  
  const alerts: ProductAlert[] = [];
  
  const productsWithInventory = await db
    .select({
      product: products,
      inventory: storeInventory,
    })
    .from(products)
    .innerJoin(storeInventory, eq(products.id, storeInventory.productId))
    .where(eq(storeInventory.storeId, storeId));
  
  for (const { product, inventory } of productsWithInventory) {
    if (inventory.stockCount === 0) {
      alerts.push({
        type: 'OUT_OF_STOCK',
        priority: 'HIGH',
        productId: product.id,
        productName: product.name,
        message: `${product.name} is completely out of stock`,
        stockCount: 0,
        recommendedAction: 'Restock immediately from supplier',
      });
    }
    else if (inventory.stockCount <= STOCK_THRESHOLDS.CRITICAL) {
      alerts.push({
        type: 'LOW_STOCK',
        priority: 'HIGH',
        productId: product.id,
        productName: product.name,
        message: `${product.name} has only ${inventory.stockCount} units left`,
        stockCount: inventory.stockCount,
        recommendedAction: 'Order new stock urgently',
      });
    }
    else if (inventory.stockCount <= STOCK_THRESHOLDS.LOW) {
      alerts.push({
        type: 'LOW_STOCK',
        priority: 'MEDIUM',
        productId: product.id,
        productName: product.name,
        message: `${product.name} stock is running low (${inventory.stockCount} units)`,
        stockCount: inventory.stockCount,
        recommendedAction: 'Plan to restock soon',
      });
    }
    
    if (product.isFresh && product.expiryDate) {
      const daysUntilExpiry = Math.floor(
        (new Date(product.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilExpiry >= 0 && daysUntilExpiry <= 3) {
        alerts.push({
          type: 'CRITICAL_FRESH',
          priority: 'HIGH',
          productId: product.id,
          productName: product.name,
          message: `${product.name} expires in ${daysUntilExpiry} day(s)!`,
          daysUntilExpiry,
          stockCount: inventory.stockCount,
          recommendedAction: 'Create urgent discount promotion (50-70% off)',
        });
      }
      else if (daysUntilExpiry > 3 && daysUntilExpiry <= 7) {
        alerts.push({
          type: 'EXPIRING_SOON',
          priority: 'HIGH',
          productId: product.id,
          productName: product.name,
          message: `${product.name} expires in ${daysUntilExpiry} days`,
          daysUntilExpiry,
          stockCount: inventory.stockCount,
          recommendedAction: 'Create discount promotion (30-50% off)',
        });
      }
      else if (daysUntilExpiry > 7 && daysUntilExpiry <= 14) {
        alerts.push({
          type: 'EXPIRING_SOON',
          priority: 'MEDIUM',
          productId: product.id,
          productName: product.name,
          message: `${product.name} will expire in ${daysUntilExpiry} days`,
          daysUntilExpiry,
          stockCount: inventory.stockCount,
          recommendedAction: 'Consider creating promotion (15-30% off)',
        });
      }
    }
  }
  
  const priorityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  console.log(`🚨 Generated ${alerts.length} alerts`);
  
  return alerts;
}

export async function notifyStoreOwnerAlerts(storeId: string, alerts: ProductAlert[]): Promise<void> {
  const [storeOwner] = await db
    .select({
      userId: storeOwners.userId,
    })
    .from(storeOwners)
    .where(eq(storeOwners.storeId, storeId))
    .limit(1);
  
  if (!storeOwner) {
    console.log(`⚠️ No store owner found for store ${storeId}`);
    return;
  }
  
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, storeOwner.userId))
    .limit(1);
  
  if (!user?.pushToken) {
    console.log(`⚠️ Store owner has no push token`);
    return;
  }
  
  const highPriorityAlerts = alerts.filter((a: ProductAlert) => a.priority === 'HIGH');
  
  if (highPriorityAlerts.length === 0) return;
  
  const message = highPriorityAlerts.length === 1
    ? highPriorityAlerts[0].message
    : `${highPriorityAlerts.length} urgent product alerts require attention`;
  
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: user.pushToken,
        sound: 'default',
        title: '🚨 Urgent Store Alert',
        body: message,
        data: {
          type: 'store_alert',
          storeId,
          alertCount: highPriorityAlerts.length,
        },
      }),
    });
    
    console.log(`📬 Sent alert notification to store owner`);
  } catch (error) {
    console.error(`❌ Failed to send notification:`, error);
  }
}

// ==================== DELIVERY PRIORITY ORDERING ====================
export async function getDeliveryPriorityProducts(storeId: string) {
  const productsList = await db
    .select({
      product: products,
      inventory: storeInventory,
    })
    .from(products)
    .innerJoin(storeInventory, eq(products.id, storeInventory.productId))
    .where(
      and(
        eq(storeInventory.storeId, storeId),
        eq(storeInventory.isAvailable, true)
      )
    )
    .orderBy(desc(products.freshnessPriority));
  
  return productsList.map(({ product, inventory }) => ({
    ...product,
    stockCount: inventory.stockCount,
    location: inventory.location,
  }));
}