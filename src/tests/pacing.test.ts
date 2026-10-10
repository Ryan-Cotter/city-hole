import { describe, expect, it } from "vitest";
import { freshState } from "../game/Game";
import { enablePacing, advanceGrowth, pacingConfig } from "../game/pacing";
import { growthPoints } from "../game/progression";
import { stages } from "../game/constants";
import { updateBoosts, activateBoost } from "../game/boosts";
import { complete } from "../physics/swallowing";
import { advanceWorld } from "../world/WorldProgression";

describe("earned growth pacing", () => {
  it("banks a large reward without skipping several sizes or creating unearned progress", () => {
    const s = freshState();
    enablePacing(s);
    advanceGrowth(s, 100);
    expect(growthPoints(s)).toBe(0);
    s.score.points = 1000000;
    for (let n = 0; n < 240; n++) {
      advanceGrowth(s, 1 / 60);
      updateBoosts(s);
    }
    expect(s.hole.level).toBe(1);
    for (let n = 0; n < 60; n++) {
      advanceGrowth(s, 1 / 60);
      updateBoosts(s);
    }
    expect(s.hole.level).toBe(2);
    expect(s.score.points).toBe(1000000);
    expect(growthPoints(s)).toBeLessThan(stages[2].points);
    expect(pacingConfig.secondsPerSize).toBeGreaterThanOrEqual(4);
  });
  it("keeps a current size boost instant and preserves fractional progress", () => {
    const s = freshState();
    s.score.points = stages[1].points * 0.5;
    enablePacing(s);
    activateBoost(s, "size");
    expect(s.hole.level).toBe(2);
    expect(
      (growthPoints(s) - stages[1].points) /
        (stages[2].points - stages[1].points),
    ).toBeCloseTo(0.5);
  });
  it("old miniature size pickups cannot jump late-game levels", () => {
    const s = freshState();
    s.score.points = 35000000;
    updateBoosts(s);
    enablePacing(s);
    const level = s.hole.level;
    const pickup = s.level.objects.find((o) => o.pickup === "size")!;
    pickup.state = "falling";
    complete(s, pickup);
    expect(s.hole.level).toBe(level);
    expect(s.score.byType[pickup.type]).toBe(1);
  });
  it("rebases earned progress when changing map scale", () => {
    const s = freshState();
    enablePacing(s);
    s.world.phase = "metropolis";
    s.score.remainingObjects = 0;
    expect(advanceWorld(s)).toBe(true);
    expect(growthPoints(s)).toBe(
      stages.find((x) => x.type === "river")!.points,
    );
    expect(s.hole.level).toBe(stages.findIndex((x) => x.type === "river") + 1);
  });
});
