import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  pin: text("pin").notNull(),
  role: text("role", { enum: ["admin", "staff", "accounting"] }).notNull().default("staff"),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  colorTag: text("color_tag").notNull(), // Hex code for UI
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price").notNull(), // Stored as string in JS, numeric in DB
  categoryId: integer("category_id").references(() => categories.id),
  images: jsonb("images").$type<string[]>().default([]), // Array of image URLs
  stock: integer("stock").default(0),
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const promotions = pgTable("promotions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  productId: integer("product_id").references(() => products.id),
  withdrawAmount: integer("withdraw_amount").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNo: text("order_no").notNull().unique(), // Generated unique string
  status: text("status", { enum: ["draft", "submitted", "verified", "cancelled"] }).default("draft"),
  items: jsonb("items").$type<{
    productId: number;
    name: string;
    quantity: number;
    price: number;
  }[]>().notNull(),
  total: decimal("total").notNull(),
  customerInfo: jsonb("customer_info").$type<{
    doctorName?: string;
    doctorId?: string;
    phone?: string;
    address?: string;
    offeredPrice?: string;
  }>(),
  attachments: jsonb("attachments").$type<{
    type: 'id_card' | 'payment_slip' | 'other';
    url: string;
  }[]>().default([]),
  createdBy: integer("created_by").references(() => users.id),
  verifiedBy: integer("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true }).extend({
  pin: z.string().length(4, "PIN must be exactly 4 digits").regex(/^\d+$/, "PIN must contain only digits"),
  isActive: z.boolean().optional().default(true),
});
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true }).extend({
  price: z.string().min(1, "Price is required").regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
  stock: z.number().min(0),
  categoryId: z.number().int().positive()
});
export const insertPromotionSchema = createInsertSchema(promotions).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true, 
  verifiedAt: true, 
  verifiedBy: true,
  orderNo: true // Backend generates this
});

// === TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

// API Request Types
export type CreateProductRequest = InsertProduct;
export type UpdateProductRequest = Partial<InsertProduct>;
export type CreateOrderRequest = InsertOrder;
export type UpdateOrderRequest = Partial<InsertOrder> & { status?: string }; // Allow status updates
