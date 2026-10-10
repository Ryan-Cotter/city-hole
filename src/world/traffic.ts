import type { SwallowableObject, Hole } from "../game/GameState";
export type Signal = "green" | "yellow" | "red";
export function signalFor(axis: "x" | "z", time: number): Signal {
  const phase = ((time % 28) + 28) % 28;
  if (axis === "x") return phase < 8 ? "green" : phase < 10 ? "yellow" : "red";
  return phase >= 14 && phase < 22
    ? "green"
    : phase >= 22 && phase < 24
      ? "yellow"
      : "red";
}
export function advancePedestrian(o: SwallowableObject, dt: number) {
  if (
    (!o.critter && !["person", "mouse", "cat", "dog"].includes(o.type)) ||
    o.state !== "idle" ||
    !o.motion
  )
    return;
  const m = o.motion;
  let position = o.position[m.axis] + m.direction * m.speed * dt;
  while (position > m.max || position < m.min) {
    if (position > m.max) {
      position = 2 * m.max - position;
      m.direction = -1;
    }
    if (position < m.min) {
      position = 2 * m.min - position;
      m.direction = 1;
    }
  }
  o.position[m.axis] = position;
  o.orientation =
    m.axis === "x"
      ? m.direction > 0
        ? Math.PI / 2
        : -Math.PI / 2
      : m.direction > 0
        ? 0
        : Math.PI;
}
function vehicleStep(
  o: SwallowableObject,
  dt: number,
  time: number,
  leader: SwallowableObject | null,
) {
  const m = o.motion!,
    axis = m.axis,
    coord = o.position[axis],
    nearest = Math.round(coord / 20) * 20,
    clearance = 3.9 + o.radius;
  // Cars spawned inside an intersection must clear it rather than stop in the crossing.
  if (m.intersection == null && Math.abs(coord - nearest) < clearance - 0.05)
    m.intersection = nearest;
  if (
    m.intersection != null &&
    (coord - m.intersection) * m.direction > clearance
  )
    m.intersection = null;
  const center =
      m.intersection ??
      (m.direction > 0
        ? Math.ceil((coord + 0.001) / 20) * 20
        : Math.floor((coord - 0.001) / 20) * 20),
    stop = center - m.direction * clearance;
  let travelLimit = Infinity;
  if (m.intersection == null && signalFor(axis, time) !== "green")
    travelLimit = Math.max(0, (stop - coord) * m.direction);
  if (leader) {
    const gap =
      (leader.position[axis] - coord) * m.direction -
      leader.radius -
      o.radius -
      1.2;
    travelLimit = Math.min(travelLimit, Math.max(0, gap));
  }
  const desired = Math.min(m.speed, Math.sqrt(8 * travelLimit));
  m.currentSpeed ??= 0;
  const delta = desired - m.currentSpeed;
  m.currentSpeed += Math.max(-4 * dt, Math.min(2 * dt, delta));
  const travel = Math.min(travelLimit, m.currentSpeed * dt);
  if (
    m.intersection == null &&
    signalFor(axis, time) === "green" &&
    (coord + m.direction * travel - stop) * m.direction >= 0
  )
    m.intersection = center;
  o.position[axis] += m.direction * travel;
  if (travelLimit <= 0.001) m.currentSpeed = 0;
  if (o.position[axis] > m.max) {
    o.position[axis] = m.min;
    m.intersection = null;
  }
  if (o.position[axis] < m.min) {
    o.position[axis] = m.max;
    m.intersection = null;
  }
}
export function updateTraffic(
  objects: SwallowableObject[],
  dt: number,
  time: number,
  hole?: Hole,
) {
  const lanes = new Map<string, SwallowableObject[]>();
  const walkers = new Map<string, SwallowableObject[]>();
  for (const o of objects) {
    if (o.state !== "idle") continue;
    if (o.critter && o.motion) {
      const m = o.motion;
      m.laneCenter ??= o.position.z;
      const phase = time * 2.5 + Number(o.id.split("-").at(-1)) * 1.37;
      const targetX = (m.min + m.max) / 2 + Math.sin(phase * 0.63) * 0.42;
      const targetZ = m.laneCenter + Math.sin(phase * 1.07) * 0.28;
      const dx = targetX - o.position.x,
        dz = targetZ - o.position.z,
        distance = Math.hypot(dx, dz);
      const speed =
        0.13 * (hole && o.position.distanceTo(hole.position) < 0.5 ? 1.25 : 1);
      if (distance > 0.001) {
        const step = Math.min(distance, speed * dt);
        o.position.x += (dx / distance) * step;
        o.position.z += (dz / distance) * step;
        o.orientation = Math.atan2(dx, dz);
      }
      continue;
    }
    const animal = o.critter || ["mouse", "cat", "dog"].includes(o.type);
    const threatened =
      !!hole &&
      o.position.distanceTo(hole.position) < Math.max(2, hole.radius * 2) &&
      (animal || o.radius <= hole.radius * 0.85);
    if (o.type === "person" && !o.motion) {
      const center = Math.floor(o.position.x / 20) * 20 + 10;
      o.motion = {
        axis: "x",
        direction: 1,
        speed: 0.8,
        min: center - 5.5,
        max: center + 5.5,
      };
    }
    if (animal && !o.motion) {
      const central = Math.abs(o.position.x) < 3 && Math.abs(o.position.z) < 3;
      o.motion = {
        axis: "x",
        direction: o.variant % 2 ? 1 : -1,
        speed: 0.6,
        min: central ? -2.8 : o.position.x - 2,
        max: central ? 2.8 : o.position.x + 2,
      };
    }
    if (!o.motion) continue;
    if (o.type === "person" || animal) {
      o.motion.baseSpeed ??= o.motion.speed;
      o.motion.speed = o.motion.baseSpeed * (threatened ? 1.25 : 1);
      if (threatened)
        o.motion.direction =
          o.position[o.motion.axis] >= hole!.position[o.motion.axis] ? 1 : -1;
      const m = o.motion,
        fixed = m.axis === "x" ? o.position.z : o.position.x,
        key = `${m.axis}:${fixed}:${m.min}:${m.max}`;
      let group = walkers.get(key);
      if (!group) {
        group = [];
        walkers.set(key, group);
      }
      group.push(o);
      continue;
    }
    const m = o.motion,
      fixed = m.laneCenter ?? (m.axis === "x" ? o.position.z : o.position.x),
      key = `${m.axis}:${fixed.toFixed(2)}:${m.direction}`;
    let lane = lanes.get(key);
    if (!lane) {
      lane = [];
      lanes.set(key, lane);
    }
    lane.push(o);
  }
  for (const people of walkers.values()) {
    const m = people[0].motion!,
      axis = m.axis;
    people.sort((a, b) => a.position[axis] - b.position[axis]);
    for (const person of people) advancePedestrian(person, dt);
    for (let i = 1; i < people.length; i++) {
      const left = people[i - 1],
        right = people[i],
        gap = left.radius + right.radius + 0.2;
      if (right.position[axis] - left.position[axis] < gap) {
        left.motion!.direction = -1;
        right.motion!.direction = 1;
        right.position[axis] = left.position[axis] + gap;
      }
    }
    people.at(-1)!.position[axis] = Math.min(
      m.max,
      people.at(-1)!.position[axis],
    );
    for (let i = people.length - 2; i >= 0; i--) {
      const left = people[i],
        right = people[i + 1];
      left.position[axis] = Math.min(
        left.position[axis],
        right.position[axis] - left.radius - right.radius - 0.2,
      );
    }
    for (const person of people) {
      person.orientation =
        axis === "x"
          ? person.motion!.direction > 0
            ? Math.PI / 2
            : -Math.PI / 2
          : person.motion!.direction > 0
            ? 0
            : Math.PI;
    }
  }
  separateAnimals(objects);
  for (const lane of lanes.values()) {
    const m = lane[0].motion!;
    lane.sort(
      (a, b) => (b.position[m.axis] - a.position[m.axis]) * m.direction,
    );
    let leader: SwallowableObject | null = null;
    for (const o of lane) {
      vehicleStep(o, dt, time, leader);
      const cross = m.axis === "x" ? "z" : "x";
      o.motion!.laneCenter ??= o.position[cross];
      const near =
        hole &&
        o.radius <= hole.radius * 0.85 &&
        o.position.distanceTo(hole.position) < hole.radius + 3;
      const offset = near
        ? o.position[cross] >= hole!.position[cross]
          ? 0.22
          : -0.22
        : 0;
      o.position[cross] +=
        (o.motion!.laneCenter + offset - o.position[cross]) *
        (1 - Math.exp(-5 * dt));
      leader = o;
    }
  }
}
// Single-object adapter retained for focused motion tests.
export function advanceTraffic(o: SwallowableObject, dt: number, time = 1) {
  updateTraffic([o], dt, time);
}

