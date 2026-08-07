import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export const getPrayerLogRef = (uid: string, date: string) =>
  doc(db, "users", uid, "prayer_logs", date);

export const getPrayerLogDoc = (uid: string, date: string) => {
  return getDoc(getPrayerLogRef(uid, date));
};

export const setPrayerLogDoc = (
  uid: string,
  date: string,
  data: Record<string, unknown>,
  merge: boolean,
) => {
  return setDoc(getPrayerLogRef(uid, date), data, { merge });
};
