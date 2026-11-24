import * as THREE from "three";
import type { CharacterConfig, RigType } from "../lib/types";

/* ------------------------------------------------------------------ */
/* Face state (driven by expressions, auto-blink, or mocap blendshapes) */
/* ------------------------------------------------------------------ */

export interface FaceState {
  blinkL: number;
  blinkR: number;
  jaw: number;
  smile: number;
  frown: number;
  browUp: number;
  angry: number;
  wide: number;
  lookX: number;
  lookY: number;
}

export const NEUTRAL_FACE: FaceState = {
  blinkL: 0, blinkR: 0, jaw: 0, smile: 0, frown: 0, browUp: 0, angry: 0, wide: 0, lookX: 0, lookY: 0,
};

export const EXPRESSIONS: Record<string, Partial<FaceState>> = {
  neutral: {},
  happy: { smile: 0.9 },
  sad: { frown: 0.8, browUp: 0.4 },
  angry: { angry: 1, frown: 0.3 },
  surprised: { wide: 1, jaw: 0.35, browUp: 1 },
  sleepy: { blinkL: 0.6, blinkR: 0.6 },
  wink: { blinkL: 1 },
  laugh: { smile: 1, wide: 0.3, jaw: 0.5 },
  cry: { frown: 1, browUp: 0.8, blinkL: 0.3, blinkR: 0.3 },
  love: { smile: 0.7, wide: 0.5 },
  smirk: { smile: 0.5, browUp: 0.2 },
  bored: { blinkL: 0.5, blinkR: 0.5, frown: 0.2 },
  evil: { angry: 0.8, smile: 0.7 },
  shock: { wide: 1, jaw: 0.6, browUp: 1 },
  think: { browUp: 0.5, frown: 0.2 },
  disgust: { frown: 0.6, angry: 0.4, jaw: 0.1 },
  talk: {},
};

export interface FaceRig {
  eyes: THREE.Group[];
  pupils: THREE.Object3D[];
  mouth: THREE.Mesh;
  browL?: THREE.Mesh;
  browR?: THREE.Mesh;
  browY: number;
  mouthY: number;
}

export interface RigInstance {
  type: RigType;
  root: THREE.Group;
  bones: Record<string, THREE.Object3D>;
  rootBone: string;
  restY: Record<string, number>;
  face: FaceRig;
  rest?: Record<string, THREE.Vector3>;
  cur?: Record<string, [number, number, number]>;
  curPy?: number;
  body?: THREE.Object3D;
  dispose: () => void;
}

/** Live registry of built rigs so mocap can solve poses against the target rig. */
export const rigRegistry = new Map<string, RigInstance>();

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const M = (color: string, rough = 0.65, metal = 0.05) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

const Mesh = (
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  p: [number, number, number] = [0, 0, 0],
  r?: [number, number, number],
) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(p[0], p[1], p[2]);
  if (r) m.rotation.set(r[0], r[1], r[2]);
  m.castShadow = true;
  return m;
};

const darker = (hex: string, k = 0.7) => "#" + new THREE.Color(hex).multiplyScalar(k).getHexString();

function disposeTree(o: THREE.Object3D) {
  o.traverse((c) => {
    if (c instanceof THREE.Mesh) {
      c.geometry.dispose();
      const m = c.material;
      (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());
    }
  });
}

function makeBoneFactory(bones: Record<string, THREE.Object3D>) {
  return (name: string, parent: THREE.Object3D, x: number, y: number, z: number) => {
    const o = new THREE.Object3D();
    o.name = name;
    o.position.set(x, y, z);
    parent.add(o);
    bones[name] = o;
    return o;
  };
}

interface FaceOpts {
  eyes: { x: number; y: number; z: number; r: number }[];
  eyeColor: string;
  brows: boolean;
  browColor?: string;
  browX?: number;
  browY?: number;
  browZ?: number;
  mouth: { x: number; y: number; z: number };
}

