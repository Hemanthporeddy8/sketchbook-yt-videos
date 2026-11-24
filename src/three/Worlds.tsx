import * as THREE from "three";
import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { Stars } from "@react-three/drei";
import { mulberry32 } from "../lib/util";

export type WorldKind = "meadow" | "forest" | "desert" | "snow" | "island" | "city" | "space" | "village";

export interface WorldDef {
  id: string;
  name: string;
  emoji: string;
  kind: WorldKind;
  skyTop: string;
  skyBottom: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  ground: string;
  groundAlt: string;
  sunColor: string;
  sunPos: [number, number, number];
  sunDisk: string | null;
  ambient: number;
  sun: number;
  stars?: boolean;
}

export const WORLDS: WorldDef[] = [
  { id: "meadow", name: "Sunny Meadow", emoji: "🌼", kind: "meadow", skyTop: "#4f9cf0", skyBottom: "#c8e9ff", fog: "#cfe9ff", fogNear: 60, fogFar: 260, ground: "#6abf4b", groundAlt: "#3f8f2f", sunColor: "#fff4d6", sunPos: [-60, 70, -40], sunDisk: "#fff3c4", ambient: 0.55, sun: 1.6 },
  { id: "forest", name: "Misty Forest", emoji: "🌲", kind: "forest", skyTop: "#2b5d48", skyBottom: "#a7d3b4", fog: "#9fcbb0", fogNear: 20, fogFar: 140, ground: "#3a6b35", groundAlt: "#24492a", sunColor: "#e6ffd9", sunPos: [30, 60, 20], sunDisk: null, ambient: 0.45, sun: 1.1 },
  { id: "desert", name: "Golden Desert", emoji: "🏜️", kind: "desert", skyTop: "#2f6fb5", skyBottom: "#ffd9a0", fog: "#ffd9a0", fogNear: 60, fogFar: 320, ground: "#e0b15c", groundAlt: "#c48a3a", sunColor: "#fff0c2", sunPos: [-80, 60, 50], sunDisk: "#fff2b8", ambient: 0.6, sun: 1.9 },
  { id: "snow", name: "Snow Peaks", emoji: "🏔️", kind: "snow", skyTop: "#7aa6d6", skyBottom: "#eaf4ff", fog: "#eaf4ff", fogNear: 50, fogFar: 300, ground: "#f5fbff", groundAlt: "#cfe6f5", sunColor: "#ffffff", sunPos: [40, 80, -40], sunDisk: "#ffffff", ambient: 0.7, sun: 1.3 },
  { id: "island", name: "Tropical Island", emoji: "🏝️", kind: "island", skyTop: "#29a8e0", skyBottom: "#bdeeff", fog: "#a8e6ff", fogNear: 80, fogFar: 360, ground: "#f7e3a1", groundAlt: "#e8c97a", sunColor: "#fff8e1", sunPos: [-50, 70, -70], sunDisk: "#fff7d0", ambient: 0.6, sun: 1.7 },
  { id: "city", name: "Neon City Night", emoji: "🌃", kind: "city", skyTop: "#05060f", skyBottom: "#1c1640", fog: "#120f2a", fogNear: 40, fogFar: 220, ground: "#1f2937", groundAlt: "#111827", sunColor: "#8b5cf6", sunPos: [0, 80, 0], sunDisk: null, ambient: 0.35, sun: 0.7, stars: true },
  { id: "space", name: "Outer Space", emoji: "🚀", kind: "space", skyTop: "#000005", skyBottom: "#05031a", fog: "#000005", fogNear: 200, fogFar: 800, ground: "#7c7c86", groundAlt: "#4b4b55", sunColor: "#fff6e0", sunPos: [120, 60, -80], sunDisk: "#fff6e0", ambient: 0.25, sun: 2.2, stars: true },
  { id: "village", name: "Sunset Village", emoji: "🌇", kind: "village", skyTop: "#ff7e5f", skyBottom: "#feb47b", fog: "#ffc3a0", fogNear: 50, fogFar: 260, ground: "#7bbf5a", groundAlt: "#5a9e3f", sunColor: "#ffb36b", sunPos: [-90, 25, -60], sunDisk: "#ffd08a", ambient: 0.5, sun: 1.4 },
];

