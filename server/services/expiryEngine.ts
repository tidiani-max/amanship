// server/services/expiryEngine.ts
import { db } from "../db";
import {
  inventoryBatches,
  expiryDiscountSuggestions,
  bundleSuggestions,
  deadStockAlerts,
  shelfLifeMaster,
  storeInventory,
  products,
  categories,
  orders,
  orderItems,
  promotions,
  users,
  stores,
} from "../../shared/schema";
import { eq, and, lt, lte, gte, gt, desc, isNull } from "drizzle-orm";

// ─── Haversine distance (km) ──────────────────────────────────────────────────
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Round to nearest Rp 100 ─────────────────────────────────────────────────
function roundToHundred(value: number): number {
  return Math.ceil(value / 100) * 100;
}

// ─── Indonesian bundle naming matrix ─────────────────────────────────────────
const BUNDLE_NAME_MATRIX: Array<{ keywords: string[]; name: string }> = [
  { keywords: ["mie", "sosis", "minuman"],   name: "Paket Makan Siang Hemat" },
  { keywords: ["mie", "telur"],              name: "Paket Sarapan Praktis" },
  { keywords: ["ayam", "bumbu", "sayur"],    name: "Paket Masak Lengkap" },
  { keywords: ["snack", "minuman"],          name: "Paket Ngemil Seru" },
  { keywords: ["susu", "roti"],              name: "Paket Sarapan Sehat" },
  { keywords: ["buah", "susu"],              name: "Paket Sehat Harian" },
];

function generateBundleName(categoryNames: string[]): string {
  const lower = categoryNames.map(n => n.toLowerCase());
  for (const entry of BUNDLE_NAME_MATRIX) {
    const hits = entry.keywords.filter(k => lower.some(c => c.includes(k)));
    if (hits.length >= 2) return entry.name;
  }
  return `Paket Hemat ${categoryNames[0] ?? "Spesial"}`;
}