// Nearby animals on different walking lanes must still avoid each other.
export function separateAnimals(objects: SwallowableObject[]) {
  const bins = new Map<string, SwallowableObject[]>(),
    cell = 1.2;
  for (const o of objects) {
    if (o.state !== "idle" || !["mouse", "cat", "dog"].includes(o.type))
      continue;
    const x = Math.floor(o.position.x / cell),
      z = Math.floor(o.position.z / cell);
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++)
        for (const other of bins.get(`${x + dx}:${z + dz}`) ?? []) {
          let vx = o.position.x - other.position.x,
            vz = o.position.z - other.position.z;
          const distance = Math.hypot(vx, vz),
            minimum = (o.radius + other.radius) * 0.9 + 0.025;
          if (distance >= minimum) continue;
          // Side-step close head-on meetings instead of flipping heading every frame.
          if (
            Math.abs(vz) < 0.02 &&
            o.motion?.axis === "x" &&
            other.motion?.axis === "x"
          ) {
            vx = 0;
            vz = 1;
          }
          const length = Math.hypot(vx, vz) || 1,
            push = (minimum - distance) / 2;
          o.position.x += (vx / length) * push;
          o.position.z += (vz / length) * push;
          other.position.x -= (vx / length) * push;
          other.position.z -= (vz / length) * push;
        }
    const key = `${x}:${z}`;
    const list = bins.get(key) ?? [];
    list.push(o);
    bins.set(key, list);
  }
}
