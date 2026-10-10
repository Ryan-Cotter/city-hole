import { streakMultiplier } from "../game/streak";
import { spillContents } from "../game/interactions";
import { updateBoosts, activateBoost } from "../game/boosts";
import type { GameState, Hole, SwallowableObject } from "../game/GameState";
import { lowestDetailTier, tierOf, blockScaleRadius } from "../game/sections";
import {
  config,
  stages,
  blockRewardConfig,
  adaptiveSwallowConfig,
} from "../game/constants";
import { growthForPoints, growthPoints } from "../game/progression";
export function canSwallow(o: SwallowableObject, h: Hole) {
  const dx = o.position.x - h.position.x,
    dz = o.position.z - h.position.z;
  return (
    !o.collisionOnly &&
    (!o.members || h.radius >= blockScaleRadius) &&
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
    toCenter: o.radius > h.radius * adaptiveSwallowConfig.smallFraction,
  };
  return true;
}
export function complete(
  s: GameState,
  o: SwallowableObject,
  rewardMultiplier = 1,
  countForStreak = true,
) {
  if (o.collisionOnly || o.state !== "falling") return false;
  if (countForStreak) rewardMultiplier *= streakMultiplier(s);
  for (const member of o.members ?? []) {
    if (member.state === "swallowed" || member.state === "discarded") continue;
    member.state = "falling";
    complete(
      s,
      member,
      rewardMultiplier * blockRewardConfig.contentsMultiplier,
      false,
    );
  }
  if (
    o.type === "table" ||
    o.design === "dumpster" ||
    o.design === "small crate"
  )
    spillContents(s, o);
  o.state = "swallowed";
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
  const reward = Math.round(o.scoreValue * rewardMultiplier);
  s.score.points += reward;
  if (s.feedback) {
    if (s.feedback.until < s.elapsedSeconds) {
      s.feedback.points = 0;
      s.feedback.count = 0;
    }
    s.feedback.points += reward;
    s.feedback.count++;
    s.feedback.until = s.elapsedSeconds + 0.6;
    if (o.members) s.feedback.cleared++;
  }
  s.level.totalScore -= o.scoreValue - reward;
  if (o.groupId && s.neighborhoods?.[o.groupId]) {
    const group = s.neighborhoods[o.groupId];
    group.remaining--;
    if (group.remaining === 0 && s.feedback) {
      s.feedback.goal = group.label;
      s.feedback.goalUntil = s.elapsedSeconds + 3;
    }
  }
  s.score.byType[o.type]++;
  s.score.swallowedObjects++;
  s.score.remainingObjects--;
  if (s.world.remainingByRing) s.world.remainingByRing[o.worldRing ?? 1]--;
  const growth = growthForPoints(growthPoints(s));
  s.hole.level = growth.level;
  s.hole.radius = growth.radius;
  updateBoosts(s);
  if (o.pickup && (o.pickup !== "size" || tierOf(o) >= lowestDetailTier(s)))
    activateBoost(s, o.pickup);
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

// Under sustained frame pressure, tiny geometry is retired at first rim contact.
// Large objects always retain their readable fall animation.
export function consumeAtEdge(s: GameState, o: SwallowableObject) {
  if (
    !s.performance?.strained ||
    o.state !== "idle" ||
    o.collisionOnly ||
    o.members ||
    o.radius > s.hole.radius * adaptiveSwallowConfig.smallFraction
  )
    return false;
  if (
    Math.hypot(
      o.position.x - s.hole.position.x,
      o.position.z - s.hole.position.z,
    ) >
    s.hole.radius + o.radius
  )
    return false;
  o.state = "falling";
  return complete(s, o);
}
