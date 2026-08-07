import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export const getUserRef = (uid: string) => doc(db, "users", uid);

export const getUserDoc = (uid: string) => getDoc(getUserRef(uid));

export const setUserMerged = (uid: string, data: Record<string, unknown>) => {
  return setDoc(getUserRef(uid), data, { merge: true });
};

export const updateUser = (uid: string, data: Record<string, unknown>) => {
  return updateDoc(getUserRef(uid), data);
};