function buildFace(parent: THREE.Object3D, o: FaceOpts): FaceRig {
  const eyes: THREE.Group[] = [];
  const pupils: THREE.Object3D[] = [];
  const white = M("#ffffff", 0.3, 0);
  const pupilMat = M(o.eyeColor, 0.3, 0);
  for (const e of o.eyes) {
    const g = new THREE.Group();
    g.position.set(e.x, e.y, e.z);
    g.add(Mesh(new THREE.SphereGeometry(e.r, 16, 12), white));
    const p = Mesh(new THREE.SphereGeometry(e.r * 0.5, 12, 10), pupilMat, [0, 0, e.r * 0.82]);
    g.add(p);
    parent.add(g);
    eyes.push(g);
    pupils.push(p);
  }
  const mouth = Mesh(new THREE.SphereGeometry(0.05, 14, 10), M("#5b1f1f", 0.5), [o.mouth.x, o.mouth.y, o.mouth.z]);
  mouth.scale.set(1.4, 0.3, 0.4);
  mouth.castShadow = false;
  parent.add(mouth);
  let browL: THREE.Mesh | undefined;
  let browR: THREE.Mesh | undefined;
  if (o.brows) {
    const bm = M(o.browColor ?? "#222222", 0.8);
    const bx = o.browX ?? 0.085;
    const by = o.browY ?? 0.07;
    const bz = o.browZ ?? 0.2;
    browL = Mesh(new THREE.BoxGeometry(0.075, 0.02, 0.03), bm, [bx, by, bz]);
    browR = Mesh(new THREE.BoxGeometry(0.075, 0.02, 0.03), bm, [-bx, by, bz]);
    parent.add(browL, browR);
  }
  return { eyes, pupils, mouth, browL, browR, browY: o.browY ?? 0.07, mouthY: o.mouth.y };
}

/** Applies a face state onto the built face parts. */
export function applyFace(face: FaceRig, s: FaceState) {
  const L = face.eyes[0];
  const R = face.eyes[1];
  if (R) {
    L.scale.y = Math.max(0.07, (1 - s.blinkL) * (1 + s.wide * 0.35));
    R.scale.y = Math.max(0.07, (1 - s.blinkR) * (1 + s.wide * 0.35));
  } else if (L) {
    const b = Math.max(s.blinkL, s.blinkR);
    L.scale.y = Math.max(0.07, (1 - b) * (1 + s.wide * 0.35));
  }
  for (const p of face.pupils) {
    p.position.x = s.lookX * 0.012;
    p.position.y = s.lookY * 0.012;
  }
  face.mouth.scale.set(1.4 + s.smile * 0.6 - s.frown * 0.3, 0.3 + s.jaw * 2.4 + s.wide * 0.3, 0.4);
  face.mouth.position.y = face.mouthY - s.frown * 0.008;
  if (face.browL && face.browR) {
    const up = s.browUp * 0.03 - s.angry * 0.01;
    face.browL.position.y = face.browY + up;
    face.browR.position.y = face.browY + up;
    const tilt = s.angry * 0.45 - s.frown * 0.3;
    face.browL.rotation.z = tilt;
    face.browR.rotation.z = -tilt;
  }
}

/* ------------------------------------------------------------------ */
/* Human rig                                                           */
/* ------------------------------------------------------------------ */

export const HUMAN_PARENT: Record<string, string | null> = {
  hips: null,
  spine: "hips",
  neck: "spine",
  head: "neck",
  lUpperArm: "spine",
  lLowerArm: "lUpperArm",
  lHand: "lLowerArm",
  rUpperArm: "spine",
  rLowerArm: "rUpperArm",
  rHand: "rLowerArm",
  lUpperLeg: "hips",
  lLowerLeg: "lUpperLeg",
  lFoot: "lLowerLeg",
  rUpperLeg: "hips",
  rLowerLeg: "rUpperLeg",
  rFoot: "rLowerLeg",
};

