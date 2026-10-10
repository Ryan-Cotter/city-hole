import { Group, Plane, Vector3, Mesh, type MeshStandardMaterial } from "three";
import type { SwallowableObject } from "../game/GameState";
import { polishedCar, polishedBuilding } from "./PolishModels";
const templates = new Map<string, Group>();
const clipping = new Plane(new Vector3(0, 1, 0), 0);
export function polishedGameModel(o: SwallowableObject): Group | null {
  if (
    (o.cityIndex ?? 0) % 4 !== 2 ||
    !(
      (o.type === "car" && o.design === "sedan") ||
      (o.type === "building" && o.design === "apartment")
    )
  )
    return null;
  let model = templates.get(o.type);
  if (!model) {
    model = o.type === "car" ? polishedCar() : polishedBuilding();
    model.traverse((child) => {
      if (child instanceof Mesh)
        (child.material as MeshStandardMaterial).clippingPlanes = [clipping];
    });
    templates.set(o.type, model);
  }
  const root = new Group(),
    inner = model.clone();
  if (o.type === "building") inner.scale.set(1.6, o.height / 3.5, 1.6);
  else inner.scale.set(0.9, o.height / 1.1, 0.9);
  root.add(inner);
  root.position.copy(o.position);
  root.rotation.y = o.orientation;
  root.userData.object = o;
  return root;
}
