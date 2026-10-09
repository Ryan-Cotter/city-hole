import { Box3, Ray, Vector3, type MeshStandardMaterial } from "three";
const box = new Box3(),
  ray = new Ray(),
  hit = new Vector3();
const faded = new WeakMap<MeshStandardMaterial, MeshStandardMaterial>();
export function blocksHoleView(
  position: Vector3,
  width: number,
  height: number,
  hole: Vector3,
  camera: Vector3,
) {
  const origin = hole.clone();
  origin.y = 0.04;
  const direction = camera.clone().sub(origin),
    distance = direction.length();
  ray.set(origin, direction.normalize());
  box.min.set(
    position.x - width / 2,
    Math.max(0.05, position.y),
    position.z - width / 2,
  );
  box.max.set(
    position.x + width / 2,
    position.y + height,
    position.z + width / 2,
  );
  if (box.max.y <= box.min.y || !ray.intersectBox(box, hit)) return false;
  const t = hit.distanceTo(origin);
  return t > 0.01 && t < distance - 0.1;
}
export function fadedMaterial(original: MeshStandardMaterial) {
  let value = faded.get(original);
  if (!value) {
    value = original.clone();
    value.transparent = true;
    value.opacity = 0.5;
    value.depthWrite = false;
    faded.set(original, value);
  }
  return value;
}
