import { updateAreaUnlocks } from "./sections";
import type { GameState } from "./GameState";
import { boostConfig } from "./campaign";
import { growthForPoints, growthPoints } from "./progression";
export function updateBoosts(s: GameState) {
  s.hole.speedMultiplier =
    (s.elapsedSeconds < s.boosts.speedUntil ? boostConfig.speedMultiplier : 1) *
    (s.world.phase === "country"
      ? 10
      : s.world.phase === "planet"
        ? 20
        : s.world.phase === "metropolis"
          ? 2
          : 1);
  const growth = growthForPoints(growthPoints(s));
  s.hole.radius = growth.radius;
  s.hole.level = growth.level;
  updateAreaUnlocks(s);
}
export function activateBoost(s: GameState, kind: "speed" | "size") {
  if (s.status !== "playing") return false;
  if (kind === "speed")
    s.boosts.speedUntil = s.elapsedSeconds + boostConfig.duration;
  else {
    const current = growthForPoints(growthPoints(s));
    const fraction =
      (growthPoints(s) - current.threshold) /
      (current.nextThreshold - current.threshold);
    const next = growthForPoints(current.nextThreshold);
    const target =
      next.threshold + fraction * (next.nextThreshold - next.threshold);
    s.growthOffset = s.score.points - target;
  }
  updateBoosts(s);
  return true;
}
