import { describe, it, expect } from "vitest";
import { freshState } from "../game/Game";
import { complete } from "../physics/swallowing";
import { advanceWorld, createLandscape } from "../world/WorldProgression";
import type { GameState, SwallowableObject } from "../game/GameState";
import { createObjectVisual } from "../world/SwallowableObject";
import { ensureFoodBudget } from "../game/foodBudget";
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
      block.members!.reduce((sum, o) => sum + o.scoreValue, 0);
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
  it("expands once at 80 percent, then moves to landscapes and countries", () => {
    const s = freshState();
    s.areaStage = 3;
    expect(advanceWorld(s)).toBe(false);
    for (const o of [...s.level.objects]) {
      if (s.score.swallowedObjects >= s.world.initialCount * 0.8) break;
      eat(s, o);
    }
    const existing = new Set(s.level.objects.map((o) => o.id));
    expect(advanceWorld(s)).toBe(true);
    expect(s.world.phase).toBe("metropolis");
    expect(s.level.bounds).toBe(180);
    const added = s.level.objects.filter((o) => !existing.has(o.id));
    expect(added.length).toBeGreaterThan(500);
    expect(
      added.every((o) =>
        [
          "house",
          "shop",
          "building",
          "largeBuilding",
          "skyscraper",
          "cityBlock",
        ].includes(o.type),
      ),
    ).toBe(true);
    expect(advanceWorld(s)).toBe(false);
    for (const o of [...s.level.objects]) eat(s, o);
    expect(advanceWorld(s)).toBe(true);
    expect(s.world.phase).toBe("country");
    expect(s.level.objects.some((o) => o.type === "river")).toBe(true);
    expect(s.level.objects.some((o) => o.type === "mountain")).toBe(true);
    for (const o of [...s.level.objects]) eat(s, o);
    expect(advanceWorld(s)).toBe(true);
    expect(s.world.phase).toBe("planet");
    expect(s.level.objects.some((o) => o.type === "country")).toBe(true);
    for (const o of [...s.level.objects]) eat(s, o);
    expect(advanceWorld(s)).toBe(false);
    expect(s.status).toBe("won");
    expect(s.score.remainingObjects).toBe(0);
  });
  it("self-play can finish the country and planet maps", () => {
    const s = freshState(),
      pilot = new SelfPlayer();
    pilot.enabled = true;
    s.level = createLandscape(s);
    s.world.phase = "country";
    s.areaStage = 3;
    s.score.remainingObjects = s.level.objects.length;
    s.growthOffset = -stages.find((stage) => stage.type === "river")!.points;
    s.hole.position.set(-270, 0, -270);
    updateBoosts(s);
    let budgetLevel = 0;
    for (let step = 0; step < 12000 && s.status !== "won"; step++) {
      s.elapsedSeconds += 0.1;
      updateBoosts(s);
      if (budgetLevel !== s.hole.level) {
        ensureFoodBudget(s);
        budgetLevel = s.hole.level;
      }
      const previous = s.hole.position.clone();
      moveToward(s.hole, pilot.target(s, 0.1), 0.1, s.level.bounds);
      resolveOversizedCollisions(s.hole, previous, s.level.objects);
      for (const o of [...s.level.objects]) {
        capture(o, s.hole);
        if (o.state === "falling" && advanceFall(o, 0.1)!.u >= 1)
          complete(s, o);
      }
      if (advanceWorld(s)) pilot.reset();
      clampHole(s.hole, s.level.bounds);
    }
    expect(
      s.world.phase,
      JSON.stringify({
        radius: s.hole.radius,
        remaining: s.score.remainingObjects,
        position: s.hole.position,
        goal: pilot.goal?.id,
        path: pilot.path.length,
      }),
    ).toBe("planet");
    expect(
      s.score.remainingObjects,
      JSON.stringify({
        phase: s.world.phase,
        radius: s.hole.radius,
        pos: s.hole.position,
        goal: pilot.goal?.id,
        path: pilot.path.length,
        remaining: s.level.objects
          .filter((o) => o.type === "wholeCity")
          .map((o) => ({ p: o.position, state: o.state })),
      }),
    ).toBe(0);
    expect(s.status).toBe("won");
  }, 30000);
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
