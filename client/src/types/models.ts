export type UserRole = "admin" | "staff" | "accounting";

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Category {
  id: string;
  name: string;
  colorTag: string;
  createdAt?: Date;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  categoryId?: string | null;
  images: string[];
  stock: number;
  isEnabled: boolean;
  createdAt?: Date;
}

export interface ProductInput {
  name: string;
  price: number;
  description?: string | null;
  categoryId?: string | null;
  images?: string[];
  stock?: number;
  isEnabled?: boolean;
}

export interface Promotion {
  id: string;
  name: string;
  productId: string;
  withdrawAmount: number;
  isActive: boolean;
  createdAt?: Date;
}

export interface PromotionInput {
  name: string;
  productId: string;
  withdrawAmount: number;
  isActive?: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface OrderAttachment {
  type: "id_card" | "payment_slip" | "other";
  url: string;
}

export type OrderStatus = "draft" | "submitted" | "verified" | "cancelled";

export interface Order {
  id: string;
  orderNo: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  customerInfo?: {
    doctorName?: string;
    doctorId?: string;
    address?: string;
  };
  attachments: OrderAttachment[];
  createdBy?: string;
  verifiedBy?: string;
  verifiedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrderInput {
  items: OrderItem[];
  total: number;
  status?: OrderStatus;
  customerInfo?: {
    doctorName?: string;
    doctorId?: string;
    address?: string;
  };
  attachments?: OrderAttachment[];
}

export interface CreateUserInput {
  username: string;
  name: string;
  role: UserRole;
  pin: string;
}
