import type { Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { eq, and, gt, sql, or, gte, lte, isNull, desc } from "drizzle-orm";
import { storage } from "./storage";
import { db } from "./db";
import { 
  categories, products, vouchers, users, stores, storeStaff, 
  storeInventory, otpCodes, addresses, orders, orderItems, 
  cartItems, messages, promotions, userAssignedVouchers, 
  voucherTriggerLog, 
  voucherUsageLog,
  promotionUsageLog,             
  userPromotionUsage,      
  userVoucherUsage,
  staffEarnings,
  salaryPayments,
  storeDailyFinancials,
  appSettings,
  promotionCostLog,
  storeOwners,
  productFreshness,
  storeOwnerDailyEarnings,
} from "../shared/schema";
import { findNearestAvailableStore, getStoresWithAvailability, estimateDeliveryTime } from "./storeAvailability";
import express, { Express } from 'express';
import fs from "fs";
import path from 'path';
import multer from "multer";
import { driverLocations } from "../shared/schema";
import { userClaimedPromotions } from "../shared/schema";
import chatbotRouter from "../server/routes/chatbot"; 




// ✅ IMPORT NOTIFICATION FUNCTIONS (removed local duplicate)
import { 
  notifyPickersNewOrder, 
  notifyDriversPackedOrder,
  notifyCustomerOrderStatus,
  notifyChatMessage 
} from './notifications';

import cron from 'node-cron';

// ==================== CONFIGURATION ====================
const DEMO_USER_ID = "demo-user";

// ==================== FINANCIAL CONFIGURATION ====================
const DELIVERY_FEE = 12000; // Rp 12,000 per order
const DRIVER_BONUS_PER_DELIVERY = 4000; // Rp 4,000 per delivery
const PICKER_BONUS_PER_ORDER = 2000; // Rp 2,000 per order
const BASE_SALARY_MONTHLY = 2000000; // Rp 2,000,000 per month
const DEFAULT_PRODUCT_MARGIN = 15; // 15%
const DELIVERY_FEE_STAFF_BONUS = DRIVER_BONUS_PER_DELIVERY + PICKER_BONUS_PER_ORDER; // Rp 6,000
const DELIVERY_FEE_PROFIT = DELIVERY_FEE - DELIVERY_FEE_STAFF_BONUS; // Rp 6,000

// Multer storage configuration
const UPLOADS_PATH = path.resolve(process.cwd(), "uploads");

const chatDir = path.join(process.cwd(), "uploads", "chat");
if (!fs.existsSync(chatDir)) {
  fs.mkdirSync(chatDir, { recursive: true });
}

const chatStorage = multer.diskStorage({
  destination: chatDir,
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `chat-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});
const uploadChat = multer({ storage: chatStorage });

const fileStorage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const uploadMiddleware = multer({ storage: fileStorage });

const promotionStorage = multer.diskStorage({
  destination: "./uploads/promotions",
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `promo-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});
const uploadPromotion = multer({ storage: promotionStorage });

const promotionsDir = path.join(process.cwd(), "uploads", "promotions");
if (!fs.existsSync(promotionsDir)) {
  fs.mkdirSync(promotionsDir, { recursive: true });
}

async function checkAndAssignVouchers(
  userId: string, 
  trigger: string, 
  metadata?: { orderValue?: number; orderCount?: number }
) {
  try {
    console.log(`🎁 Checking voucher triggers for user ${userId}, trigger: ${trigger}`);

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      console.log(`❌ User not found: ${userId}`);
      return;
    }

    const eligibleVouchers = await db
      .select()
      .from(vouchers)
      .where(
        and(
          eq(vouchers.isActive, true),
          eq(vouchers.autoAssign, true),
          eq(vouchers.trigger, trigger)
        )
      );

    console.log(`📋 Found ${eligibleVouchers.length} eligible vouchers for trigger "${trigger}"`);

    for (const voucher of eligibleVouchers) {
      const existing = await db
        .select()
        .from(userAssignedVouchers)
        .where(
          and(
            eq(userAssignedVouchers.userId, userId),
            eq(userAssignedVouchers.voucherId, voucher.id),
            eq(userAssignedVouchers.isActive, true)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        console.log(`⏭️  User already has active voucher: ${voucher.title}`);
        continue;
      }

      const rules = voucher.assignmentRules as any;
      let shouldAssign = false;

      if (trigger === "first_signup") {
        shouldAssign = user.totalOrders === 0;
      } else if (trigger === "nth_order" && rules?.orderCount) {
        shouldAssign = user.totalOrders === rules.orderCount;
      } else if (trigger === "inactive_period" && rules?.inactiveDays) {
        if (!user.lastOrderAt) {
          shouldAssign = false;
        } else {
          const daysSinceLastOrder = Math.floor(
            (Date.now() - new Date(user.lastOrderAt).getTime()) / (1000 * 60 * 60 * 24)
          );
          shouldAssign = daysSinceLastOrder >= rules.inactiveDays;
        }
      } else if (trigger === "high_value_order" && rules?.minOrderValue && metadata?.orderValue) {
        shouldAssign = metadata.orderValue >= rules.minOrderValue;
      } else if (trigger === "birthday") {
        if (!user.birthdate) {
          shouldAssign = false;
        } else {
          const today = new Date();
          const bday = new Date(user.birthdate);
          shouldAssign = 
            today.getMonth() === bday.getMonth() && 
            today.getDate() === bday.getDate();
        }
      } else if (trigger === "special_event") {
        shouldAssign = true;
      }

      if (!shouldAssign) {
        console.log(`⏭️  Voucher "${voucher.title}" rules not met`);
        continue;
      }

      if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
        console.log(`⏭️  Voucher "${voucher.title}" has reached global usage limit`);
        continue;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + voucher.daysValid);

      const [assignment] = await db
        .insert(userAssignedVouchers)
        .values({
          userId,
          voucherId: voucher.id,
          assignedBy: "system",
          expiresAt,
          usageCount: 0,
          isActive: true,
        })
        .returning();

      await db.insert(voucherTriggerLog).values({
        userId,
        voucherId: voucher.id,
        trigger,
        assignedVoucherId: assignment.id,
      });

      console.log(`✅ Assigned voucher "${voucher.title}" to user ${userId}`);
      console.log(`📅 Expires: ${expiresAt.toISOString()}`);

      if (user.pushToken) {
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
              title: '🎁 New Voucher!',
              body: `You got ${voucher.title}`,
              data: {
                type: 'voucher_assigned',
                voucherId: voucher.id,
                assignedVoucherId: assignment.id,
              },
            }),
          });
          console.log(`📬 Push notification sent to user ${userId}`);
        } catch (notifError) {
          console.error(`❌ Failed to send push notification:`, notifError);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Voucher assignment error for user ${userId}:`, error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {




// 🟢 HEALTH CHECK & DEBUG ROUTE
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "alive", 
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || "not set"
  });
});


app.use("/api/chatbot", chatbotRouter);
console.log("✅ Chatbot routes mounted at /api/chatbot");



// ==================== PUSH TOKEN REGISTRATION ====================
app.post("/api/users/push-token", async (req, res) => {
  try {
    const { userId, token } = req.body;
    
    if (!userId || !token) {
      return res.status(400).json({ error: "userId and token required" });
    }

    await db.update(users)
      .set({ pushToken: token })
      .where(eq(users.id, userId));

    console.log(`✅ Push token saved for user ${userId}`);
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Failed to save push token:", error);
    res.status(500).json({ error: "Failed to save token" });
  }
});
  
  // ==================== 2. STATIC FILES ====================
  app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  // Replace those long ../../../ paths with this:



// ✅ FIX 2: UPDATE PRODUCT (Use costPrice, not price)
app.post("/api/picker/inventory/update", uploadMiddleware.single("image"), async (req: Request, res: Response) => {
  try {
    const { 
      inventoryId, 
      userId, 
      stock, 
      costPrice,    // ✅ Update cost, price recalculates automatically
      margin,       // ✅ Update margin, price recalculates automatically
      name, 
      brand, 
      description, 
      categoryId, 
      originalPrice 
    } = req.body;

    console.log("📦 Update request:", { inventoryId, userId, costPrice, margin });

    if (!inventoryId || !userId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Update inventory stock
    await storage.updateStoreInventory(inventoryId, parseInt(stock) || 0, true);

    // Find the product
    const invRecords = await db.select().from(storeInventory).where(eq(storeInventory.id, inventoryId));
    
    if (invRecords.length > 0) {
      const updateData: any = {
        name,
        brand,
        description,
        categoryId
      };

      // ✅ IF COST PRICE CHANGED, DATABASE TRIGGER RECALCULATES SELLING PRICE
      if (costPrice && costPrice.trim() !== "") {
        const cost = parseInt(costPrice);
        if (cost <= 0) {
          return res.status(400).json({ 
            error: "Cost price must be greater than 0" 
          });
        }
        updateData.costPrice = cost;
        console.log(`💰 Cost price updated to Rp${cost}, selling price will auto-recalculate`);
      }

      // ✅ IF MARGIN CHANGED, DATABASE TRIGGER RECALCULATES SELLING PRICE
      if (margin && margin.trim() !== "") {
        const newMargin = parseFloat(margin);
        if (newMargin < 0) {
          return res.status(400).json({ 
            error: "Margin cannot be negative" 
          });
        }
        updateData.margin = newMargin;
        console.log(`💰 Margin updated to ${newMargin}%, selling price will auto-recalculate`);
      }

      // Update original price if provided
      if (originalPrice && originalPrice.trim() !== "") {
        const origPrice = parseInt(originalPrice);
        if (origPrice > 0) {
          updateData.originalPrice = origPrice;
        }
      }

      // Update image if uploaded
      if (req.file) {
        updateData.image = `/uploads/${req.file.filename}`;
      }

      // ✅ Database trigger handles price calculation on UPDATE
      const [updated] = await db
        .update(products)
        .set(updateData)
        .where(eq(products.id, invRecords[0].productId))
        .returning();
      
      console.log("✅ Product updated successfully");
      
      if (updated && (updateData.costPrice || updateData.margin)) {
        console.log(`💰 Auto-pricing result: Cost Rp${updated.costPrice} × ${updated.margin}% → Selling Rp${updated.price}`);
      }
    }

    res.json({ 
      success: true, 
      message: "Product updated with automatic pricing"
    });
  } catch (error) {
    console.error("❌ Update error:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Update failed"
    });
  }
});



  // ==================== 3. AUTHENTICATION ROUTES ====================
  console.log("🔐 Registering auth routes...");
  
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, phone } = req.body;
      if (!username || !password) return res.status(400).json({ error: "Username and password required" });
      if (username.length < 3) return res.status(400).json({ error: "Username must be 3+ characters" });
      if (password.length < 4) return res.status(400).json({ error: "Password must be 4+ characters" });
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) return res.status(400).json({ error: "Username taken" });
      
      const newUser = await storage.createUser({ username, password, phone: phone || null, role: "customer" });
      res.json({ user: { id: newUser.id, username: newUser.username, phone: newUser.phone, role: newUser.role } });
    } catch (error) {
      console.error("❌ Register error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

app.post("/api/auth/login", async (req, res) => {
  const { phone, password } = req.body;
  
  console.log("🔐 Login attempt for phone:", phone);
  
  const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  const user = result[0];

  if (!user || user.password !== password) {
    console.log("❌ Login failed - invalid credentials");
    return res.status(401).json({ error: "Invalid phone or password" });
  }
  
  // ✅ Check if store owner or staff needs to reset password on first login
  const requiresPasswordReset = ["picker", "driver", "store_owner"].includes(user.role) && user.firstLogin;
  
  if (requiresPasswordReset) {
    console.log("⚠️ First login detected - redirecting to password reset");
    return res.json({ 
      error: "first_login_required",
      user: { 
        id: user.id, 
        phone: user.phone, 
        role: user.role,
        firstLogin: true
      }
    });
  }
  
  console.log("✅ Login successful for user:", user.id, "Role:", user.role);
  
  res.json({ 
    user: { 
      id: user.id, 
      username: user.username, 
      phone: user.phone, 
      role: user.role,
      firstLogin: user.firstLogin || false
    }
  });
});

app.post("/api/auth/check-phone", async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: "Phone number required" });
    }

    console.log("🔍 Checking phone:", phone);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (!user) {
      console.log("❌ User not found");
      return res.json({ 
        exists: false,
        message: "No account found with this number. Please sign up."
      });
    }

    console.log("✅ User found:", user.id, "Role:", user.role, "FirstLogin:", user.firstLogin);

    // ✅ Check if it's staff OR store owner who needs to reset password
    const isStaffOrOwner = ["picker", "driver", "store_owner"].includes(user.role);
    const requiresPasswordReset = isStaffOrOwner && user.firstLogin === true;

    return res.json({
      exists: true,
      firstLogin: user.firstLogin || false,
      isStaff: isStaffOrOwner,
      role: user.role, // ✅ Include role so app knows it's a store owner
      requiresPasswordReset,
      message: requiresPasswordReset 
        ? "Please set your new password" 
        : "Account found"
    });

  } catch (error) {
    console.error("❌ Check phone error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/reset-first-login", async (req, res) => {
  try {
    const { phone, newPassword } = req.body;
    
    if (!phone || !newPassword) {
      return res.status(400).json({ error: "Phone and new password required" });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters" });
    }

    console.log("🔄 Resetting first login password for:", phone);

    // Update password and mark firstLogin as false
    const [updated] = await db
      .update(users)
      .set({ 
        password: newPassword,
        firstLogin: false 
      })
      .where(eq(users.phone, phone))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("✅ Password reset successful for user:", updated.id);

    res.json({ 
      success: true,
      user: {
        id: updated.id,
        username: updated.username,
        phone: updated.phone,
        role: updated.role,
        firstLogin: false
      }
    });
  } catch (error) {
    console.error("❌ Reset first login password error:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});



  // 1. Updated OTP Send: Check if user exists based on mode
app.post("/api/auth/otp/send", async (req, res) => {
  try {
    const { phone, mode } = req.body; // mode: 'signup' | 'forgot' | 'login'
    if (!phone) return res.status(400).json({ error: "Phone required" });

    const existingUser = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

    // Alert logic: If signup and user exists, or if forgot and user doesn't exist
    if (mode === "signup" && existingUser.length > 0) {
      return res.status(400).json({ error: "This phone number is already registered. Please login instead." });
    }
    if (mode === "forgot" && existingUser.length === 0) {
      return res.status(400).json({ error: "No account found with this phone number." });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    
    await db.insert(otpCodes).values({ phone, code, expiresAt });

    res.json({ success: true, code, message: "OTP sent" });
  } catch (error) {
    console.error("❌ OTP send error:", error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// 2. Updated OTP Verify: Handle Password Reset and Registration
// ===== CORRECTED OTP VERIFY ROUTE =====
// Place this in your routes.ts file replacing the existing one

app.post("/api/auth/otp/verify", async (req, res) => {
  try {
    const { phone, code, name, email, password, mode } = req.body;
    if (!phone || !code) return res.status(400).json({ error: "Phone and code required" });

    const validOtp = await db.select().from(otpCodes)
      .where(and(
        eq(otpCodes.phone, phone), 
        eq(otpCodes.code, code), 
        eq(otpCodes.verified, false), 
        gt(otpCodes.expiresAt, new Date())
      ))
      .limit(1);

    if (!validOtp.length) return res.status(400).json({ error: "Invalid or expired OTP" });

    await db.update(otpCodes).set({ verified: true }).where(eq(otpCodes.id, validOtp[0].id));

    const existingUsers = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    let user;
    let userJustCreated = false;

    if (existingUsers.length > 0) {
      // UPDATE EXISTING USER
      const updatedUsers = await db.update(users)
        .set({ 
          password: password || existingUsers[0].password,
          email: email || existingUsers[0].email,
          username: name || existingUsers[0].username,
          firstLogin: false // ✅ Password reset via OTP = not first login anymore
        })
        .where(eq(users.phone, phone))
        .returning();
      user = updatedUsers[0];
    } else {
      // CREATE NEW USER
      const isSuperAdmin = phone === '+6288289943397';
      const timestamp = Date.now().toString().slice(-4);
      const safeUsername = name ? `${name}_${timestamp}` : `user_${phone.slice(-4)}_${timestamp}`;

      const newUser = await db.insert(users).values({
        username: safeUsername,
        password: password,
        phone,
        email: email || null,
        role: isSuperAdmin ? "admin" : "customer",
        firstLogin: false, // ✅ New users don't need password reset
        isNewUser: true,
        totalOrders: 0,
        totalSpent: 0,
      }).returning();
      user = newUser[0];
      userJustCreated = true;
    }

    const staffRecord = await storage.getStoreStaffByUserId(user.id);
    let staffInfo = null;
    if (staffRecord) {
      const store = await storage.getStoreById(staffRecord.storeId);
      staffInfo = { 
        storeId: staffRecord.storeId, 
        storeName: store?.name || "Unknown", 
        role: staffRecord.role, 
        status: staffRecord.status 
      };
    }

    // 🎁 AUTO-ASSIGN WELCOME VOUCHER if new user
    if (userJustCreated) {
      setTimeout(() => {
        checkAndAssignVouchers(user!.id, "first_signup");
      }, 2000);
    }

    res.json({ 
      user: { 
        id: user.id, 
        username: user.username, 
        phone: user.phone, 
        email: user.email, 
        role: user.role,
        firstLogin: user.firstLogin || false
      }, 
      staffInfo 
    });

  } catch (error: any) {
    console.error("❌ OTP verify error details:", error);
    
    if (error.code === '23505') {
      return res.status(400).json({ error: "Username or Phone already exists in system." });
    }
    
    res.status(500).json({ error: "Verification failed internally" });
  }
});



  // ==================== 4. PICKER ROUTES (BEFORE /api/orders) ====================
console.log("📦 Registering picker routes...");



app.get("/api/picker/dashboard", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const [staff] = await db
      .select()
      .from(storeStaff)
      .where(eq(storeStaff.userId, userId as string));

    if (!staff) {
      return res.json({
        store: null,
        orders: { pending: [], active: [], packed: [] },
      });
    }

    const storeId = staff.storeId;
    
    // ✅ Get store name
    const [storeInfo] = await db.select().from(stores).where(eq(stores.id, storeId));

    const pending = await db
      .select()
      .from(orders)
      .where(and(eq(orders.storeId, storeId), eq(orders.status, "pending")));

    const active = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.storeId, storeId),
          eq(orders.pickerId, userId as string),
          eq(orders.status, "picking")
        )
      );

    const packed = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.storeId, storeId),
          eq(orders.pickerId, userId as string),
          eq(orders.status, "packed")
        )
      );

    // ✅ Attach items AND customer info
    const attachItems = async (ordersList: any[]) => {
      return Promise.all(
        ordersList.map(async (order) => {
          // Get order items
          const items = await db
            .select({
              productId: products.id,
              name: products.name,
              image: products.image,
              quantity: orderItems.quantity,
              location: storeInventory.location,
            })
            .from(orderItems)
            .leftJoin(products, eq(orderItems.productId, products.id))
            .leftJoin(
              storeInventory,
              and(
                eq(storeInventory.productId, products.id),
                eq(storeInventory.storeId, storeId)
              )
            )
            .where(eq(orderItems.orderId, order.id));

          // ✅ Get customer info
          const [customer] = await db
            .select({
              name: users.name,
              username: users.username,
              phone: users.phone,
              email: users.email,
            })
            .from(users)
            .where(eq(users.id, order.userId));

          return { 
            ...order, 
            items,
            // ✅ Add customer info to order
            customerName: customer?.name || customer?.username || "Customer",
            customerPhone: customer?.phone,
            customerEmail: customer?.email,
          };
        })
      );
    };

    res.json({
      user: { id: userId, role: "picker" },
      store: {
        id: staff.storeId,
        name: storeInfo?.name || "Store", // ✅ Include store name
      },
      orders: {
        pending: await attachItems(pending),
        active: await attachItems(active),
        packed: await attachItems(packed),
      },
    });
  } catch (error) {
    console.error("❌ Picker dashboard error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard" });
  }
});


  app.get("/api/picker/inventory", async (req, res) => {
    try {
      console.log("🔍 Picker inventory - userId:", req.query.userId);
      const { userId } = req.query;
      if (!userId) return res.status(400).json({ error: "userId required" });
      
      const user = await storage.getUser(userId as string);
      if (!user || user.role !== "picker") return res.status(403).json({ error: "Pickers only" });
      
      const staffRecord = await storage.getStoreStaffByUserId(userId as string);
      if (!staffRecord) return res.status(404).json({ error: "Not assigned to store" });
      
      const inventory = await storage.getStoreInventoryWithProducts(staffRecord.storeId);
      console.log(`📦 ${inventory.length} items`);
      res.json(inventory);
    } catch (error) {
      console.error("❌ Picker inventory error:", error);
      res.status(500).json({ error: "Failed to fetch inventory" });
    }
  });

  app.put("/api/picker/inventory/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { userId, stockCount, isAvailable } = req.body;
      console.log(`🔄 Update inventory ${id} - user: ${userId}, stock: ${stockCount}`);
      
      if (!userId) return res.status(400).json({ error: "userId required" });
      const user = await storage.getUser(userId);
      if (!user || user.role !== "picker") return res.status(403).json({ error: "Pickers only" });
      
      const updated = await storage.updateStoreInventory(id, stockCount ?? 0, isAvailable ?? true);
      if (!updated) return res.status(404).json({ error: "Item not found" });
      
      console.log("✅ Updated");
      res.json(updated);
    } catch (error) {
      console.error("❌ Update error:", error);
      res.status(500).json({ error: "Update failed" });
    }
  });

// ==================== ROUTES.TS FIXES ====================
// Replace your picker inventory routes with these FIXED versions

// ✅ FIX 1: CREATE NEW PRODUCT (Use costPrice, not price)
app.post("/api/picker/inventory", uploadMiddleware.single("image"), async (req, res) => {
  try {
    const { 
      userId, 
      name, 
      brand, 
      description, 
      costPrice,     // ✅ SUPPLIER COST (required)
      originalPrice, // ✅ For showing discounts (optional)
      stock, 
      categoryId, 
      location,
      margin         // ✅ Optional - defaults to 15%
    } = req.body;

    console.log("📦 Creating new product:", { 
      userId, name, costPrice, margin, stock, categoryId 
    });

    // Validate required fields
    if (!userId || !name || !categoryId) {
      return res.status(400).json({ 
        error: "Missing required fields: userId, name, categoryId" 
      });
    }

    // ✅ COST PRICE IS REQUIRED
    if (!costPrice || isNaN(parseInt(costPrice)) || parseInt(costPrice) <= 0) {
      return res.status(400).json({ 
        error: "Cost price is required and must be greater than 0",
        hint: "Enter the price you paid to the supplier"
      });
    }

    // Find the store
    const [staff] = await db.select().from(storeStaff).where(eq(storeStaff.userId, userId));
    if (!staff) {
      return res.status(404).json({ error: "Store not found for this user" });
    }

    // ✅ DATABASE TRIGGER HANDLES PRICE CALCULATION
    // We only need to provide: costPrice (and optional margin)
    const productData: any = {
      name,
      brand: brand || "Generic",
      description: description || "",
      costPrice: parseInt(costPrice), // ✅ Required
      categoryId,
      image: req.file ? `/uploads/${req.file.filename}` : null,
    };

    // ✅ Optional: Custom margin (if not provided, defaults to 15%)
    if (margin && parseFloat(margin) > 0) {
      productData.margin = parseFloat(margin);
    }

    // Add originalPrice if provided
    if (originalPrice && originalPrice.trim() !== "") {
      const origPrice = parseInt(originalPrice);
      if (origPrice > 0) {
        productData.originalPrice = origPrice;
      }
    }

    console.log("💾 Creating product (price will auto-calculate):", productData);

    // ✅ Database trigger automatically calculates:
    // price = ROUND(costPrice * (1 + margin/100))
    const [newProduct] = await db.insert(products).values(productData).returning();

    console.log(`✅ Product created: ${newProduct.name}`);
    console.log(`💰 Auto-pricing: Cost Rp${newProduct.costPrice} → Selling Rp${newProduct.price} (${newProduct.margin}% margin)`);

    // Create inventory
    await db.insert(storeInventory).values({
      storeId: staff.storeId,
      productId: newProduct.id,
      stockCount: parseInt(stock) || 0,
      location: location || null,
      isAvailable: true
    });

    res.json({ 
      success: true, 
      message: "Product created with automatic pricing",
      product: {
        id: newProduct.id,
        name: newProduct.name,
        costPrice: newProduct.costPrice,
        sellingPrice: newProduct.price,
        margin: `${newProduct.margin}%`,
        profit: newProduct.price - newProduct.costPrice,
      }
    });
  } catch (error) {
    console.error("❌ Creation error:", error);
    res.status(500).json({ 
      error: "Failed to create product",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});




  // Add this to registerRoutes in server/routes.ts


app.delete("/api/picker/inventory/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    
    console.log(`🗑️ Delete request - Inventory ID: ${id}, User ID: ${userId}`);
    
    if (!userId) {
      console.log("❌ No userId provided");
      return res.status(400).json({ error: "userId required" });
    }
    
    // Verify user
    const user = await storage.getUser(userId as string);
    if (!user) {
      console.log("❌ User not found");
      return res.status(404).json({ error: "User not found" });
    }
    
    if (user.role !== "picker") {
      console.log(`❌ User role is ${user.role}, not picker`);
      return res.status(403).json({ error: "Only pickers can delete inventory" });
    }
    
    // Verify inventory item exists and belongs to picker's store
    const [staffRecord] = await db
      .select()
      .from(storeStaff)
      .where(eq(storeStaff.userId, userId as string))
      .limit(1);
    
    if (!staffRecord) {
      console.log("❌ Staff record not found");
      return res.status(403).json({ error: "Not assigned to any store" });
    }
    
    const [inventoryItem] = await db
      .select()
      .from(storeInventory)
      .where(eq(storeInventory.id, id))
      .limit(1);
    
    if (!inventoryItem) {
      console.log("❌ Inventory item not found");
      return res.status(404).json({ error: "Inventory item not found" });
    }
    
    if (inventoryItem.storeId !== staffRecord.storeId) {
      console.log("❌ Item belongs to different store");
      return res.status(403).json({ error: "This item belongs to a different store" });
    }
    
    // Delete the inventory item
    await db.delete(storeInventory).where(eq(storeInventory.id, id));
    
    console.log(`✅ Successfully deleted inventory item: ${id}`);
    res.json({ success: true, message: "Item deleted successfully" });
    
  } catch (error) {
    console.error("❌ Delete error:", error);
    res.status(500).json({ 
      error: "Delete failed", 
      details: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

app.patch("/api/orders/:id/take", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body?.userId;


    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    // ✅ 1. Get picker user (DB DIRECT — NO storage)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user || user.role !== "picker") {
      return res.status(403).json({ error: "Pickers only" });
    }

    // ✅ 2. Get store staff record
    const [staff] = await db
      .select()
      .from(storeStaff)
      .where(eq(storeStaff.userId, userId));

    if (!staff) {
      return res.status(403).json({ error: "Picker not assigned to store" });
    }

    // ✅ 3. Atomic take (LOCKED)
    const [taken] = await db
      .update(orders)
      .set({
        status: "picking",
        pickerId: userId,
      })
      .where(
        and(
          eq(orders.id, id),
          eq(orders.storeId, staff.storeId),
          eq(orders.status, "pending"),
          isNull(orders.pickerId)
        )
      )
      .returning();

    if (!taken) {
  return res.status(409).json({
    error: "Order already taken, already picked, or not pending",
  });
}

return res.status(200).json(taken);

  } catch (err) {
    console.error("❌ PICKER TAKE ERROR:", err);
    res.status(500).json({ error: "Internal error" });
  }
});


  // ==================== 5. DRIVER ROUTES ====================

console.log("🚗 Registering driver routes...");

app.get("/api/driver/dashboard", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const [staff] = await db
      .select()
      .from(storeStaff)
      .where(eq(storeStaff.userId, userId as string));

    if (!staff) {
      return res.json({
        user: { id: userId, role: "driver" },
        store: null,
        orders: { ready: [], active: [], completed: [] },
      });
    }

    // Get orders with addresses ✅ UPDATED
    const getOrdersWithAddresses = async (ordersList: any[]) => {
      return Promise.all(
        ordersList.map(async (order) => {
          // Get address details
          let addressInfo = null;
          if (order.addressId) {
            const [addr] = await db
              .select()
              .from(addresses)
              .where(eq(addresses.id, order.addressId))
              .limit(1);
            
            if (addr) {
              addressInfo = {
                label: addr.label,
                fullAddress: addr.fullAddress,
                details: addr.details,
              };
            }
          }

          return { ...order, address: addressInfo };
        })
      );
    };

    const activeOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.driverId, userId as string),
          eq(orders.status, "delivering"),
          eq(orders.storeId, staff.storeId)
        )
      );

    const readyOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, "packed"),
          isNull(orders.driverId),
          eq(orders.storeId, staff.storeId)
        )
      );

    const completedOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.driverId, userId as string),
          eq(orders.status, "delivered"),
          eq(orders.storeId, staff.storeId)
        )
      );

    res.json({
      user: { id: userId, role: "driver" },
      store: staff.storeId,
      staffRecord: { status: "online" },
      orders: {
        ready: await getOrdersWithAddresses(readyOrders),
        active: await getOrdersWithAddresses(activeOrders),
        completed: await getOrdersWithAddresses(completedOrders),
      },
    });
  } catch (error) {
    console.error("❌ Driver dashboard error:", error);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});


app.put("/api/driver/orders/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, userId } = req.body;

    if (!status || !userId) {
      return res.status(400).json({ error: "Missing status or userId" });
    }

    const [staff] = await db
      .select()
      .from(storeStaff)
      .where(eq(storeStaff.userId, userId));

    if (!staff) {
      return res.status(403).json({ error: "Driver not assigned to store" });
    }

    if (status === "delivering") {
      const [picked] = await db
        .update(orders)
        .set({ status: "delivering", driverId: userId })
        .where(
          and(
            eq(orders.id, id),
            eq(orders.storeId, staff.storeId),
            eq(orders.status, "packed"),
            isNull(orders.driverId)
          )
        )
        .returning();

      if (!picked) {
        return res.status(409).json({ error: "Order already taken or not available" });
      }

      // 🔔 NOTIFY CUSTOMER ORDER IS OUT FOR DELIVERY
      await notifyCustomerOrderStatus(picked.id, "delivering");

      return res.json(picked);
    }

    const [completed] = await db
      .update(orders)
      .set({ status })
      .where(
        and(
          eq(orders.id, id),
          eq(orders.driverId, userId),
          eq(orders.storeId, staff.storeId)
        )
      )
      .returning();

    if (!completed) {
      return res.status(403).json({ error: "Order not accessible" });
    }

    // 🔔 NOTIFY CUSTOMER OF STATUS CHANGE
    await notifyCustomerOrderStatus(completed.id, status);

    res.json(completed);
  } catch (error) {
    console.error("❌ Driver order update error:", error);
    res.status(500).json({ error: "Update failed" });
  }
});

// neew routes

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of Earth in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

app.get("/api/geocode/reverse", async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: "lat and lng required" });
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      { headers: { "User-Agent": "ZendOApp" } }
    );
    
    const data = await response.json();
    
    const address = data.address || {};
    const locationName = 
      address.neighbourhood || 
      address.suburb || 
      address.village ||
      address.city_district ||
      address.city ||
      address.county ||
      "Current Location";
    
    res.json({ 
      locationName: String(locationName),
      fullAddress: data.display_name 
    });
  } catch (error) {
    console.error("Geocoding error:", error);
    res.json({ 
      locationName: "Current Location",
      fullAddress: "Location unavailable"
    });
  }
});

app.post("/api/driver/location/update", async (req, res) => {
  try {
    const { driverId, orderId, latitude, longitude, heading, speed, accuracy } = req.body;

    if (!driverId || !latitude || !longitude) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify driver is assigned to this order
    const [order] = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.id, orderId),
        eq(orders.driverId, driverId),
        eq(orders.status, "delivering")
      ))
      .limit(1);

    if (!order) {
      return res.status(403).json({ error: "Not authorized or order not active" });
    }

    // Save location update
    const [location] = await db
      .insert(driverLocations)
      .values({
        driverId,
        orderId,
        latitude: String(latitude),
        longitude: String(longitude),
        heading: heading ? String(heading) : null,
        speed: speed ? String(speed) : null,
        accuracy: accuracy ? String(accuracy) : null,
      })
      .returning();

    // Calculate ETA based on distance and speed
    const customerLat = parseFloat(order.customerLat || "0");
    const customerLng = parseFloat(order.customerLng || "0");
    const driverLat = parseFloat(latitude);
    const driverLng = parseFloat(longitude);

    const distance = calculateDistance(driverLat, driverLng, customerLat, customerLng);
    const avgSpeed = speed ? parseFloat(speed) : 5; // Default 5 m/s if no speed data
    const etaMinutes = Math.ceil((distance * 1000) / (avgSpeed * 60)); // Convert km to meters, then to minutes

    // Update order with ETA
    await db
      .update(orders)
      .set({ 
        estimatedArrival: new Date(Date.now() + etaMinutes * 60000),
        actualDistance: String(distance)
      })
      .where(eq(orders.id, orderId));

    res.json({ 
      success: true, 
      etaMinutes,
      distance: distance.toFixed(2)
    });
  } catch (error) {
    console.error("❌ Location update error:", error);
    res.status(500).json({ error: "Failed to update location" });
  }
});

// 📍 Customer: Get driver's latest location
app.get("/api/driver/location/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    // Get the order
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (!order.driverId) {
      return res.json({ 
        hasDriver: false,
        message: "No driver assigned yet"
      });
    }

    // Get latest driver location
    const locations = await db
      .select()
      .from(driverLocations)
      .where(eq(driverLocations.orderId, orderId))
      .orderBy(sql`${driverLocations.timestamp} DESC`)
      .limit(1);

    if (!locations.length) {
      return res.json({ 
        hasDriver: true,
        driverId: order.driverId,
        hasLocation: false,
        message: "Driver location not available yet"
      });
    }

    const location = locations[0];

    // Calculate distance to customer
    const customerLat = parseFloat(order.customerLat || "0");
    const customerLng = parseFloat(order.customerLng || "0");
    const driverLat = parseFloat(location.latitude);
    const driverLng = parseFloat(location.longitude);

    const distance = calculateDistance(driverLat, driverLng, customerLat, customerLng);

    res.json({
      hasDriver: true,
      hasLocation: true,
      driverId: order.driverId,
      location: {
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude),
        heading: location.heading ? parseFloat(location.heading) : null,
        speed: location.speed ? parseFloat(location.speed) : null,
        accuracy: location.accuracy ? parseFloat(location.accuracy) : null,
        timestamp: location.timestamp,
      },
      distance: parseFloat(distance.toFixed(2)),
      estimatedArrival: order.estimatedArrival,
    });
  } catch (error) {
    console.error("❌ Get driver location error:", error);
    res.status(500).json({ error: "Failed to get location" });
  }
});

// 🗺️ Get route history for order
app.get("/api/driver/route/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    const route = await db
      .select()
      .from(driverLocations)
      .where(eq(driverLocations.orderId, orderId))
      .orderBy(sql`${driverLocations.timestamp} ASC`);

    const coordinates = route.map(loc => ({
      latitude: parseFloat(loc.latitude),
      longitude: parseFloat(loc.longitude),
      timestamp: loc.timestamp,
    }));

    res.json({ coordinates });
  } catch (error) {
    console.error("❌ Get route error:", error);
    res.status(500).json({ error: "Failed to get route" });
  }
});



// ==================== STAFF EARNINGS DASHBOARD ====================

// GET TODAY'S EARNINGS WITH MOTIVATION
app.get("/api/staff/earnings/today", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const today = getTodayMidnight();
    const { month, year } = getCurrentPeriod();

    const [todayEarning] = await db
      .select()
      .from(staffEarnings)
      .where(
        and(
          eq(staffEarnings.staffId, userId as string),
          eq(staffEarnings.date, today)
        )
      )
      .limit(1);

    const monthStart = new Date(year, month - 1, 1);
    monthStart.setHours(0, 0, 0, 0);

    const monthEarnings = await db
      .select({
        totalBonus: sql<string>`SUM(${staffEarnings.bonusEarned})`,
        totalOrders: sql<number>`SUM(${staffEarnings.ordersCompleted})::int`,
        totalDeliveries: sql<number>`SUM(${staffEarnings.deliveriesCompleted})::int`,
      })
      .from(staffEarnings)
      .where(
        and(
          eq(staffEarnings.staffId, userId as string),
          gte(staffEarnings.date, monthStart)
        )
      );

    const monthlyBonus = parseFloat(monthEarnings[0]?.totalBonus || "0");
    const projectedMonthlyTotal = BASE_SALARY_MONTHLY + monthlyBonus;

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const [yesterdayEarning] = await db
      .select()
      .from(staffEarnings)
      .where(
        and(
          eq(staffEarnings.staffId, userId as string),
          eq(staffEarnings.date, yesterday)
        )
      )
      .limit(1);

    const todayBonus = parseFloat(todayEarning?.bonusEarned || "0");
    const yesterdayBonus = parseFloat(yesterdayEarning?.bonusEarned || "0");

    let motivationMessage = "";
    let motivationIcon = "";
    
    if (todayBonus > yesterdayBonus) {
      motivationMessage = "Great job! You're earning more than yesterday. Keep it up!";
      motivationIcon = "🔥";
    } else if (todayBonus < yesterdayBonus && yesterdayBonus > 0) {
      motivationMessage = "Your bonus is lower than yesterday. Let's push harder!";
      motivationIcon = "⚡";
    } else {
      motivationMessage = "Steady progress! Keep maintaining this pace.";
      motivationIcon = "💪";
    }

    res.json({
      today: {
        date: today,
        bonus: todayBonus,
        orders: todayEarning?.ordersCompleted || 0,
        deliveries: todayEarning?.deliveriesCompleted || 0,
      },
      monthToDate: {
        bonus: monthlyBonus,
        orders: monthEarnings[0]?.totalOrders || 0,
        deliveries: monthEarnings[0]?.totalDeliveries || 0,
        baseSalary: BASE_SALARY_MONTHLY,
        projectedTotal: projectedMonthlyTotal,
      },
      comparison: {
        yesterdayBonus,
        change: todayBonus - yesterdayBonus,
        percentChange: yesterdayBonus > 0 
          ? ((todayBonus - yesterdayBonus) / yesterdayBonus) * 100 
          : 0,
      },
      motivation: {
        message: motivationMessage,
        icon: motivationIcon,
      },
      rates: {
        deliveryBonus: DRIVER_BONUS_PER_DELIVERY,
        orderBonus: PICKER_BONUS_PER_ORDER,
        baseSalary: BASE_SALARY_MONTHLY,
      },
    });
  } catch (error) {
    console.error("❌ Get staff earnings error:", error);
    res.status(500).json({ error: "Failed to fetch earnings" });
  }
});

// GET EARNINGS HISTORY
app.get("/api/staff/earnings/history", async (req, res) => {
  try {
    const { userId, days = 30 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - Number(days));
    daysAgo.setHours(0, 0, 0, 0);

    const history = await db
      .select()
      .from(staffEarnings)
      .where(
        and(
          eq(staffEarnings.staffId, userId as string),
          gte(staffEarnings.date, daysAgo)
        )
      )
      .orderBy(desc(staffEarnings.date));

    res.json(history);
  } catch (error) {
    console.error("❌ Get earnings history error:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// GET SALARY PAYMENT HISTORY
app.get("/api/staff/salary/history", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const payments = await db
      .select()
      .from(salaryPayments)
      .where(eq(salaryPayments.staffId, userId as string))
      .orderBy(desc(salaryPayments.year), desc(salaryPayments.month));

    res.json(payments);
  } catch (error) {
    console.error("❌ Get salary history error:", error);
    res.status(500).json({ error: "Failed to fetch salary history" });
  }
});

// ==================== 6. CATEGORIES ====================
  console.log("📂 Registering category routes...");
  
 app.get("/api/categories", async (req, res) => {
  try {
    console.log("🟢 HIT /api/categories");

    const categories = await storage.getCategories();

    console.log("📦 Categories fetched:", categories);

    return res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (err) {
    console.error("❌ Failed to fetch categories:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
});


  app.get("/api/categories/:id", async (req, res) => {
    try {
      const category = await storage.getCategoryById(req.params.id);
      if (!category) return res.status(404).json({ error: "Category not found" });
      res.json(category);
    } catch (error) {
      console.error("❌ Category error:", error);
      res.status(500).json({ error: "Failed to fetch category" });
    }
  });

  // ==================== 7. PRODUCTS ====================
console.log("🛍️ Registering product routes...");

// Define the type of a product row returned from the query
interface HomeProductRow {
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
  storeId: string;
  storeName: string;
  distance: number;
}
app.get("/api/banners", async (req, res) => {
  try {
    // Static banners - you can easily update these anytime
    const banners = [
      {
        id: "1",
        image: "https://images.unsplash.com/photo-1671586088818-52bfbe125bae",
        title: "Fresh Groceries Delivered",
        subtitle: "Get 20% off your first order",
      },
      {
        id: "2",
        image: "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800",
        title: "AmanMart Exclusive Deals",
        subtitle: "Save big on daily essentials",
      },
      {
        id: "3",
        image: "https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?w=800",
        title: "Fast Delivery Guarantee",
        subtitle: "15 minutes or it's free",
      },
    ];
    
    res.json(banners);
  } catch (error) {
    console.error("❌ Banners error:", error);
    res.status(500).json({ error: "Failed to fetch banners" });
  }
});

// ✅ BENEFIT: No database table needed, easy to update banners
// ✅ Just change the URLs above to your own images when ready

// Enhanced /api/home/products - Include store info per product
app.get("/api/home/products", async (req: Request, res: Response) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const storeId = req.query.storeId as string | undefined;

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: "Valid lat & lng required" });
    }

    let storeFilter = sql``;
    if (storeId) {
      storeFilter = sql`AND s.id = ${storeId}`;
    }

    const result = await db.execute(sql<any>`
      SELECT
        p.id,
        p.name,
        p.brand,
        p.price,
        p.original_price AS "originalPrice",
        p.image,
        p.category_id AS "categoryId",
        p.description,
        p.nutrition,
        si.stock_count AS "stockCount",
        s.id AS "storeId",
        s.name AS "storeName",
        (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(${lat}::numeric))
              * cos(radians(s.latitude::numeric))
              * cos(radians(s.longitude::numeric) - radians(${lng}::numeric))
              + sin(radians(${lat}::numeric))
              * sin(radians(s.latitude::numeric))
            ))
          )
        ) AS distance,
        CEIL(
          (6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(${lat}::numeric))
              * cos(radians(s.latitude::numeric))
              * cos(radians(s.longitude::numeric) - radians(${lng}::numeric))
              + sin(radians(${lat}::numeric))
              * sin(radians(s.latitude::numeric))
            ))
          ) * 5) + 10
        )::integer AS "deliveryMinutes"
      FROM stores s
      JOIN store_inventory si ON si.store_id = s.id
      JOIN products p ON p.id = si.product_id
      WHERE
        s.is_active = true
        AND si.stock_count > 0
        ${storeFilter}
        AND (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(${lat}::numeric))
              * cos(radians(s.latitude::numeric))
              * cos(radians(s.longitude::numeric) - radians(${lng}::numeric))
              + sin(radians(${lat}::numeric))
              * sin(radians(s.latitude::numeric))
            ))
          )
        ) <= 5
      ORDER BY distance ASC;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("❌ /api/home/products error:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Enhanced /api/stores/nearby - Return stores with delivery time



// Enhanced /api/stores/nearby - Return stores with delivery time



app.get("/api/category/products", async (req: Request, res: Response) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const categoryId = String(req.query.categoryId);

    console.log("🟢 HIT /api/category/products", { lat, lng, categoryId });

    if (Number.isNaN(lat) || Number.isNaN(lng) || !categoryId) {
      return res.status(400).json({ error: "lat, lng, categoryId required" });
    }

    const result = await db.execute(sql`
      SELECT
        p.id,
        p.name,
        p.brand,
        p.price,
        p.original_price AS "originalPrice",
        p.image,
        p.category_id AS "categoryId",
        p.description,
        p.nutrition,
        si.stock_count AS "stockCount",
        s.name AS "storeName",
        TRUE AS "isAvailable",
        (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(${lat}::numeric))
              * cos(radians(s.latitude::numeric))
              * cos(radians(s.longitude::numeric) - radians(${lng}::numeric))
              + sin(radians(${lat}::numeric))
              * sin(radians(s.latitude::numeric))
            ))
          )
        ) AS distance
      FROM stores s
      JOIN store_inventory si ON si.store_id = s.id
      JOIN products p ON p.id = si.product_id
      WHERE
        p.category_id = ${categoryId}
        AND si.stock_count > 0
        AND s.is_active = true
        AND (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(${lat}::numeric))
              * cos(radians(s.latitude::numeric))
              * cos(radians(s.longitude::numeric) - radians(${lng}::numeric))
              + sin(radians(${lat}::numeric))
              * sin(radians(s.latitude::numeric))
            ))
          )
        ) <= 3
      ORDER BY distance ASC;
    `);

    console.log(`✅ Found ${result.rows.length} products in category ${categoryId}`);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ /api/category/products error:", error);
    console.error("Error details:", error instanceof Error ? error.message : "Unknown error");
    res.status(500).json({ 
      error: "Failed to fetch category products",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});


app.get("/api/products", async (req, res) => {
  try {
    console.log("🟢 HIT /api/products - Fetching all products");

    // Get all products from database
    const allProducts = await db.select().from(products);

    console.log(`✅ Found ${allProducts.length} products`);

    res.json(allProducts);
  } catch (error) {
    console.error("❌ /api/products error:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProductById(req.params.id);
      if (!product) return res.status(404).json({ error: "Product not found" });
      res.json(product);
    } catch (error) {
      console.error("❌ Product error:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });


  // ADD THIS RIGHT AFTER app.get("/api/products/:id", ...)
app.get("/api/products/:id/store", async (req, res) => {
  try {
    const productId = req.params.id;
    
    console.log(`🔍 Getting store for product: ${productId}`);
    
    // Get store from inventory using raw query for better debugging
    const result = await db
      .select({
        storeId: storeInventory.storeId,
        storeName: stores.name,
        storeAddress: stores.address,
      })
      .from(storeInventory)
      .leftJoin(stores, eq(storeInventory.storeId, stores.id))
      .where(eq(storeInventory.productId, productId))
      .limit(1);
    
    if (!result.length || !result[0]) {
      console.log(`❌ Product ${productId} not found in any store inventory`);
      return res.status(404).json({ 
        error: "Product not found in any store",
        productId 
      });
    }
    
    const storeInfo = result[0];
    console.log(`✅ Product ${productId} found in store: ${storeInfo.storeName} (${storeInfo.storeId})`);
    
    res.json({
      storeId: storeInfo.storeId,
      storeName: storeInfo.storeName || "Unknown Store",
      storeAddress: storeInfo.storeAddress,
    });
  } catch (error) {
    console.error("❌ Get product store error:", error);
    res.status(500).json({ 
      error: "Failed to fetch product store",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});


  // ==================== 8. CART ====================
 console.log("🛒 Registering cart routes...");

// GET CART
app.get("/api/cart", async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId required" });
    
    const items = await storage.getCartItems(userId);
    const itemsWithProducts = await Promise.all(items.map(async (item) => {
      const product = await storage.getProductById(item.productId);
      
      // ✅ Get the storeId from inventory
      let storeId = null;
      if (product) {
        const [inventory] = await db
          .select({ storeId: storeInventory.storeId })
          .from(storeInventory)
          .where(eq(storeInventory.productId, product.id))
          .limit(1);
        storeId = inventory?.storeId;
      }
      
      return { 
        ...item, 
        product,
        storeId // ✅ Include storeId in response
      };
    }));
    
    res.json(itemsWithProducts);
  } catch (error) {
    console.error("❌ Cart error:", error);
    res.status(500).json({ error: "Failed to fetch cart" });
  }
});

// ADD TO CART
app.post("/api/cart", async (req, res) => {
  try {
    const { productId, quantity = 1, userId } = req.body;
    if (!userId) return res.status(400).json({ error: "User must be logged in" });
    
    // ✅ Get the product's store
    const [inventory] = await db
      .select({ storeId: storeInventory.storeId })
      .from(storeInventory)
      .where(eq(storeInventory.productId, productId))
      .limit(1);
    
    if (!inventory) {
      return res.status(404).json({ error: "Product not available in any store" });
    }
    
    const item = await storage.addToCart({ userId, productId, quantity });
    
    // Return with storeId
    res.json({ ...item, storeId: inventory.storeId });
  } catch (error) {
    console.error("❌ Add to cart error:", error);
    res.status(500).json({ error: "Failed to add to cart" });
  }
});

// UPDATE CART ITEM
app.put("/api/cart/:id", async (req, res) => {
  try {
    const { quantity } = req.body;
    const item = await storage.updateCartItemQuantity(req.params.id, quantity);
    if (!item) return res.status(404).json({ error: "Cart item not found" });
    res.json(item);
  } catch (error) {
    console.error("❌ Update cart error:", error);
    res.status(500).json({ error: "Failed to update cart item" });
  }
});

// DELETE CART ITEM
app.delete("/api/cart/:id", async (req, res) => {
  try {
    await db.delete(cartItems).where(eq(cartItems.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Delete cart error:", error);
    res.status(500).json({ error: "Failed to remove item" });
  }
});

// CLEAR ENTIRE CART

app.delete("/api/cart", async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    console.log(`🗑️ Clearing cart for user ${userId}`);
    
    // ✅ Check if cart exists first
    const existingItems = await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.userId, userId as string));

    if (existingItems.length === 0) {
      console.log(`✅ Cart already empty for user ${userId}`);
      // Return success even if cart is already empty
      return res.json({ 
        success: true, 
        message: "Cart already empty",
        deleted: 0 
      });
    }

    // Delete cart items
    const deleted = await db
      .delete(cartItems)
      .where(eq(cartItems.userId, userId as string))
      .returning();

    console.log(`✅ Cleared ${deleted.length} items from cart for user ${userId}`);
    
    res.json({ 
      success: true, 
      message: "Cart cleared successfully",
      deleted: deleted.length 
    });
  } catch (error) {
    console.error("❌ Clear cart error:", error);
    res.status(500).json({ error: "Failed to clear cart" });
  }
});

  // ==================== CART VALIDATION ====================
app.post("/api/cart/validate", async (req, res) => {
  try {
    const { userId, latitude, longitude, items } = req.body;

    if (!latitude || !longitude || !items?.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log(`🔍 Validating ${items.length} cart items for location: ${latitude}, ${longitude}`);

    // Get nearby stores (within 5km)
    const nearbyStores = await db.execute(sql`
      SELECT id
      FROM stores
      WHERE
        is_active = true
        AND (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(${parseFloat(latitude)}::numeric))
              * cos(radians(latitude::numeric))
              * cos(radians(longitude::numeric) - radians(${parseFloat(longitude)}::numeric))
              + sin(radians(${parseFloat(latitude)}::numeric))
              * sin(radians(latitude::numeric))
            ))
          )
        ) <= 5
    `);

    const nearbyStoreIds = new Set(nearbyStores.rows.map((s: any) => s.id));
    console.log(`✅ Found ${nearbyStoreIds.size} nearby stores`);

    // Validate each cart item
    const validatedItems = [];
    const invalidItems = [];

    for (const item of items) {
      // Check if product is available in nearby stores
      const [inventory] = await db
        .select({
          storeId: storeInventory.storeId,
          stockCount: storeInventory.stockCount,
          storeName: stores.name,
        })
        .from(storeInventory)
        .leftJoin(stores, eq(storeInventory.storeId, stores.id))
        .where(
          and(
            eq(storeInventory.productId, item.productId),
            eq(storeInventory.isAvailable, true),
            gt(storeInventory.stockCount, 0)
          )
        )
        .limit(1);

      if (inventory && nearbyStoreIds.has(inventory.storeId)) {
        validatedItems.push({
          ...item,
          storeId: inventory.storeId,
          storeName: inventory.storeName,
          available: true,
        });
      } else {
        invalidItems.push({
          ...item,
          reason: inventory 
            ? "Store not in delivery range" 
            : "Product out of stock or unavailable",
          available: false,
        });
      }
    }

    console.log(`✅ Validated: ${validatedItems.length} available, ${invalidItems.length} unavailable`);

    res.json({
      valid: invalidItems.length === 0,
      validItems: validatedItems,
      invalidItems,
      nearbyStoresCount: nearbyStoreIds.size,
    });
  } catch (error) {
    console.error("❌ Cart validation error:", error);
    res.status(500).json({ error: "Failed to validate cart" });
  }
});

// FIXED VERSION - Replace lines ~2100-2170 in your routes.ts

app.post("/api/cart/cleanup", async (req, res) => {
  try {
    const { userId, latitude, longitude } = req.body;

    if (!userId || !latitude || !longitude) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log(`🧹 Cleaning up cart for user ${userId} at location: ${latitude}, ${longitude}`);

    // Get user's cart items - ✅ FIXED: Renamed to avoid shadowing
    const userCartItems = await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.userId, userId));

    if (userCartItems.length === 0) {
      return res.json({ message: "Cart is empty", removedCount: 0 });
    }

    // Get nearby stores
    const nearbyStores = await db.execute(sql`
      SELECT id
      FROM stores
      WHERE
        is_active = true
        AND (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(${parseFloat(latitude)}::numeric))
              * cos(radians(latitude::numeric))
              * cos(radians(longitude::numeric) - radians(${parseFloat(longitude)}::numeric))
              + sin(radians(${parseFloat(latitude)}::numeric))
              * sin(radians(latitude::numeric))
            ))
          )
        ) <= 5
    `);

    const nearbyStoreIds = new Set(nearbyStores.rows.map((s: any) => s.id));

    // Remove items not available in nearby stores
    const itemsToRemove = [];

    for (const item of userCartItems) {
      const [inventory] = await db
        .select()
        .from(storeInventory)
        .where(
          and(
            eq(storeInventory.productId, item.productId),
            eq(storeInventory.isAvailable, true),
            gt(storeInventory.stockCount, 0)
          )
        )
        .limit(1);

      if (!inventory || !nearbyStoreIds.has(inventory.storeId)) {
        itemsToRemove.push(item.id);
      }
    }

    if (itemsToRemove.length > 0) {
      await db
        .delete(cartItems)
        .where(
          and(
            eq(cartItems.userId, userId),
            sql`${cartItems.id} IN (${sql.join(itemsToRemove.map(id => sql`${id}`), sql`, `)})`
          )
        );
    }

    console.log(`✅ Removed ${itemsToRemove.length} unavailable items from cart`);

    res.json({
      message: `Removed ${itemsToRemove.length} items not available in your area`,
      removedCount: itemsToRemove.length,
      remainingCount: userCartItems.length - itemsToRemove.length,
    });
  } catch (error) {
    console.error("❌ Cart cleanup error:", error);
    res.status(500).json({ error: "Failed to cleanup cart" });
  }
});


  // ==================== 9. ADDRESSES ====================
  console.log("📍 Registering address routes...");
  
  app.get("/api/addresses", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: "userId required" });
      const userAddresses = await storage.getUserAddresses(userId);
      res.json(userAddresses);
    } catch (error) {
      console.error("❌ Addresses error:", error);
      res.status(500).json({ error: "Failed to fetch addresses" });
    }
  });

  app.post("/api/addresses", async (req, res) => {
    try {
      const { userId, label, fullAddress, details, latitude, longitude, isDefault } = req.body;
      if (!userId || !fullAddress || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      
      if (isDefault) {
        const existing = await storage.getUserAddresses(userId);
        for (const addr of existing) {
          if (addr.isDefault) await db.update(addresses).set({ isDefault: false }).where(eq(addresses.id, addr.id));
        }
      }
      
      const newAddress = await storage.createAddress({
        userId, label: label || "Current Location", fullAddress, details: details || null,
        latitude: String(latitude), longitude: String(longitude), isDefault: isDefault ?? true
      });
      res.status(201).json(newAddress);
    } catch (error) {
      console.error("❌ Create address error:", error);
      res.status(500).json({ error: "Failed to create address" });
    }
  });

  app.put("/api/addresses/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const { label, fullAddress, details, latitude, longitude, isDefault } = req.body;
      const existing = await db.select().from(addresses).where(eq(addresses.id, id)).limit(1);
      if (!existing.length) return res.status(404).json({ error: "Address not found" });
      
      if (isDefault) {
        await db.update(addresses).set({ isDefault: false })
          .where(and(eq(addresses.userId, existing[0].userId), sql`${addresses.id} != ${id}`));
      }
      
      const updateData: any = {};
      if (label !== undefined) updateData.label = label;
      if (fullAddress !== undefined) updateData.fullAddress = fullAddress;
      if (details !== undefined) updateData.details = details;
      if (latitude !== undefined) updateData.latitude = String(latitude);
      if (longitude !== undefined) updateData.longitude = String(longitude);
      if (isDefault !== undefined) updateData.isDefault = isDefault;
      
      const [updated] = await db.update(addresses).set(updateData).where(eq(addresses.id, id)).returning();
      res.json(updated);
    } catch (error) {
      console.error("❌ Update address error:", error);
      res.status(500).json({ error: "Failed to update address" });
    }
  });

  app.delete("/api/addresses/:id", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) return res.status(400).json({ error: "userId required" });
      const existing = await db.select().from(addresses)
        .where(and(eq(addresses.id, req.params.id), eq(addresses.userId, userId as string))).limit(1);
      if (!existing.length) return res.status(404).json({ error: "Address not found" });
      await db.delete(addresses).where(eq(addresses.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("❌ Delete address error:", error);
      res.status(500).json({ error: "Failed to delete address" });
    }
  });

  // ==================== 10. ORDERS ====================
