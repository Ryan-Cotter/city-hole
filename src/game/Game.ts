import { polishedGameModel } from "../art/GameModels";
import { reactToHole, animateSpill } from "./interactions";
import { enablePacing, advanceGrowth } from "./pacing";
import { CrowdScheduler } from "../world/CrowdScheduler";
import { seedFoodBudget } from "./foodBudget";
import {
  attachCityBlocks,
  prepareWorld,
  advanceWorld,
  discardSmallScenery,
} from "../world/WorldProgression";
import { activateBoost, updateBoosts } from "./boosts";
import { resolveOversizedCollisions } from "../physics/collisions";
import {
  activeBounds,
  isUnlocked,
  lowestDetailTier,
  tierOf,
  blockScaleRadius,
} from "./sections";
import { RenderChunks } from "../world/RenderChunks";
import { CityChunks } from "../world/CityChunks";
import { SelfPlayer } from "../testing/SelfPlayer";
import {
  categories,
  adaptiveSwallowConfig,
  renderChunkConfig,
} from "./constants";
import { signalFor } from "../world/traffic";
import type { Group } from "three";
import type { SwallowableObject, GameState } from "./GameState";
import { generateCity } from "../world/CityGenerator";
import { createObjectVisual } from "../world/SwallowableObject";
import { createHole, moveHole, clampHole, moveToward } from "../player/Hole";
import {
  capture,
  complete,
  consumeObsolete,
  consumeAtEdge,
} from "../physics/swallowing";
import { advanceFall } from "../physics/falling";
import { Renderer } from "../render/Renderer";
import { InputManager } from "../input/InputManager";
import { HUD } from "../ui/HUD";
import { startLoop } from "./loop";
export function freshState(cityIndex = 0): GameState {
  const level = generateCity(814 + cityIndex * 997, undefined, cityIndex);
  attachCityBlocks(level);
  const state: GameState = {
    world: {
      phase: "city",
      initialCount: level.objects.filter((o) => !o.collisionOnly).length,
    },
    performance: { strained: false, slowSeconds: 0 },
    feedback: { points: 0, count: 0, until: 0, bumpUntil: 0, cleared: 0 },
    growthOffset: 0,
    status: "playing",
    areaStage: 1,
    cityIndex,
    boosts: {
      speedUntil: 0,
    },
    elapsedSeconds: 0,
    hole: createHole(),
    level,
    score: {
      points: 0,
      swallowedObjects: 0,
      remainingObjects: level.objects.filter((o) => !o.collisionOnly).length,
      byType: Object.fromEntries(
        Object.keys(categories).map((type) => [type, 0]),
      ) as GameState["score"]["byType"],
    },
  };
  seedFoodBudget(state);
  prepareWorld(state);
  return state;
}
export class Game {
  state = freshState();
  selfPlayer = new SelfPlayer();
  visuals = new Map<string, Group>();
  chunks = new CityChunks(this.state.level.objects);
  renderChunks = new RenderChunks(this.state.level.objects, 3400);
  private actors = this.state.level.objects.filter(
    (o) => o.motion || ["person", "mouse", "cat", "dog"].includes(o.type),
  );
  private movers = this.state.level.objects.filter(
    (o) => o.motion || ["person", "mouse", "cat", "dog"].includes(o.type),
  );
  private supported = this.state.level.objects.filter((o) => o.supportId);
  private crowds = new CrowdScheduler();

