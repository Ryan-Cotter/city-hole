import { describe, it, expect } from "vitest";
import { freshState } from "../game/Game";
import { categories, stages } from "../game/constants";
import { updateBoosts } from "../game/boosts";
import { ensureFoodBudget, availableFoodPoints } from "../game/foodBudget";
import { updateTraffic } from "../world/traffic";

describe("growth food reserves and scurrying bugs", () => {
  it("provides 150 percent of every required growth step without seeding tiny props in larger maps", () => {
    const s = freshState();
    for (let i = 0; i < stages.length - 1; i++) {
      const stage = stages[i];
      if (stage.type === "cityBlock") continue;
      s.level.objects = [];
      s.level.objectSlots.clear();
      s.score.remainingObjects = 0;
      s.growthOffset = -stage.points;
      s.areaStage =
        categories[stage.type].radius <= categories.mouse.radius ? 1 : 3;
      s.world.phase =
        categories[stage.type].radius < categories.cityBlock.radius
          ? "city"
          : stage.type === "wholeCity"
            ? "planet"
            : "country";
      s.level.bounds = s.world.phase === "city" ? 60 : 600;
      updateBoosts(s);
      const added = ensureFoodBudget(s);
      expect(availableFoodPoints(s), stage.type).toBeGreaterThanOrEqual(
        Math.ceil((stages[i + 1].points - stage.points) * 1.5),
      );
      expect(new Set(s.level.objects.map((o) => o.id)).size).toBe(
        s.level.objects.length,
      );
      if (s.world.phase !== "city")
        expect(added.every((o) => o.radius >= 18)).toBe(true);
      expect(ensureFoodBudget(s), stage.type).toHaveLength(0);
    }
  });
  it("makes bugs change direction and scurry on both ground axes", () => {
    const s = freshState(),
      bug = s.level.objects.find((o) => o.critter)!;
    const start = bug.position.clone(),
      headings = new Set<number>();
    let xTravel = 0,
      zTravel = 0;
    for (let frame = 0; frame < 100; frame++) {
      const before = bug.position.clone();
      updateTraffic([bug], 0.1, frame * 0.1, s.hole);
      xTravel += Math.abs(bug.position.x - before.x);
      zTravel += Math.abs(bug.position.z - before.z);
      expect(bug.position.distanceTo(before)).toBeLessThanOrEqual(0.027);
      headings.add(Math.round(bug.orientation * 10));
    }
    expect(xTravel).toBeGreaterThan(0.1);
    expect(zTravel).toBeGreaterThan(0.1);
    expect(headings.size).toBeGreaterThan(10);
    expect(bug.position.distanceTo(start)).toBeLessThan(1.5);
  });
});
