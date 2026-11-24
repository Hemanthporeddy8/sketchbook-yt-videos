import * as THREE from "three";
import { add, ball, box, buildTree, cyl, darker, glass, glow, mat, prismRoof, wedge, type TreeSpec } from "./geometry";

export type AssetCat = "Nature" | "Buildings" | "Roads & Streets" | "Vehicles" | "Props" | "Mechanics" | "Shapes";
export type VehicleKind = "car" | "truck" | "bike" | "tank" | "tractor" | "heli" | "plane" | "hover";
export type MechKind = "spin" | "oscillate" | "bounce" | "forward";

export interface AssetDef {
  id: string;
  name: string;
  cat: AssetCat;
  sub: string;
  emoji: string;
  solid: boolean; // blocks walking / driving
  walk: boolean; // can stand on it
  collider?: { hx: number; hz: number; h: number }; // simple trunk-style collider (not standable)
  vehicle?: VehicleKind;
  jumpPad?: boolean;
  ramp?: boolean;
  colorable?: boolean;
  mech?: { type: MechKind; speed: number; amount: number; axis: "x" | "y" | "z" };
  build: () => THREE.Group;
}

type Input = Omit<AssetDef, "solid" | "walk"> & Partial<Pick<AssetDef, "solid" | "walk">>;
const defs: AssetDef[] = [];
const push = (d: Input) => {
  defs.push({ solid: true, walk: false, ...d });
};
const G = () => new THREE.Group();
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ------------------------------------------------------------------ */
/* Nature                                                               */
/* ------------------------------------------------------------------ */

const SPECIES: { key: string; name: string; trunk: string; leaves: string[]; shape: TreeSpec["shape"]; emoji: string }[] = [
  { key: "oak", name: "Oak", trunk: "#6b4423", leaves: ["#3f7d2e", "#4f9a3a"], shape: "oak", emoji: "🌳" },
  { key: "pine", name: "Pine", trunk: "#5a3a22", leaves: ["#1f5e33", "#2a6f3d"], shape: "pine", emoji: "🌲" },
  { key: "birch", name: "Birch", trunk: "#e5e7eb", leaves: ["#9bd16a", "#b5e07e"], shape: "birch", emoji: "🌿" },
  { key: "palm", name: "Palm", trunk: "#9a6b3c", leaves: ["#2f9e44"], shape: "palm", emoji: "🌴" },
  { key: "willow", name: "Willow", trunk: "#6b4423", leaves: ["#6aa84f", "#7fbf5f"], shape: "willow", emoji: "🌳" },
  { key: "cypress", name: "Cypress", trunk: "#4a3525", leaves: ["#1d4d2f"], shape: "cypress", emoji: "🌲" },
  { key: "cherry", name: "Cherry blossom", trunk: "#5b3a29", leaves: ["#f9a8d4", "#fbcfe8"], shape: "oak", emoji: "🌸" },
  { key: "apple", name: "Apple", trunk: "#7a4a22", leaves: ["#4d8f2f", "#dc2626"], shape: "oak", emoji: "🍎" },
  { key: "dead", name: "Dead tree", trunk: "#5c4033", leaves: [], shape: "dead", emoji: "🥀" },
  { key: "bush", name: "Bush", trunk: "#4a3b2a", leaves: ["#3f7d2e", "#4f9a3a"], shape: "bush", emoji: "🌿" },
  { key: "snowpine", name: "Snow pine", trunk: "#4a3525", leaves: ["#1f5e33", "#f8fafc"], shape: "snowpine", emoji: "❄️" },
  { key: "autumn", name: "Autumn oak", trunk: "#6b4423", leaves: ["#f97316", "#eab308"], shape: "oak", emoji: "🍂" },
];

SPECIES.forEach((sp, si) => {
  (["s", "l"] as const).forEach((sz, zi) => {
    const H = sz === "s" ? 4 : 7;
    push({
      id: `tree-${sp.key}-${sz}`,
      name: `${sp.name} (${sz === "s" ? "small" : "large"})`,
      cat: "Nature",
      sub: "Trees",
      emoji: sp.emoji,
      solid: true,
      collider: sp.shape === "bush" ? { hx: 0.9, hz: 0.9, h: 0.9 } : { hx: 0.3, hz: 0.3, h: H * 0.4 },
      build: () => {
        const g = G();
        g.add(buildTree({ trunk: sp.trunk, leaves: sp.leaves, shape: sp.shape, height: H, seed: 101 + si * 7 + zi * 3 }));
        g.userData.tree = true;
        return g;
      },
    });
  });
});

const ROCK_COLORS = ["#9ca3af", "#78716c", "#a8a29e", "#6b7280", "#8d8c8a", "#57534e"];
for (let i = 0; i < 6; i++) {
  push({
    id: `rock-${i}`,
    name: `Boulder ${i + 1}`,
    cat: "Nature",
    sub: "Rocks",
    emoji: "🪨",
    build: () => {
      const g = G();
      const r = 0.8 + i * 0.25;
      const m = add(g, new THREE.DodecahedronGeometry(r, 0), mat(ROCK_COLORS[i]), 0, r * 0.7, 0);
      m.scale.set(1, 0.8, 1.1);
      return g;
    },
  });
}

const FLOWER_COLORS = ["#f472b6", "#fde047", "#c084fc", "#fb923c"];
for (let i = 0; i < 4; i++) {
  push({
    id: `flower-${i}`,
    name: `Flower patch ${i + 1}`,
    cat: "Nature",
    sub: "Plants",
    emoji: "🌼",
    solid: false,
    build: () => {
      const g = G();
      for (let k = 0; k < 6; k++) {
        const x = Math.cos(k) * 0.4;
        const z = Math.sin(k * 1.7) * 0.4;
        cyl(g, 0.02, 0.02, 0.4, mat("#4d7c0f"), x, 0, z);
        ball(g, 0.1, mat(FLOWER_COLORS[(i + k) % FLOWER_COLORS.length]), x, 0.45, z);
      }
      return g;
    },
  });
}

for (let i = 0; i < 2; i++) {
  push({
    id: `mush-${i}`,
    name: `Mushrooms ${i + 1}`,
    cat: "Nature",
    sub: "Plants",
    emoji: "🍄",
    solid: false,
    build: () => {
      const g = G();
      cyl(g, 0.05, 0.06, 0.25, mat("#f5f5f4"), 0, 0, 0);
      add(g, new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(i ? "#fb923c" : "#ef4444"), 0, 0.25, 0);
      return g;
    },
  });
}

