import { OnboardingData } from "@/types";
import { serverTimestamp } from "firebase/firestore";
import { updateUser } from "../repositories/user.repository";

export const saveOnboardingData = async (uid: string, data: OnboardingData) => {
  try {
    await updateUser(uid, {
      ...data,
      updatedAt: serverTimestamp(),
    });

    console.log("Onboarding data saved for:", uid);
  } catch (error) {
    console.error("Error saving onboarding data:", error);
    throw error;
  }
};
