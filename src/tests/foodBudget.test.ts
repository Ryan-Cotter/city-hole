import { describe, it, expect } from "vitest";
import { freshState } from "../game/Game";
import { categories, stages } from "../game/constants";
import { updateBoosts } from "../game/boosts";
import { seedFoodBudget, availableFoodPoints } from "../game/foodBudget";
import { updateTraffic } from "../world/traffic";

describe("growth food reserves and scurrying bugs", () => {
  it("seeds independent 150 percent budgets once, with deterministic positions", () => {
    const s = freshState(),
      other = freshState();
    for (const [i, row] of s.level.densityPlan!.entries()) {
      const objects = s.level.objects.filter((o) =>
        o.id.startsWith(`seed-food-${i}-`),
      );
      expect(
        objects.reduce((sum, o) => sum + o.scoreValue, 0),
        row.type,
      ).toBeGreaterThanOrEqual(row.requiredPoints);
    }
    const count = s.level.objects.length;
    seedFoodBudget(s);
    expect(s.level.objects).toHaveLength(count);
    expect(s.level.objects.map((o) => [o.id, o.position.toArray()])).toEqual(
      other.level.objects.map((o) => [o.id, o.position.toArray()]),
    );
  });
  it("triples microscopic food in non-overlapping irregular patches", () => {
    const s = freshState();
    for (let i = 0; i < 5; i++) {
      const row = s.level.densityPlan![i];
      const objects = s.level.objects.filter((o) =>
        o.id.startsWith(`seed-food-${i}-`),
      );
      expect(objects.length).toBe(
        Math.ceil(row.requiredPoints / objects[0].scoreValue) * 3,
      );
      const radii = objects.map((o) => Math.hypot(o.position.x, o.position.z));
      expect(Math.max(...radii) - Math.min(...radii)).toBeGreaterThan(
        objects[0].radius * 2,
      );
      for (let a = 0; a < objects.length; a++)
        for (let b = a + 1; b < objects.length; b++)
          expect(
            objects[a].position.distanceTo(objects[b].position),
          ).toBeGreaterThanOrEqual(objects[a].radius * 2);
    }
    const other = freshState(1);
    expect(
      s.level.objects.find((o) => o.id === "seed-food-0-0")!.position.toArray(),
    ).not.toEqual(
      other.level.objects
        .find((o) => o.id === "seed-food-0-0")!
        .position.toArray(),
    );
  });
  it("mixes early size tiers across interiors without overlapping their colliders", () => {
    const s = freshState();
    const items = s.level.objects.filter((o) => o.id.startsWith("seed-food-"));
    for (let a = 0; a < items.length; a++)
      for (let b = a + 1; b < items.length; b++)
        expect(
          items[a].position.distanceTo(items[b].position),
          `${items[a].id} / ${items[b].id}`,
        ).toBeGreaterThanOrEqual(items[a].radius + items[b].radius);
    for (let i = 0; i < 5; i++) {
      const radii = items
        .filter((o) => o.id.startsWith(`seed-food-${i}-`))
        .map((o) => o.position.length());
      // A filled patch must span a meaningful fraction of its footprint, not a jittered ring.
      expect(Math.min(...radii) / Math.max(...radii)).toBeLessThan(0.75);
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
