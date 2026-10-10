import type { GameState } from "./GameState";
import { stages } from "./constants";
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
  // The skyscraper-to-block radius spans more than 15×: one nominal level
  // must take longer than an ordinary 20% size step. Bound multiplicative growth.
  const nextRadius = stages[growth.level]?.radius ?? growth.radius * 1.2;
  const seconds =
    growth.level >= 28
      ? Math.max(
          pacingConfig.secondsPerSize,
          Math.log(
            nextRadius / (stages[growth.level - 1]?.radius ?? growth.radius),
          ) / 0.12,
        )
      : pacingConfig.secondsPerSize;
  s.pacing.points = Math.max(
    s.pacing.points,
    Math.min(
      earned,
      growth.nextThreshold,
      s.pacing.points +
        ((growth.nextThreshold - growth.threshold) * dt) / seconds,
    ),
  );
}
