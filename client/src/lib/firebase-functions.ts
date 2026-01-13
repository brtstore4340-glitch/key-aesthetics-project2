import { httpsCallable } from "firebase/functions";

import { firebaseFunctions } from "./firebase";

export const authLogin = httpsCallable<
  { username: string; pin: string },
  { token: string; role: string }
>(firebaseFunctions, "authLogin");
