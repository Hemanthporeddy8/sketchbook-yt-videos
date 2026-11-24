import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CharacterConfig, Gizmo } from "../lib/types";
import { catalogById, defaultConfig } from "../lib/catalog";
import { uid } from "../lib/util";
import { ASSET_MAP } from "./assets";
import { defaultDialogue, type DLine } from "./dialogue";
import type { CamMode } from "./camera";

/* Sandbox is a separate workspace: nothing here is part of the film timeline. */

export type SandboxTool = "select" | "asset" | "block";
export type MechType = "none" | "spin" | "oscillate" | "bounce" | "forward";
export type Behavior = "idle" | "wander" | "patrol" | "vendor";

export interface Mech {
  type: MechType;
  speed: number;
  amount: number;
  axis: "x" | "y" | "z";
}

export interface SObject {
  id: string;
  assetId: string;
  position: [number, number, number];
  rotationY: number;
  color?: string;
  mech: Mech;
}

export const NO_MECH: Mech = { type: "none", speed: 1, amount: 0, axis: "y" };

export type Target =
  | { kind: "point"; x: number; z: number }
  | { kind: "actor"; id: string }
  | { kind: "player" }
  | { kind: "object"; id: string };

export type Cmd =
  | { id: string; type: "walk"; target: Target }
  | { id: string; type: "follow"; target: Target; seconds: number }
  | { id: string; type: "face"; target: Target }
  | { id: string; type: "perform"; stance: string; gesture: string; seconds: number }
  | { id: string; type: "say"; text: string; seconds: number }
  | { id: string; type: "grab"; objectId: string | null }
  | { id: string; type: "drop" }
  | { id: string; type: "throw" }
  | { id: string; type: "wait"; seconds: number }
  | { id: string; type: "expression"; expression: string };

export interface SActor {
  id: string;
  name: string;
  catalogId: string;
  category: string;
  config: CharacterConfig;
  startX: number;
  startZ: number;
  startYaw: number;
  queue: Cmd[];
  role: string;
  behavior: Behavior;
  wanderRadius: number;
  greeting: string;
  dialogue: DLine[];
}

/** The conversation currently open in the viewport. */
export interface Convo {
  actorId: string;
  text: string;
  options: { label: string; idx: number }[];
  ended: boolean;
}

export const PLAYER_ID = "p-you";

/** Your character: deliberately different from every NPC (cyan hoodie, cap, white headphones). */
export const PLAYER_CONFIG: CharacterConfig = {
  ...defaultConfig("human"),
  skin: "#e0a66b",
  hair: "#1c1c2e",
  hairStyle: 3,
  top: "#0ea5e9",
  bottom: "#0f172a",
  shoes: "#f8fafc",
  hat: 1,
  hatColor: "#0ea5e9",
  accessory: 5,
  accessoryColor: "#22d3ee",
};

export const SANDBOX_COLORS = [
  "#94a3b8", "#f97316", "#ef4444", "#facc15", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7",
  "#ec4899", "#f8fafc", "#1f2937", "#78716c", "#a16207", "#4ade80", "#38bdf8", "#f472b6",
];

interface Snap {
  objects: SObject[];
  blocks: Record<string, string>;
}

/** Fills in fields that older saves do not have, so every actor always has a role, dialogue and behaviour. */
export function fillActor(a: SActor): SActor {
  const role = a.role || "Villager";
  const dd = defaultDialogue(role, a.name);
  return {
    ...a,
    role,
    behavior: a.behavior ?? "idle",
    wanderRadius: a.wanderRadius ?? 4,
    greeting: a.greeting || dd.greeting,
    dialogue: a.dialogue && a.dialogue.length ? a.dialogue : dd.lines,
    startYaw: a.startYaw ?? 0,
  };
}

const mkAt = (assetId: string, x: number, y: number, z: number, yaw = 0): SObject => {
  const a = ASSET_MAP[assetId];
  const m = a?.mech;
  return {
    id: uid(),
    assetId,
    position: [x, y, z],
    rotationY: yaw,
    color: a?.colorable ? "#f97316" : undefined,
    mech: m ? { type: m.type, speed: m.speed, amount: m.amount, axis: m.axis } : { ...NO_MECH },
  };
};

