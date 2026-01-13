import { Timestamp } from "firebase/firestore";

export function asDate(value?: Timestamp | Date | null): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  return new Date(value);
}