for (let i = 0; i < 2; i++) {
  push({
    id: `log-${i}`,
    name: `Fallen log ${i + 1}`,
    cat: "Nature",
    sub: "Rocks",
    emoji: "🪵",
    build: () => {
      const g = G();
      cyl(g, 0.3, 0.32, 3.2, mat(i ? "#6b4423" : "#7c5a2d"), 0, 0.3, 0, "x");
      return g;
    },
  });
}

for (let i = 0; i < 2; i++) {
  push({
    id: `cactus-${i}`,
    name: `Cactus ${i + 1}`,
    cat: "Nature",
    sub: "Plants",
    emoji: "🌵",
    collider: { hx: 0.35, hz: 0.35, h: 2.6 },
    build: () => {
      const g = G();
      const m = mat("#3d7a3a");
      cyl(g, 0.3, 0.3, 2.6, m, 0, 0, 0);
      cyl(g, 0.18, 0.18, 0.9, m, 0.55, 1.2, 0, "x");
      cyl(g, 0.18, 0.18, 0.9, m, 0.55, 1.7, 0, "y");
      return g;
    },
  });
}

for (let i = 0; i < 2; i++) {
  push({
    id: `crystal-${i}`,
    name: `Glow crystal ${i + 1}`,
    cat: "Nature",
    sub: "Rocks",
    emoji: "💎",
    collider: { hx: 0.6, hz: 0.6, h: 2 },
    build: () => {
      const g = G();
      add(g, new THREE.OctahedronGeometry(0.8, 0), mat(i ? "#c084fc" : "#67e8f9", { emissive: i ? "#7e22ce" : "#22d3ee", emissiveIntensity: 0.5, transparent: true, opacity: 0.85 }), 0, 1.0, 0);
      return g;
    },
  });
}

push({
  id: "grass-tuft",
  name: "Grass tuft",
  cat: "Nature",
  sub: "Plants",
  emoji: "🌾",
  solid: false,
  build: () => {
    const g = G();
    for (let k = 0; k < 7; k++) add(g, new THREE.ConeGeometry(0.06, 0.6, 4), mat("#4ade80"), Math.cos(k) * 0.2, 0.3, Math.sin(k) * 0.2, (k % 2) * 0.2, 0, 0);
    return g;
  },
});

/* ------------------------------------------------------------------ */
/* Buildings: walls, roofs, doors, windows, houses, fences            */
/* ------------------------------------------------------------------ */

const WALLS: Record<string, string[]> = {
  plaster: ["#f5f0e6", "#e9d8b4", "#d7e3ef", "#f2c6c2"],
  brick: ["#b5533c", "#9a4a33", "#c46e4f", "#8f3d2c"],
  wood: ["#8b5a2b", "#a9743f", "#6f4520", "#c08a52"],
  stone: ["#9ca3af", "#78716c", "#a8a29e", "#6b7280"],
};

function wallBuild(g: THREE.Group, kind: string, c: string) {
  box(g, 6, 3, 0.3, mat(c));
  if (kind === "brick") for (let y = 0.4; y < 3; y += 0.5) box(g, 6.02, 0.06, 0.32, mat(darker(c)), 0, y, 0);
  if (kind === "wood") for (let x = -2.75; x <= 2.75; x += 0.5) box(g, 0.05, 3, 0.33, mat(darker(c)), x, 0, 0);
  if (kind === "stone") for (const y of [1, 2]) box(g, 6.02, 0.05, 0.32, mat(darker(c, 0.85)), 0, y, 0);
}

for (const [kind, cols] of Object.entries(WALLS)) {
  cols.forEach((c, i) => {
    push({
      id: `wall-${kind}-${i}`,
      name: `${cap(kind)} wall ${i + 1}`,
      cat: "Buildings",
      sub: "Walls",
      emoji: "🧱",
      build: () => {
        const g = G();
        wallBuild(g, kind, c);
        return g;
      },
    });
  });
}