console.log("📦 Registering order routes...");

app.post("/api/orders", async (req, res) => {
  try {
    const { 
      userId, 
      addressId, 
      items, 
      customerLat, 
      customerLng,
      paymentMethod = "midtrans",
    } = req.body;

    console.log("📦 Order request:", { 
      userId, 
      paymentMethod, 
      itemCount: items?.length,
      hasAddress: !!addressId,
      hasLocation: !!(customerLat && customerLng)
    });

    // Validation
    if (!userId || !items?.length || !customerLat || !customerLng) {
      console.log("❌ Missing required fields");
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get store for each item
    const itemsWithStore = await Promise.all(
      items.map(async (item: any) => {
        const [inv] = await db
          .select()
          .from(storeInventory)
          .where(eq(storeInventory.productId, item.productId))
          .limit(1);

        if (!inv) {
          console.log(`❌ Product not found: ${item.productId}`);
          throw new Error(`Product not available`);
        }
        
        return { ...item, storeId: inv.storeId };
      })
    );

    console.log(`✅ Found stores for ${itemsWithStore.length} items`);

    // Group by store
    const itemsByStore: Record<string, any[]> = {};
    for (const item of itemsWithStore) {
      if (!itemsByStore[item.storeId]) itemsByStore[item.storeId] = [];
      itemsByStore[item.storeId].push(item);
    }

    const createdOrders = [];
    const DELIVERY_FEE = 12000;

    // Create order per store
    for (const storeId of Object.keys(itemsByStore)) {
      const storeItems = itemsByStore[storeId];
      
      const itemsTotal = storeItems.reduce(
        (sum, i) => sum + Number(i.price) * Number(i.quantity),
        0
      );
      
      const total = itemsTotal + DELIVERY_FEE;
      const deliveryPin = Math.floor(1000 + Math.random() * 9000).toString();
      const orderNumber = `ORD-${Math.random().toString(36).toUpperCase().substring(2, 9)}`;

      console.log(`💾 Creating order for store ${storeId}:`, {
        orderNumber,
        total,
        paymentMethod
      });

      // ✅ MINIMAL ORDER - Only required fields
      const [order] = await db
        .insert(orders)
        .values({
          userId,
          storeId,
          addressId,
          subtotal: itemsTotal,
          total,
          deliveryFee: DELIVERY_FEE,
          status: "pending",
          orderNumber,
          items: storeItems,
          customerLat: String(customerLat),
          customerLng: String(customerLng),
          deliveryPin,
          paymentMethod: paymentMethod || "midtrans",
          paymentStatus: paymentMethod === "qris" ? "pending" : "paid",
          qrisConfirmed: false,
        })
        .returning();

      console.log(`✅ Order created: ${order.id}`);

      // Create order items
      await db.insert(orderItems).values(
        storeItems.map(i => ({
          orderId: order.id,
          productId: i.productId,
          quantity: i.quantity,
          priceAtEntry: String(i.price),
        }))
      );

      console.log(`✅ Order items created for order ${order.id}`);

      // Notify pickers (skip for QRIS until payment confirmed)
      if (paymentMethod !== "qris") {
        await notifyPickersNewOrder(storeId, order.id);
        console.log(`🔔 Pickers notified for order ${order.id}`);
      }

      createdOrders.push(order);
    }

    // Clear cart
    await storage.clearCart(userId);
    console.log(`✅ Cart cleared for user ${userId}`);

    console.log(`🎉 SUCCESS: Created ${createdOrders.length} orders`);
    res.status(201).json(createdOrders);

  } catch (error) {
    console.error("❌ CREATE ORDER ERROR:", error);
    console.error("Error details:", error instanceof Error ? error.message : "Unknown");
    console.error("Stack:", error instanceof Error ? error.stack : "No stack");
    
    res.status(500).json({ 
      error: "Failed to create order",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.patch("/api/orders/:id/pack", async (req, res) => {
  try {
    const { userId } = req.body;

    const [staff] = await db
      .select()
      .from(storeStaff)
      .where(eq(storeStaff.userId, userId));

    if (!staff) {
      return res.status(403).json({ error: "Not store staff" });
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, req.params.id));

    if (!order || order.storeId !== staff.storeId) {
      return res.status(403).json({ error: "Order not from your store" });
    }

    const [updated] = await db
      .update(orders)
      .set({ 
        status: "packed",
        packedAt: new Date()
      })
      .where(eq(orders.id, req.params.id))
      .returning();

    // 💰 RECORD PICKER BONUS
    if (order.pickerId) {
      await recordStaffEarning(
        order.pickerId,
        staff.storeId,
        "picker",
        PICKER_BONUS_PER_ORDER
      );
    }

    await notifyCustomerOrderStatus(updated.id, "packed");
    await notifyDriversPackedOrder(staff.storeId, updated.id);

    res.json(updated);
  } catch (err) {
    console.error("❌ Pack order error:", err);
    res.status(500).json({ error: "Failed to pack order" });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const { userId, role } = req.query;

    if (!userId || !role) {
      return res.status(400).json({ error: "userId and role required" });
    }

    let whereCondition;

    if (role === "customer") {
      whereCondition = eq(orders.userId, userId as string);
    } 
    else if (role === "picker" || role === "driver") {
      const [staff] = await db
        .select()
        .from(storeStaff)
        .where(eq(storeStaff.userId, userId as string));

      if (!staff) {
        return res.status(403).json({ error: "Not store staff" });
      }

      whereCondition = eq(orders.storeId, staff.storeId);
    } 
    else {
      return res.status(403).json({ error: "Invalid role" });
    }

    const userOrders = await db
      .select()
      .from(orders)
      .where(whereCondition)
      .orderBy(sql`${orders.createdAt} DESC`);

    const ordersWithItems = await Promise.all(
      userOrders.map(async (o) => {
        const items = await db
          .select({
            id: orderItems.id,
            quantity: orderItems.quantity,
            priceAtEntry: orderItems.priceAtEntry,
            productId: orderItems.productId,
            productName: products.name,
            productImage: products.image,
          })
          .from(orderItems)
          .leftJoin(products, eq(orderItems.productId, products.id))
          .where(eq(orderItems.orderId, o.id));

        return { ...o, items };
      })
    );

    res.json(ordersWithItems);
  } catch (error) {
    console.error("❌ Fetch orders error:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});
app.get("/api/orders/:id", async (req, res) => {
  try {
    const [orderData] = await db.select().from(orders).where(eq(orders.id, req.params.id)).limit(1);
    if (!orderData) return res.status(404).json({ error: "Order not found" });
    
    const items = await db.select({
      id: orderItems.id, 
      quantity: orderItems.quantity, 
      priceAtEntry: orderItems.priceAtEntry,
      productId: orderItems.productId, 
      productName: products.name,
      productImage: products.image,
    }).from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, req.params.id));
    
    let driverName = null;
    let driverPhone = null;
    if (orderData.driverId) {
      const driver = await storage.getUser(orderData.driverId);
      driverName = driver?.username;
      driverPhone = driver?.phone;
    }
    
    // ✅ Make sure orderNumber is included
    res.json({ 
      ...orderData, 
      items, 
      driverName,
      driverPhone,
      orderNumber: orderData.orderNumber // Ensure this is returned
    });
  } catch (error) {
    console.error("❌ Fetch order error:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});


// ===== CREATE XENDIT QRIS PAYMENT =====
app.post("/api/orders/:orderId/create-qris", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    console.log(`💳 Creating QRIS payment for order ${orderId}`);

    // Get order
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Verify user owns this order
    if (order.userId !== userId) {
      return res.status(403).json({ error: "Not your order" });
    }

    // Only QRIS orders
    if (order.paymentMethod !== "qris") {
      return res.status(400).json({ error: "Only QRIS orders need QR generation" });
    }

    // Check if QR already exists and is not expired
    if (order.qrisUrl && order.qrisExpiresAt && new Date(order.qrisExpiresAt) > new Date()) {
      return res.json({
        success: true,
        qrCodeUrl: order.qrisUrl,
        expiresAt: order.qrisExpiresAt,
        invoiceId: order.xenditInvoiceId,
      });
    }

    // Create Xendit QRIS payment
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const xenditResponse = await fetch('https://api.xendit.co/qr_codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(process.env.XENDIT_SECRET_KEY + ':').toString('base64')}`,
      },
      body: JSON.stringify({
        external_id: order.orderNumber,
        type: 'DYNAMIC',
        callback_url: `${process.env.EXPO_PUBLIC_DOMAIN}/api/xendit/webhook`,
        amount: order.total,
        expires_at: expiresAt.toISOString(),
      }),
    });

    if (!xenditResponse.ok) {
      const error = await xenditResponse.json();
      console.error('❌ Xendit error:', error);
      return res.status(500).json({ error: 'Failed to create QRIS payment' });
    }

    const xenditData = await xenditResponse.json();

    // Update order with QR code
    const [updated] = await db
      .update(orders)
      .set({
        qrisUrl: xenditData.qr_string,
        qrisExpiresAt: expiresAt,
        xenditInvoiceId: xenditData.id,
      })
      .where(eq(orders.id, orderId))
      .returning();

    console.log(`✅ QRIS created: ${xenditData.id}`);

    res.json({
      success: true,
      qrCodeUrl: xenditData.qr_string,
      expiresAt: expiresAt,
      invoiceId: xenditData.id,
    });

  } catch (error) {
    console.error("❌ Create QRIS error:", error);
    res.status(500).json({ error: "Failed to create QRIS payment" });
  }
});

// ===== XENDIT WEBHOOK - PAYMENT CONFIRMATION =====
// ===== CREATE XENDIT QRIS PAYMENT =====
app.post("/api/orders/:orderId/create-qris", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    console.log(`💳 Creating QRIS payment for order ${orderId}`);

    // Get order
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Verify user owns this order
    if (order.userId !== userId) {
      return res.status(403).json({ error: "Not your order" });
    }

    // Only QRIS orders
    if (order.paymentMethod !== "qris") {
      return res.status(400).json({ error: "Only QRIS orders need QR generation" });
    }

    // Check if QR already exists and is not expired
    if (order.qrisUrl && order.qrisExpiresAt && new Date(order.qrisExpiresAt) > new Date()) {
      return res.json({
        success: true,
        qrCodeUrl: order.qrisUrl,
        expiresAt: order.qrisExpiresAt,
        invoiceId: order.xenditInvoiceId,
      });
    }

    // Create Xendit QRIS payment
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const xenditResponse = await fetch('https://api.xendit.co/qr_codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(process.env.XENDIT_SECRET_KEY + ':').toString('base64')}`,
      },
      body: JSON.stringify({
        external_id: order.orderNumber,
        type: 'DYNAMIC',
        callback_url: `${process.env.EXPO_PUBLIC_DOMAIN}/api/xendit/webhook`,
        amount: order.total,
        expires_at: expiresAt.toISOString(),
      }),
    });

    if (!xenditResponse.ok) {
      const error = await xenditResponse.json();
      console.error('❌ Xendit error:', error);
      return res.status(500).json({ error: 'Failed to create QRIS payment' });
    }

    const xenditData = await xenditResponse.json();

    // Update order with QR code
    const [updated] = await db
      .update(orders)
      .set({
        qrisUrl: xenditData.qr_string,
        qrisExpiresAt: expiresAt,
        xenditInvoiceId: xenditData.id,
      })
      .where(eq(orders.id, orderId))
      .returning();

    console.log(`✅ QRIS created: ${xenditData.id}`);

    res.json({
      success: true,
      qrCodeUrl: xenditData.qr_string,
      expiresAt: expiresAt,
      invoiceId: xenditData.id,
    });

  } catch (error) {
    console.error("❌ Create QRIS error:", error);
    res.status(500).json({ error: "Failed to create QRIS payment" });
  }
});

// ===== XENDIT WEBHOOK - PAYMENT CONFIRMATION =====
app.post("/api/xendit/webhook", async (req, res) => {
  try {
    const payload = req.body;
    
    console.log('🔔 Xendit webhook received:', payload);

    // Verify webhook is from Xendit (optional but recommended)
    const callbackToken = req.headers['x-callback-token'];
    if (callbackToken !== process.env.XENDIT_WEBHOOK_TOKEN) {
      console.warn('⚠️ Invalid webhook token');
      // Still process for development, but log warning
    }

    // Handle QR code payment
    if (payload.type === 'QR_CODE' && payload.status === 'COMPLETED') {
      const externalId = payload.external_id; // This is our orderNumber

      // Find order by orderNumber
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.orderNumber, externalId))
        .limit(1);

      if (!order) {
        console.error(`❌ Order not found: ${externalId}`);
        return res.status(404).json({ error: 'Order not found' });
      }

      // Update payment status
      await db
        .update(orders)
        .set({
          qrisConfirmed: true,
          paymentStatus: 'paid',
        })
        .where(eq(orders.id, order.id));

      console.log(`✅ Payment confirmed for order ${order.id}`);

      // Notify pickers that order is ready
      await notifyPickersNewOrder(order.storeId!, order.id);

      // Send push notification to customer
      const [user] = await db.select().from(users).where(eq(users.id, order.userId));
      if (user?.pushToken) {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: user.pushToken,
            sound: 'default',
            title: '✅ Payment Confirmed!',
            body: `Your order #${order.orderNumber} is being prepared`,
            data: { orderId: order.id, type: 'payment_confirmed' },
          }),
        });
      }

      return res.json({ success: true });
    }

    res.json({ success: true });

  } catch (error) {
    console.error('❌ Xendit webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Add this NEW endpoint to your routes.ts

// ===== CORRECTED DRIVER ORDER COMPLETE ROUTE =====


app.put("/api/driver/orders/:id/complete", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, deliveryPin } = req.body;

    if (!userId || !deliveryPin) {
      return res.status(400).json({ error: "Driver ID and PIN required" });
    }

    const [staff] = await db
      .select()
      .from(storeStaff)
      .where(eq(storeStaff.userId, userId));

    if (!staff) {
      return res.status(403).json({ error: "Driver not assigned to store" });
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, id));

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.driverId !== userId) {
      return res.status(403).json({ error: "Not your delivery" });
    }

    if (order.status !== "delivering") {
      return res.status(400).json({ error: "Order must be in delivering status" });
    }

    if (order.deliveryPin !== deliveryPin.toString()) {
      return res.status(401).json({ 
        error: "Incorrect PIN. Please check with the customer and try again." 
      });
    }

    const [completed] = await db
      .update(orders)
      .set({ 
        status: "delivered", 
        deliveredAt: new Date() 
      })
      .where(eq(orders.id, id))
      .returning();

    // 💰 RECORD DRIVER BONUS
    await recordStaffEarning(
      userId,
      staff.storeId,
      "driver",
      DRIVER_BONUS_PER_DELIVERY
    );

    // 💰 UPDATE STORE DAILY FINANCIALS
    await updateStoreDailyFinancials(staff.storeId, completed);

    // ✅ UPDATE USER STATS
    await db.update(users)
      .set({ 
        totalOrders: sql`${users.totalOrders} + 1`,
        totalSpent: sql`${users.totalSpent} + ${completed.total}`,
        lastOrderAt: new Date(),
        isNewUser: false,
        firstOrderAt: sql`COALESCE(${users.firstOrderAt}, NOW())`,
      })
      .where(eq(users.id, completed.userId));

    await notifyCustomerOrderStatus(completed.id, "delivered");

    console.log(`✅ Order ${id} completed by driver ${userId}`);
    res.json(completed);
  } catch (error) {
    console.error("❌ Complete delivery error:", error);
    res.status(500).json({ error: "Failed to complete delivery" });
  }
});





  // ==================== 11. MESSAGES ====================
  console.log("💬 Registering message routes...");
  
  app.get("/api/orders/:id/messages", async (req, res) => {
    try {
      const msgs = await db.select().from(messages).where(eq(messages.orderId, req.params.id)).orderBy(sql`${messages.createdAt} ASC`);
      res.json(msgs);
    } catch (error) {
      console.error("❌ Messages error:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

app.post("/api/messages", uploadChat.single("file"), async (req, res) => {
  try {
    const { orderId, senderId, type } = req.body;
    let content = req.body.content;

    if (req.file) {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      content = `${baseUrl}/uploads/chat/${req.file.filename}`;
    }

    if (!orderId || !senderId || !content) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const [msg] = await db.insert(messages).values({
      orderId,
      senderId,
      type: type || (req.file ? "image" : "text"),
      content,
    }).returning();

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    
    if (order) {
      const receiverId = (senderId === order.userId) ? order.driverId : order.userId;
      if (receiverId) {
        // 🔔 NOTIFY RECEIVER ABOUT NEW MESSAGE
        const messagePreview = req.file ? "📷 Sent an image" : content;
        await notifyChatMessage(orderId, senderId, messagePreview);
      }
    }

    res.json(msg);
  } catch (error) {
    console.error("❌ Send message error:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});



// ==================== FINANCIAL HELPER FUNCTIONS ====================

function getTodayMidnight(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getCurrentPeriod(): { month: number; year: number } {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

async function recordStaffEarning(
  staffId: string,
  storeId: string,
  role: "picker" | "driver",
  bonusAmount: number
) {
  const today = getTodayMidnight();
  
  const [existing] = await db
    .select()
    .from(staffEarnings)
    .where(
      and(
        eq(staffEarnings.staffId, staffId),
        eq(staffEarnings.date, today)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(staffEarnings)
      .set({
        ordersCompleted: role === "picker" 
          ? sql`${staffEarnings.ordersCompleted} + 1`
          : staffEarnings.ordersCompleted,
        deliveriesCompleted: role === "driver"
          ? sql`${staffEarnings.deliveriesCompleted} + 1`
          : staffEarnings.deliveriesCompleted,
        bonusEarned: sql`${staffEarnings.bonusEarned} + ${bonusAmount}`,
        updatedAt: new Date(),
      })
      .where(eq(staffEarnings.id, existing.id));
  } else {
    await db.insert(staffEarnings).values({
      staffId,
      storeId,
      date: today,
      role,
      ordersCompleted: role === "picker" ? 1 : 0,
      deliveriesCompleted: role === "driver" ? 1 : 0,
      bonusEarned: String(bonusAmount),
    });
  }

  console.log(`💰 Recorded ${role} earning: Rp ${bonusAmount} for staff ${staffId}`);
}

async function updateStoreDailyFinancials(storeId: string, order: any) {
  const today = getTodayMidnight();
  
  const [existing] = await db
    .select()
    .from(storeDailyFinancials)
    .where(
      and(
        eq(storeDailyFinancials.storeId, storeId),
        eq(storeDailyFinancials.date, today)
      )
    )
    .limit(1);

  const productRevenue = order.subtotal || 0;
  const productCost = order.productCost || 0;
  const deliveryRevenue = order.deliveryFee || DELIVERY_FEE;
  const staffBonus = DELIVERY_FEE_STAFF_BONUS;
  const promotionDiscount = order.promotionDiscount || 0;
  const voucherDiscount = order.voucherDiscount || 0;
  
  const grossRevenue = productRevenue + deliveryRevenue;
  const grossProfit = productRevenue - productCost;
  const netProfit = grossRevenue - productCost - staffBonus - promotionDiscount - voucherDiscount;

  if (existing) {
    await db
      .update(storeDailyFinancials)
      .set({
        totalOrders: sql`${storeDailyFinancials.totalOrders} + 1`,
        grossRevenue: sql`${storeDailyFinancials.grossRevenue} + ${grossRevenue}`,
        deliveryFeeRevenue: sql`${storeDailyFinancials.deliveryFeeRevenue} + ${deliveryRevenue}`,
        productRevenue: sql`${storeDailyFinancials.productRevenue} + ${productRevenue}`,
        productCosts: sql`${storeDailyFinancials.productCosts} + ${productCost}`,
        staffBonuses: sql`${storeDailyFinancials.staffBonuses} + ${staffBonus}`,
        promotionDiscounts: sql`${storeDailyFinancials.promotionDiscounts} + ${promotionDiscount}`,
        voucherDiscounts: sql`${storeDailyFinancials.voucherDiscounts} + ${voucherDiscount}`,
        grossProfit: sql`${storeDailyFinancials.grossProfit} + ${grossProfit}`,
        netProfit: sql`${storeDailyFinancials.netProfit} + ${netProfit}`,
        updatedAt: new Date(),
      })
      .where(eq(storeDailyFinancials.id, existing.id));
  } else {
    await db.insert(storeDailyFinancials).values({
      storeId,
      date: today,
      totalOrders: 1,
      grossRevenue: String(grossRevenue),
      deliveryFeeRevenue: String(deliveryRevenue),
      productRevenue: String(productRevenue),
      productCosts: String(productCost),
      staffBonuses: String(staffBonus),
      promotionDiscounts: String(promotionDiscount),
      voucherDiscounts: String(voucherDiscount),
      grossProfit: String(grossProfit),
      netProfit: String(netProfit),
    });
  }
}
// Add this after updateStoreDailyFinancials function

async function logPromotionCost(
  promotionId: string,
  orderId: string,
  discountAmount: number,
  orderTotal: number,
  productCost: number,
  storeId?: string
) {
  // Get promotion details
  const [promotion] = await db
    .select()
    .from(promotions)
    .where(eq(promotions.id, promotionId))
    .limit(1);

  if (!promotion) {
    console.error(`❌ Promotion ${promotionId} not found`);
    return;
  }

  // Determine who bears the cost
  const costBearer = promotion.scope === 'app' || !promotion.storeId ? 'admin' : 'store';

  // Log the cost
  await db.insert(promotionCostLog).values({
    promotionId,
    orderId,
    storeId: storeId || null,
    discountAmount,
    costBearer,
    orderTotal,
    productCost,
  });

  // Update promotion totals
  await db
    .update(promotions)
    .set({
      totalCostIncurred: sql`${promotions.totalCostIncurred} + ${discountAmount}`,
      totalRevenueGenerated: sql`${promotions.totalRevenueGenerated} + ${orderTotal}`,
      lastUsedAt: new Date(),
    })
    .where(eq(promotions.id, promotionId));

  console.log(`💰 Logged ${costBearer} promotion cost: Rp ${discountAmount.toLocaleString()} for order ${orderId}`);
}

  // ==================== 12. STORES ====================
  console.log("🏪 Registering store routes...");
  
app.get("/api/stores/available", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "Valid lat/lng required" });
    }

    const nearest = await findNearestAvailableStore(lat, lng);

if (!nearest) {
  return res.json({
    available: false,
  });
}

res.json({
  available: true,
  store: {
    id: nearest.id,
    name: nearest.name,
    address: nearest.address,
    distanceKm: nearest.distanceKm,
    codAllowed: nearest.codAllowed,
  },
  estimatedDeliveryMinutes: estimateDeliveryTime(nearest.distanceKm),
  codAllowed: nearest.codAllowed,
});

  } catch (error) {
    console.error("❌ Store availability error:", error);
    res.status(500).json({ error: "Failed to check availability" });
  }
});

  app.get("/api/stores", async (req, res) => {
    try {
      const stores = await storage.getStores();
      res.json(stores);
    } catch (error) {
      console.error("❌ Stores error:", error);
      res.status(500).json({ error: "Failed to fetch stores" });
    }
  });

  app.get("/api/stores/:id/inventory", async (req, res) => {
    try {
      const inv = await storage.getStoreInventoryWithProducts(req.params.id);
      res.json(inv);
    } catch (error) {
      console.error("❌ Inventory error:", error);
      res.status(500).json({ error: "Failed to fetch inventory" });
    }
  });

  app.get("/api/stores/:id/staff", async (req, res) => {
    try {
      const staff = await storage.getStoreStaff(req.params.id);
      res.json(staff);
    } catch (error) {
      console.error("❌ Staff error:", error);
      res.status(500).json({ error: "Failed to fetch staff" });
    }
  });

  app.post("/api/staff/toggle-status", async (req, res) => {
    try {
      const { userId, status } = req.body;
      if (!userId || !["online", "offline"].includes(status)) return res.status(400).json({ error: "Invalid input" });
      const staff = await storage.getStoreStaffByUserId(userId);
      if (!staff) return res.status(404).json({ error: "Staff not found" });
      const updated = await storage.updateStaffStatus(staff.id, status);
      res.json(updated);
    } catch (error) {
      console.error("❌ Toggle status error:", error);
      res.status(500).json({ error: "Failed to update" });
    }
  });

app.get("/api/stores/nearby", async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: "Valid lat/lng required" });
  }

  try {
    const result = await db.execute(sql`
      SELECT
        s.id,
        s.name,
        s.address,
        (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(${lat}::numeric))
              * cos(radians(s.latitude::numeric))
              * cos(radians(s.longitude::numeric) - radians(${lng}::numeric))
              + sin(radians(${lat}::numeric))
              * sin(radians(s.latitude::numeric))
            ))
          )
        ) AS distance,
        CEIL(
          (6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(${lat}::numeric))
              * cos(radians(s.latitude::numeric))
              * cos(radians(s.longitude::numeric) - radians(${lng}::numeric))
              + sin(radians(${lat}::numeric))
              * sin(radians(s.latitude::numeric))
            ))
          ) * 5) + 10
        )::integer AS "deliveryMinutes"
      FROM stores s
      WHERE
        s.is_active = true
        AND (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(${lat}::numeric))
              * cos(radians(s.latitude::numeric))
              * cos(radians(s.longitude::numeric) - radians(${lng}::numeric))
              + sin(radians(${lat}::numeric))
              * sin(radians(s.latitude::numeric))
            ))
          )
        ) <= 5
      ORDER BY distance ASC;
    `);

    res.json({
      stores: result.rows.map((s: any) => ({
        id: s.id,
        name: s.name,
        address: s.address,
        distance: parseFloat(s.distance),
        deliveryMinutes: s.deliveryMinutes,
      })),
    });
  } catch (error) {
    console.error("❌ /api/stores/nearby error:", error);
    res.status(500).json({ error: "Failed to fetch nearby stores" });
  }
});

app.get("/api/stores/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Fetching store: ${id}`);
    
    const [store] = await db
      .select()
      .from(stores)
      .where(eq(stores.id, id))
      .limit(1);
    
    if (!store) {
      console.log(`❌ Store not found: ${id}`);
      return res.status(404).json({ error: "Store not found" });
    }
    
    console.log(`✅ Store found: ${store.name}`);
    res.json(store);
  } catch (error) {
    console.error("❌ Get store error:", error);
    res.status(500).json({ error: "Failed to fetch store" });
  }
});


  // ==================== 13. ADMIN ====================
 // Add these routes to your server/routes.ts file

