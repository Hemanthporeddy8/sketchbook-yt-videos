import { useRef, useState } from "react";
import { Camera, CircleDot, Film, Square, Upload, Video, VideoOff } from "lucide-react";
import { useStore } from "../store";
import { usePlayback } from "../playback";
import { isRecording, startRecording, startVideoFile, startWebcam, stopRecording, stopSource, useMocapUI } from "../mocap/engine";
import { Field, Section, Select, Toggle } from "./ui-kit";
import { fmtTime } from "../lib/util";
import { cn } from "../utils/cn";

export function MocapPanel() {
  const ui = useMocapUI();
  const characters = useStore((s) => s.characters);
  const target = useStore((s) => s.mocapTargetId);
  const setMocapTarget = useStore((s) => s.setMocapTarget);
  const takes = useStore((s) => s.takes);
  const addTake = useStore((s) => s.addTake);
  const addClip = useStore((s) => s.addClip);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recStart = useRef(0);
  const [msg, setMsg] = useState("");

  const humans = characters.filter((c) => c.config.rig === "human");
  const targetName = characters.find((c) => c.id === target)?.name;

  const finishTake = () => {
    const st = useStore.getState();
    const name = `Take ${st.takes.length + 1}`;
    const take = stopRecording(name);
    if (!take) {
      setMsg("Nothing was captured. Make sure your body is visible.");
      return;
    }
    addTake(take);
    if (st.mocapTargetId) {
      addClip({
        characterId: st.mocapTargetId,
        start: recStart.current,
        duration: take.duration,
        kind: "take",
        takeId: take.id,
        expression: "neutral",
        talk: false,
      });
      setMsg(`Saved "${name}" (${take.duration.toFixed(1)}s) onto the timeline.`);
    }
  };

  const toggleWebcam = async () => {
    setMsg("");
    if (ui.source === "webcam") {
      if (isRecording()) finishTake();
      stopSource();
      return;
    }
    if (!videoRef.current) return;
    try {
      await startWebcam(videoRef.current);
    } catch (e) {
      useMocapUI.setState({ error: "Camera access was blocked or no camera was found. Allow camera permission and try again.", status: "Error", source: "off" });
      console.error(e);
    }
  };

  const onFile = async (file: File) => {
    if (!videoRef.current) return;
    setMsg("");
    try {
      recStart.current = usePlayback.getState().time;
      startRecording();
      await startVideoFile(videoRef.current, file, () => {
        if (isRecording()) finishTake();
      });
    } catch (e) {
      useMocapUI.setState({ error: "Could not open that video file.", status: "Error" });
      console.error(e);
    }
  };

  const toggleRecord = () => {
    if (isRecording()) {
      finishTake();
      return;
    }
    if (!target) {
      setMsg("Pick a human character as the mocap target first.");
      return;
    }
    if (ui.source === "off") {
      setMsg("Start the webcam or import a video first.");
      return;
    }
    recStart.current = usePlayback.getState().time;
    startRecording();
    setMsg("Recording… perform your movements, then press Stop.");
  };

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
      <Section title="Motion capture target">
        <Field label="Character that copies your movement">
          {humans.length ? (
            <Select
              value={target ?? ""}
              onChange={(v) => setMocapTarget(v)}
              options={[{ value: "", label: "— choose —" }, ...humans.map((h) => ({ value: h.id, label: h.name }))]}
            />
          ) : (
            <p className="text-[11px] text-amber-300/80">Add a human or memeoji character from the Library first.</p>
          )}
        </Field>
        <p className="text-[11px] text-slate-500">
          {targetName ? `${targetName} will mirror your body${ui.trackFace ? " and face" : ""} live.` : "Choose a target to see live mirroring."}
        </p>
      </Section>

      <Section title="Source">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={toggleWebcam}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition",
              ui.source === "webcam" ? "bg-red-500 text-white hover:bg-red-400" : "bg-cyan-500 text-black hover:bg-cyan-400",
            )}
          >
            {ui.source === "webcam" ? <VideoOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            {ui.source === "webcam" ? "Stop webcam" : "Live webcam"}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border py-2.5 text-xs font-semibold transition",
              ui.source === "video" ? "border-violet-400 bg-violet-500/20 text-violet-100" : "border-white/15 text-slate-200 hover:bg-white/5",
            )}
          >
            <Upload className="h-4 w-4" /> Import video
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
        </div>

        <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className="aspect-video w-full object-cover"
            style={{ transform: ui.source === "webcam" ? "scaleX(-1)" : undefined }}
          />
          {ui.source === "off" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] text-slate-500">
              <Video className="mr-2 h-4 w-4" /> Camera preview
            </div>
          )}
          {ui.bodyOk && (
            <span className="absolute left-2 top-2 rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-black">● TRACKING</span>
          )}
        </div>

        <Toggle label="Track face expressions (eyes, mouth, head turn)" checked={ui.trackFace} onChange={(v) => useMocapUI.setState({ trackFace: v })} />

        <div className="rounded-md bg-white/[0.03] p-2 text-[11px] text-slate-400">
          <div className="flex items-center justify-between">
            <span>{ui.loading ? "Loading models…" : ui.status}</span>
            <span className="font-mono text-slate-500">{ui.source !== "off" ? `${ui.fps} fps` : ""}</span>
          </div>
          <div className="mt-1 flex gap-3 text-[10px]">
            <span className={ui.bodyOk ? "text-emerald-400" : "text-slate-600"}>● Body</span>
            <span className={ui.faceOk ? "text-emerald-400" : "text-slate-600"}>● Face</span>
            {ui.videoName && <span className="truncate text-slate-500">{ui.videoName}</span>}
          </div>
        </div>
        {ui.error && <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-[11px] text-red-300">{ui.error}</div>}
      </Section>

      <Section title="Record a take">
        <button
          onClick={toggleRecord}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold transition",
            ui.recording ? "bg-red-600 text-white animate-pulse" : "bg-white/10 text-white hover:bg-white/15",
          )}
        >
          {ui.recording ? <Square className="h-4 w-4 fill-white" /> : <CircleDot className="h-4 w-4 text-red-400" />}
          {ui.recording ? "Stop & save take" : "Record take"}
        </button>
        <p className="text-[11px] leading-relaxed text-slate-500">
          Takes are saved as motion clips on the timeline at the playhead. Importing a video starts recording automatically and saves when the video ends.
        </p>
        {msg && <p className="text-[11px] text-cyan-300">{msg}</p>}
      </Section>

      <Section title={`Takes · ${takes.length}`}>
        {takes.length === 0 && <p className="text-[11px] text-slate-600">No takes yet. Record one to reuse it on any timeline.</p>}
        <div className="space-y-1.5">
          {takes.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.03] p-2">
              <Film className="h-4 w-4 shrink-0 text-fuchsia-300" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-semibold text-slate-200">{t.name}</div>
                <div className="text-[10px] text-slate-500">
                  {fmtTime(t.duration)} · {t.frames.length} frames · {t.source}
                </div>
              </div>
              <button
                onClick={() => {
                  const st = useStore.getState();
                  if (!st.mocapTargetId) return;
                  addClip({
                    characterId: st.mocapTargetId,
                    start: Math.round(usePlayback.getState().time * 10) / 10,
                    duration: t.duration,
                    kind: "take",
                    takeId: t.id,
                    expression: "neutral",
                    talk: false,
                  });
                }}
                className="rounded-md bg-fuchsia-500/20 px-2 py-1 text-[10px] font-semibold text-fuchsia-200 hover:bg-fuchsia-500/30"
              >
                Place at playhead
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tips">
        <ul className="list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-slate-500">
          <li>Stand 1.5–2.5 m from the camera so your head to knees are visible.</li>
          <li>Use even front lighting and a plain background for the cleanest tracking.</li>
          <li>Face tracking works best when your face is looking at the camera.</li>
          <li>Takes are kept in this session; export your video before closing the tab.</li>
        </ul>
      </Section>
    </div>
  );
}
