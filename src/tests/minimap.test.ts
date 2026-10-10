import { describe, it, expect } from "vitest";
import { HUD } from "../ui/HUD";
import { freshState } from "../game/Game";
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
