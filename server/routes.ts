import type { Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { eq, and, gt, sql, or, isNull } from "drizzle-orm";
import { storage } from "./storage";
import { db } from "./db";
import { 
  categories, products, vouchers, users, stores, storeStaff, 
  storeInventory, otpCodes, addresses, orders, orderItems, 
  cartItems, messages
} from "../shared/schema";
import { findNearestAvailableStore, getStoresWithAvailability, estimateDeliveryTime } from "./storeAvailability";
import express, { Express } from 'express';
import fs from "fs";
import path from 'path';
import { Expo } from 'expo-server-sdk';
import multer from "multer";
import OpenAI from "openai";







// ==================== CONFIGURATION ====================
const DEMO_USER_ID = "demo-user";

// Multer storage configuration
const UPLOADS_PATH = path.resolve(process.cwd(), "uploads");
const upload = multer({ dest: "uploads/" });
const openai = new OpenAI();

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

// Push notification helper
const expo = new Expo();
async function sendPushNotification(userId: string, title: string, body: string, data?: any) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (user?.pushToken && Expo.isExpoPushToken(user.pushToken)) {
    try {
      await expo.sendPushNotificationsAsync([{
        to: user.pushToken,
        sound: 'default',
        title,
        body,
        data: data || {},
      }]);
    } catch (error) {
      console.error("❌ Push Error:", error);
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// 🟢 HEALTH CHECK & DEBUG ROUTE
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "alive", 
      time: new Date().toISOString(),
      env: process.env.NODE_ENV || "not set"
    });
  });
  
  
  // ==================== 1. CORS MIDDLEWARE (MUST BE FIRST!) ====================
  // ==================== 1. CORS MIDDLEWARE (FIXED) ====================
  

  app.post("/api/auth/google", async (req, res) => {
  const { googleId, email, name } = req.body;

  try {
    // 1. Try to find user by email first
    let user = await storage.getUserByEmail(email);

    // 2. If no user found, create one
    if (!user) {
      user = await storage.createUser({
        username: name || email.split('@')[0],
        email: email,
        password: "google-auth-user", // Placeholder since they use Google
        role: "customer",
        phone: null,
      });
    }

    // 3. Set session/return user
    // (If you use express-session) req.session.userId = user.id;
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: "Failed to authenticate with Google" });
  }
});

  // ==================== 2. STATIC FILES ====================
  app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));
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