// Add these routes to your server/routes.ts file


console.log("👑 Registering admin routes...");

// ============================================
// ADMIN METRICS ENDPOINT - Enhanced with financials

// ============================================
// FIXED ADMIN METRICS ENDPOINT
// Replace the existing /api/admin/metrics endpoint with this version
// ============================================

app.get("/api/admin/metrics", async (req, res) => {
  try {
    console.log("📊 Fetching admin metrics...");

    const allStores = await db.select().from(stores);
    const allOrders = await db.select().from(orders);

    console.log(`✅ Stores: ${allStores.length}`);
    console.log(`✅ Orders: ${allOrders.length}`);

    const metrics: any[] = [];

    for (const store of allStores) {
      try {
        // =========================
        // STORE ORDERS (SAFE)
        // =========================
        const storeOrders = allOrders.filter(
  o => o.storeId && String(o.storeId) === String(store.id)
);


        // =========================
        // STORE STAFF
        // =========================
        const staff = await db
          .select()
          .from(storeStaff)
          .where(eq(storeStaff.storeId, store.id));

        // =========================
        // HELPERS
        // =========================
        const safeDate = (d: any) => {
          if (!d) return null;
          const date = new Date(d);
          return isNaN(date.getTime()) ? null : date;
        };

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        // =========================
        // FILTERS
        // =========================
        const deliveredOrders = storeOrders.filter(
          o => o.status === "delivered" && o.total != null
        );

        const todayOrders = storeOrders.filter(o => {
          const d = safeDate(o.createdAt);
          return d && d >= todayStart;
        });

        const monthOrders = storeOrders.filter(o => {
          const d = safeDate(o.createdAt);
          return d && d >= monthStart;
        });

        if (!storeOrders.length) {
  metrics.push({
    ...store,
    totalStaff: staff.length,
    onlineStaff: staff.filter(s => s.status === "online").length,
    staff: [],
    pickers: [],
    drivers: [],
    orderCount: 0,
    pendingOrders: 0,
    activeOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    todayOrders: 0,
    monthRevenue: 0,
    monthOrders: 0,
    avgOrderValue: 0,
    completionRate: 0,
    codCollected: 0,
    codPending: 0,
  });
  continue;
}


        // =========================
        // FINANCIALS
        // =========================
        const sumTotal = (orders: any[]) =>
          orders.reduce((sum, o) => {
            const t = Number(o.total);
            return sum + (isNaN(t) ? 0 : t);
          }, 0);

        const totalRevenue = sumTotal(deliveredOrders);
        const todayRevenue = sumTotal(todayOrders.filter(o => o.status === "delivered"));
        const monthRevenue = sumTotal(monthOrders.filter(o => o.status === "delivered"));

        const avgOrderValue =
          deliveredOrders.length > 0
            ? totalRevenue / deliveredOrders.length
            : 0;

        const completedOrders = storeOrders.filter(o =>
          ["delivered", "cancelled"].includes(o.status || "")
        );

        const completionRate =
          completedOrders.length > 0
            ? (deliveredOrders.length / completedOrders.length) * 100
            : 0;

        // =========================
        // COD
        // =========================
        const codOrders = storeOrders.filter(o => o.paymentMethod === "cod");

        const codCollected = sumTotal(
          codOrders.filter(o => o.codCollected === true)
        );

        const codPending = sumTotal(
          codOrders.filter(
            o => o.status === "delivered" && !o.codCollected
          )
        );

        // =========================
        // STAFF ENRICHMENT (SAFE)
        // =========================
        const enrichedStaff = [];

        for (const s of staff) {
          try {
            if (!s.userId) {
              enrichedStaff.push({
                ...s,
                user: null,
                stats: { totalOrders: 0, delivered: 0, active: 0 },
              });
              continue;
            }

            const [user] = await db
              .select()
              .from(users)
              .where(eq(users.id, s.userId))
              .limit(1);

            const staffOrders =
              s.role === "picker"
                ? allOrders.filter(o => o.pickerId === s.userId)
                : s.role === "driver"
                ? allOrders.filter(o => o.driverId === s.userId)
                : [];

            enrichedStaff.push({
              ...s,
              user: user
                ? {
                    id: user.id,
                    username: user.username,
                    phone: user.phone,
                    email: user.email,
                    name: user.name,
                  }
                : null,
              stats: {
                totalOrders: staffOrders.length,
                delivered: staffOrders.filter(o => o.status === "delivered").length,
                active: staffOrders.filter(
                  o => !["delivered", "cancelled"].includes(o.status || "")
                ).length,
              },
            });
          } catch (e) {
            console.error("⚠️ Staff enrich failed:", s.id);
          }
        }

        // =========================
        // PUSH STORE METRICS
        // =========================
        metrics.push({
          ...store,
          totalStaff: staff.length,
          onlineStaff: staff.filter(s => s.status === "online").length,
          staff: enrichedStaff,
          pickers: enrichedStaff.filter(s => s.role === "picker"),
          drivers: enrichedStaff.filter(s => s.role === "driver"),
          orderCount: storeOrders.length,
          pendingOrders: storeOrders.filter(o => o.status === "pending").length,
          activeOrders: storeOrders.filter(o =>
            ["confirmed", "picking", "packed", "delivering"].includes(o.status || "")
          ).length,
          deliveredOrders: deliveredOrders.length,
          cancelledOrders: storeOrders.filter(o => o.status === "cancelled").length,
          totalRevenue,
          todayRevenue,
          todayOrders: todayOrders.length,
          monthRevenue,
          monthOrders: monthOrders.length,
          avgOrderValue,
          completionRate,
          codCollected,
          codPending,
        });
      } catch (storeErr) {
        console.error("💥 Store skipped:", store.id, storeErr);
      }
    }

    // =========================
    // GLOBAL TOTALS
    // =========================
    const globalTotals = {
      totalRevenue: metrics.reduce((s, m) => s + (m.totalRevenue || 0), 0),
      todayRevenue: metrics.reduce((s, m) => s + (m.todayRevenue || 0), 0),
      monthRevenue: metrics.reduce((s, m) => s + (m.monthRevenue || 0), 0),
      avgOrderValue:
        metrics.length > 0
          ? metrics.reduce((s, m) => s + (m.avgOrderValue || 0), 0) / metrics.length
          : 0,
      codCollected: metrics.reduce((s, m) => s + (m.codCollected || 0), 0),
      codPending: metrics.reduce((s, m) => s + (m.codPending || 0), 0),
    };

    res.json({
      stores: metrics,
      globalTotals,
      orderSummary: {
        total: allOrders.length,
        pending: allOrders.filter(o => o.status === "pending").length,
        confirmed: allOrders.filter(o => o.status === "confirmed").length,
        picking: allOrders.filter(o => o.status === "picking").length,
        packed: allOrders.filter(o => o.status === "packed").length,
        delivering: allOrders.filter(o => o.status === "delivering").length,
        delivered: allOrders.filter(o => o.status === "delivered").length,
        cancelled: allOrders.filter(o => o.status === "cancelled").length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ Admin metrics fatal error:", err);
    res.status(500).json({ error: "Failed to fetch admin metrics" });
  }
});



// ============================================
// STORE CRUD OPERATIONS
// ============================================

// CREATE STORE with auto-geocoding
app.post("/api/admin/stores", async (req, res) => {
  try {
    const { name, address, latitude, longitude, codAllowed = true } = req.body;
    
    if (!name || !address) {
      return res.status(400).json({ error: "Name and address are required" });
    }

    let lat = latitude;
    let lng = longitude;

    // Auto-geocode if coordinates not provided
    if (!lat || !lng) {
      try {
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
        const geoResponse = await fetch(geocodeUrl, {
          headers: { 'User-Agent': 'ZendO-App' }
        });
        const geoData = await geoResponse.json();
        
        if (geoData && geoData.length > 0) {
          lat = parseFloat(geoData[0].lat);
          lng = parseFloat(geoData[0].lon);
          console.log(`📍 Auto-geocoded: ${address} -> ${lat}, ${lng}`);
        } else {
          // Default to Jakarta coordinates
          lat = -6.2088;
          lng = 106.8456;
          console.log(`⚠️ Geocoding failed, using default Jakarta coordinates`);
        }
      } catch (geoError) {
        console.error("Geocoding error:", geoError);
        lat = -6.2088;
        lng = 106.8456;
      }
    }

    const newStore = await storage.createStore({
      name,
      address,
      latitude: String(lat),
      longitude: String(lng),
      codAllowed,
      isActive: true,
    });

    res.json(newStore);
  } catch (error) {
    console.error("❌ Create store error:", error);
    res.status(500).json({ error: "Failed to create store" });
  }
});

// UPDATE STORE
app.patch("/api/admin/stores/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, latitude, longitude, codAllowed, isActive } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (address !== undefined) updates.address = address;
    if (codAllowed !== undefined) updates.codAllowed = codAllowed;
    if (isActive !== undefined) updates.isActive = isActive;

    // Re-geocode if address changed but no new coordinates
    if (address && (!latitude || !longitude)) {
      try {
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
        const geoResponse = await fetch(geocodeUrl, {
          headers: { 'User-Agent': 'ZendO-App' }
        });
        const geoData = await geoResponse.json();
        
        if (geoData && geoData.length > 0) {
          updates.latitude = String(parseFloat(geoData[0].lat));
          updates.longitude = String(parseFloat(geoData[0].lon));
        }
      } catch (geoError) {
        console.error("Geocoding error:", geoError);
      }
    } else if (latitude !== undefined && longitude !== undefined) {
      updates.latitude = String(latitude);
      updates.longitude = String(longitude);
    }

    const updated = await storage.updateStore(id, updates);
    
    if (!updated) {
      return res.status(404).json({ error: "Store not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error("❌ Update store error:", error);
    res.status(500).json({ error: "Failed to update store" });
  }
});

// DELETE STORE (soft delete by setting isActive = false)
app.delete("/api/admin/stores/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Attempting to delete store: ${id}`);
    
    // Check if store has active orders
    const storeOrders = await storage.getOrdersByStore(id);
    const activeOrders = storeOrders.filter(o => 
      !["delivered", "cancelled"].includes(o.status || "")
    );
    
    console.log(`📊 Store has ${storeOrders.length} total orders, ${activeOrders.length} active`);
    
    if (activeOrders.length > 0) {
      return res.status(400).json({ 
        error: `Cannot delete store with ${activeOrders.length} active order(s)` 
      });
    }

    const updated = await storage.updateStore(id, { isActive: false });
    
    if (!updated) {
      console.log(`❌ Store not found: ${id}`);
      return res.status(404).json({ error: "Store not found" });
    }

    console.log(`✅ Store deactivated: ${id}`);
    res.json({ success: true, message: "Store deactivated" });
  } catch (error) {
    console.error("❌ Delete store error:", error);
    res.status(500).json({ error: "Failed to delete store" });
  }
});

// ✅ FIX 3: ADMIN CREATE PRODUCT (same pattern)
app.post("/api/admin/products", async (req, res) => {
  try {
    const { userId, costPrice, margin, ...productData } = req.body;

    // Verify admin access
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || (user.role !== "admin" && userId !== "demo-user")) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // ✅ COST PRICE IS REQUIRED
    if (!costPrice || isNaN(parseInt(costPrice)) || parseInt(costPrice) <= 0) {
      return res.status(400).json({ 
        error: "Cost price is required and must be greater than 0" 
      });
    }

    // ✅ DATABASE CALCULATES PRICE AUTOMATICALLY
    const finalProductData: any = {
      ...productData,
      costPrice: parseInt(costPrice),
    };

    // Optional: Custom margin
    if (margin && parseFloat(margin) > 0) {
      finalProductData.margin = parseFloat(margin);
    }

    const [newProduct] = await db.insert(products).values(finalProductData).returning();

    console.log(`✅ Admin created product: ${newProduct.name}`);
    console.log(`💰 Auto-pricing: Cost Rp${newProduct.costPrice} × ${newProduct.margin}% → Selling Rp${newProduct.price}`);

    res.json(newProduct);
  } catch (error) {
    console.error("❌ Admin create product error:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Failed to create product"
    });
  }
});

