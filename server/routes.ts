import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

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

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.post(api.products.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
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
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const input = api.products.update.input.parse(req.body);
      const product = await storage.updateProduct(Number(req.params.id), input);
      res.json(product);
    } catch (e) {
      if (e instanceof z.ZodError) res.status(400).json(e.errors);
      else throw e;
    }
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
  const admin = await storage.getUserByUsername("admin");
  if (!admin) {
    console.log("Seeding database...");
    await storage.createUser({ 
      username: "admin", 
      pin: "1111", 
      role: "admin", 
      name: "Admin User" 
    });
    await storage.createUser({ 
      username: "staff", 
      pin: "2222", 
      role: "staff", 
      name: "Staff User" 
    });
    await storage.createUser({ 
      username: "account", 
      pin: "3333", 
      role: "accounting", 
      name: "Accounting User" 
    });
    
    // Seed Products
    await storage.createProduct({
      name: "Anti-Aging Serum",
      description: "Premium gold-infused serum",
      price: "1500.00",
      categoryId: 1,
      images: ["https://placehold.co/600x400/171A1D/D4B16A?text=Serum"],
      stock: 100
    });
    await storage.createProduct({
      name: "Hydrating Cream",
      description: "Deep moisture lock",
      price: "950.00",
      categoryId: 1,
      images: ["https://placehold.co/600x400/171A1D/D4B16A?text=Cream"],
      stock: 50
    });
  }
}
