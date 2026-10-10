import { themeForCity } from "../game/campaign";
import type { Level } from "../game/GameState";
export function createCitySurface(level: Level) {
  const theme = themeForCity(level.cityIndex ?? 0);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 4096;
  const c = canvas.getContext("2d")!,
    scale = canvas.width / (level.bounds * 2),
    p = (n: number) => (n + level.bounds) * scale;
  const rect = (x: number, z: number, w: number, d: number, color: string) => {
    c.fillStyle = color;
    c.fillRect(p(x - w / 2), p(z - d / 2), w * scale, d * scale);
  };
  if (level.landscape) {
    c.fillStyle = "#294b65";
    c.fillRect(0, 0, 4096, 4096);
    return canvas;
  }
  rect(0, 0, level.bounds * 2, level.bounds * 2, theme.ground);
  for (const block of level.blocks) {
    rect(
      block.x,
      block.z,
      14,
      14,
      block.park
        ? "#36a958"
        : block.district === "industrial"
          ? "#adb4b8"
          : block.district === "downtown"
            ? "#b7b8b5"
            : block.district === "residential"
              ? "#cbbda9"
              : "#c4b49f",
    );
    for (const side of [-1, 1])
      rect(block.x + side * 4, block.z + 4, 3.4, 3.4, "#36a958");
  }
  for (let street = -level.bounds; street <= level.bounds; street += 20) {
    rect(0, street, level.bounds * 2, 5, theme.road);
    rect(street, 0, 5, level.bounds * 2, theme.road);
  }
  if ((level.cityIndex ?? 0) > 0)
    for (let street = -level.bounds; street <= level.bounds; street += 20) {
      for (let n = -level.bounds + 3; n < level.bounds; n += 4) {
        const nearest = Math.abs(n - Math.round(n / 20) * 20);
        if (nearest < 4) continue;
        rect(n, street, 1.8, 0.12, "#d3b84f");
        rect(street, n, 0.12, 1.8, "#d3b84f");
      }
      for (
        let cross = -level.bounds + 20;
        cross <= level.bounds - 20;
        cross += 20
      ) {
        for (let i = -2; i <= 2; i++) {
          rect(cross + i * 0.65, street + 3.25, 0.35, 1.15, "#ffffff");
          rect(street + 3.25, cross + i * 0.65, 1.15, 0.35, "#ffffff");
        }
      }
    }
  for (const [x, z] of [
    [-1.8, -1.65],
    [2, 0],
  ])
    rect(x, z, 1.2, 1.2, "#ac9479");
  for (const [x, z] of [
    [1.8, -1.65],
    [0, 2.05],
  ])
    rect(x, z, 1.25, 1.2, "#8c9275");
  // Seeded asphalt/paving grain is baked once, rather than animated noise.
  let grain = level.seed;
  for (let i = 0; i < 50000; i++) {
    grain = (Math.imul(grain, 1664525) + 1013904223) >>> 0;
    const x = grain % 4096;
    grain = (Math.imul(grain, 1664525) + 1013904223) >>> 0;
    const y = grain % 4096;
    c.fillStyle = i % 2 ? "#172c3f12" : "#f4e7bf0c";
    c.fillRect(x, y, 2, 2);
  }
  c.fillStyle = "#18273a0a";
  c.fillRect(0, 0, 4096, 4096);
  return canvas;
}
