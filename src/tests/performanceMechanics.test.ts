import { describe, it, expect } from "vitest";
import { freshState } from "../game/Game";
import { capture, complete, consumeObsolete } from "../physics/swallowing";
import { advanceFall } from "../physics/falling";
import { CityChunks } from "../world/CityChunks";
import { activeBounds, isUnlocked } from "../game/sections";
import { stages, categories } from "../game/constants";
import { movementLimit, clampHole } from "../player/Hole";
import { bendHoleCoordinate, holeOutline } from "../render/holeEdge";
import { updateTraffic } from "../world/traffic";

describe("performance and scale mechanics", () => {
  it("deletes records without losing exact-once rewards or corrupting swap indices", () => {
    const state = freshState(),
      total = state.level.objects.length,
      chunks = new CityChunks(state.level.objects);
    for (const o of state.level.objects.slice(0, 200)) {
      o.state = "falling";
      expect(complete(state, o)).toBe(true);
      chunks.remove(o);
      expect(complete(state, o)).toBe(false);
      expect(state.level.objectSlots.has(o.id)).toBe(false);
      expect(state.level.objects.includes(o)).toBe(false);
      expect(
        [...chunks.chunks.values()].some((c) => c.objects.includes(o)),
      ).toBe(false);
    }
    expect(state.level.objects.length).toBe(total - 200);
    for (const [id, index] of state.level.objectSlots)
      expect(state.level.objects[index].id).toBe(id);
    expect(state.score.remainingObjects).toBe(state.level.objects.length);
  });
  it("instant-consumes obsolete objects only when the whole footprint fits", () => {
    const s = freshState(),
      o = s.level.objects.find((o) => o.type === "bottlecap")!;
    s.hole.radius = stages[8].radius;
    s.hole.level = 9;
    o.position.set(s.hole.radius - o.radius + 0.001, 0, 0);
    expect(consumeObsolete(s, o)).toBe(false);
    o.position.x -= 0.002;
    expect(consumeObsolete(s, o)).toBe(true);
    expect(s.score.points).toBe(1);
    expect(consumeObsolete(s, o)).toBe(false);
    s.hole.radius = stages[8].radius;
    s.hole.level = 9;
    const current = s.level.objects.find((o) => o.type === "litter")!;
    current.position.set(0, 0, 0);
    expect(consumeObsolete(s, current)).toBe(false);
    expect(capture(current, s.hole)).toBe(true);
  });
  it("starts in a tiny section and expands in steps", () => {
    const s = freshState();
    expect(activeBounds(s)).toBe(3);
    expect(
      s.level.objects
        .filter((o) => isUnlocked(s, o))
        .every((o) => o.radius <= categories.mouse.radius),
    ).toBe(true);
    for (const [level, bounds] of [
      [8, 20],
      [13, 40],
      [19, 60],
    ]) {
      s.hole.level = level;
      expect(activeBounds(s)).toBe(bounds);
    }
  });
  it("allows corner access and keeps the rim softly bounded", () => {
    const s = freshState();
    s.hole.radius = 2;
    s.hole.position.set(60, 0, 60);
    clampHole(s.hole, 60);
    expect(s.hole.position.x).toBeCloseTo(movementLimit(2, 60));
    expect(
      Math.hypot(60 - s.hole.position.x, 60 - s.hole.position.z),
    ).toBeLessThan(2);
    for(const radius of [2,20,60,80,100]) {
      const limit=movementLimit(radius,60);
      expect(Math.hypot(60-limit,60-limit)).toBeLessThanOrEqual(radius);
    }
    const outline = holeOutline(s.hole.position.x, s.hole.position.z, 2, 60);
    expect(Math.max(...outline.map((p) => p.x))).toBeLessThan(60.08);
    expect(bendHoleCoordinate(0, 60, 2)).toBe(0);
  });
  it("gives food separate records and starts its fall at table height", () => {
    const s = freshState(),
      food = s.level.objects.find((o) => o.supportId)!;
    expect(s.level.objectSlots.has(food.supportId!)).toBe(true);
    s.hole.radius = 2;
    s.hole.position.copy(food.position);
    s.hole.position.y = 0;
    expect(capture(food, s.hole)).toBe(true);
    expect(advanceFall(food, 0)!.y).toBe(0.77);
    advanceFall(food, 4);
    expect(complete(s, food)).toBe(true);
    expect(s.score.points).toBe(food.scoreValue);
    expect(s.level.objectSlots.has(food.supportId!)).toBe(true);
  });
  it("animals flee 25% faster and oversized people keep their walking speed", () => {
    const s = freshState(),
      cat = s.level.objects.find((o) => o.type === "cat")!,
      person = s.level.objects.find((o) => o.type === "person" && o.motion)!;
    s.hole.position.copy(cat.position);
    const baseline = cat.motion!.speed;
    updateTraffic([cat], 0.01, 1, s.hole);
    expect(cat.motion!.speed).toBeCloseTo(baseline * 1.25);
    s.hole.position.set(0, 0, 0);
    updateTraffic([cat], 0.01, 1, s.hole);
    expect(cat.motion!.speed).toBeCloseTo(baseline);
    s.hole.position.copy(person.position);
    const walking = person.motion!.speed;
    updateTraffic([person], 0.01, 1, s.hole);
    expect(person.motion!.speed).toBe(walking);
    s.hole.radius = 1;
    updateTraffic([person], 0.01, 1, s.hole);
    expect(person.motion!.speed).toBeCloseTo(walking * 1.25);
  });
});
