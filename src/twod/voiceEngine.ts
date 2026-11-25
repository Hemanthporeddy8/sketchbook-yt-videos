/*
 * Real-time Web Audio Voice Changer, Dubbing Studio & Playback Engine.
 * Provides pitch shifting, vocal formant filters (Villain, Anime, Chipmunk, Robot, Monster, Radio),
 * real-time mic monitoring, RMS volume lip-sync detection, take recording, and timeline synchronization.
 */

export type VoicePresetKey =
  | "natural"
  | "villain"
  | "anime"
  | "chipmunk"
  | "monster"
  | "robot"
  | "radio"
  | "echo"
  | "custom";

export interface VoicePreset {
  id: VoicePresetKey;
  name: string;
  icon: string;
  desc: string;
  pitchSemi: number; // semitone shift (-12 to +12)
  lowCut?: number;   // Highpass Hz
  highCut?: number;  // Lowpass Hz
  bassBoost?: number; // dB at 140Hz
  trebleBoost?: number; // dB at 3500Hz
  robotRate?: number; // Ring mod carrier Hz
  distortion?: number;
  echoTime?: number;
  echoFeedback?: number;
}

export const VOICE_PRESETS: VoicePreset[] = [
  {
    id: "natural",
    name: "Natural",
    icon: "🎙️",
    desc: "Clean studio broadcast vocal",
    pitchSemi: 0,
    lowCut: 80,
    highCut: 12000,
  },
  {
    id: "villain",
    name: "Deep Hero / Villain",
    icon: "😈",
    desc: "Deep baritone with heavy chest resonance",
    pitchSemi: -5,
    bassBoost: 7,
    highCut: 4500,
  },
  {
    id: "anime",
    name: "Anime / Cute Girl",
    icon: "🌸",
    desc: "High-pitched, bright and youthful",
    pitchSemi: 5.5,
    lowCut: 180,
    trebleBoost: 5,
  },
  {
    id: "chipmunk",
    name: "Cartoon Chipmunk",
    icon: "🐿️",
    desc: "Playful full-octave comic shift",
    pitchSemi: 12,
    lowCut: 300,
    trebleBoost: 6,
  },
  {
    id: "monster",
    name: "Giant / Monster",
    icon: "👹",
    desc: "Sub-harmonic booming creature roar",
    pitchSemi: -10,
    bassBoost: 10,
    highCut: 3200,
  },
  {
    id: "robot",
    name: "Robot / Cyborg",
    icon: "🤖",
    desc: "Metallic sci-fi ring modulation",
    pitchSemi: -1,
    robotRate: 58,
    lowCut: 350,
    highCut: 4200,
  },
  {
    id: "radio",
    name: "Walkie-Talkie",
    icon: "📻",
    desc: "Band-limited military radio with grit",
    pitchSemi: 0,
    lowCut: 450,
    highCut: 2800,
    distortion: 18,
  },
  {
    id: "echo",
    name: "Cavern / Echo",
    icon: "🏰",
    desc: "Spacious cavern echo delay",
    pitchSemi: 0,
    echoTime: 0.26,
    echoFeedback: 0.4,
  },
  {
    id: "custom",
    name: "Custom Tune",
    icon: "🎛️",
    desc: "Custom semitone pitch & formant tuning",
    pitchSemi: 0,
  },
];

/* ------------------------------------------------------------------ */
/* Web Audio Pitch Shifter (Jungle delay-modulation algorithm)          */
/* ------------------------------------------------------------------ */

interface PitchShifterNode {
  input: GainNode;
  output: GainNode;
  setPitchRatio: (ratio: number) => void;
  dispose: () => void;
}

