import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mulberry32 } from "../lib/util";

export const darker = (c: string, k = 0.7) => "#" + new THREE.Color(c).multiplyScalar(k).getHexString();

export function mat(color: string, o: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05, ...o });
}
export function glass() {
  return new THREE.MeshStandardMaterial({ color: "#a5d8ff", transparent: true, opacity: 0.42, roughness: 0.08, metalness: 0.2, side: THREE.DoubleSide });
}
export function glow(c: string) {
  return new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.9, roughness: 0.4 });
}

/** Adds a mesh at a centre position. */
export function add(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  m: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  rx = 0,
  ry = 0,
  rz = 0,
) {
  const me = new THREE.Mesh(geo, m);
  me.position.set(x, y, z);
  me.rotation.set(rx, ry, rz);
  me.castShadow = true;
  me.receiveShadow = true;
  parent.add(me);
  return me;
}

/** Box whose BOTTOM-centre sits at (x, y, z). */
export function box(p: THREE.Object3D, w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  return add(p, new THREE.BoxGeometry(w, h, d), m, x, y + h / 2, z, rx, ry, rz);
}

/** Cylinder: upright (bottom-centre at y) or laid down on the x / z axis (centre at y). */
export function cyl(p: THREE.Object3D, rt: number, rb: number, h: number, m: THREE.Material, x = 0, y = 0, z = 0, lay: "y" | "x" | "z" = "y", seg = 16) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  if (lay === "y") return add(p, g, m, x, y + h / 2, z);
  if (lay === "x") return add(p, g, m, x, y, z, 0, 0, Math.PI / 2);
  return add(p, g, m, x, y, z, Math.PI / 2, 0, 0);
}

export function ball(p: THREE.Object3D, r: number, m: THREE.Material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const me = add(p, new THREE.SphereGeometry(r, 20, 14), m, x, y, z);
  me.scale.set(sx, sy, sz);
  return me;
}

/** Gable roof: ridge runs along Z, base at y = 0. */
export function prismRoof(w: number, h: number, d: number) {
  const v: number[] = [];
  const P = (x: number, y: number, z: number) => v.push(x, y, z);
  const hw = w / 2;
  const hd = d / 2;
  P(-hw, 0, -hd); P(0, h, -hd); P(0, h, hd);
  P(-hw, 0, -hd); P(0, h, hd); P(-hw, 0, hd);
  P(hw, 0, -hd); P(hw, 0, hd); P(0, h, hd);
  P(hw, 0, -hd); P(0, h, hd); P(0, h, -hd);
  P(-hw, 0, -hd); P(hw, 0, -hd); P(0, h, -hd);
  P(-hw, 0, hd); P(0, h, hd); P(hw, 0, hd);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

/** Ramp wedge: low at -Z, high (height h) at +Z, base at y = 0. */
export function wedge(w: number, h: number, d: number) {
  const hw = w / 2;
  const hd = d / 2;
  const A = [-hw, 0, -hd], B = [-hw, 0, hd], C = [-hw, h, hd];
  const A2 = [hw, 0, -hd], B2 = [hw, 0, hd], C2 = [hw, h, hd];
  const v: number[] = [];
  const tri = (p: number[][]) => p.forEach((q) => v.push(q[0], q[1], q[2]));
  tri([A, B, C]);
  tri([A2, C2, B2]);
  tri([A, B, B2]); tri([A, B2, A2]);
  tri([B, C, C2]); tri([B, C2, B2]);
  tri([A, A2, C2]); tri([A, C2, C]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

function merge(list: THREE.BufferGeometry[]) {
  if (!list.length) return null;
  return mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)), false);
}

export interface TreeSpec {
  trunk: string;
  leaves: string[];
  shape: "oak" | "pine" | "snowpine" | "birch" | "palm" | "willow" | "cypress" | "dead" | "bush";
  height: number;
  seed: number;
}

