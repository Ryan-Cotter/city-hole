import { renderChunkConfig } from "../game/constants";
import type { SwallowableObject } from "../game/GameState";

export interface RenderRegion {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}
interface Node {
  x: number;
  z: number;
  size: number;
  depth: number;
  children: Map<number, Node>;
  objects: Set<SwallowableObject>;
}
// Sparse nonary tree: empty cells cost nothing. Simulation data outlives geometry.
export class RenderChunks {
  readonly root: Node;
  private membership = new WeakMap<SwallowableObject, Node>();
  visited = 0;
  constructor(
    objects: SwallowableObject[],
    bounds: number,
    readonly minimumSize = renderChunkConfig.minimumSize,
  ) {
    this.root = {
      x: 0,
      z: 0,
      size: bounds * 2,
      depth: 0,
      children: new Map(),
      objects: new Set(),
    };
    for (const o of objects) if (!o.motion) this.insert(o);
  }
  private insert(o: SwallowableObject) {
    let node = this.root;
    // Large models live at a coarser layer; tiny models reach the leaf layer.
    while (
      node.size / 3 >=
      Math.max(this.minimumSize, o.radius * 2, o.height)
    ) {
      const size = node.size / 3;
      const ix = Math.max(
        0,
        Math.min(2, Math.floor((o.position.x - node.x + node.size / 2) / size)),
      );
      const iz = Math.max(
        0,
        Math.min(2, Math.floor((o.position.z - node.z + node.size / 2) / size)),
      );
      const key = iz * 3 + ix;
      let child = node.children.get(key);
      if (!child) {
        child = {
          x: node.x + (ix - 1) * size,
          z: node.z + (iz - 1) * size,
          size,
          depth: node.depth + 1,
          children: new Map(),
          objects: new Set(),
        };
        node.children.set(key, child);
      }
      node = child;
    }
    node.objects.add(o);
    this.membership.set(o, node);
  }
  remove(o: SwallowableObject) {
    this.membership.get(o)?.objects.delete(o);
    this.membership.delete(o);
  }
  relocate(o: SwallowableObject) {
    this.remove(o);
    this.insert(o);
  }
  query(region: RenderRegion, detailSize: number) {
    const result: SwallowableObject[] = [];
    this.visited = 0;
    const collect = (node: Node) => {
      result.push(...node.objects);
      for (const child of node.children.values()) collect(child);
    };
    const visit = (node: Node) => {
      this.visited++;
      // One neighbor cell on every side. Also covers models crossing a cell edge.
      const reach = node.size * 1.5;
      if (
        node.x + reach < region.minX ||
        node.x - reach > region.maxX ||
        node.z + reach < region.minZ ||
        node.z - reach > region.maxZ
      )
        return;
      if (node.size <= Math.max(this.minimumSize * 3, detailSize)) {
        collect(node);
        return;
      }
      result.push(...node.objects);
      for (const child of node.children.values()) visit(child);
    };
    visit(this.root);
    return result;
  }
}
