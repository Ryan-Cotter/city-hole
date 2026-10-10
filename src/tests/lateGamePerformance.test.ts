import { describe, it, expect } from "vitest";
import { freshState } from "../game/Game";
import { growthForPoints } from "../game/progression";
import { stages, categories, crowdConfig } from "../game/constants";
import {
  isSolidObstacle,
  resolveOversizedCollisions,
} from "../physics/collisions";
import { SelfPlayer } from "../testing/SelfPlayer";
import { moveToward } from "../player/Hole";
import { isUnlocked, activeBounds } from "../game/sections";
import { CrowdScheduler } from "../world/CrowdScheduler";
import { advancePedestrian } from "../world/traffic";
import { capture, complete, consumeObsolete } from "../physics/swallowing";
import { advanceFall } from "../physics/falling";
import { updateBoosts } from "../game/boosts";
import { ensureFoodBudget } from "../game/foodBudget";

describe("late city growth and bounded crowd work", () => {
  it("does not jump in radius around 35 million or the block thresholds", () => {
    const before = growthForPoints(35000000 - 1),
      after = growthForPoints(35000000 + 1);
    expect(after.radius / before.radius).toBeLessThan(1.00001);
    for (const type of ["cityBlock", "river"]) {
      const threshold = stages.find((s) => s.type === type)!.points;
      expect(
        growthForPoints(threshold).radius /
          growthForPoints(threshold - 1).radius,
      ).toBeLessThan(1.00001);
    }
    const block = stages.findIndex((s) => s.type === "cityBlock");
    expect(stages[block + 1].points - stages[block].points).toBeGreaterThan(
      categories.skyscraper.scoreValue * 3,
    );
    expect(
      growthForPoints(35000000 + categories.skyscraper.scoreValue).radius /
        growthForPoints(35000000).radius,
    ).toBeLessThan(1.25);
  });
  it("keeps barriers non-edible but stops tiny barriers blocking huge holes", () => {
    const s = freshState(),
      barrier = s.level.objects.find((o) => o.collisionOnly && !o.unlockStage)!;
    s.hole.radius = barrier.radius;
    expect(isSolidObstacle(barrier, s.hole)).toBe(true);
    s.hole.radius = barrier.radius * 8;
    expect(isSolidObstacle(barrier, s.hole)).toBe(false);
    expect(capture(barrier, s.hole)).toBe(false);
  });
  it("autoplay keeps harvesting past 35 million with city barriers present", () => {
    const s = freshState(),
      pilot = new SelfPlayer();
    pilot.enabled = true;
    s.areaStage = 3;
    s.score.points = 35000000;
    updateBoosts(s);
    // Old starter boosts have already been collected by this point in a run.
    for (const o of s.level.objects) o.pickup = undefined;
    let budgetLevel = 0,
      lastHarvest = 0,
      longestStall = 0;
    for (let frame = 0; frame < 600 && s.status === "playing"; frame++) {
      s.elapsedSeconds += 0.1;
      updateBoosts(s);
      if (budgetLevel !== s.hole.level) {
        ensureFoodBudget(s);
        budgetLevel = s.hole.level;
      }
      const before = s.hole.position.clone();
      moveToward(s.hole, pilot.target(s, 0.1), 0.1, activeBounds(s));
      resolveOversizedCollisions(
        s.hole,
        before,
        s.level.objects.filter((o) => isUnlocked(s, o)),
      );
      const count = s.score.swallowedObjects;
      for (const o of [...s.level.objects]) {
        if (!isUnlocked(s, o)) continue;
        if (consumeObsolete(s, o)) continue;
        capture(o, s.hole);
        if (o.state === "falling" && advanceFall(o, 0.1)!.u >= 1)
          complete(s, o);
      }
      if (s.score.swallowedObjects > count) lastHarvest = frame;
      longestStall = Math.max(longestStall, frame - lastHarvest);
    }
    expect(s.score.swallowedObjects).toBeGreaterThan(100);
    expect(
      longestStall * 0.1,
      JSON.stringify({
        radius: s.hole.radius,
        score: s.score.points,
        offset: s.growthOffset,
        remaining: s.score.remainingObjects,
        pos: s.hole.position,
        goal: pilot.goal?.id,
        path: pilot.path,
        barriers: s.level.objects
          .filter((o) => isUnlocked(s, o) && isSolidObstacle(o, s.hole))
          .map((o) => ({ id: o.id, p: o.position })),
      }),
    ).toBeLessThan(25);
  });
  it("bounds crowd work while preserving and moving distant people", () => {
    const s = freshState(),
      scheduler = new CrowdScheduler();
    s.areaStage = 3;
    s.hole.radius = 12;
    const source = s.level.objects.find((o) => o.type === "person")!;
    const people = Array.from({ length: 1000 }, (_, i) => ({
      ...source,
      id: `load-${i}`,
      position: source.position
        .clone()
        .set((i % 40) - 20, 0, Math.floor(i / 40) + 5),
      motion: {
        axis: "x" as const,
        direction: 1,
        speed: 0.8,
        min: -50,
        max: 50,
      },
    }));
    const seen = new Set<string>();
    let calls = 0;
    for (let frame = 0; frame < 360; frame++) {
      s.elapsedSeconds += 1 / 60;
      scheduler.step(people, s, 1 / 60);
      expect(scheduler.updated.size).toBeLessThanOrEqual(
        crowdConfig.nearbyBudget + crowdConfig.distantBudget,
      );
      calls += scheduler.updated.size;
      for (const o of scheduler.updated) seen.add(o.id);
    }
    expect(calls).toBeLessThan(1000 * 360 * 0.06);
    expect(seen.size).toBe(1000);
    expect(people.every((o) => o.state === "idle")).toBe(true);
  });
  it("handles zero-length and very short patrols without an unbounded bounce loop", () => {
    const o = freshState().level.objects.find((o) => o.type === "person")!;
    o.motion = { axis: "x", direction: 1, speed: 2, min: 1, max: 1 };
    advancePedestrian(o, 1);
    expect(o.position.x).toBe(1);
    o.motion.max = 1.00001;
    advancePedestrian(o, 1000);
    expect(o.position.x).toBeGreaterThanOrEqual(1);
    expect(o.position.x).toBeLessThanOrEqual(1.00001);
  });
});
