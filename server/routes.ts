import type { Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { eq, and, gt, sql, or, isNull } from "drizzle-orm";
import { storage } from "./storage";
import { db } from "./db";
import { 
  categories, products, vouchers, users, stores, storeStaff, 
  storeInventory, otpCodes, addresses, orders, orderItems, 
  cartItems, messages
} from "@shared/schema";
import { findNearestAvailableStore, getStoresWithAvailability, estimateDeliveryTime } from "./storeAvailability";
import express, { Express } from 'express';
import path from 'path';
import { Expo } from 'expo-server-sdk';
import multer from "multer";

// ==================== CONFIGURATION ====================
const DEMO_USER_ID = "demo-user";

// Multer storage configuration
const chatStorage = multer.diskStorage({
  destination: "./uploads/chat",
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
  
  // ==================== 1. CORS MIDDLEWARE (MUST BE FIRST!) ====================
  console.log("🌐 Setting up CORS middleware...");
  
  app.use((req, res, next) => {
    const allowedOrigins = ["http://localhost:8081", "http://10.30.230.213:8081"];
    const origin = req.headers.origin;
    
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      console.log('✅ Preflight handled:', req.path);
      return res.status(200).end();
    }
    
    console.log(`📡 ${req.method} ${req.path}`);
    next();
  });

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
  app.use('/images', express.static(path.join(__dirname, '../../../../../../attached_assets')));
  app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

   app.post("/api/picker/inventory/update", uploadMiddleware.single("image"), async (req: Request, res: Response) => {
  try {
    const { inventoryId, userId, stock, price, name, brand, description, categoryId } = req.body;

    if (!inventoryId || !userId) return res.status(400).json({ error: "Missing required fields" });

    // 1. Update Inventory stock
    await storage.updateStoreInventory(inventoryId, parseInt(stock) || 0, true);

    // 2. Find the product linked to this inventory record
    const invRecords = await db.select().from(storeInventory).where(eq(storeInventory.id, inventoryId));
    
    if (invRecords.length > 0) {
      const updateData: any = {
        name,
        brand,
        description,
        price: parseFloat(price),
        categoryId
      };

      if (req.file) {
        updateData.image = `/uploads/${req.file.filename}`;
      }

      // This call will now work because we added it to storage.ts
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
  const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  const user = result[0];

  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid phone or password" });
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
      console.log("🔍 Picker dashboard - userId:", req.query.userId);
      const { userId } = req.query;
      if (!userId) return res.status(400).json({ error: "userId required" });

      const allOrders = await db.select().from(orders).where(eq(orders.pickerId, userId as string));
      console.log(`📊 ${allOrders.length} orders for picker`);

      res.json({
        user: { id: userId, role: "picker" },
        orders: {
          pending: allOrders.filter(o => ["pending", "confirmed"].includes(o.status || "")),
          active: allOrders.filter(o => o.status === "picking"),
          completed: allOrders.filter(o => ["packed", "delivering", "delivered"].includes(o.status || "")),
        }
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
    const { userId, name, brand, description, price, stock, categoryId } = req.body;

    // 1. Find the store associated with this picker
    const [staff] = await db.select().from(storeStaff).where(eq(storeStaff.userId, userId));
    if (!staff) return res.status(404).json({ error: "Store not found for this user" });

    // 2. Create the Product entry first
    const [newProduct] = await db.insert(products).values({
      name,
      brand: brand || "Generic",
      description: description || "",
      price: parseFloat(price),
      categoryId,
      image: req.file ? `/uploads/${req.file.filename}` : null,
    }).returning();

    // 3. Create the Inventory entry to link product to store
    await db.insert(storeInventory).values({
      storeId: staff.storeId,
      productId: newProduct.id,
      stockCount: parseInt(stock) || 0,
      isAvailable: true
    });

    res.json({ success: true, message: "New product created and added to inventory" });
  } catch (error) {
    console.error("Creation error:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
});
  // Add this to registerRoutes in server/routes.ts


  app.delete("/api/picker/inventory/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.query;
      console.log(`🗑️ Delete inventory ${id} - user: ${userId}`);
      
      if (!userId) return res.status(400).json({ error: "userId required" });
      const user = await storage.getUser(userId as string);
      if (!user || user.role !== "picker") return res.status(403).json({ error: "Pickers only" });
      
      await storage.deleteStoreInventory(id);
      console.log("✅ Deleted");
      res.json({ success: true });
    } catch (error) {
      console.error("❌ Delete error:", error);
      res.status(500).json({ error: "Delete failed" });
    }
  });

  // ==================== 5. DRIVER ROUTES ====================
  console.log("🚗 Registering driver routes...");
  
  app.get("/api/driver/dashboard", async (req, res) => {
    try {
      console.log("🔍 Driver dashboard - userId:", req.query.userId);
      const { userId } = req.query;
      
      const allOrders = await db.select().from(orders)
        .where(or(eq(orders.driverId, userId as string), and(eq(orders.status, "packed"), isNull(orders.driverId))));

      console.log(`📊 ${allOrders.length} orders for driver`);
      res.json({
        user: { id: userId, role: "driver" },
        staffRecord: { status: "online" },
        orders: {
          ready: allOrders.filter(o => o.status === "packed" && !o.driverId),
          active: allOrders.filter(o => o.status === "delivering"),
          completed: allOrders.filter(o => o.status === "delivered")
        }
      });
    } catch (error) {
      console.error("❌ Driver dashboard error:", error);
      res.status(500).json({ error: "Failed" });
    }
  });

  app.put("/api/driver/orders/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, userId } = req.body;
      console.log(`🔄 Driver update order ${id} - status: ${status}`);

      const updateData: any = { status };
      if (status === "delivering") updateData.driverId = userId;

      const [updatedOrder] = await db.update(orders).set(updateData).where(eq(orders.id, id)).returning();
      if (!updatedOrder) return res.status(404).json({ error: "Not found" });

      console.log("✅ Updated");
      res.json(updatedOrder);
    } catch (error) {
      console.error("❌ Update error:", error);
      res.status(500).json({ error: "Update failed" });
    }
  });

  // ==================== 6. CATEGORIES ====================
  console.log("📂 Registering category routes...");
  
  app.get("/api/categories", async (req, res) => {
    try {
      const allCategories = await storage.getCategories();
      res.json(allCategories);
    } catch (error) {
      console.error("❌ Categories error:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
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
  
  app.get("/api/products", async (req, res) => {
    try {
      const categoryId = req.query.categoryId as string | undefined;
      const allProducts = categoryId ? await storage.getProductsByCategory(categoryId) : await storage.getProducts();
      res.json(allProducts);
    } catch (error) {
      console.error("❌ Products error:", error);
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
      const { userId, addressId, total, items, customerLat, customerLng } = req.body;
      const nearestStore = await findNearestAvailableStore(parseFloat(customerLat), parseFloat(customerLng));
      const storeId = nearestStore ? nearestStore.id : "demo-store";
      
      const [newOrder] = await db.insert(orders).values({
        userId, storeId, addressId, total: Number(total), status: "pending", pickerId: "demo-picker",
        orderNumber: `ORD-${Math.random().toString(36).toUpperCase().substring(2, 9)}`,
        items: items || [], customerLat: String(customerLat), customerLng: String(customerLng),
      }).returning();
      
      const staff = await db.select().from(storeStaff).where(eq(storeStaff.storeId, storeId));
      for (const s of staff) {
        await sendPushNotification(s.userId, "New Order! 📦", `Order ${newOrder.orderNumber} ready`, { orderId: newOrder.id });
      }
      
      if (items?.length) {
        await db.insert(orderItems).values(items.map((i: any) => ({
          orderId: newOrder.id, productId: i.productId, quantity: i.quantity, priceAtEntry: String(i.price || 0)
        })));
      }
      
      await storage.clearCart(userId);
      res.status(201).json(newOrder);
    } catch (error) {
      console.error("❌ Create order error:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.patch("/api/orders/:id/take", async (req, res) => {
    try {
      const { staffId, role } = req.body;
      const updateData: any = {};
      if (role === 'picker') { updateData.pickerId = staffId; updateData.status = 'picking'; }
      else if (role === 'driver') { updateData.driverId = staffId; updateData.status = 'delivering'; }
      const [updated] = await db.update(orders).set(updateData).where(eq(orders.id, req.params.id)).returning();
      res.json(updated);
    } catch (error) {
      console.error("❌ Take order error:", error);
      res.status(500).json({ error: "Failed to assign" });
    }
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const [updated] = await db.update(orders).set({ status }).where(eq(orders.id, req.params.id)).returning();
      if (updated) {
        await sendPushNotification(updated.userId, "Order Update", `Status: ${status}`);
        if (status === "pending" && updated.storeId) {
          const staff = await db.select().from(storeStaff).where(eq(storeStaff.storeId, updated.storeId));
          for (const s of staff) await sendPushNotification(s.userId, "New Order!", `#${updated.orderNumber}`);
        }
      }
      res.json(updated);
    } catch (error) {
      console.error("❌ Update status error:", error);
      res.status(500).json({ error: "Failed to update" });
    }
  });

  app.get("/api/orders", async (req, res) => {
    try {
      const { userId, storeId, role } = req.query;
      const filters = [];
      if (role === 'customer') {
        if (!userId) return res.status(400).json({ error: "userId required" });
        filters.push(eq(orders.userId, userId as string));
      } else if (role === 'picker' || role === 'driver') {
        if (!storeId) return res.status(400).json({ error: "storeId required" });
        filters.push(eq(orders.storeId, storeId as string));
      } else {
        if (!userId) return res.status(400).json({ error: "userId required" });
        filters.push(eq(orders.userId, userId as string));
      }
      
      const userOrders = await db.select().from(orders).where(and(...filters)).orderBy(sql`${orders.createdAt} DESC`);
      const ordersWithItems = await Promise.all(userOrders.map(async (o) => {
        const items = await db.select({
          id: orderItems.id, quantity: orderItems.quantity, priceAtEntry: orderItems.priceAtEntry,
          productId: orderItems.productId, productName: products.name, productImage: products.image,
        }).from(orderItems).leftJoin(products, eq(orderItems.productId, products.id)).where(eq(orderItems.orderId, o.id));
        return { ...o, items };
      }));
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
      if (req.file) content = `http://10.30.230.213:5000/uploads/chat/${req.file.filename}`;
      if (!orderId || !senderId || !content) return res.status(400).json({ error: "Missing fields" });
      
      const [msg] = await db.insert(messages).values({
        orderId, senderId, type: type || (req.file ? "image" : "text"), content,
      }).returning();
      
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
      const receiverId = (senderId === order.userId) ? order.driverId : order.userId;
      if (receiverId) await sendPushNotification(receiverId, "New Message 💬", type === "image" ? "📷 Image" : content, { orderId });
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
      if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: "Valid lat/lng required" });
      const nearest = await findNearestAvailableStore(lat, lng);
      if (!nearest) return res.json({ available: false, message: "No stores available", stores: await getStoresWithAvailability(lat, lng) });
      res.json({ available: true, store: nearest, estimatedDeliveryMinutes: estimateDeliveryTime(nearest.distanceKm), codAllowed: nearest.codAllowed });
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

  // ==================== 13. ADMIN ====================
  console.log("👑 Registering admin routes...");
  
  app.get("/api/admin/metrics", async (req, res) => {
    try {
      const stores = await storage.getStores();
      const allOrders = await storage.getAllOrders();
      const metrics = await Promise.all(stores.map(async (store) => {
        const staff = await storage.getStoreStaff(store.id);
        const storeOrders = allOrders.filter((o) => o.storeId === store.id);
        const enriched = await Promise.all(staff.map(async (s) => {
          const u = await storage.getUser(s.userId);
          return { ...s, user: u ? { id: u.id, username: u.username, phone: u.phone, email: u.email } : null };
        }));
        return {
          ...store, totalStaff: staff.length, onlineStaff: staff.filter(s => s.status === "online").length,
          staff: enriched, pickers: enriched.filter(s => s.role === "picker"), drivers: enriched.filter(s => s.role === "driver"),
          orderCount: storeOrders.length, pendingOrders: storeOrders.filter(o => o.status === "pending").length,
          activeOrders: storeOrders.filter(o => ["confirmed", "preparing", "ready", "on_the_way"].includes(o.status || "")).length,
        };
      }));
      res.json({ stores: metrics, orderSummary: {
        total: allOrders.length, pending: allOrders.filter(o => o.status === "pending").length,
        confirmed: allOrders.filter(o => o.status === "confirmed").length, preparing: allOrders.filter(o => o.status === "preparing").length,
        ready: allOrders.filter(o => o.status === "ready").length, onTheWay: allOrders.filter(o => o.status === "on_the_way").length,
        delivered: allOrders.filter(o => o.status === "delivered").length, cancelled: allOrders.filter(o => o.status === "cancelled").length,
      }, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("❌ Admin metrics error:", error);
      res.status(500).json({ error: "Failed" });
    }
  });

  // Vouchers, Seed, Owner routes...
  app.get("/api/vouchers", async (req, res) => {
    try {
      res.json(await storage.getVouchers());
    } catch (error) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.post("/api/seed", async (_req: Request, res: Response) => {
    try {
      const existingCategories = await storage.getCategories();
      
      // Check if store data needs to be seeded (new tables)
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
        
        // Seed store data if stores are empty but products exist
        if (existingStores.length === 0) {
          const allProducts = await storage.getProducts();
          
          // Only proceed if products exist
          if (allProducts.length === 0) {
            return res.json({ message: "Cannot seed store data: no products found" });
          }
          
          // Create demo store
          await db.insert(stores).values({
            id: DEMO_STORE_ID_CHECK,
            name: "KilatGo Central Jakarta",
            address: "Jl. Sudirman No. 1, Central Jakarta, DKI Jakarta 10220",
            latitude: "-6.2088000",
            longitude: "106.8456000",
            codAllowed: true,
            isActive: true,
          });

          // Check if picker/driver users exist before creating
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

          // Create store staff (check if not exists)
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

          // Create inventory for all products
          const inventoryEntries = allProducts.map((product, index) => ({
            id: `inventory-${index + 1}`,
            storeId: DEMO_STORE_ID_CHECK,
            productId: product.id,
            stockCount: product.stockCount,
            isAvailable: product.inStock,
          }));
          await db.insert(storeInventory).values(inventoryEntries);
          
          return res.json({ message: "Store data seeded successfully" });
        }
        
        return res.json({ message: "Data already seeded" });
      }

      const existingUser = await storage.getUser(DEMO_USER_ID);
      if (!existingUser) {
        await db.insert(users).values({
          id: DEMO_USER_ID,
          username: "demo",
          password: "demo",
          phone: "+62123456789",
        });
      }

      const seedCategories = [
        { id: "1", name: "Milk", icon: "droplet", color: "#4A90E2", image: "/images/dairy_milk_products__f381a151.jpg" },
        { id: "2", name: "Eggs", icon: "circle", color: "#FF9800", image: "/images/fresh_eggs_basket_fa_e1b74097.jpg" },
        { id: "3", name: "Snacks", icon: "box", color: "#9C27B0", image: "/images/assorted_snacks_chip_5803ca41.jpg" },
        { id: "4", name: "Fruits", icon: "sun", color: "#4CAF50", image: "/images/fresh_colorful_fruit_e3789c47.jpg" },
        { id: "5", name: "Frozen", icon: "thermometer", color: "#00BCD4", image: "/images/frozen_food_products_880da67b.jpg" },
        { id: "6", name: "Drinks", icon: "coffee", color: "#F44336", image: "/images/beverages_drinks_bot_7c35199f.jpg" },
        { id: "7", name: "Veggies", icon: "feather", color: "#8BC34A", image: "/images/fresh_vegetables_gre_e9d9592a.jpg" },
        { id: "8", name: "Meat", icon: "target", color: "#E91E63", image: "/images/raw_meat_beef_pork_c_4724e26c.jpg" },
      ];

      await db.insert(categories).values(seedCategories);

      const seedProducts = [
        {
          id: "1",
          name: "Fresh Full Cream Milk",
          brand: "Ultra Milk",
          price: 18500,
          originalPrice: 22000,
          image: "/images/fresh_milk_carton_bo_dc357425.jpg",
          categoryId: "1",
          description: "Fresh pasteurized full cream milk, rich in calcium and vitamin D.",
          nutrition: { calories: "120 kcal", protein: "8g", carbs: "12g", fat: "5g" },
          inStock: true,
          stockCount: 50,
        },
        {
          id: "2",
          name: "Organic Free Range Eggs",
          brand: "Happy Farm",
          price: 32000,
          originalPrice: null,
          image: "/images/organic_eggs_in_cart_70f17317.jpg",
          categoryId: "2",
          description: "Premium organic eggs from free-range hens.",
          nutrition: { calories: "70 kcal", protein: "6g", carbs: "0.5g", fat: "5g" },
          inStock: true,
          stockCount: 30,
        },
        {
          id: "3",
          name: "Potato Chips Original",
          brand: "Chitato",
          price: 15000,
          originalPrice: null,
          image: "/images/potato_chips_snack_b_9bdc2b89.jpg",
          categoryId: "3",
          description: "Crispy potato chips with original flavor.",
          nutrition: null,
          inStock: true,
          stockCount: 100,
        },
        {
          id: "4",
          name: "Fresh Banana",
          brand: "Local Farm",
          price: 8000,
          originalPrice: null,
          image: "/images/fresh_ripe_yellow_ba_dd4d6986.jpg",
          categoryId: "4",
          description: "Sweet and ripe bananas, perfect for snacking.",
          nutrition: null,
          inStock: true,
          stockCount: 45,
        },
        {
          id: "5",
          name: "Frozen Chicken Nuggets",
          brand: "Fiesta",
          price: 45000,
          originalPrice: 52000,
          image: "/images/frozen_chicken_nugge_202dc2ea.jpg",
          categoryId: "5",
          description: "Crispy chicken nuggets, ready to fry.",
          nutrition: null,
          inStock: true,
          stockCount: 25,
        },
        {
          id: "6",
          name: "Mineral Water 1.5L",
          brand: "Aqua",
          price: 5500,
          originalPrice: null,
          image: "/images/mineral_water_bottle_9a3bc0d8.jpg",
          categoryId: "6",
          description: "Pure mineral water from natural springs.",
          nutrition: null,
          inStock: true,
          stockCount: 200,
        },
        {
          id: "7",
          name: "Fresh Spinach",
          brand: "Organic Green",
          price: 12000,
          originalPrice: null,
          image: "/images/fresh_green_spinach__093ac523.jpg",
          categoryId: "7",
          description: "Fresh organic spinach, washed and ready to cook.",
          nutrition: null,
          inStock: true,
          stockCount: 20,
        },
        {
          id: "8",
          name: "Beef Rendang Ready",
          brand: "Kokita",
          price: 35000,
          originalPrice: null,
          image: "/images/beef_rendang_indones_fb8c9020.jpg",
          categoryId: "8",
          description: "Ready-to-eat beef rendang with authentic Indonesian taste.",
          nutrition: null,
          inStock: false,
          stockCount: 0,
        },
      ];

      await db.insert(products).values(seedProducts);

      // Seed demo store in Central Jakarta
      const DEMO_STORE_ID = "demo-store";
      await db.insert(stores).values({
        id: DEMO_STORE_ID,
        name: "KilatGo Central Jakarta",
        address: "Jl. Sudirman No. 1, Central Jakarta, DKI Jakarta 10220",
        latitude: "-6.2088000",
        longitude: "106.8456000",
        codAllowed: true,
        isActive: true,
      });

      // Seed picker and driver users
      const DEMO_PICKER_ID = "demo-picker";
      const DEMO_DRIVER_ID = "demo-driver";
      
      await db.insert(users).values([
        {
          id: DEMO_PICKER_ID,
          username: "picker1",
          password: "picker123",
          phone: "+6281234567890",
          role: "picker",
        },
        {
          id: DEMO_DRIVER_ID,
          username: "driver1",
          password: "driver123",
          phone: "+6281234567891",
          role: "driver",
        },
      ]);

      // Seed store staff assignments (picker and driver)
      await db.insert(storeStaff).values([
        {
          id: "staff-picker-1",
          userId: DEMO_PICKER_ID,
          storeId: DEMO_STORE_ID,
          role: "picker",
          status: "online",
        },
        {
          id: "staff-driver-1",
          userId: DEMO_DRIVER_ID,
          storeId: DEMO_STORE_ID,
          role: "driver",
          status: "online",
        },
      ]);

      // Seed store inventory - link all products to the demo store
      const inventoryEntries = seedProducts.map((product, index) => ({
        id: `inventory-${index + 1}`,
        storeId: DEMO_STORE_ID,
        productId: product.id,
        stockCount: product.stockCount,
        isAvailable: product.inStock,
      }));
      await db.insert(storeInventory).values(inventoryEntries);

      const seedVouchers = [
        {
          id: "1",
          code: "NEWUSER50",
          discount: 50,
          discountType: "percentage",
          minOrder: 50000,
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          description: "50% off for new users",
        },
        {
          id: "2",
          code: "FREEDELIVERY",
          discount: 15000,
          discountType: "fixed",
          minOrder: 75000,
          validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          description: "Free delivery for orders above Rp75,000",
        },
      ];

      await db.insert(vouchers).values(seedVouchers);

      res.json({ message: "Data seeded successfully" });
    } catch (error) {
      console.error("Seed error:", error);
      res.status(500).json({ error: "Failed to seed data" });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}