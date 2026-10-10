import { cameraConfig } from "../game/constants";
import { OrthographicCamera } from "three";
export function createCamera() {
  const camera = new OrthographicCamera(-32, 32, 32, -32, 0.1, 250);
  camera.position.set(35, 44, 35);
  camera.lookAt(0, 0, 0);
  return camera;
}
export function resizeCamera(
  camera: OrthographicCamera,
  width: number,
  height: number,
  viewSize = 12,
) {
  const aspect = width / height;
  const halfH = Math.max(viewSize, viewSize / aspect);
  camera.left = -halfH * aspect;
  camera.right = halfH * aspect;
  camera.top = halfH;
  camera.bottom = -halfH;
  camera.updateProjectionMatrix();
}

export const cameraViewSize = (radius: number, moving: boolean) =>
  (cameraConfig.baseView + radius * cameraConfig.radiusScale) *
  (moving ? cameraConfig.movingZoom : 1);
