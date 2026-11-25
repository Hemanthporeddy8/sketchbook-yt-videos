/* Types for the 2D animation studio. */

export type Species = "human" | "girl" | "cat" | "dog" | "bird" | "rabbit" | "fox" | "bear" | "pig" | "panda";

export interface Appearance {
  skin: string;
  hair: string;
  hairStyle: number; // 0 bald, 1 short, 2 long, 3 spiky, 4 bun, 5 afro, 6 ponytail, 7 curly
  beard: boolean;
  beardColor: string;
  shirt: string;
  pants: string;
  shoes: string;
  eyes: string;
  build: number; // 0.86 slim, 1 average, 1.16 stocky
  hat: number; // 0 none, 1 cap, 2 top hat, 3 crown, 4 beanie, 5 cowboy
  hatColor: string;
  dress: boolean;
  dressColor: string;
}

export interface Actor2D {
  id: string;
  name: string;
  app: Appearance;
  species: Species;
  x: number;
  y?: number;
  facing: 1 | -1;
  scale: number;
  /** 0 = background (behind objects), 1 = middle, 2 = foreground */
  depth: number;
  /** when the character's clips are finished, remove it automatically */
  autoRemove?: boolean;
}

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
