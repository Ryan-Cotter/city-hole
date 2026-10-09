import type { Level } from "../game/GameState";
export function createCitySurface(level: Level) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 4096;
  const c = canvas.getContext("2d")!,
    scale = canvas.width / (level.bounds * 2),
    p = (n: number) => (n + level.bounds) * scale;
  const rect = (x: number, z: number, w: number, d: number, color: string) => {
    c.fillStyle = color;
    c.fillRect(p(x - w / 2), p(z - d / 2), w * scale, d * scale);
  };
  rect(0, 0, 200, 200, "#cdd8e5");
  for (const block of level.blocks) {
    rect(block.x, block.z, 14, 14, block.park ? "#36a958" : "#dabb93");
    for (const side of [-1, 1])
      rect(block.x + side * 4, block.z + 4, 3.4, 3.4, "#36a958");
  }
  for (let street = -100; street <= 100; street += 20) {
    rect(0, street, 200, 5, "#394b69");
    rect(street, 0, 5, 200, "#394b69");
  }
  for (let street = -100; street <= 100; street += 20) {
    for (let n = -97; n < 100; n += 4) {
      const nearest = Math.abs(n - Math.round(n / 20) * 20);
      if (nearest < 4) continue;
      rect(n, street, 1.8, 0.12, "#d3b84f");
      rect(street, n, 0.12, 1.8, "#d3b84f");
    }
    for (let cross = -80; cross <= 80; cross += 20) {
      for (let i = -2; i <= 2; i++) {
        rect(cross + i * 0.65, street + 3.25, 0.35, 1.15, "#ffffff");
        rect(street + 3.25, cross + i * 0.65, 1.15, 0.35, "#ffffff");
      }
    }
  }
  return canvas;
}