app.post("/api/admin/products/bulk-import", async (req, res) => {
  try {
    const { userId, products: productsToImport } = req.body;

    // Verify admin access
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || (user.role !== "admin" && userId !== "demo-user")) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const imported = [];
    const errors = [];

    for (const productData of productsToImport) {
      try {
        // ✅ VALIDATE COST PRICE
        if (!productData.costPrice || productData.costPrice <= 0) {
          errors.push({ 
            product: productData.name, 
            error: "Cost price is required and must be > 0" 
          });
          continue;
        }

        // ✅ Database automatically calculates price
        const finalData: any = {
          ...productData,
          costPrice: parseInt(productData.costPrice),
        };

        // Optional: Custom margin per product
        if (productData.margin) {
          finalData.margin = parseFloat(productData.margin);
        }

        const [newProduct] = await db.insert(products).values(finalData).returning();
        
        imported.push({
          id: newProduct.id,
          name: newProduct.name,
          costPrice: newProduct.costPrice,
          sellingPrice: newProduct.price,
          margin: newProduct.margin,
        });

        console.log(`✅ Imported: ${newProduct.name} - Rp${newProduct.costPrice} → Rp${newProduct.price}`);
      } catch (error) {
        errors.push({ 
          product: productData.name, 
          error: error instanceof Error ? error.message : "Import failed" 
        });
      }
    }

    res.json({
      success: true,
      imported: imported.length,
      failed: errors.length,
      products: imported,
      errors,
    });
  } catch (error) {
    console.error("❌ Bulk import error:", error);
    res.status(500).json({ error: "Bulk import failed" });
  }
});

