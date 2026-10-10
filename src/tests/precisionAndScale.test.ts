import { CanvasRenderer } from "../render/CanvasRenderer";
import { createCamera, resizeCamera } from "../render/Camera";
import { describe, expect, it, vi } from "vitest";
import { Vector3, Group, Scene } from "three";
import { freshState } from "../game/Game";
import { blockScaleRadius, isUnlocked } from "../game/sections";
import { discardSmallScenery } from "../world/WorldProgression";
import { canSwallow, complete } from "../physics/swallowing";
import { ensureFoodBudget, availableFoodPoints } from "../game/foodBudget";
import { growthForPoints, growthPoints } from "../game/progression";
import { stages } from "../game/constants";
import { updateBoosts } from "../game/boosts";
import { steeringTarget } from "../input/InputManager";
import { createObjectVisual } from "../world/SwallowableObject";

describe("precise steering and delayed block scale", () => {
  it("draws the microscopic hole on its actual collision center", () => {
    let path: number[][] = [],
      outline: number[][] = [];
    const context: Record<string, unknown> = {
      beginPath: () => {
        path = [];
      },
      moveTo: (x: number, y: number) => path.push([x, y]),
      lineTo: (x: number, y: number) => path.push([x, y]),
      fill: () => {
        if (context.fillStyle === "#10122b") outline = [...path];
      },
    };
    const ctx = new Proxy(context, {
      get: (object, key: string) => object[key] ?? (() => {}),
    });
    const canvas = () => ({
      style: {},
      width: 16,
      height: 16,
      getContext: () => ctx,
    });
    vi.stubGlobal("document", { createElement: canvas });
    try {
      const renderer = new CanvasRenderer(
        canvas() as unknown as HTMLCanvasElement,
        60,
      );
      renderer.setSize(800, 600);
      const camera = createCamera();
      resizeCamera(camera, 800, 600, 0.03);
      camera.updateMatrixWorld();
      const hole = new Group();
      hole.name = "hole";
      hole.scale.setScalar(0.0015);
      const scene = new Scene();
      scene.add(hole);
      renderer.render(scene, camera);
      expect(outline.length).toBe(64);
      const center = hole.position.clone().project(camera);
      expect(outline.reduce((n, p) => n + p[0], 0) / 64).toBeCloseTo(
        (center.x + 1) * 400,
        5,
      );
      expect(outline.reduce((n, p) => n + p[1], 0) / 64).toBeCloseTo(
        (1 - center.y) * 300,
        5,
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("steers from the live center at the same speed for near and far pointers", () => {
    const center = new Vector3(3, 0, 7);
    const near = steeringTarget(center, new Vector3(3.001, 0, 7));
    const far = steeringTarget(center, new Vector3(100, 0, 7));
    expect(near.distanceTo(center)).toBeCloseTo(far.distanceTo(center));
    expect(near.clone().sub(center).normalize().toArray()).toEqual([1, 0, 0]);
    expect(
      steeringTarget(new Vector3(5, 0, 7), new Vector3(4, 0, 7)).x,
    ).toBeLessThan(5);
    expect(steeringTarget(center, center).equals(center)).toBe(true);
  });
  it("requires eight block diameters before showing or capturing a block", () => {
    const s = freshState();
    s.areaStage = 3;
    const block = s.level.objects.find((o) => o.members)!;
    s.hole.position.copy(block.position);
    s.hole.radius = blockScaleRadius - 0.001;
    expect(isUnlocked(s, block)).toBe(false);
    expect(canSwallow(block, s.hole)).toBe(false);
    s.hole.radius = blockScaleRadius;
    expect(isUnlocked(s, block)).toBe(true);
    expect(canSwallow(block, s.hole)).toBe(true);
    expect(s.hole.radius / block.radius).toBe(8);
  });
  it("retires tiny scenery once without food credit, including pending falls", () => {
    const s = freshState();
    s.areaStage = 3;
    s.hole.radius = blockScaleRadius - 0.001;
    expect(discardSmallScenery(s)).toHaveLength(0);
    s.hole.radius = blockScaleRadius;
    const points = s.score.points,
      mass = s.hole.mass,
      count = s.score.remainingObjects;
    const pending = s.level.objects.find((o) => o.type === "bacterium")!;
    pending.state = "falling";
    const removed = discardSmallScenery(s);
    expect(removed.length).toBeGreaterThan(100);
    expect(removed).toContain(pending);
    expect(s.score.points).toBe(points);
    expect(s.hole.mass).toBe(mass);
    expect(s.score.swallowedObjects).toBe(0);
    expect(s.score.remainingObjects).toBe(count - removed.length);
    expect(s.level.objects.some((o) => o.type === "skyscraper")).toBe(true);
    expect(s.level.objects.some((o) => o.collisionOnly)).toBe(true);
    expect(complete(s, pending)).toBe(false);
    expect(discardSmallScenery(s)).toHaveLength(0);
    for (const [id, index] of s.level.objectSlots)
      expect(s.level.objects[index].id).toBe(id);
  });
  it("does not award discarded members when their block finishes", () => {
    const s = freshState();
    s.hole.radius = blockScaleRadius;
    const block = s.level.objects.find((o) =>
      o.members?.some((m) => m.type === "litter"),
    )!;
    discardSmallScenery(s);
    expect(block.members!.some((o) => o.state === "discarded")).toBe(false);
    const edible = block.members!.filter((o) => o.state !== "discarded");
    block.state = "falling";
    complete(s, block);
    expect(s.score.points).toBe(
      block.scoreValue +
        edible.reduce((n, o) => n + Math.round(o.scoreValue * 0.1), 0),
    );
    expect(s.score.swallowedObjects).toBe(edible.length + 1);
  });
  it("supplies building food until the delayed block transition", () => {
    const s = freshState();
    s.areaStage = 3;
    s.world.phase = "metropolis";
    s.growthOffset = -stages.find((stage) => stage.type === "wholeCity")!
      .points;
    updateBoosts(s);
    s.level.objects = [];
    s.level.objectSlots.clear();
    const added = ensureFoodBudget(s);
    const growth = growthForPoints(growthPoints(s));
    expect(added.length).toBeGreaterThan(0);
    expect(added.every((o) => o.type === "skyscraper")).toBe(true);
    expect(availableFoodPoints(s)).toBeGreaterThanOrEqual(
      (growth.nextThreshold - growth.threshold) * 1.5,
    );
    s.hole.radius = blockScaleRadius;
    expect(ensureFoodBudget(s)).toHaveLength(0);
  });
  it("replaces modern street props in every medieval variant", () => {
    const s = freshState();
    for (const type of [
      "bottlecap",
      "toy",
      "snack",
      "litter",
      "hydrant",
      "sign",
      "bench",
      "table",
      "patio",
      "barrier",
      "manhole",
      "kiosk",
    ]) {
      const original = s.level.objects.find(
        (o) => o.type === type && !o.unlockStage,
      )!;
      for (let variant = 0; variant < 8; variant++) {
        const visual = createObjectVisual({
          ...original,
          cityIndex: 0,
          variant,
        });
        expect(visual.name).toBe(`medieval-${type}`);
        expect(visual.getObjectByName("signal-red")).toBeUndefined();
        expect(visual.children.length).toBeGreaterThan(1);
      }
    }
  });
});