/** Procedural tree: tapered trunk, recursive branches and leaf clusters, merged for speed. */
export function buildTree(s: TreeSpec): THREE.Group {
  const out = new THREE.Group();
  const rnd = mulberry32(s.seed);
  const r = (a: number, b: number) => a + rnd() * (b - a);
  const H = s.height;
  const trunk: THREE.BufferGeometry[] = [];
  const bins: THREE.BufferGeometry[][] = s.leaves.map(() => []);
  const hasLeaves = s.leaves.length > 0;
  const bin = (i: number) => bins[i % bins.length];

  const seg = (a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number) => {
    const len = Math.max(0.01, a.distanceTo(b));
    const g = new THREE.CylinderGeometry(r1, r0, len, 6, 1);
    g.translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
    g.translate(a.x, a.y, a.z);
    return g;
  };

  const blob = (c: THREE.Vector3, rad: number, list: THREE.BufferGeometry[], sy = 1) => {
    if (!hasLeaves) return;
    const g = new THREE.IcosahedronGeometry(rad, 1);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const k = 1 + (rnd() - 0.5) * 0.4;
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * sy, p.getZ(i) * k);
    }
    g.translate(c.x, c.y, c.z);
    list.push(g);
  };

  const broad = () => {
    const thick = 0.12 + H * 0.03;
    const top = new THREE.Vector3(0, H * (s.shape === "birch" ? 0.72 : 0.42), 0);
    trunk.push(seg(new THREE.Vector3(0, 0, 0), top, thick * 1.25, thick));

    const grow = (a: THREE.Vector3, dir: THREE.Vector3, len: number, rad: number, depth: number, idx: number) => {
      const b = a.clone().addScaledVector(dir, len);
      trunk.push(seg(a, b, rad, rad * 0.7));
      if (depth <= 0) {
        blob(b, H * 0.13 + len * 0.3, bin(idx));
        return;
      }
      const n = 2 + Math.floor(rnd() * 2);
      for (let i = 0; i < n; i++) {
        const d = dir.clone().add(new THREE.Vector3(r(-0.6, 0.6), r(0.2, 0.7), r(-0.6, 0.6))).normalize();
        grow(b, d, len * r(0.6, 0.8), rad * 0.66, depth - 1, idx + i);
      }
    };
    const branches = s.shape === "dead" ? 5 : 4;
    for (let i = 0; i < branches; i++) {
      const d = new THREE.Vector3(r(-0.7, 0.7), r(0.5, 1), r(-0.7, 0.7)).normalize();
      grow(top, d, H * r(0.22, 0.32), thick * 0.8, s.shape === "dead" ? 1 : 2, i);
    }

    if (s.shape === "birch") {
      for (let i = 0; i < 14; i++) {
        blob(new THREE.Vector3(r(-0.9, 0.9) * H * 0.22, top.y + r(-0.2, 1.1) * H * 0.25, r(-0.9, 0.9) * H * 0.22), H * r(0.08, 0.12), bin(i));
      }
    } else if (s.shape === "willow") {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        blob(new THREE.Vector3(Math.cos(a) * H * 0.3, top.y - H * 0.15 - rnd() * H * 0.15, Math.sin(a) * H * 0.3), H * 0.14, bin(0), 1.7);
      }
      blob(top.clone().add(new THREE.Vector3(0, H * 0.08, 0)), H * 0.22, bin(0));
    } else if (s.shape !== "dead") {
      blob(top.clone().add(new THREE.Vector3(0, H * 0.12, 0)), H * 0.28, bin(0));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + rnd() * 0.5;
        blob(new THREE.Vector3(Math.cos(a) * H * 0.22, top.y + H * r(0, 0.15), Math.sin(a) * H * 0.22), H * 0.18, bin(i + 1));
      }
    }
  };

  if (s.shape === "pine" || s.shape === "snowpine") {
    trunk.push(seg(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, H * 0.4, 0), 0.16, 0.1));
    for (let i = 0; i < 6; i++) {
      const t = i / 6;
      const rad = H * 0.34 * (1 - t * 0.78);
      const hh = H * 0.3 * (1 - t * 0.25);
      const cg = new THREE.ConeGeometry(rad, hh, 9);
      cg.translate(0, H * 0.28 + i * H * 0.1 + hh / 2, 0);
      bin(0).push(cg);
    }
    if (s.shape === "snowpine") {
      const tip = new THREE.ConeGeometry(H * 0.08, H * 0.2, 9);
      tip.translate(0, H * 0.28 + 6 * H * 0.1, 0);
      bin(1).push(tip);
    }
  } else if (s.shape === "cypress") {
    trunk.push(seg(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, H * 0.1, 0), 0.08, 0.06));
    const cg = new THREE.ConeGeometry(H * 0.12, H * 0.9, 10);
    cg.translate(0, H * 0.1 + H * 0.45, 0);
    bin(0).push(cg);
  } else if (s.shape === "palm") {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 7; i++) {
      const t = i / 7;
      pts.push(new THREE.Vector3(t * t * H * 0.18, t * H * 0.8, 0));
    }
    for (let i = 0; i < 7; i++) trunk.push(seg(pts[i], pts[i + 1], 0.2 - i * 0.012, 0.19 - (i + 1) * 0.012));
    const top = pts[7];
    for (let k = 0; k < 9; k++) {
      const fg = new THREE.PlaneGeometry(H * 0.16, H * 0.42, 1, 1);
      fg.translate(0, -H * 0.21, 0);
      const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-0.8 - rnd() * 0.3, (k / 9) * Math.PI * 2 + rnd() * 0.3, 0));
      fg.applyMatrix4(m);
      fg.translate(top.x, top.y, top.z);
      bin(0).push(fg);
    }
  } else if (s.shape === "bush") {
    for (let i = 0; i < 5; i++) {
      blob(new THREE.Vector3(r(-H * 0.25, H * 0.25), H * 0.22, r(-H * 0.25, H * 0.25)), H * r(0.16, 0.24), bin(i));
    }
  } else {
    broad();
  }

  const tg = merge(trunk);
  if (tg) {
    const me = new THREE.Mesh(tg, mat(s.trunk));
    me.castShadow = true;
    me.receiveShadow = true;
    out.add(me);
  }
  bins.forEach((list, i) => {
    const lg = merge(list);
    if (!lg) return;
    const me = new THREE.Mesh(lg, mat(s.leaves[i], { side: s.shape === "palm" ? THREE.DoubleSide : THREE.FrontSide }));
    me.castShadow = true;
    me.receiveShadow = true;
    out.add(me);
  });
  return out;
}
