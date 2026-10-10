import { config } from "./constants";
export function startLoop(
  update: (dt: number) => void,
  render: () => void,
  backgroundActive: () => boolean = () => false,
) {
  let previous = performance.now(),
    accumulator = 0;
  document.addEventListener("visibilitychange", () => {
    previous = performance.now();
    accumulator = 0;
  });
  const frame = (now: number) => {
    if (document.hidden) {
      requestAnimationFrame(frame);
      return;
    }
    accumulator += Math.min(
      (now - previous) / 1000,
      config.maxFrameDeltaSeconds,
    );
    previous = now;
    let steps = 0;
    while (
      accumulator >= config.fixedStepSeconds &&
      steps < config.maxSimulationStepsPerFrame
    ) {
      update(config.fixedStepSeconds);
      accumulator -= config.fixedStepSeconds;
      steps++;
    }
    render();
    requestAnimationFrame(frame);
  };
  // requestAnimationFrame is suspended in hidden tabs. Run simulation only there.
  setInterval(() => {
    if (!document.hidden || !backgroundActive()) return;
    const now = performance.now();
    const elapsed = Math.min(1, (now - previous) / 1000);
    previous = now;
    const steps = Math.ceil(elapsed / config.fixedStepSeconds);
    for (let i = 0; i < steps; i++) update(elapsed / steps);
  }, 100);
  requestAnimationFrame(frame);
}
