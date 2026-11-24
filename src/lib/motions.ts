import type { RigType } from "./types";

/**
 * Procedural motion engine.
 * Every action is a set of oscillators (bone, axis, amplitude, frequency, offset, phase).
 * Styles, intensities, speeds, mirroring and phase variants multiply the library,
 * so a few dozen hand-tuned actions expand into 100k+ distinct motion variants.
 */

export type Axis = "x" | "y" | "z" | "py" | "sq";

export interface Osc {
  b: string; // bone name
  a: Axis;
  amp: number;
  f: number; // cycles per second
  off: number;
  ph: number;
  abs: boolean;
}

export interface MotionAction {
  id: string;
  name: string;
  rig: RigType;
  cat: string;
  osc: Osc[];
}

export interface MotionStyle {
  id: string;
  name: string;
  amp: number;
  freq: number;
  snap?: boolean;
  offsets?: Record<string, [number, number, number]>;
}

export const STYLES: MotionStyle[] = [
  { id: "normal", name: "Normal", amp: 1, freq: 1 },
  { id: "energetic", name: "Energetic", amp: 1.25, freq: 1.35 },
  { id: "lazy", name: "Lazy", amp: 0.7, freq: 0.6, offsets: { spine: [0.12, 0, 0] } },
  { id: "sad", name: "Sad", amp: 0.6, freq: 0.7, offsets: { head: [0.35, 0, 0], spine: [0.15, 0, 0] } },
  { id: "angry", name: "Angry", amp: 1.3, freq: 1.2, offsets: { spine: [-0.1, 0, 0] } },
  { id: "sneaky", name: "Sneaky", amp: 0.6, freq: 0.8, offsets: { spine: [0.25, 0, 0], head: [0.15, 0, 0] } },
  { id: "goofy", name: "Goofy", amp: 1.5, freq: 1.0, offsets: { head: [0, 0.2, 0.1] } },
  { id: "robot", name: "Robotic", amp: 1.0, freq: 1.0, snap: true },
];
export const STYLE_MAP: Record<string, MotionStyle> = Object.fromEntries(STYLES.map((s) => [s.id, s]));

export const INTENSITIES = [0.35, 0.6, 0.85, 1, 1.4];
export const SPEEDS = [0.5, 0.75, 1, 1.5, 2];
export const VARIANTS = 4;

const o = (b: string, a: Axis, amp: number, f: number, off = 0, ph = 0, abs = false): Osc => ({ b, a, amp, f, off, ph, abs });
const P = Math.PI;

