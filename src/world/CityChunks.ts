import { cityConfig } from "../game/constants";
import type { SwallowableObject } from "../game/GameState";

export interface CityChunk {
  key: string;
  x: number;
  z: number;
  objects: SwallowableObject[];
}

// Simulation positions persist even when their models are unloaded.
export class CityChunks {
  private membership = new WeakMap<SwallowableObject, CityChunk>();
  readonly chunks = new Map<string, CityChunk>();
  constructor(
    readonly objects: SwallowableObject[],
    readonly size = cityConfig.blockSize,
  ) {
    for (const object of objects.filter((o) => !o.motion)) {
      const ix = Math.floor(object.position.x / size),
        iz = Math.floor(object.position.z / size);
      const key = `${ix}:${iz}`;
      let chunk = this.chunks.get(key);
      if (!chunk) {
        chunk = {
          key,
          x: (ix + 0.5) * size,
          z: (iz + 0.5) * size,
          objects: [],
        };
        this.chunks.set(key, chunk);
      }
      chunk.objects.push(object);
      this.membership.set(object,chunk);
    }
  }
  remove(object: SwallowableObject) {
    const chunk = this.membership.get(object);
    if (!chunk) return;
    this.membership.delete(object);
    const index = chunk.objects.indexOf(object);
    if (index >= 0) {
      const last = chunk.objects.pop()!;
      if (index < chunk.objects.length) chunk.objects[index] = last;
    }
  }
  nearby(x: number, z: number, radius: number) {
    const result: SwallowableObject[] = [];
    for (
      let ix = Math.floor((x - radius) / this.size);
      ix <= Math.floor((x + radius) / this.size);
      ix++
    )
      for (
        let iz = Math.floor((z - radius) / this.size);
        iz <= Math.floor((z + radius) / this.size);
        iz++
      )
        result.push(...(this.chunks.get(`${ix}:${iz}`)?.objects ?? []));
    return result;
  }
}