// ============================================
// STAFF CRUD OPERATIONS
// ============================================

// ADD STAFF to a store
app.post("/api/admin/stores/:storeId/staff", async (req, res) => {
  try {
    const { storeId } = req.params;
    const { phone, email, role, name } = req.body;

    console.log(`👤 Adding staff to store ${storeId}:`, { phone, email, role, name });

    if (!role || !["picker", "driver"].includes(role)) {
      return res.status(400).json({ error: "Valid role required (picker or driver)" });
    }

    if (!phone && !email) {
      return res.status(400).json({ error: "Phone or email required" });
    }

    const store = await storage.getStoreById(storeId);
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    let user = phone 
      ? await storage.getUserByPhone(phone) 
      : await storage.getUserByEmail(email!);

    if (!user) {
      const username = phone || email!.split("@")[0];
      const tempPassword = Math.random().toString(36).slice(-8);
      
      user = await storage.createUser({
        username,
        password: tempPassword,
        phone: phone || null,
        email: email || null,
        name: name || username,
        role,
        firstLogin: true // ✅ SET firstLogin for new staff
      });
      
      console.log(`✅ Created new user: ${username} (temp password: ${tempPassword})`);
    } else {
      if (user.role !== role) {
        await db.update(users)
          .set({ role })
          .where(eq(users.id, user.id));
        console.log(`📝 Updated user ${user.id} role to ${role}`);
      }
    }

    const existingStaff = await storage.getStoreStaff(storeId);
    const alreadyStaff = existingStaff.find(s => s.userId === user!.id);
    
    if (alreadyStaff) {
      return res.status(400).json({ error: "User is already staff at this store" });
    }

    const newStaff = await storage.createStoreStaff({
      userId: user.id,
      storeId,
      role,
      status: "offline",
    });

    console.log(`✅ Staff added: ${newStaff.id}`);

    res.json({
      ...newStaff,
      user: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("❌ Add staff error:", error);
    res.status(500).json({ error: "Failed to add staff" });
  }
});

// UPDATE STAFF (role or remove from store)
app.patch("/api/admin/stores/:storeId/staff/:staffId", async (req, res) => {
  try {
    const { staffId } = req.params;
    const { role } = req.body;

    console.log(`📝 Updating staff ${staffId} to role: ${role}`);

    if (role && !["picker", "driver"].includes(role)) {
      return res.status(400).json({ error: "Valid role required" });
    }

    const [updated] = await db.update(storeStaff)
      .set({ role })
      .where(eq(storeStaff.id, staffId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    console.log(`✅ Staff updated: ${staffId}`);
    res.json(updated);
  } catch (error) {
    console.error("❌ Update staff error:", error);
    res.status(500).json({ error: "Failed to update staff" });
  }
});

// REMOVE STAFF from store
app.delete("/api/admin/stores/:storeId/staff/:staffId", async (req, res) => {
  try {
    const { staffId } = req.params;

    console.log(`🗑️ Removing staff: ${staffId}`);

    // Check for active orders
    const staff = await db.select().from(storeStaff)
      .where(eq(storeStaff.id, staffId))
      .limit(1);
    
    if (!staff[0]) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    const activeOrders = staff[0].role === "picker"
      ? await storage.getOrdersByPicker(staff[0].userId)
      : await storage.getOrdersByDriver(staff[0].userId);

    const hasActiveOrders = activeOrders.some(o => 
      !["delivered", "cancelled"].includes(o.status || "")
    );

    if (hasActiveOrders) {
      return res.status(400).json({ 
        error: "Cannot remove staff with active orders" 
      });
    }

    await db.delete(storeStaff).where(eq(storeStaff.id, staffId));

    console.log(`✅ Staff removed: ${staffId}`);
    res.json({ success: true, message: "Staff removed from store" });
  } catch (error) {
    console.error("❌ Remove staff error:", error);
    res.status(500).json({ error: "Failed to remove staff" });
  }
});

// TOGGLE STAFF STATUS (online/offline)
app.patch("/api/staff/status", async (req, res) => {
  try {
    const { userId, status } = req.body;

    console.log(`🔄 Toggling staff ${userId} status to: ${status}`);

    if (!["online", "offline"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'online' or 'offline'" });
    }

    const updated = await storage.updateStaffStatus(userId, status);

    if (!updated) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    console.log(`✅ Status updated: ${userId} -> ${status}`);
    res.json(updated);
  } catch (error) {
    console.error("❌ Toggle status error:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// ============================================
// GEOCODING HELPER ENDPOINT
// ============================================
app.post("/api/admin/geocode", async (req, res) => {
  try {
    const { address } = req.body;

    console.log(`🗺️ Geocoding address: ${address}`);

    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    try {
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
      console.log(`Fetching: ${geocodeUrl}`);
      
      const geoResponse = await fetch(geocodeUrl, {
        headers: { 
          'User-Agent': 'ZendO-App/1.0',
          'Accept': 'application/json'
        }
      });

      if (!geoResponse.ok) {
        console.error(`Nominatim API error: ${geoResponse.status}`);
        // Return default Jakarta coordinates instead of error
        return res.json({
          latitude: -6.2088,
          longitude: 106.8456,
          displayName: "Default location (Jakarta) - geocoding service unavailable",
          isDefault: true
        });
      }

      const geoData = await geoResponse.json();
      console.log(`Geocoding response:`, geoData);

      if (!geoData || geoData.length === 0) {
        console.log(`❌ Location not found for: ${address}, using default`);
        // Return default Jakarta coordinates instead of 404
        return res.json({
          latitude: -6.2088,
          longitude: 106.8456,
          displayName: "Default location (Jakarta) - address not found",
          isDefault: true
        });
      }

      const result = {
        latitude: parseFloat(geoData[0].lat),
        longitude: parseFloat(geoData[0].lon),
        displayName: geoData[0].display_name,
        isDefault: false
      };

      console.log(`✅ Geocoded:`, result);
      res.json(result);
    } catch (fetchError) {
      console.error("Geocoding fetch error:", fetchError);
      // Return default coordinates on any error
      res.json({
        latitude: -6.2088,
        longitude: 106.8456,
        displayName: "Default location (Jakarta) - geocoding error",
        isDefault: true
      });
    }
  } catch (error) {
    console.error("❌ Geocoding error:", error);
    // Return default coordinates instead of 500 error
    res.json({
      latitude: -6.2088,
      longitude: 106.8456,
      displayName: "Default location (Jakarta)",
      isDefault: true
    });
  }
});

// Existing vouchers and seed routes...
app.get("/api/vouchers", async (req, res) => {
  try {
    res.json(await storage.getVouchers());
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vouchers" });
  }
});

app.post("/api/seed", async (_req: Request, res: Response) => {
  try {
    const existingCategories = await storage.getCategories();
    
    const existingStores = await storage.getStores();
    const DEMO_STORE_ID_CHECK = "demo-store";
    const DEMO_PICKER_ID_CHECK = "demo-picker";
    const DEMO_DRIVER_ID_CHECK = "demo-driver";
    
    if (existingCategories.length > 0) {
      const demoUser = await storage.getUser(DEMO_USER_ID);
      if (!demoUser) {
        await db.insert(users).values({
          id: DEMO_USER_ID,
          username: "demo",
          password: "demo",
          phone: "+62123456789",
        });
      }
      
      if (existingStores.length === 0) {
        const allProducts = await storage.getProducts();
        
        if (allProducts.length === 0) {
          return res.json({ message: "Cannot seed store data: no products found" });
        }
        
        await db.insert(stores).values({
          id: DEMO_STORE_ID_CHECK,
          name: "ZendO Central Jakarta",
          address: "Jl. Sudirman No. 1, Central Jakarta, DKI Jakarta 10220",
          latitude: "-6.2088000",
          longitude: "106.8456000",
          codAllowed: true,
          isActive: true,
        });

        const existingPicker = await storage.getUser(DEMO_PICKER_ID_CHECK);
        const existingDriver = await storage.getUser(DEMO_DRIVER_ID_CHECK);
        
        if (!existingPicker) {
          await db.insert(users).values({
            id: DEMO_PICKER_ID_CHECK,
            username: "picker1",
            password: "picker123",
            phone: "+6281234567890",
            role: "picker",
          });
        }
        
        if (!existingDriver) {
          await db.insert(users).values({
            id: DEMO_DRIVER_ID_CHECK,
            username: "driver1",
            password: "driver123",
            phone: "+6281234567891",
            role: "driver",
          });
        }

        const existingStaff = await storage.getStoreStaff(DEMO_STORE_ID_CHECK);
        if (existingStaff.length === 0) {
          await db.insert(storeStaff).values([
            {
              id: "staff-picker-1",
              userId: DEMO_PICKER_ID_CHECK,
              storeId: DEMO_STORE_ID_CHECK,
              role: "picker",
              status: "online",
            },
            {
              id: "staff-driver-1",
              userId: DEMO_DRIVER_ID_CHECK,
              storeId: DEMO_STORE_ID_CHECK,
              role: "driver",
              status: "online",
            },
          ]);
        }

        const inventoryEntries = allProducts.map((product, index) => ({
          id: `inventory-${index + 1}`,
          storeId: DEMO_STORE_ID_CHECK,
          productId: product.id,
          stockCount: 50,
          isAvailable: true,
        }));

        await db.insert(storeInventory).values(inventoryEntries);
        
        return res.json({ message: "Store data seeded successfully" });
      }
      
      
      return res.json({ message: "Data already seeded" });
    }

    // Full seed logic (categories + products + stores)...
    // [Keep your existing seed logic here]
    
    res.json({ message: "Data seeded successfully" });
  } catch (error) {
    console.error("Seed error:", error);
    res.status(500).json({ error: "Failed to seed data" });
  }
});




// ===== GET ACTIVE PROMOTIONS =====
console.log("🌙 Registering Ramadan promotions routes...");
app.get("/api/promotions/active", async (req, res) => {
  try {
    const { userId } = req.query;
    const now = new Date();

    // ✅ Get all active promotions with normalized image fields
    const activePromotions = await db
      .select({
        id: promotions.id,
        title: promotions.title,
        description: promotions.description,
        type: promotions.type,
        discountValue: promotions.discountValue,
        minOrder: promotions.minOrder,
        icon: promotions.icon,
        color: promotions.color,

        // 🔥 IMPORTANT FIX
        image: sql<string>`COALESCE(${promotions.bannerImage}, ${promotions.image})`,
        bannerImage: promotions.bannerImage,

        validFrom: promotions.validFrom,
        validUntil: promotions.validUntil,
        scope: promotions.scope,
        storeId: promotions.storeId,
        userLimit: promotions.userLimit,
        usageLimit: promotions.usageLimit,
        usedCount: promotions.usedCount,
        targetUsers: promotions.targetUsers,
        specificUserIds: promotions.specificUserIds,
        priority: promotions.priority,
        createdAt: promotions.createdAt,
      })
      .from(promotions)
      .where(
        and(
          eq(promotions.isActive, true),
          lte(promotions.validFrom, now),
          gte(promotions.validUntil, now)
        )
      )
      .orderBy(sql`${promotions.priority} DESC, ${promotions.createdAt} DESC`);

    // 🔹 If no userId, return directly
    if (!userId) {
      return res.json(activePromotions);
    }

    // Get user info
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId as string));

    // Get user's promotion usage
    const userUsage = await db
      .select({
        promotionId: userPromotionUsage.promotionId,
        count: sql<number>`count(*)::int`,
      })
      .from(userPromotionUsage)
      .where(eq(userPromotionUsage.userId, userId as string))
      .groupBy(userPromotionUsage.promotionId);

    const usageMap = new Map(userUsage.map(u => [u.promotionId, u.count]));

    // Filter eligible promotions
    const eligiblePromotions = activePromotions.filter(promo => {
      const userUsageCount = usageMap.get(promo.id) || 0;
      if (userUsageCount >= promo.userLimit) return false;
      if (promo.usageLimit && promo.usedCount >= promo.usageLimit) return false;

      if (promo.targetUsers === "new_users" && !user?.isNewUser) return false;
      if (promo.targetUsers === "returning_users" && user?.isNewUser) return false;

      if (promo.targetUsers === "specific_users") {
        const ids = (promo.specificUserIds as string[]) || [];
        if (!ids.includes(userId as string)) return false;
      }

      return true;
    });

    res.json(eligiblePromotions);
  } catch (error) {
    console.error("❌ Get promotions error:", error);
    res.status(500).json({ error: "Failed to fetch promotions" });
  }
});


// ===== GET FEATURED RAMADAN PROMOTIONS (FOR BANNER) =====
app.get("/api/promotions/featured", async (req, res) => {
  try {
    const now = new Date();

    const featured = await db
      .select()
      .from(promotions)
      .where(
        and(
          eq(promotions.isActive, true),
          eq(promotions.isFeatured, true),
          lte(promotions.validFrom, now),
          gte(promotions.validUntil, now)
        )
      )
      .orderBy(sql`${promotions.priority} DESC`)
      .limit(5);

    res.json(featured);
  } catch (error) {
    console.error("❌ Get featured promotions error:", error);
    res.status(500).json({ error: "Failed to fetch featured promotions" });
  }
});

// ===== GET ACTIVE VOUCHERS =====

app.get("/api/vouchers/active", async (req, res) => {
  try {
    const { userId } = req.query;
    const now = new Date();

    console.log("📋 Fetching active vouchers for user:", userId);

    // Get all active vouchers with better error handling
    let activeVouchers;
    try {
      activeVouchers = await db
        .select()
        .from(vouchers)
        .where(
          and(
            eq(vouchers.isActive, true),
            lte(vouchers.validFrom, now),
            gte(vouchers.validUntil, now)
          )
        )
        .orderBy(sql`${vouchers.priority} DESC, ${vouchers.createdAt} DESC`);
    } catch (dbError) {
      console.error("❌ Database error fetching vouchers:", dbError);
      // Return empty array instead of crashing
      return res.json([]);
    }

    console.log(`✅ Found ${activeVouchers.length} active vouchers`);

    // If no userId provided, return all active vouchers
    if (!userId) {
      console.log("⚠️ No userId provided, returning all vouchers");
      return res.json(activeVouchers);
    }

    // Get user info for targeting with error handling
    let user;
    try {
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, userId as string))
        .limit(1);
      
      user = userResult[0];
    } catch (userError) {
      console.error("❌ Error fetching user:", userError);
      // Return all vouchers if user lookup fails
      return res.json(activeVouchers);
    }

    if (!user) {
      console.log("⚠️ User not found, returning all vouchers");
      return res.json(activeVouchers);
    }

    // ✅ FIXED: Get user's voucher usage with proper TypeScript types
    let userUsage: Array<{ voucherId: string; count: number }> = [];
    try {
      userUsage = await db
        .select({
          voucherId: userVoucherUsage.voucherId,
          count: sql<number>`count(*)::int`,
        })
        .from(userVoucherUsage)
        .where(eq(userVoucherUsage.userId, userId as string))
        .groupBy(userVoucherUsage.voucherId);
    } catch (usageError) {
      console.error("❌ Error fetching usage:", usageError);
      // Continue with empty usage if lookup fails
    }

    const usageMap = new Map(userUsage.map(u => [u.voucherId, u.count]));

    // Filter vouchers based on eligibility
    const eligibleVouchers = activeVouchers.filter(voucher => {
      const userUsageCount = usageMap.get(voucher.id) || 0;
      if (userUsageCount >= voucher.userLimit) return false;

      if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) return false;

      if (voucher.targetUsers === "new_users" && !user?.isNewUser) return false;
      if (voucher.targetUsers === "returning_users" && user?.isNewUser) return false;

      return true;
    });

    console.log(`✅ Returning ${eligibleVouchers.length} eligible vouchers for user`);
    res.json(eligibleVouchers);
  } catch (error) {
    console.error("❌ Get vouchers error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
    // Return empty array instead of 500 error
    res.json([]);
  }
});

// ===== VALIDATE VOUCHER CODE =====

app.post("/api/vouchers/validate", async (req: Request, res: Response) => {
  try {
    const { code, userId, orderTotal } = req.body;

    if (!code || !userId || orderTotal === undefined) {
      return res.status(400).json({
        valid: false,
        error: "Missing required fields",
      });
    }

    const now = new Date();

    // 1. Find voucher
    const [voucher] = await db
      .select()
      .from(vouchers)
      .where(
        and(
          eq(vouchers.code, code.toUpperCase()),
          eq(vouchers.isActive, true),
          lte(vouchers.validFrom, now),
          gte(vouchers.validUntil, now)
        )
      )
      .limit(1);

    if (!voucher) {
      return res.status(404).json({
        valid: false,
        error: "Voucher not found or expired",
      });
    }

    // 2. Global usage limit
    if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
      return res.status(400).json({
        valid: false,
        error: "Voucher usage limit reached",
      });
    }

    let assignmentId: string | null = null;

    // 3. IF AUTO-ASSIGNED → CHECK ASSIGNMENT TABLE
    if (voucher.autoAssign) {
      const [assignment] = await db
        .select()
        .from(userAssignedVouchers)
        .where(
          and(
            eq(userAssignedVouchers.userId, userId),
            eq(userAssignedVouchers.voucherId, voucher.id),
            eq(userAssignedVouchers.isActive, true),
            sql`${userAssignedVouchers.expiresAt} > ${now}`
          )
        )
        .limit(1);

      if (!assignment) {
        return res.status(400).json({
          valid: false,
          error: "This voucher is not available to you",
        });
      }

      if (assignment.usageCount >= voucher.userLimit) {
        return res.status(400).json({
          valid: false,
          error: "You've already used this voucher",
        });
      }

      assignmentId = assignment.id;
    } 
    // 4. GLOBAL VOUCHER → CHECK USER USAGE
    else {
      const result: Array<{ count: number }> = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(userVoucherUsage)
        .where(
          and(
            eq(userVoucherUsage.userId, userId),
            eq(userVoucherUsage.voucherId, voucher.id)
          )
        );

      const usageCount = result[0]?.count || 0;

      if (usageCount >= voucher.userLimit) {
        return res.status(400).json({
          valid: false,
          error: "You've already used this voucher",
        });
      }
    }

    // 5. Min order
    if (orderTotal < voucher.minOrder) {
      return res.status(400).json({
        valid: false,
        error: `Minimum order is Rp ${voucher.minOrder.toLocaleString("id-ID")}`,
      });
    }

    // 6. User targeting
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (user) {
      if (voucher.targetUsers === "new_users" && !user.isNewUser) {
        return res.status(400).json({
          valid: false,
          error: "This voucher is for new users only",
        });
      }
      if (voucher.targetUsers === "returning_users" && user.isNewUser) {
        return res.status(400).json({
          valid: false,
          error: "This voucher is for returning users only",
        });
      }
    }

    // 7. Discount calc
    let discount = 0;

    if (voucher.discountType === "percentage") {
      discount = Math.floor((orderTotal * voucher.discount) / 100);
      if (voucher.maxDiscount && discount > voucher.maxDiscount) {
        discount = voucher.maxDiscount;
      }
    } else {
      discount = voucher.discount;
    }

    return res.json({
      valid: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        discount,
        description: voucher.description,
        assignmentId, // null if global
      },
    });
  } catch (error) {
    console.error("Validate voucher error:", error);
    return res.status(500).json({
      valid: false,
      error: "Failed to validate voucher",
    });
  }
});


// ===== CALCULATE ORDER WITH PROMOTIONS =====
app.post("/api/orders/calculate", async (req, res) => {
  try {
    const { userId, items, voucherCode, promotionId } = req.body;

    if (!userId || !items?.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Calculate subtotal
    let subtotal = 0;
    for (const item of items) {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, item.productId));
      
      if (product) {
        subtotal += product.price * item.quantity;
      }
    }

    const deliveryFee = 10000;
    let promotionDiscount = 0;
    let voucherDiscount = 0;
    let freeDelivery = false;
    let appliedPromotion = null;
    let appliedVoucher = null;

    // Apply promotion if provided
    if (promotionId) {
      const [promotion] = await db
        .select()
        .from(promotions)
        .where(eq(promotions.id, promotionId));

      if (promotion && promotion.isActive) {
        if (subtotal >= promotion.minOrder) {
          if (promotion.type === "percentage") {
            promotionDiscount = Math.floor((subtotal * promotion.discountValue!) / 100);
            if (promotion.maxDiscount && promotionDiscount > promotion.maxDiscount) {
              promotionDiscount = promotion.maxDiscount;
            }
          } else if (promotion.type === "fixed_amount") {
            promotionDiscount = promotion.discountValue!;
          } else if (promotion.type === "free_delivery") {
            freeDelivery = true;
          }
          appliedPromotion = promotion;
        }
      }
    }

    // Apply voucher if provided
    if (voucherCode) {
      const validateResult = await fetch(
        `${process.env.EXPO_PUBLIC_DOMAIN}/api/vouchers/validate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: voucherCode,
            userId,
            orderTotal: subtotal - promotionDiscount,
          }),
        }
      );

      if (validateResult.ok) {
        const data = await validateResult.json();
        if (data.valid) {
          voucherDiscount = data.voucher.discount;
          appliedVoucher = data.voucher;
        }
      }
    }

    const finalDeliveryFee = freeDelivery ? 0 : deliveryFee;
    const total = subtotal - promotionDiscount - voucherDiscount + finalDeliveryFee;

    res.json({
      subtotal,
      promotionDiscount,
      voucherDiscount,
      deliveryFee: finalDeliveryFee,
      freeDelivery,
      total: Math.max(0, total),
      appliedPromotion,
      appliedVoucher,
    });
  } catch (error) {
    console.error("❌ Calculate order error:", error);
    res.status(500).json({ error: "Failed to calculate order" });
  }
});

// ===== SEND RAMADAN PROMOTION NOTIFICATIONS =====

app.post("/api/promotions/notify", async (req, res) => {
  try {
    const { promotionId, targetUsers } = req.body;

    if (!promotionId) {
      return res.status(400).json({ error: "Promotion ID required" });
    }

    const [promotion] = await db
      .select()
      .from(promotions)
      .where(eq(promotions.id, promotionId));

    if (!promotion) {
      return res.status(404).json({ error: "Promotion not found" });
    }

    // ✅ FIXED: Explicitly type usersToNotify
    let usersToNotify: Array<{
      id: string;
      username: string;
      password: string;
      name: string | null;
      phone: string | null;
      email: string | null;
      appleId: string | null;
      googleId: string | null;
      role: string;
      accountStatus: string;
      areaId: number | null;
      storeId: number | null;
      pushToken: string | null;
      firstLogin: boolean;
      isNewUser: boolean;
      firstOrderAt: Date | null;
      totalOrders: number;
      createdAt: Date;
    }> = [];
    
    if (targetUsers === "all" || !targetUsers) {
      usersToNotify = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.role, "customer"),
            sql`${users.pushToken} IS NOT NULL`
          )
        );
    } else if (targetUsers === "new_users") {
      usersToNotify = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.role, "customer"),
            eq(users.isNewUser, true),
            sql`${users.pushToken} IS NOT NULL`
          )
        );
    } else if (targetUsers === "returning_users") {
      usersToNotify = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.role, "customer"),
            eq(users.isNewUser, false),
            sql`${users.pushToken} IS NOT NULL`
          )
        );
    }

    // Send push notifications
    const notifications = usersToNotify.map(user => ({
      to: user.pushToken!,
      sound: 'default' as const,
      title: `🌙 ${promotion.title}`,
      body: promotion.description,
      data: {
        type: 'ramadan_promotion',
        promotionId: promotion.id,
        screen: 'Home',
      },
    }));

    // Send in batches
    const BATCH_SIZE = 100;
    let successCount = 0;
    
    for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
      const batch = notifications.slice(i, i + BATCH_SIZE);
      
      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(batch),
        });
        
        if (response.ok) {
          successCount += batch.length;
        }
      } catch (batchError) {
        console.error('Batch notification error:', batchError);
      }
    }

    console.log(`✅ Sent ${successCount} Ramadan promotion notifications`);
    
    res.json({
      success: true,
      sent: successCount,
      total: notifications.length,
    });
  } catch (error) {
    console.error("❌ Send promotion notifications error:", error);
    res.status(500).json({ error: "Failed to send notifications" });
  }
});

// ===== ADMIN: CREATE RAMADAN PROMOTION =====
app.post("/api/admin/promotions", async (req, res) => {
  try {
    const promotionData = req.body;

    const [newPromotion] = await db
      .insert(promotions)
      .values({
        ...promotionData,
        isActive: true,
        usedCount: 0,
      })
      .returning();

    console.log(`✅ Created promotion: ${newPromotion.title}`);

    res.json(newPromotion);
  } catch (error) {
    console.error("❌ Create promotion error:", error);
    res.status(500).json({ error: "Failed to create promotion" });
  }
});

// ===== ADMIN: CREATE RAMADAN VOUCHER =====
app.post("/api/admin/vouchers", async (req, res) => {
  try {
    const voucherData = req.body;

    const [newVoucher] = await db
      .insert(vouchers)
      .values({
        ...voucherData,
        code: voucherData.code.toUpperCase(),
        isActive: true,
        usedCount: 0,
      })
      .returning();

    console.log(`✅ Created voucher: ${newVoucher.code}`);

    res.json(newVoucher);
  } catch (error) {
    console.error("❌ Create voucher error:", error);
    res.status(500).json({ error: "Failed to create voucher" });
  }
});

// ===== GET RAMADAN SPECIAL PRODUCTS =====
app.get("/api/products/ramadan-specials", async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: "Location required" });
    }

    const result = await db.execute(sql`
      SELECT
        p.id,
        p.name,
        p.brand,
        p.price,
        p.original_price AS "originalPrice",
        p.ramadan_discount AS "ramadanDiscount",
        p.image,
        p.category_id AS "categoryId",
        p.description,
        si.stock_count AS "stockCount",
        s.id AS "storeId",
        s.name AS "storeName",
        (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(${parseFloat(lat as string)}::numeric))
              * cos(radians(s.latitude::numeric))
              * cos(radians(s.longitude::numeric) - radians(${parseFloat(lng as string)}::numeric))
              + sin(radians(${parseFloat(lat as string)}::numeric))
              * sin(radians(s.latitude::numeric))
            ))
          )
        ) AS distance
      FROM stores s
      JOIN store_inventory si ON si.store_id = s.id
      JOIN products p ON p.id = si.product_id
      WHERE
        p.is_ramadan_special = true
        AND s.is_active = true
        AND si.stock_count > 0
        AND (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(${parseFloat(lat as string)}::numeric))
              * cos(radians(s.latitude::numeric))
              * cos(radians(s.longitude::numeric) - radians(${parseFloat(lng as string)}::numeric))
              + sin(radians(${parseFloat(lat as string)}::numeric))
              * sin(radians(s.latitude::numeric))
            ))
          )
        ) <= 5
      ORDER BY distance ASC
      LIMIT 20;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("❌ Get Ramadan specials error:", error);
    res.status(500).json({ error: "Failed to fetch Ramadan specials" });
  }
});




