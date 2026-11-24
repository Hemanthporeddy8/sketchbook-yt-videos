import { useState } from "react";
import { Circle, Clapperboard, Download, Image as ImageIcon, Pause, Play, RotateCcw, Undo2, Box, Pencil } from "lucide-react";
import { useStore } from "../store";
import { usePlayback } from "../playback";
import { recordVideo, saveThumbnail } from "../lib/exporter";
import { useSandbox } from "../sandbox/sandboxStore";
import { toggleSandboxRec } from "../sandbox/recorder";
import { useStudio2d } from "../twod/store2d";
import { exportStage2D } from "../twod/recorder2d";
import { cn } from "../utils/cn";
import type { Aspect } from "../lib/types";

const ASPECTS: { id: Aspect; label: string; hint: string }[] = [
  { id: "16:9", label: "16:9", hint: "YouTube landscape" },
  { id: "9:16", label: "9:16", hint: "Shorts / Reels / TikTok" },
  { id: "1:1", label: "1:1", hint: "Square post" },
];

const PRESETS = [
  { id: "wide", label: "Wide" },
  { id: "close", label: "Close-up" },
  { id: "low", label: "Low angle" },
  { id: "side", label: "Side" },
  { id: "top", label: "Top-down" },
  { id: "follow", label: "Follow" },
];

const SB_CAMS = [
  { id: "chase", label: "Third person (gaming)" },
  { id: "free", label: "Fly (free camera)" },
  { id: "wide", label: "Wide" },
  { id: "close", label: "Close-up" },
  { id: "side", label: "Side" },
  { id: "top", label: "Top-down" },
];

