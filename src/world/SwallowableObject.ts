import { objectDesigns } from "../game/constants";
import {
  BoxGeometry,
  CylinderGeometry,
  ConeGeometry,
  IcosahedronGeometry,
  Group,
  Mesh,
  PlaneGeometry,
  BufferGeometry,
  Float32BufferAttribute,
} from "three";
import type { SwallowableObject } from "../game/GameState";
import { material } from "../render/Materials";
const box = new BoxGeometry(1, 1, 1),
  cylinder = new CylinderGeometry(1, 1, 1, 8),
  cone = new ConeGeometry(1, 1, 8),
  sphere = new IcosahedronGeometry(1, 0);
const panelGeometry = new PlaneGeometry(1, 1);
const roofGeometry = new BufferGeometry();
roofGeometry.setAttribute(
  "position",
  new Float32BufferAttribute(
    [
      -0.5, 0, 0.5, 0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, -0.5, 0, 1, 0.5, 0, 1,
      -0.5,
    ],
    3,
  ),
);
roofGeometry.setIndex([0, 1, 4, 2, 3, 5, 0, 4, 5, 0, 5, 3, 1, 2, 5, 1, 5, 4]);
roofGeometry.computeVertexNormals();
const bright = [
  "#ff5e69",
  "#2dbeef",
  "#ffcb35",
  "#a979ff",
  "#ff8944",
  "#23c99d",
];
export function createObjectVisual(o: SwallowableObject) {
  const g = new Group();
  g.position.copy(o.position);
  g.rotation.y = o.orientation;
  g.userData.object = o;
  const add = (
    shape: typeof box | typeof cylinder | typeof sphere | typeof roofGeometry,
    color: string,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
  ) => {
    const mesh = new Mesh(shape, material(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    g.add(mesh);
    return mesh;
  };
  const panel = (
    color: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    rotation = 0,
    name = "window",
  ) => {
    const normalX = Math.sin(rotation),
      normalZ = Math.cos(rotation);
    if (name === "window") {
      const frame = add(panelGeometry, "#e6d7b9", x, y, z, w + 0.1, h + 0.1, 1);
      frame.rotation.y = rotation;
      frame.name = "window-frame";
      frame.renderOrder = 1;
    }
    const offset = name === "window" ? 0.022 : 0;
    const m = add(
      panelGeometry,
      color,
      x + normalX * offset,
      y,
      z + normalZ * offset,
      w,
      h,
      1,
    );
    m.rotation.y = rotation;
    m.name = name;
    m.renderOrder = name === "window" ? 2 : name === "door-glass" ? 3 : 2;
    return m;
  };
  const facades = {
    house: ["#c2aa88", "#a57e64", "#d4c8ac", "#a4ada6", "#a56c53", "#bbb6a7"],
    shop: ["#b98a68", "#b9b0a0", "#ab755a", "#c7b696", "#a09c90", "#c4bba8"],
    building: [
      "#b5ada0",
      "#b9a38c",
      "#9aa8ad",
      "#b38b70",
      "#a5aaa5",
      "#c1bbae",
    ],
    largeBuilding: [
      "#a69f91",
      "#b4b0a6",
      "#9b8b7a",
      "#b4a68f",
      "#939e9d",
      "#a9b0b0",
    ],
    skyscraper: [
      "#688b9a",
      "#79939c",
      "#8b999d",
      "#627d89",
      "#a2abad",
      "#75848a",
    ],
  };
  const palette = facades[o.type as keyof typeof facades] ?? bright;
  const color = palette[o.variant % palette.length];
  const kind = o.variant % objectDesigns[o.type].length;
  g.name = o.design;
  if (o.type === "snack") {
    if (kind === 0) {
      add(cylinder, "#c8954e", 0, 0.035, 0, 0.105, 0.05, 0.105);
      add(cylinder, "#75492e", 0, 0.07, 0, 0.102, 0.025, 0.102);
      add(box, "#569553", 0, 0.087, 0, 0.19, 0.012, 0.19);
      add(sphere, "#dcb16a", 0, 0.115, 0, 0.105, 0.04, 0.105);
    } else if (kind === 1) {
      add(sphere, "#cc654c", 0, 0.07, 0, 0.095, 0.085, 0.095);
      add(box, "#63764d", 0, 0.155, 0, 0.015, 0.035, 0.015);
    } else if (kind === 2) {
      add(box, "#c7976c", 0, 0.055, 0, 0.17, 0.1, 0.17);
      add(box, "#eee0c4", 0, 0.115, 0, 0.18, 0.025, 0.18);
      add(sphere, "#ba5d60", 0, 0.145, 0, 0.025, 0.025, 0.025);
    } else {
      add(cylinder, "#a3c5c7", 0, 0.07, 0, 0.07, 0.14, 0.07);
      add(cylinder, "#d7d3bf", 0, 0.147, 0, 0.078, 0.015, 0.078);
      add(box, "#cc674d", 0.025, 0.185, 0, 0.012, 0.075, 0.012);
    }
    return g;
  }
  if (o.type === "toy" && kind === 2) {
    add(box, color, 0, 0.06, 0, 0.14, 0.06, 0.11);
    add(box, "#608693", 0, 0.105, 0, 0.085, 0.04, 0.09);
    for (const side of [-1, 1])
      for (const front of [-1, 1])
        add(
          cylinder,
          "#35444d",
          side * 0.07,
          0.03,
          front * 0.04,
          0.025,
          0.035,
          0.025,
        );
    return g;
  }
  if (
    ["bottlecap", "dice", "pebble", "coin", "toy", "manhole"].includes(o.type)
  ) {
    const round = ["bottlecap", "coin", "manhole"].includes(o.type);
    const itemColor =
      o.type === "pebble"
        ? ["#85847b", "#696d70", "#b89f7a", "#939591"][kind]
        : o.type === "manhole"
          ? "#56616a"
          : color;
    add(
      round
        ? cylinder
        : o.type === "pebble" || (o.type === "toy" && kind % 2)
          ? sphere
          : box,
      itemColor,
      0,
      o.height / 2,
      0,
      round ? o.radius : o.radius * 1.4,
      o.height,
      round ? o.radius : o.radius * 1.4,
    );
    if (o.type === "dice")
      for (let pip = 0; pip <= kind; pip++)
        add(
          sphere,
          "#f1e8d6",
          -0.025 + pip * 0.014,
          o.height + 0.003,
          0,
          0.004,
          0.004,
          0.004,
        );
    if (o.type === "manhole")
      for (let stripe = -2; stripe <= 2; stripe++)
        add(box, "#283640", stripe * 0.055, 0.032, 0, 0.016, 0.006, 0.25);
    return g;
  }
  if (["mouse", "cat", "dog"].includes(o.type)) {
    const fur = ["#aa8060", "#777e86", "#40474f", "#d4ceba"][kind];
    const r = o.radius,
      h = o.height;
    add(box, fur, 0, h * 0.6, 0, r * 0.9, h * 0.55, r * 1.4);
    add(box, fur, 0, h * 0.9, r * 0.65, r * 0.65, h * 0.5, r * 0.55);
    for (const side of [-1, 1]) {
      add(
        cone,
        fur,
        side * r * 0.22,
        h * 1.22,
        r * 0.65,
        r * 0.13,
        h * 0.3,
        r * 0.13,
      );
      add(
        sphere,
        "#17202c",
        side * r * 0.17,
        h,
        r * 0.95,
        r * 0.045,
        r * 0.045,
        r * 0.045,
      );
      for (const front of [-1, 1]) {
        const pivot = new Group();
        pivot.position.set(side * r * 0.3, h * 0.45, front * r * 0.45);
        const leg = new Mesh(box, material(fur));
        leg.position.y = -h * 0.18;
        leg.scale.set(r * 0.15, h * 0.36, r * 0.15);
        pivot.add(leg);
        pivot.userData.walkSide = side * front;
        g.add(pivot);
      }
    }
    add(box, fur, 0, h * 0.65, -r * 0.9, r * 0.13, r * 0.13, r * 0.6);
    return g;
  }
  if (o.type === "table") {
    add(cylinder, kind % 2 ? "#a27b52" : "#d3c4a8", 0, 0.72, 0, 0.6, 0.08, 0.6);
    add(cylinder, "#485860", 0, 0.35, 0, 0.075, 0.7, 0.075);
    add(cylinder, "#485860", 0, 0.04, 0, 0.3, 0.08, 0.3);
    return g;
  }
  if (o.type === "patio") {
    for (const side of [-1, 1])
      add(box, "#5a635f", side * 1.05, 1.15, 0, 0.07, 2.3, 0.07);
    add(box, kind % 2 ? "#c5b696" : "#b56549", 0, 2.3, 0, 2.6, 0.14, 1.9);
    for (let stripe = -2; stripe <= 2; stripe++)
      add(box, "#e1d6bc", stripe * 0.45, 2.38, 0, 0.2, 0.025, 1.9);
    return g;
  }
  if (o.type === "barrier") {
    for (const side of [-1, 1])
      add(box, "#727b80", side * 0.6, 0.24, 0, 0.15, 0.48, 0.25);
    add(box, kind === 1 ? "#afa997" : "#d5a349", 0, 0.48, 0, 1.5, 0.25, 0.25);
    for (let stripe = -2; stripe <= 2; stripe++)
      add(box, "#374752", stripe * 0.3, 0.48, 0.13, 0.12, 0.23, 0.012);
    return g;
  }
  if (kind >= 4) {
    if (o.type === "litter") {
      if (kind === 4) {
        add(cone, "#f4e6bf", 0, 0.08, 0, 0.085, 0.16, 0.085);
        add(cylinder, "#b88855", 0, 0.17, 0, 0.09, 0.025, 0.09);
      } else if (kind === 5) {
        add(box, "#ece1c6", 0, 0.02, 0, 0.24, 0.035, 0.2);
        for (const z of [-0.05, 0, 0.05])
          add(box, "#4f6072", 0, 0.04, z, 0.17, 0.007, 0.01);
      } else if (kind === 6) {
        const m = add(box, color, 0, 0.025, 0, 0.2, 0.04, 0.15);
        m.rotation.z = 0.15;
        add(box, "#ebe0c4", 0, 0.05, 0, 0.09, 0.01, 0.11);
      } else {
        add(box, "#dcbb86", 0, 0.06, 0, 0.22, 0.12, 0.2);
        add(box, "#f0dfb9", 0, 0.125, 0, 0.24, 0.025, 0.22);
      }
    } else if (o.type === "hydrant") {
      if (kind === 4) {
        add(cylinder, "#58687e", 0, 0.2, 0, 0.045, 0.4, 0.045);
        add(box, "#58687e", 0, 0.5, 0, 0.23, 0.25, 0.15);
        panel("#a3d6db", 0, 0.53, 0.085, 0.12, 0.07, 0, "meter-display");
      } else if (kind === 5) {
        add(box, "#758a8d", 0, 0.3, 0, 0.36, 0.6, 0.32);
        add(box, "#364b56", 0, 0.3, 0.17, 0.17, 0.035, 0.02);
      } else if (kind === 6) {
        add(cylinder, "#be7351", 0, 0.12, 0, 0.18, 0.24, 0.18);
        add(sphere, "#3b9954", 0, 0.35, 0, 0.19, 0.2, 0.19);
        add(sphere, "#ef8fa9", 0.08, 0.48, 0, 0.07, 0.07, 0.07);
      } else {
        add(box, "#ab8357", 0, 0.16, 0, 0.34, 0.32, 0.34);
        for (const x of [-0.12, 0.12])
          add(box, "#e0b579", x, 0.17, 0.18, 0.045, 0.3, 0.025);
      }
    } else if (o.type === "sign") {
      if (kind === 7) {
        add(box, "#efad41", 0, 0.65, 0, 0.75, 0.23, 0.14);
        for (const x of [-0.28, 0.28]) {
          add(box, "#38465c", x, 0.32, 0, 0.07, 0.64, 0.12);
          add(box, "#38465c", x, 0.04, 0, 0.18, 0.08, 0.35);
        }
      } else {
        add(cylinder, "#d6deeb", 0, 0.6, 0, 0.04, 1.2, 0.04);
        add(
          box,
          kind === 4 ? "#2b84aa" : kind === 5 ? "#e2b546" : color,
          0,
          1.32,
          0,
          kind === 6 ? 0.7 : 0.45,
          kind === 6 ? 0.6 : 0.45,
          0.08,
        );
        panel("#fff1c8", 0, 1.32, 0.045, 0.24, 0.1, 0, "sign-mark");
      }
    } else if (o.type === "bench") {
      if (kind === 8) {
        add(box, "#42816b", 0, 0.4, 0, 1.05, 0.62, 0.72);
        const lid = add(box, "#263f44", 0, 0.74, 0, 1.12, 0.09, 0.79);
        lid.name = "dumpster-lid";
        lid.rotation.x = -0.08;
        for (const x of [-0.4, 0.4])
          for (const z of [-0.25, 0.25])
            add(cylinder, "#24313e", x, 0.08, z, 0.07, 0.13, 0.07);
        add(box, "#bdc8b2", 0, 0.44, 0.37, 0.31, 0.19, 0.025);
      } else if (kind === 4 || kind === 5) {
        for (const z of [-0.42, 0.42]) {
          const wheel = add(cylinder, "#253347", 0, 0.16, z, 0.15, 0.09, 0.15);
          wheel.rotation.z = Math.PI / 2;
        }
        add(box, color, 0, 0.3, 0, 0.08, 0.06, 0.85);
        add(box, "#4a5d6d", 0, 0.52, 0.38, 0.05, 0.48, 0.05);
        add(box, "#4a5d6d", 0, 0.75, 0.38, 0.35, 0.05, 0.06);
        if (kind === 4) {
          const frame = add(box, color, 0, 0.39, 0, 0.07, 0.07, 0.5);
          frame.rotation.x = 0.6;
          add(box, "#263950", 0, 0.6, -0.15, 0.2, 0.07, 0.2);
        }
      } else {
        add(box, kind === 6 ? color : "#7993ac", 0, 0.4, 0, 0.65, 0.8, 0.45);
        if (kind === 6) {
          panel("#213b50", -0.08, 0.48, 0.24, 0.36, 0.45, 0, "display");
          for (const y of [0.33, 0.48, 0.63])
            add(box, "#e4cb6d", -0.08, y, 0.27, 0.2, 0.06, 0.02);
          add(box, "#fff0c9", 0.22, 0.47, 0.25, 0.06, 0.2, 0.025);
        } else
          for (const x of [-0.16, 0.16])
            for (const y of [0.2, 0.45, 0.68]) {
              panel("#475e74", x, y, 0.24, 0.27, 0.19, 0, "locker-door");
              add(box, "#d9d7b5", x + 0.07, y, 0.26, 0.035, 0.035, 0.02);
            }
      }
    }
    return g;
  }
  if (kind === 3) {
    const extras: Record<string, () => void> = {
      litter: () => {
        add(box, "#eac88c", 0, 0.08, 0, 0.2, 0.16, 0.16);
        add(box, "#2776ac", 0, 0.16, 0, 0.15, 0.025, 0.12);
      },
      hydrant: () => {
        add(cylinder, "#606d7e", 0, 0.3, 0, 0.11, 0.6, 0.11);
        add(cylinder, "#e6ba3f", 0, 0.42, 0, 0.115, 0.1, 0.115);
      },
      sign: () => {
        add(cylinder, "#43536a", 0, 0.7, 0, 0.05, 1.4, 0.05);
        add(box, "#43536a", 0.15, 1.4, 0, 0.4, 0.05, 0.07);
        add(box, "#ffe2a1", 0.3, 1.38, 0, 0.17, 0.13, 0.17);
      },
      bench: () => {
        for (const x of [-0.38, 0, 0.38]) {
          const hoop = add(cylinder, "#aebdca", x, 0.35, 0, 0.06, 0.7, 0.06);
          hoop.rotation.z = 0.2;
          add(box, "#aebdca", x, 0.69, 0, 0.25, 0.06, 0.08);
        }
      },
      tree: () => {
        add(box, "#b08056", 0, 0.18, 0, 1.1, 0.36, 1.1);
        add(sphere, "#33844b", 0, 0.75, 0, 0.65, 0.75, 0.65);
        for (const x of [-0.35, 0.25])
          add(sphere, "#d9599a", x, 1.25, 0.15, 0.19, 0.19, 0.19);
      },
    };
    if (extras[o.type]) {
      extras[o.type]();
      return g;
    }
  }
  switch (o.type) {
    case "litter":
      if (kind === 0) {
        add(cylinder, "#b6c4ce", 0, 0.08, 0, 0.085, 0.16, 0.085);
        add(cylinder, color, 0, 0.08, 0, 0.09, 0.09, 0.09);
      } else if (kind === 1) {
        add(cylinder, "#53bfa5", 0, 0.065, 0, 0.065, 0.13, 0.065);
        add(cylinder, "#2c8c7a", 0, 0.15, 0, 0.035, 0.04, 0.035);
      } else {
        add(box, "#dbb079", 0, 0.075, 0, 0.18, 0.15, 0.15);
        add(box, "#a97c46", 0, 0.165, 0, 0.07, 0.035, 0.025);
      }
      break;
    case "hydrant":
      if (kind === 0) {
        add(cylinder, "#ff3e3e", 0, 0.24, 0, 0.13, 0.48, 0.13);
        add(sphere, "#ffb52b", 0, 0.51, 0, 0.15, 0.12, 0.15);
        add(box, "#ff3e3e", 0, 0.3, 0, 0.4, 0.1, 0.12);
      } else if (kind === 1) {
        add(box, "#29384b", 0, 0.04, 0, 0.32, 0.08, 0.32);
        add(cone, "#ee7c35", 0, 0.3, 0, 0.16, 0.5, 0.16);
        add(cylinder, "#f4e8c5", 0, 0.3, 0, 0.1, 0.08, 0.1);
      } else {
        add(cylinder, "#4b5b73", 0, 0.2, 0, 0.045, 0.4, 0.045);
        add(box, "#2672ae", 0, 0.48, 0, 0.3, 0.28, 0.3);
        panel("#17394c", 0, 0.49, 0.16, 0.19, 0.035, 0, "mail-slot");
      }
      break;
    case "person":
      add(box, color, 0, 0.66, 0, 0.35, 0.48, 0.22);
      add(
        sphere,
        ["#ffcf9d", "#b87551", "#e9ad77"][o.variant % 3],
        0,
        1.04,
        0,
        0.16,
        0.18,
        0.16,
      );
      const limb = (
        x: number,
        y: number,
        length: number,
        width: number,
        depth: number,
        color: string,
        side: number,
        name: string,
      ) => {
        const pivot = new Group();
        pivot.position.set(x, y, 0);
        pivot.name = name;
        pivot.userData.walkSide = side;
        const mesh = new Mesh(box, material(color));
        mesh.position.y = -length / 2;
        mesh.scale.set(width, length, depth);
        pivot.add(mesh);
        g.add(pivot);
      };
      for (const x of [-0.1, 0.1])
        limb(x, 0.44, 0.44, 0.12, 0.14, "#244681", x < 0 ? -1 : 1, "hip");
      for (const x of [-0.225, 0.225])
        limb(x, 0.86, 0.43, 0.11, 0.12, color, x < 0 ? 1 : -1, "shoulder");
      if (kind === 3) {
        add(box, "#e7b83e", 0, 0.68, -0.19, 0.3, 0.4, 0.2);
        add(box, "#d5eaff", 0, 1.23, 0, 0.28, 0.08, 0.28);
      } else if (kind === 0) add(cylinder, color, 0, 1.23, 0, 0.17, 0.06, 0.17);
      else if (kind === 1) add(box, "#4b3e69", 0, 0.69, -0.17, 0.26, 0.3, 0.14);
      else add(box, "#d6b16a", 0.23, 0.33, 0.05, 0.13, 0.24, 0.13);
      break;
    case "sign":
      if (o.signalAxis) {
        add(cylinder, "#263650", 0, 0.7, 0, 0.05, 1.4, 0.05);
        add(box, "#192739", 0, 1.4, 0, 0.23, 0.5, 0.15);
        for (const [name, y, color] of [
          ["red", 1.55, "#ff3c49"],
          ["yellow", 1.4, "#ffbe31"],
          ["green", 1.25, "#2be477"],
        ] as const) {
          const bulb = add(sphere, color, 0, y, 0.1, 0.07, 0.07, 0.04);
          bulb.name = `signal-${name}`;
        }
      } else {
        add(cylinder, "#e4edf5", 0, 0.7, 0, 0.045, 1.4, 0.045);
        add(
          box,
          kind === 0 ? "#cf4249" : kind === 1 ? "#2876a1" : "#287b65",
          0,
          1.4,
          0,
          0.7,
          0.45,
          0.07,
        );
        add(
          box,
          "#fff4d8",
          0,
          1.4,
          0.04,
          kind === 1 ? 0.1 : 0.45,
          kind === 1 ? 0.28 : 0.075,
          0.025,
        );
      }
      break;
    case "bench":
      if (kind === 0) {
        add(box, "#bc8c3c", 0, 0.45, 0, 0.9, 0.12, 0.38);
        add(box, "#bc8c3c", 0, 0.63, -0.17, 0.9, 0.22, 0.08);
        for (const x of [-0.3, 0.3])
          add(box, "#394b6d", x, 0.22, 0, 0.1, 0.44, 0.3);
      } else if (kind === 1) {
        add(cylinder, "#397b6c", 0, 0.31, 0, 0.36, 0.62, 0.36);
        add(cylinder, "#20394b", 0, 0.66, 0, 0.38, 0.08, 0.38);
        panel("#c9d6d2", 0, 0.5, 0.37, 0.17, 0.17, 0, "bin-label");
      } else {
        add(box, "#a0794b", 0, 0.61, 0, 0.86, 0.1, 0.52);
        for (const x of [-0.3, 0.3])
          add(box, "#5a4836", x, 0.3, 0, 0.1, 0.6, 0.36);
        for (const z of [-0.38, 0.38])
          add(box, "#b88c55", 0, 0.32, z, 0.82, 0.1, 0.12);
      }
      break;
    case "tree":
      add(
        cylinder,
        "#825832",
        0,
        kind === 2 ? 1.15 : 0.7,
        0,
        0.13,
        kind === 2 ? 2.3 : 1.4,
        0.13,
      );
      if (kind === 0) {
        add(cone, "#258b4e", 0, 1.85, 0, 0.69, 1.9, 0.69);
      } else if (kind === 1) {
        add(sphere, "#559f39", 0, 1.9, 0, 0.68, 0.9, 0.68);
        add(sphere, "#35874c", 0.18, 1.5, 0, 0.46, 0.6, 0.46);
      } else {
        for (let leaf = 0; leaf < 5; leaf++) {
          const angle = (leaf * Math.PI * 2) / 5,
            m = add(
              box,
              "#329d59",
              Math.sin(angle) * 0.28,
              2.5,
              Math.cos(angle) * 0.28,
              0.24,
              0.1,
              0.75,
            );
          m.rotation.y = angle;
          m.rotation.x = 0.2;
        }
        add(sphere, "#507d36", 0, 2.47, 0, 0.17, 0.16, 0.17);
      }
      break;
    case "car":
    case "van": {
      const van = o.type === "van",
        length = van ? 2.05 : 1.6,
        width = van ? 1.05 : 0.83;
      add(box, color, 0, 0.3, 0, width, 0.4, length);
      const pickup = van && kind === 2,
        cabinZ = pickup ? 0.3 : -0.12,
        cabinLength = length * (kind === 1 ? 0.64 : pickup ? 0.34 : 0.52),
        cabinY = van ? (pickup ? 0.72 : 0.79) : 0.61,
        cabinHeight = van ? (pickup ? 0.6 : 0.85) : 0.32;
      add(
        box,
        van ? color : "#ddf4ff",
        0,
        cabinY,
        cabinZ,
        width * 0.84,
        cabinHeight,
        cabinLength,
      );
      const windowY = van ? (pickup ? 0.8 : 1) : 0.65,
        windowHeight = van ? (pickup ? 0.23 : 0.32) : 0.22;
      panel(
        "#153d63",
        0,
        windowY,
        cabinZ + cabinLength / 2 + 0.018,
        width * 0.7,
        windowHeight,
        0,
        "window-front",
      );
      panel(
        "#153d63",
        0,
        windowY,
        cabinZ - cabinLength / 2 - 0.018,
        width * 0.7,
        windowHeight,
        Math.PI,
        "window-back",
      );
      for (const side of [-1, 1]) {
        panel(
          "#205b80",
          side * (width * 0.42 + 0.018),
          windowY,
          cabinZ,
          cabinLength * 0.84,
          windowHeight,
          (side * Math.PI) / 2,
          `window-side-${side}`,
        );
        add(
          box,
          color,
          side * (width * 0.42 + 0.024),
          windowY,
          cabinZ,
          0.035,
          windowHeight + 0.025,
          0.055,
        );
      }
      add(
        box,
        "#c9d6e3",
        0,
        0.14,
        length / 2 + 0.015,
        width * 0.83,
        0.07,
        0.05,
      );
      add(
        box,
        "#d73c42",
        0,
        0.3,
        -length / 2 - 0.012,
        width * 0.65,
        0.1,
        0.025,
      );
      for (const x of [-width / 2, width / 2])
        for (const z of [-length * 0.32, length * 0.32])
          add(box, "#192845", x, 0.16, z, 0.14, 0.28, 0.28);
      add(box, "#fff5a1", 0, 0.28, length / 2 + 0.01, width * 0.7, 0.12, 0.025);
      if (!van && kind === 2) {
        add(box, "#ffe08a", 0, 0.87, -0.1, 0.28, 0.12, 0.15);
        panel("#292b42", 0, 0.88, -0.018, 0.18, 0.06, 0, "taxi-sign");
      }
      if (van && kind === 0)
        panel(
          "#f1e7cc",
          width * 0.42 + 0.026,
          0.72,
          -0.1,
          length * 0.3,
          0.25,
          Math.PI / 2,
          "delivery-logo",
        );
      if (van && kind === 1) {
        for (const side of [-1, 1])
          for (const z of [-0.48, 0.34])
            panel(
              "#1a3b56",
              side * (width * 0.42 + 0.024),
              1,
              z,
              0.36,
              0.27,
              (side * Math.PI) / 2,
              "bus-window",
            );
      }
      if (van && kind === 2) {
        add(box, "#495976", 0, 0.54, -0.55, width * 0.75, 0.08, 0.9);
        add(box, "#a98053", 0, 0.7, -0.64, 0.25, 0.28, 0.28);
      }
      if (kind === 3) {
        add(box, "#e7e9ef", 0, van ? 1.2 : 0.95, 0, 0.55, 0.08, 0.22);
        add(box, "#ee3e4e", -0.16, van ? 1.27 : 1.02, 0, 0.18, 0.1, 0.18);
        add(box, "#397ee3", 0.16, van ? 1.27 : 1.02, 0, 0.18, 0.1, 0.18);
        if (van) {
          add(box, "#e24354", width / 2 + 0.02, 0.5, 0, 0.03, 0.15, 0.5);
          add(box, "#e24354", width / 2 + 0.03, 0.5, 0, 0.03, 0.4, 0.15);
        }
      }
      break;
    }
    default: {
      const width = Math.min(3.2, o.radius * Math.SQRT2 * 0.94),
        height = o.height;
      if (kind === 3) {
        add(
          box,
          "#efe2bd",
          0,
          height * 0.6,
          Math.min(3.2, o.radius * Math.SQRT2 * 0.94) / 2 + 0.07,
          Math.min(3.2, o.radius * Math.SQRT2 * 0.94) * 0.8,
          0.3,
          0.12,
        );
        if (o.type === "skyscraper") {
          add(cylinder, "#4f6e8b", 0, height + 0.7, 0, 1.35, 1.4, 1.35);
          add(cone, "#9ec6d6", 0, height + 1.65, 0, 1.45, 0.6, 1.45);
        } else {
          add(box, "#ad404e", 0, height + 0.25, 0, 0.12, 0.5, 0.04);
          add(box, "#ad404e", 0, height + 0.25, 0, 0.5, 0.12, 0.04);
        }
      }
      const facade = color, tower = o.type === "skyscraper";
      add(box, "#87909f", 0, 0.1, 0, width, 0.2, width);
      const stepped =
          kind === 1 &&
          ["building", "largeBuilding", "skyscraper"].includes(o.type),
        bodyHeight = stepped ? height * 0.65 : height,
        upperWidth = width * 0.72;
      add(box, facade, 0, bodyHeight / 2, 0, width, bodyHeight, width);
      if (stepped)
        add(
          box,
          facade,
          0,
          bodyHeight + (height - bodyHeight) / 2,
          0,
          upperWidth,
          height - bodyHeight,
          upperWidth,
        );
      const roof = add(
        box,
        "#cad2df",
        0,
        height + 0.045,
        0,
        stepped ? upperWidth : width,
        0.09,
        stepped ? upperWidth : width,
      );
      roof.name = "roof";
      if (o.type === "house" && kind !== 1) {
        g.remove(roof);
      }
      const rows =
          o.type === "house"
            ? 2
            : Math.min(8, Math.max(2, Math.floor(height / 0.95))),
        cols = tower ? 3 : 2;
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < cols; col++) {
          const y = 0.6 + (row * (height - 0.9)) / rows,
            faceWidth = stepped && y > bodyHeight ? upperWidth : width,
            offset = ((col - (cols - 1) / 2) * faceWidth) / (cols + 1),
            w = faceWidth / (cols + 2),
            h = Math.min(0.5, ((height - 0.8) / rows) * 0.55);
          const glass =
            (row + col + o.variant) % 4 === 0 ? "#f1bf68" : "#142b46";
          panel(glass, offset, y, faceWidth / 2 + 0.012, w, h, 0);
          panel(glass, offset, y, -faceWidth / 2 - 0.012, w, h, Math.PI);
          panel(glass, faceWidth / 2 + 0.012, y, offset, w, h, Math.PI / 2);
          panel(glass, -faceWidth / 2 - 0.012, y, offset, w, h, -Math.PI / 2);
        }
      panel(
        "#20334e",
        0,
        0.38,
        width / 2 + 0.025,
        width * 0.19,
        0.76,
        0,
        "door",
      );
      panel(
        "#6598b4",
        0,
        0.43,
        width / 2 + 0.03,
        width * 0.13,
        0.52,
        0,
        "door-glass",
      );
      if (o.type === "house" && kind !== 1) {
        const roof = add(
          roofGeometry,
          ["#9a3942", "#454e75", "#ae623d"][o.variant % 3],
          0,
          height,
          0,
          width,
          0.7,
          width,
        );
        roof.name = "roof";
        if (kind === 2) {
          roof.scale.x = width * 0.5;
          roof.position.x = -width * 0.25;
          const other = add(
            roofGeometry,
            "#765347",
            width * 0.25,
            height,
            0,
            width * 0.5,
            0.7,
            width,
          );
          other.name = "duplex-roof";
        }
        add(
          box,
          "#a47660",
          width * 0.24,
          height + 0.58,
          -width * 0.16,
          0.23,
          0.8,
          0.25,
        );
      } else {
        const vents = kind + 1;
        for (let i = 0; i < vents; i++) {
          add(
            box,
            "#596778",
            (i - 0.5) * width * 0.3,
            height + 0.3,
            -width * 0.16,
            width * 0.18,
            0.35,
            width * 0.2,
          );
          add(
            box,
            "#a3b0bd",
            (i - 0.5) * width * 0.3,
            height + 0.505,
            -width * 0.16,
            width * 0.2,
            0.05,
            width * 0.22,
          );
        }
        if (tower && kind === 2) {
          add(
            cone,
            "#527291",
            0,
            height + 0.7,
            0,
            width * 0.3,
            1.4,
            width * 0.3,
          );
        } else if (tower) {
          add(
            box,
            facade,
            0,
            height + 0.65,
            0,
            width * 0.62,
            1.3,
            width * 0.62,
          );
          add(cylinder, "#aab9cf", 0, height + 1.7, 0, 0.04, 1, 0.04);
        } else if (o.type === "shop" || o.type === "kiosk") {
          add(
            box,
            color,
            0,
            1.05,
            width / 2 + 0.1,
            width * (kind === 2 ? 0.65 : 0.95),
            0.12,
            kind === 1 ? 0.45 : 0.3,
          );
          if (kind === 1)
            for (const x of [-width * 0.25, 0, width * 0.25])
              panel(
                "#f5dfb8",
                x,
                1.06,
                width / 2 + 0.27,
                0.12,
                0.12,
                0,
                "awning-stripe",
              );
          panel(
            "#f0dca6",
            0,
            1.42,
            width / 2 + 0.02,
            width * 0.65,
            0.25,
            0,
            "shop-sign",
          );
        } else {
          for (const side of [-1, 1]) {
            const trim = add(
              box,
              "#ded6c3",
              side * width * 0.44,
              bodyHeight / 2,
              width / 2 + 0.035,
              0.09,
              bodyHeight,
              0.07,
            );
            trim.name = "facade-trim";
            trim.renderOrder = 1;
          }
        }
      }
      break;
    }
  }

  return g;
}
