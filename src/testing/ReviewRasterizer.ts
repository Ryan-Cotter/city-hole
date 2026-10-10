// Small, depth-buffered review renderer for browsers without WebGL.
// Kept out of gameplay. Supports the preview's opaque textured models.
import {
  Mesh,
  Vector3,
  Vector2,
  Matrix4,
  Matrix3,
  type Scene,
  type OrthographicCamera,
  type MeshStandardMaterial,
  type Texture,
} from "three";
export class ReviewRasterizer {
  domElement = document.createElement("canvas");
  private ctx = this.domElement.getContext("2d")!;
  private textures = new WeakMap<Texture, ImageData>();
  setSize(w: number, h: number) {
    const scale = Math.min(1, 900 / w);
    this.domElement.width = Math.round(w * scale);
    this.domElement.height = Math.round(h * scale);
    this.domElement.style.width = w + "px";
    this.domElement.style.height = h + "px";
  }
  render(scene: Scene, camera: OrthographicCamera) {
    const w = this.domElement.width,
      h = this.domElement.height;
    const img = this.ctx.createImageData(w, h),
      data = img.data,
      depth = new Float32Array(w * h).fill(Infinity);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 204;
      data[i + 1] = 214;
      data[i + 2] = 214;
      data[i + 3] = 255;
    }
    const vp = new Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    const light = new Vector3(-0.4, 0.85, 0.3).normalize();
    scene.updateMatrixWorld(true);
    for (const group of scene.children) {
      if (!group.userData.object || !group.visible) continue;
      group.traverse((child) => {
        if (!(child instanceof Mesh) || !child.visible) return;
        const mat = child.material as MeshStandardMaterial,
          geo = child.geometry,
          pos = geo.attributes.position,
          uv = geo.attributes.uv,
          norm = geo.attributes.normal,
          idx = geo.index;
        const nm = new Matrix3().getNormalMatrix(child.matrixWorld);
        let tex: ImageData | undefined;
        if (mat.map) {
          tex = this.textures.get(mat.map);
          if (!tex && mat.map.image) {
            const c = document.createElement("canvas");
            c.width = mat.map.image.width;
            c.height = mat.map.image.height;
            const cx = c.getContext("2d")!;
            cx.drawImage(mat.map.image, 0, 0);
            tex = cx.getImageData(0, 0, c.width, c.height);
            this.textures.set(mat.map, tex);
          }
        }
        const color = mat.color.clone().convertLinearToSRGB();
        const vertices = [];
        for (let i = 0; i < pos.count; i++) {
          const world = new Vector3()
            .fromBufferAttribute(pos, i)
            .applyMatrix4(child.matrixWorld);
          const p = world.clone().applyMatrix4(vp);
          const normal = norm
            ? new Vector3()
                .fromBufferAttribute(norm, i)
                .applyMatrix3(nm)
                .normalize()
            : new Vector3(0, 1, 0);
          vertices.push({
            x: ((p.x + 1) * w) / 2,
            y: ((1 - p.y) * h) / 2,
            z: p.z,
            normal,
            world,
            uv: uv ? new Vector2().fromBufferAttribute(uv, i) : new Vector2(),
          });
        }
        const count = idx ? idx.count : pos.count;
        for (let i = 0; i < count; i += 3) {
          const a = vertices[idx ? idx.getX(i) : i],
            b = vertices[idx ? idx.getX(i + 1) : i + 1],
            c = vertices[idx ? idx.getX(i + 2) : i + 2];
          const face = b.world
            .clone()
            .sub(a.world)
            .cross(c.world.clone().sub(a.world));
          if (face.dot(camera.position.clone().sub(a.world)) <= 0) continue;
          const area = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
          if (Math.abs(area) < 0.001) continue;
          const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x))),
            maxX = Math.min(w - 1, Math.ceil(Math.max(a.x, b.x, c.x))),
            minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y))),
            maxY = Math.min(h - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
          const shade =
            0.55 +
            0.45 *
              Math.max(
                0,
                a.normal
                  .clone()
                  .add(b.normal)
                  .add(c.normal)
                  .normalize()
                  .dot(light),
              );
          for (let y = minY; y <= maxY; y++)
            for (let x = minX; x <= maxX; x++) {
              const px = x + 0.5,
                py = y + 0.5;
              const u =
                  ((b.x - px) * (c.y - py) - (b.y - py) * (c.x - px)) / area,
                v = ((c.x - px) * (a.y - py) - (c.y - py) * (a.x - px)) / area,
                t = 1 - u - v;
              if (u < 0 || v < 0 || t < 0) continue;
              const z = u * a.z + v * b.z + t * c.z,
                k = y * w + x;
              if (z >= depth[k]) continue;
              depth[k] = z;
              let tr = 1,
                tg = 1,
                tb = 1;
              if (tex) {
                const tx = Math.min(
                  tex.width - 1,
                  Math.max(
                    0,
                    Math.floor(
                      (u * a.uv.x + v * b.uv.x + t * c.uv.x) * tex.width,
                    ),
                  ),
                );
                const ty = Math.min(
                  tex.height - 1,
                  Math.max(
                    0,
                    Math.floor(
                      (1 - u * a.uv.y - v * b.uv.y - t * c.uv.y) * tex.height,
                    ),
                  ),
                );
                const ti = (ty * tex.width + tx) * 4;
                tr = tex.data[ti] / 255;
                tg = tex.data[ti + 1] / 255;
                tb = tex.data[ti + 2] / 255;
              }
              data[k * 4] = color.r * 255 * shade * tr;
              data[k * 4 + 1] = color.g * 255 * shade * tg;
              data[k * 4 + 2] = color.b * 255 * shade * tb;
            }
        }
      });
    }
    this.ctx.putImageData(img, 0, 0);
  }
}
