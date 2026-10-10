import { it, expect } from "vitest";
import { freshState } from "../game/Game";
import { consumeAtEdge, complete, capture } from "../physics/swallowing";
import { advanceFall } from "../physics/falling";
import { spillContents, animateSpill, reactToHole } from "../game/interactions";
import { Vector3 } from "three";
it("retires only small edible items at the rim under load, awarding once", () => {
  const s = freshState(),
    o = s.level.objects.find((o) => o.type === "bacterium")!;
  s.hole.radius = 0.1;
  o.position.set(0.1 + o.radius * 0.5, 0, 0);
  expect(consumeAtEdge(s, o)).toBe(false);
  s.performance!.strained = true;
  const points = s.score.points;
  expect(consumeAtEdge(s, o)).toBe(true);
  expect(s.score.points - points).toBe(o.scoreValue);
  expect(consumeAtEdge(s, o)).toBe(false);
  expect(complete(s, o)).toBe(false);
  expect(s.level.objectSlots.has(o.id)).toBe(false);
  const barrier = s.level.objects.find((o) => o.collisionOnly)!;
  barrier.position.copy(s.hole.position);
  expect(consumeAtEdge(s, barrier)).toBe(false);
  const big = s.level.objects.find((o) => o.type === "car")!;
  s.hole.radius = big.radius * 1.3;
  big.position.copy(s.hole.position);
  expect(consumeAtEdge(s, big)).toBe(false);
});
it("drops small food in place and animates large food toward the center", () => {
  const s = freshState(),
    small = s.level.objects.find((o) => o.type === "bacterium")!;
  s.hole.radius = 0.1;
  small.position.set(0.05, 0, 0);
  expect(capture(small, s.hole)).toBe(true);
  expect(advanceFall(small, 0.3)!.x).toBe(0.05);
  const large = s.level.objects.find((o) => o.type === "car")!;
  s.hole.radius = large.radius * 1.3;
  large.position.set(s.hole.radius * 0.5, 0, 0);
  const start = large.position.x;
  expect(capture(large, s.hole)).toBe(true);
  expect(advanceFall(large, 0.3)!.x).toBeLessThan(start);
});
it("spills existing food without changing count or scoring until swallowed", () => {
  const s = freshState(),
    container = s.level.objects.find((o) => o.type === "table")!,
    food = s.level.objects.find((o) => o.type === "snack")!;
  food.supportId = container.id;
  food.position.copy(container.position);
  food.position.y = container.height;
  const count = s.level.objects.length,
    points = s.score.points;
  spillContents(s, container);
  const target = food.spill!.target.clone();
  animateSpill(food, 0.5);
  expect(food.position).toEqual(target);
  expect(food.supportId).toBeUndefined();
  expect(s.level.objects.length).toBe(count);
  expect(s.score.points).toBe(points);
});
it("keeps oversized reactions anchored and never reacts permanent barriers", () => {
  const s = freshState(),
    o = s.level.objects.find((o) => o.type === "dice")!;
  s.hole.radius = o.radius * 0.8;
  o.position.copy(s.hole.position);
  const pos = o.position.clone();
  reactToHole(s, [o]);
  expect(o.reactionUntil).toBeGreaterThan(0);
  expect(o.position).toEqual(pos);
  const b = s.level.objects.find((o) => o.collisionOnly)!;
  b.position.copy(s.hole.position);
  reactToHole(s, [b]);
  expect(b.reactionUntil).toBeUndefined();
});