export const HUMAN_ORDER = [
  "hips", "spine", "neck", "head",
  "lUpperArm", "lLowerArm", "lHand",
  "rUpperArm", "rLowerArm", "rHand",
  "lUpperLeg", "lLowerLeg", "lFoot",
  "rUpperLeg", "rLowerLeg", "rFoot",
];

function buildHuman(c: CharacterConfig): RigInstance {
  const root = new THREE.Group();
  const bones: Record<string, THREE.Object3D> = {};
  const B = makeBoneFactory(bones);

  const skin = M(c.skin);
  const top = M(c.top);
  const bottom = M(c.bottom);
  const shoes = M(c.shoes);
  const hair = M(c.hair, 0.8);
  const accent = M(c.accessoryColor);
  const bw = 0.42 * c.build;
  const shX = bw / 2 + 0.04;

  const hips = B("hips", root, 0, 0.95, 0);
  const spine = B("spine", hips, 0, 0.12, 0);
  const neck = B("neck", spine, 0, 0.55, 0);
  const head = B("head", neck, 0, 0.22, 0);
  head.scale.setScalar(c.headScale);

  spine.add(Mesh(new THREE.BoxGeometry(bw, 0.55, 0.26 * c.build), top, [0, 0.275, 0]));
  hips.add(Mesh(new THREE.BoxGeometry(bw * 0.9, 0.16, 0.24), bottom, [0, -0.02, 0]));
  neck.add(Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 12), skin, [0, -0.03, 0]));

  for (const side of [1, -1]) {
    const p = side > 0 ? "l" : "r";
    const up = B(`${p}UpperArm`, spine, side * shX, 0.5, 0);
    spine.add(Mesh(new THREE.SphereGeometry(0.07, 12, 10), top, [side * shX, 0.5, 0]));
    up.add(Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.32, 10), top, [0, -0.16, 0]));
    const lo = B(`${p}LowerArm`, up, 0, -0.32, 0);
    lo.add(Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.3, 10), top, [0, -0.15, 0]));
    const hand = B(`${p}Hand`, lo, 0, -0.3, 0);
    hand.add(Mesh(new THREE.SphereGeometry(0.06, 12, 10), skin, [0, -0.06, 0]));

    const legX = 0.1 * c.build;
    const ul = B(`${p}UpperLeg`, hips, side * legX, -0.02, 0);
    ul.add(Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.42, 10), bottom, [0, -0.21, 0]));
    const ll = B(`${p}LowerLeg`, ul, 0, -0.42, 0);
    ll.add(Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.4, 10), bottom, [0, -0.2, 0]));
    const foot = B(`${p}Foot`, ll, 0, -0.42, 0);
    foot.add(Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.27), shoes, [0, -0.04, 0.05]));
  }

  // Head
  head.add(Mesh(new THREE.SphereGeometry(0.22, 28, 20), skin));
  for (const s of [1, -1]) head.add(Mesh(new THREE.SphereGeometry(0.05, 10, 8), skin, [s * 0.215, 0, 0]));
  head.add(Mesh(new THREE.SphereGeometry(0.035, 10, 8), skin, [0, -0.02, 0.215]));
  const eyeX = 0.085;
  const eyeY = 0.025;
  const eyeZ = Math.sqrt(0.22 * 0.22 - eyeX * eyeX - eyeY * eyeY) - 0.01;
  const face = buildFace(head, {
    eyes: [
      { x: eyeX, y: eyeY, z: eyeZ, r: 0.042 },
      { x: -eyeX, y: eyeY, z: eyeZ, r: 0.042 },
    ],
    eyeColor: c.eyeColor,
    brows: true,
    browColor: c.hair,
    browX: 0.085,
    browY: 0.075,
    browZ: 0.218,
    mouth: { x: 0, y: -0.085, z: 0.2 },
  });

  // Hair
  switch (c.hairStyle) {
    case 1:
      head.add(Mesh(new THREE.SphereGeometry(0.232, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, [0, 0.05, -0.03]));
      break;
    case 2:
      head.add(Mesh(new THREE.SphereGeometry(0.232, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, [0, 0.05, -0.03]));
      head.add(Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.12), hair, [0, -0.18, -0.15]));
      break;
    case 3:
      head.add(Mesh(new THREE.SphereGeometry(0.2, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, [0, 0.04, -0.02]));
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const cone = Mesh(new THREE.ConeGeometry(0.045, 0.16, 8), hair, [Math.cos(a) * 0.1, 0.25, Math.sin(a) * 0.1 - 0.02]);
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(a) * 0.5, 1, Math.sin(a) * 0.5).normalize());
        head.add(cone);
      }
      break;
    case 4:
      head.add(Mesh(new THREE.SphereGeometry(0.232, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, [0, 0.05, -0.03]));
      head.add(Mesh(new THREE.SphereGeometry(0.09, 16, 12), hair, [0, 0.27, -0.12]));
      break;
    case 5:
      head.add(Mesh(new THREE.SphereGeometry(0.3, 24, 16), hair, [0, 0.06, -0.1]));
      break;
    default:
      break;
  }

  // Hat
  const hatMat = M(c.hatColor);
  const hatGroup = new THREE.Group();
  head.add(hatGroup);
  switch (c.hat) {
    case 1:
      hatGroup.add(Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 20), hatMat, [0, 0.2, 0]));
      hatGroup.add(Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.14), hatMat, [0, 0.2, 0.2]));
      break;
    case 2:
      hatGroup.add(Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.3, 20), M("#111827", 0.4), [0, 0.35, 0]));
      hatGroup.add(Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 24), M("#111827", 0.4), [0, 0.2, 0]));
      break;
    case 3: {
      hatGroup.add(Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.09, 20), M("#facc15", 0.3, 0.4), [0, 0.25, 0]));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        hatGroup.add(Mesh(new THREE.ConeGeometry(0.04, 0.1, 6), M("#facc15", 0.3, 0.4), [Math.cos(a) * 0.17, 0.34, Math.sin(a) * 0.17]));
      }
      break;
    }
    case 4:
      hatGroup.add(Mesh(new THREE.SphereGeometry(0.235, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), hatMat, [0, 0.05, 0]));
      hatGroup.add(Mesh(new THREE.SphereGeometry(0.05, 10, 8), M("#ffffff"), [0, 0.29, 0]));
      break;
    case 5:
      hatGroup.add(Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.03, 24), hatMat, [0, 0.2, 0]));
      hatGroup.add(Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.2, 20), hatMat, [0, 0.3, 0]));
      break;
    case 6:
      hatGroup.add(Mesh(new THREE.ConeGeometry(0.12, 0.35, 16), hatMat, [0, 0.38, 0]));
      hatGroup.add(Mesh(new THREE.SphereGeometry(0.03, 8, 6), M("#ffffff"), [0, 0.56, 0]));
      break;
    case 7:
      hatGroup.add(Mesh(new THREE.ConeGeometry(0.22, 0.6, 20), M("#4c1d95"), [0, 0.5, 0]));
      hatGroup.add(Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 24), M("#4c1d95"), [0, 0.2, 0]));
      break;
    case 8:
      hatGroup.add(Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 6), M("#9ca3af", 0.3, 0.6), [0.08, 0.36, 0]));
      hatGroup.add(Mesh(new THREE.SphereGeometry(0.03, 8, 6), M("#ef4444"), [0.08, 0.52, 0]));
      break;
    case 9:
      hatGroup.add(Mesh(new THREE.TorusGeometry(0.2, 0.02, 8, 32), M("#facc15", 0.2, 0.6), [0, 0.36, 0], [Math.PI / 2, 0, 0]));
      break;
    default:
      break;
  }

  // Accessories
  switch (c.accessory) {
    case 1: {
      const rimMat = M("#111827", 0.3, 0.3);
      for (const s of [1, -1]) {
        head.add(Mesh(new THREE.TorusGeometry(0.05, 0.008, 8, 16), rimMat, [s * eyeX, eyeY, eyeZ + 0.01]));
      }
      head.add(Mesh(new THREE.BoxGeometry(0.04, 0.01, 0.01), rimMat, [0, eyeY, eyeZ + 0.01]));
      break;
    }
    case 2: {
      const tie = new THREE.Group();
      tie.position.set(0, -0.1, 0.13);
      tie.add(Mesh(new THREE.ConeGeometry(0.05, 0.07, 8), accent, [0.04, 0, 0], [0, 0, -Math.PI / 2]));
      tie.add(Mesh(new THREE.ConeGeometry(0.05, 0.07, 8), accent, [-0.04, 0, 0], [0, 0, Math.PI / 2]));
      tie.add(Mesh(new THREE.SphereGeometry(0.02, 8, 6), accent));
      neck.add(tie);
      break;
    }
    case 3:
      spine.add(Mesh(new THREE.BoxGeometry(bw * 1.05, 0.6, 0.02), accent, [0, 0.25, -0.16]));
      break;
    case 4:
      spine.add(Mesh(new THREE.BoxGeometry(0.3 * c.build, 0.36, 0.14), accent, [0, 0.3, -0.2]));
      break;
    case 5:
      head.add(Mesh(new THREE.TorusGeometry(0.24, 0.03, 8, 24, Math.PI), M("#111827", 0.4), [0, 0, 0]));
      for (const s of [1, -1]) head.add(Mesh(new THREE.SphereGeometry(0.07, 12, 10), accent, [s * 0.24, 0, 0]));
      break;
    case 6:
      neck.add(Mesh(new THREE.TorusGeometry(0.13, 0.04, 8, 20), accent, [0, -0.06, 0], [Math.PI / 2, 0, 0]));
      break;
    default:
      break;
  }

  // Wings, horns, tail
  if (c.wings) {
    for (const s of [1, -1]) {
      spine.add(Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.32), accent, [s * 0.28, 0.3, -0.18], [0, 0, s * -0.3]));
    }
  }
  if (c.horns) {
    for (const s of [1, -1]) {
      head.add(Mesh(new THREE.ConeGeometry(0.03, 0.14, 8), M("#e5e7eb", 0.4), [s * 0.1, 0.3, 0], [0, 0, s * -0.35]));
    }
  }
  if (c.tail) {
    hips.add(Mesh(new THREE.ConeGeometry(0.05, 0.5, 8), top, [0, 0.05, -0.28], [-Math.PI / 2 + 0.4, 0, 0]));
  }

  const rest: Record<string, THREE.Vector3> = {
    hips: new THREE.Vector3(1, 0, 0),
    spine: new THREE.Vector3(0, 1, 0),
  };
  const limbPairs: [string, string][] = [
    ["lUpperArm", "lLowerArm"], ["lLowerArm", "lHand"],
    ["rUpperArm", "rLowerArm"], ["rLowerArm", "rHand"],
    ["lUpperLeg", "lLowerLeg"], ["lLowerLeg", "lFoot"],
    ["rUpperLeg", "rLowerLeg"], ["rLowerLeg", "rFoot"],
  ];
  for (const [a, b] of limbPairs) rest[a] = bones[b].position.clone().normalize();

  return {
    type: "human",
    root,
    bones,
    rootBone: "hips",
    restY: { hips: hips.position.y },
    face,
    rest,
    dispose: () => disposeTree(root),
  };
}