const mkActor = (
  id: string,
  catalogId: string,
  name: string,
  x: number,
  z: number,
  queue: Cmd[],
  extra: Partial<SActor> = {},
): SActor => {
  const e = catalogById(catalogId);
  return fillActor({
    id,
    name,
    catalogId,
    category: e?.category ?? "People",
    config: e?.config ?? defaultConfig("human"),
    startX: x,
    startZ: z,
    startYaw: 0,
    queue,
    role: "Villager",
    behavior: "idle",
    wanderRadius: 4,
    greeting: "",
    dialogue: [],
    ...extra,
  });
};

const playerActor = (): SActor =>
  fillActor({
    id: PLAYER_ID,
    name: "You",
    catalogId: "custom",
    category: "Player",
    config: PLAYER_CONFIG,
    startX: 0,
    startZ: 4,
    startYaw: 0,
    queue: [],
    role: "You",
    behavior: "idle",
    wanderRadius: 4,
    greeting: "",
    dialogue: [],
  });

const starterObjects = (): SObject[] => [
  mkAt("house-cottage-0", -12, 0, -12),
  mkAt("road-straight", 0, 0, 0),
  mkAt("road-straight", 0, 0, 6),
  mkAt("road-cross", 0, 0, 12),
  mkAt("car-sedan-0", 4, 0, 3, Math.PI / 2),
  mkAt("tree-oak-l", 9, 0, -9),
  mkAt("tree-pine-s", -9, 0, 9),
  mkAt("tree-palm-l", 14, 0, 6),
  mkAt("tree-birch-s", -16, 0, -2),
  mkAt("mech-fan", -4, 0, -16),
  mkAt("mech-platform", 16, 0, -14),
  mkAt("prop-spring", 6, 0, -6),
  mkAt("heli-0", -14, 0, 16),
  mkAt("wall-brick-0", 20, 0, 2),
  mkAt("prop-crate", -2, 0, -4),
  mkAt("prop-ball", 2, 0, -3),
];

const starterActors = (): SActor[] => [
  playerActor(),
  mkActor("a-kai", "p11", "Kai", -4, -4, [
    { id: uid(), type: "follow", target: { kind: "player" }, seconds: 20 },
    { id: uid(), type: "perform", stance: "stand", gesture: "wave", seconds: 3 },
  ], { role: "Guard", behavior: "wander", wanderRadius: 5 }),
];

/** A market scene: stalls, a vendor who shops and grabs goods, and two NPCs who follow her. */
export function marketScene() {
  const objects: SObject[] = [
    mkAt("road-cross", 0, 0, 0),
    mkAt("road-straight", 0, 0, -6),
    mkAt("road-straight", 0, 0, 6),
    mkAt("prop-table", -6, 0, -3),
    mkAt("prop-boxes", -6, 0.75, -3),
    mkAt("prop-ball", -5.5, 0.75, -2.5),
    mkAt("prop-table", 6, 0, -3),
    mkAt("prop-barrel", 6.2, 0, -1.2),
    mkAt("prop-crate", 5.4, 0, -4.2),
    mkAt("prop-table", -6, 0, 4),
    mkAt("prop-ball", -6, 0.75, 4),
    mkAt("prop-table", 6, 0, 4),
    mkAt("prop-boxes", 6, 0.75, 4),
    mkAt("street-lamp", -9, 0, 0),
    mkAt("street-lamp", 9, 0, 0),
    mkAt("bin", -3, 0, -1),
    mkAt("tree-apple-l", -13, 0, -9),
    mkAt("tree-oak-s", 13, 0, -9),
    mkAt("tree-palm-s", 13, 0, 9),
    mkAt("bench", 3, 0, 8),
  ];
  const mia: Cmd[] = [
    { id: uid(), type: "walk", target: { kind: "point", x: -6, z: -1 } },
    { id: uid(), type: "say", text: "Let's go shopping!", seconds: 2.5 },
    { id: uid(), type: "grab", objectId: null },
    { id: uid(), type: "walk", target: { kind: "point", x: 4, z: -1 } },
    { id: uid(), type: "drop" },
    { id: uid(), type: "say", text: "Here you go!", seconds: 2 },
    { id: uid(), type: "perform", stance: "stand", gesture: "wave", seconds: 3 },
    { id: uid(), type: "walk", target: { kind: "point", x: 0, z: 5 } },
    { id: uid(), type: "say", text: "Follow me, everyone!", seconds: 2.5 },
  ];
  const kai: Cmd[] = [
    { id: uid(), type: "follow", target: { kind: "actor", id: "a-mia" }, seconds: 25 },
    { id: uid(), type: "perform", stance: "stand", gesture: "cheer", seconds: 3 },
  ];
  const zoe: Cmd[] = [
    { id: uid(), type: "wait", seconds: 1 },
    { id: uid(), type: "follow", target: { kind: "actor", id: "a-mia" }, seconds: 24 },
    { id: uid(), type: "perform", stance: "relaxed", gesture: "dance-groove", seconds: 4 },
  ];
  const actors: SActor[] = [
    playerActor(),
    mkActor("a-mia", "p3", "Mia the vendor", -4, -7, mia, { role: "Vendor", behavior: "vendor", wanderRadius: 3 }),
    mkActor("a-kai", "p11", "Kai", -5, -6, kai, { role: "Guard", behavior: "wander", wanderRadius: 3 }),
    mkActor("a-zoe", "m4", "Zoe", -3, -6, zoe, { role: "Kid", behavior: "idle" }),
  ];
  return { objects, actors };
}

