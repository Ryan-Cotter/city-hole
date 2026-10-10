import { stages } from "../game/constants";
import { themeForCity } from "../game/campaign";
import { sectionForState, activeBounds, isUnlocked } from "../game/sections";
import type { GameState } from "../game/GameState";
import { growthForPoints, growthPoints } from "../game/progression";
export class HUD {
  root: HTMLElement;
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
    container.innerHTML = `<main id="viewport"><aside class="hud-panel"><div class="hud-brand"><span>◉</span> CITY HOLE</div><small id="city-theme"></small><div class="score-row"><div><label>SCORE</label><strong id="score">0</strong></div><span id="timer">00:00</span></div><div class="level-row"><b id="level"></b><span id="radius"></span></div><div class="track"><i id="progress"></i></div><p id="hint"></p><small id="remaining"></small><small id="boost-status"></small><div id="level-toast" role="status" hidden></div><div class="hud-actions"><button id="pause">Pause</button></div><details class="utility-menu"><summary>Menu</summary><button id="restart">Restart</button><button id="self-play" aria-pressed="false">Self play: off</button><p class="control-guide">Hold to steer · release to stop</p><button id="phone-preview" aria-pressed="false">Phone preview</button><details class="map-details"><summary>City map</summary><canvas id="minimap" width="140" height="140" aria-label="Street map and your location"></canvas></details></details><section id="overlay" hidden><h2 id="overlay-title"></h2><p id="overlay-text"></p><button id="overlay-action">Resume</button></section></aside></main>`;
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
      s.boosts.speedUntil > s.elapsedSeconds
        ? `⚡ Speed · ${Math.ceil(s.boosts.speedUntil - s.elapsedSeconds)}s`
        : "",
    );
    text("score", s.score.points.toLocaleString());
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
      `${s.world.phase === "city" ? `Section ${sectionForState(s).index}/3` : s.world.phase === "metropolis" ? "Expanded city" : s.world.phase === "country" ? "Country map" : "World map"} · ${s.score.remainingObjects.toLocaleString()} left`,
    );
    (this.root.querySelector("#progress") as HTMLElement).style.width =
      `${Math.min(100, ((growthPoints(s) - growth.threshold) / (growth.nextThreshold - growth.threshold)) * 100)}%`;
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
      bounds = activeBounds(s),
      scale = 140 / (bounds * 2),
      p = (n: number) => (n + bounds) * scale;
    canvas.setAttribute(
      "aria-label",
      `Section ${sectionForState(s).index} map, ${bounds * 2} meters wide, ${s.hole.radius < 0.3 ? "item" : s.hole.radius < 8 ? "building" : "block"} detail`,
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
      c.fillRect(p(b.x - 7), p(b.z - 7), 14 * scale, 14 * scale);
    }
    c.strokeStyle = "#526481";
    c.lineWidth = Math.max(1, 5 * scale);
    if (!s.level.landscape)
      for (let n = -s.level.bounds; n <= s.level.bounds; n += 20) {
        c.beginPath();
        c.moveTo(p(n), 0);
        c.lineTo(p(n), 140);
        c.moveTo(0, p(n));
        c.lineTo(140, p(n));
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
          p(o.position.x) - width / 2,
          p(o.position.z) - width / 2,
          width,
          width,
        );
      }
    c.beginPath();
    c.arc(
      p(s.hole.position.x),
      p(s.hole.position.z),
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
    c.fillText(`Section ${sectionForState(s).index} · ${bounds * 2} m`, 5, 135);
  }
}
