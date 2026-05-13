export const STREAK_MILESTONES = {
  perfect: [
    { days: 3, title: "Living with Salah", icon: "star", color: "#dbb142" },
    { days: 7, title: "Disciplined Believer", icon: "trending-up", color: "#dbb142" },
    { days: 14, title: "Walking the Straight Path", icon: "shield", color: "#dbb142" },
    { days: 30, title: "Guarding the Obligation", icon: "flash", color: "#dbb142" },
    { days: 60, title: "Steadfast Devotion", icon: "flame", color: "#dbb142" },
    { days: 100, title: "Unwavering Faith", icon: "trophy", color: "#dbb142" },
  ],
  strong: [
    { days: 3, title: "Strengthening Your Salah", icon: "barbell", color: "#4ade80" },
    { days: 7, title: "Becoming Consistent", icon: "eye", color: "#4ade80" },
    { days: 14, title: "Holding Firm", icon: "heart", color: "#4ade80" },
    { days: 30, title: "Solidifying the Habit", icon: "checkmark-done", color: "#4ade80" },
  ],
  growth: [
    { days: 3, title: "Beginning the Journey", icon: "leaf", color: "#60a5fa" },
    { days: 7, title: "Turning Back Consistently", icon: "rocket", color: "#60a5fa" },
    { days: 14, title: "Building Connection", icon: "speedometer", color: "#60a5fa" },
  ],
};

export const CATEGORY_MESSAGES = {
  perfect: "Guarding all prayers protects your day and strengthens your faith.",
  strong: "Consistency in Salah brings peace and discipline to your life.",
  growth: "Every prayer you return to is a step closer to Allah."
};

export const CATEGORY_ENCOURAGEMENTS = {
  perfect: "You are living your day around Salah. This is powerful.",
  strong: "Your consistency is strengthening your connection with Allah.",
  growth: "You are building a beautiful habit of returning to Allah 🤲"
};

export type StreakCategory = 'perfect' | 'strong' | 'growth';

export function getMilestoneForStreak(category: StreakCategory, days: number) {
  const milestones = STREAK_MILESTONES[category];
  // Find the highest milestone achieved
  return [...milestones].reverse().find(m => days >= m.days);
}
