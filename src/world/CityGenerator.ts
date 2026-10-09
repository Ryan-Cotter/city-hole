import { Vector3 } from "three";
import { categories, cityConfig, objectDesigns } from "../game/constants";
import type {
  Level,
  ObjectType,
  SwallowableObject,
  Motion,
  Block,
} from "../game/GameState";
export function generateCity(seed = 814): Level {
  let value = seed >>> 0;
  const random = () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
  const objects: SwallowableObject[] = [],
    blocks: Block[] = [];
  const designCounts = new Map<ObjectType, number>();
  const add = (
    type: ObjectType,
    x: number,
    z: number,
    orientation = 0,
    motion: Motion | null = null,
  ) => {
    const spec = categories[type];
    const index = designCounts.get(type) ?? 0;
    designCounts.set(type, index + 1);
    const variant = (index % 4) + Math.floor(random() * 2) * 4;
    objects.push({
      id: `${type}-${objects.length}`,
      type,
      position: new Vector3(x, 0, z),
      ...spec,
      orientation,
      variant,
      design: objectDesigns[type][variant % 4],
      motion,
      state: "idle",
      fall: null,
    });
  };
  for (let row = 0; row < 10; row++)
    for (let col = 0; col < 10; col++) {
      const x = -90 + col * 20,
        z = -90 + row * 20,
        park = (row * 3 + col) % 5 === 0;
      blocks.push({ x, z, park });
      // Three times the previous per-block population, with a complete size ladder.
      const district = Math.max(Math.abs(x), Math.abs(z));
      const oldCount = park
        ? 28
        : 18 +
          (((row + col) % 11 === 0 && district > 30) ||
          (row + col) % 7 === 0 ||
          (row + col) % 4 === 0
            ? 1
            : 4);
      const start = objects.length;
      const buildings: ObjectType[] = [
        "kiosk",
        "house",
        "shop",
        "building",
        "largeBuilding",
        "skyscraper",
      ];
      buildings.forEach((type, i) =>
        add(
          type,
          x - 4 + (i % 3) * 4,
          z - 4 + Math.floor(i / 3) * 4,
          (((row + col + i) % 4) * Math.PI) / 2,
        ),
      );
      // Pocket parks occupy the southern corners of every mixed-use block.
      for (const side of [-1, 1]) {
        add("tree", x + side * 4, z + 4, random() * Math.PI * 2);
        add("bench", x + side * 1.3, z + 4, Math.PI / 2);
        add("car", x + side * 4, z + side * 8, Math.PI / 2);
        add("van", x + side * 8, z + side * 4, 0);
        add("hydrant", x + side * 5, z - 6.6, 0);
        add("sign", x + side * 6, z + 6.6, 0);
      }
      for (let lane = 0; lane < 3; lane++)
        for (let i = 0; i < 5; i++) {
          const horizontal = lane < 2;
          add(
            "person",
            horizontal ? x - 5.6 + i * 2.8 : x + 6.6,
            horizontal ? z + (lane === 0 ? -6.6 : 6.6) : z - 5.6 + i * 2.8,
            horizontal ? Math.PI / 2 : 0,
            {
              axis: horizontal ? "x" : "z",
              direction: i % 2 ? 1 : -1,
              speed: 0.6 + random() * 0.5,
              min: (horizontal ? x : z) - 5.6,
              max: (horizontal ? x : z) + 5.6,
            },
          );
        }
      while (
        objects.length - start <
        oldCount * cityConfig.blockDensityMultiplier
      ) {
        const i = objects.length - start - 33;
        const side = ((i % 4) + 4) % 4;
        const along = -5.8 + (Math.floor(Math.max(0, i) / 4) % 20) * 0.61;
        add(
          "litter",
          x + (side < 2 ? along : side === 2 ? -6 : 6),
          z + (side >= 2 ? along : side === 0 ? -6 : 6),
          random() * Math.PI * 2,
        );
      }
    }
  // Cars remain on the road grid. Some are parked at the curb, others cruise straight lanes.
  for (let street = -80; street <= 80; street += 20)
    for (let i = 0; i < 14; i++) {
      const position = -94 + i * 14,
        dir = i % 2 ? 1 : -1;
      const type: ObjectType = i % 4 === 0 ? "van" : "car";
      add(
        type,
        position,
        street + dir * 1.1,
        dir > 0 ? Math.PI / 2 : -Math.PI / 2,
        {
          axis: "x",
          direction: dir,
          speed: 2 + random() * 2,
          min: -98,
          max: 98,
        },
      );
      add(type, street - dir * 1.1, position, dir > 0 ? 0 : Math.PI, {
        axis: "z",
        direction: dir,
        speed: 2 + random() * 2,
        min: -98,
        max: 98,
      });
      if (i % 3 === 0) {
        add("car", position, street + 2.05, Math.PI / 2);
        add("car", street - 2.05, position, 0);
      }
    }
  // Swallowable signal poles at intersections; each approach follows the same city phase.
  for (let x = -80; x <= 80; x += 20)
    for (let z = -80; z <= 80; z += 20) {
      add("sign", x + 3.2, z + 3.2, Math.PI / 2);
      objects.at(-1)!.signalAxis = "x";
      add("sign", x - 3.2, z - 3.2, 0);
      objects.at(-1)!.signalAxis = "z";
    }
  // A small sidewalk starter cluster near the central intersection.
  for (let i = 0; i < 8; i++)
    add(
      "litter",
      3.3 + (i % 4) * 0.6,
      3.3 + Math.floor(i / 4) * 0.6,
      random() * 6,
    );
  return {
    seed,
    bounds: cityConfig.bounds,
    objects,
    blocks,
    totalMass: objects.reduce((sum, o) => sum + o.mass, 0),
    totalScore: objects.reduce((sum, o) => sum + o.scoreValue, 0),
  };
}
