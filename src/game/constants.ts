export const renderChunkConfig = {
  minimumSize: 0.08,
  detailRadiusScale: 2,
  cameraPadding: 0.4,
  movementLookAhead: 0.6,
  retainedTierDistance: 20,
};
export const starterPopulationConfig = { multipliedTiers: 5, multiplier: 3 };
export const config = {
  baseRadius: 0.0015,
  swallowFactor: 0.85,
  moveSpeed: 3.2,
  velocityResponse: 8,
  mouseStopDistance: 0.2,
  fallDurationSeconds: 0.7,
  fixedStepSeconds: 1 / 60,
  maxFrameDeltaSeconds: 0.25,
  maxSimulationStepsPerFrame: 15,
};
export const cityConfig = {
  bounds: 60,
  blockSize: 20,
  roadWidth: 5,
  blockDensityMultiplier: 3,
  smallItemMultiplier: 3,
};
export const categories = {
  bacterium: {
    radius: 0.001,
    height: 0.0012,
    mass: 1,
    scoreValue: 1,
    label: "microbes",
  },
  spore: {
    radius: 0.002,
    height: 0.002,
    mass: 2,
    scoreValue: 2,
    label: "spores",
  },
  dust: {
    radius: 0.004,
    height: 0.0025,
    mass: 3,
    scoreValue: 3,
    label: "dust flakes",
  },
  pollen: {
    radius: 0.007,
    height: 0.009,
    mass: 5,
    scoreValue: 5,
    label: "pollen grains",
  },
  sand: {
    radius: 0.012,
    height: 0.01,
    mass: 8,
    scoreValue: 8,
    label: "sand grains",
  },

  bottlecap: {
    radius: 0.025,
    height: 0.02,
    mass: 13,
    scoreValue: 13,
    label: "bottlecaps",
  },
  dice: {
    radius: 0.04,
    height: 0.055,
    mass: 21,
    scoreValue: 21,
    label: "dice",
  },
  pebble: {
    radius: 0.055,
    height: 0.045,
    mass: 34,
    scoreValue: 34,
    label: "pebbles",
  },
  coin: {
    radius: 0.07,
    height: 0.025,
    mass: 55,
    scoreValue: 55,
    label: "coins",
  },
  toy: {
    radius: 0.095,
    height: 0.12,
    mass: 89,
    scoreValue: 89,
    label: "small toys",
  },
  snack: {
    radius: 0.12,
    height: 0.14,
    mass: 144,
    scoreValue: 144,
    label: "food",
  },
  mouse: {
    radius: 0.14,
    height: 0.1,
    mass: 233,
    scoreValue: 233,
    label: "mice",
  },
  litter: {
    radius: 0.16,
    height: 0.18,
    mass: 377,
    scoreValue: 377,
    label: "litter",
  },
  cat: {
    radius: 0.17,
    height: 0.18,
    mass: 610,
    scoreValue: 610,
    label: "cats",
  },
  manhole: {
    radius: 0.2,
    height: 0.03,
    mass: 987,
    scoreValue: 987,
    label: "manhole covers",
  },
  dog: {
    radius: 0.23,
    height: 0.3,
    mass: 1597,
    scoreValue: 1597,
    label: "dogs",
  },
  hydrant: {
    radius: 0.24,
    height: 0.65,
    mass: 2584,
    scoreValue: 2584,
    label: "fire hydrants",
  },
  person: {
    radius: 0.32,
    height: 1.25,
    mass: 4181,
    scoreValue: 4181,
    label: "people",
  },
  sign: {
    radius: 0.42,
    height: 1.65,
    mass: 6765,
    scoreValue: 6765,
    label: "street signs",
  },
  bench: {
    radius: 0.55,
    height: 0.7,
    mass: 10946,
    scoreValue: 10946,
    label: "benches",
  },
  table: {
    radius: 0.65,
    height: 0.75,
    mass: 17711,
    scoreValue: 17711,
    label: "outdoor tables",
  },
  tree: {
    radius: 0.72,
    height: 2.8,
    mass: 28657,
    scoreValue: 28657,
    label: "park trees",
  },
  barrier: {
    radius: 0.82,
    height: 0.6,
    mass: 46368,
    scoreValue: 46368,
    label: "street barriers",
  },
  car: {
    radius: 0.95,
    height: 0.85,
    mass: 75025,
    scoreValue: 75025,
    label: "cars",
  },
  van: {
    radius: 1.2,
    height: 1.25,
    mass: 121393,
    scoreValue: 121393,
    label: "vans",
  },
  patio: {
    radius: 1.35,
    height: 2.4,
    mass: 196418,
    scoreValue: 196418,
    label: "patio covers",
  },
  kiosk: {
    radius: 1.5,
    height: 1.8,
    mass: 317811,
    scoreValue: 317811,
    label: "kiosks",
  },
  house: {
    radius: 1.85,
    height: 2.6,
    mass: 514229,
    scoreValue: 514229,
    label: "houses",
  },
  shop: {
    radius: 2.3,
    height: 3.2,
    mass: 832040,
    scoreValue: 832040,
    label: "shops",
  },
  building: {
    radius: 2.85,
    height: 5,
    mass: 1346269,
    scoreValue: 1346269,
    label: "apartment buildings",
  },
  largeBuilding: {
    radius: 3.5,
    height: 7.5,
    mass: 2178309,
    scoreValue: 2178309,
    label: "large buildings",
  },
  skyscraper: {
    radius: 4.4,
    height: 15,
    mass: 3524578,
    scoreValue: 3524578,
    label: "skyscrapers",
  },
  cityBlock: {
    radius: 10,
    height: 6,
    mass: 5702887,
    scoreValue: 5702887,
    label: "city blocks",
  },
  river: {
    radius: 80,
    height: 0.4,
    mass: 9227465,
    scoreValue: 9227465,
    label: "river sections",
  },
  mountain: {
    radius: 115,
    height: 38,
    mass: 14930352,
    scoreValue: 14930352,
    label: "mountains",
  },
  wholeCity: {
    radius: 170,
    height: 25,
    mass: 24157817,
    scoreValue: 24157817,
    label: "whole cities",
  },
  country: {
    radius: 250,
    height: 5,
    mass: 39088169,
    scoreValue: 39088169,
    label: "countries",
  },
};
export const blockRewardConfig = {
  contentsMultiplier: 0.1,
  shellMultiplier: 0.15,
};
categories.cityBlock.scoreValue = Math.round(
  categories.skyscraper.scoreValue * blockRewardConfig.shellMultiplier,
);
export const progressionConfig = {
  baseLevelCost: 16,
  objectsPerTier: 3,
  postCityCost: categories.country.scoreValue * 5,
  extraRadiusStep: 4,
};
// Measured per-size pacing weights; points retain their Fibonacci values.
export const pacingWeights: Partial<Record<keyof typeof categories, number>> = {
  bacterium: 0.4,
  spore: 0.5,
  dust: 0.8,
  pollen: 1.6,
  sand: 2.4,
  bottlecap: 3.5,
  dice: 4,
  pebble: 3,
  coin: 3,
  toy: 2.5,
  snack: 1.6,
  mouse: 3.5,
  litter: 2.5,
  cat: 3,
  manhole: 1.2,
  dog: 2,
  hydrant: 0.5,
  person: 0.4,
  sign: 1,
  bench: 0.8,
  table: 1.3,
  tree: 1.8,
  barrier: 1,
  car: 0.7,
  van: 1.1,
  patio: 0.4,
  kiosk: 0.4,
  house: 0.4,
  shop: 0.6,
  building: 0.7,
  largeBuilding: 0.8,
  skyscraper: 1,
  cityBlock: 1.5,
};
// Every incremental growth cost is logarithmic in its level index, with base 2.
const thresholds = [0];
for (let i = 1; i < Object.keys(categories).length; i++)
  thresholds.push(
    thresholds[i - 1] +
      Math.ceil(
        Math.max(
          progressionConfig.baseLevelCost * Math.log2(i + 1),
          Math.max(
            Object.values(categories)[i - 1].scoreValue,
            Object.values(categories)[i - 1].mass,
          ) * progressionConfig.objectsPerTier,
        ) *
          (pacingWeights[
            Object.keys(categories)[i - 1] as keyof typeof categories
          ] ?? 1),
      ),
  );
