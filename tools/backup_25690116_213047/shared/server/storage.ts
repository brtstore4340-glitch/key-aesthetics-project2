import type {
  Category,
  InsertCategory,
  InsertOrder,
  InsertProduct,
  InsertPromotion,
  InsertUser,
  Order,
  Product,
  Promotion,
  User,
} from "@shared/schema";
import session from "express-session";
import { type CollectionReference, Timestamp } from "firebase-admin/firestore";
import { firestore } from "./db";

export interface IStorage {
  // Auth & Users
  getUser(id: number): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;

  // Orders
  getOrders(): Promise<Order[]>; // Can add filtering later
  getOrdersByUser(userId: number): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: any): Promise<Order>;

  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  // Promotions
  getPromotions(): Promise<Promotion[]>;
  createPromotion(promotion: InsertPromotion): Promise<Promotion>;
  deletePromotion(id: number): Promise<void>;

  // Session Store
  sessionStore: session.Store;
}

type EntityWithDates = User | Product | Order | Category | Promotion;

function deserializeDates<T extends EntityWithDates>(
  data: FirebaseFirestore.DocumentData | undefined,
): T | undefined {
  if (!data) return undefined;
  const converted: Record<string, unknown> = { ...data };
  ["createdAt", "updatedAt", "verifiedAt"].forEach((key) => {
    const value = converted[key];
    if (value && typeof (value as any).toDate === "function") {
      converted[key] = (value as any).toDate();
    }
  });
  return converted as T;
}

async function getNextId(scope: string): Promise<number> {
  const counters = firestore.collection("meta").doc("counters");
  return await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(counters);
    const data = snap.data() || {};
    const current = data[scope] ?? 0;
    const next = Number(current) + 1;
    tx.set(counters, { [scope]: next }, { merge: true });
    return next;
  });
}

class FirestoreSessionStore extends session.Store {
  private collection: CollectionReference;

  constructor() {
    super();
    this.collection = firestore.collection("sessions");
  }

  async get(sid: string, callback: (err?: any, session?: session.SessionData | null) => void) {
    try {
      const snap = await this.collection.doc(sid).get();
      if (!snap.exists) return callback(undefined, null);
      const data = snap.data();
      const expiresAt = data?.expiresAt as Timestamp | undefined;
      if (expiresAt && expiresAt.toDate().getTime() < Date.now()) {
        await snap.ref.delete();
        return callback(undefined, null);
      }
      return callback(undefined, data?.session as session.SessionData);
    } catch (err) {
      return callback(err);
    }
  }

