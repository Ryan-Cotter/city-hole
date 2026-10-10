import {
  Color,
  MeshStandardMaterial,
  Plane,
  Vector3,
  CanvasTexture,
} from "three";
const clipping = new Plane(new Vector3(0, 1, 0), 0);
const grains = new Map<string, CanvasTexture>();
function surfaceTexture(style: string) {
  if (typeof document === "undefined") return null;
  if (grains.has(style)) return grains.get(style)!;
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
  if (style === "masonry") {
    c.strokeStyle = "#dbd7d0";
    c.lineWidth = 0.7;
    c.beginPath();
    for (let y = 0; y <= 64; y += 8) {
      c.moveTo(0, y);
      c.lineTo(64, y);
      for (let x = ((y / 8) % 2) * 8; x < 64; x += 16) {
        c.moveTo(x, y);
        c.lineTo(x, y + 8);
      }
    }
    c.stroke();
  }
  const grain = new CanvasTexture(canvas);
  grains.set(style, grain);
  return grain;
}
const cache = new Map<string, MeshStandardMaterial>();
export function material(
  color: string,
  clip = true,
  textured = true,
  style = "grain",
) {
  const key = color + clip + textured + style;
  if (!cache.has(key))
    cache.set(
      key,
      new MeshStandardMaterial({
        color: new Color(color).multiplyScalar(0.72),
        roughness: textured ? 0.85 : 0.5,
        map: textured ? surfaceTexture(style) : null,
        flatShading: true,
        clippingPlanes: clip ? [clipping] : [],
      }),
    );
  return cache.get(key)!;
}
