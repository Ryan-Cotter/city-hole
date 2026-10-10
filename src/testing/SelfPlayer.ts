import {
  activeBounds,
  isUnlocked,
  lowestDetailTier,
  tierOf,
} from "../game/sections";
import { movementLimit, speedForRadius } from "../player/Hole";
import { Vector3 } from "three";
import type { GameState, SwallowableObject } from "../game/GameState";
import { config, selfPlayConfig } from "../game/constants";
import { obstacleRadius } from "../physics/collisions";

export interface Obstacle {
  x: number;
  z: number;
  half: number;
  round?: boolean;
}
// A* on an eight-neighbor grid. No diagonal cuts through occupied corners.
export function findPath(
  start: Vector3,
  end: Vector3,
  bounds: number,
  obstacles: Obstacle[],
  cell = selfPlayConfig.cellSize,
): Vector3[] {
  const size = Math.floor((bounds * 2) / cell) + 1;
  const coord = (n: number) =>
    Math.max(0, Math.min(size - 1, Math.round((n + bounds) / cell)));
  const key = (x: number, z: number) => z * size + x;
  const sx = coord(start.x),
    sz = coord(start.z),
    ex = coord(end.x),
    ez = coord(end.z);
  const source = key(sx, sz),
    goal = key(ex, ez);
  const blocked = new Set<number>();
  for (const o of obstacles)
    for (let z = coord(o.z - o.half); z <= coord(o.z + o.half); z++)
      for (let x = coord(o.x - o.half); x <= coord(o.x + o.half); x++) {
        const wx = x * cell - bounds,
          wz = z * cell - bounds;
        if (
          o.round
            ? Math.hypot(wx - o.x, wz - o.z) <= o.half
            : Math.abs(wx - o.x) <= o.half + cell * 0.35 &&
              Math.abs(wz - o.z) <= o.half + cell * 0.35
        )
          blocked.add(key(x, z));
      }
  blocked.delete(source);
  const goalIsolated =
    blocked.has(goal) &&
    [-1, 0, 1].every((dz) =>
      [-1, 0, 1].every(
        (dx) => (!dx && !dz) || blocked.has(key(ex + dx, ez + dz)),
      ),
    );
  if (goalIsolated) return [];
  blocked.delete(goal);
  const costs = new Map([[source, 0]]),
    parent = new Map<number, number>();
  const queue: { id: number; score: number }[] = [];
  const push = (entry: { id: number; score: number }) => {
    queue.push(entry);
    let i = queue.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (queue[p].score <= entry.score) break;
      queue[i] = queue[p];
      i = p;
    }
    queue[i] = entry;
  };
  const pop = () => {
    const first = queue[0],
      last = queue.pop()!;
    if (queue.length) {
      let i = 0;
      while (i * 2 + 1 < queue.length) {
        let c = i * 2 + 1;
        if (c + 1 < queue.length && queue[c + 1].score < queue[c].score) c++;
        if (queue[c].score >= last.score) break;
        queue[i] = queue[c];
        i = c;
      }
      queue[i] = last;
    }
    return first;
  };
  push({ id: source, score: 0 });
  const closed = new Set<number>();
  while (queue.length && closed.size < selfPlayConfig.maxSearchNodes) {
    const current = pop().id;
    if (closed.has(current)) continue;
    if (current === goal) {
      const path: Vector3[] = [end.clone()];
      let id = goal;
      while (id !== source) {
        path.push(
          new Vector3(
            (id % size) * cell - bounds,
            0,
            Math.floor(id / size) * cell - bounds,
          ),
        );
        id = parent.get(id)!;
      }
      return path.reverse();
    }
    closed.add(current);
    const x = current % size,
      z = Math.floor(current / size);
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = x + dx,
          nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= size || nz >= size) continue;
        const next = key(nx, nz);
        if (
          blocked.has(next) ||
          closed.has(next) ||
          (dx &&
            dz &&
            (blocked.has(key(x + dx, z)) || blocked.has(key(x, z + dz))))
        )
          continue;
        const cost = costs.get(current)! + Math.hypot(dx, dz);
        if (cost >= (costs.get(next) ?? Infinity)) continue;
        parent.set(next, current);
        costs.set(next, cost);
        push({ id: next, score: cost + Math.hypot(nx - ex, nz - ez) });
      }
  }
  return [];
}
export function edibleClusters(state: GameState) {
  const bins = new Map<
    string,
    { objects: SwallowableObject[]; points: number; center: Vector3 }
  >();
  for (const o of state.level.objects) {
    if (
      o.collisionOnly ||
      o.state !== "idle" ||
      !isUnlocked(state, o) ||
      o.radius > state.hole.radius * config.swallowFactor
    )
      continue;
    const key = `${Math.floor(o.position.x / selfPlayConfig.clusterSize)},${Math.floor(o.position.z / selfPlayConfig.clusterSize)}`;
    let group = bins.get(key);
    if (!group) {
      group = { objects: [], points: 0, center: new Vector3() };
      bins.set(key, group);
    }
    group.objects.push(o);
    group.points += o.scoreValue * (o.motion ? 0.15 : 1);
    group.center.add(o.position);
  }
  const minimum = lowestDetailTier(state);
  const relevant = [...bins.values()].filter((g) =>
    g.objects.some((o) => tierOf(o) >= minimum),
  );
  return (relevant.length ? relevant : [...bins.values()])
    .map((group) => {
      group.center.multiplyScalar(1 / group.objects.length);
      // Favor quick nearby harvests, weighted toward currently valuable size tiers.
      const distance = group.center.distanceTo(state.hole.position);
      return {
        ...group,
        utility:
          (group.points / Math.pow(distance + 3, 1.35)) *
          (group.objects.some((o) => o.unlockStage === state.areaStage + 1)
            ? 10
            : 1),
      };
    })
    .sort((a, b) => b.utility - a.utility);
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
export class SelfPlayer {
  enabled = false;
  path: Vector3[] = [];
  goal: SwallowableObject | null = null;
  private countdown = 0;
  private level = 0;
  private stalledSeconds = 0;
  private lastPosition = new Vector3();
  private lastRemaining = -1;
  private retryAfter = new Map<string, number>();
  private elapsed = 0;
  private goalDeadline = Infinity;
  private groupOffset = 0;
  reset() {
    this.path = [];
    this.goal = null;
    this.countdown = 0;
    this.level = 0;
    this.stalledSeconds = 0;
    this.lastRemaining = -1;
    this.retryAfter.clear();
    this.elapsed = 0;
    this.goalDeadline = Infinity;
    this.groupOffset = 0;
  }
  target(state: GameState, dt: number): Vector3 | null {
    if (!this.enabled) return null;
    this.countdown -= dt;
    this.elapsed += dt;
    const moved =
      this.lastPosition.distanceToSquared(state.hole.position) >
      Math.pow(Math.min(0.001, state.hole.radius * 0.05), 2);
    const harvested = this.lastRemaining !== state.score.remainingObjects;
    this.stalledSeconds = moved || harvested ? 0 : this.stalledSeconds + dt;
    this.lastPosition.copy(state.hole.position);
    this.lastRemaining = state.score.remainingObjects;
    if (
      this.goal &&
      (this.stalledSeconds >= 0.75 || this.elapsed >= this.goalDeadline)
    ) {
      this.retryAfter.set(this.goal.id, this.elapsed + 8);
      this.goal = null;
      this.path = [];
      this.countdown = 0;
      this.stalledSeconds = 0;
    }
    for (const [id, until] of this.retryAfter)
      if (until <= this.elapsed) this.retryAfter.delete(id);
    if (
      this.goal &&
      (this.goal.state !== "idle" || !isUnlocked(state, this.goal))
    ) {
      this.path = [];
      this.goal = null;
      this.countdown = 0;
    }
    if (
      (!this.goal && this.countdown <= 0) ||
      this.level !== state.hole.level
    ) {
      this.countdown = selfPlayConfig.replanSeconds;
      this.level = state.hole.level;
      const obstacles = state.level.objects
        .filter(
          (o) =>
            o.state === "idle" &&
            isUnlocked(state, o) &&
            (o.collisionOnly ||
              o.radius > state.hole.radius * config.swallowFactor),
        )
        .map((o) => ({
          x: o.position.x,
          z: o.position.z,
          half: obstacleRadius(o) + state.hole.radius * 0.45,
          round: true,
        }));
      const limit = movementLimit(state.hole.radius, activeBounds(state));
      this.path = [];
      this.goal = null;
      const groups = edibleClusters(state);
      // Keep each search bounded, but rotate past unreachable high-value clusters.
      const start = this.groupOffset % Math.max(1, groups.length);
      const candidates = [
        ...groups.slice(start),
        ...groups.slice(0, start),
      ].slice(0, selfPlayConfig.candidateGroups);
      for (const group of candidates) {
        const targets = group.objects
          .filter(
            (o) =>
              !this.retryAfter.has(o.id) &&
              (!o.motion ||
                o.motion.speed <
                  speedForRadius(state.hole.radius) *
                    (state.hole.speedMultiplier ?? 1)),
          )
          .sort(
            (a, b) =>
              a.position.distanceToSquared(state.hole.position) *
                (a.motion ? 4 : 1) -
              b.position.distanceToSquared(state.hole.position) *
                (b.motion ? 4 : 1),
          );
        for (const target of targets.slice(0, 3)) {
          const towardHole = state.hole.position.clone().sub(target.position);
          towardHole.y = 0;
          const reach = state.hole.radius * 0.6;
          const heading = Math.atan2(towardHole.x, towardHole.z);
          const destinations = [0, 0.8, -0.8, 1.6, -1.6, Math.PI]
            .map((offset) => {
              const p = target.position.clone();
              p.y = 0;
              p.x += Math.sin(heading + offset) * reach;
              p.z += Math.cos(heading + offset) * reach;
              p.x = Math.max(-limit, Math.min(limit, p.x));
              p.z = Math.max(-limit, Math.min(limit, p.z));
              return p;
            })
            .filter(
              (p) =>
                !obstacles.some(
                  (o) => Math.hypot(p.x - o.x, p.z - o.z) < o.half,
                ),
            );
          let route: Vector3[] = [];
          for (const destination of destinations) {
            if (
              !obstacles.some((o) =>
                segmentIntersectsBox(state.hole.position, destination, o),
              )
            ) {
              route = [destination];
              break;
            }
          }
          if (!route.length && destinations.length)
            route = findPath(
              state.hole.position,
              destinations[0],
              limit,
              obstacles,
              Math.min(
                Math.max(selfPlayConfig.cellSize, state.hole.radius * 0.1),
                Math.max(
                  0.002,
                  activeBounds(state) / 100,
                  state.hole.radius * 0.5,
                ),
              ),
            );
          if (route.length) {
            this.goal = target;
            this.path = route;
            let routeLength = 0,
              previous = state.hole.position;
            for (const point of route) {
              routeLength += previous.distanceTo(point);
              previous = point;
            }
            this.goalDeadline =
              this.elapsed +
              (routeLength / speedForRadius(state.hole.radius)) * 2 +
              8;
            break;
          }
          // A blocked nearest item must not hide the rest of its cluster forever.
          this.retryAfter.set(target.id, this.elapsed + 30);
        }
        if (this.goal) break;
      }
      this.groupOffset = this.goal ? 0 : start + selfPlayConfig.candidateGroups;
      if (!this.goal && groups.length) {
        // A collision can leave the hole tangent to a prop in a gap smaller than
        // one grid cell. Step into open space before asking the grid for a route.
        let escape: Vector3 | null = null,
          clearance = -Infinity;
        for (let i = 0; i < 16; i++) {
          const angle = (i * Math.PI) / 8,
            distance = Math.max(0.006, state.hole.radius * 2);
          const point = state.hole.position
            .clone()
            .add(
              new Vector3(
                Math.cos(angle) * distance,
                0,
                Math.sin(angle) * distance,
              ),
            );
          point.x = Math.max(-limit, Math.min(limit, point.x));
          point.z = Math.max(-limit, Math.min(limit, point.z));
          if (
            point.distanceTo(state.hole.position) < distance * 0.5 ||
            obstacles.some((o) =>
              segmentIntersectsBox(state.hole.position, point, {
                ...o,
                half: o.half * 0.9999,
              }),
            )
          )
            continue;
          const space = Math.min(
            ...obstacles.map(
              (o) => Math.hypot(point.x - o.x, point.z - o.z) - o.half,
            ),
          );
          if (space > clearance) {
            clearance = space;
            escape = point;
          }
        }
        if (escape) this.path = [escape];
      }
    }
    const limit = movementLimit(state.hole.radius, activeBounds(state));
    // Grid cells can round beyond the playable edge; every waypoint must be reachable.
    for (const point of this.path) {
      point.y = 0;
      point.x = Math.max(-limit, Math.min(limit, point.x));
      point.z = Math.max(-limit, Math.min(limit, point.z));
    }
    while (
      this.path.length > 1 &&
      this.path[0].distanceTo(state.hole.position) <
        Math.min(0.25, Math.max(0.0006, state.hole.radius * 0.4))
    )
      this.path.shift();
    if (this.path.length === 1 && this.goal?.motion) {
      this.path[0].set(
        Math.max(-limit, Math.min(limit, this.goal.position.x)),
        0,
        Math.max(-limit, Math.min(limit, this.goal.position.z)),
      );
    }
    return this.path[0] ?? null;
  }
}
