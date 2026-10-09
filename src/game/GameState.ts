import { Vector3 } from "three";
import type { categories } from "./constants";
export type ObjectType = keyof typeof categories;
export interface Hole {
  position: Vector3;
  velocity: Vector3;
  radius: number;
  mass: number;
  level: number;
}
export interface Motion {
  axis: "x" | "z";
  direction: number;
  speed: number;
  min: number;
  max: number;
  currentSpeed?: number;
  intersection?: number | null;
}
export interface SwallowableObject {
  id: string;
  type: ObjectType;
  position: Vector3;
  radius: number;
  height: number;
  mass: number;
  scoreValue: number;
  orientation: number;
  signalAxis?: "x" | "z";
  variant: number;
  design: string;
  motion: Motion | null;
  state: "idle" | "falling" | "swallowed";
  fall: null | { elapsed: number; start: Vector3; capture: Vector3 };
}
export interface Block {
  x: number;
  z: number;
  park: boolean;
}
export interface Level {
  seed: number;
  bounds: number;
  objects: SwallowableObject[];
  blocks: Block[];
  totalMass: number;
  totalScore: number;
}
export interface GameState {
  status: "playing" | "paused" | "won";
  elapsedSeconds: number;
  hole: Hole;
  level: Level;
  score: {
    points: number;
    swallowedObjects: number;
    remainingObjects: number;
    byType: Record<ObjectType, number>;
  };
}