export const worldById = (id: string) => WORLDS.find((w) => w.id === id) ?? WORLDS[0];

/* ------------------------------------------------------------------ */
/* Terrain                                                              */
/* ------------------------------------------------------------------ */

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function groundHeight(kind: WorldKind, x: number, z: number): number {
  const d = Math.hypot(x, z);
  const flat = smooth(8, 30, d);
  switch (kind) {
    case "meadow":
      return flat * (Math.sin(x * 0.05) * 1.1 + Math.cos(z * 0.07) * 0.9 + Math.sin((x + z) * 0.02) * 2.0);
    case "forest":
      return flat * (Math.sin(x * 0.09) * 0.6 + Math.cos(z * 0.11) * 0.6 + Math.sin(x * 0.3 + z * 0.2) * 0.2);
    case "desert":
      return flat * (Math.sin(x * 0.04 + Math.sin(z * 0.03) * 2) * 2.5 + Math.cos(z * 0.05) * 0.8);
    case "snow":
      return smooth(20, 80, d) * (Math.abs(Math.sin(x * 0.035) + Math.cos(z * 0.04)) * 14 + 2 * Math.sin(z * 0.13));
    case "island":
      return 1.0 - smooth(18, 60, d) * 3.2 + 0.3 * Math.sin(x * 0.2) * Math.cos(z * 0.17);
    case "space":
      return flat * (Math.sin(x * 0.2) * 0.25 + Math.cos(z * 0.3) * 0.2 + Math.sin(x * 0.7 + z * 0.5) * 0.08);
    case "village":
      return flat * (Math.sin(x * 0.06) * 0.5 + Math.cos(z * 0.05) * 0.5);
    default:
      return 0;
  }
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                       */
/* ------------------------------------------------------------------ */

const G = {
  cyl: new THREE.CylinderGeometry(1, 1, 1, 8),
  sph: new THREE.SphereGeometry(1, 12, 10),
  cone: new THREE.ConeGeometry(1, 1, 8),
  pyr: new THREE.ConeGeometry(1, 1, 4),
  box: new THREE.BoxGeometry(1, 1, 1),
  rock: new THREE.DodecahedronGeometry(1, 0),
  oct: new THREE.OctahedronGeometry(1, 0),
};

type Item = { x: number; y: number; z: number; sx?: number; sy?: number; sz?: number; rx?: number; ry?: number; rz?: number; c?: string };

function Inst({ geo, mat, items, cast = true }: { geo: THREE.BufferGeometry; mat: THREE.Material; items: Item[]; cast?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    items.forEach((it, i) => {
      d.position.set(it.x, it.y, it.z);
      d.rotation.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0);
      d.scale.set(it.sx ?? 1, it.sy ?? 1, it.sz ?? 1);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      m.setColorAt(i, col.set(it.c ?? "#ffffff"));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [items]);
  return <instancedMesh ref={ref} args={[geo, mat, Math.max(1, items.length)]} castShadow={cast} receiveShadow />;
}

const std = (c = "#ffffff", r = 0.9, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });

function polar(r: () => number, rmin: number, rmax: number): [number, number] {
  const a = r() * Math.PI * 2;
  const d = rmin + Math.sqrt(r()) * (rmax - rmin);
  return [Math.cos(a) * d, Math.sin(a) * d];
}

const pick = <T,>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];

/* ------------------------------------------------------------------ */
/* Sky, terrain, water                                                  */
/* ------------------------------------------------------------------ */

