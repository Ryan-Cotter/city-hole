import {
  Scene,
  OrthographicCamera,
  Vector3,
  Color,
  WebGLRenderer,
  HemisphereLight,
  DirectionalLight,
} from "three";
import { CanvasRenderer } from "../render/CanvasRenderer";
import { createObjectVisual } from "../world/SwallowableObject";
import { categories, objectDesigns } from "../game/constants";
import type { ObjectType, SwallowableObject } from "../game/GameState";
const host = document.querySelector("#models")!;
const panels: [string, ObjectType[], number, number][] = [
  ["Medieval market props", ["hydrant", "sign", "bench", "patio"], 0, 5],
  ["Medieval block", ["cityBlock"], 0, 15],
  ["Medieval carts", ["car", "van"], 0, 3],
  ["Industrial vehicles", ["car", "van"], 1, 3],
  ["Modern cars and vans", ["car", "van"], 2, 3],
  ["Future vehicles", ["car", "van"], 3, 3],
  ["Person · cat · dog", ["person", "cat", "dog"], 2, 2],
  ["Whole block · reduced points", ["cityBlock"], 2, 15],
];
for (const [label, types, era, view] of panels) {
  const section = document.createElement("section");
  section.innerHTML = `<h2>${label}</h2>`;
  host.append(section);
  const scene = new Scene();
  scene.background = new Color("#dde0d8");
  scene.add(new HemisphereLight("#fff5d9", "#6b8099", 2));
  const sun = new DirectionalLight("#fff0d3", 2.5);
  sun.position.set(-6, 10, 8);
  scene.add(sun);
  for (const [i, type] of types.entries()) {
    const o: SwallowableObject = {
      ...categories[type],
      id: `preview-${era}-${type}`,
      type,
      cityIndex: era,
      position: new Vector3(
        (i - (types.length - 1) / 2) * (view === 2 ? 0.7 : 2.3),
        0,
        0,
      ),
      orientation: 0,
      variant: 0,
      design: objectDesigns[type][0],
      motion: null,
      state: "idle",
      fall: null,
    };
    scene.add(createObjectVisual(o));
  }
  const camera = new OrthographicCamera(
    -view,
    view,
    view * 0.75,
    -view * 0.75,
    0.01,
    500,
  );
  camera.position.set(view * 1.4, view * 1.3, view * 1.8);
  camera.lookAt(0, view * 0.1, 0);
  camera.updateMatrixWorld();
  let renderer: WebGLRenderer | CanvasRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true });
    renderer.localClippingEnabled = true;
  } catch {
    const surface = document.createElement("canvas");
    surface.width = surface.height = 16;
    const c = surface.getContext("2d")!;
    c.fillStyle = "#dde0d8";
    c.fillRect(0, 0, 16, 16);
    renderer = new CanvasRenderer(surface, 100);
  }
  section.append(renderer.domElement);
  const draw = () => {
    const width = section.clientWidth;
    renderer.setSize(width, 300);
    camera.left = (-view * width) / 400;
    camera.right = (view * width) / 400;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };
  new ResizeObserver(draw).observe(section);
  draw();
}
