import { categories } from "./constants";
import { updateTraffic, signalFor } from "../world/traffic";
import type { Group } from "three";
import type { GameState } from "./GameState";
import { generateCity } from "../world/CityGenerator";
import { createObjectVisual } from "../world/SwallowableObject";
import { createHole, moveHole, clampHole } from "../player/Hole";
import { capture, complete } from "../physics/swallowing";
import { advanceFall } from "../physics/falling";
import { Renderer } from "../render/Renderer";
import { InputManager } from "../input/InputManager";
import { HUD } from "../ui/HUD";
import { startLoop } from "./loop";
export function freshState(): GameState {
  const level = generateCity();
  return {
    status: "playing",
    elapsedSeconds: 0,
    hole: createHole(),
    level,
    score: {
      points: 0,
      swallowedObjects: 0,
      remainingObjects: level.objects.length,
      byType: Object.fromEntries(
        Object.keys(categories).map((type) => [type, 0]),
      ) as GameState["score"]["byType"],
    },
  };
}
export class Game {
  state = freshState();
  visuals = new Map<string, Group>();
  renderer: Renderer;
  input: InputManager;
  hud: HUD;
  constructor(root: HTMLElement) {
    this.hud = new HUD(
      root,
      () => this.pause(),
      () => this.restart(),
    );
    this.renderer = new Renderer(
      root.querySelector("#viewport")!,
      this.state.level,
    );
    this.input = new InputManager(
      this.renderer.webgl.domElement,
      this.renderer.camera,
      () => this.pause(),
    );
    this.populate();
    window.addEventListener("blur", () => {
      if (this.state.status === "playing") this.pause();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.state.status === "playing") this.pause();
    });
    startLoop(
      (dt) => this.update(dt),
      () => {
        this.syncHole();
        this.renderer.follow(this.state.hole.position, this.state.hole.radius);
        this.refreshTargets();
        this.hud.update(this.state);
        this.renderer.draw();
      },
    );
  }
  populate() {
    for (const o of this.state.level.objects) {
      const visual = createObjectVisual(o);
      this.visuals.set(o.id, visual);
      this.renderer.scene.add(visual);
    }
  }
  refreshTargets() {
    this.renderer.updateVisibility(this.state, this.visuals);
  }
  restart() {
    for (const visual of this.visuals.values())
      this.renderer.scene.remove(visual);
    this.visuals.clear();
    this.state = freshState();
    this.input.clear();
    this.populate();
  }
  pause() {
    if (this.state.status === "won") return;
    this.state.status = this.state.status === "playing" ? "paused" : "playing";
    this.input.clear();
  }
  syncHole() {
    this.renderer.webgl.domElement.dataset.holeX =
      this.state.hole.position.x.toFixed(3);
    this.renderer.webgl.domElement.dataset.holeZ =
      this.state.hole.position.z.toFixed(3);
    this.renderer.hole.position.x = this.state.hole.position.x;
    this.renderer.hole.position.z = this.state.hole.position.z;
    this.renderer.hole.scale.set(
      this.state.hole.radius,
      1,
      this.state.hole.radius,
    );
  }
  update(dt: number) {
    const s = this.state;
    if (s.status !== "playing") return;
    s.elapsedSeconds += dt;
    this.input.refreshTarget();
    moveHole(s.hole, this.input, dt, s.level.bounds);
    updateTraffic(s.level.objects, dt, s.elapsedSeconds);
    for (const o of s.level.objects) {
      if (o.signalAxis && o.state === "idle") {
        const visual = this.visuals.get(o.id);
        const phase = signalFor(o.signalAxis, s.elapsedSeconds);
        for (const child of visual?.children ?? []) {
          if (child.name.startsWith("signal-"))
            child.visible = child.name === `signal-${phase}`;
        }
      }
      if (o.motion && o.state === "idle") {
        const visual = this.visuals.get(o.id);
        if (visual) {
          visual.position.copy(o.position);
          visual.rotation.y = o.orientation;
          if (o.type === "person") {
            const phase = s.elapsedSeconds * 7 + o.variant;
            visual.position.y = Math.abs(Math.sin(phase)) * 0.035;
            for (const limb of visual.children) {
              const side = limb.userData.walkSide;
              if (side) limb.rotation.x = Math.sin(phase) * side * 0.45;
            }
          }
        }
      }
    }
    for (const o of s.level.objects) {
      if (
        Math.abs(o.position.x - s.hole.position.x) <= s.hole.radius &&
        Math.abs(o.position.z - s.hole.position.z) <= s.hole.radius
      )
        capture(o, s.hole);
    }
    for (const o of s.level.objects) {
      if (o.state !== "falling") continue;
      o.fall!.capture.copy(s.hole.position);
      const f = advanceFall(o, dt)!;
      const visual = this.visuals.get(o.id)!;
      visual.position.set(f.x, f.y, f.z);
      visual.scale.setScalar(f.scale);
      visual.rotation.set(0, o.orientation + f.u * 0.25, 0);
      if (f.u >= 1 && complete(s, o)) {
        this.renderer.scene.remove(visual);
        this.visuals.delete(o.id);
      }
    }
    clampHole(s.hole, s.level.bounds);
  }
}
