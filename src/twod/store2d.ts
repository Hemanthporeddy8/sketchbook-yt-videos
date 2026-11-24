import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { uid } from "../lib/util";
import { appearanceFromIndex } from "./gen2d";
import { dimsOf, groundOf } from "./anim2d";
import type { Actor2D, Appearance, Aspect2D, Clip2D, Obj2D, Preview2D, Scene2D, SceneClip2D, Species } from "./types2d";

/* State for the 2D studio. Kept separate from the Film and Sandbox stores. */

export const DEFAULT_SCALE = 1.0;
export type Tab2D = "characters" | "actions" | "objects" | "scenes";
export interface Sel2D {
  kind: "actor" | "object" | "clip";
  id: string;
}
export interface Draft2D {
  stance: string;
  gesture: string;
  expression: string;
  speed: number;
  intensity: number;
  mirror: boolean;
  phase: number;
  duration: number;
  talk: boolean;
  say: string;
}
export const DEFAULT_DRAFT: Draft2D = {
  stance: "stand",
  gesture: "wave",
  expression: "happy",
  speed: 1,
  intensity: 1,
  mirror: false,
  phase: 0,
  duration: 3,
  talk: false,
  say: "",
};
export interface ObjDraft {
  palette: number;
  variant: number;
}

export const NAMES_2D = [
  "Ava", "Ben", "Cleo", "Dev", "Eli", "Fay", "Gus", "Hana", "Ivo", "Jade", "Kai", "Lena",
  "Milo", "Nia", "Oscar", "Pia", "Quinn", "Rosa", "Sam", "Tara", "Uma", "Vic", "Wren", "Yusuf",
];

export const makeClip = (c: Partial<Clip2D> & { actorId: string; start: number }): Clip2D => ({
  id: uid(),
  duration: 3,
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
  ...c,
});

function starter() {
  const a1 = uid();
  const a2 = uid();
  const a3 = uid();
  const actors: Actor2D[] = [
    { id: a1, name: "Ava", app: appearanceFromIndex(3), species: "human", x: 420, facing: 1, scale: DEFAULT_SCALE, depth: 1 },
    { id: a2, name: "Ben", app: appearanceFromIndex(17), species: "human", x: 860, facing: -1, scale: DEFAULT_SCALE, depth: 1 },
    { id: a3, name: "Mochi", app: appearanceFromIndex(41), species: "cat", x: 640, facing: 1, scale: 0.85, depth: 1 },
  ];
  const clips: Clip2D[] = [
    makeClip({ actorId: a1, start: 0.5, duration: 3, kind: "walk", toX: 620, gesture: "none" }),
    makeClip({ actorId: a1, start: 4, duration: 2.5, kind: "act", stance: "stand", gesture: "wave", expression: "happy", say: "Hi, I'm Ava!" }),
    makeClip({ actorId: a2, start: 0.5, duration: 3, kind: "act", stance: "stand", gesture: "nod", expression: "smirk" }),
    makeClip({ actorId: a2, start: 4.5, duration: 3, kind: "walk", toX: 1000, say: "Let's go!" }),
  ];
  const objects: Obj2D[] = [
    { id: uid(), name: "Tree", family: 0, palette: 0, variant: 1, x: 1120, y: groundOf("16:9"), scale: 1.2, rotation: 0, flip: false },
    { id: uid(), name: "Cloud", family: 5, palette: 0, variant: 1, x: 260, y: 170, scale: 1, rotation: 0, flip: false },
  ];
  const sceneClips: SceneClip2D[] = [
    { id: uid(), start: 6, duration: 12, kind: 8, palette: 8 },
  ];
  return { actors, clips, objects, scene: { kind: 0, palette: 0 } as Scene2D, sceneClips };
}

interface State2D {
  actors: Actor2D[];
  objects: Obj2D[];
  clips: Clip2D[];
  sceneClips: SceneClip2D[];
  preview: Preview2D | null;
  scene: Scene2D;
  aspect: Aspect2D;
  selected: Sel2D | null;
  tab: Tab2D;
  draft: Draft2D;
  objDraft: ObjDraft;
  playing: boolean;
  loop: boolean;
  t: number;
  rec: "idle" | "recording" | "done";
  recLabel: string;

  addActor: (appIndex: number, x?: number, species?: Species) => string;
  addSceneClip: (c: Partial<SceneClip2D> & { start: number }) => string;
  patchSceneClip: (id: string, p: Partial<SceneClip2D>) => void;
  setPreview: (p: Preview2D | null) => void;
  addCrowd: () => void;
  patchActor: (id: string, p: Partial<Actor2D>) => void;
  setAppearance: (id: string, p: Partial<Appearance>) => void;
  addObject: (o: Partial<Obj2D> & { name: string; x: number; y: number }) => string;
  patchObject: (id: string, p: Partial<Obj2D>) => void;
  addClip: (c: Partial<Clip2D> & { actorId: string; start: number }) => string;
  patchClip: (id: string, p: Partial<Clip2D>) => void;
  removeSelected: () => void;
  removeActorById: (id: string) => void;
  select: (s: Sel2D | null) => void;
  setScene: (s: Partial<Scene2D>) => void;
  setAspect: (a: Aspect2D) => void;
  setTab: (t: Tab2D) => void;
  setDraft: (p: Partial<Draft2D>) => void;
  setObjDraft: (p: Partial<ObjDraft>) => void;
  setPlaying: (v: boolean) => void;
  setLoop: (v: boolean) => void;
  setT: (t: number) => void;
  setRec: (s: "idle" | "recording" | "done", label: string) => void;
  reset: () => void;
}

