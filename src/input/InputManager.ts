import { Plane, Raycaster, Vector2, Vector3, type Camera } from "three";
export class PointerHold {
  active: number | null = null;
  press(id: number) {
    if (this.active === null) this.active = id;
  }
  cancel() {
    this.active = null;
  }
}
export class InputManager {
  hold = new PointerHold();
  target: Vector3 | null = null;
  private pointer: Vector2 | null = null;
  private camera: Camera;
  private origin = new Vector3();
  private ray = new Raycaster();
  private plane = new Plane(new Vector3(0, 1, 0), 0);
  constructor(
    canvas: HTMLElement | SVGElement,
    camera: Camera,
    onPause: () => void,
  ) {
    this.camera = camera;
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") onPause();
    });
    window.addEventListener("blur", () => this.clear());
    // Release can occur over the HUD or outside the captured canvas.
    window.addEventListener("pointerup", (e) => {
      if (e.pointerId === this.hold.active) this.clear();
    });
    window.addEventListener("pointercancel", (e) => {
      if (e.pointerId === this.hold.active) this.clear();
    });
    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.clear();
    });
    window.addEventListener("pointerdown", (e) => {
      if (e.target !== canvas) this.clear();
    });
    window.addEventListener("pointermove", (e) => {
      if (e.pointerType === "mouse" && !(e.buttons & 1)) this.clear();
    });

    const point = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      this.pointer = new Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1,
      );
      this.refreshTarget();
    };
    canvas.addEventListener("pointerdown", (event) => {
      const e = event as PointerEvent;
      if (!e.isPrimary || e.button !== 0) return;
      e.preventDefault();
      this.hold.press(e.pointerId);
      canvas.setPointerCapture(e.pointerId);
      point(e);
    });
    canvas.addEventListener("pointermove", (event) => {
      const e = event as PointerEvent;
      if (this.hold.active !== e.pointerId) return;
      if (e.pointerType === "mouse" && !(e.buttons & 1)) {
        this.clear();
        return;
      }
      point(e);
    });
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
      canvas.addEventListener(name, (event) => {
        if (this.hold.active === (event as PointerEvent).pointerId)
          this.clear();
      });
  }

  refreshTarget(origin?: Vector3) {
    if (origin) this.origin.copy(origin);
    if (!this.pointer || this.hold.active === null) return;
    this.ray.setFromCamera(this.pointer, this.camera);
    const ground = this.ray.ray.intersectPlane(this.plane, new Vector3());
    this.target = ground ? steeringTarget(this.origin, ground) : null;
  }
  clear() {
    this.hold.cancel();
    this.target = null;
    this.pointer = null;
  }
}

// Rebuild the heading from the live hole center on every simulation step.
// Distance to the cursor never changes movement speed or creates a fixed waypoint.
export function steeringTarget(center: Vector3, groundPointer: Vector3) {
  const direction = groundPointer.clone().sub(center);
  direction.y = 0;
  if (direction.lengthSq() < 1e-14) return center.clone();
  return center.clone().add(direction.normalize().multiplyScalar(10000));
}
