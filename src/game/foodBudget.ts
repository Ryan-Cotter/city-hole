import { isSolidObstacle, obstacleRadius } from "../physics/collisions";
import { segmentIntersectsBox } from "../physics/pathGeometry";
import { Vector3 } from "three";
import { categories, objectDesigns } from "./constants";
import type { GameState, ObjectType, SwallowableObject } from "./GameState";
import { growthForPoints, growthPoints } from "./progression";
import { activeBounds, isUnlocked, blockScaleRadius } from "./sections";
import { isBuildingType } from "../render/occlusion";
let reserveSerial = 0;
export const foodBudgetFactor = 1.5;
export const availableFoodPoints = (s: GameState, local = false) =>
  s.level.objects.reduce(
    (sum, o) =>
      sum +
      (o.state === "idle" &&
      isUnlocked(s, o) &&
      !o.members &&
      !o.collisionOnly &&
      (!local ||
        o.position.distanceTo(s.hole.position) <=
          Math.max(0.03, s.hole.radius * 6)) &&
      !o.motion &&
      !["person", "mouse", "cat", "dog"].includes(o.type) &&
      o.radius <= s.hole.radius * 0.85
        ? o.scoreValue
        : 0),
    0,
  );
export function ensureFoodBudget(s: GameState): SwallowableObject[] {
  if (s.status !== "playing") return [];
  const goalRadius =
    s.world.phase === "planet"
      ? categories.country.radius
      : s.world.phase === "country"
        ? categories.wholeCity.radius
        : blockScaleRadius * 0.85;
  // Once everything in this map is edible, finish it instead of spawning forever.
  if (s.hole.radius * 0.85 >= goalRadius) return [];
  const growth = growthForPoints(growthPoints(s));
  let deficit =
    Math.ceil(foodBudgetFactor * (growth.nextThreshold - growth.threshold)) -
    availableFoodPoints(s, true);
  if (deficit <= 0) return [];
  const types = (Object.keys(categories) as ObjectType[]).filter((type) => {
    if (["barrier", "person", "mouse", "cat", "dog"].includes(type))
      return false;
    if (categories[type].radius > s.hole.radius * 0.85) return false;
    if (s.world.phase === "metropolis") return isBuildingType(type);
    if (s.world.phase === "country" || s.world.phase === "planet")
      return ["river", "mountain", "wholeCity", "country"].includes(type);
    return (
      categories[type].radius < 10 &&
      (s.areaStage > 1 || categories[type].radius <= categories.mouse.radius)
    );
  });
  const type = types.at(-1);
  if (!type) return [];
  const spec = categories[type],
    added: SwallowableObject[] = [],
    bound = activeBounds(s) - spec.radius;
  const solids = s.level.objects.filter(
    (o) => isUnlocked(s, o) && isSolidObstacle(o, s.hole),
  );
  while (deficit > 0) {
    const index = added.length,
      variant = (index + s.hole.level) % objectDesigns[type].length;
    let position = s.hole.position.clone();
    for (let attempt = 0; attempt < 128; attempt++) {
      const angle = (index + attempt) * 2.39996323,
        distance =
          s.hole.radius +
          spec.radius * 2 +
          ((attempt % 12) / 11) *
            Math.max(
              0,
              Math.max(0.03, s.hole.radius * 6) -
                s.hole.radius -
                spec.radius * 3,
            );
      position = new Vector3(
        Math.max(
          -bound,
          Math.min(bound, s.hole.position.x + Math.cos(angle) * distance),
        ),
        0,
        Math.max(
          -bound,
          Math.min(bound, s.hole.position.z + Math.sin(angle) * distance),
        ),
      );
      if (
        !solids.some(
          (o) =>
            o.position.distanceTo(position) < obstacleRadius(o) + spec.radius ||
            segmentIntersectsBox(s.hole.position, position, {
              x: o.position.x,
              z: o.position.z,
              half: obstacleRadius(o) + s.hole.radius * 0.45,
              round: true,
            }),
        ) &&
        !added.some((o) => o.position.distanceTo(position) < spec.radius * 2)
      )
        break;
    }
    const o: SwallowableObject = {
      id: `reserve-${s.cityIndex}-${s.world.phase}-${s.hole.level}-${reserveSerial++}`,
      type,
      ...spec,
      position,
      variant,
      cityIndex: s.cityIndex,
      design: objectDesigns[type][variant],
      orientation: index * 2.4,
      motion: null,
      state: "idle",
      fall: null,
    };
    s.level.objectSlots.set(o.id, s.level.objects.length);
    s.level.objects.push(o);
    added.push(o);
    deficit -= o.scoreValue;
    s.level.totalMass += o.mass;
    s.level.totalScore += o.scoreValue;
    s.score.remainingObjects++;
    if (s.world.phase === "city") s.world.initialCount++;
  }
  return added;
}
