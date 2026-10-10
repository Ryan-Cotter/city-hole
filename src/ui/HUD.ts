import type { GameState } from "../game/GameState";
import { growthForPoints } from "../game/progression";
export class HUD {
  root: HTMLElement;
  private lastUpdate = 0;
  private previousLevel = 1;
  private toastUntil = 0;
  constructor(
    container: HTMLElement,
    onPause: () => void,
    onRestart: () => void,
  ) {
    container.innerHTML = `<main id="viewport"><aside class="hud-panel"><div class="hud-brand"><span>◉</span> CITY HOLE</div><div class="score-row"><div><label>SCORE</label><strong id="score">0</strong></div><span id="timer">00:00</span></div><div class="level-row"><b id="level"></b><span id="radius"></span></div><div class="track"><i id="progress"></i></div><p id="hint"></p><small id="remaining"></small><div id="level-toast" role="status" hidden></div><div class="hud-actions"><button id="pause">Pause</button></div><details class="utility-menu"><summary>Menu</summary><button id="restart">Restart</button><p class="control-guide">Hold to steer · release to stop</p><button id="phone-preview" aria-pressed="false">Phone preview</button><details class="map-details"><summary>City map</summary><canvas id="minimap" width="140" height="140" aria-label="Street map and your location"></canvas></details></details><section id="overlay" hidden><h2 id="overlay-title"></h2><p id="overlay-text"></p><button id="overlay-action">Resume</button></section></aside></main>`;
    container
      .querySelector("#phone-preview")!
      .addEventListener("click", (event) => {
        const active = container.classList.toggle("phone-mode");
        const button = event.currentTarget as HTMLButtonElement;
        button.setAttribute("aria-pressed", String(active));
        button.textContent = active ? "Desktop view" : "Phone preview";
      });
    this.root = container;
    container.querySelector("#pause")!.addEventListener("click", onPause);
    container.querySelector("#restart")!.addEventListener("click", onRestart);
    container
      .querySelector("#overlay-action")!
      .addEventListener("click", () =>
        this.root.dataset.status === "won" ? onRestart() : onPause(),
      );
  }
  update(s: GameState) {
    const now = performance.now();
    if (now - this.lastUpdate < 100 && this.root.dataset.status === s.status)
      return;
    this.lastUpdate = now;
    const text = (id: string, value: string) => {
      const el = this.root.querySelector("#" + id)!;
      if (el.textContent !== value) el.textContent = value;
    };
    this.root.dataset.status = s.status;
    const growth = growthForPoints(s.score.points),
      seconds = Math.floor(s.elapsedSeconds);
    text("score", s.score.points.toLocaleString());
    text("radius", `${s.hole.radius.toFixed(2)} m`);
    text(
      "timer",
      `${Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`,
    );
    text("level", `LEVEL ${s.hole.level}`);
    text(
      "hint",
      `${(growth.nextThreshold - s.score.points).toLocaleString()} points to grow`,
    );
    text(
      "remaining",
      `${s.score.remainingObjects.toLocaleString()} objects remaining`,
    );
    (this.root.querySelector("#progress") as HTMLElement).style.width =
      `${Math.min(100, ((s.score.points - growth.threshold) / (growth.nextThreshold - growth.threshold)) * 100)}%`;
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
      text("overlay-title", s.status === "won" ? "City cleared!" : "Paused");
      text(
        "overlay-text",
        s.status === "won"
          ? `${s.score.points.toLocaleString()} points. Every object swallowed.`
          : "Ready when you are.",
      );
      text("overlay-action", s.status === "won" ? "Play again" : "Resume");
    }
    if ((this.root.querySelector(".map-details") as HTMLDetailsElement).open)
      this.drawMap(s);
  }
  drawMap(s: GameState) {
    const canvas = this.root.querySelector("#minimap") as HTMLCanvasElement,
      c = canvas.getContext("2d")!,
      p = (n: number) => (n / s.level.bounds + 1) * 70;
    c.fillStyle = "#c4ccdb";
    c.fillRect(0, 0, 140, 140);
    for (const b of s.level.blocks) {
      c.fillStyle = b.park ? "#44995a" : "#bc9d77";
      c.fillRect(p(b.x - 7), p(b.z - 7), 9.8, 9.8);
    }
    c.strokeStyle = "#526481";
    c.lineWidth = 2;
    for (let n = -100; n <= 100; n += 20) {
      c.beginPath();
      c.moveTo(p(n), 0);
      c.lineTo(p(n), 140);
      c.moveTo(0, p(n));
      c.lineTo(140, p(n));
      c.stroke();
    }
    c.beginPath();
    c.arc(
      p(s.hole.position.x),
      p(s.hole.position.z),
      Math.max(3, s.hole.radius * 0.7),
      0,
      Math.PI * 2,
    );
    c.fillStyle = "#583b98";
    c.fill();
    c.strokeStyle = "#fff";
    c.lineWidth = 1.5;
    c.stroke();
  }
}
