import type { SwallowableObject, Motion } from "../game/GameState";
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
  if (o.type !== "person" || o.state !== "idle" || !o.motion) return;
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
) {
  const lanes = new Map<string, SwallowableObject[]>();
  const walkers = new Map<string, SwallowableObject[]>();
  for (const o of objects) {
    if (o.state !== "idle" || !o.motion) continue;
    if (o.type === "person") {
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
      fixed = m.axis === "x" ? o.position.z : o.position.x,
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
  for (const lane of lanes.values()) {
    const m = lane[0].motion!;
    lane.sort(
      (a, b) => (b.position[m.axis] - a.position[m.axis]) * m.direction,
    );
    let leader: SwallowableObject | null = null;
    for (const o of lane) {
      vehicleStep(o, dt, time, leader);
      leader = o;
    }
  }
}
// Single-object adapter retained for focused motion tests.
export function advanceTraffic(o: SwallowableObject, dt: number, time = 1) {
  updateTraffic([o], dt, time);
}