function createPitchShifter(ctx: AudioContext): PitchShifterNode {
  const input = ctx.createGain();
  const output = ctx.createGain();

  // Dry bypass for zero-latency 1.0 pitch
  const dryGain = ctx.createGain();
  const wetGain = ctx.createGain();
  dryGain.gain.value = 1;
  wetGain.gain.value = 0;

  input.connect(dryGain);
  dryGain.connect(output);

  // Twin modulated delay lines
  const bufferTime = 0.10; // 100ms grain window
  const delay1 = ctx.createDelay(1);
  const delay2 = ctx.createDelay(1);
  delay1.delayTime.value = 0;
  delay2.delayTime.value = 0;

  const length = Math.floor(ctx.sampleRate * bufferTime);
  const rampUp = ctx.createBuffer(1, length, ctx.sampleRate);
  const rampDown = ctx.createBuffer(1, length, ctx.sampleRate);
  const halfSine = ctx.createBuffer(1, length, ctx.sampleRate);

  const dUp = rampUp.getChannelData(0);
  const dDown = rampDown.getChannelData(0);
  const dSine = halfSine.getChannelData(0);

  for (let i = 0; i < length; i++) {
    const p = i / length;
    dUp[i] = p * bufferTime;
    dDown[i] = (1 - p) * bufferTime;
    dSine[i] = Math.sin(p * Math.PI);
  }

  // Modulator sources
  let mod1: AudioBufferSourceNode | null = null;
  let mod2: AudioBufferSourceNode | null = null;
  let modGain1: GainNode | null = null;
  let modGain2: GainNode | null = null;
  let fade1: AudioBufferSourceNode | null = null;
  let fade2: AudioBufferSourceNode | null = null;

  const gain1 = ctx.createGain();
  const gain2 = ctx.createGain();

  input.connect(delay1);
  input.connect(delay2);

  delay1.connect(gain1);
  delay2.connect(gain2);

  gain1.connect(wetGain);
  gain2.connect(wetGain);
  wetGain.connect(output);

  function restartModulators(pitchRatio: number) {
    if (mod1) {
      try { mod1.stop(); mod2?.stop(); fade1?.stop(); fade2?.stop(); } catch {}
    }

    if (Math.abs(pitchRatio - 1.0) < 0.01) {
      dryGain.gain.setTargetAtTime(1, ctx.currentTime, 0.02);
      wetGain.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
      return;
    }

    dryGain.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
    wetGain.gain.setTargetAtTime(1, ctx.currentTime, 0.02);

    const shiftUp = pitchRatio > 1.0;
    const speed = Math.abs(1.0 - pitchRatio);

    mod1 = ctx.createBufferSource();
    mod2 = ctx.createBufferSource();
    mod1.buffer = shiftUp ? rampDown : rampUp;
    mod2.buffer = shiftUp ? rampDown : rampUp;
    mod1.loop = true;
    mod2.loop = true;
    mod1.playbackRate.value = speed;
    mod2.playbackRate.value = speed;

    fade1 = ctx.createBufferSource();
    fade2 = ctx.createBufferSource();
    fade1.buffer = halfSine;
    fade2.buffer = halfSine;
    fade1.loop = true;
    fade2.loop = true;
    fade1.playbackRate.value = speed;
    fade2.playbackRate.value = speed;

    modGain1 = ctx.createGain();
    modGain2 = ctx.createGain();
    modGain1.gain.value = 1;
    modGain2.gain.value = 1;

    mod1.connect(delay1.delayTime);
    mod2.connect(delay2.delayTime);

    fade1.connect(gain1.gain);
    fade2.connect(gain2.gain);

    const t0 = ctx.currentTime + 0.01;
    const offset = bufferTime / (2 * Math.max(0.01, speed));
    mod1.start(t0);
    fade1.start(t0);
    mod2.start(t0 + offset);
    fade2.start(t0 + offset);
  }

  return {
    input,
    output,
    setPitchRatio: (ratio: number) => {
      restartModulators(ratio);
    },
    dispose: () => {
      try {
        mod1?.stop();
        mod2?.stop();
        fade1?.stop();
        fade2?.stop();
      } catch {}
    },
  };
}

/* ------------------------------------------------------------------ */
/* Waveshaper Distortion Curve                                          */
/* ------------------------------------------------------------------ */