// In server/routes.ts - modify login endpoint
app.post("/api/auth/login", async (req, res) => {
  const { phone, password } = req.body;
  const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  const user = result[0];

  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  // ✅ CHECK IF FIRST LOGIN (staff created by admin)
  if (user.accountStatus === "pending_activation") {
    return res.status(403).json({ 
      error: "first_login_required",
      message: "Please complete account setup",
      phone: user.phone
    });
  }

  if (user.password !== password) {
    return res.status(401).json({ error: "Invalid password" });
  }
  
  res.json({ user: { id: user.id, username: user.username, phone: user.phone, role: user.role } });
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

    // 1. Validate OTP
    const validOtp = await db.select().from(otpCodes)
      .where(and(
        eq(otpCodes.phone, phone), 
        eq(otpCodes.code, code), 
        eq(otpCodes.verified, false), 
        gt(otpCodes.expiresAt, new Date())
      ))
      .limit(1);

    if (!validOtp.length) return res.status(400).json({ error: "Invalid or expired OTP" });

    // 2. Mark OTP as verified
    await db.update(otpCodes).set({ verified: true }).where(eq(otpCodes.id, validOtp[0].id));

    // 3. Check for existing user by PHONE (Primary Key for our logic)
    const existingUsers = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    let user;

    if (existingUsers.length > 0) {
      // --- UPDATE EXISTING USER ---
      const updatedUsers = await db.update(users)
        .set({ 
          password: password || existingUsers[0].password,
          email: email || existingUsers[0].email,
          // Only update username if the new name is provided
          username: name || existingUsers[0].username 
        })
        .where(eq(users.phone, phone))
        .returning();
      user = updatedUsers[0];
    } else {
      // --- CREATE NEW USER ---
      const isSuperAdmin = phone === '+6288289943397';
      
      // Fix for the Duplicate Username Error:
      // We try to use the name, but if that's taken or empty, we use phone + timestamp
      // This ensures "users_username_unique" is NEVER violated.
      const timestamp = Date.now().toString().slice(-4);
      const safeUsername = name ? `${name}_${timestamp}` : `user_${phone.slice(-4)}_${timestamp}`;

      const newUser = await db.insert(users).values({
        username: safeUsername,
        password: password,
        phone,
        email: email || null,
        role: isSuperAdmin ? "admin" : "customer",
      }).returning();
      user = newUser[0];
    }

    // 4. Staff/Store Logic
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
        role: user.role 
      }, 
      staffInfo 
    });

  } catch (error: any) {
    console.error("❌ OTP verify error details:", error);
    
    // Catch the specific Postgres Unique Violation
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

    // 1️⃣ Get driver staff record
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

    // 2️⃣ Active delivery (LOCK = only one)
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

    // 3️⃣ Ready orders (packed, unassigned)
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

    // 4️⃣ Completed orders (delivered)
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
        ready: readyOrders,
        active: activeOrders,
        completed: completedOrders,
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

    // 1️⃣ Get driver staff record
    const [staff] = await db
      .select()
      .from(storeStaff)
      .where(eq(storeStaff.userId, userId));

    if (!staff) {
      return res.status(403).json({ error: "Driver not assigned to store" });
    }

    // 2️⃣ PICK UP ORDER (packed → delivering)
    if (status === "delivering") {
      const [picked] = await db
        .update(orders)
        .set({
          status: "delivering",
          driverId: userId,
        })
        .where(
          and(
            eq(orders.id, id),
            eq(orders.storeId, staff.storeId),
            eq(orders.status, "packed"),
            isNull(orders.driverId) // 🔒 HARD LOCK
          )
        )
        .returning();

      if (!picked) {
        return res.status(409).json({
          error: "Order already taken or not available",
        });
      }

      return res.json(picked);
    }

    // 3️⃣ COMPLETE DELIVERY (delivering → delivered)
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

    res.json(completed);
  } catch (error) {
    console.error("❌ Driver order update error:", error);
    res.status(500).json({ error: "Update failed" });
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
app.get("/api/home/products", async (req: Request, res: Response) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    console.log("🟢 HIT /api/home/products", { lat, lng });

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: "lat & lng required" });
    }

    // Query DB - ✅ REMOVED stock_count > 0 filter
    const result = await db.execute(sql<HomeProductRow>`
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
            cos(radians(${lat}))
            * cos(radians(s.latitude))
            * cos(radians(s.longitude) - radians(${lng}))
            + sin(radians(${lat}))
            * sin(radians(s.latitude))
          )
        ) AS distance
      FROM stores s
      JOIN store_inventory si ON si.store_id = s.id
      JOIN products p ON p.id = si.product_id
      WHERE
        (
          6371 * acos(
            cos(radians(${lat}))
            * cos(radians(s.latitude))
            * cos(radians(s.longitude) - radians(${lng}))
            + sin(radians(${lat}))
            * sin(radians(s.latitude))
          )
        ) <= 3
      ORDER BY distance ASC;
    `);

    console.log("✅ home products found:", result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ /api/home/products error", error);
    res.status(500).json({ error: "Failed to fetch home products" });
  }
});


