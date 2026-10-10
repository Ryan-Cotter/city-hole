import { describe, it, expect } from "vitest";
import { freshState } from "../game/Game";
import { complete } from "../physics/swallowing";
import { bugDesigns, virusDesigns, bacteriaDesigns } from "../world/MicroLife";

describe("streak points and microscopic life", () => {
  it("rewards fast completions once, caps at double points, and resets after a gap", () => {
    const s = freshState();
    const objects = s.level.objects
      .filter((o) => o.type === "bacterium")
      .slice(0, 10);
    let expected = 0;
    objects.forEach((o, i) => {
      s.elapsedSeconds = i * 0.2;
      o.state = "falling";
      expected += Math.round(o.scoreValue * (i >= 7 ? 2 : i >= 2 ? 1.5 : 1));
      expect(complete(s, o)).toBe(true);
      expect(complete(s, o)).toBe(false);
    });
    expect(s.score.points).toBe(expected);
    expect(s.streak!.count).toBe(10);
    expect(s.streak!.multiplier).toBe(2);
    const next = s.level.objects.find((o) => o.type === "bacterium")!;
    next.state = "falling";
    s.elapsedSeconds += 2.01;
    complete(s, next);
    expect(s.streak!.count).toBe(1);
    expect(s.streak!.multiplier).toBe(1);
    expect(s.score.points).toBe(expected + next.scoreValue);
  });
  it("counts an aggregate once and never counts collision barriers", () => {
    const s = freshState(),
      block = s.level.objects.find((o) => o.members?.length)!;
    block.state = "falling";
    complete(s, block);
    expect(s.streak!.count).toBe(1);
    const barrier = s.level.objects.find((o) => o.collisionOnly)!;
    barrier.state = "falling";
    expect(complete(s, barrier)).toBe(false);
    expect(s.streak!.count).toBe(1);
    expect(freshState().streak!.count).toBe(0);
  });
  it("seeds every new life design, with bugs at several sizes and bounded motion", () => {
    const s = freshState(),
      names = new Set(s.level.objects.map((o) => o.design));
    for (const name of [...virusDesigns, ...bacteriaDesigns, ...bugDesigns])
      expect(names.has(name), name).toBe(true);
    const bugs = s.level.objects.filter(
      (o) => o.critter && o.id.startsWith("seed-food"),
    );
    expect(new Set(bugs.map((o) => o.type)).size).toBe(8);
    for (const bug of bugs) {
      expect(bug.motion!.speed).toBeLessThanOrEqual(0.16);
      expect(bug.motion!.max - bug.motion!.min).toBeLessThanOrEqual(0.801);
    }
  });
});
