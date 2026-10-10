import { blockScaleRadius, lowestDetailTier, tierOf } from "../game/sections";
import { Vector3 } from "three";
import { categories, objectDesigns, stages } from "../game/constants";
import type {
  GameState,
  Level,
  ObjectType,
  SwallowableObject,
} from "../game/GameState";
import { generateCity } from "./CityGenerator";
import { isBuildingType } from "../render/occlusion";
import { updateBoosts } from "../game/boosts";

const make = (
  type: ObjectType,
  id: string,
  x: number,
  z: number,
  variant: number,
  cityIndex: number,
): SwallowableObject => ({
  id,
  type,
  position: new Vector3(x, 0, z),
  ...categories[type],
  variant,
  cityIndex,
  design: objectDesigns[type][variant % objectDesigns[type].length],
  orientation: 0,
  motion: null,
  state: "idle",
  fall: null,
});
export function indexLevel(level: Level) {
  level.objectSlots = new Map(level.objects.map((o, i) => [o.id, i]));
  level.totalMass = level.objects.reduce(
    (sum, o) => sum + (o.collisionOnly ? 0 : o.mass),
    0,
  );
  level.totalScore = level.objects.reduce(
    (sum, o) => sum + (o.collisionOnly ? 0 : o.scoreValue),
    0,
  );
}
export function attachCityBlocks(level: Level) {
  const blocks = level.blocks.map((b, i) => {
    const block = make(
      "cityBlock",
      `aggregate-${b.x}-${b.z}`,
      b.x,
      b.z,
      i % 4,
      level.cityIndex ?? 0,
    );
    block.district = b.district;
    block.members = level.objects.filter(
      (o) =>
        !o.members &&
        !o.aggregateId &&
        !o.unlockStage &&
        !o.collisionOnly &&
        !o.motion &&
        Math.abs(o.position.x - b.x) < 9.7 &&
        Math.abs(o.position.z - b.z) < 9.7,
    );
    for (const member of block.members) member.aggregateId = block.id;
    return block;
  });
  level.objects.push(...blocks);
  indexLevel(level);
}
export function createBuildingExpansion(s: GameState) {
  const tile = generateCity(s.level.seed + 1973, 1, s.cityIndex);
  const additions: SwallowableObject[] = [];
  const blocks: Level["blocks"] = [];
  for (let z = -1; z <= 1; z++)
    for (let x = -1; x <= 1; x++) {
      if (x === 0 && z === 0) continue;
      for (const o of tile.objects.filter((o) => isBuildingType(o.type)))
        additions.push({
          ...o,
          id: `expansion-${x}-${z}-${o.id}`,
          position: o.position.clone().add(new Vector3(x * 360, 0, z * 360)),
          state: "idle",
          fall: null,
          motion: null,
        });
      blocks.push(
        ...tile.blocks.map((b) => ({
          ...b,
          x: b.x + x * 360,
          z: b.z + z * 360,
        })),
      );
    }
  const expansion: Level = { ...s.level, objects: additions, blocks };
  attachCityBlocks(expansion);
  return expansion;
}
export function createLandscape(s: GameState, planet = false): Level {
  const objects: SwallowableObject[] = [],
    bounds = planet ? 3400 : 200;
  let index = 0;
  const add = (type: ObjectType, x: number, z: number) => {
    const o = make(
      type,
      `land-${planet}-${index}`,
      x,
      z,
      (index++ + s.cityIndex) % 4,
      s.cityIndex,
    );
    objects.push(o);
    return o;
  };
  if (planet) {
    // One continuous outer region, with progressively larger silhouettes.
    // Leave the original city and its building suburbs in the same coordinates.
    for (let z = -6; z <= 6; z++)
      for (let x = -6; x <= 6; x++) {
        if (Math.max(Math.abs(x), Math.abs(z)) <= 1) continue;
        const ring = Math.max(Math.abs(x), Math.abs(z));
        const type: ObjectType =
          ring <= 2
            ? "river"
            : ring <= 3
              ? index % 3
                ? "river"
                : "mountain"
              : ring <= 4
                ? index % 2
                  ? "mountain"
                  : "wholeCity"
                : index % 3
                  ? "wholeCity"
                  : "country";
        add(type, x * 500, z * 500);
      }
  } else {
    for (let z = -3; z <= 3; z++)
      for (let x = -3; x <= 3; x++) {
        const river = Math.abs(z - Math.round(Math.sin(x * 0.65) * 2)) < 1;
        const type = river
          ? "river"
          : (x + z + 20) % 5 === 0
            ? "mountain"
            : "river";
        const o = add(type, x * 48, z * 48);
        if (!river && type === "river") {
          o.design = "grassland";
          o.height = 1;
          o.radius = 18;
        }
      }
    for (const x of [-120, 0, 120])
      for (const z of [-120, 0, 120]) add("wholeCity", x + 18, z + 18);
  }
  const level: Level = {
    seed: s.level.seed + 811,
    cityIndex: s.cityIndex,
    bounds,
    objects,
    blocks: [],
    landscape: true,
    objectSlots: new Map(),
    totalMass: 0,
    totalScore: 0,
  };
  indexLevel(level);
  return level;
}
// Build the complete world before the first frame. Expansion reveals existing
// objects; it never changes a run's initial food population or moves the player.
export function prepareWorld(s: GameState) {
  for (const o of s.level.objects) o.worldRing = 1;
  const expansion = createBuildingExpansion(s);
  for (const o of expansion.objects) o.worldRing = 2;
  const landscape = createLandscape(s, true);
  for (const o of landscape.objects) o.worldRing = 3;
  s.level.objects.push(...expansion.objects, ...landscape.objects);
  s.level.blocks.push(...expansion.blocks);
  s.level.finalBounds = 3400;
  s.world.remainingByRing = { 1: 0, 2: 0, 3: 0 };
  for (const o of s.level.objects)
    if (!o.collisionOnly) s.world.remainingByRing[o.worldRing ?? 1]++;
  indexLevel(s.level);
  s.score.remainingObjects = s.level.objects.filter(
    (o) => !o.collisionOnly,
  ).length;
}
export function advanceWorld(s: GameState): boolean {
  const ring =
    s.world.phase === "city" ? 1 : s.world.phase === "metropolis" ? 2 : 3;
  if (ring === 3) return false;
  const remaining =
    s.world.remainingByRing?.[ring] ??
    s.level.objects.filter(
      (o) =>
        (o.worldRing ?? 1) === ring &&
        !o.collisionOnly &&
        o.state !== "swallowed" &&
        o.state !== "discarded",
    ).length;
  const initial =
    ring === 1 ? s.world.initialCount : (s.world.ringCount ?? remaining);
  if (
    s.areaStage !== 3 ||
    (remaining > initial * 0.2 && remaining !== 0) ||
    (ring === 1 && s.hole.radius < 20)
  )
    return false;
  const from = s.level.bounds;
  s.level.bounds = ring === 1 ? 540 : 3400;
  s.world.phase = ring === 1 ? "metropolis" : "planet";
  s.world.ringCount = s.level.objects.filter(
    (o) => o.worldRing === ring + 1 && !o.collisionOnly,
  ).length;
  s.world.reveal = { from, to: s.level.bounds, started: s.elapsedSeconds };
  s.status = "playing";
  updateBoosts(s);
  return true;
}

