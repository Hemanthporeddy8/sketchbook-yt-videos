export type RigType = "human" | "quadruped" | "blob";

export interface CharacterConfig {
  rig: RigType;
  species: string;
  // Human / memeoji / fantasy humanoids
  skin: string;
  hair: string;
  hairStyle: number; // 0 bald, 1 short, 2 long, 3 spiky, 4 bun, 5 afro
  top: string;
  bottom: string;
  shoes: string;
  hat: number; // 0 none,1 cap,2 top hat,3 crown,4 beanie,5 cowboy,6 party,7 wizard,8 antenna,9 halo
  hatColor: string;
  accessory: number; // 0 none,1 glasses,2 bowtie,3 cape,4 backpack,5 headphones,6 scarf
  accessoryColor: string;
  wings: boolean;
  tail: boolean;
  horns: boolean;
  // Animals / creatures
  bodyColor: string;
  bellyColor: string;
  earStyle: number; // 0 pointy,1 round,2 floppy,3 long
  tailStyle: number; // 1 long,2 short,3 stub,4 fluffy,5 curl
  snout: number; // 0..1
  spots: boolean;
  blobEyes: number; // 1..3
  spikes: boolean;
  // Shared
  eyeColor: string;
  height: number;
  build: number;
  headScale: number;
}

export interface SceneCharacter {
  id: string;
  name: string;
  catalogId: string;
  category: string;
  config: CharacterConfig;
  position: [number, number, number];
  rotationY: number;
}

export interface Clip {
  id: string;
  characterId: string;
  start: number;
  duration: number;
  kind: "action" | "take" | "footage";
  // procedural motion
  actionId?: string;
  style?: string;
  intensity?: number;
  speed?: number;
  mirror?: boolean;
  variant?: number;
  // mocap take
  takeId?: string;
  // face
  expression?: string;
  talk?: boolean;
  footageId?: string;
  label?: string;
}

export interface TakeFrame {
  t: number;
  py: number;
  bones: Record<string, number[]>; // local quaternions [x,y,z,w]
  face: Record<string, number>;
}

export interface Take {
  id: string;
  name: string;
  duration: number;
  fps: number;
  source: "webcam" | "video";
  frames: TakeFrame[];
}

export interface Caption {
  id: string;
  start: number;
  duration: number;
  text: string;
}

export type ShapeType =
  | "box"
  | "sphere"
  | "cylinder"
  | "cone"
  | "torus"
  | "plane"
  | "pyramid"
  | "capsule";

export interface Shape {
  id: string;
  type: ShapeType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
}

/** Timeline track id for imported video footage (not a character). */
export const FOOTAGE_TRACK = "__footage__";

export type Mode = "film" | "sandbox" | "2d";
export type LeftTab = "cast" | "library" | "worlds" | "build";
export type RightTab = "inspector" | "mocap";
export type Aspect = "16:9" | "9:16" | "1:1";
export type Gizmo = "translate" | "rotate" | "scale";
export type BuildTool = "shape" | "block";
