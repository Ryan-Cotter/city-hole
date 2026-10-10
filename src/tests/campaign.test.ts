import { describe, it, expect, vi } from "vitest";
import { freshState, Game } from "../game/Game";
import { activateBoost, updateBoosts } from "../game/boosts";
import { boostConfig, themeForCity } from "../game/campaign";
import { growthForPoints, growthPoints } from "../game/progression";
import { stages } from "../game/constants";
import { createObjectVisual } from "../world/SwallowableObject";
import { Mesh } from "three";

describe("campaign and boosts", () => {
  it("does not skip straight to toys after the first level", () => {
    expect(stages[1].points).toBeGreaterThanOrEqual(16);
    expect(stages[1].radius * 0.85).toBeLessThan(0.095);
  });
  it("keeps the percentage toward the following level on an instant size pickup", () => {
    const s = freshState();
    s.score.points = 8;
    const before = growthForPoints(growthPoints(s));
    const fraction =
      (growthPoints(s) - before.threshold) /
      (before.nextThreshold - before.threshold);
    expect(activateBoost(s, "size")).toBe(true);
    const after = growthForPoints(growthPoints(s));
    expect(after.level).toBe(before.level + 1);
    expect(
      (growthPoints(s) - after.threshold) /
        (after.nextThreshold - after.threshold),
    ).toBeCloseTo(fraction);
    expect(s.score.points).toBe(8);
    expect(activateBoost(s, "speed")).toBe(true);
    expect(s.hole.speedMultiplier).toBe(boostConfig.speedMultiplier);
    s.elapsedSeconds = boostConfig.duration;
    updateBoosts(s);
    expect(s.hole.speedMultiplier).toBe(1);
    expect(s.hole.level).toBe(after.level);
  });
  it("advances only a cleared city, with a new seed and replenished boosts", () => {
    const s = freshState(),
      restart = vi.fn();
    const game = { state: s, restart } as unknown as Game;
    Game.prototype.nextCity.call(game);
    expect(restart).not.toHaveBeenCalled();
    s.status = "won";
    s.world.phase = "planet";
    Game.prototype.nextCity.call(game);
    expect(restart).toHaveBeenCalledWith(1);
    const next = freshState(1);
    expect(next.level.seed).not.toBe(s.level.seed);
    expect(next.areaStage).toBe(1);
    expect(next.score.points).toBe(0);
    expect(next.boosts.speedUntil).toBe(0);
    expect([0, 1, 2, 3].map((i) => themeForCity(i).name)).toEqual([
      "Medieval",
      "Industrial",
      "Modern",
      "Futuristic",
    ]);
  });
  it("builds distinct era models and replaces fence posts with luminous dashes", () => {
    const base = freshState().level.objects.find((o) => o.type === "house")!;
    const signatures = [0, 1, 2, 3].map((cityIndex) => {
      const visual = createObjectVisual({ ...base, cityIndex });
      return visual.children
        .map((o) =>
          o instanceof Mesh
            ? `${o.geometry.type}:${o.position.y}:${o.scale.y}`
            : o.type,
        )
        .join("|");
    });
    expect(new Set(signatures).size).toBe(4);
    const gate = freshState().level.objects.find((o) => o.unlockStage === 2)!;
    const visual = createObjectVisual(gate);
    expect(visual.getObjectByName("glowing-border")).toBeDefined();
    expect(visual.children).toHaveLength(2);
  });
});
