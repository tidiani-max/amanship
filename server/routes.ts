import type { Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { eq, and, gt, sql, or, gte, lte, isNull } from "drizzle-orm";
import { storage } from "./storage";
import { db } from "./db";
import { 
  categories, products, vouchers, users, stores, storeStaff, 
  storeInventory, otpCodes, addresses, orders, orderItems, 
  cartItems, messages, promotions,              
  userPromotionUsage,      
  userVoucherUsage,     
} from "../shared/schema";
import { findNearestAvailableStore, getStoresWithAvailability, estimateDeliveryTime } from "./storeAvailability";
import express, { Express } from 'express';
import fs from "fs";
import path from 'path';
import multer from "multer";
import { driverLocations } from "../shared/schema";
import { userClaimedPromotions } from "../shared/schema";


// ✅ IMPORT NOTIFICATION FUNCTIONS (removed local duplicate)
import { 
  notifyPickersNewOrder, 
  notifyDriversPackedOrder,
  notifyCustomerOrderStatus,
  notifyChatMessage 
} from './notifications';

// ==================== CONFIGURATION ====================
const DEMO_USER_ID = "demo-user";

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

export async function registerRoutes(app: Express): Promise<Server> {



// 🟢 HEALTH CHECK & DEBUG ROUTE
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "alive", 
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || "not set"
  });
});

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



 app.post("/api/picker/inventory/update", uploadMiddleware.single("image"), async (req: Request, res: Response) => {
  try {
    const { inventoryId, userId, stock, price, name, brand, description, categoryId, originalPrice } = req.body;

    console.log("📦 Update request:", { inventoryId, userId, hasImage: !!req.file });
    console.log("📸 Image file:", req.file); // Add this

    if (!inventoryId || !userId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1. Update Inventory stock
    await storage.updateStoreInventory(inventoryId, parseInt(stock) || 0, true);

    // 2. Find the product linked to this inventory record
    const invRecords = await db.select().from(storeInventory).where(eq(storeInventory.id, inventoryId));
    
    if (invRecords.length > 0) {
      const updateData: any = {
        name,
        brand,
        description,
        price: parseInt(price), // ✅ Changed from parseFloat to parseInt to match schema
        categoryId
      };

      // ✅ Add originalPrice if provided
      if (originalPrice && originalPrice.trim() !== "") {
        updateData.originalPrice = parseInt(originalPrice);
      }
      console.log("📸 Image upload check:", {
      hasFile: !!req.file,
      filename: req.file?.filename,
      mimetype: req.file?.mimetype,
      size: req.file?.size
    });

if (req.file) {
  updateData.image = `/uploads/${req.file.filename}`;
  console.log("✅ Image will be updated to:", updateData.image);
}
      // ✅ Add image if uploaded
      if (req.file) {
        updateData.image = `/uploads/${req.file.filename}`;
      }

      await storage.updateProduct(invRecords[0].productId, updateData);
    }

    res.json({ success: true, message: "Inventory and Product updated" });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: "Update failed" });
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
  
  // ✅ Check if staff needs to reset password on first login
  const isStaff = ["picker", "driver"].includes(user.role);
  
  if (isStaff && user.firstLogin) {
    console.log("⚠️ Staff first login detected - redirecting to password reset");
    // Staff first login - trigger password reset flow
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
  
  // Normal login
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

    // Check if it's a staff member who needs to reset password
    const isStaff = ["picker", "driver"].includes(user.role);
    const requiresPasswordReset = isStaff && user.firstLogin === true;

    return res.json({
      exists: true,
      firstLogin: user.firstLogin || false,
      isStaff,
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
        firstLogin: false // ✅ New users don't need password reset
      }).returning();
      user = newUser[0];
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

app.post("/api/picker/inventory", uploadMiddleware.single("image"), async (req, res) => {
  try {
    const { userId, name, brand, description, price, originalPrice, stock, categoryId, location } = req.body;

    console.log("📦 Creating new product:", { 
      userId, name, price, stock, categoryId,
      hasImage: !!req.file,
      filename: req.file?.filename 
    });

    // 1. Validate required fields
    if (!userId || !name || !price || !stock || !categoryId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 2. Find the store associated with this picker
    const [staff] = await db.select().from(storeStaff).where(eq(storeStaff.userId, userId));
    if (!staff) {
      console.log("❌ Staff record not found for user:", userId);
      return res.status(404).json({ error: "Store not found for this user" });
    }

    console.log("✅ Staff found, store:", staff.storeId);

    // 3. Create the Product entry first
    const productData: any = {
      name,
      brand: brand || "Generic",
      description: description || "",
      price: parseInt(price), // ✅ FIXED - Use parseInt
      categoryId,
      image: req.file ? `/uploads/${req.file.filename}` : null,
    };

    // Add originalPrice if provided
    if (originalPrice && originalPrice.trim() !== "") {
      productData.originalPrice = parseInt(originalPrice);
    }

    console.log("💾 Inserting product:", productData);

    const [newProduct] = await db.insert(products).values(productData).returning();

    console.log("✅ Product created:", newProduct.id);

    // 4. Create the Inventory entry to link product to store
    const inventoryData = {
      storeId: staff.storeId,
      productId: newProduct.id,
      stockCount: parseInt(stock) || 0,
      location: location || null, // ✅ Add location support
      isAvailable: true
    };

    console.log("💾 Inserting inventory:", inventoryData);

    await db.insert(storeInventory).values(inventoryData);

    console.log("✅ Inventory created successfully");

    res.json({ 
      success: true, 
      message: "New product created and added to inventory",
      productId: newProduct.id 
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
      { headers: { "User-Agent": "KilatGoApp" } }
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
        image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
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
  
  app.get("/api/cart", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: "userId required" });
      const items = await storage.getCartItems(userId);
      const itemsWithProducts = await Promise.all(items.map(async (item) => {
        const product = await storage.getProductById(item.productId);
        return { ...item, product };
      }));
      res.json(itemsWithProducts);
    } catch (error) {
      console.error("❌ Cart error:", error);
      res.status(500).json({ error: "Failed to fetch cart" });
    }
  });

  app.post("/api/cart", async (req, res) => {
    try {
      const { productId, quantity = 1, userId } = req.body;
      if (!userId) return res.status(400).json({ error: "User must be logged in" });
      const item = await storage.addToCart({ userId, productId, quantity });
      res.json(item);
    } catch (error) {
      console.error("❌ Add to cart error:", error);
      res.status(500).json({ error: "Failed to add to cart" });
    }
  });

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

  app.delete("/api/cart/:id", async (req, res) => {
    try {
      await db.delete(cartItems).where(eq(cartItems.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("❌ Delete cart error:", error);
      res.status(500).json({ error: "Failed to remove item" });
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
    const { userId, addressId, items, customerLat, customerLng } = req.body;

    if (!userId || !items?.length || !customerLat || !customerLng) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const itemsWithStore = await Promise.all(
      items.map(async (item: any) => {
        const [inv] = await db
          .select()
          .from(storeInventory)
          .where(eq(storeInventory.productId, item.productId))
          .limit(1);

        if (!inv) throw new Error("Product not available");
        return { ...item, storeId: inv.storeId };
      })
    );

    const itemsByStore: Record<string, any[]> = {};
    for (const item of itemsWithStore) {
      if (!itemsByStore[item.storeId]) itemsByStore[item.storeId] = [];
      itemsByStore[item.storeId].push(item);
    }

    const createdOrders = [];

    for (const storeId of Object.keys(itemsByStore)) {
      const storeItems = itemsByStore[storeId];
      const DELIVERY_FEE_PER_STORE = 10000;
      const itemsTotal = storeItems.reduce(
        (sum, i) => sum + Number(i.price) * Number(i.quantity),
        0
      );
      const total = itemsTotal + DELIVERY_FEE_PER_STORE;
      const deliveryPin = Math.floor(1000 + Math.random() * 9000).toString();

      const [order] = await db
  .insert(orders)
  .values({
    userId,
    storeId,
    addressId,
    subtotal: itemsTotal,  // ✅ ADD THIS LINE
    total,
    deliveryFee: DELIVERY_FEE_PER_STORE,
    status: "pending",
    orderNumber: `ORD-${Math.random().toString(36).toUpperCase().substring(2, 9)}`,
    items: storeItems,
    customerLat: String(customerLat),
    customerLng: String(customerLng),
    deliveryPin,
  })
  .returning();

      await db.insert(orderItems).values(
        storeItems.map(i => ({
          orderId: order.id,
          productId: i.productId,
          quantity: i.quantity,
          priceAtEntry: String(i.price),
        }))
      );

      // 🔔 NOTIFY PICKERS ABOUT NEW ORDER
      await notifyPickersNewOrder(storeId, order.id);

      createdOrders.push(order);
    }

    await storage.clearCart(userId);
    res.status(201).json(createdOrders);

  } catch (error) {
    console.error("❌ Create order error:", error);
    res.status(500).json({ error: "Failed to create order" });
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
      .set({ status: "packed" })
      .where(eq(orders.id, req.params.id))
      .returning();

    // 🔔 NOTIFY CUSTOMER ABOUT STATUS CHANGE
    await notifyCustomerOrderStatus(updated.id, "packed");

    // 🔔 NOTIFY AVAILABLE DRIVERS
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

// Add this NEW endpoint to your routes.ts

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
      console.log(`❌ PIN mismatch - Expected: ${order.deliveryPin}, Got: ${deliveryPin}`);
      return res.status(401).json({ 
        error: "Incorrect PIN. Please check with the customer and try again." 
      });
    }

    const [completed] = await db
      .update(orders)
      .set({ status: "delivered", deliveredAt: new Date() })
      .where(eq(orders.id, id))
      .returning();

    // 🔔 NOTIFY CUSTOMER ORDER DELIVERED
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
app.get("/api/admin/metrics", async (req, res) => {
  try {
    const allStores = await storage.getStores();
    const allOrders = await storage.getAllOrders();
    
    const metrics = await Promise.all(allStores.map(async (store) => {
      const staff = await storage.getStoreStaff(store.id);
      const storeOrders = allOrders.filter((o) => o.storeId === store.id);
      
      // Calculate financials
      const totalRevenue = storeOrders
        .filter(o => o.status === "delivered")
        .reduce((sum, o) => sum + (o.total || 0), 0);
      
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const todayOrders = storeOrders.filter(o => 
        new Date(o.createdAt) >= todayStart
      );
      
      const todayRevenue = todayOrders
        .filter(o => o.status === "delivered")
        .reduce((sum, o) => sum + (o.total || 0), 0);
      
      const thisMonthStart = new Date();
      thisMonthStart.setDate(1);
      thisMonthStart.setHours(0, 0, 0, 0);
      
      const monthOrders = storeOrders.filter(o => 
        new Date(o.createdAt) >= thisMonthStart
      );
      
      const monthRevenue = monthOrders
        .filter(o => o.status === "delivered")
        .reduce((sum, o) => sum + (o.total || 0), 0);
      
      // Calculate average order value
      const deliveredOrders = storeOrders.filter(o => o.status === "delivered");
      const avgOrderValue = deliveredOrders.length > 0
        ? totalRevenue / deliveredOrders.length
        : 0;
      
      // Calculate completion rate
      const completedOrders = storeOrders.filter(o => 
        ["delivered", "cancelled"].includes(o.status || "")
      );
      const completionRate = completedOrders.length > 0
        ? (deliveredOrders.length / completedOrders.length) * 100
        : 0;
      
      // COD collection stats
      const codOrders = storeOrders.filter(o => o.paymentMethod === "cod");
      const codCollected = codOrders
        .filter(o => o.codCollected)
        .reduce((sum, o) => sum + (o.total || 0), 0);
      const codPending = codOrders
        .filter(o => !o.codCollected && o.status === "delivered")
        .reduce((sum, o) => sum + (o.total || 0), 0);
      
      const enriched = await Promise.all(staff.map(async (s) => {
        const u = await storage.getUser(s.userId);
        
        // Get staff-specific stats
        let staffOrders: any[] = [];
        if (s.role === "picker") {
          staffOrders = await storage.getOrdersByPicker(s.userId);
        } else if (s.role === "driver") {
          staffOrders = await storage.getOrdersByDriver(s.userId);
        }
        
        const staffDelivered = staffOrders.filter(o => o.status === "delivered").length;
        const staffActive = staffOrders.filter(o => 
          !["delivered", "cancelled"].includes(o.status || "")
        ).length;
        
        return { 
          ...s, 
          user: u ? { 
            id: u.id, 
            username: u.username, 
            phone: u.phone, 
            email: u.email,
            name: u.name 
          } : null,
          stats: {
            totalOrders: staffOrders.length,
            delivered: staffDelivered,
            active: staffActive,
          }
        };
      }));
      
      return {
        ...store,
        totalStaff: staff.length,
        onlineStaff: staff.filter(s => s.status === "online").length,
        staff: enriched,
        pickers: enriched.filter(s => s.role === "picker"),
        drivers: enriched.filter(s => s.role === "driver"),
        orderCount: storeOrders.length,
        pendingOrders: storeOrders.filter(o => o.status === "pending").length,
        activeOrders: storeOrders.filter(o => 
          ["confirmed", "picking", "packed", "delivering"].includes(o.status || "")
        ).length,
        deliveredOrders: deliveredOrders.length,
        cancelledOrders: storeOrders.filter(o => o.status === "cancelled").length,
        // Financial metrics
        totalRevenue,
        todayRevenue,
        todayOrders: todayOrders.length,
        monthRevenue,
        monthOrders: monthOrders.length,
        avgOrderValue,
        completionRate,
        codCollected,
        codPending,
      };
    }));
    
    // Global totals
    const globalTotals = {
      totalRevenue: metrics.reduce((sum, m) => sum + m.totalRevenue, 0),
      todayRevenue: metrics.reduce((sum, m) => sum + m.todayRevenue, 0),
      monthRevenue: metrics.reduce((sum, m) => sum + m.monthRevenue, 0),
      avgOrderValue: metrics.reduce((sum, m) => sum + m.avgOrderValue, 0) / (metrics.length || 1),
      codCollected: metrics.reduce((sum, m) => sum + m.codCollected, 0),
      codPending: metrics.reduce((sum, m) => sum + m.codPending, 0),
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
  } catch (error) {
    console.error("❌ Admin metrics error:", error);
    res.status(500).json({ error: "Failed to fetch metrics" });
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
          headers: { 'User-Agent': 'KilatGo-App' }
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
          headers: { 'User-Agent': 'KilatGo-App' }
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
          'User-Agent': 'KilatGo-App/1.0',
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
          name: "KilatGo Central Jakarta",
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

app.post("/api/vouchers/validate", async (req, res) => {
  try {
    const { code, userId, orderTotal } = req.body;

    console.log("🔍 Validating voucher:", { code, userId, orderTotal });

    if (!code || !userId || orderTotal === undefined) {
      return res.status(400).json({ 
        valid: false,
        error: "Missing required fields" 
      });
    }

    const now = new Date();

    // Find voucher with error handling
    let voucher;
    try {
      const voucherResult = await db
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
      
      voucher = voucherResult[0];
    } catch (dbError) {
      console.error("❌ Database error finding voucher:", dbError);
      return res.status(500).json({ 
        valid: false,
        error: "Database error, please try again" 
      });
    }

    if (!voucher) {
      console.log("❌ Voucher not found or expired");
      return res.status(404).json({ 
        valid: false, 
        error: "Voucher not found or expired" 
      });
    }

    // Check usage limits
    if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
      return res.status(400).json({ 
        valid: false, 
        error: "Voucher usage limit reached" 
      });
    }

    // ✅ FIXED: Check user usage with proper TypeScript types
    let userUsageCount = 0;
    try {
      const userUsageResult: Array<{ count: number }> = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(userVoucherUsage)
        .where(
          and(
            eq(userVoucherUsage.userId, userId),
            eq(userVoucherUsage.voucherId, voucher.id)
          )
        );
      
      userUsageCount = userUsageResult[0]?.count || 0;
    } catch (usageError) {
      console.error("❌ Error checking user usage:", usageError);
      // Continue with usage count 0 if lookup fails
    }

    if (userUsageCount >= voucher.userLimit) {
      return res.status(400).json({ 
        valid: false, 
        error: "You've already used this voucher" 
      });
    }

    // Check minimum order
    if (orderTotal < voucher.minOrder) {
      return res.status(400).json({ 
        valid: false, 
        error: `Minimum order is Rp ${voucher.minOrder.toLocaleString("id-ID")}` 
      });
    }

    // Check user targeting
    let user;
    try {
      const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      user = userResult[0];
    } catch (userError) {
      console.error("❌ Error fetching user:", userError);
      // Continue without user targeting check
    }

    if (user) {
      if (voucher.targetUsers === "new_users" && !user.isNewUser) {
        return res.status(400).json({ 
          valid: false, 
          error: "This voucher is for new users only" 
        });
      }
      if (voucher.targetUsers === "returning_users" && user.isNewUser) {
        return res.status(400).json({ 
          valid: false, 
          error: "This voucher is for returning users only" 
        });
      }
    }

    // Calculate discount
    let discount = 0;
    if (voucher.discountType === "percentage") {
      discount = Math.floor((orderTotal * voucher.discount) / 100);
      if (voucher.maxDiscount && discount > voucher.maxDiscount) {
        discount = voucher.maxDiscount;
      }
    } else {
      discount = voucher.discount;
    }

    console.log(`✅ Voucher valid - discount: ${discount}`);

    res.json({
      valid: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        discount,
        description: voucher.description,
      },
    });
  } catch (error) {
    console.error("❌ Validate voucher error:", error);
    res.status(500).json({ 
      valid: false,
      error: "Failed to validate voucher. Please try again." 
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

app.get("/api/admin/promotions", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    // Verify admin
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId as string));

    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin only" });
    }

    // ✅ FIXED: Return FLAT objects with proper image field
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

    console.log(`✅ Admin fetched ${allPromotions.length} promotions`);
    res.json(allPromotions);
  } catch (error) {
    console.error("❌ Get admin promotions error:", error);
    res.status(500).json({ error: "Failed to fetch promotions" });
  }
});

// ===== ADMIN: CREATE APP-WIDE PROMOTION WITH IMAGE =====

app.post("/api/admin/promotions", uploadPromotion.single("image"), async (req, res) => {
  try {
    const { userId, title, description, type, discountValue, minOrder, validUntil, showInBanner, scope, applicableStoreIds } = req.body;

    console.log("📝 Creating promotion:", { userId, title, type, hasImage: !!req.file });

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    // Verify admin
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin only" });
    }

    // Parse applicableStoreIds if it's a string
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
      title,
      description,
      type,
      discountValue: discountValue ? parseInt(discountValue) : null,
      minOrder: minOrder ? parseInt(minOrder) : 0,
      validFrom: new Date(),
      validUntil: new Date(validUntil),
      storeId: scope === "store" && storeIds?.length === 1 ? storeIds[0] : null,
      createdBy: userId,
      scope: scope || "app",
      applicableStoreIds: scope === "store" && storeIds?.length > 1 ? storeIds : null,
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

    console.log(`✅ Admin created promotion: ${newPromotion.title}`);
    res.json(newPromotion);
  } catch (error) {
    console.error("❌ Admin create promotion error:", error);
    res.status(500).json({ error: "Failed to create promotion" });
  }
});

// ===== ADMIN: UPDATE ANY PROMOTION WITH IMAGE =====
app.patch("/api/admin/promotions/:id", uploadPromotion.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, title, description, discountValue, minOrder, validUntil, isActive, showInBanner, scope, applicableStoreIds } = req.body;

    console.log("📝 Updating promotion:", { id, userId, hasNewImage: !!req.file });

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    // Verify admin
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin only" });
    }

    // Parse applicableStoreIds if it's a string
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

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (discountValue !== undefined) updateData.discountValue = parseInt(discountValue);
    if (minOrder !== undefined) updateData.minOrder = parseInt(minOrder);
    if (validUntil !== undefined) updateData.validUntil = new Date(validUntil);
    if (isActive !== undefined) updateData.isActive = isActive === "true" || isActive === true;
    if (showInBanner !== undefined) updateData.showInBanner = showInBanner === "true" || showInBanner === true;
    if (scope !== undefined) updateData.scope = scope;
    
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
    res.status(500).json({ error: "Failed to update promotion" });
  }
});

// ===== ADMIN: DELETE ANY PROMOTION =====
app.delete("/api/admin/promotions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    // Verify admin
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId as string));

    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin only" });
    }

    // ✅ FIXED: Proper deletion
    const [deleted] = await db
      .delete(promotions)
      .where(eq(promotions.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Promotion not found" });
    }

    console.log(`✅ Admin deleted promotion: ${id}`);
    res.json({ success: true, message: "Promotion deleted" });
  } catch (error) {
    console.error("❌ Admin delete promotion error:", error);
    res.status(500).json({ error: "Failed to delete promotion" });
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
app.post("/api/vouchers/validate", async (req, res) => {
  try {
    const { code, userId, orderTotal } = req.body;

    console.log("🔍 Validating voucher:", { code, userId, orderTotal });

    if (!code || !userId || orderTotal === undefined) {
      return res.status(400).json({ 
        valid: false,
        error: "Missing required fields" 
      });
    }

    const now = new Date();

    let voucher;
    try {
      const voucherResult = await db
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
      
      voucher = voucherResult[0];
    } catch (dbError) {
      console.error("❌ Database error finding voucher:", dbError);
      return res.status(500).json({ 
        valid: false,
        error: "Database error, please try again" 
      });
    }

    if (!voucher) {
      console.log("❌ Voucher not found or expired");
      return res.status(404).json({ 
        valid: false, 
        error: "Voucher not found or expired" 
      });
    }

    if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
      return res.status(400).json({ 
        valid: false, 
        error: "Voucher usage limit reached" 
      });
    }

    let userUsageCount = 0;
    try {
      const userUsageResult: Array<{ count: number }> = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(userVoucherUsage)
        .where(
          and(
            eq(userVoucherUsage.userId, userId),
            eq(userVoucherUsage.voucherId, voucher.id)
          )
        );
      
      userUsageCount = userUsageResult[0]?.count || 0;
    } catch (usageError) {
      console.error("❌ Error checking user usage:", usageError);
    }

    if (userUsageCount >= voucher.userLimit) {
      return res.status(400).json({ 
        valid: false, 
        error: "You've already used this voucher" 
      });
    }

    if (orderTotal < voucher.minOrder) {
      return res.status(400).json({ 
        valid: false, 
        error: `Minimum order is Rp ${voucher.minOrder.toLocaleString("id-ID")}` 
      });
    }

    let user;
    try {
      const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      user = userResult[0];
    } catch (userError) {
      console.error("❌ Error fetching user:", userError);
    }

    if (user) {
      if (voucher.targetUsers === "new_users" && !user.isNewUser) {
        return res.status(400).json({ 
          valid: false, 
          error: "This voucher is for new users only" 
        });
      }
      if (voucher.targetUsers === "returning_users" && user.isNewUser) {
        return res.status(400).json({ 
          valid: false, 
          error: "This voucher is for returning users only" 
        });
      }
    }

    let discount = 0;
    if (voucher.discountType === "percentage") {
      discount = Math.floor((orderTotal * voucher.discount) / 100);
      if (voucher.maxDiscount && discount > voucher.maxDiscount) {
        discount = voucher.maxDiscount;
      }
    } else {
      discount = voucher.discount;
    }

    console.log(`✅ Voucher valid - discount: ${discount}`);

    res.json({
      valid: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        discount,
        description: voucher.description,
      },
    });
  } catch (error) {
    console.error("❌ Validate voucher error:", error);
    res.status(500).json({ 
      valid: false,
      error: "Failed to validate voucher. Please try again." 
    });
  }
});

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