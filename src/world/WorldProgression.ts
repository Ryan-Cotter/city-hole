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
  level.totalMass = level.objects.reduce((sum, o) => sum + o.mass, 0);
  level.totalScore = level.objects.reduce((sum, o) => sum + o.scoreValue, 0);
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
    block.members = level.objects.filter(
      (o) =>
        !o.members &&
        !o.aggregateId &&
        !o.unlockStage &&
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
      if (!x && !z) continue;
      for (const o of tile.objects.filter((o) => isBuildingType(o.type)))
        additions.push({
          ...o,
          id: `expansion-${x}-${z}-${o.id}`,
          position: o.position.clone().add(new Vector3(x * 120, 0, z * 120)),
          state: "idle",
          fall: null,
          motion: null,
        });
      blocks.push(
        ...tile.blocks.map((b) => ({
          ...b,
          x: b.x + x * 120,
          z: b.z + z * 120,
        })),
      );
    }
  const expansion: Level = { ...s.level, objects: additions, blocks };
  attachCityBlocks(expansion);
  return expansion;
}
export function createLandscape(s: GameState, planet = false): Level {
  const objects: SwallowableObject[] = [],
    bounds = planet ? 600 : 300;
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
    for (let z = -2; z <= 1; z++)
      for (let x = -2; x <= 1; x++)
        add("country", x * 240 + 120, z * 240 + 120);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      add("wholeCity", Math.cos(a) * 160, Math.sin(a) * 160);
    }
  } else {
    for (let z = -5; z <= 5; z++)
      for (let x = -5; x <= 5; x++) {
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
    for (const x of [-180, 0, 180])
      for (const z of [-180, 0, 180]) add("wholeCity", x + 18, z + 18);
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
export function advanceWorld(s: GameState): boolean {
  if (
    s.world.phase === "city" &&
    s.areaStage === 3 &&
    s.score.swallowedObjects >= s.world.initialCount * 0.8
  ) {
    const expansion = createBuildingExpansion(s);
    s.level.objects.push(...expansion.objects);
    s.level.blocks.push(...expansion.blocks);
    s.level.bounds = 180;
    s.world.phase = "metropolis";
    s.score.remainingObjects += expansion.objects.length;
    const totalMass = s.level.totalMass,
      totalScore = s.level.totalScore;
    indexLevel(s.level);
    s.level.totalMass = totalMass + expansion.totalMass;
    s.level.totalScore = totalScore + expansion.totalScore;
    s.status = "playing";
    return true;
  }
  if (
    s.score.remainingObjects !== 0 ||
    s.world.phase === "city" ||
    s.world.phase === "planet"
  )
    return false;
  const planet = s.world.phase === "country";
  s.level = createLandscape(s, planet);
  s.world.phase = planet ? "planet" : "country";
  s.world.initialCount = s.level.objects.length;
  s.score.remainingObjects = s.level.objects.length;
  // A change of map scale uses local growth thresholds while retaining total score.
  const start = stages.find(
    (stage) => stage.type === (planet ? "wholeCity" : "river"),
  )!;
  s.growthOffset = s.score.points - start.points;
  s.hole.level = stages.indexOf(start) + 1;
  s.hole.position.set(planet ? 0 : -270, 0, planet ? 0 : -270);
  s.hole.velocity.set(0, 0, 0);
  s.status = "playing";
  updateBoosts(s);
  return true;
}
