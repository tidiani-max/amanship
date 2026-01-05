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
    const allowedOrigins = ["http://localhost:8081", "http://192.168.10.210:8081"];
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
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const [staff] = await db
      .select()
      .from(storeStaff)
      .where(eq(storeStaff.userId, userId as string));

    if (!staff) {
      return res.json({
        store: null,
        orders: { pending: [], active: [], completed: [] },
      });
    }

    const storeOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.storeId, staff.storeId));

    res.json({
      user: { id: userId, role: "picker" },
      store: staff.storeId,
      orders: {
        pending: storeOrders.filter(o => o.status === "pending"),
        active: storeOrders.filter(o => o.status === "picking"),
        completed: storeOrders.filter(o =>
          ["packed", "delivering", "delivered"].includes(o.status || "")
        ),
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
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    // 1. Check if driver already has an active delivery
    const activeOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.driverId, userId as string),
          eq(orders.status, "delivering")
        )
      );

    // 2. If active delivery exists → lock driver to that order only
    if (activeOrders.length > 0) {
      return res.json({
        user: { id: userId, role: "driver" },
        staffRecord: { status: "online" },
        orders: {
          ready: [],
          active: activeOrders,
          completed: []
        }
      });
    }

    // 3. Otherwise show only unassigned packed orders
    const readyOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, "packed"),
          isNull(orders.driverId)
        )
      );

    const completedOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.driverId, userId as string),
          eq(orders.status, "delivered")
        )
      );

    res.json({
      user: { id: userId, role: "driver" },
      staffRecord: { status: "online" },
      orders: {
        ready: readyOrders,
        active: [],
        completed: completedOrders
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

    // Query DB
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
        si.stock_count > 0
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

    console.log("✅ home products found:", result.rows.length);

    // Debug all product images
    result.rows.forEach((row: HomeProductRow) => {
      console.log("🖼 product image from DB:", row.image);
    });

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
    const {
      userId,
      addressId,
      total,
      items,
      customerLat,
      customerLng,
    } = req.body;

    if (!userId || !items?.length || !customerLat || !customerLng) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1️⃣ Find nearest available store
    const nearestStore = await findNearestAvailableStore(
      Number(customerLat),
      Number(customerLng)
    );

    if (!nearestStore) {
      return res.status(400).json({ error: "No store available nearby" });
    }

    const storeId = nearestStore.id;

    // 2️⃣ Create order (items REQUIRED by schema)
    const [newOrder] = await db
      .insert(orders)
      .values({
        userId,
        storeId,
        addressId,
        total: Number(total),
        status: "pending",
        orderNumber: `ORD-${Math.random()
          .toString(36)
          .toUpperCase()
          .substring(2, 9)}`,
        items, // ✅ REQUIRED
        customerLat: String(customerLat),
        customerLng: String(customerLng),
      })
      .returning();

    // 3️⃣ Insert order items (normalized table)
    await db.insert(orderItems).values(
      items.map((item: any) => ({
        orderId: newOrder.id,
        productId: item.productId,
        quantity: item.quantity,
        priceAtEntry: String(item.price),
      }))
    );

    // 4️⃣ Notify store staff (pickers + drivers)
    const staff = await db
      .select()
      .from(storeStaff)
      .where(eq(storeStaff.storeId, storeId));

    for (const s of staff) {
      await sendPushNotification(
        s.userId,
        "📦 New Order",
        `Order ${newOrder.orderNumber} is ready`,
        { orderId: newOrder.id }
      );
    }

    // 5️⃣ Clear cart
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

app.put("/api/driver/orders/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, userId } = req.body;

    // Driver tries to pick order
    if (status === "delivering") {
      const [updated] = await db
        .update(orders)
        .set({
          status: "delivering",
          driverId: userId
        })
        .where(
          and(
            eq(orders.id, id),
            isNull(orders.driverId) // 🔒 HARD LOCK
          )
        )
        .returning();

      if (!updated) {
        return res.status(409).json({
          error: "Order already taken by another driver"
        });
      }

      return res.json(updated);
    }

    // Completing delivery
    const [completed] = await db
      .update(orders)
      .set({ status })
      .where(
        and(
          eq(orders.id, id),
          eq(orders.driverId, userId)
        )
      )
      .returning();

    res.json(completed);
  } catch (error) {
    console.error("❌ Driver order update error:", error);
    res.status(500).json({ error: "Update failed" });
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
      if (req.file) content = `http://192.168.10.210:5000/uploads/chat/${req.file.filename}`;
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

console.log("👑 Registering admin routes...");

// ============================================
// ADMIN METRICS ENDPOINT
// ============================================
app.get("/api/admin/metrics", async (req, res) => {
  try {
    const stores = await storage.getStores();
    const allOrders = await storage.getAllOrders();
    
    const metrics = await Promise.all(stores.map(async (store) => {
      const staff = await storage.getStoreStaff(store.id);
      const storeOrders = allOrders.filter((o) => o.storeId === store.id);
      
      const enriched = await Promise.all(staff.map(async (s) => {
        const u = await storage.getUser(s.userId);
        return { 
          ...s, 
          user: u ? { 
            id: u.id, 
            username: u.username, 
            phone: u.phone, 
            email: u.email,
            name: u.name 
          } : null 
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
      };
    }));
    
    res.json({
      stores: metrics,
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
    
    // Check if store has active orders
    const orders = await storage.getOrdersByStore(id);
    const activeOrders = orders.filter(o => 
      !["delivered", "cancelled"].includes(o.status || "")
    );
    
    if (activeOrders.length > 0) {
      return res.status(400).json({ 
        error: `Cannot delete store with ${activeOrders.length} active order(s)` 
      });
    }

    const updated = await storage.updateStore(id, { isActive: false });
    
    if (!updated) {
      return res.status(404).json({ error: "Store not found" });
    }

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

    if (!["online", "offline"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'online' or 'offline'" });
    }

    const updated = await storage.updateStaffStatus(userId, status);

    if (!updated) {
      return res.status(404).json({ error: "Staff member not found" });
    }

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

    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const geoResponse = await fetch(geocodeUrl, {
      headers: { 'User-Agent': 'KilatGo-App' }
    });
    const geoData = await geoResponse.json();

    if (!geoData || geoData.length === 0) {
      return res.status(404).json({ error: "Location not found" });
    }

    res.json({
      latitude: parseFloat(geoData[0].lat),
      longitude: parseFloat(geoData[0].lon),
      displayName: geoData[0].display_name,
    });
  } catch (error) {
    console.error("❌ Geocoding error:", error);
    res.status(500).json({ error: "Failed to geocode address" });
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
  
  const httpServer = createServer(app);
  return httpServer;
}