export function Header() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const aspect = useStore((s) => s.aspect);
  const setAspect = useStore((s) => s.setAspect);
  const projectName = useStore((s) => s.projectName);
  const setProjectName = useStore((s) => s.setProjectName);
  const setCamPreset = useStore((s) => s.setCamPreset);
  const undo = useStore((s) => s.undo);
  const hasHistory = useStore((s) => s.history.length > 0);
  const resetProject = useStore((s) => s.resetProject);
  const recState = usePlayback((s) => s.rec);
  const recLabel = usePlayback((s) => s.recLabel);

  const sbPlay = useSandbox((s) => s.play);
  const setSbPlay = useSandbox((s) => s.setPlay);
  const sbRec = useSandbox((s) => s.recState);
  const sbRecLabel = useSandbox((s) => s.recLabel);
  const sbUndo = useSandbox((s) => s.undo);
  const sbHasHistory = useSandbox((s) => s.history.length > 0);
  const sbReset = useSandbox((s) => s.resetSandbox);
  const setSbCam = useSandbox((s) => s.setSbCam);

  const aspect2d = useStudio2d((s) => s.aspect);
  const setAspect2d = useStudio2d((s) => s.setAspect);
  const playing2d = useStudio2d((s) => s.playing);
  const setPlaying2d = useStudio2d((s) => s.setPlaying);
  const rec2d = useStudio2d((s) => s.rec);
  const rec2dLabel = useStudio2d((s) => s.recLabel);
  const reset2d = useStudio2d((s) => s.reset);

  const [error, setError] = useState<string | null>(null);

  const isFilm = mode === "film";
  const isSb = mode === "sandbox";
  const is2d = mode === "2d";

  const modeBtn = (id: typeof mode, label: string, Icon: typeof Clapperboard, activeCls: string) => (
    <button
      onClick={() => setMode(id)}
      className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition", mode === id ? activeCls : "text-slate-400 hover:text-slate-200")}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );

  const currentAspect = is2d ? aspect2d : aspect;
  const pickAspect = (a: Aspect) => (is2d ? setAspect2d(a) : setAspect(a));

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/5 bg-[#0b0d13] px-3">
      <div className="flex items-center gap-2 pr-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600 shadow-lg shadow-cyan-900/40">
          <Clapperboard className="h-4 w-4 text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-extrabold tracking-tight text-white">PixelStage</div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Studio</div>
        </div>
      </div>

      {isFilm && (
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="w-48 rounded-md border border-transparent bg-white/[0.03] px-2 py-1 text-xs text-slate-200 outline-none hover:border-white/10 focus:border-cyan-500/60"
          title="Project name (used for exported files)"
        />
      )}

      <div className="ml-2 flex rounded-lg border border-white/10 bg-black/30 p-0.5">
        {modeBtn("film", "Film · 3D", Clapperboard, "bg-cyan-500 text-black")}
        {modeBtn("sandbox", "Sandbox · 3D", Box, "bg-[#e87d0d] text-black")}
        {modeBtn("2d", "2D · flat", Pencil, "bg-fuchsia-500 text-black")}
      </div>

      <div className="flex rounded-lg border border-white/10 bg-black/30 p-0.5">
        {ASPECTS.map((a) => (
          <button
            key={a.id}
            title={a.hint}
            onClick={() => pickAspect(a.id)}
            className={cn("rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition", currentAspect === a.id ? "bg-white/15 text-white" : "text-slate-500 hover:text-slate-200")}
          >
            {a.label}
          </button>
        ))}
      </div>

      {isFilm && (
        <select
          onChange={(e) => {
            if (e.target.value) setCamPreset(e.target.value);
            e.target.value = "";
          }}
          defaultValue=""
          className="rounded-lg border border-white/10 bg-[#11131a] px-2 py-1.5 text-[11px] text-slate-200 outline-none"
          title="Camera shot presets"
        >
          <option value="">📷 Camera shot…</option>
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      )}

      {isSb && (
        <>
          <select
            onChange={(e) => {
              if (e.target.value) setSbCam(e.target.value);
              e.target.value = "";
            }}
            defaultValue=""
            className="rounded-lg border border-white/10 bg-[#11131a] px-2 py-1.5 text-[11px] text-slate-200 outline-none"
            title="Camera angles"
          >
            <option value="">🎥 Camera angle…</option>
            {SB_CAMS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setSbPlay(!sbPlay)}
            className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition", sbPlay ? "bg-emerald-400 text-black hover:bg-emerald-300" : "bg-white/10 text-white hover:bg-white/15")}
            title="Play / Edit (P)"
          >
            {sbPlay ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {sbPlay ? "Stop play" : "Play"}
          </button>
        </>
      )}

      {is2d && (
        <button
          onClick={() => setPlaying2d(!playing2d)}
          className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition", playing2d ? "bg-emerald-400 text-black hover:bg-emerald-300" : "bg-white/10 text-white hover:bg-white/15")}
          title="Play / pause (Space)"
        >
          {playing2d ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {playing2d ? "Pause" : "Play"}
        </button>
      )}

      <div className="ml-auto flex items-center gap-2">
        {isFilm && recState === "recording" && (
          <span className="flex items-center gap-1.5 rounded-md bg-red-500/15 px-2 py-1 text-[11px] font-semibold text-red-300">
            <Circle className="h-2.5 w-2.5 fill-red-500 text-red-500 animate-pulse" /> {recLabel}
          </span>
        )}
        {isFilm && recState === "done" && <span className="text-[11px] font-semibold text-emerald-300">{recLabel}</span>}
        {isSb && sbRec !== "idle" && (
          <span className={cn("flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold", sbRec === "recording" ? "bg-red-500/15 text-red-300" : "text-emerald-300")}>
            {sbRec === "recording" && <Circle className="h-2.5 w-2.5 fill-red-500 text-red-500 animate-pulse" />} {sbRecLabel}
          </span>
        )}
        {is2d && rec2d !== "idle" && (
          <span className={cn("flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold", rec2d === "recording" ? "bg-red-500/15 text-red-300" : "text-emerald-300")}>
            {rec2d === "recording" && <Circle className="h-2.5 w-2.5 fill-red-500 text-red-500 animate-pulse" />} {rec2dLabel}
          </span>
        )}
        {error && <span className="max-w-xs truncate text-[11px] text-red-300">{error}</span>}

        {isFilm && (
          <>
            <button onClick={undo} disabled={!hasHistory} title="Undo (Ctrl+Z)" className="rounded-md p-2 text-slate-400 hover:bg-white/10 hover:text-slate-100 disabled:opacity-30">
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                const err = saveThumbnail(projectName);
                if (err) setError(err);
              }}
              title="Save thumbnail (PNG)"
              className="flex items-center gap-1.5 rounded-md bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
            >
              <ImageIcon className="h-3.5 w-3.5" /> Thumbnail
            </button>
            <button
              onClick={() => {
                if (confirm("Reset the film project to the starter scene? Your current scene will be lost.")) resetProject();
              }}
              title="Reset film project"
              className="rounded-md p-2 text-slate-500 hover:bg-white/10 hover:text-slate-200"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setError(null);
                const err = recordVideo(projectName);
                if (err) setError(err);
              }}
              disabled={recState === "recording"}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-red-900/30 transition hover:brightness-110 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" /> Export video
            </button>
          </>
        )}

        {isSb && (
          <>
            <button onClick={sbUndo} disabled={!sbHasHistory} title="Undo (Ctrl+Z)" className="rounded-md p-2 text-slate-400 hover:bg-white/10 hover:text-slate-100 disabled:opacity-30">
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                if (confirm("Reset the sandbox to the starter world? Your sandbox builds will be lost.")) sbReset();
              }}
              title="Reset sandbox"
              className="rounded-md p-2 text-slate-500 hover:bg-white/10 hover:text-slate-200"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setError(null);
                const err = toggleSandboxRec(projectName);
                if (err) setError(err);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white shadow-lg transition hover:brightness-110",
                sbRec === "recording" ? "bg-red-700" : "bg-gradient-to-r from-red-500 to-rose-600 shadow-red-900/30",
              )}
            >
              <Circle className="h-3 w-3 fill-white text-white" /> {sbRec === "recording" ? "Stop recording" : "Record gameplay"}
            </button>
          </>
        )}

        {is2d && (
          <>
            <button
              onClick={() => {
                if (confirm("Reset the 2D project to the starter scene? Your 2D work will be lost.")) reset2d();
              }}
              title="Reset 2D project"
              className="rounded-md p-2 text-slate-500 hover:bg-white/10 hover:text-slate-200"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setError(null);
                const err = exportStage2D(projectName);
                if (err) setError(err);
              }}
              disabled={rec2d === "recording"}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-fuchsia-900/30 transition hover:brightness-110 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" /> Export 2D video
            </button>
          </>
        )}
      </div>
    </header>
  );
}
