import { Vector3 } from "three";
import { categories, objectDesigns, stages } from "./constants";
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
    const count = Math.ceil(requiredPoints / spec.scoreValue);
    // Successive clusters sit in concentric bands. A larger collider never covers
    // the previous tier's food, and all small tiers remain in their unlocked area.
    const distance = Math.max(
      previousOuter + spec.radius * 1.05 + stage.radius * 0.15,
      ((count * spec.radius) / Math.PI) * 1.12,
    );
    previousOuter = distance + spec.radius;
    const area =
      Math.PI *
      ((distance + spec.radius) ** 2 -
        Math.max(0, distance - spec.radius) ** 2);
    rows.push({ type: stage.type, count, requiredPoints, area });
    const groupId = `patch-${i}`;
    s.neighborhoods[groupId] = {
      remaining: count,
      total: count,
      label: `${stage.name} patch cleared`,
    };
    for (let n = 0; n < count; n++) {
      const angle = (n / count) * Math.PI * 2 + i * 0.7;
      const position = new Vector3(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance,
      );
      const variant = (n + i) % objectDesigns[type].length;
      s.level.objects.push({
        id: `seed-food-${i}-${n}`,
        type,
        ...spec,
        position,
        variant,
        groupId,
        cityIndex: s.cityIndex,
        design: objectDesigns[type][variant],
        orientation: angle,
        motion: null,
        state: "idle",
        fall: null,
      });
    }
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