// ===== PICKER: CREATE PROMOTION FOR THEIR STORE =====
app.post("/api/picker/promotions", uploadPromotion.single("image"), async (req, res) => {
  try {
    const { userId, title, description, type, discountValue, minOrder, validUntil, showInBanner } = req.body;

    console.log("📝 Picker creating promotion:", { userId, title, hasImage: !!req.file });

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    // Get picker's store
    const [staff] = await db
      .select()
      .from(storeStaff)
      .where(eq(storeStaff.userId, userId));

    if (!staff) {
      return res.status(403).json({ error: "Not assigned to any store" });
    }

    // Prepare promotion data
    const promoData: any = {
      title,
      description,
      type,
      discountValue: discountValue ? parseInt(discountValue) : null,
      minOrder: minOrder ? parseInt(minOrder) : 0,
      validFrom: new Date(),
      validUntil: new Date(validUntil),
      storeId: staff.storeId,
      createdBy: userId,
      scope: "store",
      showInBanner: showInBanner === "true" || showInBanner === true,
      isActive: true,
      usedCount: 0,
      userLimit: 1,
      icon: "gift",
      color: "#10b981",
      priority: 0,
    };

    // Add image if uploaded
    if (req.file) {
      const imageUrl = `/uploads/promotions/${req.file.filename}`;
      promoData.bannerImage = imageUrl;
      promoData.image = imageUrl;
      console.log("✅ Image uploaded:", imageUrl);
    }

    const [newPromotion] = await db
      .insert(promotions)
      .values(promoData)
      .returning();

    console.log(`✅ Picker created promotion: ${newPromotion.title} for store ${staff.storeId}`);
    res.json(newPromotion);
  } catch (error) {
    console.error("❌ Picker create promotion error:", error);
    res.status(500).json({ error: "Failed to create promotion" });
  }
});



// ===== PICKER: GET THEIR STORE'S PROMOTIONS =====
app.get("/api/picker/promotions", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    // Get picker's store
    const [staff] = await db
      .select()
      .from(storeStaff)
      .where(eq(storeStaff.userId, userId as string));

    if (!staff) {
      return res.status(403).json({ error: "Not assigned to any store" });
    }

    // ✅ FIXED: Get all promotions for this store
    const storePromotions = await db
      .select()
      .from(promotions)
      .where(eq(promotions.storeId, staff.storeId))
      .orderBy(sql`${promotions.createdAt} DESC`);

    console.log(`✅ Picker fetched ${storePromotions.length} promotions for store ${staff.storeId}`);
    res.json(storePromotions);
  } catch (error) {
    console.error("❌ Get picker promotions error:", error);
    res.status(500).json({ error: "Failed to fetch promotions" });
  }
});

// ===== PICKER: UPDATE PROMOTION WITH IMAGE =====
app.patch("/api/picker/promotions/:id", uploadPromotion.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, title, description, discountValue, minOrder, validUntil, isActive, showInBanner } = req.body;

    console.log("📝 Picker updating promotion:", { id, userId, hasNewImage: !!req.file });

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    // Get picker's store
    const [staff] = await db
      .select()
      .from(storeStaff)
      .where(eq(storeStaff.userId, userId));

    if (!staff) {
      return res.status(403).json({ error: "Not assigned to any store" });
    }

    // Verify promotion belongs to their store
    const [promotion] = await db
      .select()
      .from(promotions)
      .where(eq(promotions.id, id));

    if (!promotion || promotion.storeId !== staff.storeId) {
      return res.status(403).json({ error: "Promotion not found or not yours" });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (discountValue !== undefined) updateData.discountValue = parseInt(discountValue);
    if (minOrder !== undefined) updateData.minOrder = parseInt(minOrder);
    if (validUntil !== undefined) updateData.validUntil = new Date(validUntil);
    if (isActive !== undefined) updateData.isActive = isActive === "true" || isActive === true;
    if (showInBanner !== undefined) updateData.showInBanner = showInBanner === "true" || showInBanner === true;

    // Update image if new one uploaded
    if (req.file) {
      const imageUrl = `/uploads/promotions/${req.file.filename}`;
      updateData.bannerImage = imageUrl;
      updateData.image = imageUrl;
      console.log("✅ New image uploaded:", imageUrl);
    }

    const [updated] = await db
      .update(promotions)
      .set(updateData)
      .where(eq(promotions.id, id))
      .returning();

    console.log(`✅ Picker updated promotion: ${id}`);
    res.json(updated);
  } catch (error) {
    console.error("❌ Update promotion error:", error);
    res.status(500).json({ error: "Failed to update promotion" });
  }
});

// ===== PICKER: DELETE PROMOTION =====
app.delete("/api/picker/promotions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    // Get picker's store
    const [staff] = await db
      .select()
      .from(storeStaff)
      .where(eq(storeStaff.userId, userId as string));

    if (!staff) {
      return res.status(403).json({ error: "Not assigned to any store" });
    }

    // Verify promotion belongs to their store
    const [promotion] = await db
      .select()
      .from(promotions)
      .where(eq(promotions.id, id));

    if (!promotion || promotion.storeId !== staff.storeId) {
      return res.status(403).json({ error: "Promotion not found or not yours" });
    }

    // ✅ FIXED: Delete promotion
    await db.delete(promotions).where(eq(promotions.id, id));

    console.log(`✅ Picker deleted promotion: ${id}`);
    res.json({ success: true, message: "Promotion deleted" });
  } catch (error) {
    console.error("❌ Delete promotion error:", error);
    res.status(500).json({ error: "Failed to delete promotion" });
  }
});