const ROOF_COLORS = ["#7c2d12", "#374151", "#1e3a8a"];
const ROOF_KINDS = ["gable", "flat", "hip", "dome", "shed"];
for (const k of ROOF_KINDS) {
  ROOF_COLORS.forEach((c, i) => {
    push({
      id: `roof-${k}-${i}`,
      name: `${cap(k)} roof ${i + 1}`,
      cat: "Buildings",
      sub: "Roofs",
      emoji: "🏠",
      build: () => {
        const g = G();
        const m = mat(c, { side: THREE.DoubleSide });
        switch (k) {
          case "gable":
            add(g, prismRoof(6.4, 2.2, 6.4), m);
            break;
          case "flat":
            box(g, 6.4, 0.35, 6.4, mat(c));
            break;
          case "hip":
            add(g, new THREE.ConeGeometry(4.6, 2.4, 4), mat(c), 0, 1.2, 0, 0, Math.PI / 4, 0);
            break;
          case "dome":
            add(g, new THREE.SphereGeometry(3.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(c));
            break;
          default:
            box(g, 6.4, 0.25, 4.6, mat(c), 0, 1.2, 0, -0.42);
        }
        return g;
      },
    });
  });
}

function doorBuild(g: THREE.Group, style: string, c: string) {
  box(g, 1.8, 2.6, 0.2, mat("#5b3a1e"));
  const panel = style === "glass" ? glass() : style === "metal" ? mat(c, { metalness: 0.6, roughness: 0.4 }) : mat(c);
  box(g, 1.3, 2.3, 0.12, panel, 0, 0.1, 0.1);
  ball(g, 0.07, mat("#facc15", { metalness: 0.8 }), 0.5, 1.1, 0.22);
}
for (const style of ["wood", "glass", "metal"]) {
  ["#8b5a2b", "#2563eb", "#dc2626"].forEach((c, i) => {
    push({
      id: `door-${style}-${i}`,
      name: `${cap(style)} door ${i + 1}`,
      cat: "Buildings",
      sub: "Doors",
      emoji: "🚪",
      build: () => {
        const g = G();
        doorBuild(g, style, c);
        return g;
      },
    });
  });
}

function windowBuild(g: THREE.Group, style: string, wallColor: string) {
  box(g, 2.8, 2.8, 0.25, mat(wallColor));
  const gl = glass();
  const frame = mat("#f8fafc");
  if (style === "single") {
    box(g, 1.9, 1.9, 0.05, gl, 0, 0.45, 0.14);
    box(g, 0.08, 1.9, 0.12, frame, 0, 0.45, 0.15);
  } else if (style === "double") {
    box(g, 0.9, 1.9, 0.05, gl, -0.5, 0.45, 0.14);
    box(g, 0.9, 1.9, 0.05, gl, 0.5, 0.45, 0.14);
  } else {
    box(g, 1.0, 2.4, 0.05, gl, 0, 0.2, 0.14);
  }
}
for (const style of ["single", "double", "tall"]) {
  ["#f5f0e6", "#d7e3ef"].forEach((c, i) => {
    push({
      id: `window-${style}-${i}`,
      name: `${cap(style)} window ${i + 1}`,
      cat: "Buildings",
      sub: "Windows",
      emoji: "🪟",
      build: () => {
        const g = G();
        windowBuild(g, style, c);
        return g;
      },
    });
  });
}

function houseBuild(g: THREE.Group, kind: string, wc: string, rc: string) {
  const w = mat(wc);
  const roof = mat(rc, { side: THREE.DoubleSide });
  const wood = mat("#6b4423");
  const door = (x: number) => box(g, 1.2, 2.2, 0.1, wood, x, 0, 3.02);
  const win = (x: number, y: number) => box(g, 1.1, 1.1, 0.06, glass(), x, y, 3.03);
  switch (kind) {
    case "cottage":
      box(g, 6, 3, 6, w);
      add(g, prismRoof(6.4, 2.2, 6.4), roof, 0, 3, 0);
      door(0);
      win(-1.8, 1.5);
      win(1.8, 1.5);
      break;
    case "hip":
      box(g, 6, 3, 6, w);
      add(g, new THREE.ConeGeometry(4.6, 2.4, 4), roof, 0, 4.2, 0, 0, Math.PI / 4, 0);
      door(0);
      win(-1.8, 1.5);
      win(1.8, 1.5);
      break;
    case "shop":
      box(g, 8, 3.5, 6, w);
      box(g, 8.4, 0.3, 6.4, roof, 0, 3.5, 0);
      box(g, 4, 0.7, 0.15, mat(rc), 0, 2.7, 3.08);
      box(g, 5, 2, 0.06, glass(), 0, 0.3, 3.03);
      break;
    case "tower":
      cyl(g, 2.4, 2.6, 8, w);
      add(g, new THREE.ConeGeometry(2.9, 3, 16), roof, 0, 9.5, 0);
      for (const y of [2, 4, 6]) box(g, 0.4, 0.9, 0.1, glass(), 0, y, 2.55);
      box(g, 1.1, 2.2, 0.1, wood, 0, 0, 2.5);
      break;
    case "barn":
      box(g, 7, 4, 9, mat("#9a4a2a"));
      add(g, prismRoof(7.4, 3, 9.4), roof, 0, 4, 0);
      box(g, 2.6, 3, 0.15, mat("#7a2e1a"), 0, 0, 4.52);
      break;
    default:
      box(g, 6, 6, 6, w);
      add(g, prismRoof(6.4, 2.4, 6.4), roof, 0, 6, 0);
      door(0);
      win(-1.8, 1.5);
      win(1.8, 1.5);
      win(-1.8, 4);
      win(1.8, 4);
  }
}
for (const k of ["cottage", "hip", "shop", "tower", "barn", "twostory"]) {
  [0, 1].forEach((i) => {
    const wc = ["#f5f0e6", "#e9d8b4", "#d7e3ef", "#f2c6c2"][i * 2];
    const rc = ["#7c2d12", "#1e3a8a"][i];
    push({
      id: `house-${k}-${i}`,
      name: `${k === "twostory" ? "Two-storey house" : cap(k) + " house"} ${i + 1}`,
      cat: "Buildings",
      sub: "Houses",
      emoji: "🏡",
      build: () => {
        const g = G();
        houseBuild(g, k, wc, rc);
        return g;
      },
    });
  });
}

push({
  id: "fence-wood",
  name: "Wood fence",
  cat: "Buildings",
  sub: "Fences",
  emoji: "🪵",
  build: () => {
    const g = G();
    const wood = mat("#a16207");
    for (let i = 0; i < 10; i++) box(g, 0.3, 1.2, 0.08, wood, -2 + i * 0.45, 0, 0);
    box(g, 4, 0.12, 0.08, mat("#78350f"), 0, 0.3, 0);
    box(g, 4, 0.12, 0.08, mat("#78350f"), 0, 0.8, 0);
    return g;
  },
});
push({
  id: "fence-stone",
  name: "Stone wall",
  cat: "Buildings",
  sub: "Fences",
  emoji: "🧱",
  build: () => {
    const g = G();
    box(g, 4, 1.4, 0.5, mat("#78716c"));
    box(g, 4.1, 0.1, 0.56, mat("#57534e"), 0, 1.4, 0);
    return g;
  },
});
push({
  id: "fence-iron",
  name: "Iron railing",
  cat: "Buildings",
  sub: "Fences",
  emoji: "⛓️",
  build: () => {
    const g = G();
    const m = mat("#1f2937", { metalness: 0.6 });
    for (let i = 0; i <= 16; i++) cyl(g, 0.02, 0.02, 1.2, m, -2 + i * 0.25, 0, 0);
    box(g, 4, 0.06, 0.06, m, 0, 0.3, 0);
    box(g, 4, 0.06, 0.06, m, 0, 1.0, 0);
    return g;
  },
});
push({
  id: "gate",
  name: "Garden gate",
  cat: "Buildings",
  sub: "Fences",
  emoji: "🚧",
  build: () => {
    const g = G();
    const m = mat("#6b4423");
    box(g, 0.2, 2.2, 0.2, m, -1.9, 0, 0);
    box(g, 0.2, 2.2, 0.2, m, 1.9, 0, 0);
    box(g, 3.8, 0.12, 0.1, m, 0, 0.6, 0);
    box(g, 3.8, 0.12, 0.1, m, 0, 1.6, 0);
    return g;
  },
});

/* ------------------------------------------------------------------ */
/* Roads & streets                                                      */
/* ------------------------------------------------------------------ */

const ROAD_KINDS = ["straight", "corner", "cross", "t", "end", "crosswalk", "sidewalk", "parking"];
for (const k of ROAD_KINDS) {
  push({
    id: `road-${k}`,
    name: `Road ${k === "t" ? "T-junction" : k === "end" ? "dead end" : k}`,
    cat: "Roads & Streets",
    sub: "Roads",
    emoji: "🛣️",
    solid: false,
    walk: true,
    build: () => {
      const g = G();
      const line = mat("#f8fafc");
      if (k === "sidewalk") {
        box(g, 6, 0.14, 6, mat("#9ca3af"));
        return g;
      }
      box(g, 6, 0.06, 6, mat("#374151"));
      const dashZ = [-2.5, -1.25, 0, 1.25, 2.5];
      switch (k) {
        case "straight":
          for (const z of dashZ) box(g, 0.12, 0.01, 0.6, line, 0, 0.06, z);
          break;
        case "corner":
          box(g, 0.12, 0.01, 6, line, -2.9, 0.06, 0);
          box(g, 6, 0.01, 0.12, line, 0, 0.06, -2.9);
          break;
        case "cross":
          for (const z of dashZ) box(g, 0.12, 0.01, 0.6, line, 0, 0.06, z);
          for (const x of dashZ) box(g, 0.6, 0.01, 0.12, line, x, 0.06, 0);
          break;
        case "t":
          for (const z of dashZ) box(g, 0.12, 0.01, 0.6, line, 0, 0.06, z);
          box(g, 0.12, 0.01, 6, line, -2.9, 0.06, 0);
          break;
        case "end":
          box(g, 6, 0.01, 0.2, line, 0, 0.06, 2.5);
          break;
        case "crosswalk":
          for (let x = -2.5; x <= 2.5; x += 0.5) box(g, 0.3, 0.01, 6, line, x, 0.06, 0);
          break;
        default:
          for (const x of [-2, 0, 2]) box(g, 0.12, 0.01, 4, line, x, 0.06, 0);
      }
      return g;
    },
  });
}

const STREET: { id: string; name: string; emoji: string; build: () => THREE.Group; collider?: { hx: number; hz: number; h: number } }[] = [
  {
    id: "street-lamp",
    name: "Street lamp",
    emoji: "💡",
    collider: { hx: 0.25, hz: 0.25, h: 4.5 },
    build: () => {
      const g = G();
      cyl(g, 0.08, 0.1, 4.5, mat("#1f2937"), 0, 0, 0);
      box(g, 0.8, 0.1, 0.1, mat("#1f2937"), 0.35, 4.4, 0);
      ball(g, 0.3, glow("#fde68a"), 0.7, 4.3, 0);
      return g;
    },
  },
  {
    id: "traffic-light",
    name: "Traffic light",
    emoji: "🚦",
    collider: { hx: 0.35, hz: 0.3, h: 4.8 },
    build: () => {
      const g = G();
      cyl(g, 0.07, 0.07, 3.2, mat("#374151"), 0, 0, 0);
      box(g, 0.6, 1.6, 0.5, mat("#111827"), 0, 3.2, 0);
      ball(g, 0.12, glow("#ef4444"), 0, 4.4, 0.26);
      ball(g, 0.12, glow("#facc15"), 0, 3.9, 0.26);
      ball(g, 0.12, glow("#22c55e"), 0, 3.4, 0.26);
      return g;
    },
  },
  {
    id: "stop-sign",
    name: "Stop sign",
    emoji: "🛑",
    collider: { hx: 0.2, hz: 0.2, h: 3 },
    build: () => {
      const g = G();
      cyl(g, 0.05, 0.05, 2.4, mat("#9ca3af"), 0, 0, 0);
      add(g, new THREE.CylinderGeometry(0.6, 0.6, 0.05, 8), mat("#dc2626"), 0, 2.9, 0.05, Math.PI / 2, 0, 0);
      return g;
    },
  },
  {
    id: "bus-stop",
    name: "Bus stop shelter",
    emoji: "🚏",
    build: () => {
      const g = G();
      for (const x of [-1.4, 1.4]) for (const z of [-0.7, 0.7]) box(g, 0.12, 2.6, 0.12, mat("#374151"), x, 0, z);
      box(g, 3.2, 0.15, 2, mat("#38bdf8", { transparent: true, opacity: 0.6 }), 0, 2.6, 0);
      box(g, 2.4, 0.1, 0.4, mat("#78350f"), 0, 0.45, 0.7);
      return g;
    },
  },
  {
    id: "mailbox",
    name: "Mailbox",
    emoji: "📮",
    collider: { hx: 0.3, hz: 0.3, h: 1.2 },
    build: () => {
      const g = G();
      cyl(g, 0.05, 0.05, 1.0, mat("#6b4423"), 0, 0, 0);
      box(g, 0.6, 0.4, 0.9, mat("#1d4ed8"), 0, 1.0, 0);
      return g;
    },
  },
  {
    id: "bin",
    name: "Trash bin",
    emoji: "🗑️",
    collider: { hx: 0.35, hz: 0.35, h: 0.9 },
    build: () => {
      const g = G();
      cyl(g, 0.35, 0.3, 0.9, mat("#166534"), 0, 0, 0);
      cyl(g, 0.38, 0.38, 0.08, mat("#14532d"), 0, 0.9, 0);
      return g;
    },
  },
  {
    id: "hydrant",
    name: "Fire hydrant",
    emoji: "🧯",
    collider: { hx: 0.25, hz: 0.25, h: 0.8 },
    build: () => {
      const g = G();
      cyl(g, 0.2, 0.22, 0.8, mat("#dc2626"), 0, 0, 0);
      ball(g, 0.2, mat("#dc2626"), 0, 0.8, 0);
      return g;
    },
  },
  {
    id: "bench",
    name: "Park bench",
    emoji: "🪑",
    build: () => {
      const g = G();
      const wood = mat("#a16207");
      box(g, 2, 0.1, 0.5, wood, 0, 0.45, 0);
      box(g, 2, 0.5, 0.08, wood, 0, 0.5, -0.25);
      box(g, 0.1, 0.45, 0.45, mat("#1f2937"), -0.85, 0, 0);
      box(g, 0.1, 0.45, 0.45, mat("#1f2937"), 0.85, 0, 0);
      return g;
    },
  },
  {
    id: "bollard",
    name: "Bollard",
    emoji: "🟡",
    collider: { hx: 0.15, hz: 0.15, h: 0.8 },
    build: () => {
      const g = G();
      cyl(g, 0.15, 0.15, 0.8, mat("#facc15"), 0, 0, 0);
      return g;
    },
  },
  {
    id: "road-cone",
    name: "Traffic cone",
    emoji: "🚧",
    collider: { hx: 0.25, hz: 0.25, h: 0.8 },
    build: () => {
      const g = G();
      cyl(g, 0.05, 0.3, 0.8, mat("#f97316"), 0, 0, 0);
      box(g, 0.6, 0.05, 0.6, mat("#f97316"), 0, 0, 0);
      return g;
    },
  },
];
STREET.forEach((s) =>
  push({
    id: s.id,
    name: s.name,
    cat: "Roads & Streets",
    sub: "Street furniture",
    emoji: s.emoji,
    collider: s.collider,
    build: s.build,
  }),
);

/* ------------------------------------------------------------------ */
/* Vehicles (drivable: local +Z is forward)                             */
/* ------------------------------------------------------------------ */

function wheels(g: THREE.Group, r: number, xo: number, zs: number[], w = 0.3) {
  for (const z of zs) for (const x of [-xo, xo]) cyl(g, r, r, w, mat("#111827"), x, r, z, "x", 18);
}

function sedan(g: THREE.Group, c: string) {
  const body = mat(c, { metalness: 0.3, roughness: 0.4 });
  const dark = mat(darker(c, 0.6));
  box(g, 2.0, 0.6, 4.2, body, 0, 0.35, 0);
  box(g, 1.7, 0.55, 2.2, dark, 0, 0.95, -0.2);
  box(g, 1.6, 0.42, 0.05, glass(), 0, 0.95, 0.91);
  wheels(g, 0.35, 0.95, [-1.3, 1.3]);
  box(g, 0.35, 0.15, 0.05, glow("#fef08a"), 0.65, 0.5, 2.12);
  box(g, 0.35, 0.15, 0.05, glow("#fef08a"), -0.65, 0.5, 2.12);
}
function sports(g: THREE.Group, c: string) {
  const body = mat(c, { metalness: 0.4, roughness: 0.3 });
  box(g, 2.0, 0.4, 4.4, body, 0, 0.3, 0);
  box(g, 1.6, 0.4, 1.9, mat("#111827"), 0, 0.7, -0.1);
  box(g, 1.8, 0.08, 0.4, mat(darker(c, 0.6)), 0, 1.05, -2.0);
  wheels(g, 0.4, 1.0, [-1.35, 1.35], 0.34);
}

const VEHICLES: { id: string; name: string; kind: VehicleKind; build: (g: THREE.Group, c: string) => void; colors: string[] }[] = [
  { id: "car-sedan", name: "Sedan", kind: "car", colors: ["#dc2626", "#2563eb", "#eab308"], build: sedan },
  { id: "car-sports", name: "Sports car", kind: "car", colors: ["#f97316", "#7c3aed"], build: sports },
  {
    id: "pickup",
    name: "Pickup truck",
    kind: "car",
    colors: ["#64748b"],
    build: (g, c) => {
      box(g, 1.9, 1.1, 1.9, mat(c), 0, 0.6, 0.6);
      box(g, 1.9, 0.6, 2.2, mat("#374151"), 0, 0.5, -1.4);
      box(g, 1.9, 0.3, 0.2, mat("#374151"), 0, 0.2, -2.5);
      wheels(g, 0.42, 1.0, [-1.3, 1.6]);
    },
  },
  {
    id: "truck",
    name: "Box truck",
    kind: "truck",
    colors: ["#e5e7eb", "#1d4ed8"],
    build: (g, c) => {
      box(g, 2.2, 1.6, 1.9, mat(c), 0, 0.5, 1.4);
      box(g, 2.1, 0.3, 4.2, mat("#1f2937"), 0, 0.2, 0);
      box(g, 2.3, 2.4, 3.4, mat("#e5e7eb"), 0, 0.6, -1.5);
      wheels(g, 0.45, 1.05, [1.6, -0.9, -2.5]);
    },
  },
  {
    id: "bus",
    name: "City bus",
    kind: "truck",
    colors: ["#facc15", "#16a34a"],
    build: (g, c) => {
      box(g, 2.6, 2.8, 8, mat(c), 0, 0.6, 0);
      box(g, 0.05, 0.9, 6.8, glass(), 1.31, 1.7, 0);
      box(g, 0.05, 0.9, 6.8, glass(), -1.31, 1.7, 0);
      wheels(g, 0.45, 1.15, [2.6, -2.6], 0.4);
    },
  },
  {
    id: "bike",
    name: "Motorbike",
    kind: "bike",
    colors: ["#ef4444", "#111827"],
    build: (g, c) => {
      cyl(g, 0.4, 0.4, 0.1, mat("#111827"), 0, 0.4, 0.8, "x", 16);
      cyl(g, 0.4, 0.4, 0.1, mat("#111827"), 0, 0.4, -0.8, "x", 16);
      box(g, 0.1, 0.5, 1.6, mat(c), 0, 0.45, 0);
      box(g, 0.25, 0.12, 0.6, mat("#1f2937"), 0, 0.9, -0.3);
      box(g, 0.6, 0.06, 0.06, mat("#1f2937"), 0, 1.1, 0.6);
    },
  },
  {
    id: "tank",
    name: "Battle tank",
    kind: "tank",
    colors: ["#4d7c0f"],
    build: (g, c) => {
      box(g, 2.6, 0.8, 4.2, mat(c), 0, 0.4, 0);
      box(g, 0.5, 0.7, 4.4, mat("#1f2937"), -1.5, 0, 0);
      box(g, 0.5, 0.7, 4.4, mat("#1f2937"), 1.5, 0, 0);
      cyl(g, 1.0, 1.1, 0.6, mat(darker(c, 0.9)), 0, 1.2, 0);
      cyl(g, 0.13, 0.13, 2.4, mat("#1f2937"), 0, 1.55, 1.9, "z");
    },
  },
  {
    id: "tractor",
    name: "Tractor",
    kind: "tractor",
    colors: ["#16a34a"],
    build: (g, c) => {
      box(g, 1.8, 0.9, 2.8, mat(c), 0, 0.7, 0);
      box(g, 1.6, 1.3, 1.4, mat(c), 0, 1.5, -0.4);
      box(g, 1.4, 0.7, 0.05, glass(), 0, 1.6, 0.31);
      wheels(g, 0.9, 1.0, [-0.7], 0.5);
      wheels(g, 0.5, 0.9, [1.4], 0.35);
    },
  },
  {
    id: "heli",
    name: "Helicopter",
    kind: "heli",
    colors: ["#2563eb", "#f8fafc"],
    build: (g, c) => {
      ball(g, 1, mat(c), 0, 1.6, 0, 1.1, 0.9, 1.8);
      box(g, 0.25, 0.3, 3, mat(c), 0, 1.45, -2.8);
      cyl(g, 0.08, 0.08, 0.5, mat("#111827"), 0, 2.2, 0);
      const rotor = new THREE.Group();
      rotor.name = "rotor";
      rotor.position.set(0, 2.75, 0);
      add(rotor, new THREE.BoxGeometry(7, 0.05, 0.25), mat("#111827"));
      add(rotor, new THREE.BoxGeometry(0.25, 0.05, 7), mat("#111827"));
      g.add(rotor);
      box(g, 0.12, 0.12, 2.6, mat("#111827"), 0.6, 0, -0.1);
      box(g, 0.12, 0.12, 2.6, mat("#111827"), -0.6, 0, -0.1);
      g.userData.spin = true;
    },
  },
  {
    id: "plane",
    name: "Propeller plane",
    kind: "plane",
    colors: ["#f8fafc", "#f97316"],
    build: (g, c) => {
      cyl(g, 0.45, 0.35, 4.5, mat(c), 0, 1.2, 0, "z");
      ball(g, 0.45, mat(c), 0, 1.2, 2.25);
      box(g, 6, 0.08, 1.2, mat("#94a3b8"), 0, 1.16, 0);
      box(g, 0.08, 0.9, 0.9, mat("#dc2626"), 0, 1.5, -2.0);
      box(g, 2, 0.06, 0.6, mat("#94a3b8"), 0, 1.3, -2.0);
      const prop = new THREE.Group();
      prop.name = "prop";
      prop.position.set(0, 1.2, 2.55);
      add(prop, new THREE.BoxGeometry(2.2, 0.12, 0.05), mat("#111827"));
      add(prop, new THREE.BoxGeometry(0.12, 2.2, 0.05), mat("#111827"));
      g.add(prop);
      g.userData.spin = true;
    },
  },
  {
    id: "hover",
    name: "Hover pod",
    kind: "hover",
    colors: ["#a855f7"],
    build: (g, c) => {
      cyl(g, 1.5, 1.4, 0.35, mat(c, { metalness: 0.5 }), 0, 0.3, 0);
      ball(g, 0.8, glass(), 0, 0.65, 0.1, 1, 0.7, 1.2);
      cyl(g, 1.55, 1.55, 0.1, mat("#1f2937"), 0, 0.15, 0);
    },
  },
];

for (const v of VEHICLES) {
  v.colors.forEach((c, i) => {
    push({
      id: `${v.id}-${i}`,
      name: `${v.name}${v.colors.length > 1 ? ` ${i + 1}` : ""}`,
      cat: "Vehicles",
      sub: v.kind === "plane" || v.kind === "heli" ? "Air" : v.kind === "hover" ? "Hover" : "Ground",
      emoji: v.kind === "heli" ? "🚁" : v.kind === "plane" ? "✈️" : v.kind === "bike" ? "🏍️" : v.kind === "tank" ? "🪖" : v.kind === "hover" ? "🛸" : v.kind === "truck" || v.id === "bus" ? "🚚" : v.kind === "tractor" ? "🚜" : "🚗",
      vehicle: v.kind,
      build: () => {
        const g = G();
        v.build(g, c);
        return g;
      },
    });
  });
}

/* ------------------------------------------------------------------ */
/* Props                                                                */
/* ------------------------------------------------------------------ */

const PROPS: { id: string; name: string; emoji: string; solid?: boolean; walk?: boolean; jumpPad?: boolean; ramp?: boolean; build: () => THREE.Group }[] = [
  {
    id: "prop-table", name: "Table", emoji: "🪑",
    build: () => {
      const g = G();
      box(g, 1.6, 0.1, 0.9, mat("#a16207"), 0, 0.72, 0);
      for (const x of [-0.7, 0.7]) for (const z of [-0.35, 0.35]) box(g, 0.1, 0.72, 0.1, mat("#78350f"), x, 0, z);
      return g;
    },
  },
  {
    id: "prop-chair", name: "Chair", emoji: "🪑",
    build: () => {
      const g = G();
      box(g, 0.5, 0.08, 0.5, mat("#a16207"), 0, 0.45, 0);
      box(g, 0.5, 0.5, 0.06, mat("#a16207"), 0, 0.5, -0.22);
      for (const x of [-0.2, 0.2]) for (const z of [-0.2, 0.2]) box(g, 0.06, 0.45, 0.06, mat("#78350f"), x, 0, z);
      return g;
    },
  },
  {
    id: "prop-bed", name: "Bed", emoji: "🛏️",
    build: () => {
      const g = G();
      box(g, 1.4, 0.45, 2.2, mat("#78350f"), 0, 0, 0);
      box(g, 1.3, 0.2, 2.0, mat("#f8fafc"), 0, 0.45, 0);
      box(g, 0.9, 0.12, 0.4, mat("#ffffff"), 0, 0.65, -0.8);
      box(g, 1.4, 0.9, 0.1, mat("#78350f"), 0, 0, -1.1);
      return g;
    },
  },
  {
    id: "prop-sofa", name: "Sofa", emoji: "🛋️",
    build: () => {
      const g = G();
      const c = "#4f46e5";
      box(g, 2.2, 0.45, 0.9, mat(c), 0, 0, 0);
      box(g, 2.2, 0.5, 0.25, mat(c), 0, 0.45, -0.33);
      box(g, 0.25, 0.3, 0.9, mat(c), -1.0, 0.45, 0);
      box(g, 0.25, 0.3, 0.9, mat(c), 1.0, 0.45, 0);
      return g;
    },
  },
  {
    id: "prop-bookshelf", name: "Bookshelf", emoji: "📚",
    build: () => {
      const g = G();
      box(g, 1.2, 2.2, 0.4, mat("#78350f"), 0, 0, 0);
      const books = ["#ef4444", "#3b82f6", "#22c55e", "#facc15"];
      for (const y of [0.4, 1.0, 1.6]) {
        box(g, 1.1, 0.03, 0.38, mat("#451a03"), 0, y, 0.01);
        books.forEach((c, i) => box(g, 0.2, 0.5, 0.25, mat(c), -0.4 + i * 0.27, y + 0.03, 0.05));
      }
      return g;
    },
  },
  {
    id: "prop-lamp", name: "Floor lamp", emoji: "💡",
    build: () => {
      const g = G();
      cyl(g, 0.2, 0.2, 0.05, mat("#1f2937"), 0, 0, 0);
      cyl(g, 0.03, 0.03, 1.0, mat("#1f2937"), 0, 0.05, 0);
      cyl(g, 0.25, 0.4, 0.4, glow("#fde68a"), 0, 1.05, 0);
      return g;
    },
  },
  {
    id: "prop-crate", name: "Wooden crate", emoji: "📦",
    build: () => {
      const g = G();
      box(g, 1, 1, 1, mat("#a16207"), 0, 0, 0);
      box(g, 1.02, 0.1, 0.1, mat("#78350f"), 0, 0.45, 0.5);
      return g;
    },
  },
  {
    id: "prop-barrel", name: "Barrel", emoji: "🛢️",
    build: () => {
      const g = G();
      cyl(g, 0.4, 0.4, 1.0, mat("#7c2d12"), 0, 0, 0);
      cyl(g, 0.42, 0.42, 0.08, mat("#1f2937", { metalness: 0.5 }), 0, 0.2, 0);
      cyl(g, 0.42, 0.42, 0.08, mat("#1f2937", { metalness: 0.5 }), 0, 0.75, 0);
      return g;
    },
  },
  {
    id: "prop-boxes", name: "Box stack", emoji: "📦",
    build: () => {
      const g = G();
      box(g, 1, 1, 1, mat("#a16207"), 0, 0, 0);
      box(g, 0.8, 0.8, 0.8, mat("#ca8a04"), 1.1, 0, 0.1);
      box(g, 0.9, 0.9, 0.9, mat("#92400e"), 0.2, 1, 0);
      return g;
    },
  },
  {
    id: "prop-ball", name: "Big ball", emoji: "⚽",
    build: () => {
      const g = G();
      ball(g, 0.5, mat("#f97316"), 0, 0.5, 0);
      return g;
    },
  },
  {
    id: "prop-trampoline", name: "Trampoline", emoji: "🤸", jumpPad: true, walk: true, solid: false,
    build: () => {
      const g = G();
      cyl(g, 1.8, 1.8, 0.1, mat("#1f2937"), 0, 0.8, 0);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        cyl(g, 0.04, 0.04, 0.8, mat("#9ca3af", { metalness: 0.5 }), Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5);
      }
      return g;
    },
  },
  {
    id: "prop-pillar", name: "Pillar", emoji: "🏛️",
    build: () => {
      const g = G();
      cyl(g, 0.4, 0.45, 4, mat("#e5e7eb"), 0, 0, 0);
      return g;
    },
  },
  {
    id: "prop-platform", name: "Platform", emoji: "🟦", walk: true,
    build: () => {
      const g = G();
      box(g, 4, 0.5, 4, mat("#94a3b8"), 0, 0, 0);
      return g;
    },
  },
  {
    id: "prop-ramp", name: "Ramp", emoji: "📐", walk: true, solid: false, ramp: true,
    build: () => {
      const g = G();
      add(g, wedge(4, 1.2, 6), mat("#f59e0b", { side: THREE.DoubleSide }));
      return g;
    },
  },
  {
    id: "prop-spring", name: "Spring jump pad", emoji: "🟪", walk: true, solid: false, jumpPad: true,
    build: () => {
      const g = G();
      box(g, 2, 0.2, 2, mat("#1f2937"), 0, 0, 0);
      box(g, 1.8, 0.12, 1.8, glow("#f472b6"), 0, 0.2, 0);
      return g;
    },
  },
  {
    id: "prop-fountain", name: "Fountain", emoji: "⛲",
    build: () => {
      const g = G();
      cyl(g, 2, 2.2, 0.6, mat("#9ca3af"), 0, 0, 0);
      cyl(g, 0.3, 0.3, 1.4, mat("#9ca3af"), 0, 0.6, 0);
      ball(g, 0.45, glass(), 0, 2.0, 0);
      return g;
    },
  },
];
PROPS.forEach((p) =>
  push({
    id: p.id,
    name: p.name,
    cat: "Props",
    sub: "Furniture & objects",
    emoji: p.emoji,
    solid: p.solid ?? true,
    walk: p.walk ?? false,
    jumpPad: p.jumpPad,
    ramp: p.ramp,
    build: p.build,
  }),
);

