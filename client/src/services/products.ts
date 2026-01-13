import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/services/firebase";
import { asDate } from "@/utils/firestore";
import type { Product, ProductInput } from "@/types/models";

const productsCollection = collection(db, "products");

function mapProduct(id: string, data: Record<string, any>): Product {
  return {
    id,
    name: data.name ?? "",
    description: data.description ?? "",
    price: Number(data.price ?? 0),
    categoryId: data.categoryId ?? null,
    images: Array.isArray(data.images) ? data.images : [],
    stock: Number(data.stock ?? 0),
    isEnabled: data.isEnabled ?? true,
    createdAt: asDate(data.createdAt),
  };
}

export async function fetchProducts(): Promise<Product[]> {
  const snapshot = await getDocs(query(productsCollection, orderBy("createdAt", "desc")));
  return snapshot.docs.map((docSnap) => mapProduct(docSnap.id, docSnap.data()));
}

export async function fetchProduct(id: string): Promise<Product | null> {
  const snapshot = await getDoc(doc(db, "products", id));
  if (!snapshot.exists()) return null;
  return mapProduct(snapshot.id, snapshot.data());
}

export async function createProduct(input: ProductInput) {
  const payload = {
    name: input.name,
    description: input.description ?? "",
    price: Number(input.price),
    categoryId: input.categoryId ?? null,
    images: input.images ?? [],
    stock: Number(input.stock ?? 0),
    isEnabled: input.isEnabled ?? true,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(productsCollection, payload);
  return docRef.id;
}

export async function createProductsBatch(inputs: ProductInput[]) {
  const batch = writeBatch(db);

  inputs.forEach((input) => {
    const docRef = doc(productsCollection);
    batch.set(docRef, {
      name: input.name,
      description: input.description ?? "",
      price: Number(input.price),
      categoryId: input.categoryId ?? null,
      images: input.images ?? [],
      stock: Number(input.stock ?? 0),
      isEnabled: input.isEnabled ?? true,
      createdAt: serverTimestamp(),
    });
  });

  await batch.commit();
}