// At block scale, tiny scenery is retired, never credited as food.
export function discardSmallScenery(s: GameState): SwallowableObject[] {
  if (
    !["city", "metropolis"].includes(s.world.phase) ||
    s.hole.radius < blockScaleRadius
  )
    return [];
  const cutoff = lowestDetailTier(s);
  const removed = s.level.objects.filter(
    (o) =>
      o.state !== "swallowed" &&
      o.state !== "discarded" &&
      !o.collisionOnly &&
      !o.members &&
      !isBuildingType(o.type) &&
      tierOf(o) < cutoff,
  );
  if (!removed.length) return [];
  const ids = new Set(removed.map((o) => o.id));
  for (const o of removed) {
    o.state = "discarded";
    if (s.world.remainingByRing) s.world.remainingByRing[o.worldRing ?? 1]--;
    o.fall = null;
    s.level.totalMass -= o.mass;
    s.level.totalScore -= o.scoreValue;
  }
  s.level.objects = s.level.objects.filter((o) => !ids.has(o.id));
  s.level.objectSlots = new Map(s.level.objects.map((o, i) => [o.id, i]));
  for (const block of s.level.objects)
    if (block.members)
      block.members = block.members.filter((member) => !ids.has(member.id));
  s.score.remainingObjects -= removed.length;
  if (s.world.phase === "city") s.world.initialCount -= removed.length;
  return removed;
}
