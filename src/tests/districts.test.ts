import { describe, it, expect } from "vitest";
import { freshState } from "../game/Game";
import { districtProfiles, assignDistrict } from "../world/Districts";
import { createObjectVisual } from "../world/SwallowableObject";
import { categories } from "../game/constants";
import type { District } from "../game/GameState";
describe("functional district buildings and props", () => {
  it("covers five block functions and five prop scales without changing rewards", () => {
    const s = freshState();
    expect(new Set(s.level.blocks.map((b) => b.district)).size).toBe(5);
    for (const district of Object.keys(districtProfiles) as District[]) {
      const models = new Set<string>();
      for (const type of [
        "bottlecap",
        "coin",
        "litter",
        "hydrant",
        "table",
      ] as const) {
        const o = {
          ...s.level.objects.find((o) => o.type === type)!,
          motion: null,
          critter: false,
          supportId: undefined,
          design: "test",
          ...categories[type],
        };
        const points = o.scoreValue;
        assignDistrict(o, district);
        expect(o.scoreValue).toBe(points);
        expect(o.districtProp).toBeDefined();
        const model = createObjectVisual(o);
        expect(model.children.length).toBeGreaterThan(0);
        models.add(o.districtProp!);
      }
      expect(models.size).toBeGreaterThanOrEqual(4);
      expect(
        s.level.objects.some((o) => o.members && o.district === district),
      ).toBe(true);
    }
  });
  it("gives each function a different main-building silhouette", () => {
    const base = freshState().level.objects.find((o) => o.type === "building")!;
    const signatures = new Set(
      Object.keys(districtProfiles).map((district) => {
        const model = createObjectVisual({
          ...base,
          district: district as District,
          cityIndex: 2,
        });
        return model.children
          .map((c) => `${c.type}:${c.position.toArray()}:${c.scale.toArray()}`)
          .join("|");
      }),
    );
    expect(signatures.size).toBe(5);
  });
});