export interface SandboxState {
  objects: SObject[];
  blocks: Record<string, string>;
  history: Snap[];
  selectedId: string | null;
  tool: SandboxTool;
  assetId: string;
  ghostYaw: number;
  blockColor: string;
  play: boolean;
  worldId: string;
  editingId: string | null;
  gizmo: Gizmo;
  recState: "idle" | "recording" | "done";
  recLabel: string;
  camCmd: { preset: string; nonce: number };
  camMode: CamMode;
  drawerOpen: boolean;

  actors: SActor[];
  playerId: string | null;
  selectedActorId: string | null;
  scriptRunning: boolean;
  scriptRepeat: boolean;
  convo: Convo | null;

  setSbCam: (preset: string) => void;
  setCamMode: (m: CamMode) => void;
  setDrawer: (open: boolean) => void;
  setConvo: (c: Convo | null) => void;
  addObject: (assetId: string, pos: [number, number, number], yaw: number) => string;
  patchObject: (id: string, patch: Partial<SObject>) => void;
  removeObject: (id: string) => void;
  duplicateObject: (id: string) => void;
  rotateObject: (id: string, deg: number) => void;
  rotateGhost: (deg: number) => void;
  selectObj: (id: string | null) => void;
  setTool: (t: SandboxTool) => void;
  setAssetId: (id: string) => void;
  setBlockColor: (c: string) => void;
  placeBlock: (key: string, color: string) => void;
  removeBlock: (key: string) => void;
  fillFloor: (size: number, color: string) => void;
  clearBlocks: () => void;
  beginEdit: () => void;
  setEditing: (id: string | null) => void;
  setGizmo: (g: Gizmo) => void;
  setPlay: (v: boolean) => void;
  setWorld: (id: string) => void;
  undo: () => void;
  setRec: (s: "idle" | "recording" | "done", label: string) => void;
  resetSandbox: () => void;
  clearScene: () => void;

  addActor: (catalogId: string) => string;
  removeActor: (id: string) => void;
  patchActor: (id: string, patch: Partial<SActor>) => void;
  setPlayer: (id: string | null) => void;
  selectActor: (id: string | null) => void;
  addCmd: (actorId: string, cmd: Cmd) => void;
  removeCmd: (actorId: string, idx: number) => void;
  moveCmd: (actorId: string, idx: number, dir: -1 | 1) => void;
  clearQueue: (actorId: string) => void;
  setScriptRunning: (v: boolean) => void;
  setScriptRepeat: (v: boolean) => void;
  loadMarketDemo: () => void;
}

