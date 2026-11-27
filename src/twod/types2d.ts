/* Types for the 2D animation studio. */

export type Species = "human" | "girl" | "cat" | "dog" | "bird" | "rabbit" | "fox" | "bear" | "pig" | "panda";

export interface Appearance {
  skin: string;
  hair: string;
  hairStyle: number; // 0 bald, 1 short, 2 long, 3 spiky, 4 bun, 5 afro, 6 ponytail, 7 curly, 8 dreadlocks, 9 bob cut, 10 mohawk
  beard: boolean;
  beardColor: string;
  shirt: string;
  pants: string;
  shoes: string;
  eyes: string;
  build: number; // 0.86 slim, 1 average, 1.16 stocky
  hat: number; // 0 none, 1 cap, 2 top hat, 3 crown, 4 beanie, 5 cowboy, 6 helmet, 7 wizard
  hatColor: string;
  dress: boolean;
  dressColor: string;
  outfit?: number; // 0 separates, 1 classic dress, 2 royal gown, 3 cute frock, 4 suit & tie, 5 hoodie, 6 kimono, 7 kurta/tunic, 8 superhero/armor, 9 doctor coat, 10 sports jersey
  accentColor?: string; // secondary accent color for trims, lapels, sash, tie
  bottomCut?: number; // 0 standard trousers, 1 shorts, 2 belted jeans, 3 pleated skirt
  glasses?: number; // 0 none, 1 round spectacles, 2 cool sunglasses, 3 square frames
  glassesColor?: string;
  neckwear?: number; // 0 none, 1 necktie, 2 bow-tie, 3 scarf, 4 necklace
  neckwearColor?: string;
  dressImage?: string; // data URL of user uploaded dress artwork/fabric pattern
}

export interface Actor2D {
  id: string;
  name: string;
  app: Appearance;
  species: Species;
  x: number;
  y?: number;
  rotation?: number; // body tilt angle in degrees (e.g. 90 for knockout fall, lying down)
  facing: 1 | -1;
  scale: number;
  /** 0 = background (behind objects), 1 = middle, 2 = foreground */
  depth: number;
  /** when the character's clips are finished, remove it automatically */
  autoRemove?: boolean;
  heldProp?: number; // family index of held object (-1 or undefined for none)
  heldHand?: "r" | "l";
  statTitle?: string; // comparison label (e.g. "Human / Average")
  statHeight?: string; // comparison height (e.g. "1.75 m / 5'9\"")
  statSub?: string; // extra stat subtitle (e.g. "Baseline scale")
  showStat?: boolean;
  voicePreset?: CharacterVoicePreset;
  voicePitch?: number; // 0.5 to 2.0 (default 1.0)
  voiceRate?: number;  // 0.5 to 1.8 (default 1.0)
  voiceLang?: string;  // e.g. "en-US", "en-IN", "en-GB"
  voiceURI?: string;   // specific browser voice
}

export type CharacterVoicePreset = "female" | "male" | "kid" | "monk" | "robot" | "cartoon";

export interface Obj2D {
  id: string;
  name: string;
  family: number; // index into OBJECT_FAMILIES, or -1 for an imported image
  palette: number;
  variant: number;
  src?: string; // data URL for imported PNG / SVG
  x: number;
  y: number; // bottom-centre of the object
  scale: number;
  rotation: number;
  flip: boolean;
  driverId?: string; // actorId of driver sitting in car
  statTitle?: string; // comparison label (e.g. "Burj Khalifa")
  statHeight?: string; // comparison height (e.g. "828 m / 2,717 ft")
  statSub?: string; // extra stat subtitle (e.g. "103× taller than house")
  showStat?: boolean;
}

export type CamShot = "wide" | "close" | "medium" | "low" | "tower" | "follow" | "custom";

export interface CameraClip2D {
  id: string;
  start: number;
  duration: number;
  shot: CamShot;
  targetId?: string; // actorId or objectId to follow/focus
  panX?: number; // center x (when no target or custom offset)
  panY?: number; // center y
  zoom?: number; // 0.3 to 3.0 (default 1.0)
  smooth?: boolean; // smooth glide transition from previous camera
  label?: string;
}

export interface Clip2D {
  id: string;
  actorId: string;
  start: number;
  duration: number;
  kind: "act" | "walk" | "drive" | "rest";
  stance: string;
  gesture: string;
  expression: string;
  talk: boolean;
  speed: number;
  intensity: number;
  mirror: boolean;
  phase: number;
  toX: number; // walk target x (walk clips only)
  say: string; // speech bubble text
  facing?: 1 | -1; // custom facing direction for this clip (1: right, -1: left)
  heldProp?: number; // prop override for this clip
  hitFx?: boolean; // trigger cartoon comic impact burst
}

export interface SceneClip2D {
  id: string;
  start: number;
  duration: number;
  kind: number;
  palette: number;
}

export type Aspect2D = "16:9" | "9:16" | "1:1";

export interface Scene2D {
  kind: number;
  palette: number;
  image?: string; // imported background image (data URL)
}

export interface Preview2D {
  actorId: string;
  stance: string;
  gesture: string;
  expression: string;
  until: number;
}

export interface AudioClip2D {
  id: string;
  actorId: string;
  start: number;
  duration: number;
  audioUrl: string; // Blob URL
  voicePreset?: string;
  volume?: number;
  label?: string;
  mocapFrames?: { t: number; face: Record<string, any>; head?: number }[];
}