/* ------------------------------------------------------------------ */
/* Mechanics (objects with built-in motion)                             */
/* ------------------------------------------------------------------ */

push({
  id: "mech-fan", name: "Spinning fan", cat: "Mechanics", sub: "Rotating", emoji: "🌀",
  mech: { type: "spin", speed: 1, amount: 180, axis: "y" },
  build: () => {
    const g = G();
    cyl(g, 0.4, 0.5, 0.4, mat("#374151"), 0, 0, 0);
    cyl(g, 0.08, 0.08, 2.4, mat("#9ca3af"), 0, 0.4, 0);
    const blades = new THREE.Group();
    blades.name = "prop";
    blades.position.set(0, 2.6, 0.2);
    add(blades, new THREE.BoxGeometry(0.2, 2.6, 0.05), mat("#f8fafc"));
    add(blades, new THREE.BoxGeometry(2.6, 0.2, 0.05), mat("#f8fafc"));
    g.add(blades);
    g.userData.spin = true;
    return g;
  },
});
push({
  id: "mech-platform", name: "Moving platform", cat: "Mechanics", sub: "Moving", emoji: "🛗", walk: true,
  mech: { type: "forward", speed: 1.2, amount: 8, axis: "z" },
  build: () => {
    const g = G();
    box(g, 4, 0.4, 4, mat("#38bdf8"), 0, 0, 0);
    return g;
  },
});
push({
  id: "mech-ball", name: "Bouncing ball", cat: "Mechanics", sub: "Bouncing", emoji: "🏀",
  mech: { type: "bounce", speed: 1.2, amount: 3, axis: "y" },
  build: () => {
    const g = G();
    ball(g, 0.7, mat("#ef4444", { metalness: 0.2 }), 0, 0.7, 0);
    return g;
  },
});
push({
  id: "mech-swing", name: "Swinging beam", cat: "Mechanics", sub: "Swinging", emoji: "🪓",
  mech: { type: "oscillate", speed: 0.8, amount: 2, axis: "x" },
  build: () => {
    const g = G();
    box(g, 0.2, 3, 0.2, mat("#1f2937"), -2.9, 0, 0);
    box(g, 0.2, 3, 0.2, mat("#1f2937"), 2.9, 0, 0);
    box(g, 6, 0.3, 0.6, mat("#a16207"), 0, 3, 0);
    return g;
  },
});
push({
  id: "mech-ring", name: "Spinning ring", cat: "Mechanics", sub: "Rotating", emoji: "⭕",
  mech: { type: "spin", speed: 0.6, amount: 90, axis: "y" },
  build: () => {
    const g = G();
    add(g, new THREE.TorusGeometry(1.5, 0.15, 12, 32), mat("#facc15", { metalness: 0.5 }), 0, 1.8, 0);
    return g;
  },
});
push({
  id: "mech-pendulum", name: "Pendulum", cat: "Mechanics", sub: "Swinging", emoji: "🔔",
  mech: { type: "oscillate", speed: 0.6, amount: 1.5, axis: "x" },
  build: () => {
    const g = G();
    box(g, 2, 0.2, 0.2, mat("#374151"), 0, 4, 0);
    cyl(g, 0.03, 0.03, 2, mat("#9ca3af"), 0, 2, 0);
    ball(g, 0.5, mat("#fde047", { metalness: 0.6 }), 0, 2, 0);
    return g;
  },
});
push({
  id: "mech-press", name: "Hydraulic press", cat: "Mechanics", sub: "Pressing", emoji: "🔨", walk: true,
  mech: { type: "oscillate", speed: 0.8, amount: 1.5, axis: "y" },
  build: () => {
    const g = G();
    box(g, 2, 0.6, 2, mat("#dc2626"), 0, 2.4, 0);
    for (const x of [-0.9, 0.9]) for (const z of [-0.9, 0.9]) box(g, 0.2, 2.4, 0.2, mat("#374151"), x, 0, z);
    box(g, 2.6, 0.3, 2.6, mat("#1f2937"), 0, 0, 0);
    return g;
  },
});

