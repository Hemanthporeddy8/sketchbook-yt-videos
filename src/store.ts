import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Aspect,
  BuildTool,
  Caption,
  CharacterConfig,
  Clip,
  Gizmo,
  LeftTab,
  Mode,
  RightTab,
  SceneCharacter,
  Shape,
  ShapeType,
  Take,
} from "./lib/types";
import { CATALOG, catalogById, type CatalogEntry } from "./lib/catalog";
import { uid } from "./lib/util";

type Snapshot = { shapes: Shape[]; blocks: Record<string, string> };

export const BLOCK_COLORS = [
  "#9ca3af", "#78716c", "#a16207", "#854d0e", "#15803d", "#166534", "#0e7490", "#1d4ed8",
  "#7e22ce", "#be185d", "#dc2626", "#ea580c", "#facc15", "#f8fafc", "#1f2937", "#86efac",
];

export type ViewportShading = "solid" | "wireframe" | "material" | "xray";

export interface StudioState {
  projectName: string;
  mode: Mode;
  leftTab: LeftTab;
  rightTab: RightTab;
  aspect: Aspect;
  worldId: string;
  shading: ViewportShading;
  xrayOpacity: number;

  characters: SceneCharacter[];
  selectedCharId: string | null;

  clips: Clip[];
  selectedClipId: string | null;

  captions: Caption[];
  takes: Take[];
  mocapTargetId: string | null;

  camCmd: { preset: string; nonce: number };

  shapes: Shape[];
  selectedShapeId: string | null;
  blocks: Record<string, string>;
  history: Snapshot[];
  buildTool: BuildTool;
  shapeType: ShapeType;
  gizmo: Gizmo;
  paletteColor: string;
  snap: boolean;

  setProjectName: (n: string) => void;
  setMode: (m: Mode) => void;
  setLeftTab: (t: LeftTab) => void;
  setRightTab: (t: RightTab) => void;
  setAspect: (a: Aspect) => void;
  setWorld: (id: string) => void;
  setShading: (s: ViewportShading) => void;
  setXrayOpacity: (o: number) => void;

  addCharacter: (entry: CatalogEntry) => string;
  removeCharacter: (id: string) => void;
  duplicateCharacter: (id: string) => void;
  patchCharacter: (id: string, patch: Partial<Omit<SceneCharacter, "id" | "config">>) => void;
  patchConfig: (id: string, patch: Partial<CharacterConfig>) => void;
  selectChar: (id: string | null) => void;

  addClip: (c: Omit<Clip, "id">) => string;
  patchClip: (id: string, patch: Partial<Clip>) => void;
  removeClip: (id: string) => void;
  selectClip: (id: string | null) => void;

  addCaption: (text?: string, start?: number) => string;
  patchCaption: (id: string, patch: Partial<Caption>) => void;
  removeCaption: (id: string) => void;

  addTake: (take: Take) => void;
  setMocapTarget: (id: string | null) => void;

  setCamPreset: (preset: string) => void;

  addShape: (type?: ShapeType) => string;
  addCustom3DModel: (params: { name: string; imageData: string; customMode: "extrude" | "relief" | "voxel"; depth: number; bevel?: number }) => string;
  patchShape: (id: string, patch: Partial<Shape>) => void;
  removeShape: (id: string) => void;
  duplicateShape: (id: string) => void;
  selectShape: (id: string | null) => void;
  beginEdit: () => void;
  setGizmo: (g: Gizmo) => void;
  setShapeType: (t: ShapeType) => void;
  setBuildTool: (t: BuildTool) => void;
  setPaletteColor: (c: string) => void;
  setSnap: (v: boolean) => void;

  placeBlock: (key: string, color: string) => void;
  removeBlock: (key: string) => void;
  fillFloor: (size: number, color: string) => void;
  clearBlocks: () => void;
  undo: () => void;
  resetProject: () => void;
}

export function sceneEnd(clips: Clip[], captions: Caption[]) {
  let end = 6;
  for (const c of clips) end = Math.max(end, c.start + c.duration);
  for (const c of captions) end = Math.max(end, c.start + c.duration);
  return end;
}

const pushHist = (s: Pick<StudioState, "shapes" | "blocks" | "history">) => [
  ...s.history.slice(-59),
  { shapes: s.shapes, blocks: s.blocks },
];

