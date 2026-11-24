import { ACTION_MAP, evalMotion, type PoseParams } from "../lib/motions";
import { EXPRESSIONS, NEUTRAL_FACE, type FaceState } from "../three/rigs";

/*
 * Sandbox performance library.
 * A "stance" sets the body's static pose (sit, crouch, carry...).
 * A "gesture" adds moving joints on top (wave, nod, dance...).
 * Every stance x gesture pair is a distinct action, so the library is the product of both lists.
 */

type Vec = [number, number, number];
export interface Stance { id: string; name: string; py?: number; rot: Record<string, Vec>; }
export interface GestureOsc { b: string; a: 0 | 1 | 2; off: number; amp: number; f: number; ph: number; }
export interface Gesture { id: string; name: string; osc: GestureOsc[]; }
export interface SandboxAction { id: string; name: string; stance: string; gesture: string; }

const X = 0 as const;
const Y = 1 as const;
const Z = 2 as const;
const o = (b: string, a: 0 | 1 | 2, off: number, amp = 0, f = 0, ph = 0): GestureOsc => ({ b, a, off, amp, f, ph });
const g = (id: string, name: string, osc: GestureOsc[]): Gesture => ({ id, name, osc });

export const STANCES: Stance[] = [
  { id: "stand", name: "Stand", rot: {} },
  { id: "relaxed", name: "Relaxed", rot: { lUpperArm: [0, 0, 0.15], rUpperArm: [0, 0, -0.15] } },
  { id: "sit", name: "Sit", py: -0.45, rot: { lUpperLeg: [-1.5, 0, 0], rUpperLeg: [-1.5, 0, 0], lLowerLeg: [1.5, 0, 0], rLowerLeg: [1.5, 0, 0], spine: [0.05, 0, 0] } },
  { id: "crouch", name: "Crouch", py: -0.3, rot: { lUpperLeg: [-0.8, 0, 0], rUpperLeg: [-0.8, 0, 0], lLowerLeg: [1.6, 0, 0], rLowerLeg: [1.6, 0, 0], spine: [0.3, 0, 0] } },
  { id: "kneel", name: "Kneel", py: -0.4, rot: { rUpperLeg: [-1.5, 0, 0], rLowerLeg: [1.5, 0, 0], spine: [0.1, 0, 0], head: [0.1, 0, 0] } },
  { id: "lean", name: "Lean", rot: { spine: [0, 0, 0.2] } },
  { id: "hunch", name: "Hunch", rot: { spine: [0.35, 0, 0], head: [0.3, 0, 0] } },
  { id: "hands-hips", name: "Hands on hips", rot: { lUpperArm: [0, 0, 0.6], lLowerArm: [-2, 0, 0], rUpperArm: [0, 0, -0.6], rLowerArm: [-2, 0, 0] } },
  { id: "arms-crossed", name: "Arms crossed", rot: { lUpperArm: [-0.9, -0.6, 0], lLowerArm: [-1.8, 0, 0], rUpperArm: [-0.9, 0.6, 0], rLowerArm: [-1.8, 0, 0] } },
  { id: "carry", name: "Carry", rot: { lUpperArm: [-1.2, 0, 0.3], lLowerArm: [-1.4, 0, 0], rUpperArm: [-1.2, 0, -0.3], rLowerArm: [-1.4, 0, 0] } },
  { id: "arms-up", name: "Arms up", rot: { lUpperArm: [0, 0, 2.6], rUpperArm: [0, 0, -2.6] } },
  { id: "slouch", name: "Slouch", rot: { spine: [0.25, 0, 0], head: [0.4, 0, 0], lUpperArm: [0, 0, 0.25], rUpperArm: [0, 0, -0.25] } },
  { id: "sneak", name: "Sneak", rot: { spine: [0.25, 0, 0], head: [0.15, 0, 0], lUpperArm: [-0.4, 0, 0.1], rUpperArm: [-0.4, 0, -0.1], lLowerArm: [-0.6, 0, 0], rLowerArm: [-0.6, 0, 0] } },
  { id: "t-pose", name: "T-pose", rot: { lUpperArm: [0, 0, 1.57], rUpperArm: [0, 0, -1.57] } },
];

