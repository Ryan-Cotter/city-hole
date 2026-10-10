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
  groupId?: string;
  critter?: boolean;
  worldRing?: 1 | 2 | 3;
  reactionUntil?: number;
  alertedUntil?: number;
  wasThreatened?: boolean;
  spill?: { origin: Vector3; target: Vector3; elapsed: number };
  collisionOnly?: boolean;
  pickup?: "speed" | "size" | "vortex";
  members?: SwallowableObject[];
  aggregateId?: string;
  cityIndex?: number;
  unlockStage?: 2 | 3;
  supportId?: string;
  signalAxis?: "x" | "z";
  variant: number;
  design: string;
  district?: District;
  districtProp?: string;
  motion: Motion | null;
  state: "idle" | "falling" | "swallowed" | "discarded";
  fall: null | {
    elapsed: number;
    start: Vector3;
    capture: Vector3;
    toCenter?: boolean;
  };
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
  finalBounds?: number;
  densityPlan?: {
    type: ObjectType;
    count: number;
    requiredPoints: number;
    area: number;
  }[];
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
  streak?: {
    count: number;
    expiresAt: number;
    multiplier: number;
    best: number;
  };
  pacing?: { points: number };
  neighborhoods?: Record<
    string,
    { remaining: number; total: number; label: string }
  >;
  performance?: { strained: boolean; slowSeconds: number };
  feedback?: {
    points: number;
    count: number;
    until: number;
    bumpUntil: number;
    cleared: number;
    goal?: string;
    goalUntil?: number;
  };
  world: {
    phase: "city" | "metropolis" | "country" | "planet";
    initialCount: number;
    ringCount?: number;
    remainingByRing?: Record<number, number>;
    reveal?: { from: number; to: number; started: number };
  };
  growthOffset: number;
  cityIndex: number;
  boosts: {
    speedUntil: number;
    vortexUntil?: number;
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