const HUMAN: MotionAction[] = [
  // Basic
  { id: "idle", name: "Idle Breathe", rig: "human", cat: "Basic", osc: [o("spine", "x", 0.03, 0.25), o("head", "y", 0.12, 0.2), o("lUpperArm", "z", 0.06, 0.25), o("rUpperArm", "z", -0.06, 0.25), o("hips", "py", 0.01, 0.25)] },
  { id: "walk", name: "Walk", rig: "human", cat: "Basic", osc: [o("lUpperLeg", "x", 0.45, 1), o("rUpperLeg", "x", 0.45, 1, 0, P), o("lUpperArm", "x", 0.35, 1, 0, P), o("rUpperArm", "x", 0.35, 1), o("lLowerArm", "x", -0.2, 1, -0.2, 0, true), o("hips", "py", 0.025, 2, 0, 0, true)] },
  { id: "run", name: "Run", rig: "human", cat: "Basic", osc: [o("lUpperLeg", "x", 0.9, 1.6), o("rUpperLeg", "x", 0.9, 1.6, 0, P), o("lUpperArm", "x", 0.8, 1.6, 0, P), o("rUpperArm", "x", 0.8, 1.6), o("lLowerArm", "x", -1.0, 1.6, -1.1), o("rLowerArm", "x", -1.0, 1.6, -1.1), o("spine", "x", 0.02, 1.6, 0.25), o("hips", "py", 0.06, 3.2, 0, 0, true)] },
  { id: "sneak", name: "Sneak", rig: "human", cat: "Basic", osc: [o("lUpperLeg", "x", 0.4, 0.6), o("rUpperLeg", "x", 0.4, 0.6, 0, P), o("spine", "x", 0, 0, 0.5), o("head", "x", 0, 0, 0.2), o("hips", "py", 0, 0, -0.25)] },
  { id: "jump", name: "Jump", rig: "human", cat: "Basic", osc: [o("hips", "py", 0.35, 0.6, 0, 0, true), o("lUpperArm", "z", 0, 0, 2.2), o("rUpperArm", "z", 0, 0, -2.2), o("lUpperLeg", "x", 0.3, 0.6, 0, 0, true), o("rUpperLeg", "x", 0.3, 0.6, 0, 0, true)] },
  { id: "sit", name: "Sit", rig: "human", cat: "Basic", osc: [o("lUpperLeg", "x", 0, 0, -1.5), o("rUpperLeg", "x", 0, 0, -1.5), o("lLowerLeg", "x", 0, 0, 1.5), o("rLowerLeg", "x", 0, 0, 1.5), o("hips", "py", 0, 0, -0.45), o("spine", "x", 0.02, 0.3, 0.05)] },
  { id: "crouch", name: "Crouch", rig: "human", cat: "Basic", osc: [o("lUpperLeg", "x", 0.05, 0.5, -0.8), o("rUpperLeg", "x", 0.05, 0.5, -0.8), o("lLowerLeg", "x", 0.05, 0.5, 1.6), o("rLowerLeg", "x", 0.05, 0.5, 1.6), o("hips", "py", 0.02, 0.5, -0.3), o("spine", "x", 0.02, 0.5, 0.3)] },
  { id: "kneel", name: "Kneel", rig: "human", cat: "Basic", osc: [o("rUpperLeg", "x", 0, 0, -1.5), o("rLowerLeg", "x", 0, 0, 1.5), o("hips", "py", 0, 0, -0.4), o("spine", "x", 0.02, 0.4, 0.1), o("head", "x", 0.1, 0.4, 0.2)] },
  { id: "balance", name: "Balance", rig: "human", cat: "Basic", osc: [o("lUpperArm", "z", 0, 0, 2.0), o("rUpperArm", "z", 0, 0, -2.0), o("rUpperLeg", "x", 0, 0, -1.0), o("rLowerLeg", "x", 0, 0, 1.0), o("spine", "z", 0.05, 1.2)] },
  { id: "zombie", name: "Zombie Walk", rig: "human", cat: "Basic", osc: [o("lUpperArm", "x", 0, 0, -1.4), o("rUpperArm", "x", 0, 0, -1.4), o("lUpperLeg", "x", 0.3, 0.7), o("rUpperLeg", "x", 0.3, 0.7, 0, P), o("spine", "x", 0, 0, 0.15), o("hips", "py", 0.02, 1.4, 0, 0, true)] },
  { id: "tiptoe", name: "Tiptoe", rig: "human", cat: "Basic", osc: [o("lUpperLeg", "x", 0.25, 1), o("rUpperLeg", "x", 0.25, 1, 0, P), o("lLowerLeg", "x", 0.3, 1, 0.2), o("rLowerLeg", "x", 0.3, 1, 0.2, P), o("hips", "py", 0.04, 2, 0, 0, true)] },
  { id: "limp", name: "Limp Walk", rig: "human", cat: "Basic", osc: [o("lUpperLeg", "x", 0.3, 1), o("rUpperLeg", "x", 0.3, 1, 0, P), o("spine", "z", 0.07, 1), o("hips", "py", 0.02, 2, 0, 0, true)] },
  { id: "march", name: "March", rig: "human", cat: "Basic", osc: [o("lUpperLeg", "x", 0.9, 1.5), o("rUpperLeg", "x", 0.9, 1.5, 0, P), o("lUpperArm", "x", 0.5, 1.5, 0, P), o("rUpperArm", "x", 0.5, 1.5), o("lLowerArm", "x", 0, 0, -1.2), o("rLowerArm", "x", 0, 0, -1.2)] },
  { id: "tired", name: "Tired Walk", rig: "human", cat: "Basic", osc: [o("lUpperLeg", "x", 0.3, 0.8), o("rUpperLeg", "x", 0.3, 0.8, 0, P), o("spine", "x", 0, 0, 0.2), o("head", "x", 0, 0, 0.25), o("hips", "py", 0.015, 1.6, 0, 0, true)] },
  // Dance & emotes
  { id: "dance", name: "Groove Dance", rig: "human", cat: "Dance", osc: [o("spine", "y", 0.35, 1), o("hips", "py", 0.05, 2, 0, 0, true), o("lUpperArm", "z", 0.8, 1, 0.8), o("rUpperArm", "z", 0.8, 1, -0.8, P), o("lUpperLeg", "x", 0.25, 2), o("rUpperLeg", "x", 0.25, 2, 0, P), o("head", "z", 0.15, 1)] },
  { id: "disco", name: "Disco Fever", rig: "human", cat: "Dance", osc: [o("lUpperArm", "z", 0.6, 1, 1.2), o("rUpperArm", "z", 0.6, 1, -1.2, P), o("spine", "y", 0.4, 1), o("hips", "py", 0.04, 2, 0, 0, true), o("head", "z", 0.1, 1)] },
  { id: "wave", name: "Wave Hello", rig: "human", cat: "Emote", osc: [o("rUpperArm", "z", 0, 0, -2.5), o("rLowerArm", "x", 0.5, 2, -1.0), o("head", "z", 0.08, 0.5), o("lUpperArm", "z", 0.05, 0.5)] },
  { id: "clap", name: "Clap", rig: "human", cat: "Emote", osc: [o("lUpperArm", "x", 0, 0, -1.4), o("rUpperArm", "x", 0, 0, -1.4), o("lLowerArm", "x", 0, 0, -1.8), o("rLowerArm", "x", 0, 0, -1.8), o("lLowerArm", "y", 0.5, 2.5), o("rLowerArm", "y", 0.5, 2.5, 0, P)] },
  { id: "cheer", name: "Cheer", rig: "human", cat: "Emote", osc: [o("lUpperArm", "z", 0, 0, 2.6), o("rUpperArm", "z", 0, 0, -2.6), o("hips", "py", 0.12, 1.5, 0, 0, true), o("head", "x", 0, 0, -0.1)] },
  { id: "bow", name: "Bow", rig: "human", cat: "Emote", osc: [o("spine", "x", 0.08, 0.5, 0.6), o("head", "x", 0, 0, 0.2), o("lUpperArm", "z", 0.1, 0.5, 0.1), o("rUpperArm", "z", 0.1, 0.5, -0.1)] },
  { id: "laugh", name: "Laugh", rig: "human", cat: "Emote", osc: [o("spine", "z", 0.08, 5), o("head", "x", 0.2, 5, -0.1), o("hips", "py", 0.02, 5, 0, 0, true), o("lUpperArm", "z", 0.2, 5, 0.5)] },
  { id: "cry", name: "Cry", rig: "human", cat: "Emote", osc: [o("lUpperArm", "x", 0, 0, -1.5), o("rUpperArm", "x", 0, 0, -1.5), o("lLowerArm", "x", 0, 0, -2.0), o("rLowerArm", "x", 0, 0, -2.0), o("head", "x", 0, 0, 0.35), o("spine", "x", 0.05, 3, 0.2)] },
  { id: "think", name: "Think", rig: "human", cat: "Emote", osc: [o("rUpperArm", "x", 0, 0, -1.8), o("rLowerArm", "x", 0, 0, -2.0), o("head", "z", 0, 0, 0.2), o("head", "y", 0.1, 0.2)] },
  { id: "stretch", name: "Stretch", rig: "human", cat: "Emote", osc: [o("lUpperArm", "z", 0, 0, 2.9), o("rUpperArm", "z", 0, 0, -2.9), o("spine", "z", 0.12, 0.5), o("hips", "py", 0.05, 0.5, 0, 0, true)] },
  { id: "shrug", name: "Shrug", rig: "human", cat: "Emote", osc: [o("lUpperArm", "z", 0.2, 0.5, 0.4), o("rUpperArm", "z", 0.2, 0.5, -0.4), o("head", "x", 0.1, 0.5, 0.1), o("hips", "py", 0.02, 0.5, 0, 0, true)] },
  { id: "salute", name: "Salute", rig: "human", cat: "Emote", osc: [o("rUpperArm", "z", 0, 0, -2.5), o("rLowerArm", "x", 0, 0, -2.0), o("lUpperArm", "z", 0.05, 0.5)] },
  { id: "point", name: "Point", rig: "human", cat: "Emote", osc: [o("rUpperArm", "x", 0, 0, -1.5), o("rLowerArm", "x", 0, 0, -0.2), o("head", "y", 0.1, 0.3)] },
  { id: "flex", name: "Flex", rig: "human", cat: "Emote", osc: [o("lUpperArm", "z", 0, 0, 1.0), o("rUpperArm", "z", 0, 0, -1.0), o("lLowerArm", "x", 0, 0, -2.0), o("rLowerArm", "x", 0, 0, -2.0), o("head", "y", 0.2, 0.5)] },
  { id: "spin", name: "Spin", rig: "human", cat: "Dance", osc: [o("hips", "y", 3.14, 0.5), o("lUpperArm", "z", 0, 0, 1.5), o("rUpperArm", "z", 0, 0, -1.5)] },
  { id: "headbang", name: "Headbang", rig: "human", cat: "Dance", osc: [o("head", "x", 0.6, 1.5), o("spine", "x", 0.1, 1.5), o("lUpperArm", "x", 0.3, 1.5, 0, P), o("rUpperArm", "x", 0.3, 1.5, 0, P)] },
  // Sports & action
  { id: "victory", name: "Victory Pump", rig: "human", cat: "Sports", osc: [o("rUpperArm", "z", 0, 0, -2.6), o("rLowerArm", "x", 0.6, 1, -0.2), o("hips", "py", 0.05, 2, 0, 0, true)] },
  { id: "boxing", name: "Boxing Guard", rig: "human", cat: "Sports", osc: [o("lUpperArm", "x", 0, 0, -1.6), o("rUpperArm", "x", 0, 0, -1.6), o("lLowerArm", "x", 0, 0, -1.8), o("rLowerArm", "x", 0, 0, -1.8), o("hips", "py", 0.03, 2, 0, 0, true), o("spine", "y", 0.15, 2)] },
  { id: "punch", name: "Punch", rig: "human", cat: "Sports", osc: [o("rUpperArm", "x", 0.9, 2, -1.0, 0, true), o("rLowerArm", "x", 0.4, 2, -1.4, 0, true), o("lUpperArm", "x", 0.9, 2, -1.0, P, true), o("spine", "y", 0.2, 2)] },
  { id: "kick", name: "Kick", rig: "human", cat: "Sports", osc: [o("rUpperLeg", "x", 1.0, 0.8), o("rLowerLeg", "x", 0.3, 0.8, -0.5), o("spine", "z", 0.05, 0.8), o("lUpperArm", "x", 0.3, 0.8)] },
  { id: "pray", name: "Pray", rig: "human", cat: "Emote", osc: [o("lUpperArm", "x", 0, 0, -1.6), o("rUpperArm", "x", 0, 0, -1.6), o("lLowerArm", "x", 0, 0, -1.8), o("rLowerArm", "x", 0, 0, -1.8), o("spine", "x", 0, 0, 0.15), o("head", "x", 0, 0, 0.3)] },
  { id: "superhero", name: "Superhero Hover", rig: "human", cat: "Action", osc: [o("lUpperArm", "z", 0, 0, 1.3), o("rUpperArm", "z", 0, 0, -1.3), o("spine", "x", 0, 0, 0.3), o("hips", "py", 0.05, 1, 0, 0, true)] },
  { id: "tpose", name: "T-Pose", rig: "human", cat: "Action", osc: [o("lUpperArm", "z", 0, 0, 1.57), o("rUpperArm", "z", 0, 0, -1.57), o("head", "y", 0.05, 0.3)] },
  { id: "slump", name: "Sad Slump", rig: "human", cat: "Emote", osc: [o("spine", "x", 0, 0, 0.35), o("head", "x", 0, 0, 0.4), o("lUpperArm", "z", 0, 0, 0.25), o("rUpperArm", "z", 0, 0, -0.25), o("hips", "py", 0, 0, -0.05)] },
];

