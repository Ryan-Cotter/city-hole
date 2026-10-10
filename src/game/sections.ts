import type { GameState, SwallowableObject } from "./GameState";
import { categories } from "./constants";
export const sectionForLevel = (level: number) =>
  level <= 7
    ? { index: 1, bounds: 3, next: 8 }
    : level <= 12
      ? { index: 2, bounds: 20, next: 13 }
      : level <= 18
        ? { index: 3, bounds: 40, next: 19 }
        : { index: 4, bounds: 60, next: null };
export const activeBounds = (state: GameState) =>
  Math.min(state.level.bounds, sectionForLevel(state.hole.level).bounds);
export const isUnlocked = (state: GameState, o: SwallowableObject) => {
  const bounds = activeBounds(state);
  return (
    Math.abs(o.position.x) <= bounds &&
    Math.abs(o.position.z) <= bounds &&
    (state.hole.level > 7 || o.radius <= categories.mouse.radius)
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