export const stages = (
  Object.keys(categories) as (keyof typeof categories)[]
).map((type, index) => ({
  type,
  name: categories[type].label,
  target: categories[type].label,
  radius:
    index === 0
      ? config.baseRadius
      : categories[type].radius / config.swallowFactor +
        Math.min(
          0.08,
          Math.max(
            categories[type].radius < 0.025 ? 0 : 0.012,
            categories[type].radius * 0.1,
          ),
        ),
  points: thresholds[index],
}));
// Macro stages always increase in size, including the eight-block transition.
for (let i = 0; i < stages.length; i++) {
  if (stages[i].type === "cityBlock") stages[i].radius = 80;
  if (i && i >= stages.findIndex((s) => s.type === "cityBlock"))
    stages[i].radius = Math.max(stages[i].radius, stages[i - 1].radius * 1.2);
}

export const objectDesigns = {
  bacterium: [
    "rod bacterium",
    "paired cells",
    "spiral bacterium",
    "round bacterium",
  ],
  spore: ["mushroom spore", "fern spore", "mold spore", "yeast cell"],
  dust: ["lint flake", "skin flake", "paper fiber", "charcoal speck"],
  pollen: ["golden pollen", "flower pollen", "grass pollen", "seed pollen"],
  sand: ["quartz grain", "pink sand", "golden sand", "volcanic sand"],
  cityBlock: ["residential block", "market block", "tower block", "park block"],
  river: ["river bend", "river reach", "delta", "lake"],
  mountain: ["snow peak", "rocky ridge", "volcano", "green foothill"],
  wholeCity: ["capital", "port city", "inland city", "industrial city"],
  country: [
    "coastal country",
    "island country",
    "forest country",
    "desert country",
  ],
  bottlecap: ["soda cap", "water cap", "beer cap", "juice cap"],
  dice: [
    "white die",
    "red die",
    "blue die",
    "green die",
    "black die",
    "ivory die",
  ],
  pebble: [
    "granite pebble",
    "slate chip",
    "sandstone",
    "round stone",
    "quartz shard",
    "river stone",
  ],
  coin: [
    "copper coin",
    "silver coin",
    "gold coin",
    "token",
    "arcade token",
    "old bronze coin",
  ],
  toy: [
    "toy block",
    "marble",
    "toy car",
    "rubber ball",
    "spinning top",
    "domino",
    "toy train",
    "stacking rings",
  ],
  snack: [
    "burger",
    "fruit",
    "cake",
    "drink",
    "doughnut",
    "ice cream",
    "hot dog",
    "pizza slice",
  ],
  mouse: ["gray mouse", "brown mouse", "field mouse", "white mouse"],
  manhole: ["round cover", "drain", "utility cover", "sewer grate"],
  cat: ["ginger cat", "gray cat", "black cat", "white cat"],
  dog: ["terrier", "retriever", "shepherd", "spaniel"],
  table: ["cafe table", "picnic setting", "bistro table", "terrace table"],
  barrier: [
    "road barrier",
    "street divider",
    "construction fence",
    "bollard row",
  ],
  patio: ["striped awning", "cafe umbrella", "pergola", "patio canopy"],
  litter: [
    "can",
    "bottle",
    "paper bag",
    "carton",
    "cup",
    "newspaper",
    "wrapper",
    "takeaway box",
  ],
  hydrant: [
    "fire hydrant",
    "traffic cone",
    "mailbox",
    "bollard",
    "parking meter",
    "utility box",
    "flowerpot",
    "small crate",
  ],
  person: ["walker", "backpacker", "shopper", "courier"],
  sign: [
    "stop sign",
    "parking sign",
    "direction sign",
    "street lamp",
    "bus-stop sign",
    "crossing sign",
    "advertising board",
    "construction barrier",
  ],
  bench: [
    "park bench",
    "waste bin",
    "picnic table",
    "bike rack",
    "bicycle",
    "scooter",
    "vending machine",
    "parcel locker",
    "dumpster",
  ],
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

export const selfPlayConfig = {
  cellSize: 1.25,
  clusterSize: 4,
  replanSeconds: 1.25,
  candidateGroups: 4,
  maxSearchNodes: 6000,
};

export const cameraConfig = {
  desktopFraming: 1.2,
  baseView: 0.7,
  radiusScale: 1.3,
  movingZoom: 1.25,
  smoothing: 4,
};

export const crowdConfig = {
  interval: 1 / 20,
  distantInterval: 0.25,
  nearbyBudget: 128,
  distantBudget: 48,
};

// Screen pressure only changes tiny-item presentation, never their reward.
export const adaptiveSwallowConfig = {
  smallFraction: 0.22,
  slowFrameSeconds: 0.032,
  enterStrainSeconds: 0.6,
  recoverSeconds: 0.1,
};
