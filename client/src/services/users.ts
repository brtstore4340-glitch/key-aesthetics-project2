import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/services/firebase";
import { asDate } from "@/utils/firestore";
import type { CreateUserInput, UserProfile } from "@/types/models";

const usersCollection = collection(db, "users");

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    id: snapshot.id,
    username: data.username ?? "",
    name: data.name ?? "",
    role: data.role ?? "staff",
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
  };
}

export async function fetchUsers(): Promise<UserProfile[]> {
  const snapshot = await getDocs(query(usersCollection, orderBy("createdAt", "desc")));
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      username: data.username ?? "",
      name: data.name ?? "",
      role: data.role ?? "staff",
      createdAt: asDate(data.createdAt),
      updatedAt: asDate(data.updatedAt),
    };
  });
}

export async function updateUserProfile(uid: string, data: { name: string }) {
  await updateDoc(doc(db, "users", uid), {
    name: data.name,
    updatedAt: serverTimestamp(),
  });
}

export async function createUser(input: CreateUserInput) {
  const createUserCallable = httpsCallable(functions, "createUser");
  const response = await createUserCallable(input);
  return response.data as { uid: string };
}

export async function deleteUser(uid: string) {
  const deleteUserCallable = httpsCallable(functions, "deleteUser");
  const response = await deleteUserCallable({ uid });
  return response.data;
}
