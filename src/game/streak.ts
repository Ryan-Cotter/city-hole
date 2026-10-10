import type { GameState } from "./GameState";
export const streakConfig = {
  windowSeconds: 2,
  firstBonusAt: 3,
  maximumAt: 8,
  firstMultiplier: 1.5,
  maximumMultiplier: 2,
};
export function streakMultiplier(s: GameState) {
  if (!s.streak) return 1;
  const streak = s.streak;
  streak.count = s.elapsedSeconds <= streak.expiresAt ? streak.count + 1 : 1;
  streak.expiresAt = s.elapsedSeconds + streakConfig.windowSeconds;
  streak.multiplier =
    streak.count >= streakConfig.maximumAt
      ? streakConfig.maximumMultiplier
      : streak.count >= streakConfig.firstBonusAt
        ? streakConfig.firstMultiplier
        : 1;
  streak.best = Math.max(streak.best, streak.count);
  return streak.multiplier;
}
