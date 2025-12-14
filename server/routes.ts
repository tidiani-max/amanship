import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { db } from "./db";
import { categories, products, vouchers, users, stores, storeStaff, storeInventory } from "@shared/schema";

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
      const orderNumber = `KG-${Date.now().toString(36).toUpperCase()}`;
      const estimatedDelivery = new Date(Date.now() + 15 * 60 * 1000);
      
      const order = await storage.createOrder({
        ...req.body,
        userId: DEMO_USER_ID,
        orderNumber,
        estimatedDelivery,
        riderInfo: {
          id: "1",
          name: "Budi Santoso",
          phone: "+62 812-3456-7890",
          rating: 4.8,
          vehicleNumber: "B 1234 ABC",
        },
      });
      
      await storage.clearCart(DEMO_USER_ID);
      res.json(order);
    } catch (error) {
      console.error("Order error:", error);
      res.status(500).json({ error: "Failed to create order" });
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
