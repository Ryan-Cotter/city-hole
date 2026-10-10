import type { GameState, SwallowableObject } from "./GameState";
import { categories } from "./constants";
export const areaConfig = [
  { index: 1, bounds: 3, name: "Starter yard" },
  { index: 2, bounds: 10, name: "City block" },
  { index: 3, bounds: 60, name: "Whole city" },
] as const;
export const sectionForState = (state: GameState) =>
  areaConfig[state.areaStage - 1];
export const activeBounds = (state: GameState) =>
  state.areaStage === 3
    ? state.level.bounds
    : Math.min(
        state.level.bounds,
        sectionForState(state).bounds,
        state.areaStage === 1 && state.hole.radius < 0.04
          ? Math.max(0.12, state.hole.radius * 45)
          : Infinity,
      );
export const isUnlocked = (state: GameState, o: SwallowableObject) => {
  if (o.unlockStage && o.unlockStage <= state.areaStage) return false;
  const bounds = activeBounds(state);
  if (o.members && (state.areaStage < 3 || o.radius > state.hole.radius * 0.85))
    return false;
  return (
    Math.abs(o.position.x) <= bounds &&
    Math.abs(o.position.z) <= bounds &&
    (!o.unlockStage || o.unlockStage <= state.areaStage + 1) &&
    (state.areaStage > 1 ||
      o.radius <= categories.mouse.radius ||
      o.unlockStage === 2)
  );
};
export function lowestDetailTier(state: GameState) {
  const specs = Object.values(categories);
  let highest = 0;
  for (let i = 0; i < specs.length; i++)
    if (specs[i].radius <= state.hole.radius * 0.85) highest = i;
  return Math.max(0, highest - 4);
}
const tierIndices = new Map(
  Object.keys(categories).map((type, index) => [type, index]),
);
export const tierOf = (o: SwallowableObject) => tierIndices.get(o.type)!;

export function updateAreaUnlocks(state: GameState) {
  const edibleRadius = state.hole.radius * 0.85;
  if (state.areaStage === 1 && edibleRadius >= categories.mouse.radius)
    state.areaStage = 2;
  if (state.areaStage === 2 && edibleRadius >= categories.sign.radius)
    state.areaStage = 3;
}
