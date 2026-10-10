import { describe, it, expect } from "vitest";
import { Box3, Vector3 } from "three";
import { freshState } from "../game/Game";
import { categories, stages } from "../game/constants";
import { canSwallow, capture, complete } from "../physics/swallowing";
import { resolveOversizedCollisions } from "../physics/collisions";
import { createObjectVisual } from "../world/SwallowableObject";
import { updateTraffic } from "../world/traffic";
import { SelfPlayer } from "../testing/SelfPlayer";
import { moveToward } from "../player/Hole";
import { activeBounds } from "../game/sections";
describe("microscopic opening and permanent obstacles", () => {
  it("introduces five distinct smaller tiers before bugs with Fibonacci rewards", () => {
    const s = freshState();
    const types = ["bacterium", "spore", "dust", "pollen", "sand"] as const;
    expect(stages.slice(0, 5).map((t) => t.type)).toEqual(types);
    expect(types.map((t) => categories[t].scoreValue)).toEqual([1, 2, 3, 5, 8]);
    for (const type of types) {
      const items = s.level.objects.filter((o) => o.type === type);
      expect(items.length).toBeGreaterThanOrEqual(4);
      expect(new Set(items.map((o) => o.design)).size).toBeGreaterThanOrEqual(
        4,
      );
      expect(createObjectVisual(items[0]).children.length).toBeGreaterThan(0);
    }
    const bug = s.level.objects.find((o) => o.critter)!;
    bug.position.copy(s.hole.position);
    expect(canSwallow(bug, s.hole)).toBe(false);
    const cell = s.level.objects.find((o) => o.type === "bacterium")!;
    cell.position.copy(s.hole.position);
    expect(canSwallow(cell, s.hole)).toBe(true);
  });
  it("keeps barriers solid at any hole size and never awards points for them", () => {
    const s = freshState(),
      barrier = s.level.objects.find((o) => o.collisionOnly)!;
    s.hole.radius = 5;
    barrier.position.set(0, 0, 0);
    expect(capture(barrier, s.hole)).toBe(false);
    barrier.state = "falling";
    expect(complete(s, barrier)).toBe(false);
    barrier.state = "idle";
    resolveOversizedCollisions(s.hole, new Vector3(), [barrier]);
    expect(s.hole.position.length()).toBeGreaterThan(2);
    expect(s.score.points).toBe(0);
  });
  it("faces cars and vans down their lane in every era", () => {
    for (let era = 0; era < 4; era++) {
      const s = freshState(era);
      for (const axis of ["x", "z"] as const)
        for (const direction of [-1, 1]) {
          const o = s.level.objects.find(
            (o) =>
              o.type === "car" &&
              o.motion?.axis === axis &&
              o.motion.direction === direction,
          )!;
          updateTraffic([o], 0.1, 0);
          const facing = new Vector3(
            Math.sin(o.orientation),
            0,
            Math.cos(o.orientation),
          );
          expect(facing[axis] * direction).toBeGreaterThan(0.96);
          const visual = createObjectVisual(o);
          visual.rotation.y = 0;
          visual.updateMatrixWorld(true);
          const size = new Box3().setFromObject(visual).getSize(new Vector3());
          expect(size.z).toBeGreaterThan(size.x);
        }
    }
  });
  it("does not mistake microscopic movement for a stall", () => {
    const s = freshState(),
      pilot = new SelfPlayer();
    pilot.enabled = true;
    pilot.target(s, 0.1);
    const goal = pilot.goal!;
    // A long but reachable microscopic route takes more than the stall window.
    goal.position.set(0.08, 0, 0);
    pilot.path = [goal.position.clone()];
    for (let i = 0; i < 15; i++)
      moveToward(s.hole, pilot.target(s, 0.1), 0.1, activeBounds(s));
    expect(pilot.goal).toBe(goal);
    expect(s.hole.position.x).toBeGreaterThan(0.005);
  });
});

