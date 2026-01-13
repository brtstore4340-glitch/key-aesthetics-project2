import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = (() => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Allow the full JSON string to be passed in via env
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }

  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      // Replace escaped newlines in env vars
      private_key: process
        .env
        .FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }

  return null;
})();

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
      });

export const firestore = getFirestore(app);
