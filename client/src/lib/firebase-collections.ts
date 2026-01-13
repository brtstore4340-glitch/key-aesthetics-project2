import { collection } from "firebase/firestore";

import { firebaseDb } from "./firebase";

export const usersCollection = collection(firebaseDb, "users");
export const productsCollection = collection(firebaseDb, "products");
export const categoriesCollection = collection(firebaseDb, "categories");
export const promotionsCollection = collection(firebaseDb, "promotions");
export const ordersCollection = collection(firebaseDb, "orders");
