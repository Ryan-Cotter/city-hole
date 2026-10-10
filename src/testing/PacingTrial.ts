import { enablePacing } from "../game/pacing";
import { isSolidObstacle, obstacleRadius } from "../physics/collisions";
import { isUnlocked } from "../game/sections";
import { edibleClusters } from "./SelfPlayer";
import { Group } from "three";
import { Game, freshState } from "../game/Game";
import { SelfPlayer } from "./SelfPlayer";
import { InputManager } from "../input/InputManager";
import { stages } from "../game/constants";

// Exercise the real Game.update loop, including crowds, collisions, boosts,
// falling completion, fixed food layouts and world reveals, with drawing disabled.
export function pacingTrial(
  cityIndex = 0,
  limit = 900,
  dt = 1 / 30,
  strained = false,
) {
  const game = Object.create(Game.prototype) as Game;
  const pilot = new SelfPlayer();
  pilot.enabled = true;
  Object.assign(game, {
    state: freshState(cityIndex),
    selfPlayer: pilot,
    visuals: new Map(),
    blockVisuals: new Map(),
    falling: new Set(),
    input: {
      refreshTarget() {},
      clear() {},
      hold: { active: null },
      target: null,
    } as unknown as InputManager,
    renderer: {
      scene: new Group(),
      setCity() {},
      chunkVisible: () => false,
      objectVisible: () => false,
      updateVisibility() {},
      webgl: { domElement: { dataset: {} } },
    },
  });
  game.state.performance!.strained = strained;
  enablePacing(game.state);
  game.populate();
  const rows: {
    phase: string;
    level: number;
    size: string;
    seconds: number;
    start: number;
    end: number;
    score: number;
  }[] = [];
  let previousKey = "",
    started = 0;
  const record = () => {
    const s = game.state,
      key = `${s.world.phase}:${s.hole.level}`;
    if (key !== previousKey) {
      if (rows.length) {
        rows.at(-1)!.end = s.elapsedSeconds;
        rows.at(-1)!.seconds = s.elapsedSeconds - started;
      }
      started = s.elapsedSeconds;
      rows.push({
        phase: s.world.phase,
        level: s.hole.level,
        size: stages[s.hole.level - 1]?.type ?? "extra",
        seconds: 0,
        start: started,
        end: started,
        score: s.score.points,
      });
      previousKey = key;
    }
  };
  record();
  const initialPopulation = game.state.level.objects.length;
  let largestPopulation = initialPopulation;
  for (
    let frame = 0;
    frame < limit / dt && game.state.status !== "won";
    frame++
  ) {
    game.update(dt);
    largestPopulation = Math.max(
      largestPopulation,
      game.state.level.objects.length,
    );
    record();
  }
  const s = game.state;
  rows.at(-1)!.end = s.elapsedSeconds;
  rows.at(-1)!.seconds = s.elapsedSeconds - started;
  return {
    cityIndex,
    initialPopulation,
    strained,
    generatedDuringPlay: largestPopulation - initialPopulation,
    densityPlan: s.level.densityPlan,
    completed: s.status === "won",
    seconds: s.elapsedSeconds,
    phase: s.world.phase,
    radius: s.hole.radius,
    remaining: s.score.remainingObjects,
    goal: pilot.goal?.id,
    position: s.hole.position.toArray(),
    diagnostics:
      s.status === "won"
        ? undefined
        : {
            pilot: { ...pilot },
            groups: edibleClusters(s)
              .slice(0, 2)
              .map((g) => ({
                center: g.center,
                points: g.points,
                types: g.objects.slice(0, 5).map((o) => o.type),
              })),
            solids: s.level.objects
              .filter(
                (o) =>
                  isUnlocked(s, o) &&
                  isSolidObstacle(o, s.hole) &&
                  o.position.distanceTo(s.hole.position) < 3,
              )
              .map((o) => ({
                type: o.type,
                id: o.id,
                p: o.position,
                r: obstacleRadius(o) + s.hole.radius * 0.45,
              })),
          },
    rows,
  };
}
