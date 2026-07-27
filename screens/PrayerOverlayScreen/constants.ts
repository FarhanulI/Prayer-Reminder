import { Dimensions } from "react-native";
import colors from "../../constants/colors.json";

export const { width: SCREEN_WIDTH } = Dimensions.get("window");
export const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.5;
export const REMINDER_OPTIONS = [5, 10, 15, 20, 30, 60] as const;
export const OVERLAY_BACKGROUND = colors["emerald-login-bg-end"];
export const CARD_BACKGROUND = colors["emerald-dark"];

export const HADITHS = {
  fajr: {
    text: 'The Prophet (ﷺ) said, "Whoever performs the dawn prayer (Fajr) will be under the protection of Allah.',
    source: "Sunan Ibn Majah 3946",
  },
  asr: {
    text: 'The Prophet (ﷺ) said, "He who misses the afternoon prayer (Asr) will be like one who has been deprived of his family and his wealth."',
    source: "Sahih al-Bukhari 552",
  },
  isha: {
    text: ' The Prophet (ﷺ) said, "If the people knew what [reward] there is in the Isha and Fajr prayers, they would come to them even if they had to crawl."',
    source: " Sahih al-Bukhari 615",
  },
  dhuhr: {
    text: "The Messenger of Allah (ﷺ) said: ‘Whoever persists in performing twelve Rak’ah from the Sunnah, a house will be built for him in Paradise: four before the Zuhr, two Rak’ah after Zuhr, two Rak’ah after Maghrib, two Rak’ah after the ‘Isha’ and two Rak’ah before Fajr.",
    source: "Sunan Ibn Majah 1140",
  },
  maghrib: {
    text: 'The Prophet (ﷺ) said, "The time for Maghrib continues until the twilight has disappeared."',
    source: "Sahih Muslim 612a",
  },
} as const;

export const EMPTY_HADITH = {
  text: "",
  source: "",
} as const;
