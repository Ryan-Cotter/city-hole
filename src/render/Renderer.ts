import { createBlob, blobHeight } from "./Blob";
import { bendHoleCoordinate, rimColorForLevel } from "./holeEdge";
import { cameraConfig, renderChunkConfig } from "../game/constants";
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
  private fadingBoundary = new LineLoop(
    new BufferGeometry(),
    new LineBasicMaterial({ color: "#8ff7e4", transparent: true, opacity: 0 }),
  );
  private revealStarted = -1;
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
    this.scene.add(new HemisphereLight("#e9eff4", "#65717e", 1.25));
    const sun = new DirectionalLight("#fff0d6", 2.6);
    sun.position.set(-15, 30, 10);
    this.scene.add(sun);
    const fill = new DirectionalLight("#8ab7ef", 0.55);
    fill.position.set(18, 12, -22);
    this.scene.add(fill);
    const ground = new Mesh(
      new PlaneGeometry(level.bounds * 2, level.bounds * 2),
      new MeshBasicMaterial({ map: new CanvasTexture(surface) }),
    );
    ground.name = "city-ground";
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.0001;
    this.scene.add(ground);
    this.scene.add(this.boundary, this.fadingBoundary);
    const disk = new Mesh(
      new CircleGeometry(1, 48),
      new MeshBasicMaterial({
        color: "#e78594",
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      }),
    );
    disk.rotation.x = -Math.PI / 2;
    disk.position.y = 0.012;
    this.hole.add(disk);
    const rim = new Mesh(
      new RingGeometry(1, 1.045, 48),
      new MeshBasicMaterial({ color: rimColorForLevel(1) }),
    );
    rim.name = "rim";
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.013;
    this.hole.add(rim);
    this.hole.add(createBlob());
    const vortex = new Mesh(
      new RingGeometry(2.9, 3, 48, 1, 0, Math.PI * 1.55),
      new MeshBasicMaterial({
        color: "#b796ff",
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    );
    vortex.name = "vortex";
    vortex.rotation.x = -Math.PI / 2;
    vortex.visible = false;
    this.hole.add(vortex);
    this.hole.name = "hole";
    this.scene.add(this.hole);
    new ResizeObserver(() => this.resize()).observe(container);
    window.addEventListener("resize", () => this.resize());
    this.resize();
  }
  follow(position: Vector3, radius = 1, moving = false, minimumView = 0) {
    const displacement = position.clone().sub(this.previousFocus);
    if (displacement.lengthSq() > 1e-12)
      this.preloadDirection.copy(displacement).normalize();
    if (!moving) this.preloadDirection.multiplyScalar(0.9);
    this.previousFocus.copy(position);
    for (const edge of this.hole.children)
      if (edge.name !== "blob")
        edge.position.y =
          Math.min(0.00001, radius * 0.001) +
          (edge.name === "rim" ? 0.000001 : 0);
    const now = performance.now(),
      dt = Math.min(0.1, (now - this.lastZoom) / 1000);
    this.lastZoom = now;
    const rect = this.webgl.domElement.parentElement!.getBoundingClientRect();
    const framing = rect.width >= 640 ? cameraConfig.desktopFraming : 1;
    this.viewSize +=
      (Math.max(minimumView, cameraViewSize(radius, moving) * framing) -
        this.viewSize) *
      (1 - Math.exp(-cameraConfig.smoothing * dt));
    resizeCamera(this.camera, rect.width, rect.height, this.viewSize);
    const distanceScale = Math.max(1, this.viewSize / 30);
    this.camera.position.set(
      position.x + 35 * distanceScale,
      44 * distanceScale,
      position.z + 35 * distanceScale,
    );
    this.camera.lookAt(position.x, 0, position.z);
    this.camera.updateMatrixWorld();
  }
  setCity(level: Level) {
    const surface = createCitySurface(level);
    if (this.webgl instanceof CanvasRenderer)
      this.webgl.setSurface(surface, level.bounds);
    const ground = this.scene.getObjectByName("city-ground") as Mesh;
    ground.geometry.dispose();
    ground.geometry = new PlaneGeometry(level.bounds * 2, level.bounds * 2);
    const material = ground.material as MeshBasicMaterial;
    material.map?.dispose();
    material.map = new CanvasTexture(surface);
    material.needsUpdate = true;
  }
  setHoleLevel(level: number) {
    const color = rimColorForLevel(level);
    if (this.hole.userData.rimColor === color) return;
    this.hole.userData.rimColor = color;
    const rim = this.hole.getObjectByName("rim") as Mesh;
    (rim.material as MeshBasicMaterial).color.set(color);
    const blob = this.hole.getObjectByName("blob") as Mesh;
    (blob.material as MeshStandardMaterial).color
      .set(color)
      .lerp(new Color("#ffffff"), 0.35);
  }
  deformHole(position: Vector3, radius: number, bounds: number) {
    this.hole.userData.bounds = bounds;
    if (bounds !== this.boundaryBounds) {
      this.boundaryBounds = bounds;
      this.boundary.geometry.dispose();
      this.boundary.geometry = new BufferGeometry().setFromPoints([
        new Vector3(-bounds, 0, -bounds),
        new Vector3(bounds, 0, -bounds),
        new Vector3(bounds, 0, bounds),
        new Vector3(-bounds, 0, bounds),
      ]);
    }
    for (const child of this.hole.children) {
      const mesh = child as Mesh;
      const points = mesh.geometry.getAttribute("position");
      mesh.userData.restPositions ??= Float32Array.from(points.array);
      const rest = mesh.userData.restPositions as Float32Array;
      for (let i = 0; i < points.count; i++) {
        const x = position.x + rest[i * 3] * radius,
          z =
            position.z +
            (mesh.name === "blob" ? rest[i * 3 + 2] : -rest[i * 3 + 1]) *
              radius;
        points.setXYZ(
          i,
          (bendHoleCoordinate(x, bounds, radius) - position.x) / radius,
          mesh.name === "blob"
            ? rest[i * 3 + 1]
            : -(bendHoleCoordinate(z, bounds, radius) - position.z) / radius,
          mesh.name === "blob"
            ? (bendHoleCoordinate(z, bounds, radius) - position.z) / radius
            : rest[i * 3 + 2],
        );
      }
      points.needsUpdate = true;
      mesh.geometry.computeBoundingSphere();
    }
  }
  private previousFocus = new Vector3();
  private preloadDirection = new Vector3();
  preloadRegion() {
    const points: Vector3[] = [];
    for (const x of [-1, 1])
      for (const y of [-1, 1]) {
        const near = new Vector3(x, y, -1).unproject(this.camera);
        const far = new Vector3(x, y, 1).unproject(this.camera);
        const direction = far.sub(near);
        points.push(near.addScaledVector(direction, -near.y / direction.y));
      }
    const padding = this.viewSize * renderChunkConfig.cameraPadding;
    const ahead = this.preloadDirection
      .clone()
      .multiplyScalar(this.viewSize * renderChunkConfig.movementLookAhead);
    return {
      minX:
        Math.min(...points.map((p) => p.x)) - padding + Math.min(0, ahead.x),
      maxX:
        Math.max(...points.map((p) => p.x)) + padding + Math.max(0, ahead.x),
      minZ:
        Math.min(...points.map((p) => p.z)) - padding + Math.min(0, ahead.z),
      maxZ:
        Math.max(...points.map((p) => p.z)) + padding + Math.max(0, ahead.z),
    };
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
    const reveal = state.world.reveal;
    if (reveal && this.revealStarted !== reveal.started) {
      this.revealStarted = reveal.started;
      this.fadingBoundary.geometry.dispose();
      const b = reveal.from;
      this.fadingBoundary.geometry = new BufferGeometry().setFromPoints([
        new Vector3(-b, 0.03, -b),
        new Vector3(b, 0.03, -b),
        new Vector3(b, 0.03, b),
        new Vector3(-b, 0.03, b),
      ]);
    }
    (this.fadingBoundary.material as LineBasicMaterial).opacity = reveal
      ? Math.max(0, 1 - (state.elapsedSeconds - reveal.started) / 2)
      : 0;
    this.hole.userData.reveal = reveal;
    this.hole.userData.time = state.elapsedSeconds;
    this.hole.userData.vortex =
      (state.boosts.vortexUntil ?? 0) > state.elapsedSeconds;
    const vortex = this.hole.getObjectByName("vortex")!;
    vortex.visible = this.hole.userData.vortex;
    vortex.rotation.z = state.elapsedSeconds * 3;
    const count = state.score.swallowedObjects;
    if (this.hole.userData.absorbed !== count) {
      if (
        count > (this.hole.userData.absorbed ?? 0) &&
        state.elapsedSeconds - (this.hole.userData.lastAbsorption ?? -100) >
          0.12
      )
        this.hole.userData.lastAbsorption = state.elapsedSeconds;
      this.hole.userData.absorbed = count;
    }
    const height = blobHeight(
      state.elapsedSeconds,
      this.hole.userData.lastAbsorption ?? -100,
    );
    this.hole.userData.blobHeight = height;
    this.hole.getObjectByName("blob")!.scale.y = height;
    const feedback = state.feedback;
    const rim = this.hole.getObjectByName("rim");
    const pulse = feedback
      ? Math.max(0, (feedback.until - state.elapsedSeconds) / 0.6)
      : 0;
    this.hole.userData.pulse = pulse;
    rim?.scale.setScalar(1 + Math.sin(pulse * Math.PI) * 0.025);
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
