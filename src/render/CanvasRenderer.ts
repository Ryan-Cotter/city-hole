import { clipAboveGround } from "./clipping";
import {
  Mesh,
  Vector3,
  Color,
  type Group,
  type OrthographicCamera,
  type Scene,
  type MeshStandardMaterial,
  Matrix4,
} from "three";
import type { SwallowableObject } from "../game/GameState";
interface Face {
  points: { x: number; y: number }[];
  depth: number;
  color: string;
  shade: number;
  groupDepth: number;
  layer: number;
  objectId: string;
  opacity: number;
}
// A single raster canvas avoids thousands of SVG DOM nodes on non-WebGL browsers.
export class CanvasRenderer {
  domElement = document.createElement("canvas");
  private ctx = this.domElement.getContext("2d")!;
  private width = 1;
  private triangles = new WeakMap<
    Mesh,
    { points: Vector3[]; normal: Vector3; center: Vector3 }[]
  >();
  private projection = new Matrix4();
  private fadeCanvas = document.createElement("canvas");
  private colors = new Map<string, string>();
  private shaded(color: Color, shade: number) {
    const band = Math.round(shade * 20),
      key = color.getHex() + "-" + band;
    let value = this.colors.get(key);
    if (!value) {
      value =
        "#" +
        color
          .clone()
          .multiplyScalar(band / 20)
          .getHexString();
      this.colors.set(key, value);
    }
    return value;
  }
  private height = 1;
  constructor(
    private surface: HTMLCanvasElement,
    private bounds: number,
  ) {}
  setSize(w: number, h: number) {
    this.width = w;
    this.height = h;
    const ratio = 1;
    this.domElement.width = Math.round(w * ratio);
    this.domElement.height = Math.round(h * ratio);
    this.fadeCanvas.width = this.domElement.width;
    this.fadeCanvas.height = this.domElement.height;
    this.domElement.style.width = w + "px";
    this.domElement.style.height = h + "px";
  }
  render(scene: Scene, camera: OrthographicCamera) {
    const ctx = this.ctx,
      ratio = this.domElement.width / this.width;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = "#a9c4dd";
    ctx.fillRect(0, 0, this.width, this.height);
    const matrix = this.projection.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    ).elements;
    const project = (v: Vector3) => ({
      x:
        ((matrix[0] * v.x +
          matrix[4] * v.y +
          matrix[8] * v.z +
          matrix[12] +
          1) *
          this.width) /
        2,
      y:
        ((1 -
          (matrix[1] * v.x + matrix[5] * v.y + matrix[9] * v.z + matrix[13])) *
          this.height) /
        2,
    });
    const a = project(new Vector3(-this.bounds, 0, -this.bounds)),
      b = project(new Vector3(this.bounds, 0, -this.bounds)),
      d = project(new Vector3(-this.bounds, 0, this.bounds));
    ctx.save();
    ctx.transform(
      (b.x - a.x) / this.surface.width,
      (b.y - a.y) / this.surface.width,
      (d.x - a.x) / this.surface.width,
      (d.y - a.y) / this.surface.width,
      a.x,
      a.y,
    );
    ctx.drawImage(this.surface, 0, 0);
    ctx.restore();
    const portals: Group[] = [];
    for (const child of scene.children) {
      if (child.name === "hole") {
        child.updateMatrixWorld();
        portals.push(child as Group);
      }
    }
    for (const hole of portals) {
      const center = hole.position.clone();
      const c = project(center),
        x = project(center.clone().add(new Vector3(hole.scale.x, 0, 0))),
        z = project(center.clone().add(new Vector3(0, 0, hole.scale.z)));
      ctx.save();
      ctx.transform(x.x - c.x, x.y - c.y, z.x - c.x, z.y - c.y, c.x, c.y);
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fillStyle = "#10122b";
      ctx.fill();
      ctx.lineWidth = 0.045;
      ctx.strokeStyle = "#8256f6";
      ctx.stroke();
      ctx.restore();
    }
    const faces: Face[] = [];
    const light = new Vector3(-0.4, 0.85, 0.3).normalize();
    for (const group of scene.children) {
      const o = group.userData.object as SwallowableObject | undefined;
      if (!o || !group.visible) continue;
      if (o.motion || o.state === "falling" || !group.userData.baked) {
        group.updateMatrixWorld();
        group.userData.baked = true;
      }
      const groupDepth = group.position
        .clone()
        .applyMatrix4(camera.matrixWorldInverse).z;
      group.traverse((child) => {
        if (!(child instanceof Mesh) || !child.visible) return;
        const geometry = child.geometry,
          position = geometry.attributes.position,
          index = geometry.index,
          mat = child.material as MeshStandardMaterial;
        const base = mat.color;
        let triangles = this.triangles.get(child);
        if (!triangles || o.motion || o.state === "falling") {
          triangles = [];
          const count = index ? index.count : position.count;
          for (let i = 0; i < count; i += 3) {
            const points: Vector3[] = [];
            for (let j = 0; j < 3; j++) {
              const n = index ? index.getX(i + j) : i + j;
              points.push(
                new Vector3(
                  position.getX(n),
                  position.getY(n),
                  position.getZ(n),
                ).applyMatrix4(child.matrixWorld),
              );
            }
            const normal = points[1]
              .clone()
              .sub(points[0])
              .cross(points[2].clone().sub(points[0]))
              .normalize();
            const center = points[0]
              .clone()
              .add(points[1])
              .add(points[2])
              .multiplyScalar(1 / 3);
            triangles.push({ points, normal, center });
          }
          if (!o.motion && o.state !== "falling")
            this.triangles.set(child, triangles);
        }
        for (const { points, normal, center } of triangles) {
          if (normal.dot(camera.position.clone().sub(center)) <= 0) continue;
          let polygon = points;
          if (o.state === "falling") {
            polygon = clipAboveGround(points);
            if (polygon.length < 3) continue;
          }
          const screen = polygon.map(project);
          if (
            screen.every((p) => p.x < 0) ||
            screen.every((p) => p.x > this.width) ||
            screen.every((p) => p.y < 0) ||
            screen.every((p) => p.y > this.height)
          )
            continue;
          const shade = 0.66 + 0.34 * Math.max(0, normal.dot(light));
          faces.push({
            points: screen,
            depth: center.clone().applyMatrix4(camera.matrixWorldInverse).z,
            color: this.shaded(base, shade),
            shade,
            groupDepth,
            layer: child.renderOrder,
            objectId: o.id,
            opacity: group.userData.obstructed ? 0.5 : 1,
          });
        }
      });
    }
    faces.sort(
      (a, b) =>
        a.groupDepth - b.groupDepth ||
        a.objectId.localeCompare(b.objectId) ||
        a.layer - b.layer ||
        a.depth - b.depth,
    );
    const fade = this.fadeCanvas.getContext("2d")!;
    for (let i = 0; i < faces.length;) {
      let end = i + 1;
      while (end < faces.length && faces[end].objectId === faces[i].objectId)
        end++;
      const translucent = faces[i].opacity < 1;
      const target = translucent ? fade : ctx;
      if (translucent) {
        fade.setTransform(ratio, 0, 0, ratio, 0, 0);
        fade.clearRect(0, 0, this.width, this.height);
      }
      for (let n = i; n < end; n++) {
        const f = faces[n];
        target.beginPath();
        target.moveTo(f.points[0].x, f.points[0].y);
        for (let k = 1; k < f.points.length; k++)
          target.lineTo(f.points[k].x, f.points[k].y);
        target.closePath();
        target.fillStyle = f.color;
        target.fill();
      }
      if (translucent) {
        ctx.globalAlpha = 0.5;
        ctx.drawImage(this.fadeCanvas, 0, 0, this.width, this.height);
        ctx.globalAlpha = 1;
      }
      i = end;
    }
  }
}