const pushHist = (s: { objects: SObject[]; blocks: Record<string, string>; history: Snap[] }) => [
  ...s.history.slice(-59),
  { objects: s.objects, blocks: s.blocks },
];

export const useSandbox = create<SandboxState>()(
  persist(
    (set, get) => ({
      objects: starterObjects(),
      blocks: {},
      history: [],
      selectedId: null,
      tool: "select",
      assetId: "tree-oak-l",
      ghostYaw: 0,
      blockColor: SANDBOX_COLORS[4],
      play: false,
      worldId: "meadow",
      editingId: null,
      gizmo: "translate",
      recState: "idle",
      recLabel: "",
      camCmd: { preset: "wide", nonce: 0 },
      camMode: "orbit",
      drawerOpen: false,

      actors: starterActors(),
      playerId: PLAYER_ID,
      selectedActorId: null,
      scriptRunning: false,
      scriptRepeat: false,
      convo: null,

      setSbCam: (preset) => {
        if (preset === "chase") {
          set({ camMode: "third" });
          return;
        }
        if (preset === "free") {
          set({ camMode: "fly" });
          return;
        }
        set((s) => ({ camMode: "orbit", camCmd: { preset, nonce: s.camCmd.nonce + 1 } }));
      },
      setCamMode: (m) => set({ camMode: m }),
      setDrawer: (open) => set({ drawerOpen: open }),
      setConvo: (c) => set({ convo: c }),

      addObject: (assetId, pos, yaw) => {
        const o = mkAt(assetId, pos[0], pos[1], pos[2], yaw);
        set((s) => ({ history: pushHist(s), objects: [...s.objects, o], selectedId: o.id, selectedActorId: null, tool: "select" }));
        return o.id;
      },
      patchObject: (id, patch) => set((s) => ({ objects: s.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
      removeObject: (id) => set((s) => ({ history: pushHist(s), objects: s.objects.filter((o) => o.id !== id), selectedId: null })),
      duplicateObject: (id) => {
        const src = get().objects.find((o) => o.id === id);
        if (!src) return;
        const nid = uid();
        set((s) => ({
          history: pushHist(s),
          objects: [...s.objects, { ...src, id: nid, position: [src.position[0] + 2, src.position[1], src.position[2] + 2] }],
          selectedId: nid,
        }));
      },
      rotateObject: (id, deg) =>
        set((s) => ({ objects: s.objects.map((o) => (o.id === id ? { ...o, rotationY: o.rotationY + (deg * Math.PI) / 180 } : o)) })),
      rotateGhost: (deg) => set((s) => ({ ghostYaw: s.ghostYaw + (deg * Math.PI) / 180 })),
      selectObj: (id) =>
        set({
          selectedId: id,
          selectedActorId: id ? null : get().selectedActorId,
          tool: id ? "select" : get().tool === "asset" ? "asset" : "select",
        }),
      setTool: (t) => set({ tool: t, selectedId: t === "select" ? get().selectedId : null }),
      setAssetId: (id) => set({ assetId: id, tool: "asset", selectedId: null }),
      setBlockColor: (c) => set({ blockColor: c, tool: "block", selectedId: null }),

      placeBlock: (key, color) =>
        set((s) => {
          if (s.blocks[key] === color) return s;
          return { history: pushHist(s), blocks: { ...s.blocks, [key]: color } };
        }),
      removeBlock: (key) =>
        set((s) => {
          if (!(key in s.blocks)) return s;
          const next = { ...s.blocks };
          delete next[key];
          return { history: pushHist(s), blocks: next };
        }),
      fillFloor: (size, color) =>
        set((s) => {
          const next = { ...s.blocks };
          const half = Math.floor(size / 2);
          for (let x = -half; x < size - half; x++) for (let z = -half; z < size - half; z++) next[`${x},0,${z}`] = color;
          return { history: pushHist(s), blocks: next };
        }),
      clearBlocks: () => set((s) => ({ history: pushHist(s), blocks: {} })),

      beginEdit: () => set((s) => ({ history: pushHist(s) })),
      setEditing: (id) => set({ editingId: id }),
      setGizmo: (g) => set({ gizmo: g }),
      setPlay: (v) => set({ play: v }),
      setWorld: (id) => set({ worldId: id }),
      undo: () =>
        set((s) => {
          const last = s.history[s.history.length - 1];
          if (!last) return s;
          return { history: s.history.slice(0, -1), objects: last.objects, blocks: last.blocks, selectedId: null };
        }),
      setRec: (st, label) => set({ recState: st, recLabel: label }),
      resetSandbox: () =>
        set({
          objects: starterObjects(),
          blocks: {},
          history: [],
          selectedId: null,
          play: false,
          tool: "select",
          actors: starterActors(),
          playerId: PLAYER_ID,
          selectedActorId: null,
          scriptRunning: false,
          convo: null,
        }),
      clearScene: () =>
        set({
          objects: [],
          blocks: {},
          history: [],
          selectedId: null,
          play: false,
          tool: "select",
          actors: [playerActor()],
          playerId: PLAYER_ID,
          selectedActorId: null,
          scriptRunning: false,
          convo: null,
        }),

      addActor: (catalogId) => {
        const e = catalogById(catalogId);
        const id = uid();
        const n = get().actors.length;
        const a = fillActor({
          id,
          name: e?.name ?? "NPC",
          catalogId,
          category: e?.category ?? "People",
          config: e?.config ?? defaultConfig("human"),
          startX: ((n % 5) - 2) * 2,
          startZ: -4 - Math.floor(n / 5) * 2,
          startYaw: 0,
          queue: [],
          role: "Villager",
          behavior: "wander",
          wanderRadius: 4,
          greeting: "",
          dialogue: [],
        });
        set((s) => ({ actors: [...s.actors, a], selectedActorId: id, selectedId: null }));
        return id;
      },
      removeActor: (id) =>
        set((s) => ({
          actors: s.actors.filter((a) => a.id !== id || a.id === s.playerId),
          selectedActorId: s.selectedActorId === id ? null : s.selectedActorId,
        })),
      patchActor: (id, patch) => set((s) => ({ actors: s.actors.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      setPlayer: (id) => set({ playerId: id }),
      selectActor: (id) => set({ selectedActorId: id, selectedId: null }),
      addCmd: (actorId, cmd) =>
        set((s) => ({ actors: s.actors.map((a) => (a.id === actorId ? { ...a, queue: [...a.queue, cmd] } : a)) })),
      removeCmd: (actorId, idx) =>
        set((s) => ({ actors: s.actors.map((a) => (a.id === actorId ? { ...a, queue: a.queue.filter((_, i) => i !== idx) } : a)) })),
      moveCmd: (actorId, idx, dir) =>
        set((s) => ({
          actors: s.actors.map((a) => {
            if (a.id !== actorId) return a;
            const j = idx + dir;
            if (j < 0 || j >= a.queue.length) return a;
            const q = [...a.queue];
            [q[idx], q[j]] = [q[j], q[idx]];
            return { ...a, queue: q };
          }),
        })),
      clearQueue: (actorId) => set((s) => ({ actors: s.actors.map((a) => (a.id === actorId ? { ...a, queue: [] } : a)) })),
      setScriptRunning: (v) => set({ scriptRunning: v }),
      setScriptRepeat: (v) => set({ scriptRepeat: v }),
      loadMarketDemo: () => {
        const m = marketScene();
        set({
          objects: m.objects,
          blocks: {},
          history: [],
          actors: m.actors,
          playerId: PLAYER_ID,
          selectedActorId: null,
          selectedId: null,
          worldId: "village",
          scriptRunning: false,
          convo: null,
        });
      },
    }),
    {
      name: "pixelstage-sandbox-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        objects: s.objects,
        blocks: s.blocks,
        worldId: s.worldId,
        blockColor: s.blockColor,
        actors: s.actors,
        playerId: s.playerId,
        scriptRepeat: s.scriptRepeat,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SandboxState>;
        return { ...current, ...p, actors: (p.actors ?? current.actors).map(fillActor) } as SandboxState;
      },
    },
  ),
);
