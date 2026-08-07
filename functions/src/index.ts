import { initializeApp } from "firebase-admin/app";

initializeApp();

export { dailyAyah } from "./scheduled/dailyAyah";
export { fridayReminder } from "./scheduled/fridayReminder";

