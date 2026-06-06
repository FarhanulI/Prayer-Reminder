import colors from "./colors.json";

/**
 * Milestone tiers are unlocked by **consecutive straight calendar days** at the
 * required prayer count (Perfect: 5/5, Strong: ≥4, Growth: ≥3). E.g. “Consistent”
 * (7 days) means seven back-to-back days each meeting that track’s minimum — not 7 scattered days.
 */
export const STREAK_MILESTONES = {
  growth: [
    { days: 3, title: "Starting Out", icon: "leaf", color: colors["blue-accent"], description: "Pray at least 3 Salah for 3 consecutive days to take your first step on this journey." },
    { days: 7, title: "Improving", icon: "rocket", color: colors["blue-accent"], description: "Pray at least 3 Salah for 7 consecutive days to build a week of progress." },
    { days: 14, title: "Building Momentum", icon: "speedometer", color: colors["blue-accent"], description: "Pray at least 3 Salah for 14 consecutive days to build real momentum." },
  ],
  strong: [
    { days: 3, title: "Getting Strong", icon: "fitness", color: colors.success, description: "Pray at least 4 Salah for 3 consecutive days to start getting strong." },
    { days: 7, title: "Focused", icon: "eye", color: colors.success, description: "Pray at least 4 Salah for 7 consecutive days to build a week of focus and dedication." },
    { days: 14, title: "Dedicated", icon: "heart", color: colors.success, description: "Pray at least 4 Salah for 14 consecutive days to prove your commitment." },
    { days: 30, title: "Solid Habit", icon: "checkmark-done", color: colors.success, description: "Pray at least 4 Salah for 30 consecutive days to build a solid habit." },
  ],

  perfect: [
    { days: 3, title: "First Steps to Him", icon: "footsteps", color: colors.gold, description: "Pray all 5 Salah for 3 consecutive days to set your intention and take your first steps to Him." },
    { days: 7, title: "Finding Steadfastness", icon: "anchor", color: colors.gold, description: "Pray all 5 Salah for 7 consecutive days to find peace and steadfastness." },
    { days: 14, title: "A Heart Devoted", icon: "heart", color: colors.gold, description: "Pray all 5 Salah for 14 consecutive days to turn your habit into a devoted conversation with Allah." },
    { days: 30, title: "Disciplined", icon: "shield-checkmark", color: colors.gold, description: "Pray all 5 Salah for 30 consecutive days to refine your character through discipline." },
    { days: 60, title: "Unstoppable", icon: "flash", color: colors.gold, description: "Pray all 5 Salah for 60 consecutive days to build spiritual resilience." },
    { days: 100, title: "Elite", icon: "trophy", color: colors.gold, description: "Pray all 5 Salah for 100 consecutive days to build a fortress of faith." },
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
