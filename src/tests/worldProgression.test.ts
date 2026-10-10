import { describe, it, expect } from "vitest";
import { freshState } from "../game/Game";
import { complete } from "../physics/swallowing";
import { advanceWorld, createLandscape } from "../world/WorldProgression";
import type { GameState, SwallowableObject } from "../game/GameState";
import { createObjectVisual } from "../world/SwallowableObject";

import { SelfPlayer } from "../testing/SelfPlayer";
import { moveToward, clampHole } from "../player/Hole";
import { updateBoosts } from "../game/boosts";
import { stages } from "../game/constants";
import { capture } from "../physics/swallowing";
import { advanceFall } from "../physics/falling";
import { resolveOversizedCollisions } from "../physics/collisions";
import { Mesh } from "three";
const eat = (s: GameState, o: SwallowableObject) => {
  if (o.state === "swallowed") return;
  o.state = "falling";
  complete(s, o);
};
describe("city to country progression", () => {
  it("eats a block and its remaining contents exactly once", () => {
    const s = freshState(),
      block = s.level.objects.find((o) => o.members?.length)!;
    const expected =
      block.scoreValue +
      block.members!.reduce(
        (sum, o) => sum + Math.round(o.scoreValue * 0.1),
        0,
      );
    const count = block.members!.length + 1;
    eat(s, block);
    expect(s.score.points).toBe(expected);
    expect(s.score.swallowedObjects).toBe(count);
    expect(complete(s, block)).toBe(false);
    expect(
      block.members!.every(
        (o) => o.state === "swallowed" && !s.level.objectSlots.has(o.id),
      ),
    ).toBe(true);
  });
  it("reveals a fixed world without generation, teleportation or growth reset", () => {
    const s = freshState();
    s.areaStage = 3;
    s.hole.radius = 80;
    const ids = new Set(s.level.objects.map((o) => o.id)),
      position = s.hole.position.clone(),
      offset = s.growthOffset;
    for (const o of [...s.level.objects])
      if (o.worldRing === 1 && !o.collisionOnly) eat(s, o);
    s.hole.radius = 80;
    expect(advanceWorld(s)).toBe(true);
    expect(s.world.phase).toBe("metropolis");
    expect(s.level.bounds).toBe(3400);
    expect(s.hole.position).toEqual(position);
    expect(s.growthOffset).toBe(offset);
    for (const o of s.level.objects) expect(ids.has(o.id)).toBe(true);
    for (const o of [...s.level.objects])
      if (o.worldRing === 2 && !o.collisionOnly) eat(s, o);
    expect(advanceWorld(s)).toBe(true);
    expect(s.world.phase).toBe("planet");
    expect(s.level.bounds).toBe(3400);
    expect(s.hole.position).toEqual(position);
    expect(s.growthOffset).toBe(offset);
    for (const o of [...s.level.objects]) if (!o.collisionOnly) eat(s, o);
    expect(s.status).toBe("won");
    expect(s.score.remainingObjects).toBe(0);
  });
  it("gives every landscape object real visible geometry", () => {
    const s = freshState();
    for (const o of [
      ...createLandscape(s).objects,
      ...createLandscape(s, true).objects,
    ]) {
      const visual = createObjectVisual(o);
      expect(visual.children.some((c) => c instanceof Mesh)).toBe(true);
    }
  });
});
it("keeps the enlarged landscape grid free of overlapping footprints", () => {
  const s = freshState(),
    objects = s.level.objects.filter((o) => o.worldRing === 3);
  expect(objects.length).toBe(160);
  for (let i = 0; i < objects.length; i++)
    for (let j = i + 1; j < objects.length; j++)
      expect(
        objects[i].position.distanceTo(objects[j].position) + 1e-6,
      ).toBeGreaterThanOrEqual(objects[i].radius + objects[j].radius);
});
