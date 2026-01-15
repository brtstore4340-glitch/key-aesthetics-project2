import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { firestore } from "./db";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Authentication (Passport)
  setupAuth(app);

  // Products
  app.get(api.products.list.path, async (req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  // Health check
  app.get(api.auth.health.path, async (_req, res) => {
    try {
      // Lightweight ping to Firestore to confirm connectivity
      await firestore.listCollections();
      res.json({ status: "ok" });
    } catch (err: any) {
      console.error("Health check failed", err);
      res.status(503).json({ status: "error", message: err?.message });
    }
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.post(api.products.create.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).send("Forbidden");
    }
    try {
      const input = api.products.create.input.parse(req.body);
      const product = await storage.createProduct(input);
      res.status(201).json(product);
    } catch (e) {
      if (e instanceof z.ZodError) res.status(400).json(e.errors);
      else throw e;
    }
  });

  app.put(api.products.update.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).send("Forbidden");
    }
    try {
      const input = api.products.update.input.parse(req.body);
      const product = await storage.updateProduct(Number(req.params.id), input);
      res.json(product);
    } catch (e) {
      if (e instanceof z.ZodError) res.status(400).json(e.errors);
      else throw e;
    }
  });

  app.delete(api.products.delete.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).send("Forbidden");
    }
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });
    await storage.deleteProduct(Number(req.params.id));
    res.sendStatus(200);
  });

  app.post(api.products.batchCreate.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).send("Forbidden");
    }
    try {
      const input = api.products.batchCreate.input.parse(req.body);
      const products = await Promise.all(input.map(p => storage.createProduct(p)));
      res.status(201).json(products);
    } catch (e) {
      if (e instanceof z.ZodError) res.status(400).json(e.errors);
      else throw e;
    }
  });

  // Orders
  app.get(api.orders.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    // If admin/accounting, show all. If staff, show own.
    const user = req.user as any;
    if (user.role === 'admin' || user.role === 'accounting') {
      const orders = await storage.getOrders();
      res.json(orders);
    } else {
      const orders = await storage.getOrdersByUser(user.id);
      res.json(orders);
    }
  });

  app.get(api.orders.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const order = await storage.getOrder(Number(req.params.id));
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  });

  app.post(api.orders.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const input = api.orders.create.input.parse(req.body);
      // Force createdBy to current user
      const order = await storage.createOrder({ 
        ...input, 
        createdBy: (req.user as any).id,
        items: input.items || [],
        total: input.total || "0" 
      });
      res.status(201).json(order);
    } catch (e) {
      if (e instanceof z.ZodError) res.status(400).json(e.errors);
      else throw e;
    }
  });

  app.put(api.orders.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const input = api.orders.update.input.parse(req.body);
      const order = await storage.updateOrder(Number(req.params.id), input as any);
      res.json(order);
    } catch (e) {
      if (e instanceof z.ZodError) res.status(400).json(e.errors);
      else throw e;
    }
  });

  // Users (Admin only)
  app.get(api.users.list.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).send("Forbidden");
    }
    const users = await storage.getUsers();
    res.json(users);
  });

  app.post(api.users.create.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).send("Forbidden");
    }
    try {
      const input = api.users.create.input.parse(req.body);
      const user = await storage.createUser(input);
      res.status(201).json(user);
    } catch (e) {
      if (e instanceof z.ZodError) res.status(400).json(e.errors);
      else throw e;
    }
  });

  app.post(api.users.batchCreate.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).send("Forbidden");
    }
    try {
      const input = api.users.batchCreate.input.parse(req.body);
      if (input.length === 0) {
        return res.status(400).json({ message: "Batch is empty" });
      }
      const usernames = input.map((user) => user.username.trim().toLowerCase());
      const seen = new Set<string>();
      const duplicates = usernames.filter((name) => {
        if (seen.has(name)) return true;
        seen.add(name);
        return false;
      });
      if (duplicates.length) {
        return res.status(400).json({ message: `Duplicate usernames in batch: ${[...new Set(duplicates)].join(", ")}` });
      }

      for (const username of usernames) {
        const existing = await storage.getUserByUsername(username);
        if (existing) {
          return res.status(400).json({ message: `User ${username} already exists` });
        }
      }

      const createdUsers = [];
      for (const userInput of input) {
        createdUsers.push(
          await storage.createUser({
            ...userInput,
            username: userInput.username.trim().toLowerCase(),
          }),
        );
      }
      res.status(201).json(createdUsers);
    } catch (e) {
      if (e instanceof z.ZodError) res.status(400).json(e.errors);
      else throw e;
    }
  });

  app.delete(api.users.delete.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).send("Forbidden");
    }
    await storage.deleteUser(Number(req.params.id));
    res.sendStatus(200);
  });

  // Categories
  app.get(api.categories.list.path, async (req, res) => {
    const categories = await storage.getCategories();
    res.json(categories);
  });

  app.post(api.categories.create.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).send("Forbidden");
    }
    try {
      const input = api.categories.create.input.parse(req.body);
      const category = await storage.createCategory(input);
      res.status(201).json(category);
    } catch (e) {
      if (e instanceof z.ZodError) res.status(400).json(e.errors);
      else throw e;
    }
  });

  app.put(api.categories.update.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).send("Forbidden");
    }
    try {
      const input = api.categories.update.input.parse(req.body);
      const category = await storage.updateCategory(Number(req.params.id), input);
      res.json(category);
    } catch (e) {
      if (e instanceof z.ZodError) res.status(400).json(e.errors);
      else throw e;
    }
  });

  app.delete(api.categories.delete.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).send("Forbidden");
    }
    await storage.deleteCategory(Number(req.params.id));
    res.sendStatus(200);
  });

  // Promotions (Admin only)
  app.get(api.promotions.list.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).send("Forbidden");
    }
    const promotions = await storage.getPromotions();
    res.json(promotions);
  });

  app.post(api.promotions.create.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).send("Forbidden");
    }
    try {
      const input = api.promotions.create.input.parse(req.body);
      const promotion = await storage.createPromotion(input);
      res.status(201).json(promotion);
    } catch (e) {
      if (e instanceof z.ZodError) res.status(400).json(e.errors);
      else throw e;
    }
  });

  app.delete(api.promotions.delete.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(403).send("Forbidden");
    }
    await storage.deletePromotion(Number(req.params.id));
    res.sendStatus(200);
  });

  // Seed Database (async, don't await strictly to not block startup if slow, or await if fast)
  seedDatabase().catch(err => console.error("Error seeding database:", err));

  return httpServer;
}

