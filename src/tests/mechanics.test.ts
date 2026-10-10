import {
  blocksHoleView,
  fadedMaterial,
  isBuildingType,
} from "../render/occlusion";
import { Vector3, Mesh, RingGeometry, OrthographicCamera } from "three";
import { clipAboveGround } from "../render/clipping";
import { createObjectVisual } from "../world/SwallowableObject";
import { describe, it, expect, vi } from "vitest";
import {
  categories,
  config,
  stages,
  progressionConfig,
} from "../game/constants";
import { generateCity } from "../world/CityGenerator";
import {
  advanceTraffic,
  updateTraffic,
  advancePedestrian,
  signalFor,
} from "../world/traffic";
import {
  createHole,
  clampHole,
  moveHole,
  speedForRadius,
} from "../player/Hole";
import { canSwallow, capture, complete } from "../physics/swallowing";
import { advanceFall } from "../physics/falling";
import { growthForPoints, extraLevelCost } from "../game/progression";
import { freshState } from "../game/Game";
import { PointerHold, InputManager } from "../input/InputManager";
const litter = () => generateCity().objects.find((o) => o.type === "litter")!;
describe("city gameplay", () => {
  it("clears held steering on release outside the canvas and on HUD presses", () => {
    const host = new EventTarget();
    vi.stubGlobal("window", host);
    const canvas = Object.assign(new EventTarget(), {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 390,
        height: 844,
      }),
      setPointerCapture: () => {},
    });
    const event = (name: string, props: Record<string, unknown>) =>
      Object.assign(new Event(name), props);
    try {
      const camera = new OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
      camera.position.set(35, 44, 35);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      const input = new InputManager(
        canvas as unknown as HTMLElement,
        camera,
        () => {},
      );
      canvas.dispatchEvent(
        event("pointermove", {
          pointerId: 1,
          pointerType: "mouse",
          buttons: 0,
          clientX: 300,
          clientY: 600,
        }),
      );
      expect(input.target).toBeNull();
      canvas.dispatchEvent(
        event("pointerdown", {
          pointerId: 1,
          isPrimary: true,
          button: 0,
          buttons: 1,
          clientX: 300,
          clientY: 600,
        }),
      );
      expect(input.hold.active).toBe(1);
      expect(input.target).not.toBeNull();
      host.dispatchEvent(event("pointerup", { pointerId: 1 }));
      expect(input.target).toBeNull();
      canvas.dispatchEvent(
        event("pointerdown", {
          pointerId: 2,
          isPrimary: true,
          button: 0,
          clientX: 300,
          clientY: 600,
        }),
      );
      host.dispatchEvent(event("pointerdown", { pointerId: 2 }));
      expect(input.hold.active).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("triples small props and gives every small tier eight designs", () => {
    const baseline = generateCity(814, 1),
      dense = generateCity(814, 3);
    for (const type of ["litter", "hydrant", "sign", "bench"] as const) {
      const count = (objects: typeof dense.objects) =>
        objects.filter((o) => o.type === type && !o.signalAxis).length;
      expect(count(dense.objects)).toBe(count(baseline.objects) * 3);
      expect(
        new Set(
          dense.objects
            .filter((o) => o.type === type && !o.signalAxis)
            .map((o) => o.design),
        ).size,
      ).toBe(type === "bench" ? 9 : 8);
    }
    for (const type of [
      "person",
      "car",
      "van",
      "tree",
      "litter",
      "hydrant",
      "sign",
      "bench",
      "kiosk",
    ] as const)
      expect(isBuildingType(type)).toBe(false);
    for (const type of [
      "house",
      "shop",
      "building",
      "largeBuilding",
      "skyscraper",
    ] as const)
      expect(isBuildingType(type)).toBe(true);
  });
  it("fades only objects that obstruct the hole sightline", () => {
    const hole = new Vector3(),
      camera = new Vector3(35, 44, 35);
    expect(blocksHoleView(new Vector3(3, 0, 3), 3, 8, hole, camera)).toBe(true);
    expect(blocksHoleView(new Vector3(-3, 0, -3), 3, 8, hole, camera)).toBe(
      false,
    );
    expect(blocksHoleView(new Vector3(8, 0, -4), 3, 8, hole, camera)).toBe(
      false,
    );
    const visual = createObjectVisual(litter());
    const original = (visual.children[0] as Mesh)
      .material as import("three").MeshStandardMaterial;
    expect(fadedMaterial(original).opacity).toBe(0.5);
    expect(original.opacity).toBe(1);
  });
  it("populates every size tier with four distinct designs at the same score and footprint", () => {
    const city = generateCity();
    for (const [type, spec] of Object.entries(categories).filter(
      ([, spec]) => spec.radius < 10,
    )) {
      const objects = city.objects.filter((o) => o.type === type);
      expect(new Set(objects.map((o) => o.design)).size).toBeGreaterThanOrEqual(
        4,
      );
      for (const o of objects.filter((o) => !o.unlockStage)) {
        expect(o.radius).toBe(spec.radius);
        expect(o.scoreValue).toBe(spec.scoreValue);
      }
    }
  });
  it("keeps sidewalk walkers separated through repeated meetings and turnarounds", () => {
    const people = generateCity()
      .objects.filter((o) => o.type === "person")
      .slice(0, 5);
    let minGap = Infinity;
    for (let step = 0; step < 2400; step++) {
      updateTraffic(people, 1 / 60, step / 60);
      const sorted = [...people].sort((a, b) => a.position.x - b.position.x);
      for (let i = 1; i < sorted.length; i++)
        minGap = Math.min(
          minGap,
          sorted[i].position.x - sorted[i - 1].position.x,
        );
      for (const p of people) {
        expect(p.state).toBe("idle");
        expect(p.position.x).toBeGreaterThanOrEqual(p.motion!.min - 0.001);
        expect(p.position.x).toBeLessThanOrEqual(p.motion!.max + 0.001);
      }
    }
    expect(minGap).toBeGreaterThanOrEqual(0.839);
  });

  it("gives every car variant front, rear and side windows", () => {
    const city = generateCity();
    for (const type of ["car", "van"] as const)
      for (let variant = 0; variant < 6; variant++) {
        const o = city.objects.find((o) => o.type === type)!;
        const visual = createObjectVisual({ ...o, variant });
        expect(
          visual.children.filter((c) => c.name.startsWith("window-")).length,
        ).toBe(4);
      }
  });
  it("adds building entrances, windows and distinct roof detail", () => {
    const city = generateCity();
    for (const type of [
      "house",
      "shop",
      "building",
      "largeBuilding",
      "skyscraper",
    ] as const) {
      const visual = createObjectVisual(
        city.objects.find((o) => o.type === type)!,
      );
      expect(visual.getObjectByName("door")).toBeDefined();
      expect(
        visual.children.filter((c) => c.name === "window").length,
      ).toBeGreaterThan(4);
      expect(visual.getObjectByName("roof")).toBeDefined();
    }
  });

  it("slows tiny holes and caps city-scale movement", () => {
    expect(speedForRadius(0.04)).toBeCloseTo(0.18);
    expect(speedForRadius(0.14)).toBeCloseTo(0.63);
    for (const radius of [1, 6, 50])
      expect(speedForRadius(radius)).toBe(config.moveSpeed);
  });
  it("anchors walking limbs to shoulder and hip pivots", () => {
    const person = generateCity().objects.find((o) => o.type === "person")!,
      v = createObjectVisual(person);
    const shoulders = v.children.filter((c) => c.name === "shoulder"),
      hips = v.children.filter((c) => c.name === "hip");
    expect(shoulders).toHaveLength(2);
    expect(hips).toHaveLength(2);
    for (const joint of [...shoulders, ...hips]) {
      const anchor = joint.position.clone();
      joint.rotation.x = 0.5;
      expect(joint.position.equals(anchor)).toBe(true);
      expect(joint.children[0].position.y).toBeLessThan(0);
    }
  });
  it("keeps pedestrians persistent at block ends with reflected position and walking limbs", () => {
    const o = generateCity().objects.find((o) => o.type === "person")!;
    o.motion!.direction = 1;
    o.position.x = o.motion!.max - 0.05;
    const before = o.position.x;
    advancePedestrian(o, 0.2);
    expect(o.state).toBe("idle");
    expect(o.position.x).toBeLessThanOrEqual(o.motion!.max);
    expect(o.position.x).toBeGreaterThan(before - 0.3);
    expect(o.motion!.direction).toBe(-1);
    const v = createObjectVisual(o);
    expect(v.children.filter((c) => c.userData.walkSide).length).toBe(4);
    const id = o.id;
    for (let i = 0; i < 2000; i++) advancePedestrian(o, 0.1);
    expect(o.id).toBe(id);
    expect(o.state).toBe("idle");
    expect(o.position.x).toBeGreaterThanOrEqual(o.motion!.min);
    expect(o.position.x).toBeLessThanOrEqual(o.motion!.max);
  });
  it("uses exclusive signal phases and all-red clearance", () => {
    for (let t = 0; t < 56; t += 0.1) {
      expect(
        signalFor("x", t) === "green" && signalFor("z", t) === "green",
      ).toBe(false);
    }
    expect(signalFor("x", 1)).toBe("green");
    expect(signalFor("x", 9)).toBe("yellow");
    expect(signalFor("x", 12)).toBe("red");
    expect(signalFor("z", 12)).toBe("red");
    expect(signalFor("z", 16)).toBe("green");
  });
  it("stops vehicles behind crossings on red and keeps safe queue spacing", () => {
    const city = generateCity(),
      cars = city.objects
        .filter((o) => o.type === "car" && o.motion)
        .slice(0, 2);
    for (let i = 0; i < 2; i++) {
      cars[i].position.set(-5 - i * 6, 0, 1.1);
      cars[i].motion = {
        axis: "x",
        direction: 1,
        speed: 4,
        currentSpeed: 4,
        min: -98,
        max: 98,
      };
    }
    for (let i = 0; i < 300; i++) updateTraffic(cars, 1 / 60, 12);
    expect(cars[0].position.x + cars[0].radius).toBeLessThanOrEqual(
      -3.9 + 0.001,
    );
    expect(cars[0].position.x - cars[1].position.x).toBeGreaterThanOrEqual(
      cars[0].radius + cars[1].radius + 1.19,
    );
    const before = cars[0].position.x;
    for (let i = 0; i < 120; i++) updateTraffic(cars, 1 / 60, 1);
    expect(cars[0].position.x).toBeGreaterThan(before + 2);
  });

  it("clips falling geometry progressively instead of hiding the entire object", () => {
    const partial = clipAboveGround([
      new Vector3(-1, 1, 0),
      new Vector3(1, 1, 0),
      new Vector3(0, -1, 0),
    ]);
    expect(partial).toHaveLength(4);
    expect(partial.every((p) => p.y >= 0)).toBe(true);
    expect(
      clipAboveGround([
        new Vector3(0, -1, 0),
        new Vector3(1, -2, 0),
        new Vector3(0, -3, 1),
      ]),
    ).toHaveLength(0);
  });
  it("keeps object visuals vivid and free of target highlight rings", () => {
    for (const o of generateCity().objects.slice(0, 30)) {
      const visual = createObjectVisual(o);
      expect(visual.rotation.y).toBe(o.orientation);
      let rings = 0;
      visual.traverse((child) => {
        if (child instanceof Mesh && child.geometry instanceof RingGeometry)
          rings++;
      });
      expect(rings).toBe(0);
    }
  });

  it("uses Fibonacci rewards for each ascending size", () => {
    const specs = Object.values(categories).map((o) => ({ ...o }));
    specs[Object.keys(categories).indexOf("cityBlock")].scoreValue =
      categories.cityBlock.mass;
    expect(specs[0].scoreValue).toBe(1);
    expect(specs[1].scoreValue).toBe(2);
    for (let i = 2; i < specs.length; i++) {
      expect(specs[i].scoreValue).toBe(
        specs[i - 1].scoreValue + specs[i - 2].scoreValue,
      );
      expect(specs[i].radius).toBeGreaterThan(specs[i - 1].radius);
    }
  });
  it("checks exact footprint and distance thresholds without category gates", () => {
    const h = createHole(),
      o = litter();
    o.position.set(h.radius, 0, 0);
    o.radius = h.radius * config.swallowFactor;
    expect(canSwallow(o, h)).toBe(true);
    o.radius += 0.001;
    expect(canSwallow(o, h)).toBe(false);
    o.radius = 0.16;
    o.position.x += 0.01;
    expect(canSwallow(o, h)).toBe(false);
    const car = generateCity().objects.find((o) => o.type === "car")!;
    car.position.copy(h.position);
    h.radius = 2;
    expect(canSwallow(car, h)).toBe(true);
  });
  it("awards all rewards exactly once after a visible full-size fall", () => {
    const s = freshState(),
      o = s.level.objects.find((o) => o.type === "bacterium")!;
    o.position.copy(s.hole.position);
    expect(capture(o, s.hole)).toBe(true);
    const mid = advanceFall(o, 0.7)!;
    expect(mid.u).toBeLessThan(1);
    expect(mid.y).toBeLessThan(0);
    expect(mid.scale).toBe(1);
    expect(s.score.points).toBe(0);
    expect(advanceFall(o, 3)!.y).toBeLessThan(-o.height);
    expect(complete(s, o)).toBe(true);
    expect(complete(s, o)).toBe(false);
    expect(s.score.points).toBe(1);
    expect(s.hole.mass).toBe(1);
    expect(s.score.remainingObjects).toBe(
      s.level.objects.filter((o) => !o.collisionOnly).length,
    );
  });
  it("lets mixed-size rewards advance discrete point-based levels", () => {
    const s = freshState();
    for (const type of ["hydrant", "person", "sign", "bench"] as const) {
      const o = s.level.objects.find((o) => o.type === type)!;
      o.state = "falling";
      complete(s, o);
    }
    const points = ["hydrant", "person", "sign", "bench"].reduce(
      (sum, type) =>
        sum + categories[type as keyof typeof categories].scoreValue,
      0,
    );
    expect(s.score.points).toBe(points);
    expect(s.hole.level).toBe(growthForPoints(points).level);
    expect(s.hole.radius).toBe(growthForPoints(points).radius);
  });
  it("continues uncapped growth with increasing logarithmic incremental costs", () => {
    const base = stages.at(-1)!.points;
    expect(growthForPoints(base).level).toBe(stages.length);
    expect(growthForPoints(base + extraLevelCost(0) - 1).level).toBe(
      stages.length,
    );
    const one = growthForPoints(base + extraLevelCost(0));
    expect(one.level).toBe(stages.length + 1);
    expect(one.radius).toBeGreaterThan(stages.at(-1)!.radius);
    expect(extraLevelCost(1)).toBeGreaterThan(extraLevelCost(0));
    expect(extraLevelCost(2) - extraLevelCost(1)).toBeLessThan(
      extraLevelCost(1) - extraLevelCost(0),
    );
    expect(
      growthForPoints(base + progressionConfig.postCityCost * 1500).radius,
    ).toBeGreaterThan(50);
  });
  it("creates a deterministic 120×120 city with 36 smaller blocks and every category", () => {
    const a = generateCity(),
      b = generateCity();
    expect(a.bounds).toBe(60);
    expect(a.blocks).toHaveLength(36);
    expect(a.objects.length).toBeGreaterThan(2000);
    expect(new Set(a.objects.map((o) => o.id)).size).toBe(a.objects.length);
    expect(a.objects.map((o) => o.position.toArray())).toEqual(
      b.objects.map((o) => o.position.toArray()),
    );
    for (const type of Object.keys(categories).filter(
      (type) => categories[type as keyof typeof categories].radius < 10,
    ))
      expect(a.objects.some((o) => o.type === type)).toBe(true);
  });
  it("places trees only in parks and cars only on streets or curb parking", () => {
    const city = generateCity();
    for (const o of city.objects) {
      if (o.type === "tree")
        expect(
          city.blocks.some(
            (b) =>
              Math.abs(Math.abs(o.position.x - b.x) - 4) < 1.7 &&
              Math.abs(o.position.z - b.z - 4) < 1.7,
          ),
        ).toBe(true);
      if (o.type === "car" || o.type === "van") {
        const laneDistance = Math.min(
          Math.abs(o.position.x - Math.round(o.position.x / 20) * 20),
          Math.abs(o.position.z - Math.round(o.position.z / 20) * 20),
        );
        expect(laneDistance).toBeLessThanOrEqual(2.051);
      }
    }
  });
  it("moves traffic along its assigned lane, wraps at map edges, and stops captured traffic", () => {
    const o = generateCity().objects.find((o) => o.type === "car" && o.motion)!;
    const m = o.motion!,
      fixedAxis = m.axis === "x" ? "z" : "x",
      fixed = o.position[fixedAxis],
      before = o.position[m.axis];
    advanceTraffic(o, 0.5);
    expect((o.position[m.axis] - before) * m.direction).toBeGreaterThan(0);
    expect((o.position[m.axis] - before) * m.direction).toBeLessThanOrEqual(
      m.speed * 0.5,
    );
    expect(o.position[fixedAxis]).toBe(fixed);
    o.position[m.axis] = m.direction > 0 ? m.max : m.min;
    advanceTraffic(o, 1);
    expect(o.position[m.axis]).toBeGreaterThanOrEqual(m.min);
    expect(o.position[m.axis]).toBeLessThanOrEqual(m.max);
    o.state = "falling";
    const stopped = o.position.clone();
    advanceTraffic(o, 1);
    expect(o.position.equals(stopped)).toBe(true);
  });
  it("can consume the entire city without a size deadlock", () => {
    const s = freshState();
    const pending = s.level.objects
      .filter((o) => !o.collisionOnly)
      .sort((a, b) => a.radius - b.radius);
    for (const o of pending) {
      s.hole.position.copy(o.position);
      expect(capture(o, s.hole)).toBe(true);
      advanceFall(o, 5);
      complete(s, o);
    }
    expect(s.status).toBe("won");
    expect(s.score.points).toBe(s.level.totalScore);
    expect(s.hole.radius * config.swallowFactor).toBeGreaterThanOrEqual(
      categories.cityBlock.radius,
    );
  });
  it("moves only during a held pointer and stops immediately on release", () => {
    const h = createHole(),
      hold = new PointerHold();
    const input = { hold, target: new Vector3(50, 0, 0) } as InputManager;
    moveHole(h, input, 1, 100);
    expect(h.position.length()).toBe(0);
    hold.press(7);
    hold.press(8);
    expect(hold.active).toBe(7);
    moveHole(h, input, 1, 100);
    expect(h.position.length()).toBeCloseTo(speedForRadius(h.radius));
    hold.cancel();
    const before = h.position.clone();
    moveHole(h, input, 1, 100);
    expect(h.position.equals(before)).toBe(true);
    expect(h.velocity.length()).toBe(0);
  });
  it("varies building sizes by district while retaining a dense city and all tiers", () => {
    const city = generateCity();
    expect(new Set(city.blocks.map((b) => b.district)).size).toBe(5);
    for (const b of city.blocks) {
      const local = city.objects.filter(
        (o) =>
          Math.abs(o.position.x - b.x) <= 7.3 &&
          Math.abs(o.position.z - b.z) <= 7.3,
      );
      expect(local.length).toBeGreaterThanOrEqual(54);
      const towers = local.filter((o) => o.type === "skyscraper");
      expect(towers.length).toBe(b.district === "downtown" ? 1 : 0);
      if (b.district === "residential")
        expect(local.filter((o) => o.type === "house").length).toBe(3);
      if (b.district === "industrial")
        expect(local.filter((o) => o.type === "largeBuilding").length).toBe(2);
    }
  });
  it("handles radii beyond map width without inverted movement limits", () => {
    const h = createHole();
    h.radius = 150;
    h.position.set(10, 0, -10);
    clampHole(h, 100);
    expect(h.position.x).toBeCloseTo(0);
    expect(h.position.z).toBeCloseTo(0);
    expect(h.radius).toBe(150);
  });
  it("waits for final completion and resets cleanly", () => {
    const s = freshState();
    const edible = s.level.objects.filter((o) => !o.collisionOnly);
    const last = edible.find((o) => o.motion)!;
    for (const o of edible) {
      if (o === last || o.state === "swallowed") continue;
      o.state = "falling";
      complete(s, o);
    }
    expect(s.status).toBe("playing");
    last.state = "falling";
    complete(s, last);
    expect(s.status).toBe("won");
    const reset = freshState();
    expect(reset.hole.radius).toBe(config.baseRadius);
    expect(reset.score.points).toBe(0);
    expect(reset.level.objects.every((o) => o.state === "idle")).toBe(true);
  });
});
