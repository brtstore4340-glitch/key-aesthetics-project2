import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebaseClient";

export const storageService = {
  async uploadOrderAttachment({
    orderId,
    file,
    type,
  }: {
    orderId: string;
    file: File;
    type: "id_card" | "payment_slip" | "other";
  }) {
    const fileRef = ref(storage, `orders/${orderId}/${type}/${Date.now()}-${file.name}`);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  },

  async deleteAttachment(path: string) {
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
  },
};
