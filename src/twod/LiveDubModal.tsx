import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Play,
  Square,
  Trash2,
  Check,
  Sparkles,
  Sliders,
  X,
  Maximize2,
  Minimize2,
  Radio,
} from "lucide-react";
import { useStudio2d } from "./store2d";
import { voiceEngine, VOICE_PRESETS, type VoicePresetKey } from "./voiceEngine";
import { liveMocap2D, startMocap2D, startMocapRecording, stopMocap2D, stopMocapRecording } from "./mocap2d";
import { clock2d } from "./anim2d";
import { cn } from "../utils/cn";
import { fmtTime } from "../lib/util";
import type { Actor2D } from "./types2d";

interface LiveDubModalProps {
  open: boolean;
  onClose: () => void;
}

/** Live interactive 2D character avatar mirroring face tracking in real time */
function LiveCharacterFaceMirror({
  actor,
  blink,
  smile,
  jaw,
  brow,
  lookX,
  lookY,
  headRoll,
}: {
  actor?: Actor2D;
  blink: number;
  smile: number;
  jaw: number;
  brow: number;
  lookX: number;
  lookY: number;
  headRoll: number;
}) {
  const skin = actor?.app?.skin || "#ffd7ba";
  const hair = actor?.app?.hair || "#3b2314";
  const eyes = actor?.app?.eyes || "#1f2937";
  const glasses = actor?.app?.glasses || 0;

  const ry = Math.max(1.2, 10 * (1 - blink));
  const cy = 20 - smile * 3;
  const top = cy - 2 + smile * 8;
  const bot = top + jaw * 16;
  const deg = (headRoll * 180) / Math.PI;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-gradient-to-b from-slate-900 to-indigo-950/60 p-2">
      <div className="absolute top-2 left-2 flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-[9px] font-semibold text-violet-300 backdrop-blur-md">
        <Sparkles className="h-2.5 w-2.5" />
        <span>Live Character Mirror</span>
      </div>

      <svg viewBox="-60 -70 120 130" className="h-full w-full max-h-[160px] drop-shadow-lg">
        <g transform={`rotate(${deg})`}>
          {/* Hair back */}
          <circle cx={0} cy={-12} r={36} fill={hair} />

          {/* Ears */}
          <circle cx={-30} cy={-2} r={7} fill={skin} stroke="rgba(0,0,0,0.15)" strokeWidth={1} />
          <circle cx={30} cy={-2} r={7} fill={skin} stroke="rgba(0,0,0,0.15)" strokeWidth={1} />

          {/* Head */}
          <ellipse cx={0} cy={0} rx={28} ry={32} fill={skin} />

          {/* Hair top / bangs */}
          <path d="M -30 -14 Q 0 -38 30 -14 Q 15 -18 0 -16 Q -15 -18 -30 -14 Z" fill={hair} />

          {/* Eyebrows */}
          <g transform={`translate(0 ${-brow * 5})`}>
            <line x1={-20} y1={-12} x2={-6} y2={-12} stroke="#27272a" strokeWidth={2.8} strokeLinecap="round" />
            <line x1={6} y1={-12} x2={20} y2={-12} stroke="#27272a" strokeWidth={2.8} strokeLinecap="round" />
          </g>

          {/* Eyes (White sclera) */}
          <ellipse cx={-13} cy={-2} rx={6.5} ry={ry} fill="#ffffff" stroke="#27272a" strokeWidth={1.2} />
          <ellipse cx={13} cy={-2} rx={6.5} ry={ry} fill="#ffffff" stroke="#27272a" strokeWidth={1.2} />

          {/* Pupils tracking look direction */}
          <g transform={`translate(${lookX * 3.5} ${lookY * 2.5})`}>
            <circle cx={-13} cy={-2} r={Math.min(ry * 0.7, 3.2)} fill={eyes} />
            <circle cx={-12} cy={-3} r={1.2} fill="#ffffff" />
            <circle cx={13} cy={-2} r={Math.min(ry * 0.7, 3.2)} fill={eyes} />
            <circle cx={14} cy={-3} r={1.2} fill="#ffffff" />
          </g>

          {/* Glasses if equipped */}
          {glasses > 0 && (
            <g stroke="#18181b" strokeWidth={1.8} fill="none">
              <rect x={-21} y={-8} width={16} height={12} rx={3} />
              <rect x={5} y={-8} width={16} height={12} rx={3} />
              <line x1={-5} y1={-2} x2={5} y2={-2} />
            </g>
          )}

          {/* Nose */}
          <path d="M 0 3 L -2 9 L 2 9" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={1.4} strokeLinecap="round" />

          {/* Mouth responding to smile and jaw */}
          <path
            d={`M -11 ${cy} Q 0 ${top} 11 ${cy} Q 0 ${bot} -11 ${cy} Z`}
            fill={jaw > 0.15 ? "#6b2121" : "none"}
            stroke="#451a03"
            strokeWidth={2.2}
            strokeLinecap="round"
          />
        </g>
      </svg>
      <span className="text-[10px] font-semibold text-slate-300 truncate max-w-[140px]">
        {actor?.name ?? "Character"}
      </span>
    </div>
  );
}

