import { locoPose } from "../sandbox/locomotion";
import { EXPRESSIONS, NEUTRAL_FACE, type FaceState } from "../three/rigs";
import type { Actor2D, Aspect2D, Clip2D, Obj2D } from "./types2d";

/*
 * Stateless 2D timeline evaluator. Given a time, it returns where every character is and how it looks.
 * Because nothing is accumulated between frames, scrubbing and video export always give the same frame.
 */

export const METER = 170; // pixels per metre in the 2D figure
export const WALK_CYCLE = 1.8; // metres per gait cycle (same as the 3D rig)
export const XFADE = 0.25; // seconds of blend between two clips
export const HIP_Y = -175;
/** Top of the head in figure units (before the character's size is applied). Used to place speech bubbles. */
export const HEAD_TOP = -410;

/** Pivot of each bone, relative to its parent group. */
export const BONE_AT: Record<string, [number, number]> = {
  hips: [0, HIP_Y],
  spine: [0, 0],
  head: [0, -125],
  lUpperArm: [-52, -112],
  lLowerArm: [0, 62],
  rUpperArm: [52, -112],
  rLowerArm: [0, 62],
  lUpperLeg: [-24, 0],
  lLowerLeg: [0, 85],
  rUpperLeg: [24, 0],
  rLowerLeg: [0, 85],
};

export const clock2d = { t: 0 };
export const deg = (r: number) => (r * 180) / Math.PI;

export function dimsOf(a: Aspect2D): [number, number] {
  if (a === "16:9") return [1280, 720];
  if (a === "9:16") return [720, 1280];
  return [1080, 1080];
}

export function groundOf(a: Aspect2D) {
  return Math.round(dimsOf(a)[1] * 0.82);
}

export interface Pose2D {
  angles: Record<string, number>;
  py: number;
  face: FaceState;
}

export interface ActorFrame extends Pose2D {
  x: number;
  facing: 1 | -1;
  bubble: string;
  gait: number;
  speedMs: number;
  grounded: boolean;
  species: string;
  t: number;
}

