import type { GameState, Hole, SwallowableObject } from "../game/GameState";
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