const QUAD: MotionAction[] = [
  { id: "q_idle", name: "Idle", rig: "quadruped", cat: "Basic", osc: [o("body", "py", 0.01, 0.25), o("neck", "x", 0.03, 0.25), o("head", "x", 0.05, 0.4), o("tail", "z", 0.3, 1.5)] },
  { id: "q_walk", name: "Walk", rig: "quadruped", cat: "Basic", osc: [o("fl_up", "x", 0.4, 1), o("br_up", "x", 0.4, 1), o("fr_up", "x", 0.4, 1, 0, P), o("bl_up", "x", 0.4, 1, 0, P), o("body", "py", 0.03, 2, 0, 0, true), o("tail", "z", 0.4, 2)] },
  { id: "q_trot", name: "Trot", rig: "quadruped", cat: "Basic", osc: [o("fl_up", "x", 0.7, 1.8), o("br_up", "x", 0.7, 1.8), o("fr_up", "x", 0.7, 1.8, 0, P), o("bl_up", "x", 0.7, 1.8, 0, P), o("body", "py", 0.05, 3.6, 0, 0, true), o("tail", "z", 0.5, 3)] },
  { id: "q_run", name: "Gallop", rig: "quadruped", cat: "Basic", osc: [o("fl_up", "x", 0.9, 1.6), o("fr_up", "x", 0.9, 1.6, 0, 0.3), o("bl_up", "x", 0.9, 1.6, 0, P), o("br_up", "x", 0.9, 1.6, 0, P + 0.3), o("body", "x", 0.08, 1.6), o("body", "py", 0.06, 3.2, 0, 0, true), o("tail", "z", 0.5, 3)] },
  { id: "q_jump", name: "Jump", rig: "quadruped", cat: "Action", osc: [o("body", "py", 0.35, 0.6, 0, 0, true), o("fl_up", "x", 0, 0, -0.6), o("fr_up", "x", 0, 0, -0.6), o("bl_up", "x", 0, 0, 0.5), o("br_up", "x", 0, 0, 0.5)] },
  { id: "q_sit", name: "Sit", rig: "quadruped", cat: "Basic", osc: [o("bl_up", "x", 0, 0, 1.0), o("br_up", "x", 0, 0, 1.0), o("bl_lo", "x", 0, 0, -1.5), o("br_lo", "x", 0, 0, -1.5), o("fl_up", "x", 0, 0, -0.2), o("fr_up", "x", 0, 0, -0.2), o("body", "py", 0, 0, -0.25), o("head", "x", 0.1, 0.3)] },
  { id: "q_sleep", name: "Sleep", rig: "quadruped", cat: "Basic", osc: [o("body", "py", 0, 0, -0.2), o("neck", "x", 0, 0, 0.6), o("head", "x", 0, 0, 0.9), o("fl_up", "x", 0, 0, -0.4), o("fr_up", "x", 0, 0, -0.4), o("bl_up", "x", 0, 0, 0.4), o("body", "py", 0.01, 0.2, 0, 0, true)] },
  { id: "q_eat", name: "Eat", rig: "quadruped", cat: "Basic", osc: [o("head", "x", 0.25, 3, 0.9), o("neck", "x", 0, 0, 0.2), o("tail", "z", 0.2, 1)] },
  { id: "q_pounce", name: "Pounce", rig: "quadruped", cat: "Action", osc: [o("fl_up", "x", 0.6, 1, -1.0), o("fr_up", "x", 0.6, 1, -1.0), o("bl_up", "x", 0.4, 1, 0.6), o("body", "py", 0.25, 1, 0, 0, true), o("head", "x", 0, 0, -0.2)] },
  { id: "q_play", name: "Play Bow", rig: "quadruped", cat: "Emote", osc: [o("body", "z", 0.5, 1), o("body", "py", 0.1, 1, 0, 0, true), o("tail", "z", 1.0, 2)] },
  { id: "q_shake", name: "Shake Off", rig: "quadruped", cat: "Emote", osc: [o("head", "z", 0.5, 4), o("body", "z", 0.12, 4), o("tail", "z", 1.0, 4)] },
  { id: "q_stretch", name: "Stretch", rig: "quadruped", cat: "Emote", osc: [o("fl_up", "x", 0, 0, 0.8), o("fr_up", "x", 0, 0, 0.8), o("neck", "x", 0, 0, -0.5), o("tail", "z", 0.3, 0.5), o("body", "py", 0, 0, -0.15)] },
  { id: "q_wag", name: "Tail Wag", rig: "quadruped", cat: "Emote", osc: [o("tail", "z", 0.9, 2.5), o("tail", "y", 0.3, 1.25), o("body", "py", 0.01, 2, 0, 0, true), o("head", "y", 0.2, 2, 0, P)] },
  { id: "q_bark", name: "Alert Bark", rig: "quadruped", cat: "Emote", osc: [o("neck", "x", 0, 0, -0.3), o("head", "x", 0.25, 2.5, -0.2), o("body", "py", 0.02, 5, 0, 0, true), o("tail", "z", 0.8, 4)] },
  { id: "q_crouch", name: "Sneak Crouch", rig: "quadruped", cat: "Action", osc: [o("body", "py", 0, 0, -0.12), o("neck", "x", 0, 0, 0.4), o("fl_up", "x", 0.2, 0.6, 0.5), o("fr_up", "x", 0.2, 0.6, 0.5, P), o("tail", "z", 0.1, 0.5)] },
  { id: "q_alert", name: "Ears Up Alert", rig: "quadruped", cat: "Emote", osc: [o("neck", "x", 0, 0, -0.2), o("head", "y", 0.3, 0.7), o("body", "py", 0.01, 0.7)] },
];