export function SkyDome({ top, bottom }: { top: string; bottom: string }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new THREE.Color(top) }, bottom: { value: new THREE.Color(bottom) } },
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vDir; void main(){ float h = clamp(vDir.y * 1.4 + 0.15, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, pow(h, 0.7)), 1.0); }`,
      }),
    [top, bottom],
  );
  return (
    <mesh material={mat}>
      <sphereGeometry args={[420, 32, 16]} />
    </mesh>
  );
}

function Terrain({ kind, ground, groundAlt }: { kind: WorldKind; ground: string; groundAlt: string }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(900, 900, 120, 120);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const cg = new THREE.Color(ground);
    const ca = new THREE.Color(groundAlt);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = groundHeight(kind, x, z);
      pos.setY(i, h);
      const t = Math.min(1, Math.max(0, 0.5 + h * 0.12));
      const c = new THREE.Color().copy(ca).lerp(cg, t);
      if (kind === "island" && h < 0.5) c.set("#f2d28a");
      if (kind === "snow") {
        if (h > 6) c.set("#ffffff");
        else if (h > 2) c.set("#8b93a3");
      }
      if (kind === "city") c.set(i % 2 ? ground : groundAlt);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [kind, ground, groundAlt]);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.95} />
    </mesh>
  );
}

function Water() {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.5, 0]} receiveShadow>
      <planeGeometry args={[1400, 1400]} />
      <meshStandardMaterial color="#1ea7e0" roughness={0.12} metalness={0.2} transparent opacity={0.88} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Props per world                                                      */
/* ------------------------------------------------------------------ */

function MeadowProps() {
  const { trunks, canopies, flowers, rocks, clouds } = useMemo(() => {
    const r = mulberry32(11);
    const trunks: Item[] = [];
    const canopies: Item[] = [];
    for (let i = 0; i < 90; i++) {
      const [x, z] = polar(r, 14, 150);
      const s = 0.8 + r() * 0.7;
      const y = groundHeight("meadow", x, z);
      trunks.push({ x, y: y + 1.5 * s, z, sx: 0.35 * s, sy: 3 * s, sz: 0.35 * s, c: "#7a4b22" });
      canopies.push({ x, y: y + 3.8 * s, z, sx: 2.2 * s, sy: 2.4 * s, sz: 2.2 * s, c: pick(r, ["#3f9d3a", "#56b948", "#2f8a3b", "#7bc85a"]) });
    }
    const flowers: Item[] = [];
    for (let i = 0; i < 380; i++) {
      const [x, z] = polar(r, 6, 90);
      flowers.push({ x, y: groundHeight("meadow", x, z) + 0.1, z, sx: 0.12, sy: 0.12, sz: 0.12, c: pick(r, ["#fde047", "#f472b6", "#ffffff", "#a78bfa", "#fb923c"]) });
    }
    const rocks: Item[] = [];
    for (let i = 0; i < 40; i++) {
      const [x, z] = polar(r, 12, 120);
      const s = 0.5 + r() * 1.4;
      rocks.push({ x, y: groundHeight("meadow", x, z) + s * 0.25, z, sx: s, sy: s * 0.6, sz: s, ry: r() * 3, c: "#9ca3af" });
    }
    const clouds: Item[] = [];
    for (let i = 0; i < 26; i++) {
      clouds.push({ x: (r() - 0.5) * 380, y: 42 + r() * 12, z: -60 - r() * 200, sx: 8 + r() * 6, sy: 2.5, sz: 5 + r() * 3 });
    }
    return { trunks, canopies, flowers, rocks, clouds };
  }, []);
  const brown = useMemo(() => std("#ffffff", 0.9), []);
  const green = useMemo(() => std("#ffffff", 0.8), []);
  const flower = useMemo(() => std("#ffffff", 0.6), []);
  const rock = useMemo(() => std("#ffffff", 1), []);
  const cloud = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.35 }), []);
  return (
    <>
      <Inst geo={G.cyl} mat={brown} items={trunks} />
      <Inst geo={G.sph} mat={green} items={canopies} />
      <Inst geo={G.sph} mat={flower} items={flowers} />
      <Inst geo={G.rock} mat={rock} items={rocks} />
      <Inst geo={G.sph} mat={cloud} items={clouds} cast={false} />
    </>
  );
}

function ForestProps() {
  const { trunks, cones, mushrooms, logs } = useMemo(() => {
    const r = mulberry32(23);
    const trunks: Item[] = [];
    const cones: Item[] = [];
    for (let i = 0; i < 230; i++) {
      const [x, z] = polar(r, 12, 130);
      const s = 0.8 + r() * 1.1;
      const y = groundHeight("forest", x, z);
      trunks.push({ x, y: y + 1 * s, z, sx: 0.3 * s, sy: 2 * s, sz: 0.3 * s, c: "#4b2e16" });
      cones.push({ x, y: y + 3.4 * s, z, sx: 1.9 * s, sy: 4.4 * s, sz: 1.9 * s, c: pick(r, ["#1f5e33", "#24703c", "#1a4d2b", "#2d6b3f"]) });
    }
    const mushrooms: Item[] = [];
    for (let i = 0; i < 140; i++) {
      const [x, z] = polar(r, 5, 60);
      mushrooms.push({ x, y: groundHeight("forest", x, z) + 0.2, z, sx: 0.3, sy: 0.18, sz: 0.3, c: pick(r, ["#ef4444", "#f5f5f4", "#fb923c"]) });
    }
    const logs: Item[] = [];
    for (let i = 0; i < 18; i++) {
      const [x, z] = polar(r, 10, 70);
      logs.push({ x, y: groundHeight("forest", x, z) + 0.3, z, sx: 2.2, sy: 0.6, sz: 0.6, ry: r() * 3, c: "#6b4423" });
    }
    return { trunks, cones, mushrooms, logs };
  }, []);
  const white = useMemo(() => std("#ffffff"), []);
  return (
    <>
      <Inst geo={G.cyl} mat={white} items={trunks} />
      <Inst geo={G.cone} mat={white} items={cones} />
      <Inst geo={G.sph} mat={white} items={mushrooms} />
      <Inst geo={G.cyl} mat={white} items={logs} />
    </>
  );
}

function DesertProps() {
  const { cacti, arms, rocks, pyramids } = useMemo(() => {
    const r = mulberry32(37);
    const cacti: Item[] = [];
    const arms: Item[] = [];
    for (let i = 0; i < 70; i++) {
      const [x, z] = polar(r, 12, 140);
      const s = 0.8 + r() * 0.9;
      const y = groundHeight("desert", x, z);
      cacti.push({ x, y: y + 1.25 * s, z, sx: 0.3 * s, sy: 2.5 * s, sz: 0.3 * s, c: "#3d7a3a" });
      if (r() < 0.6) arms.push({ x: x + 0.3 * s, y: y + 1.3 * s, z, sx: 0.18 * s, sy: 0.7 * s, sz: 0.18 * s, rz: Math.PI / 2, c: "#3d7a3a" });
    }
    const rocks: Item[] = [];
    for (let i = 0; i < 50; i++) {
      const [x, z] = polar(r, 10, 130);
      const s = 0.6 + r() * 2.2;
      rocks.push({ x, y: groundHeight("desert", x, z) + s * 0.2, z, sx: s, sy: s * 0.7, sz: s, ry: r() * 3, c: "#b98a52" });
    }
    const pyramids: Item[] = [
      { x: -110, y: 0, z: -170, sx: 46, sy: 46, sz: 46, ry: Math.PI / 4, c: "#d4a35a" },
      { x: -40, y: 0, z: -210, sx: 30, sy: 30, sz: 30, ry: 0.2, c: "#c9974c" },
      { x: 150, y: 0, z: -120, sx: 36, sy: 36, sz: 36, ry: 0.9, c: "#dcae66" },
    ];
    return { cacti, arms, rocks, pyramids };
  }, []);
  const white = useMemo(() => std("#ffffff"), []);
  return (
    <>
      <Inst geo={G.cyl} mat={white} items={cacti} />
      <Inst geo={G.cyl} mat={white} items={arms} />
      <Inst geo={G.rock} mat={white} items={rocks} />
      <Inst geo={G.pyr} mat={white} items={pyramids} />
    </>
  );
}

function SnowProps() {
  const { pines, caps, peaks, crystals } = useMemo(() => {
    const r = mulberry32(51);
    const pines: Item[] = [];
    const caps: Item[] = [];
    for (let i = 0; i < 120; i++) {
      const [x, z] = polar(r, 12, 120);
      const s = 0.8 + r() * 0.9;
      const y = groundHeight("snow", x, z);
      pines.push({ x, y: y + 1 * s, z, sx: 0.28 * s, sy: 2 * s, sz: 0.28 * s, c: "#4a3525" });
      pines.push({ x, y: y + 3.2 * s, z, sx: 1.7 * s, sy: 4 * s, sz: 1.7 * s, c: "#1e4d3a" });
      caps.push({ x, y: y + 5.1 * s, z, sx: 0.9 * s, sy: 1.1 * s, sz: 0.9 * s, c: "#ffffff" });
    }
    const peaks: Item[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      peaks.push({ x: Math.cos(a) * 220, y: 30, z: Math.sin(a) * 220, sx: 40, sy: 60 + r() * 40, sz: 40, c: "#dbe7f2" });
    }
    const crystals: Item[] = [];
    for (let i = 0; i < 30; i++) {
      const [x, z] = polar(r, 10, 90);
      const s = 0.6 + r() * 1.2;
      crystals.push({ x, y: groundHeight("snow", x, z) + s * 0.8, z, sx: s * 0.6, sy: s * 1.6, sz: s * 0.6, ry: r() * 3, c: "#9bdcff" });
    }
    return { pines, caps, peaks, crystals };
  }, []);
  const white = useMemo(() => std("#ffffff"), []);
  const glow = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.1, metalness: 0.1, emissive: "#60a5fa", emissiveIntensity: 0.2 }), []);
  return (
    <>
      <Inst geo={G.cone} mat={white} items={pines} />
      <Inst geo={G.sph} mat={white} items={caps} />
      <Inst geo={G.box} mat={white} items={peaks} />
      <Inst geo={G.oct} mat={glow} items={crystals} />
    </>
  );
}

function IslandProps() {
  const { trunks, leaves, rocks } = useMemo(() => {
    const r = mulberry32(67);
    const trunks: Item[] = [];
    const leaves: Item[] = [];
    for (let i = 0; i < 34; i++) {
      const [x, z] = polar(r, 6, 34);
      const y = groundHeight("island", x, z);
      if (y < 0.2) continue;
      const s = 0.8 + r() * 0.5;
      trunks.push({ x, y: y + 2.5 * s, z, sx: 0.28 * s, sy: 5 * s, sz: 0.28 * s, rz: (r() - 0.5) * 0.3, c: "#8a5a2b" });
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + r();
        leaves.push({ x: x + Math.cos(a) * 1.2 * s, y: y + 5.2 * s, z: z + Math.sin(a) * 1.2 * s, sx: 2.2 * s, sy: 0.25, sz: 0.7 * s, ry: -a, rz: -0.35, c: pick(r, ["#22c55e", "#16a34a", "#4ade80"]) });
      }
    }
    const rocks: Item[] = [];
    for (let i = 0; i < 25; i++) {
      const [x, z] = polar(r, 10, 40);
      const s = 0.5 + r() * 1.3;
      rocks.push({ x, y: groundHeight("island", x, z) + s * 0.2, z, sx: s, sy: s * 0.6, sz: s, ry: r() * 3, c: "#a8a29e" });
    }
    return { trunks, leaves, rocks };
  }, []);
  const white = useMemo(() => std("#ffffff"), []);
  return (
    <>
      <Inst geo={G.cyl} mat={white} items={trunks} />
      <Inst geo={G.box} mat={white} items={leaves} />
      <Inst geo={G.rock} mat={white} items={rocks} />
    </>
  );
}

function CityProps() {
  const { blocks, signs, lamps, lampGlow } = useMemo(() => {
    const r = mulberry32(81);
    const blocks: Item[] = [];
    for (let gx = -12; gx <= 12; gx++) {
      for (let gz = -12; gz <= 12; gz++) {
        const x = gx * 14 + (r() - 0.5) * 2;
        const z = gz * 14 + (r() - 0.5) * 2;
        if (Math.abs(x) < 16 && Math.abs(z) < 16) continue;
        if (r() < 0.2) continue;
        const h = 6 + Math.pow(r(), 2) * 55;
        const w = 4 + r() * 6;
        blocks.push({ x, y: h / 2, z, sx: w, sy: h, sz: 4 + r() * 6, c: pick(r, ["#1e293b", "#273449", "#312e81", "#1f2a44", "#3b0764", "#0f172a"]) });
      }
    }
    const signs: Item[] = [];
    for (let i = 0; i < 40; i++) {
      const [x, z] = polar(r, 16, 120);
      signs.push({ x, y: 4 + r() * 18, z, sx: 2 + r() * 2.5, sy: 0.5, sz: 0.15, c: pick(r, ["#f472b6", "#22d3ee", "#a3e635", "#facc15", "#c084fc"]) });
    }
    const lamps: Item[] = [];
    const lampGlow: Item[] = [];
    for (let i = 0; i < 40; i++) {
      const [x, z] = polar(r, 8, 80);
      lamps.push({ x, y: 2.5, z, sx: 0.12, sy: 5, sz: 0.12, c: "#1f2937" });
      lampGlow.push({ x, y: 5.1, z, sx: 0.35, sy: 0.35, sz: 0.35, c: "#fde68a" });
    }
    return { blocks, signs, lamps, lampGlow };
  }, []);
  const bldg = useMemo(() => std("#ffffff", 0.6, 0.2), []);
  const neon = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff" }), []);
  const lamp = useMemo(() => std("#ffffff", 0.5), []);
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff" }), []);
  return (
    <>
      <Inst geo={G.box} mat={bldg} items={blocks} />
      <Inst geo={G.box} mat={neon} items={signs} cast={false} />
      <Inst geo={G.cyl} mat={lamp} items={lamps} />
      <Inst geo={G.sph} mat={glow} items={lampGlow} cast={false} />
    </>
  );
}

function SpaceProps() {
  const { rocks } = useMemo(() => {
    const r = mulberry32(99);
    const rocks: Item[] = [];
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2;
      const d = 20 + r() * 130;
      const s = 0.5 + r() * 3;
      rocks.push({ x: Math.cos(a) * d, y: 2 + r() * 25, z: Math.sin(a) * d, sx: s, sy: s * 0.8, sz: s, rx: r() * 3, ry: r() * 3, c: pick(r, ["#6b7280", "#4b5563", "#9ca3af", "#78716c"]) });
    }
    return { rocks };
  }, []);
  const white = useMemo(() => std("#ffffff", 0.9), []);
  const planetA = useMemo(() => std("#f97316", 0.7), []);
  const planetB = useMemo(() => std("#38bdf8", 0.6), []);
  const ring = useMemo(() => std("#fcd34d", 0.5), []);
  return (
    <>
      <Inst geo={G.rock} mat={white} items={rocks} />
      <mesh position={[-150, 60, -200]} material={planetA} castShadow>
        <sphereGeometry args={[40, 40, 30]} />
      </mesh>
      <mesh position={[-150, 60, -200]} rotation={[1.2, 0.2, 0]} material={ring}>
        <torusGeometry args={[62, 5, 8, 80]} />
      </mesh>
      <mesh position={[220, -30, -150]} material={planetB}>
        <sphereGeometry args={[26, 32, 24]} />
      </mesh>
    </>
  );
}

function VillageProps() {
  const { walls, roofs, doors, trees, canopy } = useMemo(() => {
    const r = mulberry32(123);
    const walls: Item[] = [];
    const roofs: Item[] = [];
    const doors: Item[] = [];
    const trees: Item[] = [];
    const canopy: Item[] = [];
    for (let i = 0; i < 26; i++) {
      const [x, z] = polar(r, 14, 70);
      const y = groundHeight("village", x, z);
      const rot = Math.floor(r() * 4) * (Math.PI / 2);
      const wallC = pick(r, ["#fef3c7", "#fde68a", "#fecaca", "#bbf7d0", "#bfdbfe", "#fbcfe8"]);
      walls.push({ x, y: y + 1.2, z, sx: 3, sy: 2.4, sz: 3, ry: rot, c: wallC });
      roofs.push({ x, y: y + 3.1, z, sx: 3.6, sy: 1.8, sz: 3.6, ry: rot + Math.PI / 4, c: pick(r, ["#7c2d12", "#991b1b", "#1e3a8a", "#4b5563"]) });
      const fx = Math.sin(rot) * 1.52;
      const fz = Math.cos(rot) * 1.52;
      doors.push({ x: x + fx, y: y + 0.7, z: z + fz, sx: 0.8, sy: 1.4, sz: 0.12, ry: rot, c: "#451a03" });
    }
    for (let i = 0; i < 45; i++) {
      const [x, z] = polar(r, 10, 90);
      const y = groundHeight("village", x, z);
      trees.push({ x, y: y + 1.2, z, sx: 0.3, sy: 2.4, sz: 0.3, c: "#6b4423" });
      canopy.push({ x, y: y + 3.2, z, sx: 2, sy: 2.2, sz: 2, c: pick(r, ["#4d7c0f", "#65a30d", "#3f6212"]) });
    }
    return { walls, roofs, doors, trees, canopy };
  }, []);
  const white = useMemo(() => std("#ffffff"), []);
  return (
    <>
      <Inst geo={G.box} mat={white} items={walls} />
      <Inst geo={G.pyr} mat={white} items={roofs} />
      <Inst geo={G.box} mat={white} items={doors} cast={false} />
      <Inst geo={G.cyl} mat={white} items={trees} />
      <Inst geo={G.sph} mat={white} items={canopy} />
    </>
  );
}

const PROPS: Record<WorldKind, () => ReactNode> = {
  meadow: MeadowProps,
  forest: ForestProps,
  desert: DesertProps,
  snow: SnowProps,
  island: IslandProps,
  city: CityProps,
  space: SpaceProps,
  village: VillageProps,
};

/* ------------------------------------------------------------------ */
/* Environment                                                          */
/* ------------------------------------------------------------------ */

export function WorldEnvironment({ world }: { world: WorldDef }) {
  const Props = PROPS[world.kind];
  const sunPos = useMemo(() => new THREE.Vector3(...world.sunPos).normalize().multiplyScalar(330), [world]);
  return (
    <>
      <SkyDome top={world.skyTop} bottom={world.skyBottom} />
      <fog attach="fog" args={[world.fog, world.fogNear, world.fogFar]} />
      <Terrain kind={world.kind} ground={world.ground} groundAlt={world.groundAlt} />
      {world.kind === "island" && <Water />}
      {world.stars && <Stars radius={260} depth={60} count={4000} factor={4} saturation={0} fade speed={0.4} />}
      {world.sunDisk && (
        <mesh position={sunPos}>
          <sphereGeometry args={[14, 20, 16]} />
          <meshBasicMaterial color={world.sunDisk} fog={false} />
        </mesh>
      )}
      <Props />
    </>
  );
}
