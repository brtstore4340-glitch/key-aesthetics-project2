import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebaseClient";
import type { UserProfile } from "@/lib/services/authService";

export type Category = {
  id: string;
  name: string;
  colorTag: string;
};

export type Product = {
  id: string;
  name: string;
  description?: string | null;
  price: string;
  categoryId?: string | null;
  images?: string[];
  stock?: number;
  isEnabled?: boolean;
  createdAt?: Date;
};

export type Promotion = {
  id: string;
  name: string;
  productId?: string | null;
  withdrawAmount: number;
  isActive?: boolean;
  createdAt?: Date;
};

export type OrderItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
};

export type OrderAttachment = {
  type: "id_card" | "payment_slip" | "other";
  url: string;
};

export type Order = {
  id: string;
  orderNo: string;
  status?: string;
  items: OrderItem[];
  total: number;
  customerInfo?: {
    doctorName?: string;
    doctorId?: string;
    address?: string;
  };
  attachments?: OrderAttachment[];
  createdBy?: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

export type CreateProductInput = Omit<Product, "id" | "createdAt">;
export type CreatePromotionInput = Omit<Promotion, "id" | "createdAt">;
export type CreateOrderInput = Omit<Order, "id" | "orderNo" | "createdAt" | "updatedAt" | "verifiedAt">;

const toDate = (value?: Timestamp | Date | null) => {
  if (!value) return undefined;
  if (value instanceof Timestamp) return value.toDate();
  return value;
};

const mapProduct = (snap: { id: string; data: () => any }): Product => {
  const data = snap.data();
  return {
    id: snap.id,
    ...data,
    createdAt: toDate(data.createdAt),
  } as Product;
};

const mapPromotion = (snap: { id: string; data: () => any }): Promotion => {
  const data = snap.data();
  return {
    id: snap.id,
    ...data,
    createdAt: toDate(data.createdAt),
  } as Promotion;
};

const mapOrder = (snap: { id: string; data: () => any }): Order => {
  const data = snap.data();
  return {
    id: snap.id,
    ...data,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    verifiedAt: toDate(data.verifiedAt),
  } as Order;
};

const generateOrderNo = () => `ORD-${Date.now().toString(36).toUpperCase()}`;

export const dbService = {
  async listCategories() {
    const snap = await getDocs(collection(db, "categories"));
    return snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<Category, "id">) }));
  },

  async listProducts() {
    const productsQuery = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const snap = await getDocs(productsQuery);
    return snap.docs.map((docSnap) => mapProduct({ id: docSnap.id, data: () => docSnap.data() }));
  },

  async getProduct(id: string) {
    const snap = await getDoc(doc(db, "products", id));
    if (!snap.exists()) return null;
    return mapProduct({ id: snap.id, data: () => snap.data() });
  },

  async createProduct(data: CreateProductInput) {
    const docRef = await addDoc(collection(db, "products"), {
      ...data,
      createdAt: serverTimestamp(),
    });
    const snap = await getDoc(docRef);
    return mapProduct({ id: snap.id, data: () => snap.data() });
  },

  async batchCreateProducts(products: CreateProductInput[]) {
    const batch = writeBatch(db);
    const productsCollection = collection(db, "products");
    products.forEach((product) => {
      const newDoc = doc(productsCollection);
      batch.set(newDoc, { ...product, createdAt: serverTimestamp() });
    });
    await batch.commit();
  },

  async listPromotions() {
    const snap = await getDocs(collection(db, "promotions"));
    return snap.docs.map((docSnap) => mapPromotion({ id: docSnap.id, data: () => docSnap.data() }));
  },

  async createPromotion(data: CreatePromotionInput) {
    const callable = httpsCallable(functions, "createPromotion");
    const result = await callable(data);
    return result.data as Promotion;
  },

  async deletePromotion(id: string) {
    const callable = httpsCallable(functions, "deletePromotion");
    await callable({ id });
  },

  async listOrders({ status, role, userId }: { status?: string; role?: string; userId?: string }) {
    const constraints = [orderBy("createdAt", "desc")];
    if (status) {
      constraints.push(where("status", "==", status));
    }
    if (role !== "admin" && role !== "accounting" && userId) {
      constraints.push(where("createdBy", "==", userId));
    }

    const ordersQuery = query(collection(db, "orders"), ...constraints);
    const snap = await getDocs(ordersQuery);
    return snap.docs.map((docSnap) => mapOrder({ id: docSnap.id, data: () => docSnap.data() }));
  },

  async getOrder(id: string) {
    const snap = await getDoc(doc(db, "orders", id));
    if (!snap.exists()) return null;
    return mapOrder({ id: snap.id, data: () => snap.data() });
  },

  async createOrder(data: CreateOrderInput) {
    const orderNo = generateOrderNo();
    const docRef = await addDoc(collection(db, "orders"), {
      ...data,
      orderNo,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const snap = await getDoc(docRef);
    return mapOrder({ id: snap.id, data: () => snap.data() });
  },

  async updateOrderStatus({ id, status, verifiedBy }: { id: string; status: string; verifiedBy?: string }) {
    const callable = httpsCallable(functions, "updateOrderStatus");
    const result = await callable({ id, status, verifiedBy });
    return result.data as Order;
  },

  async listUsers() {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<UserProfile, "id">) }));
  },

  async createUser(data: { username: string; name: string; role: string; pin: string }) {
    const callable = httpsCallable(functions, "createUser");
    const result = await callable(data);
    return result.data as UserProfile;
  },

  async deleteUser(id: string) {
    const callable = httpsCallable(functions, "deleteUser");
    await callable({ id });
  },

  async updateUserProfile(id: string, data: Partial<UserProfile>) {
    await updateDoc(doc(db, "users", id), data);
  },

  async deleteProduct(id: string) {
    await deleteDoc(doc(db, "products", id));
  },
};