// Seed function
export async function seedDatabase() {
  try {
    const admin = await storage.getUserByUsername("admin");
    if (!admin) {
      console.log("Seeding database...");
      await storage.createUser({ 
        username: "admin", 
        pin: "1111", 
        role: "admin", 
        name: "Admin User" 
      });
      const seedUsers = [
        { username: "putthipat", pin: "1234", role: "staff", name: "Putthipat" },
        { username: "possatorn", pin: "1234", role: "staff", name: "Possatorn" },
        { username: "anat", pin: "1234", role: "staff", name: "Anat" },
        { username: "wattanakorn", pin: "1234", role: "staff", name: "Wattanakorn" },
        { username: "chawin", pin: "1234", role: "staff", name: "Chawin" },
        { username: "pornpailin", pin: "1234", role: "staff", name: "Pornpailin" },
        { username: "noon", pin: "8888", role: "accounting", name: "Noon" },
        { username: "aaaaaaaa", pin: "1234", role: "staff", name: "Disabled Staff", isActive: false },
      ];
      for (const user of seedUsers) {
        await storage.createUser(user);
      }
      
      // Seed Categories
      const defaultCategory = await storage.createCategory({
        name: "Skincare",
        colorTag: "#D4B16A",
      });

      // Seed Products
      await storage.createProduct({
        name: "Anti-Aging Serum",
        description: "Premium gold-infused serum",
        price: "1500.00",
        categoryId: defaultCategory.id,
        images: ["https://placehold.co/600x400/171A1D/D4B16A?text=Serum"],
        stock: 100
      });
      await storage.createProduct({
        name: "Hydrating Cream",
        description: "Deep moisture lock",
        price: "950.00",
        categoryId: defaultCategory.id,
        images: ["https://placehold.co/600x400/171A1D/D4B16A?text=Cream"],
        stock: 50
      });
    }

    // Ensure demo users exist even after initial seed
    const demoUsers = [
      { username: "putthipat", pin: "1234", role: "staff", name: "Putthipat" },
      { username: "possatorn", pin: "1234", role: "staff", name: "Possatorn" },
      { username: "anat", pin: "1234", role: "staff", name: "Anat" },
      { username: "wattanakorn", pin: "1234", role: "staff", name: "Wattanakorn" },
      { username: "chawin", pin: "1234", role: "staff", name: "Chawin" },
      { username: "pornpailin", pin: "1234", role: "staff", name: "Pornpailin" },
      { username: "noon", pin: "8888", role: "accounting", name: "Noon" },
      { username: "aaaaaaaa", pin: "1234", role: "staff", name: "Disabled Staff", isActive: false },
    ];

    for (const user of demoUsers) {
      const existing = await storage.getUserByUsername(user.username);
      if (!existing) {
        await storage.createUser(user);
      } else if (user.isActive === false && existing.isActive !== false) {
        await storage.updateUser(existing.id, { isActive: false });
      }
    }
  } catch (err) {
    console.warn("Skipping seed (Firestore unavailable):", (err as Error)?.message ?? err);
  }
}
