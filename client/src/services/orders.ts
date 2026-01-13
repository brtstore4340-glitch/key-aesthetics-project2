import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/services/firebase";
import { asDate } from "@/utils/firestore";
import type { Order, OrderInput, OrderStatus } from "@/types/models";

const ordersCollection = collection(db, "orders");

function mapOrder(id: string, data: Record<string, any>): Order {
  return {
    id,
    orderNo: data.orderNo ?? "",
    status: data.status ?? "draft",
    items: Array.isArray(data.items) ? data.items : [],
    total: Number(data.total ?? 0),
    customerInfo: data.customerInfo ?? undefined,
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    createdBy: data.createdBy ?? undefined,
    verifiedBy: data.verifiedBy ?? undefined,
    verifiedAt: asDate(data.verifiedAt) ?? null,
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
  };
}

export async function fetchOrders(status?: OrderStatus): Promise<Order[]> {
  const orderQuery = status
    ? query(
        ordersCollection,
        where("status", "==", status),
        orderBy("createdAt", "desc"),
      )
    : query(ordersCollection, orderBy("createdAt", "desc"));

  const snapshot = await getDocs(orderQuery);
  return snapshot.docs.map((docSnap) => mapOrder(docSnap.id, docSnap.data()));
}

export async function fetchOrder(id: string): Promise<Order | null> {
  const snapshot = await getDoc(doc(db, "orders", id));
  if (!snapshot.exists()) return null;
  return mapOrder(snapshot.id, snapshot.data());
}

export async function createOrder(input: OrderInput): Promise<{ id: string }> {
  const createOrderCallable = httpsCallable(functions, "createOrder");
  const response = await createOrderCallable(input);
  return response.data as { id: string };
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const updateOrderCallable = httpsCallable(functions, "updateOrderStatus");
  const response = await updateOrderCallable({ id, status });
  return response.data as { id: string };
}
