import { bendHoleCoordinate } from "./holeEdge";
import { cameraConfig } from "../game/constants";
import { blocksHoleView, fadedMaterial, isBuildingType } from "./occlusion";
import {
  CanvasTexture,
  PlaneGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  CircleGeometry,
  RingGeometry,
  Group,
  Scene,
  Color,
  HemisphereLight,
  DirectionalLight,
  WebGLRenderer,
  Vector3,
  Frustum,
  Matrix4,
  Sphere,
  LineLoop,
  LineBasicMaterial,
  BufferGeometry,
} from "three";
import type { GameState, Level } from "../game/GameState";
import { createCamera, resizeCamera, cameraViewSize } from "./Camera";
import { createCitySurface } from "./CitySurface";
import { CanvasRenderer } from "./CanvasRenderer";
export class Renderer {
  scene = new Scene();
  camera = createCamera();
  webgl: WebGLRenderer | CanvasRenderer;
  software = false;
  hole = new Group();
  private frustum = new Frustum();
  private matrix = new Matrix4();
  private sphere = new Sphere();
  private boundary = new LineLoop(
    new BufferGeometry(),
    new LineBasicMaterial({ color: "#c1a26c" }),
  );
  private boundaryBounds = 0;
  private frames = 0;
  private lastFps = performance.now();
  private viewSize = 3.425;
  private lastZoom = performance.now();
  constructor(container: HTMLElement, level: Level) {
    const surface = createCitySurface(level);
    const probe = document.createElement("canvas");
    if (probe.getContext("webgl2")) {
      this.webgl = new WebGLRenderer({ antialias: true });
      this.webgl.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      this.webgl.localClippingEnabled = true;
    } else {
      this.webgl = new CanvasRenderer(surface, level.bounds);
      this.software = true;
    }
    this.webgl.domElement.classList.add("game-surface");
    this.webgl.domElement.setAttribute("tabindex", "0");
    this.webgl.domElement.setAttribute(
      "aria-label",
      "City game. Hold mouse or touch to steer.",
    );
    this.webgl.domElement.addEventListener("pointerdown", () =>
      this.webgl.domElement.focus(),
    );
    container.append(this.webgl.domElement);
    this.scene.background = new Color("#a9c4dd");
    this.scene.add(new HemisphereLight("#ffffff", "#8e9ccb", 2));
    const sun = new DirectionalLight("#ffffff", 2);
    sun.position.set(-15, 30, 10);
    this.scene.add(sun);
    const ground = new Mesh(
      new PlaneGeometry(level.bounds * 2, level.bounds * 2),
      new MeshBasicMaterial({ map: new CanvasTexture(surface) }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.025;
    this.scene.add(ground);
    this.scene.add(this.boundary);
    const disk = new Mesh(
      new CircleGeometry(1, 48),
      new MeshBasicMaterial({ color: "#10122b" }),
    );
    disk.rotation.x = -Math.PI / 2;
    disk.position.y = 0.012;
    this.hole.add(disk);
    const rim = new Mesh(
      new RingGeometry(1, 1.045, 48),
      new MeshBasicMaterial({ color: "#8256f6" }),
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.013;
    this.hole.add(rim);
    this.hole.name = "hole";
    this.scene.add(this.hole);
    new ResizeObserver(() => this.resize()).observe(container);
    window.addEventListener("resize", () => this.resize());
    this.resize();
  }
  follow(position: Vector3, radius = 1, moving = false) {
    const now = performance.now(),
      dt = Math.min(0.1, (now - this.lastZoom) / 1000);
    this.lastZoom = now;
    this.viewSize +=
      (cameraViewSize(radius, moving) - this.viewSize) *
      (1 - Math.exp(-cameraConfig.smoothing * dt));
    const rect = this.webgl.domElement.parentElement!.getBoundingClientRect();
    resizeCamera(this.camera, rect.width, rect.height, this.viewSize);
    this.camera.position.set(position.x + 35, 44, position.z + 35);
    this.camera.lookAt(position.x, 0, position.z);
    this.camera.updateMatrixWorld();
  }
  deformHole(position: Vector3, radius: number, bounds: number) {
    this.hole.userData.bounds = bounds;
    if (bounds !== this.boundaryBounds) {
      this.boundaryBounds = bounds;
      this.boundary.geometry.dispose();
      this.boundary.geometry = new BufferGeometry().setFromPoints([
        new Vector3(-bounds, 0.02, -bounds),
        new Vector3(bounds, 0.02, -bounds),
        new Vector3(bounds, 0.02, bounds),
        new Vector3(-bounds, 0.02, bounds),
      ]);
    }
    for (const child of this.hole.children) {
      const mesh = child as Mesh;
      const points = mesh.geometry.getAttribute("position");
      mesh.userData.restPositions ??= Float32Array.from(points.array);
      const rest = mesh.userData.restPositions as Float32Array;
      for (let i = 0; i < points.count; i++) {
        const x = position.x + rest[i * 3] * radius,
          z = position.z - rest[i * 3 + 1] * radius;
        points.setXYZ(
          i,
          (bendHoleCoordinate(x, bounds, radius) - position.x) / radius,
          -(bendHoleCoordinate(z, bounds, radius) - position.z) / radius,
          rest[i * 3 + 2],
        );
      }
      points.needsUpdate = true;
      mesh.geometry.computeBoundingSphere();
    }
  }
  chunkVisible(x: number, z: number, size: number) {
    this.frustum.setFromProjectionMatrix(
      this.matrix.multiplyMatrices(
        this.camera.projectionMatrix,
        this.camera.matrixWorldInverse,
      ),
    );
    this.sphere.center.set(x, 8, z);
    this.sphere.radius = Math.hypot(size / 2 + 2, size / 2 + 2, 9);
    return this.frustum.intersectsSphere(this.sphere);
  }
  objectVisible(o: import("../game/GameState").SwallowableObject) {
    this.sphere.center.copy(o.position);
    this.sphere.center.y += o.height / 2;
    this.sphere.radius = Math.hypot(o.radius, o.height / 2) + 0.3;
    return this.frustum.intersectsSphere(this.sphere);
  }
  updateVisibility(
    state: GameState,
    visuals: Map<string, Group>,
    objects = state.level.objects,
  ) {
    this.frustum.setFromProjectionMatrix(
      this.matrix.multiplyMatrices(
        this.camera.projectionMatrix,
        this.camera.matrixWorldInverse,
      ),
    );
    for (const o of objects) {
      const g = visuals.get(o.id);
      if (!g) continue;
      this.sphere.center.copy(o.state === "idle" ? o.position : g.position);
      this.sphere.center.y += o.height / 2;
      this.sphere.radius = Math.hypot(o.radius, o.height / 2) + 2;
      g.visible = this.frustum.intersectsSphere(this.sphere);
      if (g.visible) {
        const building = [
          "kiosk",
          "house",
          "shop",
          "building",
          "largeBuilding",
          "skyscraper",
        ].includes(o.type);
        const width = building
          ? Math.min(3.2, o.radius * Math.SQRT2 * 0.94)
          : o.radius * 2;
        const obstructed =
          isBuildingType(o.type) &&
          blocksHoleView(
            g.position,
            width,
            o.height + 0.8,
            state.hole.position,
            this.camera.position,
          );
        if (g.userData.obstructed !== obstructed) {
          g.userData.obstructed = obstructed;
          g.traverse((child) => {
            if (!(child instanceof Mesh)) return;
            child.userData.baseMaterial ??= child.material;
            const base = child.userData.baseMaterial as MeshStandardMaterial;
            child.material = obstructed ? fadedMaterial(base) : base;
          });
        }
      }
    }
  }
  resize() {
    const r = this.webgl.domElement.parentElement!.getBoundingClientRect();
    this.webgl.setSize(r.width, r.height);
    resizeCamera(this.camera, r.width, r.height, this.viewSize);
  }
  draw() {
    this.webgl.render(this.scene, this.camera);
    this.frames++;
    const now = performance.now();
    if (now - this.lastFps >= 1000) {
      this.webgl.domElement.dataset.fps = String(
        Math.round((this.frames * 1000) / (now - this.lastFps)),
      );
      this.frames = 0;
      this.lastFps = now;
    }
  }
}