app.get("/api/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      phone: user.phone,
      email: user.email,
    });
  } catch (error) {
    console.error("❌ Get user error:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.get("/api/admin/promotions", async (req, res) => {
  try {
    const { userId } = req.query;

    console.log("🔍 Admin promotions request from userId:", userId);

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    // Check if user exists and has admin access
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId as string));

    if (!user) {
      console.log("❌ User not found:", userId);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("✅ User found:", user.username, "Role:", user.role);

    // Allow admin OR demo-user to access
    if (user.role !== "admin" && userId !== "demo-user") {
      console.log("❌ Access denied - not admin or demo-user");
      return res.status(403).json({ error: "Admin access required" });
    }

    console.log("✅ Access granted - fetching promotions...");

    // Fetch all promotions with store and creator info
    const allPromotions = await db
      .select({
        id: promotions.id,
        title: promotions.title,
        description: promotions.description,
        type: promotions.type,
        discountValue: promotions.discountValue,
        minOrder: promotions.minOrder,
        validFrom: promotions.validFrom,
        validUntil: promotions.validUntil,
        storeId: promotions.storeId,
        scope: promotions.scope,
        isActive: promotions.isActive,
        usedCount: promotions.usedCount,
        showInBanner: promotions.showInBanner,
        icon: promotions.icon,
        color: promotions.color,
        maxDiscount: promotions.maxDiscount,
        // Use COALESCE to prefer bannerImage, fallback to image
        image: sql<string>`COALESCE(${promotions.bannerImage}, ${promotions.image})`,
        bannerImage: promotions.bannerImage,
        createdAt: promotions.createdAt,
        storeName: stores.name,
        creatorName: users.username,
      })
      .from(promotions)
      .leftJoin(stores, eq(promotions.storeId, stores.id))
      .leftJoin(users, eq(promotions.createdBy, users.id))
      .orderBy(sql`${promotions.createdAt} DESC`);

    console.log(`✅ Successfully fetched ${allPromotions.length} promotions`);
    res.json(allPromotions);
  } catch (error) {
    console.error("❌ Get admin promotions error:", error);
    res.status(500).json({ 
      error: "Failed to fetch promotions",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ===== ADMIN: CREATE PROMOTION WITH IMAGE =====
app.post("/api/admin/promotions", uploadPromotion.single("image"), async (req, res) => {
  try {
    const { userId, title, description, type, discountValue, minOrder, validUntil, showInBanner, scope, applicableStoreIds } = req.body;

    console.log("📝 Creating promotion:", { 
      userId, 
      title, 
      type, 
      scope,
      hasImage: !!req.file,
      imageFile: req.file ? {
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null
    });

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    if (!title || !description || !type || !validUntil) {
      return res.status(400).json({ error: "Missing required fields: title, description, type, validUntil" });
    }

    // Verify admin access
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role !== "admin" && userId !== "demo-user") {
      return res.status(403).json({ error: "Admin access required" });
    }

    console.log("✅ Admin verified, creating promotion...");

    // Parse applicableStoreIds if it's a JSON string
    let storeIds = null;
    if (applicableStoreIds) {
      try {
        storeIds = typeof applicableStoreIds === 'string' 
          ? JSON.parse(applicableStoreIds) 
          : applicableStoreIds;
      } catch (e) {
        console.error("Failed to parse applicableStoreIds:", e);
      }
    }

    // Prepare promotion data
    const promoData: any = {
      title: title.trim(),
      description: description.trim(),
      type,
      discountValue: discountValue ? parseInt(discountValue) : null,
      minOrder: minOrder ? parseInt(minOrder) : 0,
      validFrom: new Date(),
      validUntil: new Date(validUntil),
      createdBy: userId,
      scope: scope || "app",
      showInBanner: showInBanner === "true" || showInBanner === true,
      isActive: true,
      usedCount: 0,
      userLimit: 1,
      icon: "gift",
      color: "#10b981",
      priority: 0,
    };

    // Handle store assignment based on scope
    if (scope === "store" && storeIds?.length === 1) {
      promoData.storeId = storeIds[0];
      promoData.applicableStoreIds = null;
    } else if (scope === "store" && storeIds?.length > 1) {
      promoData.storeId = null;
      promoData.applicableStoreIds = storeIds;
    } else {
      promoData.storeId = null;
      promoData.applicableStoreIds = null;
    }

    // Add image if uploaded
    if (req.file) {
      const imageUrl = `/uploads/promotions/${req.file.filename}`;
      promoData.bannerImage = imageUrl;
      promoData.image = imageUrl;
      console.log("✅ Image saved:", imageUrl);
    } else {
      console.log("⚠️ No image uploaded");
    }

    console.log("💾 Inserting promotion with data:", {
      ...promoData,
      // Don't log the full description
      description: promoData.description.substring(0, 50) + "..."
    });

    // Insert promotion
    const [newPromotion] = await db
      .insert(promotions)
      .values(promoData)
      .returning();

    console.log(`✅ Admin created promotion: ${newPromotion.id} - ${newPromotion.title}`);
    
    res.status(201).json(newPromotion);
  } catch (error) {
    console.error("❌ Admin create promotion error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
    res.status(500).json({ 
      error: "Failed to create promotion",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ===== ADMIN: UPDATE PROMOTION WITH IMAGE =====
app.patch("/api/admin/promotions/:id", uploadPromotion.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, title, description, discountValue, minOrder, validUntil, isActive, showInBanner, scope, applicableStoreIds } = req.body;

    console.log("📝 Updating promotion:", { id, userId, hasNewImage: !!req.file });

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    // Verify admin access
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role !== "admin" && userId !== "demo-user") {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Parse applicableStoreIds if it's a string
    let storeIds = null;
    if (applicableStoreIds !== undefined) {
      try {
        storeIds = typeof applicableStoreIds === 'string' 
          ? JSON.parse(applicableStoreIds) 
          : applicableStoreIds;
      } catch (e) {
        console.error("Failed to parse applicableStoreIds:", e);
      }
    }

    // Build update object
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (discountValue !== undefined) updateData.discountValue = parseInt(discountValue);
    if (minOrder !== undefined) updateData.minOrder = parseInt(minOrder);
    if (validUntil !== undefined) updateData.validUntil = new Date(validUntil);
    if (isActive !== undefined) updateData.isActive = isActive === "true" || isActive === true;
    if (showInBanner !== undefined) updateData.showInBanner = showInBanner === "true" || showInBanner === true;
    if (scope !== undefined) updateData.scope = scope;
    
    // Handle store assignment
    if (applicableStoreIds !== undefined) {
      if (scope === "store" && storeIds?.length === 1) {
        updateData.storeId = storeIds[0];
        updateData.applicableStoreIds = null;
      } else if (scope === "store" && storeIds?.length > 1) {
        updateData.storeId = null;
        updateData.applicableStoreIds = storeIds;
      } else {
        updateData.storeId = null;
        updateData.applicableStoreIds = null;
      }
    }

    // Update image if new one uploaded
    if (req.file) {
      const imageUrl = `/uploads/promotions/${req.file.filename}`;
      updateData.bannerImage = imageUrl;
      updateData.image = imageUrl;
      console.log("✅ New image uploaded:", imageUrl);
    }

    console.log("💾 Updating promotion with:", updateData);

    // Perform update
    const [updated] = await db
      .update(promotions)
      .set(updateData)
      .where(eq(promotions.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Promotion not found" });
    }

    console.log(`✅ Admin updated promotion: ${id}`);
    res.json(updated);
  } catch (error) {
    console.error("❌ Admin update promotion error:", error);
    res.status(500).json({ 
      error: "Failed to update promotion",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ===== ADMIN: DELETE PROMOTION =====
app.delete("/api/admin/promotions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    console.log("🗑️ Deleting promotion:", { id, userId });

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    // Verify admin access
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId as string));

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role !== "admin" && userId !== "demo-user") {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Delete the promotion
    const [deleted] = await db
      .delete(promotions)
      .where(eq(promotions.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Promotion not found" });
    }

    console.log(`✅ Admin deleted promotion: ${id}`);
    res.json({ success: true, message: "Promotion deleted successfully" });
  } catch (error) {
    console.error("❌ Admin delete promotion error:", error);
    res.status(500).json({ 
      error: "Failed to delete promotion",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});




// ===== HOME: GET PROMOTION BANNERS FROM NEAREST STORES =====
// ==================== PROMOTIONS & VOUCHERS ROUTES ====================
console.log("🌙 Registering promotions and vouchers routes...");

// ===== GET PROMOTION BANNERS (FOR HOME SCREEN) =====
app.get("/api/promotions/banners", async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    console.log("🎯 Fetching promotion banners for location:", { lat, lng });

    if (isNaN(lat) || isNaN(lng)) {
      console.log("⚠️ Invalid coordinates, returning empty array");
      return res.json([]);
    }

    const now = new Date();

    try {
      const result = await db.execute(sql`
        SELECT
          p.id,
          p.title,
          p.description,
          p.type,
          p.discount_value AS "discountValue",
          p.min_order AS "minOrder",
          p.banner_image AS "bannerImage",
          p.icon,
          p.color,
          p.scope,
          p.store_id AS "storeId",
          p.valid_from AS "validFrom",
          p.valid_until AS "validUntil",
          s.name AS "storeName",
          s.address AS "storeAddress",
          COALESCE(
            (
              6371 * acos(
                LEAST(1.0, GREATEST(-1.0,
                  cos(radians(${lat}::numeric))
                  * cos(radians(s.latitude::numeric))
                  * cos(radians(s.longitude::numeric) - radians(${lng}::numeric))
                  + sin(radians(${lat}::numeric))
                  * sin(radians(s.latitude::numeric))
                ))
              )
            ),
            999999
          ) AS distance,
          p.priority
        FROM promotions p
        LEFT JOIN stores s ON p.store_id = s.id
        WHERE
          p.is_active = true
          AND p.show_in_banner = true
          AND p.valid_from <= ${now}
          AND p.valid_until >= ${now}
          AND (
            p.scope = 'app'
            OR (
              p.scope = 'store'
              AND s.is_active = true
              AND (
                6371 * acos(
                  LEAST(1.0, GREATEST(-1.0,
                    cos(radians(${lat}::numeric))
                    * cos(radians(s.latitude::numeric))
                    * cos(radians(s.longitude::numeric) - radians(${lng}::numeric))
                    + sin(radians(${lat}::numeric))
                    * sin(radians(s.latitude::numeric))
                  ))
                )
              ) <= 5
            )
          )
        ORDER BY 
          CASE WHEN p.scope = 'app' THEN 0 ELSE 1 END,
          p.priority DESC, 
          distance ASC
        LIMIT 10;
      `);

      console.log(`✅ Found ${result.rows.length} promotion banners`);
      res.json(result.rows);
    } catch (dbError) {
      console.error("❌ Database error fetching promotions:", dbError);
      res.json([]);
    }
  } catch (error) {
    console.error("❌ Get promotion banners error:", error);
    res.json([]);
  }
});

// ===== CLAIM A PROMOTION =====
app.post("/api/promotions/claim", async (req, res) => {
  try {
    const { userId, promotionId } = req.body;

    console.log("🎁 Claim request:", { userId, promotionId });

    if (!userId || !promotionId) {
      return res.status(400).json({ error: "userId and promotionId required" });
    }

    // Verify user exists
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify promotion exists and is active
    const [promotion] = await db
      .select()
      .from(promotions)
      .where(eq(promotions.id, promotionId));

    if (!promotion) {
      return res.status(404).json({ error: "Promotion not found" });
    }

    if (!promotion.isActive) {
      return res.status(400).json({ error: "Promotion is no longer active" });
    }

    const now = new Date();
    if (now < new Date(promotion.validFrom) || now > new Date(promotion.validUntil)) {
      return res.status(400).json({ error: "Promotion is not valid at this time" });
    }

    // Check if already claimed
    const existing = await db
      .select()
      .from(userClaimedPromotions)
      .where(
        and(
          eq(userClaimedPromotions.userId, userId),
          eq(userClaimedPromotions.promotionId, promotionId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      console.log(`⚠️ Already claimed by user ${userId}`);
      return res.json({
        success: true,
        message: "Promotion already claimed",
        alreadyClaimed: true,
      });
    }

    // Create claimed record
    const [claimed] = await db
      .insert(userClaimedPromotions)
      .values({
        userId,
        promotionId,
      })
      .returning();

    console.log(`✅ Successfully claimed promotion ${promotionId}`);

    res.json({
      success: true,
      message: "Promotion claimed successfully",
      claimed,
      promotion,
    });
  } catch (error) {
    console.error("❌ Claim promotion error:", error);
    res.status(500).json({ error: "Failed to claim promotion" });
  }
});

// ===== GET USER'S CLAIMED PROMOTIONS =====
app.get("/api/promotions/claimed", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    console.log(`📋 Fetching claimed promotions for user: ${userId}`);

    const now = new Date();

    const claimedPromotions = await db
      .select({
        claimedPromotion: userClaimedPromotions,
        promotion: promotions,
        store: stores,
      })
      .from(userClaimedPromotions)
      .leftJoin(promotions, eq(userClaimedPromotions.promotionId, promotions.id))
      .leftJoin(stores, eq(promotions.storeId, stores.id))
      .where(
        and(
          eq(userClaimedPromotions.userId, userId as string),
          eq(userClaimedPromotions.isActive, true),
          eq(promotions.isActive, true),
          lte(promotions.validFrom, now),
          gte(promotions.validUntil, now)
        )
      )
      .orderBy(sql`${userClaimedPromotions.claimedAt} DESC`);

    console.log(`✅ Found ${claimedPromotions.length} claimed promotions`);

    const formatted = claimedPromotions.map((item) => ({
      ...item.promotion,
      claimedAt: item.claimedPromotion.claimedAt,
      storeName: item.store?.name,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("❌ Get claimed promotions error:", error);
    res.status(500).json({ error: "Failed to fetch claimed promotions" });
  }
});

// ===== GET ACTIVE VOUCHERS =====
app.get("/api/vouchers/active", async (req, res) => {
  try {
    const { userId } = req.query;
    const now = new Date();

    console.log("📋 Fetching active vouchers for user:", userId);

    let activeVouchers;
    try {
      activeVouchers = await db
        .select()
        .from(vouchers)
        .where(
          and(
            eq(vouchers.isActive, true),
            lte(vouchers.validFrom, now),
            gte(vouchers.validUntil, now)
          )
        )
        .orderBy(sql`${vouchers.priority} DESC, ${vouchers.createdAt} DESC`);
    } catch (dbError) {
      console.error("❌ Database error fetching vouchers:", dbError);
      return res.json([]);
    }

    console.log(`✅ Found ${activeVouchers.length} active vouchers`);

    if (!userId) {
      console.log("⚠️ No userId provided, returning all vouchers");
      return res.json(activeVouchers);
    }

    let user;
    try {
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, userId as string))
        .limit(1);
      
      user = userResult[0];
    } catch (userError) {
      console.error("❌ Error fetching user:", userError);
      return res.json(activeVouchers);
    }

    if (!user) {
      console.log("⚠️ User not found, returning all vouchers");
      return res.json(activeVouchers);
    }

    let userUsage: Array<{ voucherId: string; count: number }> = [];
    try {
      userUsage = await db
        .select({
          voucherId: userVoucherUsage.voucherId,
          count: sql<number>`count(*)::int`,
        })
        .from(userVoucherUsage)
        .where(eq(userVoucherUsage.userId, userId as string))
        .groupBy(userVoucherUsage.voucherId);
    } catch (usageError) {
      console.error("❌ Error fetching usage:", usageError);
    }

    const usageMap = new Map(userUsage.map(u => [u.voucherId, u.count]));

    const eligibleVouchers = activeVouchers.filter(voucher => {
      const userUsageCount = usageMap.get(voucher.id) || 0;
      if (userUsageCount >= voucher.userLimit) return false;

      if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) return false;

      if (voucher.targetUsers === "new_users" && !user?.isNewUser) return false;
      if (voucher.targetUsers === "returning_users" && user?.isNewUser) return false;

      return true;
    });

    console.log(`✅ Returning ${eligibleVouchers.length} eligible vouchers for user`);
    res.json(eligibleVouchers);
  } catch (error) {
    console.error("❌ Get vouchers error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
    res.json([]);
  }
});

// ===== VALIDATE VOUCHER CODE =====


// ===== HELPER FUNCTION: FIND BEST CLAIMED PROMOTION =====
async function findBestClaimedPromotion(
  userId: string,
  subtotal: number,
  storeId?: string
): Promise<any | null> {
  const now = new Date();

  try {
    const claimedPromotions = await db
      .select({
        promotion: promotions,
      })
      .from(userClaimedPromotions)
      .leftJoin(promotions, eq(userClaimedPromotions.promotionId, promotions.id))
      .where(
        and(
          eq(userClaimedPromotions.userId, userId),
          eq(userClaimedPromotions.isActive, true),
          eq(promotions.isActive, true),
          lte(promotions.validFrom, now),
          gte(promotions.validUntil, now),
          lte(promotions.minOrder, subtotal)
        )
      )
      .orderBy(sql`${promotions.priority} DESC`);

    if (!claimedPromotions.length) {
      return null;
    }

    for (const { promotion } of claimedPromotions) {
      if (!promotion) continue;

      if (promotion.scope === 'app') {
        return promotion;
      }

      if (promotion.scope === 'store' && promotion.storeId === storeId) {
        return promotion;
      }
    }

    return null;
  } catch (error) {
    console.error("❌ Find claimed promotion error:", error);
    return null;
  }
}


// ===== GET ASSIGNED VOUCHERS =====
app.get("/api/vouchers/assigned", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    console.log(`📋 Fetching assigned vouchers for user: ${userId}`);
    const now = new Date();

    const assignedVouchers = await db
      .select({
        assignment: userAssignedVouchers,
        voucher: vouchers,
      })
      .from(userAssignedVouchers)
      .leftJoin(vouchers, eq(userAssignedVouchers.voucherId, vouchers.id))
      .where(
        and(
          eq(userAssignedVouchers.userId, userId as string),
          eq(userAssignedVouchers.isActive, true),
          sql`${userAssignedVouchers.expiresAt} > ${now}`,
          eq(vouchers.isActive, true)
        )
      )
      .orderBy(sql`${userAssignedVouchers.assignedAt} DESC`);

    const formatted = assignedVouchers.map((item) => ({
      ...item.voucher,
      assignedAt: item.assignment.assignedAt,
      expiresAt: item.assignment.expiresAt,
      usageCount: item.assignment.usageCount,
      assignedBy: item.assignment.assignedBy,
      assignmentId: item.assignment.id,
      remainingUses: (item.voucher?.userLimit || 1) - item.assignment.usageCount,
    }));

    console.log(`✅ Found ${formatted.length} active assigned vouchers`);
    res.json(formatted);
  } catch (error) {
    console.error("❌ Get assigned vouchers error:", error);
    res.status(500).json({ error: "Failed to fetch vouchers" });
  }
});

// ===== GET VOUCHER HISTORY =====
app.get("/api/vouchers/history", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    console.log(`📋 Fetching voucher history for user: ${userId}`);

    const history = await db
      .select({
        log: voucherUsageLog,
        voucher: vouchers,
        order: orders,
      })
      .from(voucherUsageLog)
      .leftJoin(vouchers, eq(voucherUsageLog.voucherId, vouchers.id))
      .leftJoin(orders, eq(voucherUsageLog.orderId, orders.id))
      .where(eq(voucherUsageLog.userId, userId as string))
      .orderBy(sql`${voucherUsageLog.usedAt} DESC`)
      .limit(50);

    const formatted = history.map((item) => ({
      id: item.log.id,
      voucherCode: item.voucher?.code,
      voucherTitle: item.voucher?.title,
      discountApplied: item.log.discountApplied,
      orderNumber: item.order?.orderNumber,
      orderTotal: item.order?.total,
      usedAt: item.log.usedAt,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("❌ Get voucher history error:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// ===== VALIDATE VOUCHER =====


// ===== DAILY CRON JOB =====
app.post("/api/cron/daily-voucher-check", async (req, res) => {
  try {
    console.log("⏰ Running daily voucher assignment check...");

    const inactiveThreshold = 30;
    const inactiveDate = new Date();
    inactiveDate.setDate(inactiveDate.getDate() - inactiveThreshold);

    const inactiveUsers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.role, "customer"),
          sql`${users.lastOrderAt} < ${inactiveDate}`,
          sql`${users.lastOrderAt} IS NOT NULL`
        )
      );

    console.log(`📋 Found ${inactiveUsers.length} inactive users`);

    for (const user of inactiveUsers) {
      await checkAndAssignVouchers(user.id, "inactive_period");
    }

    const today = new Date();
    const birthdayUsers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.role, "customer"),
          sql`EXTRACT(MONTH FROM ${users.birthdate}) = ${today.getMonth() + 1}`,
          sql`EXTRACT(DAY FROM ${users.birthdate}) = ${today.getDate()}`,
          sql`${users.birthdate} IS NOT NULL`
        )
      );

    console.log(`🎂 Found ${birthdayUsers.length} users with birthdays today`);

    for (const user of birthdayUsers) {
      await checkAndAssignVouchers(user.id, "birthday");
    }

    const expiredAssignments = await db
      .update(userAssignedVouchers)
      .set({ isActive: false })
      .where(
        and(
          eq(userAssignedVouchers.isActive, true),
          sql`${userAssignedVouchers.expiresAt} < NOW()`
        )
      )
      .returning();

    console.log(`🗑️  Deactivated ${expiredAssignments.length} expired voucher assignments`);

    res.json({ 
      success: true,
      inactiveUsersChecked: inactiveUsers.length,
      birthdayUsersChecked: birthdayUsers.length,
      expiredAssignments: expiredAssignments.length,
    });
  } catch (error) {
    console.error("❌ Daily voucher check error:", error);
    res.status(500).json({ error: "Failed to run daily check" });
  }
});

// ===== ADMIN: CREATE VOUCHER TEMPLATE =====
app.post("/api/admin/vouchers/template", async (req, res) => {
  try {
    const { 
      title, description, type, trigger, discount, discountType, 
      maxDiscount, minOrder, daysValid, userLimit, usageLimit, assignmentRules 
    } = req.body;

    const code = `${type.toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const [voucher] = await db.insert(vouchers).values({
      code, title, description, type, trigger, discountType, discount,
      maxDiscount: maxDiscount || null,
      minOrder: minOrder || 0,
      daysValid: daysValid || 30,
      userLimit: userLimit ,
      usageLimit: usageLimit || null,
      autoAssign: true,
      assignmentRules: assignmentRules || {},
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
    }).returning();

    console.log(`✅ Created voucher template: ${voucher.title} (${voucher.code})`);
    res.json(voucher);
  } catch (error) {
    console.error("❌ Create voucher template error:", error);
    res.status(500).json({ error: "Failed to create voucher" });
  }
});


// ==================== ADMIN FINANCIAL DASHBOARD ====================

// GET STORE FINANCIALS
app.get("/api/admin/financials/store/:storeId", async (req, res) => {
  try {
    const { storeId } = req.params;
    const { period = "daily", startDate, endDate } = req.query;

    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
    } else if (period === "daily") {
      start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else {
      start = new Date();
      start.setMonth(start.getMonth() - 12);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }

    const financials = await db
      .select()
      .from(storeDailyFinancials)
      .where(
        and(
          eq(storeDailyFinancials.storeId, storeId),
          gte(storeDailyFinancials.date, start),
          lte(storeDailyFinancials.date, end)
        )
      )
      .orderBy(desc(storeDailyFinancials.date));

    const totals = financials.reduce(
      (acc, day) => ({
        totalOrders: acc.totalOrders + day.totalOrders,
        grossRevenue: acc.grossRevenue + parseFloat(String(day.grossRevenue)),
        productRevenue: acc.productRevenue + parseFloat(String(day.productRevenue)),
        deliveryFeeRevenue: acc.deliveryFeeRevenue + parseFloat(String(day.deliveryFeeRevenue)),
        productCosts: acc.productCosts + parseFloat(String(day.productCosts)),
        staffBonuses: acc.staffBonuses + parseFloat(String(day.staffBonuses)),
        promotionDiscounts: acc.promotionDiscounts + parseFloat(String(day.promotionDiscounts)),
        voucherDiscounts: acc.voucherDiscounts + parseFloat(String(day.voucherDiscounts)),
        grossProfit: acc.grossProfit + parseFloat(String(day.grossProfit)),
        netProfit: acc.netProfit + parseFloat(String(day.netProfit)),
      }),
      {
        totalOrders: 0,
        grossRevenue: 0,
        productRevenue: 0,
        deliveryFeeRevenue: 0,
        productCosts: 0,
        staffBonuses: 0,
        promotionDiscounts: 0,
        voucherDiscounts: 0,
        grossProfit: 0,
        netProfit: 0,
      }
    );

    const avgOrderValue = totals.totalOrders > 0 
      ? totals.grossRevenue / totals.totalOrders 
      : 0;
    
    const profitMargin = totals.grossRevenue > 0
      ? (totals.netProfit / totals.grossRevenue) * 100
      : 0;

    res.json({
      period: { start, end, type: period },
      financials,
      totals,
      metrics: {
        avgOrderValue,
        profitMargin,
        avgDailyOrders: totals.totalOrders / financials.length,
        avgDailyRevenue: totals.grossRevenue / financials.length,
      },
    });
  } catch (error) {
    console.error("❌ Get store financials error:", error);
    res.status(500).json({ error: "Failed to fetch financials" });
  }
});

// GET ALL STORES SUMMARY
app.get("/api/admin/financials/summary", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId as string));
    if (!user || (user.role !== "admin" && userId !== "demo-user")) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const today = getTodayMidnight();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const allStores = await db.select().from(stores);

    const storeFinancials = await Promise.all(
      allStores.map(async (store) => {
        const [todayData] = await db
          .select()
          .from(storeDailyFinancials)
          .where(
            and(
              eq(storeDailyFinancials.storeId, store.id),
              eq(storeDailyFinancials.date, today)
            )
          );

        const monthData = await db
          .select({
            totalOrders: sql<number>`SUM(${storeDailyFinancials.totalOrders})::int`,
            grossRevenue: sql<string>`SUM(${storeDailyFinancials.grossRevenue})`,
            netProfit: sql<string>`SUM(${storeDailyFinancials.netProfit})`,
          })
          .from(storeDailyFinancials)
          .where(
            and(
              eq(storeDailyFinancials.storeId, store.id),
              gte(storeDailyFinancials.date, monthStart)
            )
          );

        return {
          storeId: store.id,
          storeName: store.name,
          today: {
            orders: todayData?.totalOrders || 0,
            revenue: parseFloat(String(todayData?.grossRevenue || 0)),
            profit: parseFloat(String(todayData?.netProfit || 0)),
          },
          monthToDate: {
            orders: monthData[0]?.totalOrders || 0,
            revenue: parseFloat(monthData[0]?.grossRevenue || "0"),
            profit: parseFloat(monthData[0]?.netProfit || "0"),
          },
        };
      })
    );

    const globalTotals = storeFinancials.reduce(
      (acc, store) => ({
        todayOrders: acc.todayOrders + store.today.orders,
        todayRevenue: acc.todayRevenue + store.today.revenue,
        todayProfit: acc.todayProfit + store.today.profit,
        monthOrders: acc.monthOrders + store.monthToDate.orders,
        monthRevenue: acc.monthRevenue + store.monthToDate.revenue,
        monthProfit: acc.monthProfit + store.monthToDate.profit,
      }),
      {
        todayOrders: 0,
        todayRevenue: 0,
        todayProfit: 0,
        monthOrders: 0,
        monthRevenue: 0,
        monthProfit: 0,
      }
    );

    res.json({
      stores: storeFinancials,
      globalTotals,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Get financial summary error:", error);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

// PROCESS MONTHLY SALARIES
app.post("/api/admin/salary/process", async (req, res) => {
  try {
    const { userId, storeId, month, year } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || (user.role !== "admin" && userId !== "demo-user")) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();

    const staff = await db
      .select()
      .from(storeStaff)
      .where(eq(storeStaff.storeId, storeId));

    const monthStart = new Date(targetYear, targetMonth - 1, 1);
    monthStart.setHours(0, 0, 0, 0);
    
    const monthEnd = new Date(targetYear, targetMonth, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const processed = [];

    for (const member of staff) {
      const earnings = await db
        .select({
          totalBonus: sql<string>`SUM(${staffEarnings.bonusEarned})`,
          totalOrders: sql<number>`SUM(${staffEarnings.ordersCompleted})::int`,
          totalDeliveries: sql<number>`SUM(${staffEarnings.deliveriesCompleted})::int`,
        })
        .from(staffEarnings)
        .where(
          and(
            eq(staffEarnings.staffId, member.userId),
            gte(staffEarnings.date, monthStart),
            lte(staffEarnings.date, monthEnd)
          )
        );

      const totalBonus = parseFloat(earnings[0]?.totalBonus || "0");
      const totalEarnings = BASE_SALARY_MONTHLY + totalBonus;

      const [payment] = await db
        .insert(salaryPayments)
        .values({
          staffId: member.userId,
          storeId: member.storeId,
          month: targetMonth,
          year: targetYear,
          baseSalary: String(BASE_SALARY_MONTHLY),
          totalBonus: String(totalBonus),
          totalEarnings: String(totalEarnings),
          totalOrders: earnings[0]?.totalOrders || 0,
          totalDeliveries: earnings[0]?.totalDeliveries || 0,
          status: "pending",
        })
        .returning();

      processed.push(payment);
    }

    res.json({
      success: true,
      processed: processed.length,
      payments: processed,
    });
  } catch (error) {
    console.error("❌ Process salary error:", error);
    res.status(500).json({ error: "Failed to process salaries" });
  }
});

// MARK SALARY AS PAID
app.patch("/api/admin/salary/:id/paid", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || (user.role !== "admin" && userId !== "demo-user")) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const [updated] = await db
      .update(salaryPayments)
      .set({
        status: "paid",
        paidAt: new Date(),
      })
      .where(eq(salaryPayments.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Payment not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error("❌ Mark salary paid error:", error);
    res.status(500).json({ error: "Failed to update payment" });
  }
});

// GET PENDING SALARIES
app.get("/api/admin/salary/pending", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId as string));
    if (!user || (user.role !== "admin" && userId !== "demo-user")) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const pending = await db
      .select({
        payment: salaryPayments,
        staff: users,
        store: stores,
      })
      .from(salaryPayments)
      .leftJoin(users, eq(salaryPayments.staffId, users.id))
      .leftJoin(stores, eq(salaryPayments.storeId, stores.id))
      .where(eq(salaryPayments.status, "pending"))
      .orderBy(desc(salaryPayments.year), desc(salaryPayments.month));

    res.json(pending);
  } catch (error) {
    console.error("❌ Get pending salaries error:", error);
    res.status(500).json({ error: "Failed to fetch pending salaries" });
  }
});

console.log("✅ All financial routes registered");


// ==================== ENHANCED FINANCIAL TRACKING ROUTES ====================
// Add these to your routes.ts

// GET COMPREHENSIVE FINANCIAL METRICS
app.get("/api/admin/financials/comprehensive", async (req, res) => {
  try {
    const { userId, period = 'month' } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    // Verify admin access
    const [user] = await db.select().from(users).where(eq(users.id, userId as string));
    if (!user || (user.role !== "admin" && userId !== "demo-user")) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Calculate date range
    let startDate: Date;
    const endDate = new Date();

    if (period === 'today') {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    console.log(`📊 Calculating financials from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Get all delivered orders in period
    const deliveredOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, "delivered"),
          gte(orders.deliveredAt, startDate),
          lte(orders.deliveredAt, endDate)
        )
      );

    console.log(`✅ Found ${deliveredOrders.length} delivered orders`);

    // Initialize metrics
    let totalRevenue = 0;
    let productRevenue = 0;
    let deliveryRevenue = 0;
    let productCosts = 0;
    let staffBonuses = 0;
    let adminPromoCosts = 0;
    let storePromoCosts = 0;
    let voucherCosts = 0;
    let deliveryProfit = 0;

    const storeMetrics: Record<string, any> = {};

    // Process each order
    for (const order of deliveredOrders) {
      const orderSubtotal = order.subtotal || 0;
      const orderDeliveryFee = order.deliveryFee || 12000;
      const orderTotal = order.total || 0;

      // Add to revenue
      totalRevenue += orderTotal;
      productRevenue += orderSubtotal;
      deliveryRevenue += orderDeliveryFee;

      // Calculate product costs from order items
      const orderItemsData = await db
        .select({
          quantity: orderItems.quantity,
          productId: orderItems.productId,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      let orderProductCost = 0;
      for (const item of orderItemsData) {
        const [product] = await db
          .select({ costPrice: products.costPrice })
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);

        if (product && product.costPrice) {
          orderProductCost += product.costPrice * item.quantity;
        }
      }

      productCosts += orderProductCost;

      // Staff bonuses (Rp 6,000 per order: Rp 4k driver + Rp 2k picker)
      const orderStaffBonus = 6000;
      staffBonuses += orderStaffBonus;

      // Delivery profit (Rp 12k delivery fee - Rp 6k staff bonus)
      deliveryProfit += (orderDeliveryFee - orderStaffBonus);

      // Get promotion costs
      const promotionDiscount = order.promotionDiscount || 0;
      const voucherDiscount = order.voucherDiscount || 0;

      voucherCosts += voucherDiscount;

      // Determine if promotion is admin or store level
      if (order.appliedPromotionId) {
        const [promotion] = await db
          .select()
          .from(promotions)
          .where(eq(promotions.id, order.appliedPromotionId))
          .limit(1);

        if (promotion) {
          if (promotion.scope === 'app' || !promotion.storeId) {
            // Admin/app-wide promotion - comes from admin profit
            adminPromoCosts += promotionDiscount;
          } else {
            // Store-specific promotion - comes from store profit
            storePromoCosts += promotionDiscount;

            // Track store-specific promo costs
            if (!storeMetrics[order.storeId!]) {
              storeMetrics[order.storeId!] = {
                storeId: order.storeId,
                totalRevenue: 0,
                productRevenue: 0,
                deliveryRevenue: 0,
                productCosts: 0,
                storePromoCosts: 0,
                totalOrders: 0,
              };
            }
            storeMetrics[order.storeId!].storePromoCosts += promotionDiscount;
          }
        }
      }

      // Track store metrics
      if (order.storeId) {
        if (!storeMetrics[order.storeId]) {
          storeMetrics[order.storeId] = {
            storeId: order.storeId,
            totalRevenue: 0,
            productRevenue: 0,
            deliveryRevenue: 0,
            productCosts: 0,
            storePromoCosts: 0,
            totalOrders: 0,
          };
        }

        storeMetrics[order.storeId].totalRevenue += orderTotal;
        storeMetrics[order.storeId].productRevenue += orderSubtotal;
        storeMetrics[order.storeId].deliveryRevenue += orderDeliveryFee;
        storeMetrics[order.storeId].productCosts += orderProductCost;
        storeMetrics[order.storeId].totalOrders += 1;
      }
    }

    // Calculate gross profit (revenue - COGS)
    const grossProfit = productRevenue - productCosts;

    // Calculate total costs
    const totalCosts = productCosts + staffBonuses + adminPromoCosts + storePromoCosts + voucherCosts;

    // Calculate net profit
    const netProfit = totalRevenue - totalCosts;

    // Calculate average order value
    const avgOrderValue = deliveredOrders.length > 0 
      ? totalRevenue / deliveredOrders.length 
      : 0;

    // Calculate store breakdowns with net profit
    const storeBreakdown = await Promise.all(
      Object.values(storeMetrics).map(async (store: any) => {
        const [storeInfo] = await db
          .select({ name: stores.name })
          .from(stores)
          .where(eq(stores.id, store.storeId))
          .limit(1);

        // Store net profit = revenue - product costs - store promo costs - staff bonuses
        const storeStaffBonus = store.totalOrders * 6000;
        const storeNetProfit = store.totalRevenue - store.productCosts - store.storePromoCosts - storeStaffBonus;

        return {
          ...store,
          storeName: storeInfo?.name || "Unknown Store",
          netProfit: storeNetProfit,
          avgOrderValue: store.totalOrders > 0 ? store.totalRevenue / store.totalOrders : 0,
        };
      })
    );

    // Sort stores by net profit
    storeBreakdown.sort((a, b) => b.netProfit - a.netProfit);

    // Generate recommendations
    const recommendations: string[] = [];
    
    const profitMargin = (netProfit / totalRevenue) * 100;
    if (profitMargin < 5) {
      recommendations.push("⚠️ Profit margin is below 5%. Consider reviewing promotion costs and product margins.");
    }
    
    if (adminPromoCosts > netProfit * 0.3) {
      recommendations.push("💡 Admin promotions are consuming >30% of potential profit. Review promotion effectiveness.");
    }
    
    const bestStore = storeBreakdown[0];
    const worstStore = storeBreakdown[storeBreakdown.length - 1];
    if (bestStore && worstStore && worstStore.netProfit < 0) {
      recommendations.push(`📈 ${worstStore.storeName} is losing money. Review their pricing and promotion strategy.`);
    }
    
    if (avgOrderValue < 50000) {
      recommendations.push("🎯 Average order value is below Rp 50k. Consider minimum order promotions to increase basket size.");
    }

    const targetProfit = 50000000; // Rp 50 million per month target
    const targetAchievement = (netProfit / targetProfit) * 100;
    if (targetAchievement < 80) {
      recommendations.push(`🎯 You're at ${targetAchievement.toFixed(0)}% of monthly target. Focus on high-margin products.`);
    }

    // Return comprehensive metrics
    const response = {
      period: {
        start: startDate,
        end: endDate,
        type: period,
      },
      totalRevenue,
      productRevenue,
      deliveryRevenue,
      productCosts,
      grossProfit,
      staffBonuses,
      adminPromoCosts,
      storePromoCosts,
      voucherCosts,
      totalCosts,
      netProfit,
      deliveryProfit,
      totalOrders: deliveredOrders.length,
      avgOrderValue,
      profitMargin: (netProfit / totalRevenue) * 100,
      monthlyTarget: targetProfit,
      targetAchievement,
      storeBreakdown,
      recommendations,
      breakdown: {
        revenueBreakdown: [
          { label: 'Products', value: productRevenue, percentage: (productRevenue / totalRevenue) * 100 },
          { label: 'Delivery', value: deliveryRevenue, percentage: (deliveryRevenue / totalRevenue) * 100 },
        ],
        costBreakdown: [
          { label: 'Product Costs', value: productCosts, percentage: (productCosts / totalCosts) * 100 },
          { label: 'Staff Bonuses', value: staffBonuses, percentage: (staffBonuses / totalCosts) * 100 },
          { label: 'Admin Promotions', value: adminPromoCosts, percentage: (adminPromoCosts / totalCosts) * 100 },
          { label: 'Store Promotions', value: storePromoCosts, percentage: (storePromoCosts / totalCosts) * 100 },
          { label: 'Vouchers', value: voucherCosts, percentage: (voucherCosts / totalCosts) * 100 },
        ],
      },
    };

    console.log(`✅ Financial metrics calculated successfully`);
    console.log(`💰 Net Profit: Rp ${netProfit.toLocaleString()}`);
    console.log(`📊 Profit Margin: ${profitMargin.toFixed(2)}%`);

    res.json(response);
  } catch (error) {
    console.error("❌ Get comprehensive financials error:", error);
    res.status(500).json({ error: "Failed to fetch financial metrics" });
  }
});

// GET PROFIT/LOSS TREND (Daily breakdown)
app.get("/api/admin/financials/trend", async (req, res) => {
  try {
    const { userId, days = 30 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId as string));
    if (!user || (user.role !== "admin" && userId !== "demo-user")) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const daysCount = parseInt(days as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysCount);
    startDate.setHours(0, 0, 0, 0);

    // Get daily financials
    const dailyData = await db
      .select()
      .from(storeDailyFinancials)
      .where(gte(storeDailyFinancials.date, startDate))
      .orderBy(storeDailyFinancials.date);

    // Group by date and sum across stores
    const dateMap: Record<string, any> = {};

    for (const day of dailyData) {
      const dateKey = day.date.toISOString().split('T')[0];
      
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = {
          date: day.date,
          grossRevenue: 0,
          productCosts: 0,
          staffBonuses: 0,
          promotionDiscounts: 0,
          voucherDiscounts: 0,
          netProfit: 0,
        };
      }

      dateMap[dateKey].grossRevenue += parseFloat(String(day.grossRevenue));
      dateMap[dateKey].productCosts += parseFloat(String(day.productCosts));
      dateMap[dateKey].staffBonuses += parseFloat(String(day.staffBonuses));
      dateMap[dateKey].promotionDiscounts += parseFloat(String(day.promotionDiscounts));
      dateMap[dateKey].voucherDiscounts += parseFloat(String(day.voucherDiscounts));
      dateMap[dateKey].netProfit += parseFloat(String(day.netProfit));
    }

    const trend = Object.values(dateMap).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    res.json(trend);
  } catch (error) {
    console.error("❌ Get trend error:", error);
    res.status(500).json({ error: "Failed to fetch trend" });
  }
});

// GET PROMOTION COST IMPACT ANALYSIS
app.get("/api/admin/promotions/cost-impact", async (req, res) => {
  try {
    const { userId, period = 'month' } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId as string));
    if (!user || (user.role !== "admin" && userId !== "demo-user")) {
      return res.status(403).json({ error: "Admin access required" });
    }

    let startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    // Get all promotions with usage
    const allPromotions = await db
      .select({
        promotion: promotions,
        store: stores,
      })
      .from(promotions)
      .leftJoin(stores, eq(promotions.storeId, stores.id))
      .where(gte(promotions.createdAt, startDate));

    // Calculate cost for each promotion
    const promotionImpact = await Promise.all(
      allPromotions.map(async ({ promotion, store }) => {
        // Get orders that used this promotion
        const ordersWithPromo = await db
          .select()
          .from(orders)
          .where(
            and(
              eq(orders.appliedPromotionId, promotion.id),
              eq(orders.status, "delivered"),
              gte(orders.deliveredAt, startDate)
            )
          );

        const totalDiscount = ordersWithPromo.reduce(
          (sum, order) => sum + (order.promotionDiscount || 0),
          0
        );

        const totalRevenue = ordersWithPromo.reduce(
          (sum, order) => sum + order.total,
          0
        );

        return {
          promotionId: promotion.id,
          title: promotion.title,
          scope: promotion.scope,
          storeName: store?.name || 'App-Wide',
          usageCount: ordersWithPromo.length,
          totalDiscount,
          totalRevenue,
          avgDiscount: ordersWithPromo.length > 0 ? totalDiscount / ordersWithPromo.length : 0,
          costType: promotion.scope === 'app' || !promotion.storeId ? 'admin' : 'store',
        };
      })
    );

    // Sort by total cost
    promotionImpact.sort((a, b) => b.totalDiscount - a.totalDiscount);

    // Calculate totals
    const adminPromoCost = promotionImpact
      .filter(p => p.costType === 'admin')
      .reduce((sum, p) => sum + p.totalDiscount, 0);

    const storePromoCost = promotionImpact
      .filter(p => p.costType === 'store')
      .reduce((sum, p) => sum + p.totalDiscount, 0);

    res.json({
      period: { start: startDate, end: new Date(), type: period },
      promotionImpact,
      totals: {
        adminPromoCost,
        storePromoCost,
        totalPromoCost: adminPromoCost + storePromoCost,
      },
    });
  } catch (error) {
    console.error("❌ Get promotion impact error:", error);
    res.status(500).json({ error: "Failed to fetch promotion impact" });
  }
});

console.log("✅ Enhanced financial tracking routes registered");




// ==================== STORE OWNER DASHBOARD ROUTE FIXES ====================
console.log("👨‍💼 Registering store owner routes...");

// ✅ GET STORE OWNER DASHBOARD
app.get("/api/store-owner/dashboard", async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }
    
    console.log(`📊 Store owner dashboard request for userId: ${userId}`);
    
    const [user] = await db.select().from(users).where(eq(users.id, userId as string));
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    if (user.role !== "store_owner" && userId !== "demo-user") {
      return res.status(403).json({ error: "Store owner access required" });
    }
    
    const [storeOwner] = await db
      .select()
      .from(storeOwners)
      .where(eq(storeOwners.userId, userId as string));
    
    if (!storeOwner) {
      console.log(`⚠️ No store owner record found for ${userId}`);
      
      return res.json({
        store: null,
        today: { revenue: 0, costs: 0, netProfit: 0, orders: 0 },
        month: { revenue: 0, costs: 0, netProfit: 0, orders: 0 },
        staff: { total: 0, online: 0, pickers: 0, drivers: 0 }
      });
    }

    const [store] = await db
      .select()
      .from(stores)
      .where(eq(stores.id, storeOwner.storeId));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayFinancials] = await db
      .select()
      .from(storeDailyFinancials)
      .where(
        and(
          eq(storeDailyFinancials.storeId, storeOwner.storeId),
          eq(storeDailyFinancials.date, today)
        )
      );

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthFinancials = await db
      .select({
        totalOrders: sql<number>`SUM(${storeDailyFinancials.totalOrders})::int`,
        totalRevenue: sql<string>`SUM(${storeDailyFinancials.grossRevenue})`,
        totalCosts: sql<string>`SUM(${storeDailyFinancials.productCosts} + ${storeDailyFinancials.staffBonuses})`,
        netProfit: sql<string>`SUM(${storeDailyFinancials.netProfit})`,
      })
      .from(storeDailyFinancials)
      .where(
        and(
          eq(storeDailyFinancials.storeId, storeOwner.storeId),
          gte(storeDailyFinancials.date, monthStart)
        )
      );

    const staff = await db
      .select()
      .from(storeStaff)
      .where(eq(storeStaff.storeId, storeOwner.storeId));

    const staffMetrics = {
      total: staff.length,
      online: staff.filter(s => s.status === "online").length,
      pickers: staff.filter(s => s.role === "picker").length,
      drivers: staff.filter(s => s.role === "driver").length,
    };

    res.json({
      store: {
        id: store?.id,
        name: store?.name || "Store Dashboard",
        address: store?.address,
        isActive: store?.isActive || false,
      },
      today: {
        revenue: parseFloat(String(todayFinancials?.grossRevenue || 0)),
        costs: parseFloat(String(todayFinancials?.productCosts || 0)) + 
               parseFloat(String(todayFinancials?.staffBonuses || 0)),
        netProfit: parseFloat(String(todayFinancials?.netProfit || 0)),
        orders: todayFinancials?.totalOrders || 0,
      },
      month: {
        revenue: parseFloat(String(monthFinancials[0]?.totalRevenue || "0")),
        costs: parseFloat(String(monthFinancials[0]?.totalCosts || "0")),
        netProfit: parseFloat(String(monthFinancials[0]?.netProfit || "0")),
        orders: monthFinancials[0]?.totalOrders || 0,
      },
      staff: staffMetrics,
    });

  } catch (error) {
    console.error("❌ Store owner dashboard error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard" });
  }
});

