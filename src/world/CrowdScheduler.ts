import type { GameState, SwallowableObject } from "../game/GameState";
import { crowdConfig } from "../game/constants";
import { isUnlocked, activeBounds } from "../game/sections";
import { updateTraffic } from "./traffic";

// Keep a bounded live neighborhood. Distant actors persist and take rotating,
// coarse patrol steps instead of rebuilding every crowd at simulation frequency.
export class CrowdScheduler {
  readonly updated = new Set<SwallowableObject>();
  private nearTime = 0;
  private farTime = 0;
  private lastUpdated = new WeakMap<SwallowableObject, number>();
  step(objects: SwallowableObject[], s: GameState, dt: number) {
    this.updated.clear();
    this.nearTime += dt;
    this.farTime += dt;
    if (this.nearTime + 1e-9 < crowdConfig.interval) return;
    const elapsed = this.nearTime;
    this.nearTime = 0;
    const candidates = objects.filter(
      (o) => o.state === "idle" && isUnlocked(s, o),
    );
    candidates.sort(
      (a, b) =>
        a.position.distanceToSquared(s.hole.position) -
        b.position.distanceToSquared(s.hole.position),
    );
    const nearby = candidates.slice(0, crowdConfig.nearbyBudget);
    updateTraffic(nearby, elapsed, s.elapsedSeconds, s.hole, activeBounds(s));
    for (const o of nearby) {
      this.updated.add(o);
      this.lastUpdated.set(o, s.elapsedSeconds);
    }
    const nearSet = new Set(nearby);
    // Oldest-updated actors get the next distant slot, preventing starvation.
    const distant = objects.filter(
      (o) => o.state === "idle" && isUnlocked(s, o) && !nearSet.has(o),
    );
    if (this.farTime >= crowdConfig.distantInterval) {
      this.farTime = 0;
      distant.sort(
        (a, b) =>
          (this.lastUpdated.get(a) ?? -Infinity) -
          (this.lastUpdated.get(b) ?? -Infinity),
      );
      const batch = distant.slice(0, crowdConfig.distantBudget);
      // Small steps avoid teleporting walkers across streets after a long sleep.
      updateTraffic(
        batch,
        crowdConfig.distantInterval,
        s.elapsedSeconds,
        undefined,
        activeBounds(s),
      );
      for (const o of batch) {
        this.updated.add(o);
        this.lastUpdated.set(o, s.elapsedSeconds);
      }
    }
  }
}
