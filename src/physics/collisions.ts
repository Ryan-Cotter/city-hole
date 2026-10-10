import { Vector3 } from "three";
import type { Hole, SwallowableObject } from "../game/GameState";
import { config } from "../game/constants";
import { isBuildingType } from "../render/occlusion";
export const obstacleRadius = (o: SwallowableObject) =>
  isBuildingType(o.type) ? Math.min(2.25, o.radius * 0.75) : o.radius;
// Sweep short increments to prevent tunneling, then slide along solid footprints.
export function resolveOversizedCollisions(
  hole: Hole,
  previous: Vector3,
  objects: SwallowableObject[],
) {
  const solids = objects.filter(
    (o) =>
      o.state === "idle" &&
      (o.collisionOnly || o.radius > hole.radius * config.swallowFactor),
  );
  const delta = hole.position.clone().sub(previous);
  const steps = Math.max(
    1,
    Math.ceil(delta.length() / Math.max(0.00001, hole.radius * 0.4)),
  );
  hole.position.copy(previous);
  for (let step = 0; step < steps; step++) {
    hole.position.addScaledVector(delta, 1 / steps);
    for (let pass = 0; pass < 2; pass++)
      for (const o of solids) {
        const dx = hole.position.x - o.position.x,
          dz = hole.position.z - o.position.z;
        const distance = Math.hypot(dx, dz),
          clearance = obstacleRadius(o) + hole.radius * 0.45;
        if (distance >= clearance) continue;
        const nx = distance > 1e-7 ? dx / distance : 1,
          nz = distance > 1e-7 ? dz / distance : 0;
        hole.position.x = o.position.x + nx * clearance;
        hole.position.z = o.position.z + nz * clearance;
        const into = hole.velocity.x * nx + hole.velocity.z * nz;
        if (into < 0) {
          hole.velocity.x -= into * nx;
          hole.velocity.z -= into * nz;
        }
      }
  }
  hole.position.y = 0;
}
