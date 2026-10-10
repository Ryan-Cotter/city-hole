import { describe, it, expect } from "vitest";
import { generateCity } from "../world/CityGenerator";
import { CityChunks } from "../world/CityChunks";
import {
  categories,
  config,
  stages,
  progressionConfig,
} from "../game/constants";

describe("unloaded city blocks", () => {
  it("queries every stationary capture candidate including chunk boundaries", () => {
    const city = generateCity(),
      chunks = new CityChunks(city.objects);
    for (const [x, z, radius] of [
      [0, 0, 0.25],
      [-20, 20, 4],
      [59, -59, 6],
      [0, 0, 150],
    ]) {
      const nearby = new Set(chunks.nearby(x, z, radius));
      for (const o of city.objects.filter(
        (o) =>
          !o.motion && Math.hypot(o.position.x - x, o.position.z - z) <= radius,
      ))
        expect(nearby.has(o)).toBe(true);
    }
    expect(chunks.nearby(0, 0, 0.25).length).toBeLessThan(
      city.objects.length / 4,
    );
  });
  it("retains identity and completion state when a block is revisited", () => {
    const chunks = new CityChunks(generateCity().objects);
    const o = chunks.nearby(-50, -50, 2)[0];
    o.state = "swallowed";
    chunks.nearby(50, 50, 2);
    expect(
      chunks.nearby(-50, -50, 2).find((candidate) => candidate.id === o.id),
    ).toBe(o);
    expect(o.state).toBe("swallowed");
  });
  it("restores growth while preserving eligibility at every stage", () => {
    for (const stage of stages)
      expect(stage.radius * config.swallowFactor).toBeGreaterThanOrEqual(
        categories[stage.type].radius,
      );
    expect(progressionConfig.extraRadiusStep).toBe(0.7);
  });
});
