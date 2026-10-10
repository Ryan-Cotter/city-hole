import { afterEach, describe, expect, it, vi } from "vitest";
import { Vector3 } from "three";
import { rimColorForLevel, rimColors } from "../render/holeEdge";
import { startLoop } from "../game/loop";
import {
  resolveOversizedCollisions,
  obstacleRadius,
} from "../physics/collisions";
import { freshState } from "../game/Game";
import { updateTraffic, separateAnimals } from "../world/traffic";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("background simulation and solid objects", () => {
  it("cycles the rim through the rainbow and repeats after seven levels", () => {
    expect(rimColorForLevel(1)).toBe("#f44747");
    for (let level = 1; level <= 21; level++)
      expect(rimColorForLevel(level)).toBe(rimColors[(level - 1) % 7]);
  });
  it("continues hidden self-play without rendering and respects explicit pause", () => {
    vi.useFakeTimers();
    let hidden = true,
      active = true,
      now = 0;
    vi.stubGlobal("document", {
      get hidden() {
        return hidden;
      },
      addEventListener: vi.fn(),
    });
    vi.stubGlobal("performance", { now: () => now });
    vi.stubGlobal("requestAnimationFrame", vi.fn());
    const update = vi.fn(),
      render = vi.fn();
    startLoop(update, render, () => active);
    now = 1000;
    vi.advanceTimersByTime(1000);
    expect(
      update.mock.calls.reduce((sum, args) => sum + args[0], 0),
    ).toBeCloseTo(1);
    expect(render).not.toHaveBeenCalled();
    active = false;
    update.mockClear();
    now = 2000;
    vi.advanceTimersByTime(1000);
    expect(update).not.toHaveBeenCalled();
    hidden = false;
  });
  it("blocks oversized footprints but lets edible items pass into the hole", () => {
    const s = freshState(),
      object = s.level.objects.find((o) => o.type === "toy")!;
    object.position.set(0, 0, 0);
    const before = new Vector3(-0.3, 0, 0);
    s.hole.position.set(0.3, 0, 0);
    resolveOversizedCollisions(s.hole, before, [object]);
    expect(s.hole.position.x).toBeLessThanOrEqual(-obstacleRadius(object));
    s.hole.radius = 0.3;
    s.hole.position.set(0, 0, 0);
    resolveOversizedCollisions(s.hole, before, [object]);
    expect(s.hole.position.x).toBeCloseTo(0);
  });
  it("separates cats even when their walking lanes differ", () => {
    const s = freshState(),
      cats = s.level.objects.filter((o) => o.type === "cat").slice(0, 3);
    cats.forEach((o, i) => {
      o.position.set(i * 0.03, 0, i * 0.02);
      o.motion = {
        axis: "x",
        direction: i % 2 ? 1 : -1,
        speed: 0.6,
        min: -2,
        max: 2,
      };
    });
    for (let step = 0; step < 20; step++) separateAnimals(cats);
    for (let i = 0; i < cats.length; i++)
      for (let j = i + 1; j < cats.length; j++)
        expect(cats[i].position.distanceTo(cats[j].position)).toBeGreaterThan(
          (cats[i].radius + cats[j].radius) * 0.85,
        );
  });
  it("lets unthreatened people and animals wander", () => {
    const s = freshState();
    const actors = ["person", "mouse", "cat", "dog"].map(
      (type) => s.level.objects.find((o) => o.type === type)!,
    );
    actors.forEach((o) => (o.motion = null));
    const positions = actors.map((o) => o.position.clone());
    updateTraffic(actors, 0.1, 0);
    actors.forEach((actor, i) => {
      expect(actor.motion).not.toBeNull();
      expect(actor.position.distanceTo(positions[i])).toBeGreaterThan(0);
    });
  });
});
