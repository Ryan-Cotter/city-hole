import { describe, it, expect } from "vitest";
import { freshState } from "../game/Game";
import { createObjectVisual } from "../world/SwallowableObject";
import { animateLife } from "../render/LifeAnimation";
import { createBlob, blobHeight } from "../render/Blob";
import { activateBoost, updateBoosts } from "../game/boosts";
import { pullVortex } from "../game/vortex";
import { enablePacing, advanceGrowth } from "../game/pacing";
import { stages } from "../game/constants";
import { virusDesigns, bacteriaDesigns, bugDesigns } from "../world/MicroLife";

describe("living blob and vortex", () => {
  it("animates every microscopic design without moving collision data, and restores fall poses", () => {
    const state = freshState();
    for (const design of [...virusDesigns, ...bacteriaDesigns, ...bugDesigns]) {
      const o = state.level.objects.find((o) => o.design === design)!;
      expect(o, design).toBeDefined();
      const position = o.position.clone(),
        model = createObjectVisual(o);
      const pose = () =>
        model.children.map((p) => [
          ...p.position.toArray(),
          ...p.scale.toArray(),
          p.rotation.x,
          p.rotation.y,
          p.rotation.z,
        ]);
      const rest = pose();
      animateLife(model, o, 0.3);
      expect(pose(), design).not.toEqual(rest);
      expect(o.position).toEqual(position);
      o.state = "falling";
      animateLife(model, o, 0.4);
      expect(pose()).toEqual(rest);
    }
  });
  it("keeps a radius-one translucent footprint while the absorption spring settles", () => {
    const blob = createBlob();
    expect(blob.material.transparent).toBe(true);
    expect(blob.material.opacity).toBeLessThan(1);
    expect(blob.scale.x).toBe(1);
    expect(blob.scale.z).toBe(1);
    expect(blobHeight(0.07, 0)).toBeGreaterThan(blobHeight(0.07, -100));
    expect(blobHeight(3, 0)).toBeCloseTo(blobHeight(3, -100), 4);
  });
  it("pulls edible items without credit, skips oversized objects and expires", () => {
    const s = freshState();
    activateBoost(s, "vortex");
    s.hole.radius = 1;
    const small = s.level.objects.find((o) => o.type === "bacterium")!;
    const large = s.level.objects.find((o) => o.type === "building")!;
    small.position.set(2, 0, 0);
    large.position.set(2, 0, 0);
    expect(pullVortex(s, [small, large], 0.1)).toEqual([small]);
    expect(small.position.x).toBeCloseTo(1.7);
    expect(large.position.x).toBe(2);
    expect(s.score.points).toBe(0);
    s.elapsedSeconds = 10;
    expect(pullVortex(s, [small], 0.1)).toEqual([]);
  });
  it("bounds every late radius step even with a huge score backlog", () => {
    const s = freshState();
    s.score.points = stages[27].points;
    updateBoosts(s);
    enablePacing(s);
    s.score.points = stages.at(-1)!.points;
    for (let i = 0; i < 7200; i++) {
      const before = s.hole.radius;
      advanceGrowth(s, 1 / 60);
      updateBoosts(s);
      expect(s.hole.radius / before).toBeLessThanOrEqual(
        Math.exp(0.12 / 60) + 1e-8,
      );
    }
    expect(s.hole.radius).toBeGreaterThan(80);
  });
});