/* ------------------------------------------------------------------ */
/* Quadruped (animals & dragons)                                        */
/* ------------------------------------------------------------------ */

function buildQuadruped(c: CharacterConfig): RigInstance {
  const root = new THREE.Group();
  const bones: Record<string, THREE.Object3D> = {};
  const B = makeBoneFactory(bones);
  const bw = c.build;
  const bodyMat = M(c.bodyColor);
  const belly = M(c.bellyColor);
  const dark = M(darker(c.bodyColor, 0.55));

  const body = B("body", root, 0, 0.66, 0);
  const cap = new THREE.CapsuleGeometry(0.2 * bw, 0.5, 6, 12);
  cap.rotateX(Math.PI / 2);
  body.add(Mesh(cap, bodyMat));
  const bellyMesh = Mesh(new THREE.SphereGeometry(0.19 * bw, 16, 12), belly, [0, -0.07, 0.04]);
  bellyMesh.scale.set(0.75, 0.8, 1.25);
  body.add(bellyMesh);

  if (c.spots) {
    const pts = [[0.1, 0.08, 0.1], [-0.12, 0.1, -0.05], [0.05, 0.16, -0.18], [-0.1, 0.02, 0.22], [0.14, -0.02, -0.12]];
    for (const p of pts) {
      const v = new THREE.Vector3(p[0], p[1], p[2]).normalize().multiplyScalar(0.19 * bw);
      body.add(Mesh(new THREE.SphereGeometry(0.055 * bw, 10, 8), dark, [v.x, v.y, v.z]));
    }
  }

  const legs: [string, number, number][] = [
    ["fl", 0.14, 0.3],
    ["fr", -0.14, 0.3],
    ["bl", 0.14, -0.3],
    ["br", -0.14, -0.3],
  ];
  for (const [p, x, z] of legs) {
    const up = B(`${p}_up`, body, x * bw, -0.12, z);
    up.add(Mesh(new THREE.CylinderGeometry(0.05 * bw, 0.045 * bw, 0.26, 10), bodyMat, [0, -0.13, 0]));
    const lo = B(`${p}_lo`, up, 0, -0.26, 0);
    lo.add(Mesh(new THREE.CylinderGeometry(0.045 * bw, 0.04 * bw, 0.26, 10), bodyMat, [0, -0.13, 0]));
    lo.add(Mesh(new THREE.BoxGeometry(0.1 * bw, 0.06, 0.16), dark, [0, -0.25, 0.02]));
  }

  // Neck & head
  const neck = B("neck", body, 0, 0.12, 0.36);
  neck.add(Mesh(new THREE.CylinderGeometry(0.09 * bw, 0.1 * bw, 0.24, 12), bodyMat, [0, 0.1, 0.06], [0.5, 0, 0]));
  const head = B("head", neck, 0, 0.17, 0.1);
  const R = 0.2 * bw;
  head.add(Mesh(new THREE.SphereGeometry(R, 20, 16), bodyMat));

  const depth = 0.08 + c.snout * 0.35;
  head.add(Mesh(new THREE.BoxGeometry(0.15 * bw, 0.12, depth), belly, [0, -0.05, 0.17 + depth / 2 - 0.04]));
  head.add(Mesh(new THREE.SphereGeometry(0.035, 10, 8), M("#111827", 0.4), [0, 0.0, 0.17 + depth - 0.03]));

  const eyeX = 0.08 * bw;
  const eyeY = 0.04;
  const eyeZ = Math.sqrt(R * R - eyeX * eyeX - eyeY * eyeY) - 0.01;
  const face = buildFace(head, {
    eyes: [
      { x: eyeX, y: eyeY, z: eyeZ, r: 0.04 },
      { x: -eyeX, y: eyeY, z: eyeZ, r: 0.04 },
    ],
    eyeColor: c.eyeColor,
    brows: false,
    mouth: { x: 0, y: -0.09, z: 0.17 },
  });

  // Ears
  const earMat = bodyMat;
  for (const s of [1, -1]) {
    switch (c.earStyle) {
      case 0:
        head.add(Mesh(new THREE.ConeGeometry(0.06 * bw, 0.14, 8), earMat, [s * 0.12 * bw, 0.19, 0], [0, 0, -s * 0.2]));
        break;
      case 1:
        head.add(Mesh(new THREE.SphereGeometry(0.06 * bw, 10, 8), earMat, [s * 0.13 * bw, 0.17, -0.02]));
        break;
      case 2:
        head.add(Mesh(new THREE.BoxGeometry(0.07, 0.17, 0.09), dark, [s * 0.2 * bw, 0.0, -0.01], [0, 0, -s * 0.2]));
        break;
      default:
        head.add(Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), earMat, [s * 0.07 * bw, 0.3, -0.03], [0, 0, -s * 0.1]));
        break;
    }
  }

  if (c.horns) {
    for (const s of [1, -1]) head.add(Mesh(new THREE.ConeGeometry(0.04, 0.2, 8), M("#e5e7eb", 0.4), [s * 0.1, 0.2, -0.04], [0, 0, -s * 0.4]));
  }

  if (c.wings) {
    const wingMat = M(darker(c.bodyColor, 0.7));
    for (const s of [1, -1]) {
      body.add(Mesh(new THREE.BoxGeometry(0.9, 0.02, 0.45), wingMat, [s * 0.45 * bw, 0.22, -0.1], [0, 0, s * 0.25]));
    }
  }

  // Tail
  const tail = B("tail", body, 0, 0.05, -0.42);
  switch (c.tailStyle) {
    case 1:
      tail.add(Mesh(new THREE.CylinderGeometry(0.03, 0.015, 0.5, 8), bodyMat, [0, 0.16, -0.19], [-Math.PI / 2 + 0.7, 0, 0]));
      break;
    case 2:
      tail.add(Mesh(new THREE.ConeGeometry(0.05, 0.15, 8), bodyMat, [0, 0.1, -0.08], [-Math.PI / 2 + 0.8, 0, 0]));
      break;
    case 3:
      tail.add(Mesh(new THREE.SphereGeometry(0.05, 10, 8), bodyMat, [0, 0.02, -0.02]));
      break;
    case 4:
      tail.add(Mesh(new THREE.SphereGeometry(0.1, 12, 10), belly, [0, 0.1, -0.08]));
      break;
    default:
      tail.add(Mesh(new THREE.TorusGeometry(0.07, 0.02, 8, 20), bodyMat, [0, 0.12, -0.1]));
      break;
  }

  return {
    type: "quadruped",
    root,
    bones,
    rootBone: "body",
    restY: { body: body.position.y },
    face,
    dispose: () => disposeTree(root),
  };
}