export function LiveDubModal({ open, onClose }: LiveDubModalProps) {
  const actors = useStudio2d((s) => s.actors);
  const audioClips = useStudio2d((s) => s.audioClips);
  const addAudioClip = useStudio2d((s) => s.addAudioClip);
  const removeAudioClip = useStudio2d((s) => s.removeAudioClip);
  const setLiveMocapActorId = useStudio2d((s) => s.setLiveMocapActorId);
  const setPlaying = useStudio2d((s) => s.setPlaying);
  const setT = useStudio2d((s) => s.setT);

  const [selectedActorId, setSelectedActorId] = useState<string>(actors[0]?.id ?? "");
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [mocapMode, setMocapMode] = useState<"both" | "silent">("both");
  const [docked, setDocked] = useState(false); // Floating corner PIP mode

  const [activePreset, setActivePreset] = useState<VoicePresetKey>("natural");
  const [customPitch, setCustomPitch] = useState(0);
  const [monitoring, setMonitoring] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recElapsed, setRecElapsed] = useState(0);
  const [recStartTime, setRecStartTime] = useState(0);

  // Meter states for live visual feedback
  const [micLevel, setMicLevel] = useState(0);
  const [faceBlink, setFaceBlink] = useState(0);
  const [faceSmile, setFaceSmile] = useState(0);
  const [faceJaw, setFaceJaw] = useState(0);
  const [faceBrow, setFaceBrow] = useState(0);
  const [faceLookX, setFaceLookX] = useState(0);
  const [faceLookY, setFaceLookY] = useState(0);
  const [faceHeadRoll, setFaceHeadRoll] = useState(0);
  const [hasFace, setHasFace] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const recTimerRef = useRef<number>(0);

  // Initialize selected actor
  useEffect(() => {
    if (!selectedActorId && actors.length > 0) {
      setSelectedActorId(actors[0].id);
    }
  }, [actors, selectedActorId]);

  // Connect live mocap actor ID to the 2D stage
  useEffect(() => {
    if (open && selectedActorId) {
      setLiveMocapActorId(selectedActorId);
    } else if (!open) {
      setLiveMocapActorId(null);
    }
  }, [open, selectedActorId, setLiveMocapActorId]);

  // Start Mic & Camera when studio opens
  useEffect(() => {
    if (!open) {
      stopMocap2D();
      voiceEngine.stopMic();
      voiceEngine.setMonitor(false);
      setMonitoring(false);
      setMicEnabled(false);
      return;
    }

    let active = true;

    if (mocapMode === "both") {
      void voiceEngine.startMic().then((ok) => {
        if (active && ok) setMicEnabled(true);
      });
    } else {
      voiceEngine.stopMic();
      setMicEnabled(false);
    }

    if (cameraEnabled && videoRef.current) {
      void startMocap2D(videoRef.current);
    }

    return () => {
      active = false;
      stopMocap2D();
      voiceEngine.stopMic();
    };
  }, [open, cameraEnabled, mocapMode]);

  // Real-time animation loop for live meters and mirror preview
  useEffect(() => {
    if (!open) return;
    let animId = 0;

    const poll = () => {
      const vol = mocapMode === "both" ? voiceEngine.getMicVolume() : 0;
      setMicLevel(vol);

      if (liveMocap2D.active && liveMocap2D.face) {
        setHasFace(true);
        setFaceBlink(Math.max(liveMocap2D.face.blinkL, liveMocap2D.face.blinkR));
        setFaceSmile(liveMocap2D.face.smile);
        setFaceJaw(Math.max(liveMocap2D.face.jaw, vol));
        setFaceBrow(liveMocap2D.face.browUp);
        setFaceLookX(liveMocap2D.face.lookX);
        setFaceLookY(liveMocap2D.face.lookY);
        setFaceHeadRoll(liveMocap2D.headRoll);
      } else {
        setHasFace(false);
        if (vol > 0.05) {
          setFaceJaw(vol);
        }
      }

      animId = requestAnimationFrame(poll);
    };

    animId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(animId);
  }, [open, mocapMode]);

  const handlePresetSelect = (presetKey: VoicePresetKey) => {
    setActivePreset(presetKey);
    voiceEngine.setPreset(presetKey);
  };

  const handlePitchChange = (semi: number) => {
    setCustomPitch(semi);
    voiceEngine.setCustomPitch(semi);
  };

  const toggleMonitor = () => {
    const next = !monitoring;
    setMonitoring(next);
    voiceEngine.setMonitor(next);
  };

  const toggleCamera = async () => {
    if (cameraEnabled) {
      stopMocap2D();
      setCameraEnabled(false);
    } else {
      setCameraEnabled(true);
      if (videoRef.current) {
        await startMocap2D(videoRef.current);
      }
    }
  };

  const handleStartRecord = () => {
    if (!selectedActorId || isRecording) return;

    if (mocapMode === "both") {
      const started = voiceEngine.startRecording();
      if (!started) return;
    }

    if (cameraEnabled) {
      startMocapRecording();
    }

    setIsRecording(true);
    const startT = clock2d.t;
    setRecStartTime(startT);
    setRecElapsed(0);
    setPlaying(true);

    const t0 = performance.now();
    recTimerRef.current = window.setInterval(() => {
      setRecElapsed((performance.now() - t0) / 1000);
    }, 50);
  };

  const handleStopRecord = async () => {
    if (!isRecording) return;
    window.clearInterval(recTimerRef.current);
    setIsRecording(false);
    setPlaying(false);

    let audioUrl = "";
    let duration = recElapsed;

    if (mocapMode === "both") {
      const audioRes = await voiceEngine.stopRecording();
      if (audioRes) {
        audioUrl = audioRes.audioUrl;
        duration = audioRes.duration;
      }
    } else {
      // Silent Face Mocap: create a tiny audio container so timeline synchronization handles it
      const emptyBlob = new Blob([], { type: "audio/webm" });
      audioUrl = URL.createObjectURL(emptyBlob);
    }

    const mocapFrames = cameraEnabled ? stopMocapRecording() : undefined;

    if (selectedActorId) {
      const curActor = actors.find((a) => a.id === selectedActorId);
      const name = curActor?.name ?? "Actor";
      const presetObj = VOICE_PRESETS.find((p) => p.id === activePreset);

      addAudioClip({
        actorId: selectedActorId,
        start: Math.round(recStartTime * 10) / 10,
        duration: Math.max(0.3, Math.round(duration * 10) / 10),
        audioUrl,
        voicePreset: mocapMode === "silent" ? "Silent Mocap" : presetObj?.name ?? activePreset,
        volume: mocapMode === "silent" ? 0 : 1,
        label: `${name} ${mocapMode === "silent" ? "Face Take" : "Dub Take"}`,
        mocapFrames,
      });

      setT(Math.round((recStartTime + duration) * 10) / 10);
      clock2d.t = Math.round((recStartTime + duration) * 10) / 10;
    }
  };

  if (!open) return null;

  const curActor = actors.find((a) => a.id === selectedActorId);
  const myClips = audioClips.filter((c) => c.actorId === selectedActorId);

  /* ------------------------------------------------------------------ */
  /* Docked / Floating Picture-in-Picture View (Leaves Stage Visible)   */
  /* ------------------------------------------------------------------ */
  if (docked) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col rounded-2xl border border-violet-500/50 bg-[#16181e]/95 p-3.5 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-white">Live Mocap on {curActor?.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDocked(false)}
              className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              title="Expand to Full Studio"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onClose}
              className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              title="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Mini video + mirror split */}
        <div className="grid grid-cols-2 gap-2 py-2.5">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-black border border-white/10">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover transform -scale-x-100"
            />
            {hasFace && (
              <span className="absolute top-1 left-1 h-2 w-2 rounded-full bg-emerald-400" />
            )}
          </div>

          <div className="h-[90px]">
            <LiveCharacterFaceMirror
              actor={curActor}
              blink={faceBlink}
              smile={faceSmile}
              jaw={faceJaw}
              brow={faceBrow}
              lookX={faceLookX}
              lookY={faceLookY}
              headRoll={faceHeadRoll}
            />
          </div>
        </div>

        {/* Quick Record control */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] font-mono text-slate-400">
            {isRecording ? `● REC ${fmtTime(recElapsed)}` : `@ ${fmtTime(clock2d.t)}`}
          </span>

          {!isRecording ? (
            <button
              onClick={handleStartRecord}
              className="flex items-center gap-1.5 rounded-full bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg hover:bg-rose-500"
            >
              <span className="h-2 w-2 rounded-full bg-white animate-ping" />
              <span>Record</span>
            </button>
          ) : (
            <button
              onClick={handleStopRecord}
              className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-black shadow-lg hover:bg-amber-400"
            >
              <Square className="h-3 w-3 fill-black" />
              <span>Stop</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Full Studio View (Modal)                                           */
  /* ------------------------------------------------------------------ */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="flex h-[90vh] max-h-[740px] w-full max-w-4xl flex-col rounded-2xl border border-white/10 bg-[#16181e] shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#1e2129] px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-md">
              <Mic className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Live Dubbing & Face Motion Capture
                <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
                  2D Studio
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Live facial expression tracking & multi-character voice acting
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Watch Stage Live button (Docks to corner) */}
            <button
              onClick={() => setDocked(true)}
              className="flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-600/20 px-2.5 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-600/35 transition-colors"
              title="Dock this window to the corner to watch the main 2D stage live"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              <span>Watch Stage Live</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="grid flex-1 grid-cols-1 md:grid-cols-12 min-h-0 divide-y md:divide-y-0 md:divide-x divide-white/10 overflow-y-auto">
          {/* Left Column: Character Selection & Side-by-Side Face Mirror */}
          <div className="col-span-12 md:col-span-5 flex flex-col p-4 gap-4 bg-[#14161b] overflow-y-auto">
            {/* Mode Selector: Voice+Face vs Silent Face */}
            <div className="rounded-xl border border-white/10 bg-[#1b1e26] p-2.5 flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Recording Mode
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setMocapMode("both")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all",
                    mocapMode === "both"
                      ? "bg-violet-600 text-white shadow-md shadow-violet-900/40"
                      : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200",
                  )}
                >
                  <Mic className="h-3.5 w-3.5" />
                  <span>Voice + Face</span>
                </button>
                <button
                  onClick={() => setMocapMode("silent")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all",
                    mocapMode === "silent"
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40"
                      : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200",
                  )}
                >
                  <Video className="h-3.5 w-3.5" />
                  <span>Silent Face Only</span>
                </button>
              </div>
            </div>

            {/* Actor Selection */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                1. Select Character to Act
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {actors.map((a) => {
                  const isSel = a.id === selectedActorId;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelectedActorId(a.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-all",
                        isSel
                          ? "border-violet-500 bg-violet-500/20 text-white font-semibold ring-1 ring-violet-500/50"
                          : "border-white/5 bg-white/5 text-slate-300 hover:bg-white/10",
                      )}
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-[10px] uppercase font-bold text-slate-200">
                        {a.name.slice(0, 2)}
                      </span>
                      <span className="truncate">{a.name}</span>
                      {isSel && <Check className="ml-auto h-3.5 w-3.5 text-violet-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Side-by-Side Face Tracking: Live Webcam on Left, Character Mirror on Right */}
            <div className="flex flex-col rounded-xl border border-white/10 bg-[#1b1e26] p-3 gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Radio className="h-4 w-4 text-violet-400 animate-pulse" />
                  <span className="text-xs font-semibold text-slate-200">Live Face Mirror</span>
                </div>
                <button
                  onClick={toggleCamera}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors",
                    cameraEnabled
                      ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                      : "bg-slate-700 text-slate-400 hover:bg-slate-600",
                  )}
                >
                  {cameraEnabled ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
                  {cameraEnabled ? "Camera Active" : "Camera Off"}
                </button>
              </div>

              {/* Side-by-Side Split View */}
              <div className="grid grid-cols-2 gap-2 h-44">
                {/* Left: Webcam Feed */}
                <div className="relative h-full w-full overflow-hidden rounded-lg bg-black border border-white/10 flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={cn(
                      "h-full w-full object-cover transform -scale-x-100",
                      !cameraEnabled && "hidden",
                    )}
                  />
                  {!cameraEnabled && (
                    <div className="flex flex-col items-center gap-1 text-slate-500 text-xs">
                      <VideoOff className="h-6 w-6 text-slate-600" />
                      <span>Camera Off</span>
                    </div>
                  )}

                  {cameraEnabled && (
                    <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[9px] text-white backdrop-blur-md">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          hasFace ? "bg-emerald-400 animate-pulse" : "bg-amber-400",
                        )}
                      />
                      <span>{hasFace ? "Tracking" : "Fit Face"}</span>
                    </div>
                  )}
                </div>

                {/* Right: 2D Character Face Live Mirror */}
                <div className="h-full w-full">
                  <LiveCharacterFaceMirror
                    actor={curActor}
                    blink={faceBlink}
                    smile={faceSmile}
                    jaw={faceJaw}
                    brow={faceBrow}
                    lookX={faceLookX}
                    lookY={faceLookY}
                    headRoll={faceHeadRoll}
                  />
                </div>
              </div>

              {/* Real-time Facial Expression Feedback Meters */}
              {cameraEnabled && (
                <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-400 pt-1">
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span>Blink / Wink</span>
                      <span className="font-mono text-slate-300">{(faceBlink * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-violet-400 transition-all duration-75"
                        style={{ width: `${faceBlink * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span>Mouth / Jaw</span>
                      <span className="font-mono text-slate-300">{(faceJaw * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-indigo-400 transition-all duration-75"
                        style={{ width: `${faceJaw * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span>Smile</span>
                      <span className="font-mono text-slate-300">{(faceSmile * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 transition-all duration-75"
                        style={{ width: `${faceSmile * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span>Eyebrow Raise</span>
                      <span className="font-mono text-slate-300">{(faceBrow * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 transition-all duration-75"
                        style={{ width: `${faceBrow * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Voice Changer & Record Controls */}
          <div className="col-span-12 md:col-span-7 flex flex-col p-4 gap-4 bg-[#16181e] overflow-y-auto">
            {/* Voice Changer Presets (Only when in Voice+Face mode) */}
            {mocapMode === "both" ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    2. Voice Changer Effect
                  </label>
                  <span className="text-[10px] text-slate-500">Real-time Web Audio DSP</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {VOICE_PRESETS.map((preset) => {
                    const isCur = activePreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => handlePresetSelect(preset.id)}
                        className={cn(
                          "flex flex-col items-start rounded-xl border p-2 text-left transition-all",
                          isCur
                            ? "border-violet-500 bg-violet-600/25 ring-1 ring-violet-500 text-white shadow-md shadow-violet-950/40"
                            : "border-white/5 bg-[#1b1e26] text-slate-300 hover:bg-[#20242e] hover:border-white/15",
                        )}
                      >
                        <div className="flex items-center gap-1.5 w-full">
                          <span className="text-base">{preset.icon}</span>
                          <span className="text-xs font-semibold truncate">{preset.name}</span>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-400 line-clamp-1">{preset.desc}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Pitch Slider for Custom / Fine-tune */}
                <div className="mt-2.5 rounded-xl border border-white/10 bg-[#1b1e26] p-2.5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                      <Sliders className="h-3.5 w-3.5 text-violet-400" />
                      <span>Pitch Shift Tuning</span>
                    </div>
                    <span className="font-mono text-violet-300 font-bold">
                      {customPitch > 0 ? `+${customPitch}` : customPitch} semitones
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={0.5}
                    value={customPitch}
                    onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/15 p-3 text-xs text-emerald-200 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-emerald-300">
                  <Sparkles className="h-4 w-4" />
                  <span>Silent Face Mocap Mode Active</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Microphone is disabled. Your facial expressions (winks, smiles, jaw movements, eyebrows) will be recorded onto the character without any audio track!
                </p>
              </div>
            )}

            {/* Microphone VU Meter & Monitor Toggle (in Voice mode) */}
            {mocapMode === "both" && (
              <div className="rounded-xl border border-white/10 bg-[#1b1e26] p-2.5 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                      {micEnabled ? (
                        <Mic className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <MicOff className="h-3.5 w-3.5 text-rose-400" />
                      )}
                      <span>Microphone</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">
                      {micLevel > 0.05 ? "Speech Detected" : "Quiet"}
                    </span>
                  </div>

                  <div className="h-1.5 w-full rounded-full bg-black/40 overflow-hidden flex">
                    <div
                      className={cn(
                        "h-full transition-all duration-75",
                        micLevel > 0.7 ? "bg-amber-500" : micLevel > 0.9 ? "bg-rose-500" : "bg-emerald-400",
                      )}
                      style={{ width: `${Math.min(100, micLevel * 100)}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={toggleMonitor}
                  title="Hear how the voice changer sounds (use headphones to prevent feedback)"
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all shrink-0",
                    monitoring
                      ? "border-violet-500 bg-violet-600 text-white shadow-lg shadow-violet-700/30"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
                  )}
                >
                  {monitoring ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                  <span>{monitoring ? "Monitoring ON" : "Hear Myself"}</span>
                </button>
              </div>
            )}

            {/* Record Take Control */}
            <div className="rounded-xl border border-violet-500/30 bg-gradient-to-b from-violet-950/20 to-transparent p-3.5 flex flex-col items-center justify-center gap-2.5">
              <div className="text-center">
                <span className="text-xs font-semibold text-slate-300">
                  Target: <span className="text-violet-300 font-bold">{curActor?.name ?? "Character"}</span>
                </span>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Playhead at <span className="font-mono text-white">{fmtTime(clock2d.t)}</span>
                  {isRecording && (
                    <span className="ml-2 font-mono text-rose-400 font-bold animate-pulse">
                      ● REC {fmtTime(recElapsed)}
                    </span>
                  )}
                </div>
              </div>

              {!isRecording ? (
                <button
                  onClick={handleStartRecord}
                  disabled={!selectedActorId}
                  className="flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-600 to-red-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-900/40 hover:from-rose-500 hover:to-red-400 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  <span className="flex h-2.5 w-2.5 rounded-full bg-white animate-ping" />
                  <span>🔴 Start Recording Take</span>
                </button>
              ) : (
                <button
                  onClick={handleStopRecord}
                  className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-600 to-yellow-500 px-6 py-2.5 text-sm font-bold text-black shadow-lg shadow-amber-900/40 hover:from-amber-500 hover:to-yellow-400 transition-all hover:scale-105 active:scale-95"
                >
                  <Square className="h-3.5 w-3.5 fill-black" />
                  <span>⏹️ Stop Recording ({fmtTime(recElapsed)})</span>
                </button>
              )}
            </div>

            {/* Takes list for this actor */}
            {myClips.length > 0 && (
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Recorded Takes on {curActor?.name} ({myClips.length})
                  </label>
                  <button
                    onClick={() => myClips.forEach((c) => removeAudioClip(c.id))}
                    className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline"
                  >
                    Clear All
                  </button>
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                  {myClips.map((clip) => (
                    <div
                      key={clip.id}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-[#1b1e26] px-2.5 py-1 text-xs text-slate-300"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-mono text-violet-300">
                          {clip.voicePreset ?? "Take"}
                        </span>
                        <span className="font-medium text-white truncate max-w-[130px]">{clip.label}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          @{clip.start.toFixed(1)}s ({clip.duration.toFixed(1)}s)
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {clip.volume !== 0 && (
                          <button
                            onClick={() => {
                              const a = new Audio(clip.audioUrl);
                              void a.play();
                            }}
                            className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                            title="Preview audio"
                          >
                            <Play className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          onClick={() => removeAudioClip(clip.id)}
                          className="rounded p-1 text-rose-400 hover:bg-rose-500/20"
                          title="Delete take"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
