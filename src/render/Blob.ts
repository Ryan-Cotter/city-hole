import { Mesh, MeshStandardMaterial, SphereGeometry } from "three";

/** A hemisphere keeps the widest, ground-level cross section exactly radius 1. */
export function createBlob() {
  const blob = new Mesh(
    new SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2),
    new MeshStandardMaterial({
      color: "#ef777d",
      transparent: true,
      opacity: 0.58,
      roughness: 0.2,
      metalness: 0.12,
      depthWrite: false,
    }),
  );
  blob.name = "blob";
  blob.scale.y = 0.72;
  blob.renderOrder = 3;
  return blob;
}

export function blobHeight(time: number, lastAbsorption: number) {
  const age = Math.max(0, time - lastAbsorption);
  return (
    0.72 +
    Math.sin(time * 2.4) * 0.012 +
    Math.sin(age * 24) * Math.exp(-age * 5) * 0.18
  );
}
