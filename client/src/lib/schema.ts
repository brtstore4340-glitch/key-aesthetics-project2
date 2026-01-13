import { z } from "zod";

export const roleSchema = z.enum(["admin", "staff", "accounting"]);

export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  name: z.string(),
  role: roleSchema,
});

export type User = z.infer<typeof userSchema>;

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  pin: z.string().min(4, "PIN must be 4 digits").max(4, "PIN must be 4 digits"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const insertUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  name: z.string().min(1, "Name is required"),
  role: roleSchema,
  pin: z.string().min(4, "PIN must be 4 digits").max(4, "PIN must be 4 digits"),
});

export type InsertUserInput = z.infer<typeof insertUserSchema>;

export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
});

export type Category = z.infer<typeof categorySchema>;

export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  price: z.string(),
  description: z.string().nullable().optional(),
  categoryId: z.number().nullable().optional(),
  images: z.array(z.string()),
  stock: z.number(),
  isEnabled: z.boolean(),
});

export type Product = z.infer<typeof productSchema>;

export const insertProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  price: z.string().min(1, "Price is required"),
  description: z.string().nullable().optional(),
  categoryId: z.number().int().nullable().optional(),
  images: z.array(z.string()).optional().default([]),
  stock: z.coerce.number().int().min(0),
  isEnabled: z.boolean().default(true),
});

export type CreateProductRequest = z.infer<typeof insertProductSchema>;

export const promotionSchema = z.object({
  id: z.number(),
  name: z.string(),
  productId: z.number(),
  withdrawAmount: z.number(),
});

export type Promotion = z.infer<typeof promotionSchema>;

export const insertPromotionSchema = z.object({
  name: z.string().min(1, "Promotion name is required"),
  productId: z.coerce.number().int(),
  withdrawAmount: z.coerce.number().int().min(0),
});

export type CreatePromotionRequest = z.infer<typeof insertPromotionSchema>;

export const orderItemSchema = z.object({
  productId: z.number(),
  name: z.string(),
  quantity: z.number().int().min(1),
  price: z.number(),
});

export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderSchema = z.object({
  id: z.number(),
  orderNo: z.string(),
  createdAt: z.string(),
  status: z.string(),
  items: z.array(orderItemSchema),
  total: z.string(),
  customerInfo: z
    .object({
      doctorName: z.string().optional(),
      address: z.string().optional(),
    })
    .optional(),
  attachments: z.array(z.string()).optional(),
  verifiedAt: z.string().nullable().optional(),
});

export type Order = z.infer<typeof orderSchema>;

export type CreateOrderRequest = Omit<Order, "id" | "orderNo" | "createdAt" | "verifiedAt">;
export type UpdateOrderRequest = Partial<
  Pick<Order, "status" | "items" | "total" | "customerInfo" | "attachments" | "verifiedAt">
>;
