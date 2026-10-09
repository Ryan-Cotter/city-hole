import { config } from "./constants";
export function startLoop(update: (dt: number) => void, render: () => void) {
  let previous = performance.now(),
    accumulator = 0;
  document.addEventListener("visibilitychange", () => {
    previous = performance.now();
    accumulator = 0;
  });
  const frame = (now: number) => {
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
  requestAnimationFrame(frame);
}
