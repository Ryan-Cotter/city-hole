import {
  BufferGeometry,
  Scene,
  Color,
  Group,
  Mesh,
  PlaneGeometry,
  MeshBasicMaterial,
  CanvasTexture,
  OrthographicCamera,
  HemisphereLight,
  DirectionalLight,
  WebGLRenderer,
  Vector3,
  PCFSoftShadowMap,
  ACESFilmicToneMapping,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ReviewRasterizer } from "./ReviewRasterizer";
import {
  polishedCar,
  polishedBuilding,
  polishedProps,
  finish,
} from "../art/PolishModels";
import { createObjectVisual } from "../world/SwallowableObject";
import { categories, objectDesigns } from "../game/constants";
import type { ObjectType } from "../game/GameState";
const host = document.querySelector<HTMLDivElement>("#stage")!;
const scene = new Scene();
scene.background = new Color("#ccd6d6");
scene.add(new HemisphereLight("#fff4df", "#66849c", 1.7));
const sun = new DirectionalLight("#fff1d9", 3);
sun.position.set(-4, 8, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -5;
sun.shadow.camera.right = 5;
sun.shadow.camera.top = 5;
sun.shadow.camera.bottom = -5;
sun.shadow.bias = -0.001;
scene.add(sun);
const fill = new DirectionalLight("#a8c9f1", 0.8);
fill.position.set(5, 3, -4);
scene.add(fill);
const ground = new Mesh(
  new PlaneGeometry(200, 200),
  new MeshBasicMaterial({ color: "#ccd6d6" }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.025;
ground.receiveShadow = true;
scene.add(ground);
const shadowCanvas = document.createElement("canvas");
shadowCanvas.width = shadowCanvas.height = 128;
const ctx = shadowCanvas.getContext("2d")!;
const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
gradient.addColorStop(0, "rgba(20,35,45,.32)");
gradient.addColorStop(1, "rgba(20,35,45,0)");
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 128, 128);
const shadow = new Mesh(
  new PlaneGeometry(5, 4),
  new MeshBasicMaterial({
    map: new CanvasTexture(shadowCanvas),
    transparent: true,
    depthWrite: false,
  }),
);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = -0.012;
scene.add(shadow);
const camera = new OrthographicCamera(-4, 4, 3, -3, 0.01, 300);
camera.position.set(5, 4, 6);
camera.lookAt(0, 0.8, 0);
camera.zoom = 1.7;
camera.updateProjectionMatrix();
let renderer: WebGLRenderer | ReviewRasterizer;
try {
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;
} catch {
  const surface = document.createElement("canvas");
  surface.width = surface.height = 16;
  surface.getContext("2d")!.fillStyle = "#ccd6d6";
  surface.getContext("2d")!.fillRect(0, 0, 16, 16);
  renderer = new ReviewRasterizer();
  document.querySelector("#status")!.textContent =
    "Software preview · textures and geometry shown; gloss and lighting are approximate. Preview only.";
}
host.prepend(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.8, 0);
controls.enableDamping = true;
controls.enablePan = false;
controls.minZoom = 0.5;
controls.maxZoom = 2.5;
controls.minPolarAngle = 0.2;
controls.maxPolarAngle = Math.PI * 0.48;
controls.autoRotateSpeed = 1.3;
const models = {
  car: polishedCar(),
  building: polishedBuilding(),
  props: polishedProps(),
};
for (const [key, g] of Object.entries(models))
  g.userData.object = {
    id: "proposal-" + key,
    state: "idle",
    height: 2,
    radius: 1.3,
    position: new Vector3(),
  };
if (renderer instanceof ReviewRasterizer) {
  for (const g of Object.values(models))
    g.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      // RoundedBoxGeometry inherits BoxGeometry but its tessellated triangles
      // are not the six simple quads assumed by the game's fast fallback.
      child.geometry = new BufferGeometry().copy(child.geometry);
    });
}
const oldModels: Record<string, Group> = {};
for (const [key, type] of [
  ["car", "car"],
  ["building", "building"],
  ["props", "bench"],
] as [string, ObjectType][]) {
  const g = createObjectVisual({
    ...categories[type],
    id: "review-" + type,
    type,
    cityIndex: 2,
    position: new Vector3(),
    orientation: 0,
    variant: 0,
    design: objectDesigns[type][0],
    motion: null,
    state: "idle",
    fall: null,
  });
  oldModels[key] = g;
}
// Normalize the existing building for a finish comparison, not a balance change.
oldModels.building.scale.setScalar(0.45);
let selected: keyof typeof models = "car",
  compare = false;
let current: Group = models.car;
scene.add(current);
function display() {
  dirty = true;
  camera.zoom = selected === "building" ? 1.25 : 1.7;
  controls.target.y = selected === "building" ? 1.4 : 0.7;
  camera.updateProjectionMatrix();
  scene.remove(current);
  current = compare ? oldModels[selected] : models[selected];
  scene.add(current);
  document.querySelector("#label")!.textContent =
    `${compare ? "Base model" : "Proposed"} · ${selected === "car" ? "compact car" : selected === "building" ? "corner building" : "street props"}${compare && selected === "props" ? " (existing bench reference)" : ""}`;
  document
    .querySelectorAll<HTMLButtonElement>("[data-model]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.model === selected)),
    );
}
document.querySelectorAll<HTMLButtonElement>("[data-model]").forEach(
  (b) =>
    (b.onclick = () => {
      selected = b.dataset.model as keyof typeof models;
      display();
    }),
);
document.querySelector<HTMLButtonElement>("#compare")!.onclick = () => {
  compare = !compare;
  document
    .querySelector("#compare")!
    .setAttribute("aria-pressed", String(compare));
  display();
};
document.querySelector<HTMLButtonElement>("#rotate")!.onclick = () => {
  controls.autoRotate = !controls.autoRotate;
  document
    .querySelector("#rotate")!
    .setAttribute("aria-pressed", String(controls.autoRotate));
};
document.querySelector<HTMLButtonElement>("#reset")!.onclick = () => {
  camera.position.set(5, 4, 6);
  camera.zoom = 1;
  controls.target.set(0, 0.8, 0);
  camera.updateProjectionMatrix();
};
new ResizeObserver(() => {
  const w = host.clientWidth,
    h = host.clientHeight;
  renderer.setSize(w, h);
  dirty = true;
  camera.left = (-3 * w) / h;
  camera.right = (3 * w) / h;
  camera.updateProjectionMatrix();
}).observe(host);
let lastFrame = 0;
let dirty = true;
controls.addEventListener("change", () => {
  dirty = true;
});
function frame() {
  requestAnimationFrame(frame);
  if (document.hidden || performance.now() - lastFrame < 1000 / 24) return;
  lastFrame = performance.now();
  controls.update();
  camera.updateMatrixWorld();
  if (dirty) {
    renderer.render(scene, camera);
    dirty = false;
  }
}
frame();

const swatches = document.querySelector("#swatches")!;
for (const [name, color, kind] of [
  ["Brick courses", "#ad7660", "brick"],
  ["Plaster grain", "#e4d6bc", "plaster"],
] as const) {
  const card = document.createElement("div");
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  canvas.style.cssText =
    "width:96px;height:96px;border-radius:10px;display:inline-block";
  const c = canvas.getContext("2d")!;
  c.fillStyle = color;
  c.fillRect(0, 0, 128, 128);
  c.globalCompositeOperation = "multiply";
  c.drawImage(finish(color, kind).map!.image, 0, 0);
  card.append(canvas, document.createTextNode(" " + name));
  swatches.append(card);
}
