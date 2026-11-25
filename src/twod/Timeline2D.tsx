import { useState, type PointerEvent as RPointerEvent } from "react";
import { Footprints, Moon, Pause, Play, Plus, Repeat, SkipBack } from "lucide-react";
import { useStudio2d } from "./store2d";
import { SCENE_KINDS } from "./gen2d";
import { clock2d, projectDuration } from "./anim2d";
import { ACTION_NAME } from "./gen2d";
import { cn } from "../utils/cn";
import { fmtTime } from "../lib/util";
import type { Clip2D } from "./types2d";

const LABEL_W = 140;

function beginDrag(e: RPointerEvent<HTMLElement> | PointerEvent, pps: number, apply: (dx: number) => void) {
  const startX = e.clientX;
  const move = (ev: PointerEvent) => apply((ev.clientX - startX) / pps);
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

function clipLabel(c: Clip2D) {
  if (c.kind === "rest" || c.stance === "rest") return "🌙 Rest (Off-stage)";
  if (c.kind === "walk") return `Walk to ${Math.round(c.toX)}${c.say ? ` · "${c.say}"` : ""}`;
  const name = ACTION_NAME[`${c.stance}|${c.gesture}`] ?? c.stance;
  return `${name} · ${c.expression}${c.say ? ` · "${c.say}"` : ""}`;
}

export function Timeline2D() {
  const actors = useStudio2d((s) => s.actors);
  const clips = useStudio2d((s) => s.clips);
  const sceneClips = useStudio2d((s) => s.sceneClips);
  const scene = useStudio2d((s) => s.scene);
  const addSceneClip = useStudio2d((s) => s.addSceneClip);
  const patchSceneClip = useStudio2d((s) => s.patchSceneClip);
  const t = useStudio2d((s) => s.t);
  const playing = useStudio2d((s) => s.playing);
  const loop = useStudio2d((s) => s.loop);
  const selected = useStudio2d((s) => s.selected);
  const objects = useStudio2d((s) => s.objects);
  const draft = useStudio2d((s) => s.draft);
  const select = useStudio2d((s) => s.select);
  const addClip = useStudio2d((s) => s.addClip);
  const patchClip = useStudio2d((s) => s.patchClip);
  const setPlaying = useStudio2d((s) => s.setPlaying);
  const setLoop = useStudio2d((s) => s.setLoop);
  const setT = useStudio2d((s) => s.setT);
  const [pps, setPps] = useState(70);

  const dur = projectDuration(clips);
  const width = Math.max(dur + 3, 12) * pps;

  const setTime = (v: number) => {
    clock2d.t = Math.max(0, Math.min(v, 600));
    setPlaying(false);
    setT(clock2d.t);
  };
  const scrub = (e: RPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTime((e.clientX - r.left) / pps);
  };

  const actorId = selected?.kind === "actor" ? selected.id : selected?.kind === "clip" ? clips.find((c) => c.id === selected.id)?.actorId ?? null : null;
  const objectId = selected?.kind === "object" ? selected.id : selected?.kind === "clip" ? clips.find((c) => c.id === selected.id)?.actorId ?? null : null;

  const addWalk = (id: string) => {
    const own = clips.filter((c) => c.actorId === id);
    const last = own.reduce<number | null>((acc, c) => (c.kind === "walk" ? c.toX : acc), null);
    const base = last ?? actors.find((a) => a.id === id)?.x ?? 640;
    addClip({ actorId: id, start: Math.round(t * 10) / 10, duration: 2.5, kind: "walk", toX: Math.min(1200, base + 240), say: "" });
  };

  const addAction = (id: string) => {
    addClip({
      actorId: id,
      start: Math.round(t * 10) / 10,
      duration: draft.duration,
      kind: "act",
      stance: draft.stance,
      gesture: draft.gesture,
      expression: draft.expression,
      speed: draft.speed,
      intensity: draft.intensity,
      mirror: draft.mirror,
      phase: draft.phase,
      talk: draft.talk,
      say: draft.say,
    });
  };

  const addRest = (id: string) => {
    addClip({
      actorId: id,
      start: Math.round(t * 10) / 10,
      duration: 3,
      kind: "rest",
      stance: "rest",
      gesture: "none",
      expression: "neutral",
      speed: 1,
      intensity: 1,
      mirror: false,
      phase: 0,
      talk: false,
      say: "",
    });
  };

  const addDrive = (id: string) => {
    const o = objects.find((x) => x.id === id);
    const base = o ? Math.round(o.x + 280) : 900;
    addClip({ actorId: id, start: Math.round(t * 10) / 10, duration: 3, kind: "drive", toX: Math.min(1250, Math.max(30, base)), say: "" });
  };

  const ticks: number[] = [];
  for (let s = 0; s <= Math.ceil(width / pps); s++) ticks.push(s);

  return (
    <section className="flex h-[236px] shrink-0 flex-col border-t border-black/40 bg-[#17191e]">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-black/40 px-3">
        <button onClick={() => setTime(0)} title="Back to start (Home)" className="rounded-md p-1.5 text-slate-300 hover:bg-white/10">
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            if (playing) setPlaying(false);
            else {
              if (clock2d.t >= dur) clock2d.t = 0;
              setPlaying(true);
            }
          }}
          title="Play / pause (Space)"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e87d0d] text-black hover:bg-[#ff9430]"
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 translate-x-px" />}
        </button>
        <button onClick={() => setLoop(!loop)} title="Loop" className={cn("rounded-md p-1.5 hover:bg-white/10", loop ? "text-[#ffb36b]" : "text-slate-500")}>
          <Repeat className="h-4 w-4" />
        </button>
        <div className="font-mono text-xs tabular-nums text-slate-200">
          {fmtTime(t)} <span className="text-slate-600">/ {fmtTime(dur)}</span>
        </div>
        <div className="ml-3 flex items-center gap-2 text-[10px] text-slate-500">
          Zoom
          <input type="range" min={30} max={140} value={pps} onChange={(e) => setPps(parseInt(e.target.value, 10))} className="w-24 accent-[#e87d0d]" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            disabled={!actorId}
            onClick={() => actorId && addWalk(actorId)}
            className="flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-1 text-[11px] text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-40"
          >
            <Footprints className="h-3 w-3" /> Walk
          </button>
          <button
            disabled={!actorId}
            onClick={() => actorId && addAction(actorId)}
            className="flex items-center gap-1 rounded-md bg-[#e87d0d]/20 px-2 py-1 text-[11px] text-[#ffb36b] hover:bg-[#e87d0d]/30 disabled:opacity-40"
          >
            <Plus className="h-3 w-3" /> Action at playhead
          </button>
          <button
            disabled={!actorId}
            onClick={() => actorId && addRest(actorId)}
            className="flex items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/15 px-2 py-1 text-[11px] text-indigo-200 hover:bg-indigo-500/25 disabled:opacity-40"
            title="Make character rest off-stage (hidden) during this time"
          >
            <Moon className="h-3 w-3 text-indigo-300" /> Rest
          </button>
          <button
            disabled={!objectId}
            onClick={() => objectId && addDrive(objectId)}
            className="flex items-center gap-1 rounded-md bg-sky-500/15 px-2 py-1 text-[11px] text-sky-200 hover:bg-sky-500/25 disabled:opacity-40"
            title="Create a drive clip for the selected object"
          >
            <span className="text-sm leading-none">🚗</span> Drive
          </button>
          <button
            onClick={() => addSceneClip({ start: Math.round(t * 10) / 10, duration: 3, kind: scene.kind, palette: scene.palette })}
            className="flex items-center gap-1 rounded-md bg-sky-500/15 px-2 py-1 text-[11px] text-sky-200 hover:bg-sky-500/25"
            title="Add a scene change at the playhead"
          >
            <span className="text-sm leading-none">🎬</span> Scene
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="relative" style={{ width: LABEL_W + width }}>
          <div className="sticky top-0 z-20 flex h-6 border-b border-black/40 bg-[#17191e]">
            <div className="sticky left-0 z-30 shrink-0 border-r border-black/40 bg-[#1f2126]" style={{ width: LABEL_W }} />
            <div className="relative cursor-pointer" style={{ width }} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); scrub(e); }} onPointerMove={(e) => { if (e.buttons === 1) scrub(e); }}>
              {ticks.map((s) => (
                <div key={s} className="absolute top-0 h-full border-l border-white/10 pl-1 text-[9px] text-slate-500" style={{ left: s * pps }}>
                  {s}s
                </div>
              ))}
            </div>
          </div>

          {/* Scene track */}
          <div className="flex h-10 border-b border-black/40">
            <button
              onClick={() => select(null)}
              className="sticky left-0 z-10 flex w-[140px] shrink-0 items-center gap-1.5 border-r border-black/40 bg-[#1f2126] px-2 text-left text-[11px] font-semibold text-sky-300"
            >
              🎬 Scene
            </button>
            <div
              className="relative"
              style={{ width }}
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); scrub(e); }}
              onPointerMove={(e) => { if (e.buttons === 1) scrub(e); }}
            >
              {sceneClips.map((sc) => (
                <div
                  key={sc.id}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    select({ kind: "clip", id: sc.id });
                    const s0 = sc.start;
                    beginDrag(e, pps, (dx) => patchSceneClip(sc.id, { start: Math.max(0, Math.round((s0 + dx) * 10) / 10) }));
                  }}
                  className={cn(
                    "absolute top-1 flex h-8 cursor-grab select-none items-center overflow-hidden rounded-md border border-sky-400/60 bg-sky-600/40 px-2 text-[10px] text-white",
                    selected?.kind === "clip" && selected.id === sc.id && "ring-2 ring-white",
                  )}
                  style={{ left: sc.start * pps, width: Math.max(30, sc.duration * pps) }}
                  title={`${SCENE_KINDS[sc.kind] ?? "Scene"} · ${sc.start.toFixed(1)}s`}
                >
                  <span className="truncate font-semibold">🎬 {SCENE_KINDS[sc.kind] ?? "Scene"}</span>
                  <span
                    className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize bg-white/30"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const d0 = sc.duration;
                      beginDrag(e, pps, (dx) => patchSceneClip(sc.id, { duration: Math.max(0.2, Math.round((d0 + dx) * 10) / 10) }));
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {actors.map((a) => (
            <div key={a.id} className="flex h-12 border-b border-black/30">
              <button
                onClick={() => select({ kind: "actor", id: a.id })}
                className={cn(
                  "sticky left-0 z-10 flex shrink-0 items-center truncate border-r border-black/40 bg-[#1f2126] px-2 text-left text-[11px] text-slate-200",
                  selected?.id === a.id && "text-[#ffb36b]",
                )}
                style={{ width: LABEL_W }}
              >
                {a.name}
              </button>
              <div className="relative" style={{ width }} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); scrub(e); }} onPointerMove={(e) => { if (e.buttons === 1) scrub(e); }}>
                {clips
                  .filter((c) => c.actorId === a.id)
                  .map((c) => (
                    <div
                      key={c.id}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        select({ kind: "clip", id: c.id });
                        const s0 = c.start;
                        beginDrag(e, pps, (dx) => patchClip(c.id, { start: Math.max(0, Math.round((s0 + dx) * 10) / 10) }));
                      }}
                      className={cn(
                        "absolute top-1.5 flex h-9 cursor-grab select-none items-center overflow-hidden rounded-md border px-2 text-[10px]",
                        c.kind === "rest" || c.stance === "rest"
                          ? "border-indigo-400/50 bg-slate-800/90 text-indigo-200 border-dashed"
                          : c.kind === "walk"
                            ? "border-emerald-400/60 bg-emerald-600/50 text-white"
                            : "border-[#e87d0d]/60 bg-[#e87d0d]/35 text-white",
                        selected?.kind === "clip" && selected.id === c.id && "ring-2 ring-white",
                      )}
                      style={{ left: c.start * pps, width: Math.max(30, c.duration * pps) }}
                      title={clipLabel(c)}
                    >
                      <span className="truncate font-semibold">{clipLabel(c)}</span>
                      <span
                        className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize bg-white/30"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          const d0 = c.duration;
                          beginDrag(e, pps, (dx) => patchClip(c.id, { duration: Math.max(0.2, Math.round((d0 + dx) * 10) / 10) }));
                        }}
                      />
                    </div>
                  ))}
              </div>
            </div>
          ))}

          {/* Movable object tracks */}
          {objects.length > 0 && (
            <div className="flex h-10 border-b border-black/30">
              <div className="sticky left-0 z-10 flex w-[140px] shrink-0 items-center gap-2 border-r border-black/40 bg-[#1f2126] px-2 text-left text-[11px] font-semibold text-sky-300">
                🚗 Movable
              </div>
              {objects.map((o) => (
                <div key={o.id} className="relative" style={{ width }}>
                  {clips
                    .filter((c) => c.actorId === o.id && c.kind === "drive")
                    .map((c) => (
                      <div
                        key={c.id}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          select({ kind: "clip", id: c.id });
                          const s0 = c.start;
                          beginDrag(e, pps, (dx) => patchClip(c.id, { start: Math.max(0, Math.round((s0 + dx) * 10) / 10) }));
                        }}
                        className={cn(
                          "absolute top-1 flex h-8 cursor-grab select-none items-center overflow-hidden rounded-md border border-sky-400/60 bg-sky-600/40 px-2 text-[10px] text-white",
                          selected?.kind === "clip" && selected.id === c.id && "ring-2 ring-white",
                        )}
                        style={{ left: c.start * pps, width: Math.max(30, c.duration * pps) }}
                        title={`Drive ${o.name} to ${Math.round(c.toX)}`}
                      >
                        <span className="truncate font-semibold">🚗 {o.name} → {Math.round(c.toX)}</span>
                        <span
                          className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize bg-white/30"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            const d0 = c.duration;
                            beginDrag(e, pps, (dx) => patchClip(c.id, { duration: Math.max(0.2, Math.round((d0 + dx) * 10) / 10) }));
                          }}
                        />
                      </div>
                    ))}
                </div>
              ))}
            </div>
          )}

          <div className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" style={{ left: LABEL_W + t * pps }} />
        </div>
      </div>
    </section>
  );
}