const BLOB: MotionAction[] = [
  { id: "b_idle", name: "Idle Jiggle", rig: "blob", cat: "Basic", osc: [o("body", "sq", 0.05, 0.5), o("body", "z", 0.03, 0.5)] },
  { id: "b_bounce", name: "Bounce", rig: "blob", cat: "Basic", osc: [o("body", "py", 0.35, 1, 0, 0, true), o("body", "sq", 0.15, 1, 0, 0, true)] },
  { id: "b_hop", name: "Hop", rig: "blob", cat: "Action", osc: [o("body", "py", 0.5, 0.8, 0, 0, true), o("body", "sq", 0.2, 0.8, 0, P, true)] },
  { id: "b_wobble", name: "Wobble", rig: "blob", cat: "Basic", osc: [o("body", "z", 0.25, 1.2), o("body", "x", 0.15, 1.2, 0, P / 2)] },
  { id: "b_spin", name: "Spin", rig: "blob", cat: "Dance", osc: [o("body", "y", 3.14, 0.5)] },
  { id: "b_shiver", name: "Shiver", rig: "blob", cat: "Emote", osc: [o("body", "x", 0.1, 10), o("body", "z", 0.1, 11)] },
  { id: "b_grow", name: "Pulse Grow", rig: "blob", cat: "Emote", osc: [o("body", "sq", 0.2, 0.4, 0.3)] },
  { id: "b_squish", name: "Squish", rig: "blob", cat: "Emote", osc: [o("body", "sq", 0.2, 0.5, -0.2)] },
  { id: "b_flop", name: "Flop", rig: "blob", cat: "Action", osc: [o("body", "x", 0.8, 0.8, 0, 0, true), o("body", "sq", 0.1, 0.8)] },
  { id: "b_dance", name: "Slime Dance", rig: "blob", cat: "Dance", osc: [o("body", "y", 0.6, 1), o("body", "z", 0.25, 2), o("body", "py", 0.15, 2, 0, 0, true)] },
];

