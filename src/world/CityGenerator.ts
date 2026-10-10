import { Vector3 } from "three";
import { categories, cityConfig, objectDesigns } from "../game/constants";
import type {
  Level,
  ObjectType,
  SwallowableObject,
  Motion,
  Block,
} from "../game/GameState";
export function generateCity(
  seed = 814,
  smallItemMultiplier = cityConfig.smallItemMultiplier,
): Level {
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
    const count = objectDesigns[type].length;
    const variant = (index % count) + Math.floor(random() * 2) * count;
    objects.push({
      id: `${type}-${objects.length}`,
      type,
      position: new Vector3(x, 0, z),
      ...spec,
      orientation,
      variant,
      design: objectDesigns[type][variant % count],
      motion,
      state: "idle",
      fall: null,
    });
  };
  const blockCount = (cityConfig.bounds * 2) / cityConfig.blockSize;
  for (let row = 0; row < blockCount; row++)
    for (let col = 0; col < blockCount; col++) {
      const x = -cityConfig.bounds + 10 + col * 20,
        z = -cityConfig.bounds + 10 + row * 20,
        park = (row * 3 + col) % 5 === 0;
      const districtType = park
        ? "park"
        : Math.max(Math.abs(x), Math.abs(z)) <= 30
          ? "downtown"
          : (row + col) % 3 === 0
            ? "industrial"
            : (row + col) % 3 === 1
              ? "commercial"
              : "residential";
      blocks.push({ x, z, park, district: districtType });
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
      const layouts: Record<typeof districtType, ObjectType[]> = {
        park: ["kiosk", "house", "shop", "house", "kiosk", "shop"],
        residential: [
          "house",
          "house",
          "shop",
          "house",
          "building",
          "building",
        ],
        commercial: [
          "kiosk",
          "shop",
          "shop",
          "building",
          "largeBuilding",
          "building",
        ],
        industrial: [
          "kiosk",
          "shop",
          "house",
          "largeBuilding",
          "largeBuilding",
          "building",
        ],
        downtown: [
          "kiosk",
          "house",
          "shop",
          "building",
          "largeBuilding",
          "skyscraper",
        ],
      };
      const buildings = layouts[districtType];
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
        const anchors = [
          [-4, -2.3],
          [0, -2.2],
          [4, -2.05],
          [0, 4],
          [-5.9, 0],
          [5.9, 0],
          [0, 5.7],
        ];
        const anchor = anchors[Math.floor(i / 8) % anchors.length];
        add(
          "litter",
          x + anchor[0] + ((i % 4) - 1.5) * 0.36,
          z + anchor[1] + ((Math.floor(i / 4) % 2) - 0.5) * 0.36,
          random() * Math.PI * 2,
        );
      }
      add("bench", x - 6.35, z + 2.3, Math.PI / 2);
      objects.at(-1)!.variant = 8;
      objects.at(-1)!.design = "dumpster";
      designCounts.set("bench", designCounts.get("bench")! - 1);
      // Four persistent people socialize beside the park benches, outside walking lanes.
      for (let i = 0; i < 4; i++)
        add(
          "person",
          x + (i - 1.5) * 0.9,
          z + 5.05,
          ((i % 2 ? 1 : -1) * Math.PI) / 2,
        );
      // Separate food objects rest on tables and carry their own rewards.
      add("table", x, z + 2.5);
      const table = objects.at(-1)!;
      for (let food = 0; food < 4; food++) {
        add(
          "snack",
          x + (food % 2 ? 0.23 : -0.23),
          z + 2.5 + (food < 2 ? -0.2 : 0.2),
        );
        objects.at(-1)!.position.y = 0.77;
        objects.at(-1)!.supportId = table.id;
      }
      add("patio", x, z + 2.5);
      for (const type of [
        "bottlecap",
        "dice",
        "pebble",
        "coin",
        "toy",
        "snack",
      ] as const)
        for (let item = 0; item < 12; item++)
          add(
            type,
            x - 2 + (item % 4) * 0.24,
            z + 3.1 + Math.floor(item / 4) * 0.24,
            random() * 6,
          );
      for (const type of ["mouse", "cat", "dog"] as const)
        for (let animal = 0; animal < 4; animal++)
          add(type, x - 5.3 + animal * 1.6, z + 5.9, Math.PI / 2, {
            axis: "x",
            direction: animal % 2 ? 1 : -1,
            speed: type === "mouse" ? 0.6 : type === "cat" ? 1 : 1.2,
            min: x - 5.5,
            max: x + 5.5,
          });
      // Triple small street props independently, filling free sidewalk and interior pockets.
      const smallTypes: ObjectType[] = ["litter", "hydrant", "sign", "bench"];
      const original = objects
        .slice(start)
        .filter((o) => smallTypes.includes(o.type));
      const occupied = objects
        .slice(start)
        .filter((o) => !o.motion && o.type !== "car" && o.type !== "van");
      const mediumAnchors = objects
        .slice(start)
        .filter((o) => ["bench", "hydrant", "kiosk"].includes(o.type));
      for (const source of original.sort((a, b) => b.radius - a.radius))
        for (let copy = 1; copy < smallItemMultiplier; copy++) {
          const r =
            source.type === "litter"
              ? 0.16
              : source.type === "sign"
                ? 0.2
                : source.type === "bench"
                  ? 0.6
                  : 0.26;
          for (let attempt = 0; attempt < 500; attempt++) {
            let dx = (random() * 2 - 1) * (7.2 - r),
              dz = (random() * 2 - 1) * (7.2 - r);
            if (attempt < 100) {
              // Small piles orbit the existing fixtures, dumpsters and shop entrances.
              const medium = mediumAnchors;
              const anchor =
                attempt < 50
                  ? source
                  : medium[
                      (copy +
                        original.indexOf(source) +
                        Math.floor(attempt / 10)) %
                        medium.length
                    ];
              const angle = random() * Math.PI * 2;
              const radius =
                anchor.type === "litter"
                  ? 0.35 + random() * 0.95
                  : anchor.type === "kiosk"
                    ? 1.3 + random() * 0.8
                    : 0.75 + random() * 0.85;
              dx = anchor.position.x - x + Math.cos(angle) * radius;
              dz = anchor.position.z - z + Math.sin(angle) * radius;
              if (Math.abs(dx) > 7.2 - r || Math.abs(dz) > 7.2 - r) continue;
            }
            if (
              Math.abs(Math.abs(dx) - 6.6) < r + 0.32 ||
              Math.abs(Math.abs(dz) - 6.6) < r + 0.32
            )
              continue;
            const px = x + dx,
              pz = z + dz;
            if (
              occupied.some((o) => {
                if (buildings.includes(o.type)) {
                  const half =
                    Math.min(3.2, o.radius * Math.SQRT2 * 0.94) / 2 + 0.1;
                  return (
                    Math.hypot(
                      Math.max(0, Math.abs(px - o.position.x) - half),
                      Math.max(0, Math.abs(pz - o.position.z) - half),
                    ) <
                    r + 0.12
                  );
                }
                const other =
                  o.type === "litter"
                    ? 0.16
                    : o.type === "sign"
                      ? 0.2
                      : o.type === "hydrant"
                        ? 0.26
                        : o.type === "bench"
                          ? 0.6
                          : o.radius;
                return (
                  Math.hypot(px - o.position.x, pz - o.position.z) <
                  r + other + 0.06
                );
              })
            )
              continue;
            add(source.type, px, pz, random() * Math.PI * 2);
            occupied.push(objects.at(-1)!);
            break;
          }
        }
    }
  // Cars remain on the road grid. Some are parked at the curb, others cruise straight lanes.
  for (
    let street = -cityConfig.bounds + 20;
    street <= cityConfig.bounds - 20;
    street += 20
  )
    for (let i = 0; i < Math.floor((cityConfig.bounds * 2) / 14); i++) {
      const position = -cityConfig.bounds + 6 + i * 14,
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
          min: -cityConfig.bounds + 2,
          max: cityConfig.bounds - 2,
        },
      );
      add(type, street - dir * 1.1, position, dir > 0 ? 0 : Math.PI, {
        axis: "z",
        direction: dir,
        speed: 2 + random() * 2,
        min: -cityConfig.bounds + 2,
        max: cityConfig.bounds - 2,
      });
      if (i % 3 === 0) {
        add("car", position, street + 2.05, Math.PI / 2);
        add("car", street - 2.05, position, 0);
      }
    }
  // Swallowable signal poles at intersections; each approach follows the same city phase.
  for (let x = -cityConfig.bounds + 20; x <= cityConfig.bounds - 20; x += 20)
    for (
      let z = -cityConfig.bounds + 20;
      z <= cityConfig.bounds - 20;
      z += 20
    ) {
      add("sign", x + 3.2, z + 3.2, Math.PI / 2);
      objects.at(-1)!.signalAxis = "x";
      add("sign", x - 3.2, z - 3.2, 0);
      objects.at(-1)!.signalAxis = "z";
    }
  for (
    let street = -cityConfig.bounds + 20;
    street < cityConfig.bounds;
    street += 20
  )
    for (
      let position = -cityConfig.bounds + 10;
      position < cityConfig.bounds;
      position += 20
    ) {
      add("manhole", position, street + 0.5);
      add("barrier", position + 3, street);
    }
  // A tiny starter plaza, then successively larger clustered piles.
  for (const type of [
    "bottlecap",
    "dice",
    "pebble",
    "coin",
    "toy",
    "snack",
    "mouse",
  ] as const)
    for (let item = 0; item < 80; item++) {
      const index = [
        "bottlecap",
        "dice",
        "pebble",
        "coin",
        "toy",
        "snack",
        "mouse",
      ].indexOf(type);
      add(
        type,
        -2.4 + (item % 10) * 0.16,
        -2.4 + Math.floor(item / 10) * 0.16 + index * 0.62,
        random() * 6,
      );
    }
  // First objects are within immediate reach of the tiny starting hole.
  for (let item = 0; item < 16; item++)
    add(
      "bottlecap",
      ((item % 4) - 1.5) * 0.07,
      (Math.floor(item / 4) - 1.5) * 0.07,
    );
  // A small sidewalk starter cluster near the central intersection.
  for (let i = 0; i < 8 * smallItemMultiplier; i++)
    add(
      "litter",
      0.8 + (i % 6) * 0.36,
      0.8 + Math.floor(i / 6) * 0.36,
      random() * 6,
    );
  return {
    seed,
    bounds: cityConfig.bounds,
    objects,
    objectSlots: new Map(objects.map((o, i) => [o.id, i])),
    blocks,
    totalMass: objects.reduce((sum, o) => sum + o.mass, 0),
    totalScore: objects.reduce((sum, o) => sum + o.scoreValue, 0),
  };
}
