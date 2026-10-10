import type { Group } from "three";
import type { SwallowableObject } from "../game/GameState";

/** Local poses only: animation never changes positions used by collision/AI. */
export function animateLife(model: Group, o: SwallowableObject, time: number) {
  const virus = o.design.includes("virus") || o.design === "tailed phage";
  const micro = virus || o.type === "bacterium" || o.type === "spore";
  const animal = ["mouse", "cat", "dog"].includes(o.type);
  if (!micro && !o.critter && !animal) return;
  const frame = Math.floor(time * 30);
  if (o.state === "idle" && model.userData.lifeFrame === frame) return;
  model.userData.lifeFrame = frame;
  const phase = time * (o.critter ? 12 : animal ? 8 : 3) + o.variant * 1.73;
  model.children.forEach((part, i) => {
    const rest = (part.userData.lifeRest ??= {
      position: part.position.clone(),
      rotation: part.rotation.clone(),
      scale: part.scale.clone(),
    });
    part.position.copy(rest.position);
    part.rotation.copy(rest.rotation);
    part.scale.copy(rest.scale);
    if (o.state !== "idle") return;
    const wave = Math.sin(phase + i * 0.8);
    if (micro) {
      part.scale.multiplyScalar(1 + wave * (virus ? 0.045 : 0.065));
      part.position.y += o.radius * 0.035 * Math.sin(phase);
      if (/filament|chain|spiral|flagellated/.test(o.design))
        part.position.x += o.radius * 0.065 * wave;
      else part.rotation.y += wave * 0.09;
    } else if (part.userData.walkSide) {
      const side = part.userData.walkSide;
      const wing = Math.abs(side) < 0.5;
      if (wing) part.rotation.z += Math.sin(phase * 2.5) * side * 1.4;
      else part.rotation.x += wave * side * (animal ? 0.35 : 0.24);
    } else {
      part.position.y += Math.sin(phase * 0.5) * o.height * 0.012;
      if (o.critter && /caterpillar|pillbug/.test(o.design))
        part.position.y += wave * o.height * 0.04;
    }
  });
  model.userData.poseVersion = (model.userData.poseVersion ?? 0) + 1;
}
