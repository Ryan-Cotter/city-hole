import { stages, progressionConfig } from "./constants";
// After countries, incremental costs rise logarithmically without a size cap.
export const extraLevelCost = (extraIndex: number) =>
  Math.ceil(progressionConfig.postCityCost * (1 + Math.log2(extraIndex + 2)));
export function growthForPoints(points: number) {
  let level = 1;
  while (level < stages.length && points >= stages[level].points) level++;
  if (level < stages.length) {
    const current = stages[level - 1],
      next = stages[level];
    const fraction = Math.max(
      0,
      Math.min(1, (points - current.points) / (next.points - current.points)),
    );
    // Preserve distinct early sizes; blend large-scale steps without sudden jumps.
    const radius =
      current.type === "skyscraper" || current.type === "cityBlock"
        ? current.radius * Math.pow(next.radius / current.radius, fraction)
        : current.radius;
    return {
      level,
      radius,
      threshold: stages[level - 1].points,
      nextThreshold: stages[level].points,
    };
  }
  let threshold = stages.at(-1)!.points,
    extra = 0;
  while (points >= threshold + extraLevelCost(extra)) {
    threshold += extraLevelCost(extra);
    extra++;
  }
  return {
    level: stages.length + extra,
    radius: stages.at(-1)!.radius + extra * progressionConfig.extraRadiusStep,
    threshold,
    nextThreshold: threshold + extraLevelCost(extra),
  };
}
export const levelForPoints = (points: number) => growthForPoints(points).level;

export const growthPoints = (s: import("./GameState").GameState) =>
  s.pacing?.points ?? s.score.points - s.growthOffset;
