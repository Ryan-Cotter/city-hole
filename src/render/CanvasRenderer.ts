import { holeOutline } from "./holeEdge";
import { clipAboveGround } from "./clipping";
import {
  Mesh,
  BoxGeometry,
  PlaneGeometry,
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
  setSurface(surface: HTMLCanvasElement, bounds: number) {
    this.surface = surface;
    this.bounds = bounds;
  }
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
    // Ground contact shadows stay subtle and work in the software renderer too.
    ctx.fillStyle = "#152637";
    ctx.globalAlpha = 0.19;
    for (const group of scene.children) {
      const o = group.userData.object as SwallowableObject | undefined;
      if (!o || !group.visible || o.state !== "idle" || o.height < 0.015)
        continue;
      const radius = Math.min(1.6, o.radius) * 0.85;
      const center = project(group.position);
      const edgeX = project(
        group.position.clone().add(new Vector3(radius, 0, 0)),
      );
      const edgeZ = project(
        group.position.clone().add(new Vector3(0, 0, radius)),
      );
      ctx.save();
      ctx.transform(
        edgeX.x - center.x,
        edgeX.y - center.y,
        edgeZ.x - center.x,
        edgeZ.y - center.y,
        center.x,
        center.y,
      );
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    const portals: Group[] = [];
    for (const child of scene.children) {
      if (child.name === "hole") {
        child.updateMatrixWorld();
        portals.push(child as Group);
      }
    }
    for (const hole of portals) {
      const bound = hole.userData.bounds ?? this.bounds;
      ctx.beginPath();
      [
        [-bound, -bound],
        [bound, -bound],
        [bound, bound],
        [-bound, bound],
      ].forEach(([x, z], i) => {
        const p = project(new Vector3(x, 0.02, z));
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.strokeStyle = "#c1a26c";
      ctx.lineWidth = 1;
      ctx.stroke();
      const outline = holeOutline(
        hole.position.x,
        hole.position.z,
        hole.scale.x,
        hole.userData.bounds ?? this.bounds,
      );
      ctx.beginPath();
      outline.forEach((point, i) => {
        const p = project(new Vector3(point.x, 0.012, point.z));
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fillStyle = "#10122b";
      ctx.fill();
      ctx.lineWidth = Math.max(
        1,
        ((hole.scale.x * this.width) /
          Math.max(1, camera.right - camera.left)) *
          0.045,
      );
      ctx.strokeStyle = hole.userData.rimColor ?? "#f44747";
      ctx.stroke();
    }
    const faces: Face[] = [];
    const light = new Vector3(-0.4, 0.85, 0.3).normalize();
    for (const group of scene.children) {
      const o = group.userData.object as SwallowableObject | undefined;
      if (!o || !group.visible) continue;
      if (
        o.motion ||
        o.pickup ||
        o.type === "tree" ||
        o.state === "falling" ||
        !group.userData.baked
      ) {
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
        if (
          !triangles ||
          o.motion ||
          o.type === "tree" ||
          o.pickup ||
          o.state === "falling"
        ) {
          triangles = [];
          const count = index ? index.count : position.count;
          // Keep planar box faces together: sorting their triangles separately creates
          // diagonal cuts through glass, roofs and neighboring body panels.
          const quad =
            geometry instanceof BoxGeometry ||
            geometry instanceof PlaneGeometry;
          const stride = quad ? 6 : 3;
          for (let i = 0; i < count; i += stride) {
            const points: Vector3[] = [];
            const corners = quad ? [0, 1, 4, 2] : [0, 1, 2];
            for (const j of corners) {
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
            const center = points
              .reduce((sum, point) => sum.add(point), new Vector3())
              .multiplyScalar(1 / points.length);
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
          const shade =
            (0.42 +
              0.52 * Math.max(0, normal.dot(light)) +
              0.08 * Math.max(0, normal.x)) *
            (0.98 +
              (o.motion ? 0 : 0.04) *
                Math.abs(
                  Math.sin(center.x * 37.1 + center.y * 17.3 + center.z * 53.7),
                ));
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
    for (let i = 0; i < faces.length; ) {
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
        if (f.layer === 0 && n % 7 === 0) {
          target.save();
          target.clip();
          target.globalAlpha = 0.08;
          target.fillStyle = "#122637";
          const xs = f.points.map((p) => p.x),
            ys = f.points.map((p) => p.y);
          const left = Math.min(...xs),
            top = Math.min(...ys),
            w = Math.max(...xs) - left,
            h = Math.max(...ys) - top;
          for (let grain = 0; grain < 5; grain++)
            target.fillRect(
              left + w * ((grain * 0.37) % 1),
              top + h * ((grain * 0.61) % 1),
              1,
              1,
            );
          target.restore();
        }
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