export const ACTIONS: MotionAction[] = [...HUMAN, ...QUAD, ...BLOB];

export const ACTION_MAP: Record<string, MotionAction> = Object.fromEntries(ACTIONS.map((a) => [a.id, a]));

export const IDLE_ACTION: Record<RigType, string> = { human: "idle", quadruped: "q_idle", blob: "b_idle" };

export function actionsForRig(rig: RigType) {
  return ACTIONS.filter((a) => a.rig === rig);
}

export const ACTION_CATEGORIES = Array.from(new Set(ACTIONS.map((a) => a.cat)));

/** Total number of distinct motion variants the engine can produce. */
export function motionVariantCount() {
  const perAction = STYLES.length * INTENSITIES.length * SPEEDS.length * 2 * VARIANTS;
  return ACTIONS.length * perAction;
}

export interface PoseOut {
  rot: Record<string, [number, number, number]>;
  py: number;
  sq: number;
}

export interface PoseParams {
  style: string;
  intensity: number;
  speed: number;
  mirror: boolean;
  variant: number;
}

const MIRROR_MAP: Record<string, string> = {
  fl_up: "fr_up", fl_lo: "fr_lo", fr_up: "fl_up", fr_lo: "fl_lo",
  bl_up: "br_up", bl_lo: "br_lo", br_up: "bl_up", br_lo: "bl_lo",
};

