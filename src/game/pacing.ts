import type { GameState } from "./GameState";
import { growthForPoints, growthPoints } from "./progression";
export const pacingConfig = { secondsPerSize: 4.5 };
export function enablePacing(s: GameState) {
  s.pacing = { points: s.score.points - s.growthOffset };
}
// Food earns its full score immediately. Grow through that earned progress at
// a bounded rate, so one large sweep cannot skip several playable sizes.
export function advanceGrowth(s: GameState, dt: number) {
  if (!s.pacing) return;
  const growth = growthForPoints(growthPoints(s));
  const earned = s.score.points - s.growthOffset;
  s.pacing.points = Math.max(
    s.pacing.points,
    Math.min(
      earned,
      growth.nextThreshold,
      s.pacing.points +
        ((growth.nextThreshold - growth.threshold) * dt) /
          pacingConfig.secondsPerSize,
    ),
  );
}