/* ------------------------------------------------------------------ */
/* Blob creature (slimes)                                               */
/* ------------------------------------------------------------------ */

function buildBlob(c: CharacterConfig): RigInstance {
  const root = new THREE.Group();
  const bones: Record<string, THREE.Object3D> = {};
  const B = makeBoneFactory(bones);
  const body = B("body", root, 0, 0.5, 0);
  const bodyMat = M(c.bodyColor, 0.25, 0.1);
  body.add(Mesh(new THREE.SphereGeometry(0.5, 40, 28), bodyMat));

  if (c.spikes) {
    const spikeMat = M(darker(c.bodyColor, 0.7), 0.4);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const dir = new THREE.Vector3(Math.cos(a), 0.25, Math.sin(a)).normalize();
      const cone = Mesh(new THREE.ConeGeometry(0.07, 0.2, 8), spikeMat);
      cone.position.copy(dir.clone().multiplyScalar(0.5));
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      body.add(cone);
    }
  }

  const surfZ = (x: number, y: number, off: number) => Math.sqrt(Math.max(0, 0.25 - x * x - y * y)) - off;
  const eyes: { x: number; y: number; z: number; r: number }[] = [];
  if (c.blobEyes === 1) {
    eyes.push({ x: 0, y: 0.12, z: surfZ(0, 0.12, 0.03), r: 0.14 });
  } else {
    eyes.push({ x: 0.17, y: 0.1, z: surfZ(0.17, 0.1, 0.02), r: 0.095 });
    eyes.push({ x: -0.17, y: 0.1, z: surfZ(0.17, 0.1, 0.02), r: 0.095 });
    if (c.blobEyes >= 3) eyes.push({ x: 0, y: 0.28, z: surfZ(0, 0.28, 0.02), r: 0.08 });
  }
  const face = buildFace(body, {
    eyes,
    eyeColor: c.eyeColor,
    brows: false,
    mouth: { x: 0, y: -0.12, z: surfZ(0, -0.12, 0.02) },
  });

  return {
    type: "blob",
    root,
    bones,
    rootBone: "body",
    restY: { body: body.position.y },
    face,
    body,
    dispose: () => disposeTree(root),
  };
}

