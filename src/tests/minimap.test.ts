import { describe, it, expect } from "vitest";
import { HUD } from "../ui/HUD";
import { freshState } from "../game/Game";
import { categories, objectDesigns } from "../game/constants";
import { createObjectVisual } from "../world/SwallowableObject";
import { Mesh, BoxGeometry } from "three";

describe("map detail and recognizable small items", () => {
  it("zooms to unlocked sections and changes the detail scale with radius", () => {
    let label = "";
    const context = new Proxy({}, { get: () => () => {}, set: () => true });
    const canvas = {
      getContext: () => context,
      setAttribute: (_key: string, value: string) => (label = value),
    };
    const hud = { root: { querySelector: () => canvas } } as unknown as HUD;
    const state = freshState();
    HUD.prototype.drawMap.call(hud, state);
    expect(label).toContain("6 meters wide, item detail");
    state.hole.level = 13;
    state.hole.radius = 1;
    HUD.prototype.drawMap.call(hud, state);
    expect(label).toContain("80 meters wide, building detail");
    state.hole.level = 30;
    state.hole.radius = 9;
    HUD.prototype.drawMap.call(hud, state);
    expect(label).toContain("120 meters wide, block detail");
  });
  it("spreads early items across the plaza and keeps cats below people in size", () => {
    const city = freshState().level;
    const tiny = city.objects.filter(
      (o) =>
        o.radius <= categories.mouse.radius &&
        Math.abs(o.position.x) < 3 &&
        Math.abs(o.position.z) < 3,
    );
    for (const x of [-1, 1])
      for (const z of [-1, 1])
        expect(
          tiny.filter((o) => o.position.x * x > 1 && o.position.z * z > 1)
            .length,
        ).toBeGreaterThan(12);
    expect(tiny.filter((o) => o.position.length() < 0.08)).toHaveLength(0);
    expect(categories.cat.radius).toBeLessThan(categories.person.radius);
    expect(categories.cat.height).toBeLessThan(categories.dog.height * 0.6);
  });
  it("builds the added toy and food variants with different geometry", () => {
    const city = freshState().level;
    for (const type of ["toy", "snack", "dice", "coin", "pebble"] as const) {
      const source = city.objects.find((o) => o.type === type)!;
      const signatures = new Set<string>();
      for (let variant = 0; variant < objectDesigns[type].length; variant++) {
        const visual = createObjectVisual({ ...source, variant });
        signatures.add(
          visual.children
            .map((child) => {
              const mesh = child as Mesh;
              return [
                mesh.geometry?.type,
                child.position.toArray(),
                child.scale.toArray(),
                child.rotation.toArray(),
              ].join(":");
            })
            .join("|"),
        );
      }
      expect(signatures.size).toBeGreaterThanOrEqual(type === "coin" ? 1 : 4);
    }
  });
  it("retains recognizable original geometry for old round and detailed items", () => {
    const city = freshState().level;
    for (const type of [
      "bottlecap",
      "coin",
      "pebble",
      "manhole",
      "litter",
      "hydrant",
      "sign",
      "bench",
    ] as const) {
      const o = city.objects.find((o) => o.type === type)!;
      const visual = createObjectVisual(o);
      expect(visual.visible).toBe(true);
      const meshes: Mesh[] = [];
      visual.traverse((child) => {
        if (child instanceof Mesh) meshes.push(child);
      });
      expect(meshes.length).toBeGreaterThan(0);
      if (["bottlecap", "coin", "pebble", "manhole"].includes(type))
        expect(
          meshes.some((mesh) => !(mesh.geometry instanceof BoxGeometry)),
        ).toBe(true);
      else expect(meshes.length).toBeGreaterThan(1);
    }
  });
});
