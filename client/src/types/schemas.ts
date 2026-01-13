import { z } from "zod";

export const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  price: z
    .string()
    .min(1, "Price is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  images: z.array(z.string()).optional(),
  stock: z.number().min(0, "Stock must be 0 or greater"),
  isEnabled: z.boolean().default(true),
});

export const promotionFormSchema = z.object({
  name: z.string().min(1, "Promotion name is required"),
  productId: z.string().min(1, "Product is required"),
  withdrawAmount: z.number().min(1, "Withdraw amount is required"),
});

export const userFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["admin", "staff", "accounting"]),
  pin: z
    .string()
    .length(4, "PIN must be 4 digits")
    .regex(/^\d+$/, "PIN must contain only digits"),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
export type PromotionFormValues = z.infer<typeof promotionFormSchema>;
export type UserFormValues = z.infer<typeof userFormSchema>;