// ✅ GET STORE OWNER PRODUCTS
app.get("/api/store-owner/products", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    console.log(`📦 Fetching products for store owner: ${userId}`);

    const [user] = await db.select().from(users).where(eq(users.id, userId as string));
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role !== "store_owner" && userId !== "demo-user") {
      return res.status(403).json({ error: "Store owner access required" });
    }

    const [storeOwner] = await db
      .select()
      .from(storeOwners)
      .where(eq(storeOwners.userId, userId as string));

    if (!storeOwner) {
      console.log(`⚠️ No store owner record, returning empty array`);
      return res.json([]);
    }

    const results = await db
      .select({
        product: products,
        inventory: storeInventory,
      })
      .from(products)
      .innerJoin(
        storeInventory,
        eq(products.id, storeInventory.productId)
      )
      .where(eq(storeInventory.storeId, storeOwner.storeId));

    const formatted = results.map(({ product, inventory }) => ({
      ...product,
      stockCount: inventory.stockCount,
      location: inventory.location,
      isAvailable: inventory.isAvailable,
    }));

    console.log(`✅ Found ${formatted.length} products for store owner`);
    res.json(formatted);

  } catch (error) {
    console.error("❌ Get store products error:", error);
    res.status(500).json({ error: "Failed to fetch store products" });
  }
});

// ✅ GET FRESH PRODUCTS
app.get("/api/store-owner/products/fresh", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    console.log(`🥬 Fetching fresh products for: ${userId}`);

    const [user] = await db.select().from(users).where(eq(users.id, userId as string));
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role !== "store_owner" && userId !== "demo-user") {
      return res.status(403).json({ error: "Store owner access required" });
    }

    const [storeOwner] = await db
      .select()
      .from(storeOwners)
      .where(eq(storeOwners.userId, userId as string));

    if (!storeOwner) {
      console.log(`⚠️ No store owner record, returning empty array`);
      return res.json([]);
    }

    const freshProducts = await db
      .select({
        product: products,
        inventory: storeInventory,
      })
      .from(products)
      .innerJoin(
        storeInventory,
        eq(products.id, storeInventory.productId)
      )
      .where(
        and(
          eq(storeInventory.storeId, storeOwner.storeId),
          eq(products.isFresh, true)
        )
      )
      .orderBy(desc(products.freshnessPriority));

    const formatted = freshProducts.map(({ product, inventory }) => ({
      ...product,
      stockCount: inventory.stockCount,
      location: inventory.location,
      isExpiringSoon:
        product.expiryDate
          ? new Date(product.expiryDate).getTime() - Date.now() <
            1000 * 60 * 60 * 24 * 3
          : false,
    }));

    console.log(`✅ Found ${formatted.length} fresh products`);
    res.json(formatted);

  } catch (error) {
    console.error("❌ Get fresh products error:", error);
    res.status(500).json({ error: "Failed to fetch fresh products" });
  }
});

// ✅ GET STORE OWNER PROMOTIONS  
app.get("/api/store-owner/promotions", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    console.log(`🎁 Fetching promotions for: ${userId}`);

    const [user] = await db.select().from(users).where(eq(users.id, userId as string));
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role !== "store_owner" && userId !== "demo-user") {
      return res.status(403).json({ error: "Store owner access required" });
    }

    const [storeOwner] = await db
      .select()
      .from(storeOwners)
      .where(eq(storeOwners.userId, userId as string));

    if (!storeOwner) {
      console.log(`⚠️ No store owner record, returning empty array`);
      return res.json([]);
    }

    const promos = await db
      .select()
      .from(promotions)
      .where(eq(promotions.storeId, storeOwner.storeId))
      .orderBy(desc(promotions.createdAt));

    console.log(`✅ Found ${promos.length} promotions`);
    res.json(promos);

  } catch (error) {
    console.error("❌ Store owner promotions error:", error);
    res.status(500).json({ error: "Failed to fetch promotions" });
  }
});

// ✅ GET EARNINGS HISTORY
app.get("/api/store-owner/earnings/history", async (req, res) => {
  try {
    const { userId, days = 30 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    console.log(`📊 Fetching earnings history for userId: ${userId}`);

    const [user] = await db.select().from(users).where(eq(users.id, userId as string));
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role !== "store_owner" && userId !== "demo-user") {
      return res.status(403).json({ error: "Store owner access required" });
    }

    const [storeOwner] = await db
      .select()
      .from(storeOwners)
      .where(eq(storeOwners.userId, userId as string));

    if (!storeOwner) {
      return res.json([]);
    }

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - Number(days));
    daysAgo.setHours(0, 0, 0, 0);

    const history = await db
      .select()
      .from(storeOwnerDailyEarnings)
      .where(
        and(
          eq(storeOwnerDailyEarnings.storeOwnerId, storeOwner.id),
          gte(storeOwnerDailyEarnings.date, daysAgo)
        )
      )
      .orderBy(desc(storeOwnerDailyEarnings.date));

    res.json(history);

  } catch (error) {
    console.error("❌ Get earnings history error:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

console.log("✅ Store owner dashboard routes registered");


// ==================== FRESH PRODUCT MANAGEMENT ====================
console.log("🥬 Registering fresh product routes...");

// CREATE/UPDATE PRODUCT WITH FRESHNESS (Store Owner or Picker)
app.post("/api/store-owner/products", uploadMiddleware.single("image"), async (req, res) => {
  try {
    const { 
      userId, 
      name, 
      brand, 
      description, 
      costPrice,
      margin,
      stock, 
      categoryId, 
      location,
      // Freshness fields
      isFresh,
      expiryDate,
      shelfLife,
      temperatureMin,
      temperatureMax,
      requiresRefrigeration,
      requiresFreezer,
      specialPackaging,
      handlingInstructions,
    } = req.body;

    console.log("🥬 Creating fresh product:", { userId, name, isFresh });

    if (!userId || !name || !categoryId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!costPrice || isNaN(parseInt(costPrice)) || parseInt(costPrice) <= 0) {
      return res.status(400).json({ 
        error: "Cost price is required and must be greater than 0" 
      });
    }

    // Verify user is store owner or picker
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let storeId: string;

    if (user.role === "store_owner") {
      const [storeOwner] = await db
        .select()
        .from(storeOwners)
        .where(eq(storeOwners.userId, userId));
      
      if (!storeOwner) {
        return res.status(403).json({ error: "Not a store owner" });
      }
      storeId = storeOwner.storeId;
    } else if (user.role === "picker") {
      const [staff] = await db
        .select()
        .from(storeStaff)
        .where(eq(storeStaff.userId, userId));
      
      if (!staff) {
        return res.status(403).json({ error: "Not assigned to a store" });
      }
      storeId = staff.storeId;
    } else {
      return res.status(403).json({ error: "Only store owners and pickers can add products" });
    }

    // Calculate freshness priority
    let freshnessPriority = 0;
    if (isFresh === "true" || isFresh === true) {
      if (expiryDate) {
        const daysUntilExpiry = Math.floor(
          (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        // Higher priority for items expiring sooner
        freshnessPriority = Math.max(0, 100 - daysUntilExpiry);
      } else if (shelfLife) {
        // Priority based on shelf life (shorter = higher priority)
        freshnessPriority = Math.max(0, 100 - parseInt(shelfLife));
      }
    }

    // Create product
    const productData: any = {
      name: name.trim(),
      brand: brand || "Generic",
      description: description || "",
      costPrice: parseInt(costPrice),
      categoryId,
      image: req.file ? `/uploads/${req.file.filename}` : null,
      // Freshness fields
      isFresh: isFresh === "true" || isFresh === true,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      shelfLife: shelfLife ? parseInt(shelfLife) : null,
      temperatureMin: temperatureMin ? parseFloat(temperatureMin) : null,
      temperatureMax: temperatureMax ? parseFloat(temperatureMax) : null,
      requiresRefrigeration: requiresRefrigeration === "true" || requiresRefrigeration === true,
      requiresFreezer: requiresFreezer === "true" || requiresFreezer === true,
      specialPackaging: specialPackaging || null,
      handlingInstructions: handlingInstructions || null,
      freshnessPriority,
    };

    if (margin && parseFloat(margin) > 0) {
      productData.margin = parseFloat(margin);
    }

    const [newProduct] = await db.insert(products).values(productData).returning();

    console.log(`✅ Product created: ${newProduct.name} (Fresh: ${newProduct.isFresh})`);

    // Create inventory
    await db.insert(storeInventory).values({
      storeId,
      productId: newProduct.id,
      stockCount: parseInt(stock) || 0,
      location: location || null,
      isAvailable: true,
    });

    res.json({ 
      success: true, 
      message: "Product created successfully",
      product: newProduct,
    });

  } catch (error) {
    console.error("❌ Create fresh product error:", error);
    res.status(500).json({ 
      error: "Failed to create product",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// UPDATE PRODUCT WITH FRESHNESS
app.patch("/api/store-owner/products/:id", uploadMiddleware.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      userId,
      name,
      brand,
      description,
      costPrice,
      margin,
      stock,
      categoryId,
      location,
      // Freshness fields
      isFresh,
      expiryDate,
      shelfLife,
      temperatureMin,
      temperatureMax,
      requiresRefrigeration,
      requiresFreezer,
      specialPackaging,
      handlingInstructions,
    } = req.body;

    console.log("🔄 Updating product:", { id, userId });

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    // Verify ownership
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let storeId: string;

    if (user.role === "store_owner") {
      const [storeOwner] = await db
        .select()
        .from(storeOwners)
        .where(eq(storeOwners.userId, userId));
      
      if (!storeOwner) {
        return res.status(403).json({ error: "Not a store owner" });
      }
      storeId = storeOwner.storeId;
    } else if (user.role === "picker") {
      const [staff] = await db
        .select()
        .from(storeStaff)
        .where(eq(storeStaff.userId, userId));
      
      if (!staff) {
        return res.status(403).json({ error: "Not assigned to a store" });
      }
      storeId = staff.storeId;
    } else {
      return res.status(403).json({ error: "Only store owners and pickers can update products" });
    }

    // Verify product belongs to this store
    const [inventory] = await db
      .select()
      .from(storeInventory)
      .where(
        and(
          eq(storeInventory.productId, id),
          eq(storeInventory.storeId, storeId)
        )
      );

    if (!inventory) {
      return res.status(403).json({ error: "Product not found in your store" });
    }

    // Update inventory stock if provided
    if (stock !== undefined) {
      await db
        .update(storeInventory)
        .set({ 
          stockCount: parseInt(stock),
          location: location || inventory.location,
        })
        .where(eq(storeInventory.id, inventory.id));
    }

    // Build update data
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name.trim();
    if (brand !== undefined) updateData.brand = brand;
    if (description !== undefined) updateData.description = description;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    
    if (costPrice && costPrice.trim() !== "") {
      const cost = parseInt(costPrice);
      if (cost > 0) updateData.costPrice = cost;
    }
    
    if (margin && margin.trim() !== "") {
      const newMargin = parseFloat(margin);
      if (newMargin >= 0) updateData.margin = newMargin;
    }

    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }

    // Freshness updates
    if (isFresh !== undefined) {
      updateData.isFresh = isFresh === "true" || isFresh === true;
    }
    if (expiryDate !== undefined) {
      updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;
    }
    if (shelfLife !== undefined) {
      updateData.shelfLife = shelfLife ? parseInt(shelfLife) : null;
    }
    if (temperatureMin !== undefined) {
      updateData.temperatureMin = temperatureMin ? parseFloat(temperatureMin) : null;
    }
    if (temperatureMax !== undefined) {
      updateData.temperatureMax = temperatureMax ? parseFloat(temperatureMax) : null;
    }
    if (requiresRefrigeration !== undefined) {
      updateData.requiresRefrigeration = requiresRefrigeration === "true" || requiresRefrigeration === true;
    }
    if (requiresFreezer !== undefined) {
      updateData.requiresFreezer = requiresFreezer === "true" || requiresFreezer === true;
    }
    if (specialPackaging !== undefined) {
      updateData.specialPackaging = specialPackaging || null;
    }
    if (handlingInstructions !== undefined) {
      updateData.handlingInstructions = handlingInstructions || null;
    }

    // Recalculate freshness priority if fresh
    if (updateData.isFresh || (updateData.expiryDate !== undefined) || (updateData.shelfLife !== undefined)) {
      const [currentProduct] = await db.select().from(products).where(eq(products.id, id));
      
      const isProductFresh = updateData.isFresh !== undefined ? updateData.isFresh : currentProduct.isFresh;
      const productExpiryDate = updateData.expiryDate !== undefined ? updateData.expiryDate : currentProduct.expiryDate;
      const productShelfLife = updateData.shelfLife !== undefined ? updateData.shelfLife : currentProduct.shelfLife;

      let freshnessPriority = 0;
      if (isProductFresh) {
        if (productExpiryDate) {
          const daysUntilExpiry = Math.floor(
            (new Date(productExpiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          freshnessPriority = Math.max(0, 100 - daysUntilExpiry);
        } else if (productShelfLife) {
          freshnessPriority = Math.max(0, 100 - productShelfLife);
        }
      }
      updateData.freshnessPriority = freshnessPriority;
    }

    // Update product
    const [updated] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

    console.log(`✅ Product updated: ${id}`);

    res.json({
      success: true,
      message: "Product updated successfully",
      product: updated,
    });

  } catch (error) {
    console.error("❌ Update product error:", error);
    res.status(500).json({ 
      error: "Failed to update product",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// GET FRESH PRODUCTS EXPIRING SOON (Alert for store owners)
app.get("/api/store-owner/products/expiring-soon", async (req, res) => {
  try {
    const { userId, days = 7 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const [storeOwner] = await db
      .select()
      .from(storeOwners)
      .where(eq(storeOwners.userId, userId as string));

    if (!storeOwner) {
      return res.status(403).json({ error: "Not a store owner" });
    }

    const daysAhead = new Date();
    daysAhead.setDate(daysAhead.getDate() + Number(days));

    const expiringProducts = await db
      .select({
        product: products,
        inventory: storeInventory,
      })
      .from(products)
      .innerJoin(storeInventory, eq(products.id, storeInventory.productId))
      .where(
        and(
          eq(storeInventory.storeId, storeOwner.storeId),
          eq(products.isFresh, true),
          lte(products.expiryDate, daysAhead),
          gt(storeInventory.stockCount, 0)
        )
      )
      .orderBy(products.expiryDate);

    const formatted = expiringProducts.map(({ product, inventory }) => ({
      ...product,
      stockCount: inventory.stockCount,
      location: inventory.location,
      daysUntilExpiry: product.expiryDate 
        ? Math.floor((new Date(product.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null,
    }));

    res.json(formatted);

  } catch (error) {
    console.error("❌ Get expiring products error:", error);
    res.status(500).json({ error: "Failed to fetch expiring products" });
  }
});

// GET FRESH PRODUCTS REQUIRING SPECIAL HANDLING
app.get("/api/picker/fresh-products-priority", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const [staff] = await db
      .select()
      .from(storeStaff)
      .where(eq(storeStaff.userId, userId as string));

    if (!staff) {
      return res.status(403).json({ error: "Not a picker" });
    }

    // Get fresh products sorted by priority
    const freshProducts = await db
      .select({
        product: products,
        inventory: storeInventory,
      })
      .from(products)
      .innerJoin(storeInventory, eq(products.id, storeInventory.productId))
      .where(
        and(
          eq(storeInventory.storeId, staff.storeId),
          eq(products.isFresh, true),
          gt(storeInventory.stockCount, 0)
        )
      )
      .orderBy(desc(products.freshnessPriority));

    const formatted = freshProducts.map(({ product, inventory }) => ({
      ...product,
      stockCount: inventory.stockCount,
      location: inventory.location,
      needsUrgentAttention: product.freshnessPriority > 80,
      requiresColdChain: product.requiresRefrigeration || product.requiresFreezer,
    }));

    res.json(formatted);

  } catch (error) {
    console.error("❌ Get fresh products error:", error);
    res.status(500).json({ error: "Failed to fetch fresh products" });
  }
});

console.log("✅ Fresh product routes registered");

// Run daily at 9 AM
cron.schedule('0 9 * * *', async () => {
  console.log('🎁 Running daily voucher check...');
  try {
    await fetch(`${process.env.DOMAIN}/api/cron/daily-voucher-check`, {
      method: 'POST',
    });
  } catch (error) {
    console.error('❌ Cron job failed:', error);
  }
});



// 🌐 SERVE THE WEBSITE PAGE
// Put this AFTER all app.post and app.get("/api/...") routes
app.use(express.static(path.join(process.cwd(), 'public')));

// Fallback: If they go to a route that doesn't exist, show the website
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});
  
  const httpServer = createServer(app);
  return httpServer;
}