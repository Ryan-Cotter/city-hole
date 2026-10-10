import { themeForCity } from "../game/campaign";
import { BoxGeometry, Group, Mesh } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { CityChunk } from "../world/CityChunks";
import { material } from "./Materials";
import { isBuildingType } from "./occlusion";
import type { SwallowableObject } from "../game/GameState";

// One mesh for the distant block instead of separate roofs, frames and windows.
export function createBlockVisual(
  chunk: CityChunk,
  objects: SwallowableObject[],
) {
  const group = new Group();
  group.position.set(chunk.x, 0, chunk.z);
  const parts = objects
    .filter((o) => o.state === "idle" && isBuildingType(o.type))
    .map((o) => {
      const width = Math.min(3.2, o.radius * Math.SQRT2 * 0.94);
      return new BoxGeometry(width, o.height, width).translate(
        o.position.x - chunk.x,
        o.height / 2,
        o.position.z - chunk.z,
      );
    });
  if (!parts.length) return group;
  const geometry = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  if (geometry)
    group.add(
      new Mesh(
        geometry,
        material(themeForCity(objects[0]?.cityIndex ?? 2).facade),
      ),
    );
  group.userData.object = {
    id: `block-${chunk.key}`,
    type: "building",
    position: group.position,
    radius: 14,
    height: 15,
    state: "idle",
  };
  return group;
}
export function disposeBlockVisual(group: Group) {
  group.traverse((child) => {
    if (child instanceof Mesh) child.geometry.dispose();
  });
}
