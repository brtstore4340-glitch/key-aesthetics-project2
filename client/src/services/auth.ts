import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/services/firebase";
import { AUTH_EMAIL_DOMAIN } from "@/constants/auth";
import { fetchUserProfile } from "@/services/users";
import type { UserProfile } from "@/types/models";

export function getAuthEmail(username: string) {
  return `${username}@${AUTH_EMAIL_DOMAIN}`;
}

export async function signInWithPin(username: string, pin: string) {
  const email = getAuthEmail(username.trim().toLowerCase());
  return signInWithEmailAndPassword(auth, email, pin);
}

export async function signOutUser() {
  return signOut(auth);
}

export function onAuthChange(
  callback: (user: FirebaseUser | null) => void,
) {
  return onAuthStateChanged(auth, callback);
}

export async function loadUserProfile(uid: string): Promise<UserProfile | null> {
  return fetchUserProfile(uid);
}