export const GESTURES: Gesture[] = [
  g("none", "", []),
  g("wave", "Wave", [o("rUpperArm", Z, -2.5), o("rLowerArm", X, -1, 0.5, 2)]),
  g("wave-left", "Wave left", [o("lUpperArm", Z, 2.5), o("lLowerArm", X, -1, 0.5, 2)]),
  g("point", "Point", [o("rUpperArm", X, -1.5), o("rLowerArm", X, -0.2)]),
  g("point-left", "Point left", [o("lUpperArm", X, -1.5), o("lLowerArm", X, -0.2)]),
  g("clap", "Clap", [o("lUpperArm", X, -1.4), o("rUpperArm", X, -1.4), o("lLowerArm", X, -1.8), o("rLowerArm", X, -1.8), o("lLowerArm", Y, 0.4, 0.5, 2.5), o("rLowerArm", Y, -0.4, 0.5, 2.5)]),
  g("cheer", "Cheer", [o("lUpperArm", Z, 2.6), o("rUpperArm", Z, -2.6)]),
  g("fist-pump", "Fist pump", [o("rUpperArm", Z, -2.6), o("rLowerArm", X, 0.6, 0.5, 2)]),
  g("nod", "Nod", [o("head", X, 0.1, 0.25, 1.2)]),
  g("shake-head", "Shake head", [o("head", Y, 0, 0.4, 1.5)]),
  g("look-left", "Look left", [o("head", Y, -0.7)]),
  g("look-right", "Look right", [o("head", Y, 0.7)]),
  g("look-up", "Look up", [o("head", X, -0.5)]),
  g("look-down", "Look down", [o("head", X, 0.5)]),
  g("shrug", "Shrug", [o("lUpperArm", Z, 0.4), o("rUpperArm", Z, -0.4), o("head", X, 0.1)]),
  g("think", "Think", [o("rUpperArm", X, -1.8), o("rLowerArm", X, -2), o("head", Z, 0.2)]),
  g("salute", "Salute", [o("rUpperArm", Z, -2.5), o("rLowerArm", X, -2)]),
  g("bow", "Bow", [o("spine", X, 0.6), o("head", X, 0.2)]),
  g("dance-groove", "Groove dance", [o("spine", Y, 0, 0.35, 1), o("lUpperArm", Z, 0.8, 0.8, 1), o("rUpperArm", Z, -0.8, 0.8, 1, Math.PI)]),
  g("dance-robot", "Robot dance", [o("lUpperArm", X, 0, 1, 2), o("rLowerArm", X, -1, 0.8, 2), o("rUpperArm", X, 0, 1, 2, Math.PI), o("lLowerArm", X, -1, 0.8, 2, Math.PI)]),
  g("headbang", "Headbang", [o("head", X, 0, 0.6, 1.5), o("spine", X, 0.1, 0.1, 1.5)]),
  g("flex", "Flex", [o("lUpperArm", Z, 1), o("rUpperArm", Z, -1), o("lLowerArm", X, -2), o("rLowerArm", X, -2)]),
  g("laugh", "Laugh", [o("spine", Z, 0, 0.08, 5), o("head", X, -0.1, 0.2, 5)]),
  g("cry", "Cry", [o("lUpperArm", X, -1.5), o("rUpperArm", X, -1.5), o("lLowerArm", X, -2), o("rLowerArm", X, -2), o("head", X, 0.35)]),
  g("pray", "Pray", [o("lUpperArm", X, -1.6), o("rUpperArm", X, -1.6), o("lLowerArm", X, -1.8), o("rLowerArm", X, -1.8), o("head", X, 0.3)]),
  g("beckon", "Beckon", [o("rUpperArm", Z, -1.2), o("rLowerArm", X, -1.2, 0.8, 1.5)]),
  g("stop-hand", "Stop hand", [o("lUpperArm", X, -1.3), o("lLowerArm", X, -0.2)]),
  g("thumbs-up", "Thumbs up", [o("rUpperArm", Z, -1.2), o("rLowerArm", X, -1.2)]),
  g("facepalm", "Facepalm", [o("rUpperArm", X, -2.2), o("rLowerArm", X, -2.2), o("head", X, 0.3)]),
  g("scratch-head", "Scratch head", [o("rUpperArm", X, -2.4), o("rLowerArm", X, -2, 0.4, 4)]),
  g("yawn", "Yawn", [o("head", X, -0.3), o("spine", X, -0.1)]),
  g("stretch", "Stretch", [o("lUpperArm", Z, 2.9), o("rUpperArm", Z, -2.9), o("spine", Z, 0.12)]),
  g("air-guitar", "Air guitar", [o("lUpperArm", X, -1.2), o("lLowerArm", X, -1.5), o("rUpperArm", X, -0.8, 0.5, 4), o("rLowerArm", X, -0.8, 0.5, 4, Math.PI / 2)]),
  g("juggle", "Juggle", [o("lUpperArm", X, -1.6, 0.8, 2.2), o("rUpperArm", X, -1.6, 0.8, 2.2, Math.PI), o("lLowerArm", X, -1.6), o("rLowerArm", X, -1.6)]),
  g("explain", "Explain", [o("lUpperArm", X, -0.9, 0.4, 1.5), o("rUpperArm", X, -0.9, 0.4, 1.5, Math.PI), o("lLowerArm", X, -1.2), o("rLowerArm", X, -1.2)]),
  g("hug", "Hug", [o("lUpperArm", X, -1.2), o("lUpperArm", Z, 0.6), o("rUpperArm", X, -1.2), o("rUpperArm", Z, -0.6), o("lLowerArm", X, -1.4), o("rLowerArm", X, -1.4)]),
  g("swim", "Swim arms", [o("lUpperArm", X, 0, 1.8, 1.5), o("rUpperArm", X, 0, 1.8, 1.5, Math.PI)]),
  g("sway", "Sway arms", [o("lUpperArm", Z, 0.5, 0.5, 0.8), o("rUpperArm", Z, -0.5, 0.5, 0.8, Math.PI)]),
  g("typing", "Typing", [o("lUpperArm", X, -0.9, 0.3, 6), o("rUpperArm", X, -0.9, 0.3, 6, Math.PI), o("lLowerArm", X, -1.2), o("rLowerArm", X, -1.2)]),
  g("phone", "Phone call", [o("rUpperArm", X, -1.4), o("rLowerArm", X, -2), o("head", Z, 0.15)]),
  g("drink", "Drink", [o("rUpperArm", X, -1.6), o("rLowerArm", X, -2.2), o("head", X, 0.05)]),
  g("read", "Read", [o("lUpperArm", X, -1.2), o("lLowerArm", X, -1.8), o("head", X, 0.3)]),
  g("wipe-brow", "Wipe brow", [o("rUpperArm", X, -2.2), o("rLowerArm", X, -2.2), o("head", Z, 0.1)]),
  g("shush", "Shush", [o("rUpperArm", X, -2), o("rLowerArm", X, -2.2)]),
  g("sad-hang", "Sad hang", [o("lUpperArm", Z, 0.15), o("rUpperArm", Z, -0.15), o("head", X, 0.4), o("spine", X, 0.15)]),
  g("angry-fists", "Angry fists", [o("lUpperArm", X, -1.3), o("rUpperArm", X, -1.3), o("lLowerArm", X, -2), o("rLowerArm", X, -2), o("head", X, 0.1, 0.05, 4)]),
  g("sing", "Sing", [o("rUpperArm", Z, -1.3), o("lUpperArm", Z, 1.1), o("head", X, -0.2, 0.1, 1)]),
  g("tip-hat", "Tip hat", [o("rUpperArm", Z, -2), o("rLowerArm", X, -1.8), o("head", Y, 0.1)]),
  g("camera-snap", "Take a photo", [o("rUpperArm", X, -1.5), o("rLowerArm", X, -1.8), o("head", Y, 0.1)]),
  g("heartbeat", "Hand on chest", [o("lUpperArm", X, -0.8), o("rUpperArm", X, -0.8), o("spine", X, 0.05, 0.05, 1.2)]),
];

