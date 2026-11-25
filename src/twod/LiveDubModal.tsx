import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, Volume2, VolumeX, Play, Square, Trash2, Check, Sparkles, Sliders, X } from "lucide-react";
import { useStudio2d } from "./store2d";
import { voiceEngine, VOICE_PRESETS, type VoicePresetKey } from "./voiceEngine";
import { liveMocap2D, startMocap2D, startMocapRecording, stopMocap2D, stopMocapRecording } from "./mocap2d";
import { clock2d } from "./anim2d";
import { cn } from "../utils/cn";
import { fmtTime } from "../lib/util";

interface LiveDubModalProps {
  open: boolean;
  onClose: () => void;
}

export function LiveDubModal({ open, onClose }: LiveDubModalProps) {
  const actors = useStudio2d((s) => s.actors);
  const audioClips = useStudio2d((s) => s.audioClips);
  const addAudioClip = useStudio2d((s) => s.addAudioClip);
  const removeAudioClip = useStudio2d((s) => s.removeAudioClip);
  const liveMocapActorId = useStudio2d((s) => s.liveMocapActorId);
  const setLiveMocapActorId = useStudio2d((s) => s.setLiveMocapActorId);
  const t = useStudio2d((s) => s.t);
  const setPlaying = useStudio2d((s) => s.setPlaying);
  const setT = useStudio2d((s) => s.setT);

  const [selectedActorId, setSelectedActorId] = useState<string>(actors[0]?.id ?? "");
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(false);
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
  const [hasFace, setHasFace] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const recTimerRef = useRef<number>(0);

  // Initialize selected actor
  useEffect(() => {
    if (!selectedActorId && actors.length > 0) {
      setSelectedActorId(actors[0].id);
    }
  }, [actors, selectedActorId]);

  // Connect live mocap actor ID
  useEffect(() => {
    if (open && selectedActorId) {
      setLiveMocapActorId(selectedActorId);
    } else if (!open) {
      setLiveMocapActorId(null);
    }
  }, [open, selectedActorId, setLiveMocapActorId]);

  // Start Mic & Camera when modal opens
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

    // Start mic
    void voiceEngine.startMic().then((ok) => {
      if (active && ok) setMicEnabled(true);
    });

    // Start webcam if enabled
    if (cameraEnabled && videoRef.current) {
      void startMocap2D(videoRef.current);
    }

    return () => {
      active = false;
      stopMocap2D();
      voiceEngine.stopMic();
    };
  }, [open, cameraEnabled]);

  // Live polling for VU meter & face state indicators
  useEffect(() => {
    if (!open) return;
    let animId = 0;

    const poll = () => {
      // Audio level
      const vol = voiceEngine.getMicVolume();
      setMicLevel(vol);

      // Face tracking status
      if (liveMocap2D.active && liveMocap2D.face) {
        setHasFace(true);
        setFaceBlink(Math.max(liveMocap2D.face.blinkL, liveMocap2D.face.blinkR));
        setFaceSmile(liveMocap2D.face.smile);
        setFaceJaw(liveMocap2D.face.jaw);
        setFaceBrow(liveMocap2D.face.browUp);
      } else {
        setHasFace(false);
      }

      animId = requestAnimationFrame(poll);
    };

    animId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(animId);
  }, [open]);

  // Voice preset change
  const handlePresetSelect = (presetKey: VoicePresetKey) => {
    setActivePreset(presetKey);
    voiceEngine.setPreset(presetKey);
  };

  // Custom pitch slider change
  const handlePitchChange = (semi: number) => {
    setCustomPitch(semi);
    voiceEngine.setCustomPitch(semi);
  };

  // Monitor toggle
  const toggleMonitor = () => {
    const next = !monitoring;
    setMonitoring(next);
    voiceEngine.setMonitor(next);
  };

  // Toggle Camera
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

  // Record Take
  const handleStartRecord = () => {
    if (!selectedActorId || isRecording) return;

    const started = voiceEngine.startRecording();
    if (!started) return;

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

    const audioRes = await voiceEngine.stopRecording();
    const mocapFrames = cameraEnabled ? stopMocapRecording() : undefined;

    if (audioRes && selectedActorId) {
      const curActor = actors.find((a) => a.id === selectedActorId);
      const name = curActor?.name ?? "Actor";
      const presetObj = VOICE_PRESETS.find((p) => p.id === activePreset);

      addAudioClip({
        actorId: selectedActorId,
        start: Math.round(recStartTime * 10) / 10,
        duration: Math.round(audioRes.duration * 10) / 10,
        audioUrl: audioRes.audioUrl,
        voicePreset: presetObj?.name ?? activePreset,
        volume: 1,
        label: `${name} Dub (${presetObj?.name ?? "Take"})`,
        mocapFrames,
      });

      // Update playhead to end of take
      setT(Math.round((recStartTime + audioRes.duration) * 10) / 10);
      clock2d.t = Math.round((recStartTime + audioRes.duration) * 10) / 10;
    }
  };

  if (!open) return null;

  const curActor = actors.find((a) => a.id === selectedActorId);
  const myClips = audioClips.filter((c) => c.actorId === selectedActorId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="flex h-[88vh] max-h-[720px] w-full max-w-4xl flex-col rounded-2xl border border-white/10 bg-[#16181e] shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#1e2129] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-md">
              <Mic className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Live Dubbing & Face Motion Capture
                <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">2D Studio</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Track your facial expressions & dub multi-character voices directly onto the 2D stage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
          {/* Left Column: Target Character & Face Mocap Camera */}
          <div className="col-span-12 md:col-span-5 flex flex-col p-4 gap-4 bg-[#14161b] overflow-y-auto">
            {/* Actor Selection */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                1. Select Character to Dub
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

            {/* Webcam Face Tracking Card */}
            <div className="flex flex-col rounded-xl border border-white/10 bg-[#1b1e26] p-3 gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Video className="h-4 w-4 text-violet-400" />
                  <span className="text-xs font-semibold text-slate-200">Face Motion Capture</span>
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

              {/* Video Preview Box */}
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black border border-white/5 flex items-center justify-center">
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
                    <VideoOff className="h-8 w-8 text-slate-600" />
                    <span>Face Mocap Disabled</span>
                    <span className="text-[10px] text-slate-600">(Voice-only dubbing mode)</span>
                  </div>
                )}

                {/* Face Tracking Status Overlay */}
                {cameraEnabled && (
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] text-white backdrop-blur-md">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        hasFace ? "bg-emerald-400 animate-pulse" : "bg-amber-400",
                      )}
                    />
                    <span>{hasFace ? "Tracking Face" : "Position face in view"}</span>
                  </div>
                )}
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
            {/* Voice Changer Presets */}
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
                        "flex flex-col items-start rounded-xl border p-2.5 text-left transition-all",
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
              <div className="mt-3 rounded-xl border border-white/10 bg-[#1b1e26] p-3 flex flex-col gap-2">
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
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>-1 Octave (Deep)</span>
                  <button
                    onClick={() => handlePitchChange(0)}
                    className="text-[10px] text-slate-400 hover:text-white underline"
                  >
                    Reset
                  </button>
                  <span>+1 Octave (High)</span>
                </div>
              </div>
            </div>

            {/* Microphone VU Meter & Monitor Toggle */}
            <div className="rounded-xl border border-white/10 bg-[#1b1e26] p-3 flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                    {micEnabled ? <Mic className="h-3.5 w-3.5 text-emerald-400" /> : <MicOff className="h-3.5 w-3.5 text-rose-400" />}
                    <span>Microphone Input</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">
                    {micLevel > 0.05 ? "Speech Detected" : "Quiet"}
                  </span>
                </div>

                {/* VU Bar */}
                <div className="h-2 w-full rounded-full bg-black/40 overflow-hidden flex">
                  <div
                    className={cn(
                      "h-full transition-all duration-75",
                      micLevel > 0.7 ? "bg-amber-500" : micLevel > 0.9 ? "bg-rose-500" : "bg-emerald-400",
                    )}
                    style={{ width: `${Math.min(100, micLevel * 100)}%` }}
                  />
                </div>
              </div>

              {/* Hear Myself Monitor Toggle */}
              <button
                onClick={toggleMonitor}
                title="Hear how the voice changer sounds (use headphones to prevent feedback)"
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all shrink-0",
                  monitoring
                    ? "border-violet-500 bg-violet-600 text-white shadow-lg shadow-violet-700/30"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
                )}
              >
                {monitoring ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                <span>{monitoring ? "Monitoring ON" : "Hear Myself"}</span>
              </button>
            </div>

            {/* Record Take Control */}
            <div className="rounded-xl border border-violet-500/30 bg-gradient-to-b from-violet-950/20 to-transparent p-4 flex flex-col items-center justify-center gap-3">
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
                  className="flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-600 to-red-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/40 hover:from-rose-500 hover:to-red-400 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  <span className="flex h-3 w-3 rounded-full bg-white animate-ping" />
                  <span>🔴 Start Recording Take</span>
                </button>
              ) : (
                <button
                  onClick={handleStopRecord}
                  className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-600 to-yellow-500 px-6 py-3 text-sm font-bold text-black shadow-lg shadow-amber-900/40 hover:from-amber-500 hover:to-yellow-400 transition-all hover:scale-105 active:scale-95"
                >
                  <Square className="h-4 w-4 fill-black" />
                  <span>⏹️ Stop Recording ({fmtTime(recElapsed)})</span>
                </button>
              )}
            </div>

            {/* Takes list for this actor */}
            {myClips.length > 0 && (
              <div className="flex flex-col gap-1.5 pt-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Recorded Dub Takes on {curActor?.name} ({myClips.length})
                </label>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                  {myClips.map((clip) => (
                    <div
                      key={clip.id}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-[#1b1e26] px-3 py-1.5 text-xs text-slate-300"
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-mono text-violet-300">
                          {clip.voicePreset ?? "Take"}
                        </span>
                        <span className="font-medium text-white truncate max-w-[160px]">{clip.label}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          @{clip.start.toFixed(1)}s ({clip.duration.toFixed(1)}s)
                        </span>
                        {clip.mocapFrames && clip.mocapFrames.length > 0 && (
                          <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[9px] text-emerald-300 flex items-center gap-0.5">
                            <Sparkles className="h-2.5 w-2.5" /> Face Mocap
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
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
                        <button
                          onClick={() => removeAudioClip(clip.id)}
                          className="rounded p-1 text-rose-400 hover:bg-rose-500/20"
                          title="Delete clip"
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