function mirrorBone(name: string): string {
  if (MIRROR_MAP[name]) return MIRROR_MAP[name];
  if (name.startsWith("l") && /^l[A-Z]/.test(name)) return "r" + name.slice(1);
  if (name.startsWith("r") && /^r[A-Z]/.test(name)) return "l" + name.slice(1);
  return name;
}

export function evalMotion(action: MotionAction, t: number, p: PoseParams): PoseOut {
  const st = STYLE_MAP[p.style] ?? STYLES[0];
  const rot: Record<string, [number, number, number]> = {};
  let py = 0;
  let sq = 0;
  const shift = p.variant * (P / 2);
  const base = 2 * P * st.freq * p.speed;
  const ampMul = st.amp * p.intensity;

  for (const osc of action.osc) {
    const s = Math.sin(base * osc.f * t + osc.ph + shift);
    const v = osc.abs ? Math.abs(s) : s;
    let val = osc.off + osc.amp * ampMul * v;
    if (osc.a === "py") {
      py += val;
      continue;
    }
    if (osc.a === "sq") {
      sq += val;
      continue;
    }
    let bone = osc.b;
    if (p.mirror) {
      bone = mirrorBone(bone);
      if (osc.a === "y" || osc.a === "z") val = -val;
    }
    if (!rot[bone]) rot[bone] = [0, 0, 0];
    const idx = osc.a === "x" ? 0 : osc.a === "y" ? 1 : 2;
    rot[bone][idx] += val;
  }

  if (st.offsets) {
    for (const [bone, off] of Object.entries(st.offsets)) {
      if (!rot[bone]) rot[bone] = [0, 0, 0];
      rot[bone][0] += off[0];
      rot[bone][1] += off[1];
      rot[bone][2] += off[2];
    }
  }
  if (st.snap) {
    for (const k of Object.keys(rot)) {
      rot[k] = rot[k].map((v) => Math.round(v * 4) / 4) as [number, number, number];
    }
  }
  return { rot, py, sq };
}
