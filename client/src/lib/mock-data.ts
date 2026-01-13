import {
  type Category,
  type CreateOrderRequest,
  type CreateProductRequest,
  type CreatePromotionRequest,
  type InsertUserInput,
  type Order,
  type Product,
  type Promotion,
  type UpdateOrderRequest,
  type User,
} from "./schema";

type UserRecord = User & { pin: string };

const storageKey = "ka-current-user";

const canUseStorage =
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const categories: Category[] = [
  { id: 1, name: "Skin Care" },
  { id: 2, name: "Devices" },
  { id: 3, name: "Supplements" },
  { id: 4, name: "Accessories" },
];

let users: UserRecord[] = [
  {
    id: 1,
    username: "admin",
    name: "Siam Admin",
    role: "admin",
    pin: "1234",
  },
  {
    id: 2,
    username: "staff",
    name: "Clinic Staff",
    role: "staff",
    pin: "2345",
  },
  {
    id: 3,
    username: "accounting",
    name: "Finance Team",
    role: "accounting",
    pin: "3456",
  },
];

let products: Product[] = [
  {
    id: 1,
    name: "Radiant Repair Serum",
    price: "2400",
    description: "Brightening serum for post-treatment glow.",
    categoryId: 1,
    images: ["https://placehold.co/600x400/171A1D/D4B16A?text=Serum"],
    stock: 12,
    isEnabled: true,
  },
  {
    id: 2,
    name: "Lumen Sculpt Device",
    price: "12800",
    description: "Portable sculpting device with microcurrent therapy.",
    categoryId: 2,
    images: ["https://placehold.co/600x400/171A1D/D4B16A?text=Device"],
    stock: 5,
    isEnabled: true,
  },
  {
    id: 3,
    name: "Collagen Boost Pack",
    price: "980",
    description: "Daily collagen sachets for skin resilience.",
    categoryId: 3,
    images: ["https://placehold.co/600x400/171A1D/D4B16A?text=Collagen"],
    stock: 28,
    isEnabled: true,
  },
  {
    id: 4,
    name: "Crystal Applicator",
    price: "650",
    description: "Cooling applicator for post-procedure calming.",
    categoryId: 4,
    images: ["https://placehold.co/600x400/171A1D/D4B16A?text=Accessory"],
    stock: 0,
    isEnabled: false,
  },
];

let promotions: Promotion[] = [
  { id: 1, name: "Glow Week", productId: 1, withdrawAmount: 3 },
];

let orders: Order[] = [
  {
    id: 1,
    orderNo: "ORD-0001",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    status: "submitted",
    items: [
      { productId: 1, name: "Radiant Repair Serum", quantity: 2, price: 2400 },
      { productId: 3, name: "Collagen Boost Pack", quantity: 5, price: 980 },
    ],
    total: "9700",
    customerInfo: {
      doctorName: "Dr. Nalinee",
      address: "88 Sukhumvit Rd, Bangkok",
    },
    attachments: [],
    verifiedAt: null,
  },
  {
    id: 2,
    orderNo: "ORD-0002",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    status: "verified",
    items: [{ productId: 2, name: "Lumen Sculpt Device", quantity: 1, price: 12800 }],
    total: "12800",
    customerInfo: {
      doctorName: "Dermis Clinic",
      address: "25 Ari 4, Bangkok",
    },
    attachments: [],
    verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
  },
];

let nextUserId = 4;
let nextProductId = 5;
let nextPromotionId = 2;
let nextOrderId = 3;

const toPublicUser = ({ pin, ...user }: UserRecord): User => user;

const getStoredUserId = () => {
  if (!canUseStorage) return null;
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return null;
  const id = Number(stored);
  return Number.isNaN(id) ? null : id;
};

const setStoredUserId = (id: number | null) => {
  if (!canUseStorage) return;
  if (id === null) {
    window.localStorage.removeItem(storageKey);
    return;
  }
  window.localStorage.setItem(storageKey, String(id));
};

export function getCurrentUser(): User | null {
  const id = getStoredUserId();
  if (!id) return null;
  const user = users.find((candidate) => candidate.id === id);
  return user ? toPublicUser(user) : null;
}

export function authenticateUser(username: string, pin: string): User {
  const user = users.find(
    (candidate) => candidate.username === username && candidate.pin === pin,
  );
  if (!user) {
    throw new Error("Invalid username or PIN");
  }
  setStoredUserId(user.id);
  return toPublicUser(user);
}

export function logoutUser() {
  setStoredUserId(null);
}

export function getUsers(): User[] {
  return users.map(toPublicUser);
}

export function createUser(input: InsertUserInput): User {
  const newUser: UserRecord = {
    id: nextUserId++,
    username: input.username,
    name: input.name,
    role: input.role,
    pin: input.pin,
  };
  users = [newUser, ...users];
  return toPublicUser(newUser);
}

export function deleteUser(id: number) {
  users = users.filter((user) => user.id !== id);
  const currentId = getStoredUserId();
  if (currentId === id) {
    setStoredUserId(null);
  }
}

export function getCategories(): Category[] {
  return categories;
}

export function getProducts(): Product[] {
  return products;
}

export function getProductById(id: number): Product | undefined {
  return products.find((product) => product.id === id);
}

export function createProduct(input: CreateProductRequest): Product {
  const newProduct: Product = {
    id: nextProductId++,
    name: input.name,
    price: input.price,
    description: input.description ?? "",
    categoryId: input.categoryId ?? null,
    images: input.images ?? [],
    stock: input.stock ?? 0,
    isEnabled: input.isEnabled ?? true,
  };
  products = [newProduct, ...products];
  return newProduct;
}

export function createProductsBatch(inputs: CreateProductRequest[]): Product[] {
  const created: Product[] = [];
  inputs.forEach((input) => {
    created.push(createProduct(input));
  });
  return created;
}

export function getPromotions(): Promotion[] {
  return promotions;
}

export function createPromotion(input: CreatePromotionRequest): Promotion {
  const newPromotion: Promotion = {
    id: nextPromotionId++,
    name: input.name,
    productId: input.productId,
    withdrawAmount: input.withdrawAmount,
  };
  promotions = [newPromotion, ...promotions];
  return newPromotion;
}

export function deletePromotion(id: number) {
  promotions = promotions.filter((promo) => promo.id !== id);
}

export function getOrders(status?: string): Order[] {
  const filtered = status ? orders.filter((order) => order.status === status) : orders;
  return [...filtered].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getOrderById(id: number): Order | undefined {
  return orders.find((order) => order.id === id);
}

export function createOrder(input: CreateOrderRequest): Order {
  const id = nextOrderId++;
  const order: Order = {
    id,
    orderNo: `ORD-${String(id).padStart(4, "0")}`,
    createdAt: new Date().toISOString(),
    verifiedAt: null,
    ...input,
  };
  orders = [order, ...orders];
  return order;
}

export function updateOrder(id: number, updates: UpdateOrderRequest): Order {
  const orderIndex = orders.findIndex((order) => order.id === id);
  if (orderIndex === -1) {
    throw new Error("Order not found");
  }
  const current = orders[orderIndex];
  const nextStatus = updates.status ?? current.status;
  const verifiedAt =
    nextStatus === "verified"
      ? updates.verifiedAt ?? new Date().toISOString()
      : current.verifiedAt;

  const updated: Order = {
    ...current,
    ...updates,
    status: nextStatus,
    verifiedAt,
  };

  orders = [updated, ...orders.filter((order) => order.id !== id)];
  return updated;
}
