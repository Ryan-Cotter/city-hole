import { streakConfig } from "../game/streak";
import { MealAudio } from "./MealAudio";
import { stages } from "../game/constants";
import { themeForCity } from "../game/campaign";
import { sectionForState, activeBounds, isUnlocked } from "../game/sections";
import type { GameState } from "../game/GameState";
import { growthForPoints, growthPoints } from "../game/progression";
const compactPoints = (n: number) =>
  n >= 1000000
    ? new Intl.NumberFormat("en", {
        notation: "compact",
        maximumFractionDigits: 2,
      }).format(n)
    : n.toLocaleString();
export class HUD {
  root: HTMLElement;
  private audio = new MealAudio();
  private seenPoints = 0;
  private seenBump = 0;
  private lastUpdate = 0;
  private previousLevel = 1;
  private toastUntil = 0;
  constructor(
    container: HTMLElement,
    onPause: () => void,
    onRestart: () => void,
    onSelfPlay: () => void,
    onNextCity: () => void,
  ) {
    container.innerHTML = `<main id="viewport"><aside class="hud-panel"><div class="hud-brand"><span>◉</span> CITY HOLE</div><small id="city-theme"></small><div class="score-row"><div><label>SCORE</label><strong id="score">0</strong></div><span id="timer">00:00</span></div><div class="level-row"><b id="level"></b><span id="radius"></span></div><div class="track" title="Light bar: earned growth. Solid bar: current size progress."><i id="earned-progress"></i><i id="progress"></i></div><p id="hint"></p><small id="remaining"></small><small id="boost-status"></small><div id="streak" hidden><b id="streak-label"></b><span><i id="streak-time"></i></span></div><div id="meal-toast" role="status"></div><small id="district-goal"></small><div id="level-toast" role="status" hidden></div><div class="hud-actions"><button id="pause">Pause</button></div><details class="utility-menu"><summary>Menu</summary><button id="sound" aria-pressed="false">Sound: off</button><button id="restart">Restart</button><button id="self-play" aria-pressed="false">Self play: off</button><p class="control-guide">Hold to steer · release to stop</p><button id="phone-preview" aria-pressed="false">Phone preview</button><details class="map-details"><summary>City map</summary><canvas id="minimap" width="140" height="140" aria-label="Street map and your location"></canvas></details></details><section id="overlay" hidden><h2 id="overlay-title"></h2><p id="overlay-text"></p><button id="overlay-action">Resume</button></section></aside></main>`;
    container
      .querySelector("#phone-preview")!
      .addEventListener("click", (event) => {
        const active = container.classList.toggle("phone-mode");
        const button = event.currentTarget as HTMLButtonElement;
        button.setAttribute("aria-pressed", String(active));
        button.textContent = active ? "Desktop view" : "Phone preview";
      });
    container
      .querySelector("#self-play")!
      .addEventListener("click", onSelfPlay);
    container.querySelector("#sound")!.addEventListener("click", () => {
      const on = this.audio.toggle();
      const button = container.querySelector("#sound")!;
      button.textContent = on ? "Sound: on" : "Sound: off";
      button.setAttribute("aria-pressed", String(on));
    });
    this.root = container;
    container.querySelector("#pause")!.addEventListener("click", onPause);
    container.querySelector("#restart")!.addEventListener("click", onRestart);
    container
      .querySelector("#overlay-action")!
      .addEventListener("click", () =>
        this.root.dataset.status === "won" ? onNextCity() : onPause(),
      );
  }
  update(s: GameState, selfPlay = false) {
    const now = performance.now();
    if (now - this.lastUpdate < 100 && this.root.dataset.status === s.status)
      return;
    this.lastUpdate = now;
    const text = (id: string, value: string) => {
      const el = this.root.querySelector("#" + id)!;
      if (el.textContent !== value) el.textContent = value;
    };
    this.root.dataset.status = s.status;
    const streak = s.streak;
    const activeStreak =
      !!streak &&
      streak.count >= streakConfig.firstBonusAt &&
      streak.expiresAt > s.elapsedSeconds;
    (this.root.querySelector("#streak") as HTMLElement).hidden = !activeStreak;
    if (activeStreak) {
      text(
        "streak-label",
        `STREAK ${streak!.count} · ×${streak!.multiplier} points`,
      );
      (this.root.querySelector("#streak-time") as HTMLElement).style.width =
        `${Math.min(100, ((streak!.expiresAt - s.elapsedSeconds) / streakConfig.windowSeconds) * 100)}%`;
    }
    if (s.feedback) {
      text(
        "meal-toast",
        s.feedback.until > s.elapsedSeconds
          ? `+${compactPoints(s.feedback.points)} · ${s.feedback.count} swallowed`
          : "",
      );
      text(
        "district-goal",
        (s.feedback.goalUntil ?? 0) > s.elapsedSeconds
          ? s.feedback.goal!
          : s.feedback.cleared
            ? `${s.feedback.cleared} blocks cleared`
            : "",
      );
      if (s.score.points > this.seenPoints) this.audio.play(s.feedback.count);
      if (s.feedback.bumpUntil > this.seenBump) this.audio.play(0, true);
      this.seenPoints = s.score.points;
      this.seenBump = s.feedback.bumpUntil;
    }
    const selfButton = this.root.querySelector("#self-play")!;
    selfButton.setAttribute("aria-pressed", String(selfPlay));
    selfButton.textContent = selfPlay ? "Self play: on" : "Self play: off";
    const growth = growthForPoints(growthPoints(s)),
      seconds = Math.floor(s.elapsedSeconds);
    text(
      "city-theme",
      `City ${s.cityIndex + 1} · ${themeForCity(s.cityIndex).name}`,
    );
    text(
      "boost-status",
      (s.boosts.vortexUntil ?? 0) > s.elapsedSeconds
        ? `🌀 Vortex · ${Math.ceil(s.boosts.vortexUntil! - s.elapsedSeconds)}s`
        : s.boosts.speedUntil > s.elapsedSeconds
          ? `⚡ Speed · ${Math.ceil(s.boosts.speedUntil - s.elapsedSeconds)}s`
          : "",
    );
    text("score", compactPoints(s.score.points));
    this.root
      .querySelector("#score")!
      .setAttribute("title", s.score.points.toLocaleString());
    text(
      "radius",
      s.hole.radius < 0.01
        ? `${(s.hole.radius * 1000).toFixed(1)} mm`
        : `${s.hole.radius.toFixed(2)} m`,
    );
    text(
      "timer",
      `${Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`,
    );
    text("level", `LEVEL ${s.hole.level}`);
    text(
      "hint",
      s.hole.radius < 0.04
        ? `Micro world · Eat ${stages[s.hole.level - 1].name}`
        : s.areaStage < 3
          ? `${sectionForState(s).name} · Grow to unlock ${s.areaStage === 1 ? "the block" : "the city"}`
          : s.pacing && s.score.points - s.growthOffset >= growth.nextThreshold
            ? "Growing · keep eating"
            : `${Math.ceil(growth.nextThreshold - (s.score.points - s.growthOffset)).toLocaleString()} points to grow`,
    );
    text(
      "remaining",
      `${s.world.phase === "city" ? "Open city" : s.world.phase === "metropolis" ? "Expanded city" : s.world.phase === "country" ? "Country map" : "World map"} · ${s.score.remainingObjects.toLocaleString()} left`,
    );
    (this.root.querySelector("#progress") as HTMLElement).style.width =
      `${Math.min(100, ((growthPoints(s) - growth.threshold) / (growth.nextThreshold - growth.threshold)) * 100)}%`;
    (this.root.querySelector("#earned-progress") as HTMLElement).style.width =
      `${Math.max(0, Math.min(100, ((s.score.points - s.growthOffset - growth.threshold) / (growth.nextThreshold - growth.threshold)) * 100))}%`;
    const toast = this.root.querySelector("#level-toast") as HTMLElement;
    if (s.hole.level > this.previousLevel) {
      toast.textContent = "LEVEL UP";
      this.toastUntil = now + 2000;
    }
    if (s.hole.level < this.previousLevel) this.toastUntil = 0;
    this.previousLevel = s.hole.level;
    toast.hidden = now > this.toastUntil;
    const overlay = this.root.querySelector("#overlay") as HTMLElement;
    overlay.hidden = s.status === "playing";
    text("pause", s.status === "paused" ? "Resume" : "Pause");
    if (s.status !== "playing") {
      text("overlay-title", s.status === "won" ? "World cleared!" : "Paused");
      text(
        "overlay-text",
        s.status === "won"
          ? `${s.score.points.toLocaleString()} points. Every object swallowed.`
          : "Ready when you are.",
      );
      text(
        "overlay-action",
        s.status === "won"
          ? `Next city → ${themeForCity(s.cityIndex + 1).name}`
          : "Resume",
      );
    }
    if ((this.root.querySelector(".map-details") as HTMLDetailsElement).open)
      this.drawMap(s);
  }
  drawMap(s: GameState) {
    const canvas = this.root.querySelector("#minimap") as HTMLCanvasElement,
      c = canvas.getContext("2d")!,
      bounds = Math.min(activeBounds(s), Math.max(0.12, s.hole.radius * 10)),
      scale = 140 / (bounds * 2),
      px = (n: number) => (n - s.hole.position.x + bounds) * scale,
      pz = (n: number) => (n - s.hole.position.z + bounds) * scale;
    canvas.setAttribute(
      "aria-label",
      `Local map, ${bounds * 2} meters wide, ${s.hole.radius < 0.3 ? "item" : s.hole.radius < 8 ? "building" : "block"} detail`,
    );
    c.fillStyle = "#c4ccdb";
    c.fillRect(0, 0, 140, 140);
    for (const b of s.level.blocks) {
      c.fillStyle = b.park
        ? "#44995a"
        : b.district === "downtown"
          ? "#87989d"
          : b.district === "industrial"
            ? "#9d9b96"
            : "#bc9d77";
      c.fillRect(px(b.x - 7), pz(b.z - 7), 14 * scale, 14 * scale);
    }
    c.strokeStyle = "#526481";
    c.lineWidth = Math.max(1, 5 * scale);
    if (!s.level.landscape)
      for (let n = -s.level.bounds; n <= s.level.bounds; n += 20) {
        c.beginPath();
        c.moveTo(px(n), 0);
        c.lineTo(px(n), 140);
        c.moveTo(0, pz(n));
        c.lineTo(140, pz(n));
        c.stroke();
      }
    if (s.hole.radius < 8 || s.level.landscape)
      for (const o of s.level.objects) {
        if (!isUnlocked(s, o) || o.state !== "idle") continue;
        const building = [
          "house",
          "shop",
          "building",
          "largeBuilding",
          "skyscraper",
        ].includes(o.type);
        const edible = o.radius <= s.hole.radius * 0.85;
        if (
          !s.level.landscape &&
          s.hole.radius >= 0.3 &&
          !building &&
          (!edible || o.radius < s.hole.radius * 0.12)
        )
          continue;
        if (s.hole.radius < 0.3 && o.radius > 0.24) continue;
        c.fillStyle = building ? "#596d76" : edible ? "#b98349" : "#838b8e";
        const half = building
          ? Math.min(3.2, o.radius * Math.SQRT2 * 0.94) / 2
          : o.radius;
        const width = Math.max(1.5, half * 2 * scale);
        c.fillRect(
          px(o.position.x) - width / 2,
          pz(o.position.z) - width / 2,
          width,
          width,
        );
      }
    c.beginPath();
    c.arc(
      px(s.hole.position.x),
      pz(s.hole.position.z),
      Math.max(2, s.hole.radius * scale),
      0,
      Math.PI * 2,
    );
    c.fillStyle = "#583b98";
    c.fill();
    c.strokeStyle = "#fff";
    c.lineWidth = 1.5;
    c.stroke();
    c.fillStyle = "#203041";
    c.font = "9px system-ui";
    c.fillText(`Local · ${bounds * 2} m`, 5, 135);
  }
}
