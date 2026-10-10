// A smooth compression curve gives the portal a rounded, yielding edge.
export function bendHoleCoordinate(
  value: number,
  bounds: number,
  radius: number,
) {
  const start = bounds - radius * 0.16;
  const magnitude = Math.abs(value);
  if (magnitude <= start) return value;
  const width = radius * 0.2;
  return (
    Math.sign(value) *
    (start + width * (1 - Math.exp(-(magnitude - start) / width)))
  );
}
export function holeOutline(
  x: number,
  z: number,
  radius: number,
  bounds: number,
  segments = 64,
) {
  return Array.from({ length: segments }, (_, i) => {
    const angle = (i / segments) * Math.PI * 2;
    return {
      x: bendHoleCoordinate(x + Math.cos(angle) * radius, bounds, radius),
      z: bendHoleCoordinate(z + Math.sin(angle) * radius, bounds, radius),
    };
  });
}

export const rimColors = ["#f44747", "#ff922b", "#ffe34d", "#47d66d", "#379bff", "#6557d9", "#c35df5"] as const;
export const rimColorForLevel = (level: number) => rimColors[Math.max(0, Math.floor(level) - 1) % rimColors.length];
