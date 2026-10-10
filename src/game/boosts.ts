import { updateAreaUnlocks } from "./sections";
import type { GameState } from "./GameState";
import { boostConfig } from "./campaign";
import { growthForPoints, growthPoints } from "./progression";
export function updateBoosts(s: GameState) {
  const growth = growthForPoints(growthPoints(s));
  // Open-world travel scales with physical size, independently of cleared zones.
  s.hole.speedMultiplier =
    (s.elapsedSeconds < s.boosts.speedUntil ? boostConfig.speedMultiplier : 1) *
    Math.min(320, Math.max(1, Math.pow(growth.radius / 8, 2)));
  s.hole.radius = growth.radius;
  s.hole.level = growth.level;
  updateAreaUnlocks(s);
}
export function activateBoost(s: GameState, kind: "speed" | "size" | "vortex") {
  if (s.status !== "playing") return false;
  if (kind === "speed")
    s.boosts.speedUntil = s.elapsedSeconds + boostConfig.duration;
  else if (kind === "vortex") s.boosts.vortexUntil = s.elapsedSeconds + 10;
  else {
    const current = growthForPoints(growthPoints(s));
    const fraction =
      (growthPoints(s) - current.threshold) /
      (current.nextThreshold - current.threshold);
    const next = growthForPoints(current.nextThreshold);
    const target =
      next.threshold + fraction * (next.nextThreshold - next.threshold);
    s.growthOffset = s.score.points - target;
    if (s.pacing) s.pacing.points = target;
  }
  updateBoosts(s);
  return true;
}
