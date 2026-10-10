import { Vector3 } from "three";
export interface Obstacle {
  x: number;
  z: number;
  half: number;
  round?: boolean;
}
export function segmentIntersectsBox(
  a: Vector3,
  b: Vector3,
  obstacle: Obstacle,
) {
  if (obstacle.round) {
    const dx = b.x - a.x,
      dz = b.z - a.z;
    const lengthSquared = dx * dx + dz * dz;
    const t = lengthSquared
      ? Math.max(
          0,
          Math.min(
            1,
            ((obstacle.x - a.x) * dx + (obstacle.z - a.z) * dz) / lengthSquared,
          ),
        )
      : 0;
    return (
      Math.hypot(a.x + t * dx - obstacle.x, a.z + t * dz - obstacle.z) <
      obstacle.half
    );
  }
  let entry = 0,
    exit = 1;
  for (const axis of ["x", "z"] as const) {
    const delta = b[axis] - a[axis],
      low = obstacle[axis] - obstacle.half,
      high = obstacle[axis] + obstacle.half;
    if (Math.abs(delta) < 1e-8) {
      if (a[axis] < low || a[axis] > high) return false;
    } else {
      const t1 = (low - a[axis]) / delta,
        t2 = (high - a[axis]) / delta;
      entry = Math.max(entry, Math.min(t1, t2));
      exit = Math.min(exit, Math.max(t1, t2));
      if (entry > exit) return false;
    }
  }
  return exit > 0 && entry < 1;
}
