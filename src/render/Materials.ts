import { Color, MeshStandardMaterial, Plane, Vector3 } from "three";
const clipping = new Plane(new Vector3(0, 1, 0), 0);
const cache = new Map<string, MeshStandardMaterial>();
export function material(color: string, clip = true) {
  const key = color + clip;
  if (!cache.has(key))
    cache.set(
      key,
      new MeshStandardMaterial({
        color: new Color(color).multiplyScalar(0.78),
        roughness: 0.85,
        flatShading: true,
        clippingPlanes: clip ? [clipping] : [],
      }),
    );
  return cache.get(key)!;
}
