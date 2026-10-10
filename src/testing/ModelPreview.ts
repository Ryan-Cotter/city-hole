import { districtProfiles, assignDistrict } from "../world/Districts";
import type { District } from "../game/GameState";
import { virusDesigns, bacteriaDesigns, bugDesigns } from "../world/MicroLife";
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
const districtReview = new URLSearchParams(location.search).has("districts");
const life = new URLSearchParams(location.search).has("life");
if (life || districtReview) {
  document.querySelector("header h1")!.textContent = life
    ? "Microscopic life · model review"
    : "Functional districts · model review";
  document.querySelector("header p")!.textContent = life
    ? "Viruses, bacteria, and bugs at normalized preview scale. In-game sizes follow the early size tiers."
    : "Five block functions with matching prop families. Preview shows the modern era; the campaign uses period-specific roof details.";
}
const panels: [string, ObjectType[], number, number, string[]?][] =
  districtReview
    ? Object.entries(districtProfiles).map(([key, p]) => [
        p.name,
        ["building", "litter", "sign", "bench"],
        2,
        4,
        [key],
      ])
    : life
      ? [
          virusDesigns,
          bacteriaDesigns.slice(0, 3),
          bacteriaDesigns.slice(3),
          bugDesigns.slice(0, 4),
          bugDesigns.slice(4, 8),
          bugDesigns.slice(8, 12),
          bugDesigns.slice(12),
        ].map((designs, i) => [
          i === 0
            ? "Viruses"
            : i < 3
              ? "Bacteria"
              : `Bugs · ${designs.join(" / ")}`,
          designs.map(() => (i < 3 ? "bacterium" : "bottlecap")),
          0,
          3.2,
          designs,
        ])
      : [
          [
            "Medieval market props",
            ["hydrant", "sign", "bench", "patio"],
            0,
            5,
          ],
          ["Medieval block", ["cityBlock"], 0, 15],
          ["Medieval carts", ["car", "van"], 0, 3],
          ["Industrial vehicles", ["car", "van"], 1, 3],
          ["Modern cars and vans", ["car", "van"], 2, 3],
          ["Future vehicles", ["car", "van"], 3, 3],
          ["Person · cat · dog", ["person", "cat", "dog"], 2, 2],
          ["Whole block · reduced points", ["cityBlock"], 2, 15],
        ];
for (const [label, types, era, view, designs] of panels) {
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
      ...(life ? { radius: 0.62, height: 0.8 } : {}),
      critter: designs ? bugDesigns.includes(designs[i]) : false,
      id: `preview-${era}-${type}`,
      type,
      cityIndex: era,
      position: new Vector3(
        (i - (types.length - 1) / 2) * (life ? 1.5 : view === 2 ? 0.7 : 2.3),
        0,
        0,
      ),
      orientation: 0,
      variant:
        life && designs && bacteriaDesigns.includes(designs[i])
          ? bacteriaDesigns.indexOf(designs[i])
          : i,
      design: designs?.[i] ?? objectDesigns[type][0],
      motion: null,
      state: "idle",
      fall: null,
    };
    if (districtReview) {
      o.position.set(i === 0 ? 0 : (i - 2) * 1.7, 0, i === 0 ? -1 : 1.8);
      if (i === 0) {
        o.radius = 1.6;
        o.height = 2.8;
      }
      assignDistrict(o, designs![0] as District);
    }
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
