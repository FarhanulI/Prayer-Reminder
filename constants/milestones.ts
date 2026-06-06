import colors from "./colors.json";

/**
 * Milestone tiers are unlocked by **consecutive straight calendar days** at the
 * required prayer count (Perfect: 5/5, Strong: ≥4, Growth: ≥3). E.g. “Consistent”
 * (7 days) means seven back-to-back days each meeting that track’s minimum — not 7 scattered days.
 */
export const STREAK_MILESTONES = {
  strong: [
    { days: 3, title: "Getting Strong", icon: "fitness", color: colors.success },
    { days: 7, title: "Focused", icon: "eye", color: colors.success },
    { days: 14, title: "Dedicated", icon: "heart", color: colors.success },
    { days: 30, title: "Solid Habit", icon: "checkmark-done", color: colors.success },
  ],
  growth: [
    { days: 3, title: "Starting Out", icon: "leaf", color: colors["blue-accent"] },
    { days: 7, title: "Improving", icon: "rocket", color: colors["blue-accent"] },
    { days: 14, title: "Building Momentum", icon: "speedometer", color: colors["blue-accent"] },
  ],
  perfect: [
    { days: 3, title: "First Steps to Him", icon: "footsteps", color: colors.gold, description: "Setting your intention. The first steps in establishing a lifelong bond with Allah." },
    { days: 7, title: "Finding Steadfastness", icon: "anchor", color: colors.gold, description: "Istiqamah (consistency). Your heart begins to find peace in the rhythm of the daily prayers." },
    { days: 14, title: "A Heart Devoted", icon: "heart", color: colors.gold, description: "Moving beyond habit. Prayer becomes a conversation with Allah that you long for." },
    { days: 30, title: "Disciplined", icon: "shield-checkmark", color: colors.gold, description: "A month of devotion. Your character is being refined through the discipline of worship." },
    { days: 60, title: "Unstoppable", icon: "flash", color: colors.gold, description: "Spiritual resilience. The light of Salah protects your heart from the distractions of the Dunya." },
    { days: 100, title: "Elite", icon: "trophy", color: colors.gold, description: "Mu'min (The Believer). You have built a fortress of faith, finding true success through total submission." },
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

/** Highest tier reached for this category given a **straight-day** streak length `days`. */
export function getMilestoneForStreak(category: StreakCategory, days: number) {
  const milestones = STREAK_MILESTONES[category];
  // Find the highest milestone achieved
  return [...milestones].reverse().find(m => days >= m.days);
}

export type StreakMilestoneDef = (typeof STREAK_MILESTONES)[StreakCategory][number];

/** Next tier after `currentDays`, or null if already at the highest tier. */
export function getNextMilestone(category: StreakCategory, currentDays: number): StreakMilestoneDef | null {
  const milestones = STREAK_MILESTONES[category];
  return milestones.find((m) => m.days > currentDays) ?? null;
}

export type MilestoneAchievement = StreakMilestoneDef & {
  category: StreakCategory;
  unlocked: boolean;
};

/** Unlock flags from **current** straight-day streak lengths (see {@link STREAK_MILESTONES}). */
export function buildMilestoneAchievements(streaks: {
  perfect: { current: number };
  strong: { current: number };
  growth: { current: number };
}): MilestoneAchievement[] {
  const categories: StreakCategory[] = ["growth", "strong", "perfect"];
  const out: MilestoneAchievement[] = [];
  for (const cat of categories) {
    const days = streaks[cat].current;
    for (const m of STREAK_MILESTONES[cat]) {
      out.push({ category: cat, ...m, unlocked: days >= m.days });
    }
  }
  return out;
}
