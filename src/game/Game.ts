import { resolveOversizedCollisions } from "../physics/collisions";
import { activeBounds, isUnlocked, lowestDetailTier, tierOf } from "./sections";
import { createBlockVisual, disposeBlockVisual } from "../render/BlockVisual";
import { CityChunks } from "../world/CityChunks";
import { SelfPlayer } from "../testing/SelfPlayer";
import { categories } from "./constants";
import { updateTraffic, signalFor } from "../world/traffic";
import type { Group } from "three";
import type { SwallowableObject, GameState } from "./GameState";
import { generateCity } from "../world/CityGenerator";
import { createObjectVisual } from "../world/SwallowableObject";
import { createHole, moveHole, clampHole, moveToward } from "../player/Hole";
import { capture, complete, consumeObsolete } from "../physics/swallowing";
import { advanceFall } from "../physics/falling";
import { Renderer } from "../render/Renderer";
import { InputManager } from "../input/InputManager";
import { HUD } from "../ui/HUD";
import { startLoop } from "./loop";
export function freshState(): GameState {
  const level = generateCity();
  return {
    status: "playing",
    areaStage: 1,
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
  selfPlayer = new SelfPlayer();
  visuals = new Map<string, Group>();
  chunks = new CityChunks(this.state.level.objects);
  private blockVisuals = new Map<
    string,
    { signature: string; visual: Group }
  >();
  private actors = this.state.level.objects.filter(
    (o) => o.motion || ["person", "mouse", "cat", "dog"].includes(o.type),
  );
  private movers = this.state.level.objects.filter(
    (o) => o.motion || ["person", "mouse", "cat", "dog"].includes(o.type),
  );
  private supported = this.state.level.objects.filter((o) => o.supportId);
  private falling = new Set<SwallowableObject>();
  renderer: Renderer;
  input: InputManager;
  hud: HUD;
  constructor(root: HTMLElement) {
    this.hud = new HUD(
      root,
      () => this.pause(),
      () => this.restart(),
      () => {
        this.selfPlayer.enabled = !this.selfPlayer.enabled;
        this.selfPlayer.reset();
        this.input.clear();
      },
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
    this.renderer.webgl.domElement.addEventListener("pointerdown", () => {
      if (this.selfPlayer.enabled) {
        this.selfPlayer.enabled = false;
        this.selfPlayer.reset();
      }
    });
    this.populate();
    window.addEventListener("blur", () => {
      if (!this.selfPlayer.enabled && this.state.status === "playing")
        this.pause();
    });
    document.addEventListener("visibilitychange", () => {
      if (
        document.hidden &&
        !this.selfPlayer.enabled &&
        this.state.status === "playing"
      )
        this.pause();
    });
    startLoop(
      (dt) => this.update(dt),
      () => {
        this.syncHole();
        this.renderer.follow(
          this.state.hole.position,
          this.state.hole.radius,
          this.state.hole.velocity.lengthSq() > 0.01 &&
            this.state.status === "playing",
        );
        this.refreshTargets();
        this.hud.update(this.state, this.selfPlayer.enabled);
        this.renderer.draw();
      },
      () => this.selfPlayer.enabled && this.state.status === "playing",
    );
  }
  populate() {
    this.chunks = new CityChunks(this.state.level.objects);
    this.actors = this.state.level.objects.filter(
      (o) => o.motion || ["person", "mouse", "cat", "dog"].includes(o.type),
    );
    this.movers = this.state.level.objects.filter(
      (o) => o.motion || ["person", "mouse", "cat", "dog"].includes(o.type),
    );
    this.supported = this.state.level.objects.filter((o) => o.supportId);
    this.falling.clear();
    this.refreshTargets();
  }
  private loadVisual(o: SwallowableObject) {
    let visual = this.visuals.get(o.id);
    if (!visual) {
      visual = createObjectVisual(o);
      this.visuals.set(o.id, visual);
      this.renderer.scene.add(visual);
    }
    return visual;
  }
  refreshTargets() {
    const active: SwallowableObject[] = [];
    const coarseKeys = new Set<string>();
    for (const chunk of this.chunks.chunks.values()) {
      if (this.renderer.chunkVisible(chunk.x, chunk.z, this.chunks.size)) {
        const coarse =
          this.state.hole.radius >= 8 &&
          Math.hypot(
            chunk.x - this.state.hole.position.x,
            chunk.z - this.state.hole.position.z,
          ) >
            this.state.hole.radius + 14;
        if (coarse) {
          const objects = chunk.objects.filter(
            (o) => isUnlocked(this.state, o) && o.state === "idle",
          );
          const signature = objects.map((o) => o.id).join(",");
          coarseKeys.add(chunk.key);
          let cached = this.blockVisuals.get(chunk.key);
          if (cached?.signature !== signature) {
            if (cached) {
              this.renderer.scene.remove(cached.visual);
              disposeBlockVisual(cached.visual);
            }
            cached = { signature, visual: createBlockVisual(chunk, objects) };
            this.blockVisuals.set(chunk.key, cached);
            this.renderer.scene.add(cached.visual);
          }
          active.push(...chunk.objects.filter((o) => o.state === "falling"));
        } else active.push(...chunk.objects);
      }
    }
    for (const [key, cached] of this.blockVisuals)
      if (!coarseKeys.has(key)) {
        this.renderer.scene.remove(cached.visual);
        disposeBlockVisual(cached.visual);
        this.blockVisuals.delete(key);
      }
    active.push(
      ...this.actors.filter(
        (o) =>
          o.state !== "swallowed" &&
          this.renderer.chunkVisible(o.position.x, o.position.z, 2),
      ),
      ...this.falling,
    );
    const detailed = active.filter(
      (o) =>
        o.state === "falling" ||
        (isUnlocked(this.state, o) && this.renderer.objectVisible(o)),
    );
    const ids = new Set(
      detailed.filter((o) => o.state !== "swallowed").map((o) => o.id),
    );
    for (const [id, visual] of this.visuals) {
      if (!ids.has(id)) {
        this.renderer.scene.remove(visual);
        this.visuals.delete(id);
      }
    }
    for (const o of detailed)
      if (o.state !== "swallowed") {
        const visual = this.loadVisual(o);
        if (o.state === "idle") {
          visual.position.copy(o.position);
          visual.rotation.y = o.orientation;
        }
      }
    this.renderer.updateVisibility(this.state, this.visuals, detailed);
    this.renderer.webgl.domElement.dataset.loadedObjects = String(
      this.visuals.size,
    );
    this.renderer.webgl.domElement.dataset.totalObjects = String(
      this.state.level.objects.length,
    );
  }
  restart() {
    for (const visual of this.visuals.values())
      this.renderer.scene.remove(visual);
    this.visuals.clear();
    for (const cached of this.blockVisuals.values()) {
      this.renderer.scene.remove(cached.visual);
      disposeBlockVisual(cached.visual);
    }
    this.blockVisuals.clear();
    this.state = freshState();
    this.selfPlayer.reset();
    this.input.clear();
    this.populate();
  }
  pause() {
    if (this.state.status === "won") return;
    this.state.status = this.state.status === "playing" ? "paused" : "playing";
    this.input.clear();
  }
  syncHole() {
    this.renderer.setHoleLevel(this.state.hole.level);
    this.renderer.webgl.domElement.dataset.holeX =
      this.state.hole.position.x.toFixed(3);
    this.renderer.webgl.domElement.dataset.holeZ =
      this.state.hole.position.z.toFixed(3);
    this.renderer.hole.position.x = this.state.hole.position.x;
    this.renderer.hole.position.z = this.state.hole.position.z;
    this.renderer.deformHole(
      this.state.hole.position,
      this.state.hole.radius,
      activeBounds(this.state),
    );
    this.renderer.hole.scale.set(
      this.state.hole.radius,
      1,
      this.state.hole.radius,
    );
  }
  private removeCompleted(o: SwallowableObject) {
    const visual = this.visuals.get(o.id);
    if (visual) this.renderer.scene.remove(visual);
    this.visuals.delete(o.id);
    this.falling.delete(o);
    this.chunks.remove(o);
    if (o.motion) this.actors = this.actors.filter((actor) => actor !== o);
    if (o.motion || ["person", "mouse", "cat", "dog"].includes(o.type))
      this.movers = this.movers.filter((actor) => actor !== o);
    if (o.supportId)
      this.supported = this.supported.filter((item) => item !== o);
  }
  update(dt: number) {
    const s = this.state;
    if (s.status !== "playing") return;
    s.elapsedSeconds += dt;
    this.input.refreshTarget();
    const beforeMove = s.hole.position.clone();
    if (this.selfPlayer.enabled)
      moveToward(s.hole, this.selfPlayer.target(s, dt), dt, activeBounds(s));
    else moveHole(s.hole, this.input, dt, activeBounds(s));
    resolveOversizedCollisions(
      s.hole,
      beforeMove,
      [
        ...this.chunks.nearby(
          s.hole.position.x,
          s.hole.position.z,
          s.hole.radius + 5,
        ),
        ...this.actors,
      ].filter((o) => isUnlocked(s, o)),
    );
    const minimumTier = lowestDetailTier(s);
    updateTraffic(
      this.movers.filter(
        (o) =>
          isUnlocked(s, o) &&
          (this.visuals.get(o.id)?.visible ||
            o.position.distanceTo(s.hole.position) < s.hole.radius + 12),
      ),
      dt,
      s.elapsedSeconds,
      s.hole,
    );
    for (const o of this.supported)
      if (o.supportId && o.position.y > 0) {
        const parentIndex = s.level.objectSlots.get(o.supportId);
        if (
          parentIndex === undefined ||
          s.level.objects[parentIndex].state !== "idle"
        )
          o.position.y = Math.max(0, o.position.y - 2 * dt);
      }
    for (const [id, model] of this.visuals) {
      const o = model.userData.object as SwallowableObject;
      if (!model.visible) continue;
      if (o.type === "tree" && o.state === "idle") {
        model.rotation.z =
          Math.sin(s.elapsedSeconds * 1.3 + o.variant * 1.7) * 0.025;
        model.rotation.x = Math.sin(s.elapsedSeconds * 0.9 + o.variant) * 0.018;
      }
      if (o.signalAxis && o.state === "idle") {
        const visual = this.visuals.get(o.id);
        const phase = signalFor(o.signalAxis, s.elapsedSeconds);
        for (const child of visual?.children ?? []) {
          if (child.name.startsWith("signal-"))
            child.visible = child.name === `signal-${phase}`;
        }
      }
      if (
        (o.motion || ["person", "mouse", "cat", "dog"].includes(o.type)) &&
        o.state === "idle"
      ) {
        const visual = this.visuals.get(o.id);
        if (visual) {
          visual.position.copy(o.position);
          visual.rotation.y = o.orientation;
          if (["person", "mouse", "cat", "dog"].includes(o.type)) {
            const phase = s.elapsedSeconds * (o.motion ? 7 : 2.5) + o.variant;
            visual.position.y =
              Math.abs(Math.sin(phase)) * (o.motion ? 0.035 : 0.015);
            for (const limb of visual.children) {
              const side = limb.userData.walkSide;
              if (side)
                limb.rotation.x =
                  Math.sin(phase) * side * (o.motion ? 0.45 : 0.08);
            }
          }
        }
      }
    }
    for (const o of [
      ...this.chunks.nearby(
        s.hole.position.x,
        s.hole.position.z,
        s.hole.radius,
      ),
      ...this.actors,
    ]) {
      if (
        isUnlocked(s, o) &&
        Math.abs(o.position.x - s.hole.position.x) <= s.hole.radius &&
        Math.abs(o.position.z - s.hole.position.z) <= s.hole.radius
      )
        if (consumeObsolete(s, o)) this.removeCompleted(o);
        else if (capture(o, s.hole)) {
          this.falling.add(o);
          this.loadVisual(o);
        }
    }
    for (const o of this.falling) {
      o.fall!.capture.copy(s.hole.position);
      const f = advanceFall(o, dt)!;
      const visual = this.visuals.get(o.id)!;
      visual.position.set(f.x, f.y, f.z);
      visual.scale.setScalar(f.scale);
      visual.rotation.set(0, o.orientation + f.u * 0.25, 0);
      if (f.u >= 1 && complete(s, o)) this.removeCompleted(o);
    }
    clampHole(s.hole, activeBounds(s));
  }
}