  async set(sid: string, sess: session.SessionData, callback?: (err?: any) => void) {
    try {
      const maxAge = sess.cookie?.maxAge ?? 24 * 60 * 60 * 1000; // default 1 day
      const expiresAt = Timestamp.fromMillis(Date.now() + Number(maxAge));
      await this.collection.doc(sid).set(
        {
          session: sess,
          expiresAt,
        },
        { merge: true },
      );
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  async destroy(sid: string, callback?: (err?: any) => void) {
    try {
      await this.collection.doc(sid).delete();
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }
}

class FirestoreStorage implements IStorage {
  sessionStore: session.Store;

  private users = firestore.collection("users");
  private products = firestore.collection("products");
  private orders = firestore.collection("orders");
  private categories = firestore.collection("categories");
  private promotions = firestore.collection("promotions");

  constructor() {
    this.sessionStore = new FirestoreSessionStore();
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const snap = await this.users.doc(String(id)).get();
    return deserializeDates<User>({
      id,
      ...snap.data(),
    });
  }

  async getUsers(): Promise<User[]> {
    const snapshot = await this.users.orderBy("createdAt", "desc").get();
    return snapshot.docs
      .map((doc) =>
        deserializeDates<User>({
          id: Number(doc.id),
          ...doc.data(),
        }),
      )
      .filter(Boolean) as User[];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const snapshot = await this.users.where("username", "==", username).limit(1).get();
    const doc = snapshot.docs[0];
    if (!doc) return undefined;
    return deserializeDates<User>({
      id: Number(doc.id),
      ...doc.data(),
    });
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = await getNextId("users");
    await this.users.doc(String(id)).set({
      ...insertUser,
      id,
      createdAt: Timestamp.now(),
    });
    const created = await this.users.doc(String(id)).get();
    return deserializeDates<User>(created.data())!;
  }

  async deleteUser(id: number): Promise<void> {
    await this.users.doc(String(id)).delete();
  }

  // Products
  async getProducts(): Promise<Product[]> {
    const snapshot = await this.products.orderBy("createdAt", "desc").get();
    return snapshot.docs
      .map((doc) =>
        deserializeDates<Product>({
          id: Number(doc.id),
          ...doc.data(),
        }),
      )
      .filter(Boolean) as Product[];
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const snap = await this.products.doc(String(id)).get();
    if (!snap.exists) return undefined;
    return deserializeDates<Product>({
      id,
      ...snap.data(),
    });
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = await getNextId("products");
    await this.products.doc(String(id)).set({
      ...insertProduct,
      id,
      createdAt: Timestamp.now(),
      images: insertProduct.images ?? [],
      isEnabled: insertProduct.isEnabled ?? true,
      stock: insertProduct.stock ?? 0,
    });
    return (await this.getProduct(id))!;
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product> {
    await this.products.doc(String(id)).set(
      {
        ...updates,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
    return (await this.getProduct(id))!;
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    const snapshot = await this.orders.orderBy("createdAt", "desc").get();
    return snapshot.docs
      .map((doc) =>
        deserializeDates<Order>({
          id: Number(doc.id),
          ...doc.data(),
        }),
      )
      .filter(Boolean) as Order[];
  }

  async getOrdersByUser(userId: number): Promise<Order[]> {
    const snapshot = await this.orders
      .where("createdBy", "==", userId)
      .orderBy("createdAt", "desc")
      .get();
    return snapshot.docs
      .map((doc) =>
        deserializeDates<Order>({
          id: Number(doc.id),
          ...doc.data(),
        }),
      )
      .filter(Boolean) as Order[];
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const snap = await this.orders.doc(String(id)).get();
    if (!snap.exists) return undefined;
    return deserializeDates<Order>({
      id,
      ...snap.data(),
    });
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = await getNextId("orders");
    const orderNo = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await this.orders.doc(String(id)).set({
      ...insertOrder,
      id,
      orderNo,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      attachments: insertOrder.attachments ?? [],
      items: insertOrder.items ?? [],
    });
    return (await this.getOrder(id))!;
  }

  async updateOrder(id: number, updates: any): Promise<Order> {
    await this.orders.doc(String(id)).set(
      {
        ...updates,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
    return (await this.getOrder(id))!;
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    const snapshot = await this.categories.get();
    return snapshot.docs
      .map((doc) =>
        deserializeDates<Category>({
          id: Number(doc.id),
          ...doc.data(),
        }),
      )
      .filter(Boolean) as Category[];
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = await getNextId("categories");
    await this.categories.doc(String(id)).set({
      ...insertCategory,
      id,
      createdAt: Timestamp.now(),
    });
    const created = await this.categories.doc(String(id)).get();
    return deserializeDates<Category>(created.data())!;
  }

  async updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category> {
    await this.categories.doc(String(id)).set(
      {
        ...updates,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
    const updated = await this.categories.doc(String(id)).get();
    return deserializeDates<Category>(updated.data())!;
  }

  async deleteCategory(id: number): Promise<void> {
    await this.categories.doc(String(id)).delete();
  }

  // Promotions
  async getPromotions(): Promise<Promotion[]> {
    const snapshot = await this.promotions.orderBy("createdAt", "desc").get();
    return snapshot.docs
      .map((doc) =>
        deserializeDates<Promotion>({
          id: Number(doc.id),
          ...doc.data(),
        }),
      )
      .filter(Boolean) as Promotion[];
  }

  async createPromotion(insertPromotion: InsertPromotion): Promise<Promotion> {
    const id = await getNextId("promotions");
    await this.promotions.doc(String(id)).set({
      ...insertPromotion,
      id,
      createdAt: Timestamp.now(),
    });
    return (await this.getPromotions()).find((p) => p.id === id)!;
  }

  async deletePromotion(id: number): Promise<void> {
    await this.promotions.doc(String(id)).delete();
  }
}

export const storage = new FirestoreStorage();
