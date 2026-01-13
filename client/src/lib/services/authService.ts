import { onAuthStateChanged, signInWithCustomToken, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "@/lib/firebaseClient";

export type UserRole = "admin" | "staff" | "accounting";

export type UserProfile = {
  id: string;
  username: string;
  name: string;
  role: UserRole;
};

export type AuthUser = UserProfile & {
  email?: string | null;
};

type LoginWithPinResponse = {
  token: string;
  profile?: UserProfile;
};

const buildAuthUser = (profile: UserProfile, email?: string | null): AuthUser => ({
  ...profile,
  email,
});

const getUserProfile = async (uid: string) => {
  const userSnap = await getDoc(doc(db, "users", uid));
  if (!userSnap.exists()) {
    return null;
  }
  return { id: userSnap.id, ...(userSnap.data() as Omit<UserProfile, "id">) };
};

export const authService = {
  async loginWithPin({ username, pin }: { username: string; pin: string }) {
    const loginCallable = httpsCallable(functions, "loginWithPin");
    const result = await loginCallable({ username, pin });
    const data = result.data as LoginWithPinResponse;
    if (!data.token) {
      throw new Error("Missing Firebase custom token");
    }

    const credential = await signInWithCustomToken(auth, data.token);
    const profile = data.profile ?? (await getUserProfile(credential.user.uid));

    if (!profile) {
      throw new Error("User profile not found");
    }

    return buildAuthUser(profile, credential.user.email);
  },

  async logout() {
    await signOut(auth);
  },

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        callback(null);
        return;
      }

      const profile = await getUserProfile(user.uid);
      if (!profile) {
        callback(null);
        return;
      }

      callback(buildAuthUser(profile, user.email));
    });
  },
};