const IDLE: Clip2D = {
  id: "idle",
  actorId: "",
  start: 0,
  duration: 0,
  kind: "act",
  stance: "stand",
  gesture: "none",
  expression: "neutral",
  talk: false,
  speed: 1,
  intensity: 1,
  mirror: false,
  phase: 0,
  toX: 0,
  say: "",
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (p: number) => p * p * (3 - 2 * p);
/** The 3D rig's limb angles come from x (forward/back) or z (sideways). In a side or front view, the larger one is the visible angle. */
const angleOf = (v: [number, number, number]) => (Math.abs(v[2]) > Math.abs(v[0]) ? v[2] : v[0]);
const mirrorKey = (k: string) => {
  if (/^l[A-Z]/.test(k)) return "r" + k.slice(1);
  if (/^r[A-Z]/.test(k)) return "l" + k.slice(1);
  return k;
};
const autoBlink = (t: number) => {
  const ph = (t % 3.4) / 0.14;
  return ph < 1 ? Math.sin(ph * Math.PI) : 0;
};

function poseOf(c: Clip2D, tl: number, speedMs: number, gait: number): Pose2D {
  const t = tl * c.speed + c.phase * 0.5;
  const loco = locoPose({
    speed: speedMs,
    grounded: true,
    vy: 0,
    gait,
    t,
    held: false,
    perf: { stance: c.stance, gesture: c.gesture },
    talking: c.talk,
  });
  let rot: Record<string, [number, number, number]> = loco.rot;
  if (c.mirror) {
    const m: Record<string, [number, number, number]> = {};
    for (const k of Object.keys(rot)) m[mirrorKey(k)] = rot[k];
    rot = m;
  }
  const angles: Record<string, number> = {};
  for (const k of Object.keys(rot)) angles[k] = angleOf(rot[k]) * c.intensity;
  const face: FaceState = { ...NEUTRAL_FACE, ...(EXPRESSIONS[c.expression] ?? {}) };
  const b = autoBlink(t);
  face.blinkL = Math.max(face.blinkL, b);
  face.blinkR = Math.max(face.blinkR, b);
  if (c.talk) {
    face.jaw = Math.max(face.jaw, (0.5 + 0.5 * Math.sin(t * 16)) * 0.55);
    face.smile = Math.max(face.smile, 0.55);
    face.blinkL = Math.max(face.blinkL, 0);
  }
  return { angles, py: loco.py * METER, face };
}

function blend(a: Pose2D, b: Pose2D, w: number): Pose2D {
  const angles: Record<string, number> = {};
  const keys = new Set([...Object.keys(a.angles), ...Object.keys(b.angles)]);
  keys.forEach((k) => {
    angles[k] = (a.angles[k] ?? 0) * (1 - w) + (b.angles[k] ?? 0) * w;
  });
  return { angles, py: a.py + (b.py - a.py) * w, face: b.face };
}

/** Clips for one actor, sorted by start time. */
export function sortedClips(all: Clip2D[], actorId: string): Clip2D[] {
  return all.filter((c) => c.actorId === actorId).sort((p, q) => p.start - q.start);
}

/** Position, facing, pose and speech for one character at time t. Clips must be sorted by start. */
export function evalActor(a: Actor2D, clips: Clip2D[], t: number): ActorFrame {
  let x = a.x;
  let facing: 1 | -1 = a.facing;
  let speedMs = 0;
  let gait = 0;
  for (const c of clips) {
    if (c.kind !== "walk") continue;
    const from = x;
    const to = c.toX;
    if (t >= c.start + c.duration) {
      x = to;
      if (to !== from) facing = to > from ? 1 : -1;
      continue;
    }
    if (t >= c.start) {
      const p = clamp01((t - c.start) / c.duration);
      const e = smooth(p);
      const de = (6 * p * (1 - p)) / c.duration;
      const dist = to - from;
      x = from + dist * e;
      if (dist !== 0) facing = dist > 0 ? 1 : -1;
      speedMs = (Math.abs(dist) * de) / METER;
      gait = Math.abs(x - from) / METER / WALK_CYCLE;
    }
    break;
  }

  let active: Clip2D | null = null;
  for (const c of clips) if (t >= c.start && t < c.start + c.duration) active = c;
  const walking = active?.kind === "walk";
  let pose = active ? poseOf(active, t - active.start, walking ? speedMs : 0, walking ? gait : 0) : poseOf(IDLE, t, 0, 0);

  if (active && t - active.start < XFADE) {
    let prev: Clip2D | null = null;
    for (const c of clips) {
      if (c !== active && c.start + c.duration <= active.start + 0.05 && c.start + c.duration > active.start - 2) prev = c;
    }
    if (prev) {
      const pp = poseOf(prev, t - prev.start, 0, 0);
      pose = blend(pp, pose, smooth(clamp01((t - active.start) / XFADE)));
    }
  }

  return { x, facing, angles: pose.angles, py: pose.py, face: pose.face, bubble: active?.say ?? "", gait, speedMs, grounded: true, species: "", t };
}

/** The background to draw right now: the scene clip whose window includes t, else the default scene. */
export function sceneAt(
  clips: { start: number; duration: number; kind: number; palette: number }[],
  fallback: { kind: number; palette: number },
  t: number,
): { kind: number; palette: number } {
  let best: { start: number; kind: number; palette: number } | null = null;
  for (const c of clips) {
    if (t >= c.start && t < c.start + c.duration && (!best || c.start > best.start)) best = c;
  }
  return best ? { kind: best.kind, palette: best.palette } : fallback;
}

/** Position and bob for a movable object at time t (walk logic, minus the legs). */
export function evalObj(o: Obj2D, clips: Clip2D[], t: number): { x: number; bob: number; moving: boolean } {
  let x = o.x;
  let bob = 0;
  let moving = false;
  for (const c of clips) {
    if (c.kind !== "drive") continue;
    const from = x;
    const to = c.toX;
    if (t >= c.start + c.duration) {
      x = to;
      continue;
    }
    if (t >= c.start) {
      const p = clamp01((t - c.start) / c.duration);
      const e = smooth(p);
      const dist = to - from;
      x = from + dist * e;
      const de = (Math.abs(dist) * (6 * p * (1 - p))) / c.duration;
      moving = true;
      bob = Math.abs(Math.sin(t * 7)) * Math.min(12, de * 0.5);
    }
    break;
  }
  return { x, bob, moving };
}

/** Length of the whole project in seconds (at least 6 s, plus a little tail). */
export function projectDuration(clips: Clip2D[]) {
  let end = 6;
  for (const c of clips) end = Math.max(end, c.start + c.duration);
  return end + 0.5;
}