/* ------------------------------------------------------------------ */
/* Shapes (Blender-style primitives, colourable)                       */
/* ------------------------------------------------------------------ */

const SHAPES: { id: string; name: string; build: (g: THREE.Group) => void; walk?: boolean; solid?: boolean }[] = [
  { id: "shape-cube", name: "Cube", build: (g) => add(g, new THREE.BoxGeometry(1, 1, 1), mat("#94a3b8"), 0, 0.5, 0) },
  { id: "shape-sphere", name: "Sphere", build: (g) => add(g, new THREE.SphereGeometry(0.5, 32, 24), mat("#94a3b8"), 0, 0.5, 0) },
  { id: "shape-cylinder", name: "Cylinder", build: (g) => add(g, new THREE.CylinderGeometry(0.5, 0.5, 1, 32), mat("#94a3b8"), 0, 0.5, 0) },
  { id: "shape-cone", name: "Cone", build: (g) => add(g, new THREE.ConeGeometry(0.5, 1, 32), mat("#94a3b8"), 0, 0.5, 0) },
  { id: "shape-torus", name: "Torus", build: (g) => add(g, new THREE.TorusGeometry(0.4, 0.14, 16, 48), mat("#94a3b8"), 0, 0.54, 0) },
  { id: "shape-pyramid", name: "Pyramid", build: (g) => add(g, new THREE.ConeGeometry(0.6, 1, 4), mat("#94a3b8"), 0, 0.5, 0) },
  { id: "shape-capsule", name: "Capsule", build: (g) => add(g, new THREE.CapsuleGeometry(0.3, 0.6, 8, 16), mat("#94a3b8"), 0, 0.6, 0) },
  { id: "shape-plane", name: "Plane", walk: true, solid: false, build: (g) => add(g, new THREE.BoxGeometry(1, 0.04, 1), mat("#94a3b8"), 0, 0.02, 0) },
];
SHAPES.forEach((s) =>
  push({
    id: s.id,
    name: s.name,
    cat: "Shapes",
    sub: "Primitives",
    emoji: "🔷",
    colorable: true,
    walk: s.walk ?? false,
    solid: s.solid ?? true,
    build: () => {
      const g = G();
      s.build(g);
      return g;
    },
  }),
);

