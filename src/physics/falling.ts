import type { SwallowableObject } from "../game/GameState";
import { config } from "../game/constants";
export function advanceFall(o: SwallowableObject, dt: number) {
  if (!o.fall) return null;
  o.fall.elapsed += dt;
  const duration =
      config.fallDurationSeconds + Math.min(0.35, o.height * 0.015),
    u = Math.min(1, o.fall.elapsed / duration),
    pull = o.fall.toCenter === false ? 0 : Math.min(1, u / 0.28),
    drop = Math.max(0, (u - 0.22) / 0.78);
  return {
    u,
    tilt: Math.sin(Math.min(1, u / 0.5) * Math.PI) * 0.22,
    x: o.fall.start.x + (o.fall.capture.x - o.fall.start.x) * pull,
    z: o.fall.start.z + (o.fall.capture.z - o.fall.start.z) * pull,
    y: o.fall.start.y - (o.height + o.fall.start.y + 3) * drop * drop,
    scale: 1,
  };
}