// ─── Seed default shelf life data ────────────────────────────────────────────
export async function seedShelfLifeDefaults(): Promise<void> {
  const existing = await db.select().from(shelfLifeMaster).limit(1);
  if (existing.length > 0) return;

  const defaults = [
    { categoryName: "Ayam/Daging sapi", isFresh: true,  shelfLifeValue: 28,  unit: "hours" },
    { categoryName: "Ikan segar",        isFresh: true,  shelfLifeValue: 10,  unit: "hours" },
    { categoryName: "Tahu/Tempe",        isFresh: true,  shelfLifeValue: 48,  unit: "hours" },
    { categoryName: "Sayur daun",        isFresh: true,  shelfLifeValue: 36,  unit: "hours" },
    { categoryName: "Buah segar",        isFresh: true,  shelfLifeValue: 72,  unit: "hours" },
    { categoryName: "Susu segar",        isFresh: true,  shelfLifeValue: 60,  unit: "hours" },
    { categoryName: "Susu UHT",          isFresh: false, shelfLifeValue: 240, unit: "days"  },
    { categoryName: "Mie instan",        isFresh: false, shelfLifeValue: 300, unit: "days"  },
    { categoryName: "Snack",             isFresh: false, shelfLifeValue: 150, unit: "days"  },
    { categoryName: "Minuman botol",     isFresh: false, shelfLifeValue: 300, unit: "days"  },
    { categoryName: "Bumbu sachet",      isFresh: false, shelfLifeValue: 670, unit: "days"  },
  ];

  for (const d of defaults) {
    await db.insert(shelfLifeMaster).values({
      categoryId: `default-${d.categoryName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      categoryName: d.categoryName,
      isFresh: d.isFresh,
      shelfLifeValue: d.shelfLifeValue,
      unit: d.unit,
    }).onConflictDoNothing();
  }
  console.log("✅ Shelf life defaults seeded");
}

// ─── Feature: Calculate expiry for a new batch ───────────────────────────────
export async function calculateExpiryForBatch(
  productId: string,
  storeId: string,
  quantity: number,
  costPrice: number
): Promise<typeof inventoryBatches.$inferSelect> {
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) throw new Error(`Product ${productId} not found`);

  const [slm] = await db
    .select()
    .from(shelfLifeMaster)
    .where(eq(shelfLifeMaster.categoryId, product.categoryId))
    .limit(1);

  const now = new Date();
  let expiresAt: Date;

  if (slm) {
    const ms = slm.unit === "hours"
      ? slm.shelfLifeValue * 3_600_000
      : slm.shelfLifeValue * 86_400_000;
    expiresAt = new Date(now.getTime() + ms);
  } else {
    const days = product.shelfLife ?? 30;
    expiresAt = new Date(now.getTime() + days * 86_400_000);
  }

  const [batch] = await db.insert(inventoryBatches).values({
    storeId,
    productId,
    quantity,
    originalQuantity: quantity,
    enteredAt: now,
    expiresAt,
    status: "active",
    costPrice,
  }).returning();

  return batch;
}

// ─── Feature: FIFO stock deduction ───────────────────────────────────────────
export async function deductStockFIFO(
  productId: string,
  storeId: string,
  quantitySold: number
): Promise<string[]> {
  const activeBatches = await db
    .select()
    .from(inventoryBatches)
    .where(
      and(
        eq(inventoryBatches.storeId, storeId),
        eq(inventoryBatches.productId, productId),
        eq(inventoryBatches.status, "active")
      )
    )
    .orderBy(inventoryBatches.expiresAt);

  const affectedIds: string[] = [];
  let remaining = quantitySold;

  for (const batch of activeBatches) {
    if (remaining <= 0) break;

    const deduct = Math.min(batch.quantity, remaining);
    const newQty = batch.quantity - deduct;
    remaining -= deduct;
    affectedIds.push(batch.id);

    await db
      .update(inventoryBatches)
      .set({
        quantity: newQty,
        status: newQty === 0 ? "consumed" : "active",
        updatedAt: new Date(),
      })
      .where(eq(inventoryBatches.id, batch.id));
  }

  return affectedIds;
}

// ─── Feature 1 & 2: Expiry discount scan ─────────────────────────────────────
export async function runExpiryDiscountScan(storeId?: string): Promise<number> {
  const now = new Date();
  let created = 0;

  const allBatches = await db
    .select({
      batch: inventoryBatches,
      product: products,
    })
    .from(inventoryBatches)
    .innerJoin(products, eq(inventoryBatches.productId, products.id))
    .where(
      and(
        storeId ? eq(inventoryBatches.storeId, storeId) : undefined,
        eq(inventoryBatches.status, "active"),
        gt(inventoryBatches.quantity, 0),
        gt(inventoryBatches.expiresAt, now)
      )
    );

  for (const { batch, product } of allBatches) {
    const hoursUntilExpiry = (batch.expiresAt.getTime() - now.getTime()) / 3_600_000;

    const [existing] = await db
      .select()
      .from(expiryDiscountSuggestions)
      .where(
        and(
          eq(expiryDiscountSuggestions.batchId, batch.id),
          eq(expiryDiscountSuggestions.status, "pending")
        )
      )
      .limit(1);
    if (existing) continue;

    let discountPercent = 0;
    let suggestionType = "fresh_discount";

    if (product.isFresh) {
      if (hoursUntilExpiry < 6) discountPercent = 40;
      else if (hoursUntilExpiry < 24) discountPercent = 25;
      else if (hoursUntilExpiry < 72) discountPercent = 10;
    } else {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
      const [recentSale] = await db
        .select({ id: orderItems.id })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(
          and(
            eq(orderItems.productId, product.id),
            eq(orders.storeId, batch.storeId),
            gte(orders.createdAt, sevenDaysAgo),
            eq(orders.status, "delivered")
          )
        )
        .limit(1);

      if (recentSale) continue;

      const daysUntilExpiry = hoursUntilExpiry / 24;
      if (daysUntilExpiry < 7) discountPercent = 30;
      else if (daysUntilExpiry < 14) discountPercent = 20;
      else if (daysUntilExpiry < 30) discountPercent = 10;
      suggestionType = "packaged_discount";
    }

    if (discountPercent === 0) continue;

    const currentPrice = product.price;
    const suggestedPrice = roundToHundred(currentPrice * (1 - discountPercent / 100));
    const rupiahAtRisk = batch.quantity * batch.costPrice;

    await db.insert(expiryDiscountSuggestions).values({
      storeId: batch.storeId,
      productId: product.id,
      batchId: batch.id,
      type: suggestionType,
      suggestedDiscountPercent: discountPercent,
      currentPrice,
      suggestedPrice,
      rupiahAtRisk,
      hoursUntilExpiry: Math.round(hoursUntilExpiry),
      daysUntilExpiry: Math.round(hoursUntilExpiry / 24),
      expiresAt: batch.expiresAt,
    });

    created++;
  }

  return created;
}

// ─── Feature 3: Bundle suggestion scan ───────────────────────────────────────
export async function runBundleSuggestionScan(storeId: string): Promise<number> {
  const now = new Date();
  const fiveDaysLater = new Date(now.getTime() + 5 * 86_400_000);
  let created = 0;

  const expiringBatches = await db
    .select({
      batch: inventoryBatches,
      product: products,
      category: categories,
    })
    .from(inventoryBatches)
    .innerJoin(products, eq(inventoryBatches.productId, products.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(
        eq(inventoryBatches.storeId, storeId),
        eq(inventoryBatches.status, "active"),
        gt(inventoryBatches.quantity, 0),
        lte(inventoryBatches.expiresAt, fiveDaysLater),
        gt(inventoryBatches.expiresAt, now)
      )
    )
    .orderBy(inventoryBatches.expiresAt);

  if (expiringBatches.length < 2) return 0;

  const used = new Set<string>();
  const groups: typeof expiringBatches[] = [];

  for (let i = 0; i < expiringBatches.length; i++) {
    if (used.has(expiringBatches[i].batch.id)) continue;
    const group = [expiringBatches[i]];
    used.add(expiringBatches[i].batch.id);

    for (let j = i + 1; j < expiringBatches.length; j++) {
      if (used.has(expiringBatches[j].batch.id)) continue;
      const diffMs = Math.abs(
        expiringBatches[j].batch.expiresAt.getTime() -
        expiringBatches[i].batch.expiresAt.getTime()
      );
      if (diffMs <= 3 * 86_400_000) {
        group.push(expiringBatches[j]);
        used.add(expiringBatches[j].batch.id);
      }
    }

    if (group.length >= 2) groups.push(group);
  }

  for (const group of groups) {
    const categoryNames = group.map(g => g.category.name);
    const bundleName = generateBundleName(categoryNames);
    const possibleBundleCount = Math.min(...group.map(g => g.batch.quantity));
    if (possibleBundleCount < 1) continue;

    const normalTotal = group.reduce((s, g) => s + g.product.price, 0);
    const totalCost = group.reduce((s, g) => s + g.batch.costPrice, 0);
    const suggestedBundlePrice = roundToHundred(totalCost * 1.10);
    const minimumBundlePrice = roundToHundred(totalCost * 1.05);
    const discountPercent = Math.floor((1 - suggestedBundlePrice / normalTotal) * 100);

    if (discountPercent < 15) continue;

    const productIds = group.map(g => g.product.id).sort().join(",");
    const existingBundles = await db
      .select()
      .from(bundleSuggestions)
      .where(
        and(
          eq(bundleSuggestions.storeId, storeId),
          eq(bundleSuggestions.status, "pending")
        )
      );

    const alreadyExists = existingBundles.some(b => {
      const existingIds = (b.items as any[]).map((i: any) => i.productId).sort().join(",");
      return existingIds === productIds;
    });
    if (alreadyExists) continue;

    const earliestExpiry = group.reduce(
      (min, g) => g.batch.expiresAt < min ? g.batch.expiresAt : min,
      group[0].batch.expiresAt
    );
    const rupiahAtRisk = group.reduce((s, g) => s + g.batch.quantity * g.batch.costPrice, 0);

    await db.insert(bundleSuggestions).values({
      storeId,
      suggestedName: bundleName,
      items: group.map(g => ({
        productId: g.product.id,
        productName: g.product.name,
        quantity: 1,
        unitCostPrice: g.batch.costPrice,
        unitPrice: g.product.price,
      })),
      normalTotal,
      suggestedBundlePrice,
      minimumBundlePrice,
      discountPercent,
      rupiahAtRisk,
      possibleBundleCount,
      earliestExpiry,
    });

    created++;
  }

  return created;
}

// ─── Feature 6: Dead stock scan ──────────────────────────────────────────────
export async function runDeadStockScan(storeId: string): Promise<void> {
  const now = new Date();

  const inventory = await db
    .select({ inv: storeInventory, prod: products })
    .from(storeInventory)
    .innerJoin(products, eq(storeInventory.productId, products.id))
    .where(
      and(
        eq(storeInventory.storeId, storeId),
        gt(storeInventory.stockCount, 0)
      )
    );

  for (const { inv, prod } of inventory) {
    const [lastOrder] = await db
      .select({ createdAt: orders.createdAt })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orderItems.productId, prod.id),
          eq(orders.storeId, storeId),
          eq(orders.status, "delivered")
        )
      )
      .orderBy(desc(orders.createdAt))
      .limit(1);

    const daysSinceLastSale = lastOrder
      ? Math.floor((now.getTime() - lastOrder.createdAt.getTime()) / 86_400_000)
      : 999;

    if (daysSinceLastSale < 7) {
      await db
        .update(deadStockAlerts)
        .set({ status: "resolved", resolvedAt: now, updatedAt: now })
        .where(
          and(
            eq(deadStockAlerts.storeId, storeId),
            eq(deadStockAlerts.productId, prod.id),
            eq(deadStockAlerts.status, "active")
          )
        );
      continue;
    }

    const thirtyDaysLater = new Date(now.getTime() + 30 * 86_400_000);
    const [expiringBatch] = await db
      .select()
      .from(inventoryBatches)
      .where(
        and(
          eq(inventoryBatches.storeId, storeId),
          eq(inventoryBatches.productId, prod.id),
          eq(inventoryBatches.status, "active"),
          lte(inventoryBatches.expiresAt, thirtyDaysLater),
          gt(inventoryBatches.expiresAt, now)
        )
      )
      .limit(1);

    let severity: string;
    if (expiringBatch && daysSinceLastSale >= 14) severity = "critical";
    else if (daysSinceLastSale >= 14) severity = "red";
    else severity = "yellow";

    const rupiahAtRisk = inv.stockCount * prod.costPrice;

    const [existingAlert] = await db
      .select()
      .from(deadStockAlerts)
      .where(
        and(
          eq(deadStockAlerts.storeId, storeId),
          eq(deadStockAlerts.productId, prod.id),
          eq(deadStockAlerts.status, "active")
        )
      )
      .limit(1);

    if (existingAlert) {
      await db
        .update(deadStockAlerts)
        .set({ daysSinceLastSale, currentStock: inv.stockCount, rupiahAtRisk, severity, hasExpiryRisk: !!expiringBatch, updatedAt: now })
        .where(eq(deadStockAlerts.id, existingAlert.id));
    } else {
      await db.insert(deadStockAlerts).values({
        storeId, productId: prod.id, daysSinceLastSale,
        currentStock: inv.stockCount, rupiahAtRisk, severity,
        hasExpiryRisk: !!expiringBatch,
      });
    }
  }
}

// ─── Feature 4: Overstock scan ───────────────────────────────────────────────
export async function runOverstockScan(storeId: string): Promise<number> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  let created = 0;

  const inventory = await db
    .select({ inv: storeInventory, prod: products })
    .from(storeInventory)
    .innerJoin(products, eq(storeInventory.productId, products.id))
    .where(and(eq(storeInventory.storeId, storeId), gt(storeInventory.stockCount, 0)));

  for (const { inv, prod } of inventory) {
    const salesRows = await db
      .select({ qty: orderItems.quantity })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orderItems.productId, prod.id),
          eq(orders.storeId, storeId),
          gte(orders.createdAt, thirtyDaysAgo),
          eq(orders.status, "delivered")
        )
      );

    const totalSold = salesRows.reduce((s, r) => s + r.qty, 0);
    const dailyVelocity = totalSold / 30;
    if (dailyVelocity <= 0) continue;

    const daysOfStock = inv.stockCount / dailyVelocity;
    let discountPercent = 0;
    if (daysOfStock >= 60) discountPercent = 15;
    else if (daysOfStock >= 30) discountPercent = 10;
    else continue;

    const [existing] = await db
      .select()
      .from(expiryDiscountSuggestions)
      .where(
        and(
          eq(expiryDiscountSuggestions.storeId, storeId),
          eq(expiryDiscountSuggestions.productId, prod.id),
          eq(expiryDiscountSuggestions.type, "overstock"),
          eq(expiryDiscountSuggestions.status, "pending")
        )
      )
      .limit(1);
    if (existing) continue;

    const [oldestBatch] = await db
      .select()
      .from(inventoryBatches)
      .where(
        and(
          eq(inventoryBatches.storeId, storeId),
          eq(inventoryBatches.productId, prod.id),
          eq(inventoryBatches.status, "active")
        )
      )
      .orderBy(inventoryBatches.expiresAt)
      .limit(1);

    if (!oldestBatch) continue;

    const currentPrice = prod.price;
    const suggestedPrice = roundToHundred(currentPrice * (1 - discountPercent / 100));
    const rupiahAtRisk = inv.stockCount * prod.costPrice;

    await db.insert(expiryDiscountSuggestions).values({
      storeId,
      productId: prod.id,
      batchId: oldestBatch.id,
      type: "overstock",
      suggestedDiscountPercent: discountPercent,
      currentPrice,
      suggestedPrice,
      rupiahAtRisk,
      daysUntilExpiry: Math.round(daysOfStock),
      expiresAt: new Date(now.getTime() + 90 * 86_400_000),
    });
    created++;
  }

  return created;
}

// ─── Feature 5: Loss summary ─────────────────────────────────────────────────
export async function getLossSummary(storeId: string): Promise<{
  totalAtRisk: number;
  freshAtRisk: number;
  packagedAtRisk: number;
  savedToday: number;
  pendingSuggestionsCount: number;
  criticalAlertsCount: number;
}> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const activeBatches = await db
    .select({ batch: inventoryBatches, product: products })
    .from(inventoryBatches)
    .innerJoin(products, eq(inventoryBatches.productId, products.id))
    .where(
      and(
        eq(inventoryBatches.storeId, storeId),
        eq(inventoryBatches.status, "active"),
        gt(inventoryBatches.quantity, 0),
        gt(inventoryBatches.expiresAt, now)
      )
    );

  let freshAtRisk = 0;
  let packagedAtRisk = 0;

  for (const { batch, product } of activeBatches) {
    const hoursLeft = (batch.expiresAt.getTime() - now.getTime()) / 3_600_000;
    const risk = batch.quantity * batch.costPrice;
    if (product.isFresh && hoursLeft < 72) freshAtRisk += risk;
    else if (!product.isFresh && hoursLeft < 720) packagedAtRisk += risk; // 30 days
  }

  const approvedToday = await db
    .select()
    .from(expiryDiscountSuggestions)
    .where(
      and(
        eq(expiryDiscountSuggestions.storeId, storeId),
        eq(expiryDiscountSuggestions.status, "approved"),
        gte(expiryDiscountSuggestions.approvedAt!, startOfDay)
      )
    );

  const savedToday = approvedToday.reduce((sum, s) => {
    const priceDiff = s.currentPrice - s.suggestedPrice;
    const estimatedUnits = s.rupiahAtRisk > 0 ? Math.round(s.rupiahAtRisk / s.currentPrice) : 0;
    return sum + priceDiff * estimatedUnits;
  }, 0);

  const [pendingCount] = await db
    .select({ count: expiryDiscountSuggestions.id })
    .from(expiryDiscountSuggestions)
    .where(and(eq(expiryDiscountSuggestions.storeId, storeId), eq(expiryDiscountSuggestions.status, "pending")));

  const [bundleCount] = await db
    .select({ count: bundleSuggestions.id })
    .from(bundleSuggestions)
    .where(and(eq(bundleSuggestions.storeId, storeId), eq(bundleSuggestions.status, "pending")));

  const criticalAlertsList = await db
    .select({ id: deadStockAlerts.id })
    .from(deadStockAlerts)
    .where(
      and(
        eq(deadStockAlerts.storeId, storeId),
        eq(deadStockAlerts.status, "active"),
        eq(deadStockAlerts.severity, "critical")
      )
    );

  const pendingSuggestionsCount =
    (await db.select().from(expiryDiscountSuggestions).where(and(eq(expiryDiscountSuggestions.storeId, storeId), eq(expiryDiscountSuggestions.status, "pending")))).length +
    (await db.select().from(bundleSuggestions).where(and(eq(bundleSuggestions.storeId, storeId), eq(bundleSuggestions.status, "pending")))).length;

  return {
    totalAtRisk: freshAtRisk + packagedAtRisk,
    freshAtRisk: Math.round(freshAtRisk),
    packagedAtRisk: Math.round(packagedAtRisk),
    savedToday: Math.round(savedToday),
    pendingSuggestionsCount,
    criticalAlertsCount: criticalAlertsList.length,
  };
}

// ─── Approve discount suggestion ─────────────────────────────────────────────
export async function approveSuggestion(
  suggestionId: string,
  approvingUserId: string
): Promise<typeof promotions.$inferSelect> {
  const [suggestion] = await db
    .select()
    .from(expiryDiscountSuggestions)
    .where(eq(expiryDiscountSuggestions.id, suggestionId))
    .limit(1);

  if (!suggestion) throw new Error("Suggestion not found");

  await db
    .update(storeInventory)
    .set({ priceOverride: suggestion.suggestedPrice })
    .where(
      and(
        eq(storeInventory.storeId, suggestion.storeId),
        eq(storeInventory.productId, suggestion.productId)
      )
    );

  await db
    .update(products)
    .set({ originalPrice: suggestion.currentPrice })
    .where(
      and(
        eq(products.id, suggestion.productId),
        isNull(products.originalPrice)
      )
    );

  const [promotion] = await db.insert(promotions).values({
    title: "Diskon Menjelang Kadaluarsa",
    description: `Diskon ${suggestion.suggestedDiscountPercent}% untuk produk mendekati tanggal kadaluarsa`,
    type: "percentage",
    discountValue: suggestion.suggestedDiscountPercent,
    applicableProductIds: [suggestion.productId],
    storeId: suggestion.storeId,
    createdBy: approvingUserId,
    scope: "store",
    isActive: true,
    validFrom: new Date(),
    validUntil: suggestion.expiresAt,
    isFeatured: false,
    showInBanner: true,
    icon: "tag",
    color: "#ef4444",
    priority: 10,
    userLimit: 999,
  }).returning();

  await db
    .update(expiryDiscountSuggestions)
    .set({ status: "approved", approvedAt: new Date(), promotionId: promotion.id })
    .where(eq(expiryDiscountSuggestions.id, suggestionId));

  return promotion;
}

// ─── Approve bundle ───────────────────────────────────────────────────────────
export async function approveBundle(
  bundleId: string,
  approvingUserId: string,
  finalPrice?: number
): Promise<typeof promotions.$inferSelect> {
  const [bundle] = await db
    .select()
    .from(bundleSuggestions)
    .where(eq(bundleSuggestions.id, bundleId))
    .limit(1);

  if (!bundle) throw new Error("Bundle not found");

  const bundlePrice = finalPrice ?? bundle.suggestedBundlePrice;

  const [promotion] = await db.insert(promotions).values({
    title: bundle.suggestedName,
    description: "Paket bundle hemat — beli bersama lebih murah!",
    type: "bundle",
    discountValue: bundle.discountPercent,
    bundleItems: bundle.items,
    bundlePrice,
    storeId: bundle.storeId,
    createdBy: approvingUserId,
    scope: "store",
    isActive: true,
    validFrom: new Date(),
    validUntil: bundle.earliestExpiry,
    isFeatured: true,
    showInBanner: true,
    icon: "gift",
    color: "#8b5cf6",
    priority: 15,
    usageLimit: bundle.possibleBundleCount,
    userLimit: 999,
  }).returning();

  await db
    .update(bundleSuggestions)
    .set({
      status: finalPrice ? "price_adjusted" : "approved",
      approvedAt: new Date(),
      finalPrice: bundlePrice,
      promotionId: promotion.id,
    })
    .where(eq(bundleSuggestions.id, bundleId));

  return promotion;
}

// ─── Query helpers for routes ─────────────────────────────────────────────────
export async function getPendingExpirySuggestions(storeId: string) {
  return db
    .select({
      suggestion: expiryDiscountSuggestions,
      productName: products.name,
    })
    .from(expiryDiscountSuggestions)
    .innerJoin(products, eq(expiryDiscountSuggestions.productId, products.id))
    .where(
      and(
        eq(expiryDiscountSuggestions.storeId, storeId),
        eq(expiryDiscountSuggestions.status, "pending")
      )
    )
    .orderBy(expiryDiscountSuggestions.generatedAt);
}

export async function getPendingBundleSuggestions(storeId: string) {
  return db
    .select()
    .from(bundleSuggestions)
    .where(
      and(
        eq(bundleSuggestions.storeId, storeId),
        eq(bundleSuggestions.status, "pending")
      )
    )
    .orderBy(bundleSuggestions.createdAt);
}

export async function getActiveDeadStockAlerts(storeId: string) {
  return db
    .select({
      alert: deadStockAlerts,
      productName: products.name,
    })
    .from(deadStockAlerts)
    .innerJoin(products, eq(deadStockAlerts.productId, products.id))
    .where(
      and(
        eq(deadStockAlerts.storeId, storeId),
        eq(deadStockAlerts.status, "active")
      )
    )
    .orderBy(deadStockAlerts.severity);
}