export function buildRig(cfg: CharacterConfig): RigInstance {
  if (cfg.rig === "quadruped") return buildQuadruped(cfg);
  if (cfg.rig === "blob") return buildBlob(cfg);
  return buildHuman(cfg);
}

/* ------------------------------------------------------------------ */
/* Pose application                                                     */
/* ------------------------------------------------------------------ */

export function resetRig(rig: RigInstance) {
  for (const k in rig.bones) rig.bones[k].rotation.set(0, 0, 0);
}

/** Procedural pose: Euler offsets per bone. */
export function applyEulerPose(rig: RigInstance, rot: Record<string, [number, number, number]>, py: number, sq: number) {
  resetRig(rig);
  for (const k in rot) {
    const b = rig.bones[k];
    if (!b) continue;
    const v = rot[k];
    b.rotation.set(v[0], v[1], v[2]);
  }
  const rb = rig.bones[rig.rootBone];
  if (rb) rb.position.y = rig.restY[rig.rootBone] + py;
  if (rig.body) rig.body.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);
}

/** Quaternion pose (mocap takes / live capture). */
export function applyQuatPose(rig: RigInstance, bones: Record<string, number[]>, py: number) {
  resetRig(rig);
  for (const k in bones) {
    const b = rig.bones[k];
    const q = bones[k];
    if (!b || !q) continue;
    b.quaternion.set(q[0], q[1], q[2], q[3]);
  }
  const rb = rig.bones[rig.rootBone];
  if (rb) rb.position.y = rig.restY[rig.rootBone] + py;
}