app.get("/api/category/products", async (req, res) => {
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
            cos(radians(${lat}))
            * cos(radians(s.latitude))
            * cos(radians(s.longitude) - radians(${lng}))
            + sin(radians(${lat}))
            * sin(radians(s.latitude))
          )
        ) AS distance
      FROM stores s
      JOIN store_inventory si ON si.store_id = s.id
      JOIN products p ON p.id = si.product_id
      WHERE
        p.category_id = ${categoryId}
        AND si.stock_count > 0
        AND (
          6371 * acos(
            cos(radians(${lat}))
            * cos(radians(s.latitude))
            * cos(radians(s.longitude) - radians(${lng}))
            + sin(radians(${lat}))
            * sin(radians(s.latitude))
          )
        ) <= 3
      ORDER BY distance ASC;
    `);

    console.log("✅ category products found:", result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ /api/category/products error", error);
    res.status(500).json({ error: "Failed to fetch category products" });
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


app.post("/api/speech-to-text", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file" });
    }

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "gpt-4o-transcribe",
      language: "en",
    });

    fs.unlinkSync(req.file.path);

    res.json({ text: transcription.text });
  } catch (err) {
    console.error("❌ Speech error:", err);
    res.status(500).json({ error: "Speech transcription failed" });
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
    const {
      userId,
      addressId,
      items,
      customerLat,
      customerLng,
    } = req.body;

    if (!userId || !items?.length || !customerLat || !customerLng) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1️⃣ Resolve store per product
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

    // 2️⃣ Group items by store
    const itemsByStore: Record<string, any[]> = {};
    for (const item of itemsWithStore) {
      if (!itemsByStore[item.storeId]) itemsByStore[item.storeId] = [];
      itemsByStore[item.storeId].push(item);
    }

    const createdOrders = [];

    // 3️⃣ Create ONE order per store
    for (const storeId of Object.keys(itemsByStore)) {
      const storeItems = itemsByStore[storeId];

      const DELIVERY_FEE_PER_STORE = 10000;

      const itemsTotal = storeItems.reduce(
        (sum, i) => sum + Number(i.price) * Number(i.quantity),
        0
      );

      const deliveryFee = DELIVERY_FEE_PER_STORE;
      const total = itemsTotal + deliveryFee;

      // ✅ Generate random 4-digit PIN
      const deliveryPin = Math.floor(1000 + Math.random() * 9000).toString();

      const [order] = await db
        .insert(orders)
        .values({
          userId,
          storeId,
          addressId,
          total,
          deliveryFee,
          status: "pending",
          orderNumber: `ORD-${Math.random().toString(36).toUpperCase().substring(2, 9)}`,
          items: storeItems,
          customerLat: String(customerLat),
          customerLng: String(customerLng),
          deliveryPin, // ✅ Store the PIN
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

      // Notify store staff
      const staff = await db
        .select()
        .from(storeStaff)
        .where(eq(storeStaff.storeId, storeId));

      for (const s of staff) {
        await sendPushNotification(
          s.userId,
          "📦 New Order",
          `Order ${order.orderNumber} is ready`,
          { orderId: order.id }
        );
      }

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
        id: orderItems.id, quantity: orderItems.quantity, priceAtEntry: orderItems.priceAtEntry,
        productId: orderItems.productId, productName: products.name,
      }).from(orderItems).leftJoin(products, eq(orderItems.productId, products.id)).where(eq(orderItems.orderId, req.params.id));
      let driverName = null;
      if (orderData.driverId) {
        const driver = await storage.getUser(orderData.driverId);
        driverName = driver?.username;
      }
      res.json({ ...orderData, items, driverName });
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

    // 1️⃣ Get driver staff record
    const [staff] = await db
      .select()
      .from(storeStaff)
      .where(eq(storeStaff.userId, userId));

    if (!staff) {
      return res.status(403).json({ error: "Driver not assigned to store" });
    }

    // 2️⃣ Get the order
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id));

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // 3️⃣ Verify driver owns this order
    if (order.driverId !== userId) {
      return res.status(403).json({ error: "Not your delivery" });
    }

    if (order.status !== "delivering") {
      return res.status(400).json({ error: "Order must be in delivering status" });
    }

    // 4️⃣ Verify PIN matches - IMPROVED ERROR MESSAGE
    if (order.deliveryPin !== deliveryPin.toString()) {
      console.log(`❌ PIN mismatch - Expected: ${order.deliveryPin}, Got: ${deliveryPin}`);
      return res.status(401).json({ 
        error: "Incorrect PIN. Please check with the customer and try again." 
      });
    }

    // 5️⃣ Complete the order
    const [completed] = await db
      .update(orders)
      .set({ 
        status: "delivered",
        deliveredAt: new Date()
      })
      .where(eq(orders.id, id))
      .returning();

    // 6️⃣ Notify customer
    await sendPushNotification(
      order.userId,
      "✅ Order Delivered",
      `Your order has been delivered successfully`,
      { orderId: order.id }
    );

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

  app.post(
  "/api/messages",
  uploadChat.single("file"),
  async (req, res) => {

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

    // Fetch order to determine receiver
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    
    if (order) {
      const receiverId = (senderId === order.userId) ? order.driverId : order.userId;
      if (receiverId) {
        await sendPushNotification(
          receiverId, 
          "New Message 💬", 
          req.file ? "📷 Image" : content, 
          { orderId }
        );
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

  const stores = await getStoresWithAvailability(lat, lng);

  res.json({
    stores: stores
      .filter(s => s.distanceKm <= 3)
      .map(s => ({
        id: s.id,
        name: s.name,
        address: s.address,
        distanceKm: s.distanceKm,
        codAllowed: s.codAllowed,
        isAvailable: s.isAvailable,
      })),
  });
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

    // Check if store exists
    const store = await storage.getStoreById(storeId);
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    // Find or create user
    let user = phone 
      ? await storage.getUserByPhone(phone) 
      : await storage.getUserByEmail(email!);

    if (!user) {
      // Create new user with temporary credentials
      const username = phone || email!.split("@")[0];
      const tempPassword = Math.random().toString(36).slice(-8);
      
      user = await storage.createUser({
        username,
        password: tempPassword, // Should be hashed in production
        phone: phone || null,
        email: email || null,
        name: name || username,
        role,
      });
      
      console.log(`✅ Created new user: ${username} (temp password: ${tempPassword})`);
    } else {
      // Update existing user role if different
      if (user.role !== role) {
        await db.update(users)
          .set({ role })
          .where(eq(users.id, user.id));
        console.log(`📝 Updated user ${user.id} role to ${role}`);
      }
    }

    // Check if already staff at this store
    const existingStaff = await storage.getStoreStaff(storeId);
    const alreadyStaff = existingStaff.find(s => s.userId === user!.id);
    
    if (alreadyStaff) {
      return res.status(400).json({ error: "User is already staff at this store" });
    }

    // Create staff assignment
    const newStaff = await storage.createStoreStaff({
      userId: user.id,
      storeId,
      role,
      status: "offline",
    });

    console.log(`✅ Staff added: ${newStaff.id}`);

    // Return enriched staff data
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