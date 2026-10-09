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
export function clampHole(h: Hole, bounds: number) {
  const limit = Math.max(0, bounds - h.radius);
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
  const desired = new Vector3();
  if (input.target && input.hold.active !== null) {
    desired.subVectors(input.target, h.position);
    const distance = desired.length();
    if (distance > config.mouseStopDistance)
      desired.normalize().multiplyScalar(config.moveSpeed);
    else h.velocity.set(0, 0, 0);
  }
  h.velocity.copy(desired);
  h.position.addScaledVector(h.velocity, dt);
  clampHole(h, bounds);
}