export const STANCE_MAP: Record<string, Stance> = Object.fromEntries(STANCES.map((s) => [s.id, s]));
export const GESTURE_MAP: Record<string, Gesture> = Object.fromEntries(GESTURES.map((s) => [s.id, s]));

/** Every stance x gesture pair (the "none" gesture gives the plain stance). */
export const SANDBOX_ACTIONS: SandboxAction[] = STANCES.flatMap((s) =>
  GESTURES.map((gs) => ({
    id: `${s.id}|${gs.id}`,
    name: gs.id === "none" ? s.name : `${s.name} · ${gs.name}`,
    stance: s.id,
    gesture: gs.id,
  })),
);
export const SANDBOX_ACTION_COUNT = SANDBOX_ACTIONS.length;

export const EXPRESSION_LIST = Object.keys(EXPRESSIONS).filter((e) => e !== "talk");

const ARMS = ["lUpperArm", "lLowerArm", "rUpperArm", "rLowerArm"];
const PARAMS: PoseParams = { style: "normal", intensity: 1, speed: 1, mirror: false, variant: 0 };

export interface PoseIn {
  moving: boolean;
  run: boolean;
  airborne: boolean;
  perf: { stance: string; gesture: string } | null;
  held: boolean;
  t: number;
  /** Gait time for walking/running (advances with distance travelled, not with the clock). */
  gait: number;
}