/* ------------------------------------------------------------------ */
/* Exports                                                              */
/* ------------------------------------------------------------------ */

export const ASSETS: AssetDef[] = defs;
export const ASSET_MAP: Record<string, AssetDef> = Object.fromEntries(defs.map((d) => [d.id, d]));
export const ASSET_CATS: AssetCat[] = ["Nature", "Buildings", "Roads & Streets", "Vehicles", "Props", "Mechanics", "Shapes"];

export interface Proto {
  proto: THREE.Group;
  min: THREE.Vector3;
  max: THREE.Vector3;
}
const protoCache = new Map<string, Proto>();

/** Builds (once) the prototype model for an asset and measures its bounds. */
export function getProto(id: string): Proto {
  let p = protoCache.get(id);
  if (!p) {
    const def = ASSET_MAP[id];
    const proto = def ? def.build() : new THREE.Group();
    proto.userData.assetId = id;
    const b = new THREE.Box3().setFromObject(proto);
    if (b.isEmpty()) b.set(new THREE.Vector3(-0.5, 0, -0.5), new THREE.Vector3(0.5, 1, 0.5));
    p = { proto, min: b.min.clone(), max: b.max.clone() };
    protoCache.set(id, p);
  }
  return p;
}

export interface ShapeInfo {
  cx: number;
  cz: number;
  hx: number;
  hz: number;
  minY: number;
  maxY: number;
  solid: boolean;
  stand: boolean;
  ramp: boolean;
  pad: boolean;
}
const shapeCache = new Map<string, ShapeInfo | null>();

/** Collision/standing footprint of an asset in its local space. */
export function shapeOf(id: string): ShapeInfo | null {
  if (shapeCache.has(id)) return shapeCache.get(id)!;
  const def = ASSET_MAP[id];
  let s: ShapeInfo | null = null;
  if (def) {
    if (def.collider) {
      s = { cx: 0, cz: 0, hx: def.collider.hx, hz: def.collider.hz, minY: 0, maxY: def.collider.h, solid: def.solid, stand: false, ramp: false, pad: false };
    } else {
      const { min, max } = getProto(id);
      s = {
        cx: (min.x + max.x) / 2,
        cz: (min.z + max.z) / 2,
        hx: (max.x - min.x) / 2,
        hz: (max.z - min.z) / 2,
        minY: min.y,
        maxY: max.y,
        solid: def.solid,
        stand: def.walk || def.solid,
        ramp: !!def.ramp,
        pad: !!def.jumpPad,
      };
    }
  }
  shapeCache.set(id, s);
  return s;
}
