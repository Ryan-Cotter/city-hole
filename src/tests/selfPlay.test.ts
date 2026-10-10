import { describe, it, expect } from "vitest";
import { Vector3 } from "three";
import { SelfPlayer, findPath, edibleClusters } from "../testing/SelfPlayer";
import { freshState } from "../game/Game";
import { moveToward, clampHole, speedForRadius } from "../player/Hole";
import { capture, complete } from "../physics/swallowing";
import { advanceFall } from "../physics/falling";
import {
  categories,
  stages,
  progressionConfig,
  cameraConfig,
  config,
} from "../game/constants";
import { resolveOversizedCollisions } from "../physics/collisions";
import { updateTraffic } from "../world/traffic";
import { updateBoosts } from "../game/boosts";
import { activeBounds, isUnlocked } from "../game/sections";
import { cameraViewSize } from "../render/Camera";

describe("self play and pacing", () => {
  it("keeps elevated targets and edge waypoints on reachable ground", () => {
    const state = freshState(),
      player = new SelfPlayer();
    player.enabled = true;
    const goal = state.level.objects.find((o) => o.type === "bottlecap")!;
    player.target(state, 0.1);
    player.goal = goal;
    goal.position.set(2.99, 0.77, 0);
    player.path = [new Vector3(3.2, 0, 0), goal.position.clone()];
    state.hole.position.set(3 - state.hole.radius * 0.7, 0, 0);
    const target = player.target(state, 0.1)!;
    expect(target.y).toBe(0);
    expect(target.x).toBeLessThanOrEqual(3 - state.hole.radius * 0.7);
    expect(player.path).toHaveLength(1);
    moveToward(state.hole, target, 0.1, 3);
    expect(state.hole.position.y).toBe(0);
  });
  it("abandons a stalled target and chooses another instead of freezing", () => {
    const state = freshState(),
      player = new SelfPlayer();
    player.enabled = true;
    player.target(state, 0.1);
    const stuckGoal = player.goal;
    expect(stuckGoal).not.toBeNull();
    // Simulate a blocked route: frames continue but the hole cannot advance.
    for (let i = 0; i < 22; i++) player.target(state, 0.1);
    expect(player.goal).not.toBeNull();
    expect(player.goal).not.toBe(stuckGoal);
    expect(player.path.length).toBeGreaterThan(0);
  });
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
        Math.ceil(
          Math.max(
            progressionConfig.baseLevelCost * Math.log2(i + 1),
            Object.values(categories)[i - 1].scoreValue *
              progressionConfig.objectsPerTier,
          ),
        ),
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
  it.each([0, 1, 2, 3])(
    "harvests eligible clusters in campaign city %i without score cheats",
    (cityIndex) => {
      const state = freshState(cityIndex),
        player = new SelfPlayer();
      player.enabled = true;
      const initial = edibleClusters(state);
      expect(initial.length).toBeGreaterThan(0);
      expect(
        initial.every((g) =>
          g.objects.every((o) => o.radius <= state.hole.radius * 0.85),
        ),
      ).toBe(true);
      let yardSeconds = 0;
      for (let step = 0; step < 6000; step++) {
        state.elapsedSeconds += 0.1;
        updateBoosts(state);
        clampHole(state.hole, activeBounds(state));
        const before = state.hole.position.clone();
        moveToward(
          state.hole,
          player.target(state, 0.1),
          0.1,
          activeBounds(state),
        );
        expect(state.hole.position.distanceTo(before)).toBeLessThanOrEqual(
          speedForRadius(state.hole.radius) *
            (state.hole.speedMultiplier ?? 1) *
            0.1 +
            0.00001,
        );
        resolveOversizedCollisions(
          state.hole,
          before,
          state.level.objects.filter((o) => isUnlocked(state, o)),
        );
        updateTraffic(
          state.level.objects.filter(
            (o) =>
              isUnlocked(state, o) &&
              (o.motion || ["person", "mouse", "cat", "dog"].includes(o.type)),
          ),
          0.1,
          step * 0.1,
          state.hole,
        );
        for (const o of state.level.objects) {
          if (isUnlocked(state, o)) capture(o, state.hole);
          if (o.state === "falling" && advanceFall(o, 0.1)!.u >= 1)
            complete(state, o);
        }
        if (!yardSeconds && state.areaStage > 1) yardSeconds = step * 0.1;
        if (state.areaStage === 3) break;
      }
      expect(
        state.areaStage,
        `city ${cityIndex}, level ${state.hole.level}, points ${state.score.points}`,
      ).toBe(3);
      expect(yardSeconds).toBeGreaterThan(45);
      expect(yardSeconds).toBeLessThan(300);
      expect(state.hole.level).toBeGreaterThanOrEqual(9);
      expect(state.score.points).toBeGreaterThanOrEqual(stages[8].points);
      expect(state.score.points).toBe(
        state.level.totalScore -
          state.level.objects.reduce((sum, o) => sum + o.scoreValue, 0),
      );
      player.enabled = false;
      expect(player.target(state, 0.1)).toBeNull();
    },
    30000,
  );
});
