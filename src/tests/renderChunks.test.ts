import { describe, expect, it } from "vitest";
import { Vector3, Group } from "three";
import { RenderChunks } from "../world/RenderChunks";
import { freshState, Game } from "../game/Game";
import { categories } from "../game/constants";
import { lowestDetailTier, tierOf } from "../game/sections";
import { Renderer } from "../render/Renderer";
import { createCamera, resizeCamera } from "../render/Camera";

describe("recursive 3×3 rendering", () => {
  const make = (id: string, x: number, z: number) => ({
    ...freshState().level.objects.find((o) => o.type === "bacterium")!,
    id,
    position: new Vector3(x, 0, z),
    motion: null,
  });
  it("loads adjacent leaf cells ahead of visibility and excludes distant branches", () => {
    const center = make("center", 0, 0),
      neighbor = make("neighbor", 0.1, 0),
      far = make("far", 10, 10);
    const tree = new RenderChunks([center, neighbor, far], 13.5, 0.1);
    const selected = tree.query(
      { minX: -0.01, maxX: 0.01, minZ: -0.01, maxZ: 0.01 },
      0.1,
    );
    expect(selected).toContain(center);
    expect(selected).toContain(neighbor);
    expect(selected).not.toContain(far);
    expect(new Set(selected).size).toBe(selected.length);
    const check = (node: typeof tree.root) => {
      expect(node.children.size).toBeLessThanOrEqual(9);
      for (const child of node.children.values()) {
        expect(child.size).toBeCloseTo(node.size / 3);
        check(child);
      }
    };
    check(tree.root);
    expect(tree.root.children.size).toBeGreaterThan(1);
  });
  it("removes eaten objects and reindexes spilled objects without generating replacements", () => {
    const item = make("moving", 0, 0),
      tree = new RenderChunks([item], 13.5, 0.1);
    item.position.set(10, 0, 10);
    tree.relocate(item);
    expect(
      tree.query({ minX: -0.01, maxX: 0.01, minZ: -0.01, maxZ: 0.01 }, 0.1),
    ).not.toContain(item);
    expect(tree.query({ minX: 9, maxX: 11, minZ: 9, maxZ: 11 }, 0.1)).toContain(
      item,
    );
    tree.remove(item);
    expect(
      tree.query({ minX: -20, maxX: 20, minZ: -20, maxZ: 20 }, 0.1),
    ).toEqual([]);
  });
  it("covers the camera ground footprint and adds extra lead in the travel direction", () => {
    const renderer = Object.create(Renderer.prototype);
    renderer.camera = createCamera();
    resizeCamera(renderer.camera, 1200, 800, 1);
    renderer.camera.updateMatrixWorld();
    renderer.viewSize = 1;
    renderer.preloadDirection = new Vector3(1, 0, 0);
    const ahead = renderer.preloadRegion();
    renderer.preloadDirection.set(0, 0, 0);
    const still = renderer.preloadRegion();
    expect(ahead.maxX - still.maxX).toBeCloseTo(0.6);
    expect(ahead.minX).toBe(still.minX);
    expect(still.minX).toBeLessThan(0);
    expect(still.maxX).toBeGreaterThan(0);
  });
  it("preloads invisible models but never newly loads items more than five edible tiers behind", () => {
    const game = Object.create(Game.prototype) as Game;
    const state = freshState();
    state.areaStage = 3;
    state.hole.radius = categories.snack.radius / 0.85 + 0.00001;
    const min = lowestDetailTier(state);
    const objects = [min - 1, min, min + 1].map((tier, i) => {
      const o = state.level.objects.find(
        (o) => tierOf(o) === tier && !o.members && !o.motion,
      )!;
      return {
        ...o,
        id: `cutoff-${i}`,
        aggregateId: undefined,
        position: new Vector3(),
        supportId: undefined,
      };
    });
    state.level.objects = objects;
    state.level.objectSlots = new Map(objects.map((o, i) => [o.id, i]));
    Object.assign(game, {
      state,
      visuals: new Map(),
      blockVisuals: new Map(),
      falling: new Set(),
      renderer: {
        software: true,
        scene: new Group(),
        preloadRegion: () => ({ minX: -1, maxX: 1, minZ: -1, maxZ: 1 }),
        objectVisible: () => false,
        updateVisibility() {},
        webgl: { domElement: { dataset: {} } },
      },
    });
    game.populate();
    expect(min).toBe(Object.keys(categories).indexOf("snack") - 5);
    expect(game.visuals.has(objects[0].id)).toBe(false);
    expect(game.visuals.has(objects[1].id)).toBe(true);
    expect(game.visuals.has(objects[2].id)).toBe(true);
    expect(state.score.swallowedObjects).toBe(0);
    // Capturing an unloaded obsolete object must not resurrect its geometry.
    objects[0].state = "falling";
    expect(game["loadVisual"](objects[0])).toBeUndefined();
    game.refreshTargets();
    expect(game.visuals.has(objects[0].id)).toBe(false);
  });
});
