import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { db } from "./db";
import { categories, products, vouchers, users } from "@shared/schema";

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
        return res.json({ message: "Data already seeded" });
      }

      await db.insert(users).values({
        id: DEMO_USER_ID,
        username: "demo",
        password: "demo",
        phone: "+62123456789",
      });

      const seedCategories = [
        { id: "1", name: "Milk", icon: "droplet", color: "#4A90E2" },
        { id: "2", name: "Eggs", icon: "circle", color: "#FF9800" },
        { id: "3", name: "Snacks", icon: "box", color: "#9C27B0" },
        { id: "4", name: "Fruits", icon: "sun", color: "#4CAF50" },
        { id: "5", name: "Frozen", icon: "thermometer", color: "#00BCD4" },
        { id: "6", name: "Drinks", icon: "coffee", color: "#F44336" },
        { id: "7", name: "Veggies", icon: "feather", color: "#8BC34A" },
        { id: "8", name: "Meat", icon: "target", color: "#E91E63" },
      ];

      await db.insert(categories).values(seedCategories);

      const seedProducts = [
        {
          id: "1",
          name: "Fresh Full Cream Milk",
          brand: "Ultra Milk",
          price: 18500,
          originalPrice: 22000,
          image: "",
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
          image: "",
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
          image: "",
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
          image: "",
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
          image: "",
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
          image: "",
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
          image: "",
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
          image: "",
          categoryId: "8",
          description: "Ready-to-eat beef rendang with authentic Indonesian taste.",
          nutrition: null,
          inStock: false,
          stockCount: 0,
        },
      ];

      await db.insert(products).values(seedProducts);

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