const starterCharacters = (): SceneCharacter[] => {
  const human = catalogById("p0")!;
  const cat = catalogById("a0")!;
  return [
    { id: "c_human", name: human.name, catalogId: human.id, category: human.category, config: human.config, position: [-1.2, 0, 0], rotationY: 0.35 },
    { id: "c_cat", name: cat.name, catalogId: cat.id, category: cat.category, config: cat.config, position: [1.4, 0, 0.4], rotationY: -0.35 },
  ];
};

const starterClips = (): Clip[] => [
  { id: "k1", characterId: "c_human", start: 0, duration: 4, kind: "action", actionId: "walk", style: "normal", intensity: 1, speed: 1, mirror: false, variant: 0, expression: "happy" },
  { id: "k2", characterId: "c_human", start: 4, duration: 3, kind: "action", actionId: "wave", style: "energetic", intensity: 1, speed: 1, mirror: false, variant: 0, expression: "happy", talk: true },
  { id: "k3", characterId: "c_cat", start: 0, duration: 7, kind: "action", actionId: "q_wag", style: "normal", intensity: 1, speed: 1, mirror: false, variant: 0 },
];

const starterCaptions = (): Caption[] => [
  { id: "t1", start: 0.2, duration: 3.6, text: "Welcome to PixelStage!" },
  { id: "t2", start: 4, duration: 3, text: "Make 3D videos for YouTube Shorts." },
];

const starterShapes = (): Shape[] => [
  { id: "s1", type: "box", position: [3.2, 0.5, -2], rotation: [0, 0.4, 0], scale: [1.2, 1, 1.2], color: "#f97316" },
  { id: "s2", type: "sphere", position: [-3.4, 0.6, -1.5], rotation: [0, 0, 0], scale: [1.2, 1.2, 1.2], color: "#22d3ee" },
];

