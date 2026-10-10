import { describe, it, expect } from "vitest";
import { Vector3 } from "three";
import { SelfPlayer, findPath, edibleClusters } from "../testing/SelfPlayer";
import { freshState } from "../game/Game";
import { moveToward } from "../player/Hole";
import { capture, complete } from "../physics/swallowing";
import { advanceFall } from "../physics/falling";
import {
  categories,
  stages,
  progressionConfig,
  cameraConfig,
  config,
} from "../game/constants";
import { cameraViewSize } from "../render/Camera";

describe("self play and pacing", () => {
  it("routes around oversized footprints without cutting occupied corners", () => {
    const path = findPath(
      new Vector3(-5, 0, 0),
      new Vector3(5, 0, 0),
      10,
      [{ x: 0, z: 0, half: 2 }],
      1,
    );
    expect(path.length).toBeGreaterThan(0);
    expect(path.some((p) => Math.abs(p.z) > 2)).toBe(true);
    expect(path.every((p) => Math.abs(p.x) > 2 || Math.abs(p.z) > 2)).toBe(
      true,
    );
    expect(path.at(-1)!.equals(new Vector3(5, 0, 0))).toBe(true);
    expect(
      findPath(
        new Vector3(-5, 0, 0),
        new Vector3(5, 0, 0),
        10,
        [{ x: 0, z: 0, half: 20 }],
        1,
      ),
    ).toEqual([]);
  });
  it("uses log2 incremental requirements and a 25% movement camera pullback", () => {
    for (let i = 1; i < stages.length; i++)
      expect(stages[i].points - stages[i - 1].points).toBe(
        Math.ceil(progressionConfig.baseLevelCost * Math.log2(i + 1)),
      );
    expect(cameraViewSize(config.baseRadius, false)).toBeCloseTo(
      cameraConfig.baseView + config.baseRadius * cameraConfig.radiusScale,
    );
    expect(cameraViewSize(2, true) / cameraViewSize(2, false)).toBeCloseTo(
      1.25,
    );
  });
  it("adds persistent spaced crowds, dumpsters and clustered starter points", () => {
    const state = freshState();
    expect(
      state.level.objects.filter((o) => o.design === "dumpster").length,
    ).toBeGreaterThanOrEqual(36);
    const standing = state.level.objects.filter(
      (o) => o.type === "person" && !o.motion,
    );
    expect(standing).toHaveLength(144);
    for (const block of state.level.blocks) {
      const crowd = standing.filter(
        (o) =>
          Math.abs(o.position.x - block.x) < 2 &&
          Math.abs(o.position.z - block.z - 5.05) < 0.1,
      );
      expect(crowd).toHaveLength(4);
      expect(crowd[0].position.distanceTo(crowd[1].position)).toBeGreaterThan(
        0.8,
      );
      const dumpster = state.level.objects.find(
        (o) =>
          o.design === "dumpster" &&
          Math.abs(o.position.x - block.x + 6.35) < 0.1 &&
          Math.abs(o.position.z - block.z - 2.3) < 0.1,
      )!;
      expect(
        state.level.objects.filter(
          (o) =>
            o.type === "litter" && o.position.distanceTo(dumpster.position) < 2,
        ).length,
      ).toBeGreaterThan(0);
    }
    expect(
      state.level.objects.filter(
        (o) => o.type === "litter" && o.position.length() < 3.5,
      ).length,
    ).toBeGreaterThanOrEqual(24);
  });
  it("harvests eligible clusters and grows without teleports or score cheats", () => {
    const state = freshState(),
      player = new SelfPlayer();
    player.enabled = true;
    const initial = edibleClusters(state);
    expect(initial.length).toBeGreaterThan(0);
    expect(
      initial.every((g) =>
        g.objects.every((o) => o.radius <= state.hole.radius * 0.85),
      ),
    ).toBe(true);
    for (let step = 0; step < 600; step++) {
      const before = state.hole.position.clone();
      moveToward(
        state.hole,
        player.target(state, 0.1),
        0.1,
        state.level.bounds,
      );
      expect(state.hole.position.distanceTo(before)).toBeLessThanOrEqual(
        0.320001,
      );
      for (const o of state.level.objects) {
        capture(o, state.hole);
        if (o.state === "falling" && advanceFall(o, 0.1)!.u >= 1)
          complete(state, o);
      }
      if (state.hole.level >= 9) break;
    }
    expect(state.hole.level).toBeGreaterThanOrEqual(9);
    expect(state.score.points).toBeGreaterThanOrEqual(stages[8].points);
    expect(state.score.points).toBe(
      Object.entries(state.score.byType).reduce(
        (sum, [type, count]) =>
          sum + count * categories[type as keyof typeof categories].scoreValue,
        0,
      ),
    );
    player.enabled = false;
    expect(player.target(state, 0.1)).toBeNull();
  }, 30000);
});
