import type { GameState, SwallowableObject } from "./GameState";
import { config } from "./constants";
import { isUnlocked } from "./sections";
// Reveal already-budgeted contents. No new object, reward or collider is created.
export function spillContents(s: GameState, support: SwallowableObject) {
  let index = 0;
  for (const o of s.level.objects)
    if (o.supportId === support.id && !o.spill && o.state === "idle") {
      const angle = index++ * 2.39996323;
      const target = support.position.clone();
      target.x += Math.cos(angle) * (support.radius + o.radius * 2);
      target.z += Math.sin(angle) * (support.radius + o.radius * 2);
      target.y = 0;
      o.spill = { origin: o.position.clone(), target, elapsed: 0 };
    }
}
export function reactToHole(s: GameState, objects: SwallowableObject[]) {
  const h = s.hole;
  for (const o of objects) {
    if (o.state !== "idle" || o.collisionOnly || !isUnlocked(s, o)) continue;
    const distance = Math.hypot(
      o.position.x - h.position.x,
      o.position.z - h.position.z,
    );
    if (distance > h.radius + o.radius * 1.08) continue;
    const edible = o.radius <= h.radius * config.swallowFactor;
    if (!edible && o.radius > h.radius * 3) continue;
    if ((o.reactionUntil ?? 0) <= s.elapsedSeconds) {
      o.reactionUntil = s.elapsedSeconds + 0.35;
      if (!edible && s.feedback) s.feedback.bumpUntil = s.elapsedSeconds + 0.25;
      if (
        o.type === "table" ||
        o.design === "dumpster" ||
        o.design === "small crate"
      )
        spillContents(s, o);
    }
  }
}
export function animateSpill(o: SwallowableObject, dt: number) {
  if (!o.spill || o.state !== "idle") return;
  o.spill.elapsed += dt;
  const u = Math.min(1, o.spill.elapsed / 0.45);
  o.position.lerpVectors(o.spill.origin, o.spill.target, u);
  o.position.y += Math.sin(u * Math.PI) * Math.max(0.015, o.radius * 2);
  if (u === 1) {
    o.position.copy(o.spill.target);
    o.supportId = undefined;
    o.spill = undefined;
  }
}
