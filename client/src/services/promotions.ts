import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/services/firebase";
import { asDate } from "@/utils/firestore";
import type { Promotion, PromotionInput } from "@/types/models";

const promotionsCollection = collection(db, "promotions");

export async function fetchPromotions(): Promise<Promotion[]> {
  const snapshot = await getDocs(
    query(promotionsCollection, orderBy("createdAt", "desc")),
  );

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name ?? "",
      productId: data.productId ?? "",
      withdrawAmount: Number(data.withdrawAmount ?? 0),
      isActive: data.isActive ?? true,
      createdAt: asDate(data.createdAt),
    };
  });
}

export async function createPromotion(input: PromotionInput) {
  const payload = {
    name: input.name,
    productId: input.productId,
    withdrawAmount: Number(input.withdrawAmount),
    isActive: input.isActive ?? true,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(promotionsCollection, payload);
  return docRef.id;
}

export async function deletePromotion(id: string) {
  await deleteDoc(doc(db, "promotions", id));
}
