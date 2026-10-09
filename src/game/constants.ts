export const config = {
  baseRadius: 0.25,
  swallowFactor: 0.85,
  moveSpeed: 3.2,
  velocityResponse: 8,
  mouseStopDistance: 0.2,
  fallDurationSeconds: 1.15,
  fixedStepSeconds: 1 / 60,
  maxFrameDeltaSeconds: 0.25,
  maxSimulationStepsPerFrame: 15,
};
export const cityConfig = {
  bounds: 100,
  blockSize: 20,
  roadWidth: 5,
  blockDensityMultiplier: 3,
};
export const categories = {
  litter: {
    radius: 0.16,
    height: 0.18,
    mass: 1,
    scoreValue: 1,
    label: "litter",
  },
  hydrant: {
    radius: 0.24,
    height: 0.65,
    mass: 2,
    scoreValue: 2,
    label: "fire hydrants",
  },
  person: {
    radius: 0.32,
    height: 1.25,
    mass: 3,
    scoreValue: 3,
    label: "people",
  },
  sign: {
    radius: 0.42,
    height: 1.65,
    mass: 5,
    scoreValue: 5,
    label: "street signs",
  },
  bench: {
    radius: 0.55,
    height: 0.7,
    mass: 8,
    scoreValue: 8,
    label: "benches",
  },
  tree: {
    radius: 0.72,
    height: 2.8,
    mass: 13,
    scoreValue: 13,
    label: "park trees",
  },
  car: { radius: 0.95, height: 0.85, mass: 21, scoreValue: 21, label: "cars" },
  van: { radius: 1.2, height: 1.25, mass: 34, scoreValue: 34, label: "vans" },
  kiosk: {
    radius: 1.5,
    height: 1.8,
    mass: 55,
    scoreValue: 55,
    label: "kiosks",
  },
  house: {
    radius: 1.85,
    height: 2.6,
    mass: 89,
    scoreValue: 89,
    label: "houses",
  },
  shop: {
    radius: 2.3,
    height: 3.2,
    mass: 144,
    scoreValue: 144,
    label: "shops",
  },
  building: {
    radius: 2.85,
    height: 5,
    mass: 233,
    scoreValue: 233,
    label: "apartment buildings",
  },
  largeBuilding: {
    radius: 3.5,
    height: 7.5,
    mass: 377,
    scoreValue: 377,
    label: "large buildings",
  },
  skyscraper: {
    radius: 4.4,
    height: 15,
    mass: 610,
    scoreValue: 610,
    label: "skyscrapers",
  },
};
const thresholds = [
  0, 15, 45, 100, 200, 400, 800, 1400, 2500, 4000, 6000, 8500, 12000, 16000,
];
export const stages = (
  Object.keys(categories) as (keyof typeof categories)[]
).map((type, index) => ({
  type,
  name: categories[type].label,
  target: categories[type].label,
  radius:
    index === 0
      ? config.baseRadius
      : categories[type].radius / config.swallowFactor + 0.08,
  points: thresholds[index],
}));

export const objectDesigns = {
  litter: ["can", "bottle", "paper bag", "carton"],
  hydrant: ["fire hydrant", "traffic cone", "mailbox", "bollard"],
  person: ["walker", "backpacker", "shopper", "courier"],
  sign: ["stop sign", "parking sign", "direction sign", "street lamp"],
  bench: ["park bench", "waste bin", "picnic table", "bike rack"],
  tree: ["pine", "broadleaf", "palm", "flower planter"],
  car: ["sedan", "hatchback", "taxi", "police car"],
  van: ["delivery van", "minibus", "pickup", "ambulance"],
  kiosk: ["newsstand", "coffee booth", "food stand", "bus shelter"],
  house: ["gable house", "flat-roof house", "duplex", "townhouse"],
  shop: ["bakery", "cafe", "grocery", "pharmacy"],
  building: ["apartment", "stepped office", "hotel", "school"],
  largeBuilding: ["civic building", "terraced mall", "warehouse", "hospital"],
  skyscraper: [
    "glass tower",
    "stepped tower",
    "spire tower",
    "observation tower",
  ],
} as const;
