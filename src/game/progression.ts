import { stages, progressionConfig } from "./constants";
// After skyscrapers, incremental costs rise logarithmically without a size cap.
export const extraLevelCost = (extraIndex: number) =>
  Math.ceil(progressionConfig.postCityCost * (1 + Math.log2(extraIndex + 2)));
export function growthForPoints(points: number) {
  let level = 1;
  while (level < stages.length && points >= stages[level].points) level++;
  if (level < stages.length)
    return {
      level,
      radius: stages[level - 1].radius,
      threshold: stages[level - 1].points,
      nextThreshold: stages[level].points,
    };
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
