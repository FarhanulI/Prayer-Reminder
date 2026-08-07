"use strict";
let _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchRandomAyah = fetchRandomAyah;
const v2_1 = require("firebase-functions/v2");
const BASE_URL =
  (_a = process.env.AYAH_API_BASE_URL) !== null && _a !== void 0 ? _a : "";
async function fetchRandomAyah() {
  if (!BASE_URL) {
    throw new Error(
      "[AyahApiService] AYAH_API_BASE_URL environment variable is not set",
    );
  }
  const response = await fetch(`${BASE_URL}/api/quran/random`);
  if (!response.ok) {
    v2_1.logger.error(`[AyahApiService] HTTP ${response.status} from Ayah API`);
    throw new Error(`Ayah API responded with status ${response.status}`);
  }
  const json = await response.json();
  return json.data;
}
//# sourceMappingURL=ayahApi.service.js.map