describe("crosswalks, animal proportions and block pacing", () => {
  it("keeps cats and dogs well below human height and width", () => {
    expect(categories.cat.radius).toBeLessThan(categories.person.radius * 0.6);
    expect(categories.dog.radius).toBeLessThan(categories.person.radius * 0.75);
    expect(categories.cat.height).toBeLessThan(categories.person.height * 0.2);
    expect(categories.dog.height).toBeLessThan(categories.person.height * 0.3);
  });
  it("stops a car before an occupied crossing and resumes after it clears", () => {
    const s = freshState(2),
      car = s.level.objects.find(
        (o) => o.type === "car" && o.motion?.axis === "z",
      )!;
    const person = s.level.objects.find((o) => o.type === "person")!;
    car.position.set(1.1, 0, -3);
    car.motion = { axis: "z", direction: 1, speed: 3, min: -58, max: 58 };
    person.position.set(1.1, 0, 3.25);
    person.motion = { axis: "x", direction: 1, speed: 0, min: -3.4, max: 3.4 };
    for (let i = 0; i < 100; i++) updateTraffic([car, person], 0.05, 15);
    expect(car.position.z).toBeLessThan(
      person.position.z - car.radius - person.radius,
    );
    expect(car.motion.currentSpeed).toBe(0);
    const stopped = car.position.z;
    for (let i = 0; i < 20; i++) updateTraffic([car], 0.05, 15);
    expect(car.position.z).toBeGreaterThan(stopped + 0.5);
  });
  it("lets people, cats and dogs travel from curb to curb without disappearing", () => {
    const s = freshState();
    for (const type of ["person", "cat", "dog"]) {
      const actor = s.level.objects.find(
        (o) =>
          o.type === type &&
          o.motion &&
          Math.abs(o.motion.max - o.motion.min - 6.8) < 0.001,
      )!;
      const before = actor.position.x;
      for (let i = 0; i < 120; i++) updateTraffic([actor], 0.05, i * 0.05);
      expect(actor.state).toBe("idle");
      expect(Math.abs(actor.position.x - before)).toBeGreaterThan(0.5);
    }
  });
  it("gives blocks a smaller bonus and visible architectural detail", () => {
    expect(categories.cityBlock.scoreValue).toBeLessThan(
      categories.skyscraper.scoreValue * 0.2,
    );
    const s = freshState(),
      o = s.level.objects.find((o) => o.type === "cityBlock")!;
    let parts = 0;
    createObjectVisual(o).traverse(() => parts++);
    expect(parts).toBeGreaterThan(100);
  });
});

describe("self-play stall regressions", () => {
  it("tries later cluster items when the nearest three are unreachable", () => {
    const s = freshState();
    const base = s.level.objects.find((o) => o.type === "bacterium")!;
    const food = [0.025, 0.026, 0.027, 0.075].map((x, i) => ({
      ...base,
      id: `test-food-${i}`,
      position: new Vector3(x, 0, 0),
    }));
    const obstacle = {
      ...base,
      id: "test-wall",
      collisionOnly: true,
      radius: 0.016,
      position: new Vector3(0.026, 0, 0),
    };
    s.level.objects = [...food, obstacle];
    const pilot = new SelfPlayer();
    pilot.enabled = true;
    pilot.target(s, 0.1);
    pilot.target(s, 1.3);
    expect(pilot.goal?.id).toBe("test-food-3");
  });
  it("advances a waypoint before steering reaches its stop dead zone", () => {
    const s = freshState(),
      pilot = new SelfPlayer();
    pilot.enabled = true;
    s.hole.radius = 0.2;
    pilot.target(s, 0.1);
    const goal = s.level.objects.find((o) => o.type === "snack")!;
    goal.position.set(1, 0, 0);
    pilot.goal = goal;
    pilot.path = [new Vector3(0.05, 0, 0), new Vector3(1, 0, 0)];
    expect(pilot.target(s, 0.01)!.x).toBe(1);
    expect(pilot.path).toHaveLength(1);
  });
});