  private falling = new Set<SwallowableObject>();
  renderer: Renderer;
  input: InputManager;
  hud: HUD;
  constructor(root: HTMLElement) {
    enablePacing(this.state);
    this.hud = new HUD(
      root,
      () => this.pause(),
      () => this.restart(),
      () => {
        this.selfPlayer.enabled = !this.selfPlayer.enabled;
        this.selfPlayer.reset();
        this.input.clear();
      },
      () => this.nextCity(),
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
    let previousFrame = performance.now();
    startLoop(
      (dt) => this.update(dt),
      () => {
        const now = performance.now(),
          gap = (now - previousFrame) / 1000;
        previousFrame = now;
        const perf = this.state.performance!;
        if (!document.hidden && this.state.status === "playing") {
          perf.slowSeconds = Math.max(
            0,
            Math.min(
              2,
              perf.slowSeconds +
                (gap > adaptiveSwallowConfig.slowFrameSeconds
                  ? gap
                  : -gap * 0.5),
            ),
          );
          if (perf.slowSeconds > adaptiveSwallowConfig.enterStrainSeconds)
            perf.strained = true;
          if (perf.slowSeconds < adaptiveSwallowConfig.recoverSeconds)
            perf.strained = false;
        }
        this.syncHole();
        this.renderer.follow(
          this.state.hole.position,
          this.state.hole.radius,
          this.state.hole.velocity.lengthSq() > 0.01 &&
            this.state.status === "playing",
          this.state.world.phase === "country"
            ? 180
            : this.state.world.phase === "planet"
              ? 400
              : 0,
        );
        this.refreshTargets();
        this.hud.update(this.state, this.selfPlayer.enabled);
        this.renderer.draw();
      },
      () => this.selfPlayer.enabled && this.state.status === "playing",
    );
  }
  populate() {
    this.renderChunks = new RenderChunks(this.state.level.objects, 3400);
    this.chunks = new CityChunks(
      this.state.level.objects,
      this.state.world.phase === "planet"
        ? 200
        : this.state.world.phase === "country"
          ? 80
          : 20,
    );
    this.actors = this.state.level.objects.filter(
      (o) => o.motion || ["person", "mouse", "cat", "dog"].includes(o.type),
    );
    this.movers = this.state.level.objects.filter(
      (o) => o.motion || ["person", "mouse", "cat", "dog"].includes(o.type),
    );
    this.supported = this.state.level.objects.filter((o) => o.supportId);
    this.crowds = new CrowdScheduler();
    this.falling.clear();
    for (const o of this.state.level.objects)
      if (o.state === "falling") {
        this.falling.add(o);
        this.loadVisual(o);
      }
    this.refreshTargets();
  }
  private representedByBlock(o: SwallowableObject) {
    if (!o.aggregateId || o.state !== "idle") return false;
    const index = this.state.level.objectSlots.get(o.aggregateId);
    if (index === undefined) return false;
    const block = this.state.level.objects[index];
    return isUnlocked(this.state, block) && block.state !== "swallowed";
  }
  private canLoadVisual(o: SwallowableObject) {
    return Boolean(
      o.collisionOnly ||
        o.pickup ||
        this.visuals.has(o.id) ||
        tierOf(o) >= lowestDetailTier(this.state),
    );
  }
  private loadVisual(o: SwallowableObject) {
    if (!this.canLoadVisual(o)) return undefined;
    let visual = this.visuals.get(o.id);
    if (!visual) {
      visual =
        (!this.renderer.software && typeof document !== "undefined"
          ? polishedGameModel(o)
          : null) ?? createObjectVisual(o);
      this.visuals.set(o.id, visual);
      this.renderer.scene.add(visual);
    }
    return visual;
  }
  refreshTargets() {
    const region = this.renderer.preloadRegion?.();
    const active = region
      ? this.renderChunks.query(
          region,
          Math.max(
            renderChunkConfig.minimumSize,
            this.state.hole.radius * renderChunkConfig.detailRadiusScale,
          ),
        )
      : [];
    // Moving actors retain their simulation positions and use the same preload area.
    active.push(
      ...this.actors.filter(
        (o) =>
          region &&
          o.position.x + o.radius >= region.minX &&
          o.position.x - o.radius <= region.maxX &&
          o.position.z + o.radius >= region.minZ &&
          o.position.z - o.radius <= region.maxZ,
      ),
      ...this.falling,
    );
    const detailed = [...new Set(active)].filter(
      (o) =>
        this.canLoadVisual(o) &&
        (o.state === "falling" ||
          (o.state !== "swallowed" &&
            isUnlocked(this.state, o) &&
            !this.representedByBlock(o))),
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
        if (visual && o.state === "idle" && !o.motion && !o.pickup) {
          visual.position.copy(o.position);
          visual.rotation.y = o.orientation;
        }
      }
    this.renderer.updateVisibility(this.state, this.visuals, detailed);
    this.renderer.webgl.domElement.dataset.renderNodes = String(
      this.renderChunks.visited,
    );
    this.renderer.webgl.domElement.dataset.loadedObjects = String(
      this.visuals.size,
    );
    this.renderer.webgl.domElement.dataset.totalObjects = String(
      this.state.level.objects.length,
    );
  }
  nextCity() {
    if (this.state.status === "won" && this.state.world.phase === "planet")
      this.restart(this.state.cityIndex + 1);
  }
  restart(cityIndex = this.state.cityIndex) {
    for (const visual of this.visuals.values())
      this.renderer.scene.remove(visual);
    this.visuals.clear();
    this.state = freshState(cityIndex);
    enablePacing(this.state);
    this.renderer.setCity(this.state.level);
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
    for (const member of o.members ?? []) this.removeCompleted(member);
    const visual = this.visuals.get(o.id);
    if (visual) this.renderer.scene.remove(visual);
    this.visuals.delete(o.id);
    this.falling.delete(o);
    this.chunks.remove(o);
    this.renderChunks?.remove(o);
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
    advanceGrowth(s, dt);
    updateBoosts(s);
    for (const removed of discardSmallScenery(s)) this.removeCompleted(removed);
    this.input.refreshTarget(s.hole.position);
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
    reactToHole(
      s,
      this.chunks.nearby(
        s.hole.position.x,
        s.hole.position.z,
        s.hole.radius * 4,
      ),
    );
    const minimumTier = lowestDetailTier(s);
    this.crowds.step(this.movers, s, dt);
    for (const o of this.supported) {
      const spilling = !!o.spill;
      animateSpill(o, dt);
      if (spilling) {
        this.chunks.relocate(o);
        this.renderChunks.relocate(o);
        const visual = this.visuals.get(o.id);
        if (visual) {
          visual.position.copy(o.position);
          visual.userData.poseVersion = (visual.userData.poseVersion ?? 0) + 1;
        }
      }
      if (o.supportId && o.position.y > 0) {
        const parentIndex = s.level.objectSlots.get(o.supportId);
        if (
          parentIndex === undefined ||
          s.level.objects[parentIndex].state !== "idle"
        )
          if (!o.spill) o.position.y = Math.max(0, o.position.y - 2 * dt);
      }
    }
    for (const [id, model] of this.visuals) {
      const o = model.userData.object as SwallowableObject;
      if (!model.visible) continue;
      if (o.state === "idle" && o.supportId) {
        model.position.copy(o.position);
        model.userData.poseVersion = (model.userData.poseVersion ?? 0) + 1;
      }
      if (o.state === "idle" && o.reactionUntil) {
        const remaining = Math.max(0, o.reactionUntil - s.elapsedSeconds);
        const strength = Math.sin((1 - remaining / 0.35) * Math.PI) * 0.07;
        const dx = s.hole.position.x - o.position.x,
          dz = s.hole.position.z - o.position.z;
        const length = Math.hypot(dx, dz) || 1;
        model.rotation.x = (dz / length) * strength;
        model.rotation.z = (-dx / length) * strength;
        model.userData.poseVersion = (model.userData.poseVersion ?? 0) + 1;
        if (!remaining) o.reactionUntil = undefined;
      }
      if (o.pickup && o.state === "idle") {
        model.rotation.y = s.elapsedSeconds * 1.8;
        model.position.y =
          o.position.y + 0.012 + Math.sin(s.elapsedSeconds * 3) * 0.008;
      }
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
        o.state === "idle" &&
        this.crowds.updated.has(o)
      ) {
        const visual = this.visuals.get(o.id);
        if (visual) {
          visual.userData.poseVersion = (visual.userData.poseVersion ?? 0) + 1;
          visual.position.copy(o.position);
          const turn = o.orientation - visual.rotation.y;
          visual.rotation.y +=
            Math.atan2(Math.sin(turn), Math.cos(turn)) *
            (1 - Math.exp(-10 * dt));
          if (o.critter || ["person", "mouse", "cat", "dog"].includes(o.type)) {
            const phase = s.elapsedSeconds * (o.motion ? 7 : 2.5) + o.variant;
            visual.position.y =
              o.position.y +
              ((o.alertedUntil ?? 0) > s.elapsedSeconds ? o.height * 0.08 : 0) +
              Math.abs(Math.sin(phase)) * Math.min(0.015, o.height * 0.025);
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
        s.hole.radius * 1.25,
      ),
      ...this.actors,
    ]) {
      if (
        isUnlocked(s, o) &&
        Math.abs(o.position.x - s.hole.position.x) <=
          s.hole.radius + o.radius &&
        Math.abs(o.position.z - s.hole.position.z) <= s.hole.radius + o.radius
      )
        if (consumeAtEdge(s, o) || consumeObsolete(s, o))
          this.removeCompleted(o);
        else if (capture(o, s.hole)) {
          this.falling.add(o);
          this.loadVisual(o);
        }
    }
    for (const o of this.falling) {
      o.fall!.capture.copy(s.hole.position);
      const f = advanceFall(o, dt)!;
      const visual = this.visuals.get(o.id);
      if (visual) {
        visual.position.set(f.x, f.y, f.z);
        visual.scale.setScalar(f.scale);
        const direction = o
          .fall!.capture.clone()
          .sub(o.fall!.start)
          .normalize();
        visual.rotation.set(
          direction.z * f.tilt,
          o.orientation + f.u * 0.25,
          -direction.x * f.tilt,
        );
      }
      if (f.u >= 1 && complete(s, o)) this.removeCompleted(o);
    }
    if (advanceWorld(s)) {
      for (const visual of this.visuals.values())
        this.renderer.scene.remove(visual);
      this.visuals.clear();
      this.renderer.setCity(s.level);
      this.selfPlayer.reset();
      this.populate();
    }
    clampHole(s.hole, activeBounds(s));
  }
}