function makeDistortionCurve(amount = 20) {
  const n = 2048;
  const curve = new Float32Array(n);
  const deg = Math.PI / 180;
  for (let i = 0; i < n; ++i) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

/* ------------------------------------------------------------------ */
/* Voice Studio Engine Singleton                                        */
/* ------------------------------------------------------------------ */

class VoiceStudioEngine {
  private ctx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;

  // DSP chain nodes
  private inputGain: GainNode | null = null;
  private pitchShifter: PitchShifterNode | null = null;
  private hpFilter: BiquadFilterNode | null = null;
  private lpFilter: BiquadFilterNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;
  private waveshaper: WaveShaperNode | null = null;
  private shaperDry: GainNode | null = null;
  private shaperWet: GainNode | null = null;
  private robotOsc: OscillatorNode | null = null;
  private robotGain: GainNode | null = null;
  private robotDry: GainNode | null = null;
  private robotWet: GainNode | null = null;
  private echoDelay: DelayNode | null = null;
  private echoFeedbackGain: GainNode | null = null;
  private echoWet: GainNode | null = null;
  private masterOutput: GainNode | null = null;
  private monitorGain: GainNode | null = null;
  private destNode: MediaStreamAudioDestinationNode | null = null;

  // State
  private activePreset: VoicePreset = VOICE_PRESETS[0];
  private customPitch = 0;
  private monitoring = false;
  private micVolume = 0;
  private isCapturing = false;
  private timeDomainBuffer: Uint8Array | null = null;

  // MediaRecorder for takes
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recStartTime = 0;

  // Timeline audio clips playback
  private activeAudioElements = new Map<string, HTMLAudioElement>();

  ensureAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  async startMic(): Promise<boolean> {
    if (this.isCapturing && this.micStream) return true;
    try {
      const ctx = this.ensureAudioContext();
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.buildDSPChain(ctx);
      this.isCapturing = true;
      return true;
    } catch (err) {
      console.warn("Could not access microphone:", err);
      return false;
    }
  }

  stopMic() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    this.pitchShifter?.dispose();
    this.pitchShifter = null;
    try {
      this.robotOsc?.stop();
    } catch {}
    this.robotOsc = null;
    this.isCapturing = false;
    this.monitoring = false;
  }

  private buildDSPChain(ctx: AudioContext) {
    if (!this.micStream) return;

    // Disconnect any existing nodes
    this.pitchShifter?.dispose();

    this.micSource = ctx.createMediaStreamSource(this.micStream);

    // Analyser for VU Meter and Live Lip Sync
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.timeDomainBuffer = new Uint8Array(this.analyser.frequencyBinCount);
    this.micSource.connect(this.analyser);

    // Input gain
    this.inputGain = ctx.createGain();
    this.inputGain.gain.value = 1.0;
    this.micSource.connect(this.inputGain);

    // Pitch Shifter
    this.pitchShifter = createPitchShifter(ctx);
    this.inputGain.connect(this.pitchShifter.input);

    // Filters: Highpass, Lowpass, Bass shelf, Treble shelf
    this.hpFilter = ctx.createBiquadFilter();
    this.hpFilter.type = "highpass";
    this.hpFilter.frequency.value = 80;

    this.lpFilter = ctx.createBiquadFilter();
    this.lpFilter.type = "lowpass";
    this.lpFilter.frequency.value = 12000;

    this.bassFilter = ctx.createBiquadFilter();
    this.bassFilter.type = "lowshelf";
    this.bassFilter.frequency.value = 140;
    this.bassFilter.gain.value = 0;

    this.trebleFilter = ctx.createBiquadFilter();
    this.trebleFilter.type = "highshelf";
    this.trebleFilter.frequency.value = 3500;
    this.trebleFilter.gain.value = 0;

    this.pitchShifter.output.connect(this.hpFilter);
    this.hpFilter.connect(this.lpFilter);
    this.lpFilter.connect(this.bassFilter);
    this.bassFilter.connect(this.trebleFilter);

    // Waveshaper (Distortion for radio)
    this.waveshaper = ctx.createWaveShaper();
    this.waveshaper.curve = makeDistortionCurve(20);
    this.waveshaper.oversample = "2x";
    this.shaperDry = ctx.createGain();
    this.shaperWet = ctx.createGain();
    this.shaperDry.gain.value = 1;
    this.shaperWet.gain.value = 0;

    this.trebleFilter.connect(this.shaperDry);
    this.trebleFilter.connect(this.waveshaper);
    this.waveshaper.connect(this.shaperWet);

    const postShaperGain = ctx.createGain();
    this.shaperDry.connect(postShaperGain);
    this.shaperWet.connect(postShaperGain);

    // Robot ring modulator
    this.robotOsc = ctx.createOscillator();
    this.robotOsc.type = "sine";
    this.robotOsc.frequency.value = 58;
    this.robotGain = ctx.createGain();
    this.robotGain.gain.value = 0;
    this.robotOsc.connect(this.robotGain.gain);
    this.robotOsc.start();

    this.robotDry = ctx.createGain();
    this.robotWet = ctx.createGain();
    this.robotDry.gain.value = 1;
    this.robotWet.gain.value = 0;

    postShaperGain.connect(this.robotDry);
    postShaperGain.connect(this.robotGain);
    this.robotGain.connect(this.robotWet);

    const postRobotGain = ctx.createGain();
    this.robotDry.connect(postRobotGain);
    this.robotWet.connect(postRobotGain);

    // Echo / Delay node
    this.echoDelay = ctx.createDelay(1.0);
    this.echoDelay.delayTime.value = 0.25;
    this.echoFeedbackGain = ctx.createGain();
    this.echoFeedbackGain.gain.value = 0.35;
    this.echoWet = ctx.createGain();
    this.echoWet.gain.value = 0;

    this.echoDelay.connect(this.echoFeedbackGain);
    this.echoFeedbackGain.connect(this.echoDelay);
    this.echoDelay.connect(this.echoWet);

    postRobotGain.connect(this.echoDelay);

    // Master bus
    this.masterOutput = ctx.createGain();
    this.masterOutput.gain.value = 1.0;

    postRobotGain.connect(this.masterOutput);
    this.echoWet.connect(this.masterOutput);

    // Record destination
    this.destNode = ctx.createMediaStreamDestination();
    this.masterOutput.connect(this.destNode);

    // Monitor output (headphones)
    this.monitorGain = ctx.createGain();
    this.monitorGain.gain.value = this.monitoring ? 1.0 : 0.0;
    this.masterOutput.connect(this.monitorGain);
    this.monitorGain.connect(ctx.destination);

    // Apply currently active preset
    this.applyPreset(this.activePreset);
  }

  setPreset(presetKey: VoicePresetKey) {
    const found = VOICE_PRESETS.find((p) => p.id === presetKey) || VOICE_PRESETS[0];
    this.activePreset = found;
    this.applyPreset(found);
  }

  setCustomPitch(semitones: number) {
    this.customPitch = semitones;
    if (this.activePreset.id === "custom") {
      this.applyPitch(semitones);
    }
  }

  private applyPreset(preset: VoicePreset) {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;

    const semi = preset.id === "custom" ? this.customPitch : preset.pitchSemi;
    this.applyPitch(semi);

    if (this.hpFilter) {
      this.hpFilter.frequency.setTargetAtTime(preset.lowCut ?? 80, now, 0.03);
    }
    if (this.lpFilter) {
      this.lpFilter.frequency.setTargetAtTime(preset.highCut ?? 12000, now, 0.03);
    }
    if (this.bassFilter) {
      this.bassFilter.gain.setTargetAtTime(preset.bassBoost ?? 0, now, 0.03);
    }
    if (this.trebleFilter) {
      this.trebleFilter.gain.setTargetAtTime(preset.trebleBoost ?? 0, now, 0.03);
    }

    // Distortion for radio
    if (this.shaperDry && this.shaperWet) {
      const hasDist = (preset.distortion ?? 0) > 0;
      this.shaperDry.gain.setTargetAtTime(hasDist ? 0.2 : 1.0, now, 0.03);
      this.shaperWet.gain.setTargetAtTime(hasDist ? 0.9 : 0.0, now, 0.03);
      if (this.waveshaper && hasDist) {
        this.waveshaper.curve = makeDistortionCurve(preset.distortion ?? 20);
      }
    }

    // Robot ring mod
    if (this.robotDry && this.robotWet && this.robotOsc) {
      const isRobot = (preset.robotRate ?? 0) > 0;
      this.robotDry.gain.setTargetAtTime(isRobot ? 0.1 : 1.0, now, 0.03);
      this.robotWet.gain.setTargetAtTime(isRobot ? 0.95 : 0.0, now, 0.03);
      if (isRobot) {
        this.robotOsc.frequency.setTargetAtTime(preset.robotRate ?? 58, now, 0.03);
      }
    }

    // Echo
    if (this.echoWet && this.echoDelay && this.echoFeedbackGain) {
      const hasEcho = (preset.echoTime ?? 0) > 0;
      this.echoWet.gain.setTargetAtTime(hasEcho ? 0.5 : 0.0, now, 0.03);
      if (hasEcho) {
        this.echoDelay.delayTime.setTargetAtTime(preset.echoTime ?? 0.25, now, 0.03);
        this.echoFeedbackGain.gain.setTargetAtTime(preset.echoFeedback ?? 0.35, now, 0.03);
      }
    }
  }

  private applyPitch(semitones: number) {
    if (!this.pitchShifter) return;
    const ratio = Math.pow(2, semitones / 12);
    this.pitchShifter.setPitchRatio(ratio);
  }

  setMonitor(enable: boolean) {
    this.monitoring = enable;
    if (this.monitorGain && this.ctx) {
      this.monitorGain.gain.setTargetAtTime(enable ? 1.0 : 0.0, this.ctx.currentTime, 0.02);
    }
  }

  getMonitoring(): boolean {
    return this.monitoring;
  }

  /** Calculates real-time microphone RMS volume level (0.0 to 1.0) */
  getMicVolume(): number {
    if (!this.analyser || !this.timeDomainBuffer) return 0;
    this.analyser.getByteTimeDomainData(this.timeDomainBuffer);
    let sum = 0;
    const len = this.timeDomainBuffer.length;
    for (let i = 0; i < len; i++) {
      const v = (this.timeDomainBuffer[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / len);
    // Smooth peak detection
    this.micVolume += (rms - this.micVolume) * 0.35;
    return Math.min(1, this.micVolume * 3.5);
  }

  /* ------------------------------------------------------------------ */
  /* Take Recording                                                     */
  /* ------------------------------------------------------------------ */

  startRecording(): boolean {
    if (!this.destNode) return false;
    this.recordedChunks = [];
    const stream = this.destNode.stream;
    const mimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
    const mime = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || "";

    try {
      this.mediaRecorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    } catch {
      this.mediaRecorder = new MediaRecorder(stream);
    }

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.recordedChunks.push(e.data);
    };

    this.recStartTime = performance.now();
    this.mediaRecorder.start(50);
    return true;
  }

  async stopRecording(): Promise<{ audioUrl: string; duration: number } | null> {
    if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") return null;

    return new Promise((resolve) => {
      const rec = this.mediaRecorder!;
      rec.onstop = () => {
        const elapsed = (performance.now() - this.recStartTime) / 1000;
        const blob = new Blob(this.recordedChunks, { type: rec.mimeType || "audio/webm" });
        const audioUrl = URL.createObjectURL(blob);
        resolve({
          audioUrl,
          duration: Math.max(0.1, elapsed),
        });
      };
      rec.stop();
    });
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === "recording";
  }

  /* ------------------------------------------------------------------ */
  /* Synchronized Timeline Audio Playback                               */
  /* ------------------------------------------------------------------ */

  syncPlayback(clips: { id: string; start: number; duration: number; audioUrl: string; volume?: number }[], t: number, playing: boolean) {
    const activeClipIds = new Set(clips.map((c) => c.id));

    // Remove deleted clips
    for (const [id, el] of this.activeAudioElements.entries()) {
      if (!activeClipIds.has(id)) {
        el.pause();
        el.src = "";
        this.activeAudioElements.delete(id);
      }
    }

    for (const clip of clips) {
      let el = this.activeAudioElements.get(clip.id);
      if (!el) {
        el = new Audio(clip.audioUrl);
        el.preload = "auto";
        this.activeAudioElements.set(clip.id, el);
      }
      el.volume = Math.max(0, Math.min(1, clip.volume ?? 1));

      const isInside = t >= clip.start && t < clip.start + clip.duration;
      if (isInside && playing) {
        const targetOffset = t - clip.start;
        if (el.paused || Math.abs(el.currentTime - targetOffset) > 0.15) {
          el.currentTime = targetOffset;
          void el.play().catch(() => {});
        }
      } else {
        if (!el.paused) {
          el.pause();
        }
        if (!playing && isInside) {
          el.currentTime = t - clip.start;
        }
      }
    }
  }

  stopAllPlayback() {
    for (const el of this.activeAudioElements.values()) {
      el.pause();
    }
  }
}

export const voiceEngine = new VoiceStudioEngine();
