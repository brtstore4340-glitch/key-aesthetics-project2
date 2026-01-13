import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/services/firebase";
import { asDate } from "@/utils/firestore";
import type { Category } from "@/types/models";

const categoriesCollection = collection(db, "categories");

export async function fetchCategories(): Promise<Category[]> {
  const snapshot = await getDocs(query(categoriesCollection, orderBy("name", "asc")));
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name ?? "",
      colorTag: data.colorTag ?? "",
      createdAt: asDate(data.createdAt),
    };
  });
}
