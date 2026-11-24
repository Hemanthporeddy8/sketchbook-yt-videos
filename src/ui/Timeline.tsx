import { useRef, useState } from "react";
import type React from "react";
import { Film, Pause, Play, Plus, Repeat, SkipBack, Trash2, Type } from "lucide-react";
import { footageUrl, importFootage } from "../lib/footage";
import { FOOTAGE_TRACK } from "../lib/types";
import { useStore, sceneEnd } from "../store";
import { usePlayback } from "../playback";
import { fmtTime } from "../lib/util";
import { ACTION_MAP } from "../lib/motions";
import { cn } from "../utils/cn";

const LABEL_W = 150;

export function Timeline() {
  const playing = usePlayback((s) => s.playing);
  const loop = usePlayback((s) => s.loop);
  const time = usePlayback((s) => s.time);
  const recState = usePlayback((s) => s.rec);
  const characters = useStore((s) => s.characters);
  const clips = useStore((s) => s.clips);
  const captions = useStore((s) => s.captions);
  const selectedClipId = useStore((s) => s.selectedClipId);
  const selectClip = useStore((s) => s.selectClip);
  const selectChar = useStore((s) => s.selectChar);
  const removeClip = useStore((s) => s.removeClip);
  const addClip = useStore((s) => s.addClip);
  const addCaption = useStore((s) => s.addCaption);
  const patchClip = useStore((s) => s.patchClip);
  const patchCaption = useStore((s) => s.patchCaption);
  const removeCaption = useStore((s) => s.removeCaption);
  const selectedCharId = useStore((s) => s.selectedCharId);

  const fileRef = useRef<HTMLInputElement>(null);
  const pickFootage = async (file: File) => {
    const f = await importFootage(file);
    addClip({
      characterId: FOOTAGE_TRACK,
      start: Math.round(usePlayback.getState().time * 10) / 10,
      duration: f.duration,
      kind: "footage",
      footageId: f.id,
      label: f.name,
      expression: "neutral",
      talk: false,
    });
  };
  const [pps, setPps] = useState(60);
  const end = sceneEnd(clips, captions);
  const width = Math.max(end + 4, 14) * pps;
  const scrollRef = useRef<HTMLDivElement>(null);

  const setTime = (t: number) => usePlayback.setState({ time: Math.max(0, Math.min(t, 600)), playing: false });

  const scrubFromEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTime((e.clientX - rect.left) / pps);
  };

  const beginDrag = (
    e: React.PointerEvent,
    start: number,
    apply: (newStart: number) => void,
  ) => {
    e.stopPropagation();
    const startX = e.clientX;
    const move = (ev: PointerEvent) => {
      const dt = (ev.clientX - startX) / pps;
      apply(Math.max(0, Math.round((start + dt) * 10) / 10));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const addMotionAt = (charId: string) => {
    const ch = characters.find((c) => c.id === charId);
    const actionId = ch?.config.rig === "quadruped" ? "q_walk" : ch?.config.rig === "blob" ? "b_bounce" : "walk";
    const id = addClip({
      characterId: charId,
      start: Math.round(time * 10) / 10,
      duration: 3,
      kind: "action",
      actionId,
      style: "normal",
      intensity: 1,
      speed: 1,
      mirror: false,
      variant: 0,
      expression: "neutral",
      talk: false,
    });
    selectClip(id);
    selectChar(charId);
  };

  const ticks: number[] = [];
  for (let s = 0; s <= Math.ceil(width / pps); s++) ticks.push(s);

  const selectedClip = clips.find((c) => c.id === selectedClipId);

  return (
    <section className="flex h-[248px] shrink-0 flex-col border-t border-white/5 bg-[#0b0d13]">
      {/* Transport */}
      <div className="flex h-10 items-center gap-2 border-b border-white/5 px-3">
        <button
          onClick={() => setTime(0)}
          title="Back to start"
          className="rounded-md p-1.5 text-slate-300 hover:bg-white/10"
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            if (playing) usePlayback.setState({ playing: false });
            else {
              const t = usePlayback.getState().time;
              const total = sceneEnd(useStore.getState().clips, useStore.getState().captions);
              if (t >= total) usePlayback.setState({ time: 0 });
              usePlayback.setState({ playing: true });
            }
          }}
          disabled={recState === "recording"}
          title="Play / pause (Space)"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500 text-black hover:bg-cyan-400 disabled:opacity-40"
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 translate-x-px" />}
        </button>
        <button
          onClick={() => usePlayback.setState({ loop: !loop })}
          title="Loop"
          className={cn("rounded-md p-1.5 hover:bg-white/10", loop ? "text-cyan-300" : "text-slate-500")}
        >
          <Repeat className="h-4 w-4" />
        </button>
        <div className="font-mono text-xs tabular-nums text-slate-200">
          {fmtTime(time)} <span className="text-slate-600">/ {fmtTime(end)}</span>
        </div>
        <div className="ml-4 flex items-center gap-2 text-[10px] text-slate-500">
          Zoom
          <input type="range" min={30} max={140} value={pps} onChange={(e) => setPps(parseInt(e.target.value, 10))} className="w-24 accent-cyan-400" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {selectedClip && (
            <button onClick={() => removeClip(selectedClip.id)} className="flex items-center gap-1 rounded-md bg-red-500/15 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/25">
              <Trash2 className="h-3 w-3" /> Delete clip
            </button>
          )}
          <button onClick={() => fileRef.current?.click()} title="Add a video clip, for example a sandbox recording" className="flex items-center gap-1 rounded-md bg-sky-500/15 px-2 py-1 text-[11px] text-sky-200 hover:bg-sky-500/25">
            <Film className="h-3 w-3" /> Footage
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void pickFootage(f);
              e.target.value = "";
            }}
          />
          <button onClick={() => addCaption(`Line at ${fmtTime(time)}`, Math.round(time * 10) / 10)} className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[11px] text-slate-200 hover:bg-white/10">
            <Type className="h-3 w-3" /> Add caption
          </button>
        </div>
      </div>

      {/* Tracks */}
      <div className="flex min-h-0 flex-1 overflow-y-auto">
        <div className="sticky left-0 z-20 shrink-0 border-r border-white/5 bg-[#0b0d13]" style={{ width: LABEL_W }}>
          <div className="h-6 border-b border-white/5" />
          <div className="flex h-9 items-center px-3 text-[10px] font-semibold uppercase tracking-wider text-amber-300/80">Captions</div>
          <div className="flex h-11 items-center px-3 text-[10px] font-semibold uppercase tracking-wider text-sky-300/80">Footage</div>
          {characters.map((c) => (
            <div
              key={c.id}
              onClick={() => selectChar(c.id)}
              className={cn("group flex h-11 cursor-pointer items-center gap-2 border-t border-white/5 px-3", selectedCharId === c.id && "bg-cyan-500/5")}
            >
              <span className="min-w-0 flex-1 truncate text-[11px] text-slate-300">{c.name}</span>
              <button
                title="Add motion at playhead"
                onClick={(e) => {
                  e.stopPropagation();
                  addMotionAt(c.id);
                }}
                className="rounded p-0.5 text-slate-500 opacity-0 hover:bg-white/10 hover:text-cyan-300 group-hover:opacity-100"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {characters.length === 0 && <div className="px-3 py-3 text-[11px] text-slate-600">Add characters from the Library</div>}
        </div>

        <div ref={scrollRef} className="relative min-w-0 flex-1 overflow-x-auto">
          <div className="relative" style={{ width: width, minHeight: "100%" }}>
            {/* Ruler */}
            <div
              className="sticky top-0 z-10 h-6 cursor-pointer border-b border-white/5 bg-[#0b0d13]"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                scrubFromEvent(e);
              }}
              onPointerMove={(e) => {
                if (e.buttons === 1) scrubFromEvent(e);
              }}
            >
              {ticks.map((s) => (
                <div key={s} className="absolute top-0 h-full border-l border-white/10 pl-1 text-[9px] text-slate-500" style={{ left: s * pps }}>
                  {s}s
                </div>
              ))}
            </div>

            {/* Caption track */}
            <div
              className="relative h-9 border-b border-white/5"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                scrubFromEvent(e);
              }}
              onPointerMove={(e) => {
                if (e.buttons === 1) scrubFromEvent(e);
              }}
            >
              {captions.map((cap) => (
                <div
                  key={cap.id}
                  onPointerDown={(e) => {
                    beginDrag(e, cap.start, (ns) => patchCaption(cap.id, { start: ns }));
                  }}
                  onDoubleClick={() => {
                    const t = window.prompt("Caption text", cap.text);
                    if (t !== null) patchCaption(cap.id, { text: t });
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    removeCaption(cap.id);
                  }}
                  className="absolute top-1 flex h-7 cursor-grab items-center overflow-hidden rounded-md border border-amber-400/40 bg-amber-400/20 px-2 text-[10px] text-amber-100 hover:bg-amber-400/30"
                  style={{ left: cap.start * pps, width: Math.max(24, cap.duration * pps) }}
                  title="Drag to move · double-click to edit · right-click to delete"
                >
                  <span className="truncate">{cap.text}</span>
                  <span
                    className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize bg-amber-300/40"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const startX = e.clientX;
                      const d0 = cap.duration;
                      const move = (ev: PointerEvent) => patchCaption(cap.id, { duration: Math.max(0.3, Math.round((d0 + (ev.clientX - startX) / pps) * 10) / 10) });
                      const up = () => {
                        window.removeEventListener("pointermove", move);
                        window.removeEventListener("pointerup", up);
                      };
                      window.addEventListener("pointermove", move);
                      window.addEventListener("pointerup", up);
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Footage track */}
            <div
              className="relative h-11 border-b border-white/5"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                scrubFromEvent(e);
              }}
              onPointerMove={(e) => {
                if (e.buttons === 1) scrubFromEvent(e);
              }}
            >
              {clips
                .filter((c) => c.characterId === FOOTAGE_TRACK)
                .map((clip) => (
                  <div
                    key={clip.id}
                    onPointerDown={(e) => {
                      selectClip(clip.id);
                      beginDrag(e, clip.start, (ns) => patchClip(clip.id, { start: ns }));
                    }}
                    className={cn(
                      "absolute top-1.5 flex h-8 cursor-grab select-none flex-col justify-center overflow-hidden rounded-md border border-sky-400/60 bg-gradient-to-b from-sky-500/40 to-sky-600/25 px-2 text-[10px] text-white shadow",
                      selectedClipId === clip.id && "ring-2 ring-white",
                    )}
                    style={{ left: clip.start * pps, width: Math.max(28, clip.duration * pps) }}
                    title={clip.label}
                  >
                    <span className="truncate font-semibold">🎬 {clip.label ?? "Footage"}</span>
                    <span className="truncate text-[9px] text-white/60">
                      {footageUrl(clip.footageId ?? "") ? "shows full-screen in film" : "⚠ re-import file after reload"}
                    </span>
                  </div>
                ))}
              {!clips.some((c) => c.characterId === FOOTAGE_TRACK) && (
                <div className="absolute left-3 top-3 text-[10px] text-slate-600">Click “Footage” in the toolbar to add a video, such as a sandbox recording</div>
              )}
            </div>

            {/* Character tracks */}
            {characters.map((ch) => (
              <div
                key={ch.id}
                className="relative h-11 border-b border-white/5"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  scrubFromEvent(e);
                }}
                onPointerMove={(e) => {
                  if (e.buttons === 1) scrubFromEvent(e);
                }}
              >
                {clips
                  .filter((c) => c.characterId === ch.id)
                  .map((clip) => {
                    const label =
                      clip.kind === "take" ? "🎥 Mocap take" : ACTION_MAP[clip.actionId ?? ""]?.name ?? "Motion";
                    const hue = clip.kind === "take" ? "from-fuchsia-500/50 to-fuchsia-600/30 border-fuchsia-400/60" : "from-cyan-500/40 to-cyan-600/25 border-cyan-400/50";
                    return (
                      <div
                        key={clip.id}
                        onPointerDown={(e) => {
                          selectClip(clip.id);
                          selectChar(ch.id);
                          beginDrag(e, clip.start, (ns) => patchClip(clip.id, { start: ns }));
                        }}
                        className={cn(
                          "absolute top-1.5 flex h-8 cursor-grab select-none flex-col justify-center overflow-hidden rounded-md border bg-gradient-to-b px-2 text-[10px] text-white shadow",
                          hue,
                          selectedClipId === clip.id && "ring-2 ring-white",
                        )}
                        style={{ left: clip.start * pps, width: Math.max(28, clip.duration * pps) }}
                        title={label}
                      >
                        <span className="truncate font-semibold">{label}</span>
                        <span className="truncate text-[9px] text-white/60">
                          {clip.style && clip.kind === "action" ? clip.style : ""} {clip.talk ? "· talking" : ""}
                        </span>
                        <span
                          className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize bg-white/30"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            const startX = e.clientX;
                            const d0 = clip.duration;
                            const move = (ev: PointerEvent) => patchClip(clip.id, { duration: Math.max(0.2, Math.round((d0 + (ev.clientX - startX) / pps) * 10) / 10) });
                            const up = () => {
                              window.removeEventListener("pointermove", move);
                              window.removeEventListener("pointerup", up);
                            };
                            window.addEventListener("pointermove", move);
                            window.addEventListener("pointerup", up);
                          }}
                        />
                      </div>
                    );
                  })}
              </div>
            ))}

            {/* Playhead */}
            <div className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" style={{ left: time * pps }}>
              <div className="absolute -left-1.5 -top-0.5 h-3 w-3 rotate-45 bg-white" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex h-6 items-center gap-3 border-t border-white/5 px-3 text-[10px] text-slate-600">
        <span>Drag clips to move · drag right edge to resize · click the ruler to scrub</span>
        <span className="ml-auto">
          <button onClick={() => setTime(0)} className="hover:text-slate-300">
            Reset playhead
          </button>
        </span>
      </div>
    </section>
  );
}
