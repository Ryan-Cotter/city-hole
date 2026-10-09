import {
  BoxGeometry,
  CylinderGeometry,
  ConeGeometry,
  SphereGeometry,
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
  sphere = new SphereGeometry(1, 8, 6);
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
  const color = bright[o.variant % bright.length];
  const kind = o.variant % 4;
  g.name = o.design;
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
      const facade = [
          "#da8751",
          "#2994ba",
          "#9677c7",
          "#d4ad55",
          "#d65b86",
          "#47ab91",
        ][o.variant % 6],
        tower = o.type === "skyscraper";
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
