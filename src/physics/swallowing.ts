import type { GameState, Hole, SwallowableObject } from "../game/GameState";
import { lowestDetailTier, tierOf } from "../game/sections";
import { config, stages } from "../game/constants";
import { growthForPoints } from "../game/progression";
export function canSwallow(o: SwallowableObject, h: Hole) {
  const dx = o.position.x - h.position.x,
    dz = o.position.z - h.position.z;
  return (
    o.state === "idle" &&
    o.radius <= h.radius * config.swallowFactor &&
    dx * dx + dz * dz <= h.radius * h.radius
  );
}
export function capture(o: SwallowableObject, h: Hole) {
  if (!canSwallow(o, h)) return false;
  o.state = "falling";
  o.fall = {
    elapsed: 0,
    start: o.position.clone(),
    capture: h.position.clone(),
  };
  return true;
}
export function complete(s: GameState, o: SwallowableObject) {
  if (o.state !== "falling") return false;
  o.state = "swallowed";
  if (o.unlockStage && o.unlockStage === s.areaStage + 1)
    s.areaStage = o.unlockStage;
  // Swap-delete: no rescanning or shifting the remaining city on each reward.
  const index = s.level.objectSlots.get(o.id);
  if (index !== undefined) {
    const last = s.level.objects.pop()!;
    if (index < s.level.objects.length) {
      s.level.objects[index] = last;
      s.level.objectSlots.set(last.id, index);
    }
    s.level.objectSlots.delete(o.id);
  }
  o.fall = null;
  s.hole.mass += o.mass;
  s.score.points += o.scoreValue;
  s.score.byType[o.type]++;
  s.score.swallowedObjects++;
  s.score.remainingObjects--;
  const growth = growthForPoints(s.score.points);
  s.hole.level = growth.level;
  s.hole.radius = growth.radius;
  if (s.score.remainingObjects === 0) s.status = "won";
  return true;
}

export function consumeObsolete(s: GameState, o: SwallowableObject) {
  if (o.state !== "idle" || tierOf(o) >= lowestDetailTier(s)) return false;
  if (
    Math.hypot(
      o.position.x - s.hole.position.x,
      o.position.z - s.hole.position.z,
    ) +
      o.radius >
    s.hole.radius
  )
    return false;
  return capture(o, s.hole) && complete(s, o);
}
