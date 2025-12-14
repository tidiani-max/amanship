import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { eq, and, gt } from "drizzle-orm";
import { storage } from "./storage";
import { db } from "./db";
import { categories, products, vouchers, users, stores, storeStaff, storeInventory, otpCodes } from "@shared/schema";
import { findNearestAvailableStore, getStoresWithAvailability, estimateDeliveryTime } from "./storeAvailability";

export async function registerRoutes(app: Express): Promise<Server> {
  // Categories
  app.get("/api/categories", async (_req: Request, res: Response) => {
    try {
      const allCategories = await storage.getCategories();
      res.json(allCategories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get("/api/categories/:id", async (req: Request, res: Response) => {
    try {
      const category = await storage.getCategoryById(req.params.id);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch category" });
    }
  });

  // Products
  app.get("/api/products", async (req: Request, res: Response) => {
    try {
      const categoryId = req.query.categoryId as string | undefined;
      let allProducts;
      
      if (categoryId) {
        allProducts = await storage.getProductsByCategory(categoryId);
      } else {
        allProducts = await storage.getProducts();
      }
      res.json(allProducts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const product = await storage.getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  // Cart - using a demo user for now
  const DEMO_USER_ID = "demo-user";

  app.get("/api/cart", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getCartItems(DEMO_USER_ID);
      const itemsWithProducts = await Promise.all(
        items.map(async (item) => {
          const product = await storage.getProductById(item.productId);
          return { ...item, product };
        })
      );
      res.json(itemsWithProducts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cart" });
    }
  });

  app.post("/api/cart", async (req: Request, res: Response) => {
    try {
      const { productId, quantity = 1 } = req.body;
      const item = await storage.addToCart({
        userId: DEMO_USER_ID,
        productId,
        quantity,
      });
      res.json(item);
    } catch (error) {
      console.error("Add to cart error:", error);
      res.status(500).json({ error: "Failed to add to cart" });
    }
  });

  app.put("/api/cart/:id", async (req: Request, res: Response) => {
    try {
      const { quantity } = req.body;
      const item = await storage.updateCartItemQuantity(req.params.id, quantity);
      if (!item) {
        return res.status(404).json({ error: "Cart item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to update cart item" });
    }
  });

  app.delete("/api/cart/:id", async (req: Request, res: Response) => {
    try {
      await storage.removeFromCart(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove from cart" });
    }
  });

  app.delete("/api/cart", async (_req: Request, res: Response) => {
    try {
      await storage.clearCart(DEMO_USER_ID);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear cart" });
    }
  });

  // Orders
  app.get("/api/orders", async (_req: Request, res: Response) => {
    try {
      const allOrders = await storage.getOrders(DEMO_USER_ID);
      res.json(allOrders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", async (req: Request, res: Response) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", async (req: Request, res: Response) => {
    try {
      const { customerLat, customerLng, paymentMethod, items, total, deliveryFee, addressId } = req.body;
      
      // Validate customer location is provided
      const lat = parseFloat(customerLat);
      const lng = parseFloat(customerLng);
      
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ 
          error: "Customer location required",
          message: "Please enable location to place an order" 
        });
      }
      
      // Find nearest available store
      const nearestStore = await findNearestAvailableStore(lat, lng);
      
      if (!nearestStore) {
        return res.status(400).json({ 
          error: "No stores available",
          message: "Sorry, no stores are available in your area right now. Please try again later."
        });
      }
      
      // Get online picker and driver from the store
      const onlineStaff = await storage.getOnlineStaffByStore(nearestStore.id);
      
      if (onlineStaff.pickers.length === 0 || onlineStaff.drivers.length === 0) {
        return res.status(400).json({ 
          error: "No staff available",
          message: "Sorry, no pickers or drivers are available at the moment. Please try again later."
        });
      }
      
      // Assign first available picker and driver
      const assignedPicker = onlineStaff.pickers[0];
      const assignedDriver = onlineStaff.drivers[0];
      
      // Validate COD eligibility
      const requestedPaymentMethod = paymentMethod || "midtrans";
      let finalPaymentMethod = requestedPaymentMethod;
      
      if (requestedPaymentMethod === "cod" && !nearestStore.codAllowed) {
        return res.status(400).json({
          error: "COD not available",
          message: "Cash on delivery is not available at this store. Please use another payment method."
        });
      }
      
      const orderNumber = `KG-${Date.now().toString(36).toUpperCase()}`;
      const estimatedTime = estimateDeliveryTime(nearestStore.distanceKm);
      const estimatedDelivery = new Date(Date.now() + estimatedTime * 60 * 1000);
      
      // Get driver user info for riderInfo
      const driverUser = await storage.getUser(assignedDriver.userId);
      
      const order = await storage.createOrder({
        userId: DEMO_USER_ID,
        orderNumber,
        storeId: nearestStore.id,
        pickerId: assignedPicker.userId,
        driverId: assignedDriver.userId,
        items,
        total,
        deliveryFee: deliveryFee || 10000,
        addressId,
        paymentMethod: finalPaymentMethod,
        paymentStatus: finalPaymentMethod === "cod" ? "pending" : "pending",
        customerLat: String(lat),
        customerLng: String(lng),
        estimatedDelivery,
        status: "pending",
      });
      
      await storage.clearCart(DEMO_USER_ID);
      
      // Return order with additional info for the client
      res.json({
        ...order,
        store: {
          id: nearestStore.id,
          name: nearestStore.name,
        },
        riderInfo: driverUser ? {
          id: driverUser.id,
          name: driverUser.username,
          phone: driverUser.phone || "+62 812-0000-0000",
          rating: 4.8,
          vehicleNumber: "B 1234 ABC",
        } : null,
        estimatedDeliveryMinutes: estimatedTime,
      });
    } catch (error) {
      console.error("Order error:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // Store Availability
  app.get("/api/stores/available", async (req: Request, res: Response) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: "Valid lat and lng query parameters required" });
      }
      
      const nearestStore = await findNearestAvailableStore(lat, lng);
      
      if (!nearestStore) {
        return res.json({ 
          available: false, 
          message: "No stores available in your area",
          stores: await getStoresWithAvailability(lat, lng)
        });
      }
      
      const estimatedTime = estimateDeliveryTime(nearestStore.distanceKm);
      
      res.json({
        available: true,
        store: nearestStore,
        estimatedDeliveryMinutes: estimatedTime,
        codAllowed: nearestStore.codAllowed,
      });
    } catch (error) {
      console.error("Store availability error:", error);
      res.status(500).json({ error: "Failed to check store availability" });
    }
  });

  app.get("/api/stores", async (_req: Request, res: Response) => {
    try {
      const allStores = await storage.getStores();
      res.json(allStores);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stores" });
    }
  });

  app.get("/api/stores/:id/inventory", async (req: Request, res: Response) => {
    try {
      const inventory = await storage.getStoreInventoryWithProducts(req.params.id);
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch store inventory" });
    }
  });

  // Staff Status Toggle
  app.post("/api/staff/toggle-status", async (req: Request, res: Response) => {
    try {
      const { userId, status } = req.body;
      
      if (!userId || !["online", "offline"].includes(status)) {
        return res.status(400).json({ error: "Valid userId and status (online/offline) required" });
      }
      
      const staffRecord = await storage.getStoreStaffByUserId(userId);
      if (!staffRecord) {
        return res.status(404).json({ error: "Staff record not found" });
      }
      
      const updated = await storage.updateStaffStatus(staffRecord.id, status);
      res.json(updated);
    } catch (error) {
      console.error("Staff status toggle error:", error);
      res.status(500).json({ error: "Failed to update staff status" });
    }
  });

  app.get("/api/stores/:id/staff", async (req: Request, res: Response) => {
    try {
      const staff = await storage.getStoreStaff(req.params.id);
      res.json(staff);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch store staff" });
    }
  });

  // Admin Dashboard Metrics
  app.get("/api/admin/metrics", async (_req: Request, res: Response) => {
    try {
      const allStores = await storage.getStores();
      const allOrders = await storage.getAllOrders();
      
      // Get staff for each store and compile metrics - properly scoped by storeId
      const storeMetrics = await Promise.all(
        allStores.map(async (store) => {
          // Get only staff belonging to this specific store
          const storeStaffRecords = await storage.getStoreStaff(store.id);
          const onlineStaff = storeStaffRecords.filter((s) => s.status === "online");
          
          // Filter orders that belong to this specific store
          const storeOrders = allOrders.filter((o) => o.storeId === store.id);
          
          // Enrich staff with user details (phone/email)
          const enrichedStaff = await Promise.all(
            storeStaffRecords.map(async (s) => {
              const user = await storage.getUser(s.userId);
              return {
                ...s,
                user: user ? { 
                  id: user.id, 
                  username: user.username, 
                  phone: user.phone, 
                  email: user.email 
                } : null,
              };
            })
          );
          
          // Filter pickers and drivers for this store only
          const storePickers = enrichedStaff.filter((s) => s.role === "picker");
          const storeDrivers = enrichedStaff.filter((s) => s.role === "driver");
          
          return {
            id: store.id,
            name: store.name,
            address: store.address,
            latitude: store.latitude,
            longitude: store.longitude,
            isActive: store.isActive,
            codAllowed: store.codAllowed,
            totalStaff: storeStaffRecords.length,
            onlineStaff: onlineStaff.length,
            staff: enrichedStaff,
            pickers: storePickers,
            drivers: storeDrivers,
            orderCount: storeOrders.length,
            pendingOrders: storeOrders.filter((o) => o.status === "pending").length,
            activeOrders: storeOrders.filter((o) => 
              ["confirmed", "preparing", "ready", "on_the_way"].includes(o.status || "")
            ).length,
          };
        })
      );
      
      // Global order summary across all stores
      const orderSummary = {
        total: allOrders.length,
        pending: allOrders.filter((o) => o.status === "pending").length,
        confirmed: allOrders.filter((o) => o.status === "confirmed").length,
        preparing: allOrders.filter((o) => o.status === "preparing").length,
        ready: allOrders.filter((o) => o.status === "ready").length,
        onTheWay: allOrders.filter((o) => o.status === "on_the_way").length,
        delivered: allOrders.filter((o) => o.status === "delivered").length,
        cancelled: allOrders.filter((o) => o.status === "cancelled").length,
      };
      
      res.json({
        stores: storeMetrics,
        orderSummary,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Admin metrics error:", error);
      res.status(500).json({ error: "Failed to fetch admin metrics" });
    }
  });

  // ==================== ADMIN ENDPOINTS ====================
  
  // Create store (admin only - no owner required)
  app.post("/api/admin/stores", async (req: Request, res: Response) => {
    try {
      const { name, address, latitude, longitude, codAllowed } = req.body;
      
      if (!name || !address || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: "name, address, latitude, and longitude are required" });
      }
      
      const store = await storage.createStore({
        name,
        address,
        latitude: String(latitude),
        longitude: String(longitude),
        ownerId: null,
        codAllowed: codAllowed ?? true,
        isActive: true,
      });
      
      res.json(store);
    } catch (error) {
      console.error("Admin create store error:", error);
      res.status(500).json({ error: "Failed to create store" });
    }
  });
  
  // Add staff to store by phone/email (admin only)
  // This creates a placeholder user record that will be matched during login
  app.post("/api/admin/stores/:storeId/staff", async (req: Request, res: Response) => {
    try {
      const { storeId } = req.params;
      const { phone, email, role } = req.body;
      
      if (!role || !["picker", "driver"].includes(role)) {
        return res.status(400).json({ error: "role (picker/driver) required" });
      }
      
      if (!phone && !email) {
        return res.status(400).json({ error: "Either phone or email is required" });
      }
      
      const store = await storage.getStoreById(storeId);
      if (!store) {
        return res.status(404).json({ error: "Store not found" });
      }
      
      // Normalize phone number (remove spaces, ensure +62 prefix)
      let normalizedPhone = phone ? phone.replace(/\s/g, "") : null;
      if (normalizedPhone && !normalizedPhone.startsWith("+")) {
        if (normalizedPhone.startsWith("0")) {
          normalizedPhone = "+62" + normalizedPhone.slice(1);
        } else if (normalizedPhone.startsWith("62")) {
          normalizedPhone = "+" + normalizedPhone;
        } else {
          normalizedPhone = "+62" + normalizedPhone;
        }
      }
      
      // Check if a user with this phone or email already exists
      let existingUser = null;
      if (normalizedPhone) {
        existingUser = await storage.getUserByPhone(normalizedPhone);
      }
      if (!existingUser && email) {
        existingUser = await storage.getUserByEmail(email);
      }
      
      let staffUserId: string;
      
      if (existingUser) {
        // Check if already assigned to a store
        const existingAssignment = await storage.getStoreStaffByUserId(existingUser.id);
        if (existingAssignment) {
          return res.status(400).json({ error: "This user is already assigned to a store" });
        }
        staffUserId = existingUser.id;
        
        // Update user role if needed
        if (existingUser.role !== role) {
          await db.update(users).set({ role }).where(eq(users.id, existingUser.id));
        }
      } else {
        // Create a placeholder user for this staff member
        // They will complete their profile when they first login via OTP
        const placeholderUsername = `staff_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const newStaffUser = await storage.createUser({
          username: placeholderUsername,
          password: "placeholder_will_login_via_otp",
          phone: normalizedPhone,
          email: email || null,
          role,
        });
        staffUserId = newStaffUser.id;
      }
      
      // Create the store staff assignment
      const staffAssignment = await storage.createStoreStaff({
        userId: staffUserId,
        storeId,
        role,
        status: "offline",
      });
      
      const staffUser = await storage.getUser(staffUserId);
      
      res.json({ 
        ...staffAssignment, 
        user: staffUser ? { 
          id: staffUser.id, 
          username: staffUser.username, 
          phone: staffUser.phone,
          email: staffUser.email 
        } : null 
      });
    } catch (error) {
      console.error("Admin add staff error:", error);
      res.status(500).json({ error: "Failed to add staff" });
    }
  });

  // ==================== OWNER ENDPOINTS ====================
  
  // Get owner's stores
  app.get("/api/owner/stores", async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: "userId query parameter required" });
      }
      
      const user = await storage.getUser(userId as string);
      if (!user || user.role !== "owner") {
        return res.status(403).json({ error: "Only owners can access this endpoint" });
      }
      
      const ownerStores = await storage.getStoresByOwner(userId as string);
      
      // Get staff for each store
      const storesWithStaff = await Promise.all(
        ownerStores.map(async (store) => {
          const staff = await storage.getStoreStaff(store.id);
          const staffWithUsers = await Promise.all(
            staff.map(async (s) => {
              const staffUser = await storage.getUser(s.userId);
              return { ...s, user: staffUser ? { id: staffUser.id, username: staffUser.username, phone: staffUser.phone } : null };
            })
          );
          return { ...store, staff: staffWithUsers };
        })
      );
      
      res.json(storesWithStaff);
    } catch (error) {
      console.error("Owner stores error:", error);
      res.status(500).json({ error: "Failed to fetch owner stores" });
    }
  });
  
  // Create store (owner only)
  app.post("/api/owner/stores", async (req: Request, res: Response) => {
    try {
      const { userId, name, address, latitude, longitude, codAllowed } = req.body;
      
      if (!userId || !name || !address || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: "userId, name, address, latitude, and longitude are required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // If user is not owner, upgrade them to owner role
      if (user.role !== "owner" && user.role !== "admin") {
        await db.update(users).set({ role: "owner" }).where(eq(users.id, userId));
      }
      
      const store = await storage.createStore({
        name,
        address,
        latitude: String(latitude),
        longitude: String(longitude),
        ownerId: userId,
        codAllowed: codAllowed ?? true,
        isActive: true,
      });
      
      res.json(store);
    } catch (error) {
      console.error("Create store error:", error);
      res.status(500).json({ error: "Failed to create store" });
    }
  });
  
  // Add staff to store (owner only)
  app.post("/api/owner/stores/:storeId/staff", async (req: Request, res: Response) => {
    try {
      const { storeId } = req.params;
      const { userId, staffUsername, staffPassword, staffPhone, staffRole } = req.body;
      
      if (!userId || !staffRole || !["picker", "driver"].includes(staffRole)) {
        return res.status(400).json({ error: "userId and staffRole (picker/driver) required" });
      }
      
      const owner = await storage.getUser(userId);
      if (!owner || (owner.role !== "owner" && owner.role !== "admin")) {
        return res.status(403).json({ error: "Only owners can add staff" });
      }
      
      const store = await storage.getStoreById(storeId);
      if (!store) {
        return res.status(404).json({ error: "Store not found" });
      }
      
      if (store.ownerId !== userId && owner.role !== "admin") {
        return res.status(403).json({ error: "You can only add staff to your own stores" });
      }
      
      // Create staff user if username provided
      let staffUserId = req.body.staffUserId;
      
      if (!staffUserId && staffUsername && staffPassword) {
        const existingUser = await storage.getUserByUsername(staffUsername);
        if (existingUser) {
          return res.status(400).json({ error: "Username already taken" });
        }
        
        const newStaffUser = await storage.createUser({
          username: staffUsername,
          password: staffPassword,
          phone: staffPhone || null,
          role: staffRole,
        });
        staffUserId = newStaffUser.id;
      }
      
      if (!staffUserId) {
        return res.status(400).json({ error: "Either staffUserId or staffUsername/staffPassword required" });
      }
      
      // Check if staff already assigned to a store
      const existingAssignment = await storage.getStoreStaffByUserId(staffUserId);
      if (existingAssignment) {
        return res.status(400).json({ error: "This user is already assigned to a store" });
      }
      
      const staffAssignment = await storage.createStoreStaff({
        userId: staffUserId,
        storeId,
        role: staffRole,
        status: "offline",
      });
      
      const staffUser = await storage.getUser(staffUserId);
      
      res.json({ 
        ...staffAssignment, 
        user: staffUser ? { id: staffUser.id, username: staffUser.username, phone: staffUser.phone } : null 
      });
    } catch (error) {
      console.error("Add staff error:", error);
      res.status(500).json({ error: "Failed to add staff" });
    }
  });
  
  // Get store staff (owner only)
  app.get("/api/owner/stores/:storeId/staff", async (req: Request, res: Response) => {
    try {
      const { storeId } = req.params;
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({ error: "userId query parameter required" });
      }
      
      const owner = await storage.getUser(userId as string);
      if (!owner || (owner.role !== "owner" && owner.role !== "admin")) {
        return res.status(403).json({ error: "Only owners can access this endpoint" });
      }
      
      const store = await storage.getStoreById(storeId);
      if (!store) {
        return res.status(404).json({ error: "Store not found" });
      }
      
      if (store.ownerId !== userId && owner.role !== "admin") {
        return res.status(403).json({ error: "You can only view staff for your own stores" });
      }
      
      const staff = await storage.getStoreStaff(storeId);
      const staffWithUsers = await Promise.all(
        staff.map(async (s) => {
          const staffUser = await storage.getUser(s.userId);
          return { ...s, user: staffUser ? { id: staffUser.id, username: staffUser.username, phone: staffUser.phone } : null };
        })
      );
      
      res.json(staffWithUsers);
    } catch (error) {
      console.error("Get staff error:", error);
      res.status(500).json({ error: "Failed to fetch store staff" });
    }
  });

  // ==================== PICKER ENDPOINTS ====================
  
  // Get picker dashboard data
  app.get("/api/picker/dashboard", async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: "userId query parameter required" });
      }
      
      const user = await storage.getUser(userId as string);
      if (!user || user.role !== "picker") {
        return res.status(403).json({ error: "Only pickers can access this endpoint" });
      }
      
      const staffRecord = await storage.getStoreStaffByUserId(userId as string);
      if (!staffRecord) {
        return res.status(404).json({ error: "Picker not assigned to any store" });
      }
      
      const store = await storage.getStoreById(staffRecord.storeId);
      const orders = await storage.getOrdersByPicker(userId as string);
      
      // Get pending and active orders (orders that need picking)
      const pendingOrders = orders.filter(o => o.status === "pending" || o.status === "confirmed");
      const activeOrders = orders.filter(o => o.status === "picking");
      const completedOrders = orders.filter(o => ["packed", "delivering", "delivered"].includes(o.status || ""));
      
      res.json({
        user: { id: user.id, username: user.username, phone: user.phone, role: user.role },
        staffRecord,
        store,
        orders: {
          pending: pendingOrders,
          active: activeOrders,
          completed: completedOrders,
        },
      });
    } catch (error) {
      console.error("Picker dashboard error:", error);
      res.status(500).json({ error: "Failed to fetch picker dashboard" });
    }
  });
  
  // Get picker's store inventory
  app.get("/api/picker/inventory", async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: "userId query parameter required" });
      }
      
      const user = await storage.getUser(userId as string);
      if (!user || user.role !== "picker") {
        return res.status(403).json({ error: "Only pickers can access this endpoint" });
      }
      
      const staffRecord = await storage.getStoreStaffByUserId(userId as string);
      if (!staffRecord) {
        return res.status(404).json({ error: "Picker not assigned to any store" });
      }
      
      const inventory = await storage.getStoreInventoryWithProducts(staffRecord.storeId);
      res.json(inventory);
    } catch (error) {
      console.error("Picker inventory error:", error);
      res.status(500).json({ error: "Failed to fetch inventory" });
    }
  });
  
  // Update inventory item (picker)
  app.put("/api/picker/inventory/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId, stockCount, isAvailable } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "userId required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== "picker") {
        return res.status(403).json({ error: "Only pickers can update inventory" });
      }
      
      const updated = await storage.updateStoreInventory(id, stockCount ?? 0, isAvailable ?? true);
      if (!updated) {
        return res.status(404).json({ error: "Inventory item not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Update inventory error:", error);
      res.status(500).json({ error: "Failed to update inventory" });
    }
  });
  
  // Add product to store inventory (picker)
  app.post("/api/picker/inventory", async (req: Request, res: Response) => {
    try {
      const { userId, productId, stockCount } = req.body;
      
      if (!userId || !productId) {
        return res.status(400).json({ error: "userId and productId required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== "picker") {
        return res.status(403).json({ error: "Only pickers can manage inventory" });
      }
      
      const staffRecord = await storage.getStoreStaffByUserId(userId);
      if (!staffRecord) {
        return res.status(404).json({ error: "Picker not assigned to any store" });
      }
      
      const inventory = await storage.createStoreInventory({
        storeId: staffRecord.storeId,
        productId,
        stockCount: stockCount ?? 10,
        isAvailable: true,
      });
      
      res.json(inventory);
    } catch (error) {
      console.error("Add inventory error:", error);
      res.status(500).json({ error: "Failed to add to inventory" });
    }
  });
  
  // Get picker's assigned orders
  app.get("/api/picker/orders", async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: "userId query parameter required" });
      }
      
      const user = await storage.getUser(userId as string);
      if (!user || user.role !== "picker") {
        return res.status(403).json({ error: "Only pickers can access this endpoint" });
      }
      
      const orders = await storage.getOrdersByPicker(userId as string);
      res.json(orders);
    } catch (error) {
      console.error("Picker orders error:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });
  
  // Update order status (picker - picking, packed)
  app.put("/api/picker/orders/:orderId/status", async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const { userId, status } = req.body;
      
      if (!userId || !status) {
        return res.status(400).json({ error: "userId and status required" });
      }
      
      if (!["picking", "packed"].includes(status)) {
        return res.status(400).json({ error: "Pickers can only set status to picking or packed" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== "picker") {
        return res.status(403).json({ error: "Only pickers can update order status" });
      }
      
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      if (order.pickerId !== userId) {
        return res.status(403).json({ error: "You can only update orders assigned to you" });
      }
      
      const timestamp = status === "picking" ? "pickedAt" : "packedAt";
      const updated = await storage.updateOrderWithTimestamp(orderId, status, timestamp);
      
      res.json(updated);
    } catch (error) {
      console.error("Picker order status error:", error);
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  // ==================== DRIVER ENDPOINTS ====================
  
  // Get driver dashboard data
  app.get("/api/driver/dashboard", async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: "userId query parameter required" });
      }
      
      const user = await storage.getUser(userId as string);
      if (!user || user.role !== "driver") {
        return res.status(403).json({ error: "Only drivers can access this endpoint" });
      }
      
      const staffRecord = await storage.getStoreStaffByUserId(userId as string);
      if (!staffRecord) {
        return res.status(404).json({ error: "Driver not assigned to any store" });
      }
      
      const store = await storage.getStoreById(staffRecord.storeId);
      const orders = await storage.getOrdersByDriver(userId as string);
      
      // Filter orders by status
      const readyOrders = orders.filter(o => o.status === "packed");
      const activeOrders = orders.filter(o => o.status === "delivering");
      const completedOrders = orders.filter(o => o.status === "delivered");
      
      res.json({
        user: { id: user.id, username: user.username, phone: user.phone, role: user.role },
        staffRecord,
        store,
        orders: {
          ready: readyOrders,
          active: activeOrders,
          completed: completedOrders,
        },
      });
    } catch (error) {
      console.error("Driver dashboard error:", error);
      res.status(500).json({ error: "Failed to fetch driver dashboard" });
    }
  });
  
  // Get driver's assigned orders
  app.get("/api/driver/orders", async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: "userId query parameter required" });
      }
      
      const user = await storage.getUser(userId as string);
      if (!user || user.role !== "driver") {
        return res.status(403).json({ error: "Only drivers can access this endpoint" });
      }
      
      const orders = await storage.getOrdersByDriver(userId as string);
      res.json(orders);
    } catch (error) {
      console.error("Driver orders error:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });
  
  // Update order status (driver - delivering, delivered)
  app.put("/api/driver/orders/:orderId/status", async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const { userId, status } = req.body;
      
      if (!userId || !status) {
        return res.status(400).json({ error: "userId and status required" });
      }
      
      if (!["delivering", "delivered"].includes(status)) {
        return res.status(400).json({ error: "Drivers can only set status to delivering or delivered" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== "driver") {
        return res.status(403).json({ error: "Only drivers can update delivery status" });
      }
      
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      if (order.driverId !== userId) {
        return res.status(403).json({ error: "You can only update orders assigned to you" });
      }
      
      if (status === "delivered") {
        const updated = await storage.updateOrderWithTimestamp(orderId, status, "deliveredAt");
        res.json(updated);
      } else {
        const updated = await storage.updateOrderStatus(orderId, status);
        res.json(updated);
      }
    } catch (error) {
      console.error("Driver order status error:", error);
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  // Vouchers
  app.get("/api/vouchers", async (_req: Request, res: Response) => {
    try {
      const allVouchers = await storage.getVouchers();
      res.json(allVouchers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vouchers" });
    }
  });

  app.get("/api/vouchers/:code", async (req: Request, res: Response) => {
    try {
      const voucher = await storage.getVoucherByCode(req.params.code);
      if (!voucher) {
        return res.status(404).json({ error: "Voucher not found" });
      }
      res.json(voucher);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch voucher" });
    }
  });

  // Authentication endpoints
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, password, phone } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      
      if (username.length < 3) {
        return res.status(400).json({ error: "Username must be at least 3 characters" });
      }
      
      if (password.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters" });
      }
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }
      
      const newUser = await storage.createUser({
        username,
        password,
        phone: phone || null,
        role: "customer",
      });
      
      res.json({
        user: {
          id: newUser.id,
          username: newUser.username,
          phone: newUser.phone,
          role: newUser.role,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      
      if (user.password !== password) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          phone: user.phone,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.put("/api/auth/profile", async (req: Request, res: Response) => {
    try {
      const { userId, username, phone } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (username && username !== user.username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser) {
          return res.status(400).json({ error: "Username already taken" });
        }
      }
      
      const updates: { username?: string; phone?: string | null } = {};
      if (username) updates.username = username;
      if (phone !== undefined) updates.phone = phone;
      
      const updatedUser = await db.update(users)
        .set(updates)
        .where(eq(users.id, userId))
        .returning();
      
      if (updatedUser.length === 0) {
        return res.status(404).json({ error: "Failed to update user" });
      }
      
      res.json({
        user: {
          id: updatedUser[0].id,
          username: updatedUser[0].username,
          phone: updatedUser[0].phone,
          role: updatedUser[0].role,
        },
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Profile update failed" });
    }
  });

  // OTP Authentication
  // NOTE: This is a demo implementation. In production:
  // - Integrate Twilio/other SMS provider to send OTP via SMS
  // - Remove the code from the response
  // - Add rate limiting to prevent abuse
  // - Use secure random number generation
  app.post("/api/auth/otp/send", async (req: Request, res: Response) => {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ error: "Phone number is required" });
      }
      
      // Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      
      // Store OTP in database
      await db.insert(otpCodes).values({
        phone,
        code,
        expiresAt,
      });
      
      // DEMO ONLY: Return code in response for testing
      // In production, send SMS via Twilio and only return { success: true }
      res.json({ success: true, code, message: "OTP sent (demo mode - code shown for testing)" });
    } catch (error) {
      console.error("OTP send error:", error);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  app.post("/api/auth/otp/verify", async (req: Request, res: Response) => {
    try {
      const { phone, code } = req.body;
      if (!phone || !code) {
        return res.status(400).json({ error: "Phone and code are required" });
      }
      
      // Find valid OTP
      const validOtp = await db.select().from(otpCodes)
        .where(and(
          eq(otpCodes.phone, phone),
          eq(otpCodes.code, code),
          eq(otpCodes.verified, false),
          gt(otpCodes.expiresAt, new Date())
        ))
        .limit(1);
      
      if (validOtp.length === 0) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }
      
      // Mark OTP as verified
      await db.update(otpCodes)
        .set({ verified: true })
        .where(eq(otpCodes.id, validOtp[0].id));
      
      // Find or create user
      let user = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
      
      if (user.length === 0) {
        const newUser = await db.insert(users).values({
          username: `user_${phone.slice(-4)}`,
          password: Math.random().toString(36).slice(-8),
          phone,
          role: "customer",
        }).returning();
        user = newUser;
      }
      
      // Check if user has a staff assignment (picker/driver)
      const staffRecord = await storage.getStoreStaffByUserId(user[0].id);
      let staffInfo = null;
      
      if (staffRecord) {
        const store = await storage.getStoreById(staffRecord.storeId);
        staffInfo = {
          storeId: staffRecord.storeId,
          storeName: store?.name || "Unknown Store",
          role: staffRecord.role,
          status: staffRecord.status,
        };
        
        // If user's role doesn't match their staff assignment, update it
        if (user[0].role !== staffRecord.role && user[0].role !== "admin") {
          await db.update(users).set({ role: staffRecord.role }).where(eq(users.id, user[0].id));
          user[0] = { ...user[0], role: staffRecord.role };
        }
      }
      
      res.json({
        user: {
          id: user[0].id,
          username: user[0].username,
          phone: user[0].phone,
          email: user[0].email,
          role: user[0].role,
        },
        staffInfo,
      });
    } catch (error) {
      console.error("OTP verify error:", error);
      res.status(500).json({ error: "Failed to verify OTP" });
    }
  });

  // Apple Sign-In
  // NOTE: This is a demo implementation. In production:
  // - Validate the identity token using Apple's public keys
  // - Verify the token signature and claims
  // - Check token expiration and audience
  app.post("/api/auth/apple", async (req: Request, res: Response) => {
    try {
      const { appleId, email, fullName } = req.body;
      if (!appleId) {
        return res.status(400).json({ error: "Apple ID is required" });
      }
      
      // In production, validate the identity token here
      // using Apple's public keys (https://appleid.apple.com/auth/keys)
      
      // Find or create user - also check by email if Apple user not found
      let user = await db.select().from(users).where(eq(users.appleId, appleId)).limit(1);
      
      if (user.length === 0 && email) {
        // Check if user exists with same email (may have been created as staff placeholder)
        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existingUser.length > 0) {
          // Link Apple account to existing user
          await db.update(users).set({ appleId }).where(eq(users.id, existingUser[0].id));
          user = await db.select().from(users).where(eq(users.id, existingUser[0].id)).limit(1);
        }
      }
      
      if (user.length === 0) {
        const username = fullName || email?.split("@")[0] || `apple_${appleId.slice(-6)}`;
        const newUser = await db.insert(users).values({
          username,
          password: Math.random().toString(36).slice(-8),
          appleId,
          email: email || null,
          role: "customer",
        }).returning();
        user = newUser;
      }
      
      // Check if user has a staff assignment (picker/driver)
      const staffRecord = await storage.getStoreStaffByUserId(user[0].id);
      let staffInfo = null;
      
      if (staffRecord) {
        const store = await storage.getStoreById(staffRecord.storeId);
        staffInfo = {
          storeId: staffRecord.storeId,
          storeName: store?.name || "Unknown Store",
          role: staffRecord.role,
          status: staffRecord.status,
        };
        
        // If user's role doesn't match their staff assignment, update it
        if (user[0].role !== staffRecord.role && user[0].role !== "admin") {
          await db.update(users).set({ role: staffRecord.role }).where(eq(users.id, user[0].id));
          user[0] = { ...user[0], role: staffRecord.role };
        }
      }
      
      res.json({
        user: {
          id: user[0].id,
          username: user[0].username,
          phone: user[0].phone,
          email: user[0].email,
          role: user[0].role,
        },
        staffInfo,
      });
    } catch (error) {
      console.error("Apple auth error:", error);
      res.status(500).json({ error: "Apple authentication failed" });
    }
  });

  // Google Sign-In
  // NOTE: This is a demo implementation. In production:
  // - Validate the Google ID token using Google's tokeninfo endpoint
  // - Verify the token audience matches your client ID
  app.post("/api/auth/google", async (req: Request, res: Response) => {
    try {
      const { googleId, email, name } = req.body;
      if (!googleId) {
        return res.status(400).json({ error: "Google ID is required" });
      }
      
      // In production, validate the ID token here
      // using Google's tokeninfo endpoint or google-auth-library
      
      // Find or create user
      let user = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
      
      if (user.length === 0) {
        // Check if user exists with same email
        if (email) {
          const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
          if (existingUser.length > 0) {
            // Link Google account to existing user
            await db.update(users)
              .set({ googleId })
              .where(eq(users.id, existingUser[0].id));
            user = await db.select().from(users).where(eq(users.id, existingUser[0].id)).limit(1);
          }
        }
        
        // Create new user if not found
        if (user.length === 0) {
          const username = name || email?.split("@")[0] || `google_${googleId.slice(-6)}`;
          const newUser = await db.insert(users).values({
            username,
            password: Math.random().toString(36).slice(-8),
            googleId,
            email: email || null,
            role: "customer",
          }).returning();
          user = newUser;
        }
      }
      
      res.json({
        user: {
          id: user[0].id,
          username: user[0].username,
          phone: user[0].phone,
          email: user[0].email,
          role: user[0].role,
        },
      });
    } catch (error) {
      console.error("Google auth error:", error);
      res.status(500).json({ error: "Google authentication failed" });
    }
  });

  // Seed data endpoint (for initial data population)
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