export const useStudio2d = create<State2D>()(
  persist(
    (set, get) => ({
      ...starter(),
      preview: null,
      aspect: "16:9",
      selected: null,
      tab: "characters",
      draft: DEFAULT_DRAFT,
      objDraft: { palette: 0, variant: 1 },
      playing: false,
      loop: true,
      t: 0,
      rec: "idle",
      recLabel: "",

      addActor: (appIndex, x = 640, species: Species = "human") => {
        const id = uid();
        const n = get().actors.length;
        const a: Actor2D = {
          id,
          name: NAMES_2D[(appIndex + n) % NAMES_2D.length],
          app: appearanceFromIndex(appIndex),
          species,
          x,
          facing: 1,
          scale: species === "human" || species === "girl" ? DEFAULT_SCALE : 0.85,
          depth: 1,
        };
        set((s) => ({ actors: [...s.actors, a], selected: { kind: "actor", id } }));
        return id;
      },
      addCrowd: () => {
        const newActors: Actor2D[] = [];
        const newClips: Clip2D[] = [];
        for (let i = 0; i < 5; i++) {
          const id = uid();
          const dir = i % 2 === 0 ? 1 : -1;
          const startX = dir === 1 ? -70 : 1350;
          const endX = dir === 1 ? 1380 : -80;
          newActors.push({
            id,
            name: `Passer-by ${i + 1}`,
            app: appearanceFromIndex(1000 + Math.floor(Math.random() * 100000)),
            species: "human",
            autoRemove: true,
            x: Math.round(startX),
            facing: dir as 1 | -1,
            scale: 0.72,
            depth: 0,
          });
          newClips.push(
            makeClip({
              actorId: id,
              start: Math.round(i * 1.3 * 10) / 10,
              duration: Math.round((7 + Math.random() * 4) * 10) / 10,
              kind: "walk",
              toX: Math.round(endX),
            }),
          );
        }
        set((s) => ({ actors: [...s.actors, ...newActors], clips: [...s.clips, ...newClips] }));
      },
      patchActor: (id, p) => set((s) => ({ actors: s.actors.map((a) => (a.id === id ? { ...a, ...p } : a)) })),
      setAppearance: (id, p) => set((s) => ({ actors: s.actors.map((a) => (a.id === id ? { ...a, app: { ...a.app, ...p } } : a)) })),
      addObject: (o) => {
        const obj: Obj2D = { id: uid(), family: 0, palette: 0, variant: 1, scale: 1, rotation: 0, flip: false, ...o };
        set((s) => ({ objects: [...s.objects, obj], selected: { kind: "object", id: obj.id } }));
        return obj.id;
      },
      patchObject: (id, p) => set((s) => ({ objects: s.objects.map((o) => (o.id === id ? { ...o, ...p } : o)) })),
      addClip: (c) => {
        const clip = makeClip(c);
        set((s) => ({ clips: [...s.clips, clip], selected: { kind: "clip", id: clip.id } }));
        return clip.id;
      },
      patchClip: (id, p) => set((s) => ({ clips: s.clips.map((c) => (c.id === id ? { ...c, ...p } : c)) })),
      addSceneClip: (c) => {
        const clip: SceneClip2D = { id: uid(), duration: 3, kind: get().scene.kind, palette: get().scene.palette, ...c };
        set((s) => ({ sceneClips: [...s.sceneClips, clip], selected: { kind: "clip", id: clip.id } }));
        return clip.id;
      },
      patchSceneClip: (id, p) => set((s) => ({ sceneClips: s.sceneClips.map((c) => (c.id === id ? { ...c, ...p } : c)) })),
      setPreview: (p) => set({ preview: p }),
      removeActorById: (id) =>
        set((s) => ({
          actors: s.actors.filter((a) => a.id !== id),
          clips: s.clips.filter((c) => c.actorId !== id),
          selected: s.selected?.kind === "actor" && s.selected.id === id ? null : s.selected,
        })),
      removeSelected: () =>
        set((s) => {
          const sel = s.selected;
          if (!sel) return s;
          if (sel.kind === "actor") return { actors: s.actors.filter((a) => a.id !== sel.id), clips: s.clips.filter((c) => c.actorId !== sel.id), selected: null };
          if (sel.kind === "object") return { objects: s.objects.filter((o) => o.id !== sel.id), selected: null };
          if (s.sceneClips.some((c) => c.id === sel.id)) return { sceneClips: s.sceneClips.filter((c) => c.id !== sel.id), selected: null };
          return { clips: s.clips.filter((c) => c.id !== sel.id), selected: null };
        }),
      select: (sel) => set({ selected: sel }),
      setScene: (p) => set((s) => ({ scene: { ...s.scene, ...p } })),
      setAspect: (a) => set({ aspect: a }),
      setTab: (t) => set({ tab: t }),
      setDraft: (p) => set((s) => ({ draft: { ...s.draft, ...p } })),
      setObjDraft: (p) => set((s) => ({ objDraft: { ...s.objDraft, ...p } })),
      setPlaying: (v) => set({ playing: v }),
      setLoop: (v) => set({ loop: v }),
      setT: (t) => set({ t }),
      setRec: (st, label) => set({ rec: st, recLabel: label }),
      reset: () => set({ ...starter(), selected: null, playing: false, t: 0 }),
    }),
    {
      name: "pixelstage-2d-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        actors: s.actors,
        objects: s.objects,
        clips: s.clips,
        sceneClips: s.sceneClips,
        scene: s.scene,
        aspect: s.aspect,
        draft: s.draft,
        objDraft: s.objDraft,
        loop: s.loop,
      }),
    },
  ),
);

export { dimsOf };
