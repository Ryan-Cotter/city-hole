import { Vector3 } from "three";
import type { categories } from "./constants";
export type ObjectType = keyof typeof categories;
export interface Hole {
  position: Vector3;
  velocity: Vector3;
  speedMultiplier?: number;
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
  baseSpeed?: number;
  laneCenter?: number;
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
  critter?: boolean;
  collisionOnly?: boolean;
  pickup?: "speed" | "size";
  members?: SwallowableObject[];
  aggregateId?: string;
  cityIndex?: number;
  unlockStage?: 2 | 3;
  supportId?: string;
  signalAxis?: "x" | "z";
  variant: number;
  design: string;
  motion: Motion | null;
  state: "idle" | "falling" | "swallowed" | "discarded";
  fall: null | { elapsed: number; start: Vector3; capture: Vector3 };
}
export type District =
  | "residential"
  | "commercial"
  | "downtown"
  | "industrial"
  | "park";
export interface Block {
  district: District;
  x: number;
  z: number;
  park: boolean;
}
export interface Level {
  landscape?: boolean;
  cityIndex?: number;
  seed: number;
  bounds: number;
  objects: SwallowableObject[];
  objectSlots: Map<string, number>;
  blocks: Block[];
  totalMass: number;
  totalScore: number;
}
export interface GameState {
  world: {
    phase: "city" | "metropolis" | "country" | "planet";
    initialCount: number;
  };
  growthOffset: number;
  cityIndex: number;
  boosts: {
    speedUntil: number;
  };
  areaStage: 1 | 2 | 3;
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
