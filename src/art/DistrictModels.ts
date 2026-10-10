import {
  Vector3,
  BufferGeometry,
  BoxGeometry,
  CylinderGeometry,
  ConeGeometry,
  IcosahedronGeometry,
  Group,
  Mesh,
} from "three";
import { material } from "../render/Materials";
import { districtProfiles } from "../world/Districts";
import type { SwallowableObject } from "../game/GameState";
const box = new BoxGeometry(1, 1, 1),
  cylinder = new CylinderGeometry(1, 1, 1, 8),
  cone = new ConeGeometry(1, 1, 8),
  sphere = new IcosahedronGeometry(1, 0);
export function districtModel(o: SwallowableObject): Group | null {
  if (!o.district || o.critter || o.motion || o.pickup || o.collisionOnly)
    return null;
  const aggregate = o.type === "cityBlock";
  const building = [
    "house",
    "shop",
    "building",
    "largeBuilding",
    "skyscraper",
    "kiosk",
  ].includes(o.type);
  if (!aggregate && !building && !o.districtProp) return null;
  const profile = districtProfiles[o.district],
    g = new Group();
  g.name = building ? profile.name : o.districtProp!;
  g.userData.object = o;
  g.position.copy(o.position);
  g.rotation.y = o.orientation;
  const add = (
    shape: BufferGeometry,
    color: string,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
  ) => {
    const m = new Mesh(
      shape,
      material(
        color,
        true,
        true,
        building && shape === box && sy > 1 ? "masonry" : "grain",
      ),
    );
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    g.add(m);
    return m;
  };
  const era = (o.cityIndex ?? 0) % 4,
    r = o.radius,
    h = o.height;
  if (aggregate) {
    add(
      box,
      o.district === "park" ? "#63864f" : "#9c9c8e",
      0,
      0.08,
      0,
      r * 1.75,
      0.16,
      r * 1.75,
    );
    for (const side of [-1, 1])
      add(box, "#c7bca2", side * r * 0.82, 0.18, 0, r * 0.08, 0.05, r * 1.7);
    for (let i = 0; i < 9; i++) {
      const child = districtModel({
        ...o,
        members: undefined,
        type: "building",
        radius: r * 0.16,
        height: Math.max(1, h * (0.65 + i * 0.08)),
        position: new Vector3(
          ((i % 2) - 0.5) * r * 0.85,
          0.18,
          (Math.floor(i / 3) - 1) * r * 0.55,
        ),
        orientation: (i % 2) * Math.PI,
        districtProp: undefined,
      });
      if (child) {
        child.userData.object = o;
        g.add(child);
      }
    }
    return g;
  }
  if (building) {
    const w = Math.min(3.2, r * 1.32),
      wall = h * 0.82;
    add(box, profile.facade, 0, wall / 2, 0, w, wall, w * 0.8);
    add(
      box,
      profile.accent,
      0,
      wall * 0.08,
      w * 0.415,
      w * 1.02,
      wall * 0.12,
      0.06,
    );
    for (const side of [-1, 1])
      for (
        let row = 0;
        row < Math.min(6, Math.max(2, Math.floor(h / 1.1)));
        row++
      ) {
        const y = wall * (0.3 + row * 0.1);
        for (const x of [-0.28, 0.28])
          add(
            box,
            era === 0 ? "#514b3e" : "#344f5b",
            x * w,
            y,
            side * w * 0.405,
            w * 0.17,
            Math.min(0.45, h * 0.11),
            0.025,
          ).name = "window";
      }
    add(
      box,
      "#4e4439",
      0,
      wall * 0.16,
      w * 0.42,
      w * 0.2,
      wall * 0.3,
      0.04,
    ).name = "door";
    if (o.district === "downtown") {
      for (const x of [-0.38, -0.15, 0.15, 0.38])
        add(
          cylinder,
          "#e2d2ad",
          w * x,
          wall * 0.38,
          w * 0.44,
          w * 0.055,
          wall * 0.65,
          w * 0.055,
        );
      add(
        box,
        profile.accent,
        0,
        wall * 0.78,
        w * 0.44,
        w * 1.02,
        h * 0.1,
        w * 0.12,
      );
      const coin = add(
        cylinder,
        "#e0be5b",
        0,
        wall * 0.87,
        w * 0.43,
        w * 0.12,
        0.04,
        w * 0.12,
      );
      coin.rotation.x = Math.PI / 2;
    } else if (o.district === "commercial") {
      for (let i = 0; i < 7; i++)
        add(
          box,
          i % 2 ? "#eadabb" : profile.accent,
          ((i - 3) * w) / 7,
          wall * 0.48,
          w * 0.48,
          w / 7,
          0.09,
          w * 0.3,
        );
      add(
        cylinder,
        "#9e654b",
        w * 0.3,
        h * 0.88,
        -w * 0.2,
        w * 0.085,
        h * 0.22,
        w * 0.085,
      );
    } else if (o.district === "industrial") {
      for (const x of [-0.28, 0.28]) {
        add(
          cylinder,
          era === 0 ? "#8a614a" : "#656e70",
          x * w,
          h * 0.76,
          0,
          w * 0.11,
          h * 0.48,
          w * 0.11,
        );
        add(
          cylinder,
          profile.accent,
          x * w,
          h * 0.99,
          0,
          w * 0.14,
          h * 0.02,
          w * 0.14,
        );
      }
      add(box, "#535f60", 0, wall * 0.2, w * 0.416, w * 0.6, wall * 0.34, 0.03);
    } else if (o.district === "residential") {
      for (let row = 0; row < 3; row++)
        for (const side of [-1, 1]) {
          add(
            box,
            profile.accent,
            side * w * 0.27,
            wall * (0.36 + row * 0.18),
            w * 0.44,
            w * 0.35,
            0.06,
            w * 0.18,
          );
          add(
            box,
            "#4e625b",
            side * w * 0.27,
            wall * (0.36 + row * 0.18) + h * 0.045,
            w * 0.51,
            w * 0.34,
            h * 0.065,
            0.03,
          );
        }
    } else {
      add(cone, "#5f824b", 0, h * 0.8, 0, w * 0.68, h * 0.4, w * 0.68);
      for (const side of [-1, 1])
        add(
          cylinder,
          "#776343",
          side * w * 0.38,
          h * 0.38,
          w * 0.38,
          w * 0.035,
          h * 0.7,
          w * 0.035,
        );
    }
    if (o.district !== "park" && o.district !== "industrial") {
      if (era === 0) {
        const roof = add(
          cone,
          "#795648",
          0,
          h * 0.87,
          0,
          w * 0.7,
          h * 0.26,
          w * 0.7,
        );
        roof.rotation.y = Math.PI / 4;
      } else add(box, "#656a67", 0, h * 0.88, 0, w * 1.05, h * 0.12, w * 0.88);
    }
    // Era-specific roof hardware preserves the district silhouette across the campaign.
    if (era === 0)
      add(cone, "#795b43", 0, h * 0.98, 0, w * 0.18, h * 0.12, w * 0.18).name =
        "roof";
    if (era === 1)
      add(
        cylinder,
        "#676a61",
        w * 0.22,
        h * 0.98,
        0,
        w * 0.09,
        h * 0.14,
        w * 0.09,
      ).name = "roof";
    if (era === 2)
      add(box, "#405e6b", 0, h * 0.96, 0, w * 0.55, h * 0.04, w * 0.3).name =
        "roof";
    if (era === 3)
      add(cone, "#91d0ce", 0, h * 1.02, 0, w * 0.13, h * 0.25, w * 0.13).name =
        "roof";
    return g;
  }
  const height = Math.min(Math.max(h, r * 0.4), r * 1.3),
    width = r * 1.3;
  // Distinct silhouettes for each prop scale, not just resized copies.
  if (o.district === "downtown" && r > 0.1 && r <= 0.25) {
    for (let i = 0; i < 3; i++)
      add(
        box,
        i % 2 ? "#e0d4b6" : "#84634d",
        (i - 1) * r * 0.1,
        height * (0.15 + i * 0.24),
        0,
        width,
        height * 0.2,
        width * 0.6,
      );
    return g;
  }
  if (o.district === "industrial" && r > 0.1 && r <= 0.25) {
    add(box, "#68777d", 0, height * 0.4, 0, width, height * 0.7, width * 0.6);
    add(
      box,
      "#dab36c",
      0,
      height * 0.8,
      0,
      width * 0.45,
      height * 0.15,
      r * 0.12,
    );
    return g;
  }
  if (o.district === "residential" && r > 0.25 && r <= 0.65) {
    add(box, "#66848d", 0, height * 0.45, 0, width, height * 0.8, width * 0.55);
    add(
      box,
      "#293e47",
      0,
      height * 0.65,
      width * 0.285,
      width * 0.55,
      height * 0.08,
      0.015,
    );
    return g;
  }
  if (o.district === "park" && r <= 0.1) {
    for (let i = 0; i < 3; i++) {
      add(
        sphere,
        "#b89861",
        (i - 1) * r * 0.48,
        height * 0.2,
        0,
        r * 0.24,
        height * 0.23,
        r * 0.3,
      );
      add(
        sphere,
        "#71613c",
        (i - 1) * r * 0.48,
        height * 0.36,
        0,
        r * 0.26,
        height * 0.09,
        r * 0.25,
      );
    }
    return g;
  }
  if (o.district === "commercial" && r <= 0.04) {
    for (let i = 0; i < 4; i++)
      add(
        sphere,
        "#d9b478",
        Math.sin(i * 2) * r * 0.5,
        height * 0.2,
        Math.cos(i * 2) * r * 0.5,
        r * 0.24,
        height * 0.22,
        r * 0.22,
      );
    return g;
  }
  if (o.district === "commercial" && r > 0.1 && r <= 0.65) {
    add(box, "#ad8351", 0, height * 0.3, 0, width, height * 0.6, width * 0.75);
    for (let i = 0; i < 3; i++)
      add(
        sphere,
        ["#cb7748", "#e0b36b", "#81984b"][i],
        (i - 1) * r * 0.4,
        height * 0.72,
        0,
        r * 0.25,
        height * 0.2,
        r * 0.3,
      );
    return g;
  }
  if (o.district === "downtown") {
    if (r <= 0.1) {
      for (let i = 0; i < 3; i++)
        add(
          cylinder,
          "#d5b453",
          (i - 1) * r * 0.5,
          height * 0.18,
          0,
          r * 0.28,
          height * 0.2,
          r * 0.28,
        );
    } else {
      add(
        box,
        "#79604a",
        0,
        height * 0.45,
        0,
        width,
        height * 0.9,
        width * 0.7,
      );
      for (const x of [-0.4, 0.4])
        add(
          box,
          profile.accent,
          x * width,
          height * 0.5,
          0,
          width * 0.09,
          height * 0.95,
          width * 0.72,
        );
      add(
        box,
        "#dfba62",
        0,
        height * 0.5,
        width * 0.36,
        r * 0.2,
        r * 0.2,
        0.025,
      );
    }
  } else if (o.district === "commercial") {
    const table = r > 0.65;
    if (table)
      for (const x of [-0.5, 0.5])
        for (const z of [-0.4, 0.4])
          add(
            box,
            "#80634b",
            x * width,
            height * 0.35,
            z * width,
            r * 0.1,
            height * 0.7,
            r * 0.1,
          );
    add(
      cylinder,
      "#e9d7b8",
      0,
      height * (table ? 0.75 : 0.18),
      0,
      r * 0.82,
      height * 0.12,
      r * 0.7,
    );
    for (let i = 0; i < 3; i++)
      add(
        sphere,
        ["#d49a53", "#a65740", "#699151"][i],
        (i - 1) * r * 0.42,
        height * (table ? 0.85 : 0.45),
        0,
        r * 0.24,
        height * 0.25,
        r * 0.25,
      );
  } else if (o.district === "industrial") {
    if (r <= 0.1) {
      for (const x of [-0.4, 0.4]) {
        add(
          cylinder,
          "#88989d",
          x * r,
          height * 0.25,
          0,
          r * 0.25,
          height * 0.45,
          r * 0.25,
        );
        add(
          box,
          "#c9ac70",
          x * r,
          height * 0.5,
          0,
          r * 0.17,
          height * 0.15,
          r * 0.17,
        );
      }
    } else {
      if (r > 0.65)
        for (const y of [0.12, 0.88])
          add(
            cylinder,
            "#b99a6b",
            0,
            height * y,
            0,
            r * 0.85,
            height * 0.14,
            r * 0.85,
          );
      add(
        cylinder,
        "#787563",
        0,
        height * 0.48,
        0,
        r * 0.65,
        height * 0.92,
        r * 0.65,
      );
      for (const y of [0.15, 0.8])
        add(
          cylinder,
          profile.accent,
          0,
          height * y,
          0,
          r * 0.69,
          height * 0.08,
          r * 0.69,
        );
    }
  } else if (o.district === "residential") {
    if (r > 0.65) {
      add(
        box,
        profile.accent,
        0,
        height * 0.55,
        0,
        width,
        height * 0.15,
        width * 0.65,
      );
      for (const x of [-0.4, 0.4])
        add(
          box,
          "#5d625b",
          x * width,
          height * 0.25,
          0,
          r * 0.15,
          height * 0.5,
          width * 0.55,
        );
    } else if (r <= 0.1) {
      for (let i = 0; i < 3; i++)
        add(
          box,
          ["#936650", "#7389a6", "#c3a469"][i],
          (i - 1) * r * 0.1,
          height * (0.15 + i * 0.2),
          0,
          width * 0.8,
          height * 0.18,
          width * 0.6,
        );
    } else {
      add(
        cone,
        "#af775d",
        0,
        height * 0.3,
        0,
        r * 0.62,
        height * 0.6,
        r * 0.62,
      ).rotation.z = Math.PI;
      for (const x of [-0.3, 0, 0.3])
        add(
          sphere,
          "#65844e",
          x * r,
          height * 0.72,
          0,
          r * 0.4,
          height * 0.25,
          r * 0.35,
        );
    }
  } else {
    if (r > 0.65) {
      add(
        box,
        "#9c825a",
        0,
        height * 0.6,
        0,
        width,
        height * 0.12,
        width * 0.5,
      );
      for (const x of [-0.4, 0.4])
        add(
          box,
          "#64734e",
          x * width,
          height * 0.3,
          0,
          r * 0.12,
          height * 0.6,
          width * 0.45,
        );
      return g;
    }
    if (r > 0.25) {
      add(
        cylinder,
        "#a99c84",
        0,
        height * 0.4,
        0,
        r * 0.2,
        height * 0.8,
        r * 0.2,
      );
      add(
        cylinder,
        "#87b6bc",
        0,
        height * 0.85,
        0,
        r * 0.7,
        height * 0.1,
        r * 0.7,
      );
      return g;
    }
    add(
      sphere,
      "#958669",
      0,
      height * 0.16,
      0,
      r * 0.85,
      height * 0.2,
      r * 0.7,
    );
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * r * 0.45;
      add(
        cylinder,
        "#618443",
        x,
        height * 0.45,
        0,
        r * 0.04,
        height * 0.5,
        r * 0.04,
      );
      add(
        sphere,
        ["#e5b551", "#c77999", "#d9d5ad"][i],
        x,
        height * 0.75,
        0,
        r * 0.25,
        height * 0.18,
        r * 0.25,
      );
    }
  }
  return g;
}
