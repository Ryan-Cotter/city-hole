import type { District, SwallowableObject } from "../game/GameState";
export const districtProfiles: Record<
  District,
  { name: string; facade: string; accent: string; props: string[] }
> = {
  downtown: {
    name: "Banking quarter",
    facade: "#c4b891",
    accent: "#c7a34b",
    props: [
      "loose coins",
      "coin pouch",
      "ledger stack",
      "lockbox",
      "treasury chest",
    ],
  },
  commercial: {
    name: "Restaurant row",
    facade: "#d3ab83",
    accent: "#b95440",
    props: [
      "bread crumbs",
      "pastry plate",
      "market basket",
      "food crate",
      "outdoor dining table",
    ],
  },
  industrial: {
    name: "Industrial yard",
    facade: "#9b9690",
    accent: "#cb9446",
    props: [
      "metal filings",
      "nuts and bolts",
      "toolbox",
      "supply barrel",
      "cable spool",
    ],
  },
  residential: {
    name: "Apartment courtyard",
    facade: "#b9947c",
    accent: "#7193a0",
    props: [
      "buttons",
      "book stack",
      "flower pot",
      "mail chest",
      "courtyard seat",
    ],
  },
  park: {
    name: "Parkland",
    facade: "#ada785",
    accent: "#699653",
    props: ["seeds", "acorns", "flower bed", "bird bath", "picnic bench"],
  },
};
const props = new Set([
  "bottlecap",
  "dice",
  "pebble",
  "coin",
  "toy",
  "snack",
  "litter",
  "hydrant",
  "sign",
  "bench",
  "table",
  "patio",
]);
export function assignDistrict(o: SwallowableObject, district: District) {
  o.district = district;
  if (
    !o.critter &&
    !o.pickup &&
    !o.motion &&
    !o.supportId &&
    props.has(o.type) &&
    !["dumpster", "small crate"].includes(o.design)
  ) {
    const tier =
      o.radius <= 0.04
        ? 0
        : o.radius <= 0.1
          ? 1
          : o.radius <= 0.25
            ? 2
            : o.radius <= 0.65
              ? 3
              : 4;
    o.districtProp = districtProfiles[district].props[tier];
  }
}
