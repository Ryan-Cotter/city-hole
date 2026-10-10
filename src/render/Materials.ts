import {
  Color,
  MeshStandardMaterial,
  Plane,
  Vector3,
  CanvasTexture,
} from "three";
const clipping = new Plane(new Vector3(0, 1, 0), 0);
let grain: CanvasTexture | null = null;
function surfaceTexture() {
  if (grain || typeof document === "undefined") return grain;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const c = canvas.getContext("2d");
  if (!c) return null;
  c.fillStyle = "#ffffff";
  c.fillRect(0, 0, 64, 64);
  let seed = 913;
  for (let i = 0; i < 600; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const x = seed % 64;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const y = seed % 64;
    c.fillStyle = i % 3 ? "#f1f1f1" : "#e9e9e9";
    c.fillRect(x, y, 1, 1);
  }
  grain = new CanvasTexture(canvas);
  return grain;
}
const cache = new Map<string, MeshStandardMaterial>();
export function material(color: string, clip = true, textured = true) {
  const key = color + clip + textured;
  if (!cache.has(key))
    cache.set(
      key,
      new MeshStandardMaterial({
        color: new Color(color).multiplyScalar(0.72),
        roughness: 0.85,
        map: textured ? surfaceTexture() : null,
        flatShading: true,
        clippingPlanes: clip ? [clipping] : [],
      }),
    );
  return cache.get(key)!;
}