/** Builds the body pose: locomotion or idle as the base, then stance, then gesture, then carry arms. */
export function computePose(i: PoseIn): { rot: Record<string, Vec>; py: number } {
  const loco = i.moving
    ? evalMotion(ACTION_MAP[i.run ? "run" : "walk"], i.gait, PARAMS)
    : i.airborne
      ? evalMotion(ACTION_MAP.jump, i.t, PARAMS)
      : evalMotion(ACTION_MAP.idle, i.t, PARAMS);
  const rot: Record<string, Vec> = {};
  for (const k in loco.rot) rot[k] = [...loco.rot[k]] as Vec;
  let py = loco.py;
  if (i.perf) {
    const st = STANCE_MAP[i.perf.stance];
    if (st) {
      for (const k in st.rot) rot[k] = [...st.rot[k]] as Vec;
      if (st.py !== undefined) py = st.py;
    }
    const gs = GESTURE_MAP[i.perf.gesture];
    if (gs) {
      for (const os of gs.osc) {
        const cur = rot[os.b] ?? (rot[os.b] = [0, 0, 0]);
        cur[os.a] = os.off + (os.amp ? os.amp * Math.sin(2 * Math.PI * os.f * i.t + os.ph) : 0);
      }
    }
  } else if (i.held) {
    const c = STANCE_MAP.carry;
    for (const k of ARMS) rot[k] = [...c.rot[k]] as Vec;
  }
  return { rot, py };
}

/** Facial state: expression + automatic blinking + talking mouth. */
export function faceForActor(expr: string, talk: boolean, sec: number): FaceState {
  const base: FaceState = { ...NEUTRAL_FACE, ...(EXPRESSIONS[expr] ?? {}) };
  const phase = (sec % 3.4) / 0.14;
  const b = phase < 1 ? Math.sin(phase * Math.PI) : 0;
  base.blinkL = Math.max(base.blinkL, b);
  base.blinkR = Math.max(base.blinkR, b);
  if (talk) base.jaw = Math.max(base.jaw, (0.5 + 0.5 * Math.sin(sec * 16)) * 0.55);
  return base;
}
