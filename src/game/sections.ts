import type { GameState, SwallowableObject } from "./GameState";
import { categories, renderChunkConfig } from "./constants";
export const blockScaleRadius = categories.cityBlock.radius * 8;
export const areaConfig = [
  { index: 1, bounds: 3, name: "Starter yard" },
  { index: 2, bounds: 10, name: "City block" },
  { index: 3, bounds: 60, name: "Whole city" },
] as const;
export const sectionForState = (state: GameState) =>
  areaConfig[state.areaStage - 1];
export const activeBounds = (state: GameState) =>
  state.level.finalBounds ?? state.level.bounds;
export const isUnlocked = (state: GameState, o: SwallowableObject) =>
  !o.unlockStage && (!o.members || state.hole.radius >= blockScaleRadius);
function highestEdibleTier(state: GameState) {
  const specs = Object.values(categories);
  let highest = 0;
  for (let i = 0; i < specs.length; i++)
    if (specs[i].radius <= state.hole.radius * 0.85) highest = i;
  return highest;
}
export const lowestDetailTier = (state: GameState) =>
  Math.max(0, highestEdibleTier(state) - 5);
export const lowestRenderTier = (state: GameState) =>
  Math.max(
    0,
    highestEdibleTier(state) - renderChunkConfig.retainedTierDistance,
  );
const tierIndices = new Map(
  Object.keys(categories).map((type, index) => [type, index]),
);
export const tierOf = (o: SwallowableObject) => tierIndices.get(o.type)!;

export function updateAreaUnlocks(state: GameState) {
  state.areaStage = 3;
}