export const useStore = create<StudioState>()(
  persist(
    (set, get) => ({
      projectName: "My YouTube Video",
      mode: "film",
      leftTab: "cast",
      rightTab: "inspector",
      aspect: "16:9",
      worldId: "meadow",
      shading: "material",
      xrayOpacity: 0.45,

      characters: starterCharacters(),
      selectedCharId: "c_human",

      clips: starterClips(),
      selectedClipId: null,

      captions: starterCaptions(),
      takes: [],
      mocapTargetId: "c_human",

      camCmd: { preset: "wide", nonce: 0 },

      shapes: starterShapes(),
      selectedShapeId: null,
      blocks: {},
      history: [],
      buildTool: "shape",
      shapeType: "box",
      gizmo: "translate",
      paletteColor: BLOCK_COLORS[4],
      snap: false,

      setProjectName: (n) => set({ projectName: n }),
      setMode: (m) => set({ mode: m }),
      setLeftTab: (t) => set({ leftTab: t }),
      setRightTab: (t) => set({ rightTab: t }),
      setAspect: (a) => set({ aspect: a }),
      setWorld: (id) => set({ worldId: id }),
      setShading: (s) => set({ shading: s }),
      setXrayOpacity: (o) => set({ xrayOpacity: o }),

      addCharacter: (entry) => {
        const id = uid();
        const n = get().characters.length;
        const ch: SceneCharacter = {
          id,
          name: entry.name,
          catalogId: entry.id,
          category: entry.category,
          config: entry.config,
          position: [((n % 5) - 2) * 1.6, 0, Math.floor(n / 5) * 1.6 - 0.5],
          rotationY: 0,
        };
        set((s) => ({ characters: [...s.characters, ch], selectedCharId: id, mocapTargetId: s.mocapTargetId ?? id }));
        return id;
      },
      removeCharacter: (id) =>
        set((s) => ({
          characters: s.characters.filter((c) => c.id !== id),
          clips: s.clips.filter((c) => c.characterId !== id),
          selectedCharId: s.selectedCharId === id ? null : s.selectedCharId,
          mocapTargetId: s.mocapTargetId === id ? null : s.mocapTargetId,
        })),
      duplicateCharacter: (id) => {
        const src = get().characters.find((c) => c.id === id);
        if (!src) return;
        const nid = uid();
        set((s) => ({
          characters: [...s.characters, { ...src, id: nid, position: [src.position[0] + 1.2, src.position[1], src.position[2] + 0.6] }],
          selectedCharId: nid,
        }));
      },
      patchCharacter: (id, patch) =>
        set((s) => ({ characters: s.characters.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      patchConfig: (id, patch) =>
        set((s) => ({
          characters: s.characters.map((c) => (c.id === id ? { ...c, config: { ...c.config, ...patch } } : c)),
        })),
      selectChar: (id) => set({ selectedCharId: id, selectedShapeId: null }),

      addClip: (c) => {
        const id = uid();
        set((s) => ({ clips: [...s.clips, { ...c, id }], selectedClipId: id }));
        return id;
      },
      patchClip: (id, patch) => set((s) => ({ clips: s.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      removeClip: (id) => set((s) => ({ clips: s.clips.filter((c) => c.id !== id), selectedClipId: null })),
      selectClip: (id) => set({ selectedClipId: id }),

      addCaption: (text = "New caption", start = 0) => {
        const id = uid();
        set((s) => ({ captions: [...s.captions, { id, text, start, duration: 3 }] }));
        return id;
      },
      patchCaption: (id, patch) => set((s) => ({ captions: s.captions.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      removeCaption: (id) => set((s) => ({ captions: s.captions.filter((c) => c.id !== id) })),

      addTake: (take) => set((s) => ({ takes: [...s.takes, take] })),
      setMocapTarget: (id) => set({ mocapTargetId: id }),

      setCamPreset: (preset) => set((s) => ({ camCmd: { preset, nonce: s.camCmd.nonce + 1 } })),

      addShape: (type) => {
        const t = type ?? get().shapeType;
        const id = uid();
        const shape: Shape = {
          id,
          type: t,
          position: [0, t === "plane" ? 0.01 : 0.5, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          color: get().paletteColor,
        };
        set((s) => ({ history: pushHist(s), shapes: [...s.shapes, shape], selectedShapeId: id, buildTool: "shape" }));
        return id;
      },
      addCustom3DModel: (params) => {
        const id = uid();
        const shape: Shape = {
          id,
          name: params.name || "Custom 3D Model",
          type: "custom-3d",
          position: [0, 0.8, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          color: "#38bdf8",
          imageData: params.imageData,
          customMode: params.customMode,
          depth: params.depth,
          bevel: params.bevel,
        };
        set((s) => ({ history: pushHist(s), shapes: [...s.shapes, shape], selectedShapeId: id, buildTool: "shape" }));
        return id;
      },
      patchShape: (id, patch) => set((s) => ({ shapes: s.shapes.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeShape: (id) =>
        set((s) => ({ history: pushHist(s), shapes: s.shapes.filter((x) => x.id !== id), selectedShapeId: null })),
      duplicateShape: (id) => {
        const src = get().shapes.find((x) => x.id === id);
        if (!src) return;
        const nid = uid();
        set((s) => ({
          history: pushHist(s),
          shapes: [...s.shapes, { ...src, id: nid, position: [src.position[0] + 1, src.position[1], src.position[2] + 1] }],
          selectedShapeId: nid,
        }));
      },
      selectShape: (id) => set({ selectedShapeId: id, selectedCharId: id ? null : get().selectedCharId }),
      beginEdit: () => set((s) => ({ history: pushHist(s) })),
      setGizmo: (g) => set({ gizmo: g }),
      setShapeType: (t) => set({ shapeType: t }),
      setBuildTool: (t) => set({ buildTool: t }),
      setPaletteColor: (c) => set({ paletteColor: c }),
      setSnap: (v) => set({ snap: v }),

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
          for (let x = -half; x < size - half; x++) {
            for (let z = -half; z < size - half; z++) next[`${x},0,${z}`] = color;
          }
          return { history: pushHist(s), blocks: next };
        }),
      clearBlocks: () => set((s) => ({ history: pushHist(s), blocks: {} })),
      undo: () =>
        set((s) => {
          const last = s.history[s.history.length - 1];
          if (!last) return s;
          return { history: s.history.slice(0, -1), shapes: last.shapes, blocks: last.blocks, selectedShapeId: null };
        }),
      resetProject: () =>
        set({
          characters: starterCharacters(),
          clips: starterClips(),
          captions: starterCaptions(),
          shapes: starterShapes(),
          blocks: {},
          history: [],
          worldId: "meadow",
          selectedCharId: "c_human",
          selectedClipId: null,
          selectedShapeId: null,
          mocapTargetId: "c_human",
        }),
    }),
    {
      name: "pixelstage-project-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        projectName: s.projectName,
        aspect: s.aspect,
        worldId: s.worldId,
        characters: s.characters,
        clips: s.clips,
        captions: s.captions,
        shapes: s.shapes,
        blocks: s.blocks,
        paletteColor: s.paletteColor,
        shapeType: s.shapeType,
        mocapTargetId: s.mocapTargetId,
      }),
    },
  ),
);

export { CATALOG };
