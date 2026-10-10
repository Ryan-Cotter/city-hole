import { Vector3 } from "three";
import {
  categories,
  objectDesigns,
  stages,
  starterPopulationConfig,
} from "./constants";
import type {
  GameState,
  Level,
  ObjectType,
  SwallowableObject,
} from "./GameState";
import { isUnlocked } from "./sections";
export const foodBudgetFactor = 1.5;
export const availableFoodPoints = (s: GameState) =>
  s.level.objects.reduce(
    (sum, o) =>
      sum +
      (o.state === "idle" &&
      isUnlocked(s, o) &&
      !o.collisionOnly &&
      !o.members &&
      o.radius <= s.hole.radius * 0.85
        ? o.scoreValue
        : 0),
    0,
  );
// Estimate density from the amount swept in a six-second size interval:
// density = objects needed / (2 * radius * movement speed * target seconds).
// The seed guarantees 150% of the points independently for every step, rather
// than counting the same leftover food toward several future levels.
export function seedFoodBudget(s: GameState) {
  if (s.level.densityPlan) return;
  s.neighborhoods = {};
  const rows: NonNullable<Level["densityPlan"]> = [];
  const living = ["person", "mouse", "cat", "dog"];
  // Dedicated playable starter block. Keep boundaries; remove intersecting
  // original traffic and props at generation, before laying out the food ladder.
  s.level.objects = s.level.objects.filter(
    (o) =>
      o.collisionOnly ||
      o.members ||
      Math.hypot(o.position.x, o.position.z) > 36,
  );
  let randomSeed = s.level.seed >>> 0;
  const random = () => {
    randomSeed = (Math.imul(randomSeed, 1664525) + 1013904223) >>> 0;
    return randomSeed / 4294967296;
  };
  const scatteredObjects: { position: Vector3; radius: number }[] = [];
  let previousOuter = 0;
  for (let i = 0; i < stages.length - 1; i++) {
    const stage = stages[i];
    if (stage.type === "cityBlock") break;
    const types = (Object.keys(categories) as ObjectType[]).filter(
      (t) =>
        t !== "barrier" &&
        !living.includes(t) &&
        categories[t].radius <= stage.radius * 0.85 &&
        categories[t].radius < 10,
    );
    const type = types.at(-1)!;
    if (!type) continue;
    const spec = categories[type],
      requiredPoints = Math.ceil(
        (stages[i + 1].points - stage.points) * foodBudgetFactor,
      );
    const tiny = i < starterPopulationConfig.multipliedTiers; // Bacteria through sand: the opening before the first bugs.
    const count =
      Math.ceil(requiredPoints / spec.scoreValue) *
      (tiny ? starterPopulationConfig.multiplier : 1);
    // Reserve a progressively larger footprint, but scatter all size tiers across
    // its interior instead of placing objects on concentric rings.
    const distance = Math.max(
      previousOuter + spec.radius * (tiny ? 5 : 1.05) + stage.radius * 0.15,
      ((count * spec.radius) / Math.PI) * (tiny ? 0.7 : 1.12),
    );
    previousOuter = distance + spec.radius * (tiny ? 5 : 1);
    const area = Math.PI * previousOuter ** 2;
    rows.push({ type: stage.type, count, requiredPoints, area });
    const groupId = `patch-${i}`;
    s.neighborhoods[groupId] = {
      remaining: count,
      total: count,
      label: `${stage.name} patch cleared`,
    };
    const centers = Array.from({ length: 3 + Math.floor(random() * 4) }, () => {
      const angle = random() * Math.PI * 2;
      const radius = Math.sqrt(random()) * distance * 0.85;
      return new Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    });
    for (let n = 0; n < count; n++) {
      const position = new Vector3();
      // Uneven off-center islands mixed with scattered singles. All tiers share
      // a collision exclusion list so larger objects never cover earlier food.
      for (let attempt = 0; attempt < 10000; attempt++) {
        const a = random() * Math.PI * 2;
        const clustered = attempt < 1000 && random() < 0.7;
        const r =
          Math.sqrt(random()) *
          (clustered ? distance * 0.45 : previousOuter - spec.radius);
        position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        if (clustered)
          position.add(centers[Math.floor(random() * centers.length)]);
        if (
          position.length() > previousOuter - spec.radius ||
          position.length() < 0.0015 + spec.radius * 1.1
        )
          continue;
        if (
          scatteredObjects.every(
            (o) =>
              o.position.distanceTo(position) >=
              (spec.radius + o.radius) * 1.05,
          )
        )
          break;
      }
      scatteredObjects.push({
        position: position.clone(),
        radius: spec.radius,
      });
      const variant = Math.floor(random() * objectDesigns[type].length);
      s.level.objects.push({
        id: `seed-food-${i}-${n}`,
        type,
        ...spec,
        position,
        variant,
        groupId,
        cityIndex: s.cityIndex,
        design: objectDesigns[type][variant],
        orientation: random() * Math.PI * 2,
        motion: null,
        state: "idle",
        fall: null,
      });
    }
  }
  // Distribute the extra microscopic food around larger neighbors as well as
  // its own patch. Keep the original 150% reserve near the start of each tier.
  const seeded = s.level.objects.filter((o) => o.id.startsWith("seed-food-"));
  for (let tier = 0; tier < starterPopulationConfig.multipliedTiers; tier++) {
    const items = seeded.filter((o) => o.id.startsWith(`seed-food-${tier}-`));
    const neighbors = seeded.filter((o) =>
      [tier + 1, tier + 2].includes(Number(o.id.split("-")[2])),
    );
    const reserve = Math.ceil((items.length * 2) / 3);
    for (const item of items.slice(reserve)) {
      for (let attempt = 0; attempt < 2000; attempt++) {
        const anchor = neighbors[Math.floor(random() * neighbors.length)];
        const a = random() * Math.PI * 2;
        const distance = anchor.radius * (1.2 + random() * 2) + item.radius * 2;
        const candidate = anchor.position
          .clone()
          .add(new Vector3(Math.cos(a) * distance, 0, Math.sin(a) * distance));
        if (candidate.length() < 0.0015 + item.radius * 1.1) continue;
        if (
          seeded.every(
            (other) =>
              other === item ||
              other.position.distanceTo(candidate) >=
                (item.radius + other.radius) * 1.05,
          )
        ) {
          item.position.copy(candidate);
          break;
        }
      }
    }
  }
  for (let tier = 0; tier < starterPopulationConfig.multipliedTiers; tier++) {
    const items = seeded.filter((o) => o.id.startsWith(`seed-food-${tier}-`));
    rows[tier].area =
      Math.PI *
      Math.max(...items.map((o) => o.position.length() + o.radius)) ** 2;
  }
  // A few pre-budgeted food specks are bugs; the rest stay still for reliable food.
  for (const o of s.level.objects
    .filter((o) => o.id.startsWith("seed-food-5-"))
    .slice(-3)) {
    o.critter = true;
    o.design = "ant";
    o.motion = {
      axis: "x",
      direction: 1,
      speed: 0.045,
      min: o.position.x - 0.15,
      max: o.position.x + 0.15,
    };
  }
  s.level.densityPlan = rows;
  s.level.objectSlots = new Map(s.level.objects.map((o, i) => [o.id, i]));
  // Removed original members must not return as ghost food in aggregate blocks.
  const ids = new Set(s.level.objects.map((o) => o.id));
  for (const o of s.level.objects)
    if (o.members) o.members = o.members.filter((m) => ids.has(m.id));
  s.score.remainingObjects = s.level.objects.filter(
    (o) => !o.collisionOnly,
  ).length;
  s.world.initialCount = s.score.remainingObjects;
  // Fill existing containers with pre-authored nearby contents only.
  for (const container of s.level.objects.filter(
    (o) => o.design === "dumpster" || o.design === "small crate",
  )) {
    const contents = s.level.objects
      .filter(
        (o) =>
          !o.motion &&
          !o.supportId &&
          !o.pickup &&
          ["snack", "litter", "bottlecap"].includes(o.type) &&
          o.position.distanceTo(container.position) < 2,
      )
      .slice(0, 3);
    contents.forEach((o, i) => {
      o.supportId = container.id;
      o.position.copy(container.position);
      o.position.x += (i - 1) * o.radius * 2;
      o.position.y = container.height;
    });
  }
}
