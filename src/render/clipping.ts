import { Vector3 } from "three";
/** Clip a world-space polygon against the ground, retaining visible upper geometry. */
export function clipAboveGround(points: Vector3[]) {
  const polygon: Vector3[] = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[(i + points.length - 1) % points.length],
      next = points[i],
      inside = next.y >= 0,
      prevInside = prev.y >= 0;
    if (inside !== prevInside)
      polygon.push(prev.clone().lerp(next, -prev.y / (next.y - prev.y)));
    if (inside) polygon.push(next);
  }
  return polygon;
}