/**
 * Smoothly blends the rig toward a target pose instead of snapping to it.
 * This is what makes transitions (idle to walk, walk to run, stop) look natural.
 */
export function blendPose(rig: RigInstance, rot: Record<string, [number, number, number]>, py: number, dt: number, sq = 0, rate = 14) {
  const k = 1 - Math.exp(-Math.max(0, dt) * rate);
  if (!rig.cur) rig.cur = {};
  const names = new Set<string>([...Object.keys(rig.cur), ...Object.keys(rot)]);
  for (const n of names) {
    const t = rot[n] ?? [0, 0, 0];
    const c = rig.cur[n] ?? (rig.cur[n] = [t[0], t[1], t[2]]);
    c[0] += (t[0] - c[0]) * k;
    c[1] += (t[1] - c[1]) * k;
    c[2] += (t[2] - c[2]) * k;
    const b = rig.bones[n];
    if (b) b.rotation.set(c[0], c[1], c[2]);
  }
  rig.curPy = (rig.curPy ?? py) + (py - (rig.curPy ?? py)) * k;
  const rb = rig.bones[rig.rootBone];
  if (rb) rb.position.y = rig.restY[rig.rootBone] + rig.curPy;
  if (rig.body) rig.body.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);
}

export function applyFaceToRig(rig: RigInstance, s: FaceState) {
  applyFace(rig.face, s);
}
