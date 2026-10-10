import { Vector3 } from "three";
import { config } from "../game/constants";
import type { Hole } from "../game/GameState";
import { type InputManager } from "../input/InputManager";
export const createHole = (): Hole => ({
  position: new Vector3(),
  velocity: new Vector3(),
  radius: config.baseRadius,
  mass: 0,
  level: 1,
});
export const movementLimit = (radius: number, bounds: number) =>
  Math.max(0, bounds - radius * 0.7);
export function clampHole(h: Hole, bounds: number) {
  const limit = movementLimit(h.radius, bounds);
  for (const axis of ["x", "z"] as const) {
    const old = h.position[axis];
    h.position[axis] = Math.max(-limit, Math.min(limit, old));
    if (old !== h.position[axis]) h.velocity[axis] = 0;
  }
}
export const speedForRadius = (_radius: number) => config.moveSpeed;
export function moveHole(
  h: Hole,
  input: InputManager,
  dt: number,
  bounds: number,
) {
  moveToward(h, input.hold.active !== null ? input.target : null, dt, bounds);
}
export function moveToward(
  h: Hole,
  target: Vector3 | null,
  dt: number,
  bounds: number,
) {
  h.velocity.set(0, 0, 0);
  if (target) {
    const delta = target.clone().sub(h.position),
      distance = delta.length();
    if (distance > Math.min(config.mouseStopDistance, h.radius * 0.3))
      h.velocity
        .copy(delta)
        .normalize()
        .multiplyScalar(Math.min(config.moveSpeed, distance / dt));
  }
  h.position.addScaledVector(h.velocity, dt);
  clampHole(h, bounds);
}
