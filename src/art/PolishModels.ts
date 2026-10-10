// Shared original low-poly assets for the review gallery and modern city variants.
import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
type Finish = "paint" | "glass" | "brick" | "plaster" | "rubber" | "metal";
const geometryCache = new Map<string, BoxGeometry>();
const mats = new Map<string, MeshStandardMaterial>();
export function finish(color: string, kind: Finish = "paint") {
  const key = color + kind;
  if (mats.has(key)) return mats.get(key)!;
  let map: CanvasTexture | null = null;
  if (
    typeof document !== "undefined" &&
    (kind === "brick" || kind === "plaster")
  ) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 128, 128);
    let seed = 78;
    for (let i = 0; i < 1800; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const x = seed % 128;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      ctx.fillStyle = i % 2 ? "#f1efea" : "#e7e5e0";
      ctx.fillRect(x, seed % 128, 1, 1);
    }
    if (kind === "brick") {
      ctx.strokeStyle = "#c1b9ad";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let y = 0; y <= 128; y += 16) {
        ctx.moveTo(0, y);
        ctx.lineTo(128, y);
        for (let x = ((y / 16) % 2) * 16; x < 128; x += 32) {
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + 16);
        }
      }
      ctx.stroke();
    }
    map = new CanvasTexture(c);
    map.colorSpace = SRGBColorSpace;
  }
  const m = new MeshStandardMaterial({
    color,
    map,
    roughness:
      kind === "glass"
        ? 0.22
        : kind === "metal"
          ? 0.5
          : kind === "paint"
            ? 0.62
            : 0.92,
    metalness: kind === "metal" ? 0.35 : kind === "glass" ? 0.18 : 0,
  });
  mats.set(key, m);
  return m;
}
function box(
  g: Group,
  color: string,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  kind: Finish = "paint",
  bevel = 0.035,
) {
  const geometryKey = [w, h, d, bevel].join(":");
  let geometry = geometryCache.get(geometryKey);
  if (!geometry) {
    geometry = bevel
      ? new RoundedBoxGeometry(w, h, d, 1, Math.min(bevel, w / 5, h / 5, d / 5))
      : new BoxGeometry(w, h, d);
    geometryCache.set(geometryKey, geometry);
  }
  const m = new Mesh(geometry, finish(color, kind));
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  return m;
}
function wheel(g: Group, x: number, z: number) {
  const m = new Mesh(
    new CylinderGeometry(0.25, 0.25, 0.17, 12),
    finish("#293039", "rubber"),
  );
  m.rotation.z = Math.PI / 2;
  m.position.set(x, 0.29, z);
  m.castShadow = true;
  g.add(m);
  const hub = new Mesh(
    new CylinderGeometry(0.12, 0.12, 0.18, 12),
    finish("#a4adb1", "metal"),
  );
  hub.rotation.z = Math.PI / 2;
  hub.position.copy(m.position);
  g.add(hub);
}
export function polishedCar() {
  const g = new Group();
  box(g, "#387e9a", 0, 0.47, 0, 1.12, 0.4, 2.25, "paint", 0.12);
  box(g, "#326e88", 0, 0.83, -0.12, 0.96, 0.53, 1.19, "paint", 0.1);
  box(g, "#203a4b", 0, 0.85, 0.491, 0.79, 0.32, 0.026, "glass", 0.008);
  box(g, "#203a4b", 0, 0.85, -0.725, 0.79, 0.31, 0.024, "glass", 0.008);
  for (const side of [-1, 1]) {
    for (const z of [-0.43, 0.15])
      box(
        g,
        "#203a4b",
        side * 0.487,
        0.86,
        z,
        0.024,
        0.3,
        0.46,
        "glass",
        0.008,
      );
    box(
      g,
      "#bdc8c6",
      side * 0.499,
      0.63,
      -0.21,
      0.024,
      0.032,
      0.11,
      "metal",
      0.004,
    );
    box(g, "#397c95", side * 0.6, 0.78, 0.34, 0.15, 0.1, 0.17);
    wheel(g, side * 0.54, -0.68);
    wheel(g, side * 0.54, 0.7);
    box(
      g,
      "#ffefc0",
      side * 0.36,
      0.49,
      1.126,
      0.27,
      0.115,
      0.027,
      "paint",
      0.012,
    );
    box(g, "#d75d53", side * 0.36, 0.49, -1.126, 0.25, 0.11, 0.027);
  }
  box(g, "#28333f", 0, 0.35, 1.145, 0.83, 0.075, 0.055);
  box(g, "#c8d0c8", 0, 0.47, 1.146, 0.22, 0.075, 0.018, "metal", 0.005);
  return g;
}
export function polishedBuilding() {
  const g = new Group();
  box(g, "#ad7660", 0, 1.55, 0, 2.5, 3.1, 2, "brick");
  box(g, "#e4d6bc", 0, 1.43, 0, 2.6, 0.14, 2.1);
  box(g, "#e4d6bc", 0, 3.08, 0, 2.7, 0.18, 2.2);
  box(g, "#495861", 0, 3.19, 0, 2.42, 0.08, 1.92);
  box(g, "#758384", 0.55, 3.36, -0.35, 0.58, 0.26, 0.55, "metal");
  for (const y of [1.96, 2.63])
    for (const x of [-0.77, 0, 0.77]) {
      box(g, "#eadfc9", x, y, 1.02, 0.57, 0.51, 0.08);
      box(g, "#2f4b60", x, y + 0.025, 1.067, 0.43, 0.37, 0.02, "glass", 0.004);
      box(g, "#f0e4cf", x, y - 0.24, 1.105, 0.63, 0.065, 0.18);
    }
  for (const y of [1.96, 2.63])
    for (const z of [-0.6, 0.2, 0.72]) {
      box(g, "#e8dcc3", 1.27, y, z, 0.08, 0.51, 0.39);
      box(g, "#2f4b60", 1.316, y + 0.02, z, 0.02, 0.36, 0.27, "glass", 0.003);
    }
  for (const x of [-0.72, 0.0, 0.72])
    box(g, "#294b56", x, 0.68, 1.024, 0.6, 1.05, 0.025, "glass", 0.005);
  box(g, "#eeddbb", 0, 1.29, 1.12, 2.36, 0.2, 0.12);
  for (let i = 0; i < 8; i++)
    box(
      g,
      i % 2 ? "#e8dac1" : "#447f77",
      -0.98 + i * 0.28,
      1.11,
      1.32,
      0.28,
      0.095,
      0.55,
    );
  box(g, "#dcccb1", 0, 0.08, 1.1, 2.6, 0.16, 0.3);
  return g;
}
export function polishedProps() {
  const g = new Group();
  box(g, "#386759", -0.65, 0.47, 0, 1.05, 0.75, 0.7);
  box(g, "#263f39", -0.65, 0.87, 0, 1.14, 0.12, 0.8);
  for (const x of [-1.05, -0.26])
    for (const z of [-0.26, 0.26]) {
      const m = new Mesh(
        new CylinderGeometry(0.095, 0.095, 0.09, 8),
        finish("#293039", "rubber"),
      );
      m.rotation.z = Math.PI / 2;
      m.position.set(x, 0.1, z);
      g.add(m);
    }
  box(g, "#e3c881", -0.65, 0.5, 0.357, 0.32, 0.19, 0.018);
  for (let i = 0; i < 3; i++)
    box(g, "#294c42", -0.98 + i * 0.33, 0.47, 0.365, 0.028, 0.44, 0.025);
  box(g, "#bb8660", 0.9, 0.34, 0, 0.7, 0.68, 0.7, "plaster");
  for (const z of [-0.355, 0.355])
    for (const y of [0.07, 0.58])
      box(g, "#83543e", 0.9, y, z, 0.75, 0.095, 0.055);
  box(g, "#d8ad76", 0.9, 0.69, 0, 0.72, 0.035, 0.73);
  for (let i = 0; i < 4; i++)
    box(
      g,
      i % 2 ? "#d7744d" : "#dcba6c",
      0.65 + i * 0.15,
      0.76,
      0.07,
      0.11,
      0.1,
      0.12,
    );
  box(g, "#a7724c", 0.28, 0.1, 0.85, 0.6, 0.2, 0.38);
  box(g, "#d8c4a0", 0.28, 0.22, 0.85, 0.55, 0.04, 0.34);
  return g;
}
