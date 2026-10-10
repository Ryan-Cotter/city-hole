import type { GameState, SwallowableObject } from "./GameState";
import { isUnlocked } from "./sections";
/** Pull only edible loose objects; normal swallowing remains the sole reward path. */
export function pullVortex(
  s: GameState,
  objects: Iterable<SwallowableObject>,
  dt: number,
) {
  const moved: SwallowableObject[] = [];
  if ((s.boosts.vortexUntil ?? 0) <= s.elapsedSeconds) return moved;
  for (const o of objects) {
    if (
      o.state !== "idle" ||
      o.collisionOnly ||
      o.members ||
      o.supportId ||
      !isUnlocked(s, o) ||
      o.radius > s.hole.radius * 0.85
    )
      continue;
    const dx = s.hole.position.x - o.position.x,
      dz = s.hole.position.z - o.position.z;
    const distance = Math.hypot(dx, dz);
    if (!distance || distance > s.hole.radius * 4) continue;
    const step = Math.min(distance, s.hole.radius * 3 * Math.min(dt, 0.1));
    o.position.x += (dx / distance) * step;
    o.position.z += (dz / distance) * step;
    moved.push(o);
  }
  return moved;
}
