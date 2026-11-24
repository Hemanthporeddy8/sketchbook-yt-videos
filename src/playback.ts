import { create } from "zustand";

export type RecState = "idle" | "recording" | "done";

/** Non-persisted playback state (kept separate so the project store is not rewritten every frame). */
export const usePlayback = create<{
  time: number;
  playing: boolean;
  loop: boolean;
  rec: RecState;
  recLabel: string;
}>()(() => ({
  time: 0,
  playing: false,
  loop: true,
  rec: "idle",
  recLabel: "",
}));
