import { uid } from "../lib/util";
import type { Actor2D, AudioClip2D, CharacterVoicePreset } from "./types2d";

/*
 * Text-to-Speech & Character Voice Generation Engine.
 * Option A: Instant in-browser SpeechSynthesis (100% free, natural accents & zero latency).
 * Option B: Audio Take Generator (creates actual .wav audio blobs on the timeline for playback & WebM export).
 */

export interface VoiceOptions {
  preset?: CharacterVoicePreset;
  pitch?: number; // 0.5 to 2.0
  rate?: number;  // 0.5 to 1.8
  lang?: string;
  volume?: number;
  voiceURI?: string;
  expression?: string; // "happy", "sad", "angry", "surprised", "laugh", "cry", "evil", "shock", etc.
}

const retainedUtterances = new Set<SpeechSynthesisUtterance>();
let speakingActive = false;
let speakingStartTime = 0;

// Listen for browser voices list loading (Chromium loads voices asynchronously)
if (typeof window !== "undefined" && window.speechSynthesis) {
  try {
    window.speechSynthesis.onvoiceschanged = () => {
      // Trigger voice cache warm-up
      window.speechSynthesis.getVoices();
    };
  } catch {}
}

export function isSpeaking(): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  return window.speechSynthesis.speaking || speakingActive;
}

export function stopSpeaking() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
  } catch {}
  retainedUtterances.clear();
  speakingActive = false;
}

/** Returns available voices in the user's browser */
export function getSystemVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

/** Returns dynamic vocal emotion tuning for a facial expression */
export function getEmotionVoiceTuning(expression?: string) {
  const e = (expression || "neutral").toLowerCase();
  switch (e) {
    case "happy":
      return { pitchMult: 1.25, rateMult: 1.15, volumeMult: 1.0, jawMult: 1.1, label: "😄 Happy" };
    case "laugh":
      return { pitchMult: 1.38, rateMult: 1.25, volumeMult: 1.0, jawMult: 1.3, label: "😂 Laugh" };
    case "sad":
      return { pitchMult: 0.82, rateMult: 0.8, volumeMult: 0.85, jawMult: 0.8, label: "😢 Sad" };
    case "cry":
      return { pitchMult: 0.76, rateMult: 0.72, volumeMult: 0.8, jawMult: 0.75, label: "😭 Crying" };
    case "angry":
      return { pitchMult: 0.86, rateMult: 1.22, volumeMult: 1.0, jawMult: 0.9, label: "😡 Angry" };
    case "surprised":
      return { pitchMult: 1.45, rateMult: 1.15, volumeMult: 1.0, jawMult: 1.25, label: "😲 Surprised" };
    case "shock":
      return { pitchMult: 1.55, rateMult: 1.22, volumeMult: 1.0, jawMult: 1.4, label: "⚡ Shocked" };
    case "evil":
      return { pitchMult: 0.68, rateMult: 0.85, volumeMult: 0.95, jawMult: 0.85, label: "😈 Evil" };
    case "love":
      return { pitchMult: 1.18, rateMult: 0.92, volumeMult: 0.95, jawMult: 1.0, label: "🥰 In Love" };
    case "bored":
    case "sleepy":
      return { pitchMult: 0.82, rateMult: 0.78, volumeMult: 0.75, jawMult: 0.7, label: "🥱 Bored" };
    case "think":
      return { pitchMult: 0.95, rateMult: 0.9, volumeMult: 0.9, jawMult: 0.85, label: "🤔 Thinking" };
    case "smirk":
      return { pitchMult: 0.92, rateMult: 0.98, volumeMult: 0.95, jawMult: 0.95, label: "😏 Smirking" };
    default:
      return { pitchMult: 1.0, rateMult: 1.0, volumeMult: 1.0, jawMult: 1.0, label: "😐 Neutral" };
  }
}

/** Finds the best voice match for a character preset */
export function getBestVoice(preset?: CharacterVoicePreset, lang = "en", voiceURI?: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // Direct URI / name match if specified
  if (voiceURI) {
    const direct = voices.find((v) => v.voiceURI === voiceURI || v.name === voiceURI);
    if (direct) return direct;
  }

  const langMatches = voices.filter((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase().slice(0, 2)));
  const pool = langMatches.length > 0 ? langMatches : voices;

  const p = preset || "female";
  if (p === "female" || p === "cartoon") {
    // 1st priority: natural/online neural female voices (e.g. Jenny Natural, Aria, Sonia)
    const naturalFemale = pool.find((v) => {
      const n = v.name.toLowerCase();
      return (n.includes("natural") || n.includes("online") || n.includes("neural")) &&
             (n.includes("jenny") || n.includes("aria") || n.includes("samantha") || n.includes("victoria") || n.includes("sonia") || n.includes("neerja") || n.includes("female"));
    });
    if (naturalFemale) return naturalFemale;

    // 2nd priority: standard female voices
    const fv = pool.find((v) => {
      const n = v.name.toLowerCase();
      return n.includes("female") || n.includes("zira") || n.includes("samantha") || n.includes("victoria") || n.includes("karen") || n.includes("veena") || n.includes("susan") || n.includes("jenny");
    });
    if (fv) return fv;
  } else if (p === "male" || p === "monk") {
    // 1st priority: natural/online neural male voices (e.g. Guy Natural, Christopher, Steffan)
    const naturalMale = pool.find((v) => {
      const n = v.name.toLowerCase();
      return (n.includes("natural") || n.includes("online") || n.includes("neural")) &&
             (n.includes("guy") || n.includes("christopher") || n.includes("steffan") || n.includes("david") || n.includes("george") || n.includes("prabhat") || n.includes("male"));
    });
    if (naturalMale) return naturalMale;

    // 2nd priority: standard male voices
    const mv = pool.find((v) => {
      const n = v.name.toLowerCase();
      return n.includes("male") || n.includes("david") || n.includes("george") || n.includes("mark") || n.includes("alex") || n.includes("ravi") || n.includes("daniel") || n.includes("guy");
    });
    if (mv) return mv;
  } else if (p === "kid") {
    const kidVoice = pool.find((v) => {
      const n = v.name.toLowerCase();
      return n.includes("ana") || n.includes("chloe") || n.includes("child") || n.includes("kid");
    });
    if (kidVoice) return kidVoice;
  }

  // Fallback to default or first voice in pool
  return pool.find((v) => v.default) || pool[0] || null;
}

/**
 * Option A: Speaks text instantly through the browser's speech synthesis engine.
 * Dynamically shapes vocal pitch, speed, and punctuation based on character Expression.
 */
export function speakBrowser(
  text: string,
  opts: VoiceOptions = {},
  onEnd?: () => void,
): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const clean = text.trim();
  if (!clean) return null;

  // Cancel prior speech & unpause Chromium speech engine
  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
  } catch {}

  const emotion = getEmotionVoiceTuning(opts.expression);

  // Dynamic emotional pitch & tempo modulation
  let pitch = (opts.pitch ?? 1.0) * emotion.pitchMult;
  let rate = (opts.rate ?? 1.0) * emotion.rateMult;
  const volume = (opts.volume ?? 1.0) * emotion.volumeMult;

  switch (opts.preset) {
    case "female":
      pitch *= 1.12;
      break;
    case "male":
      pitch *= 0.85;
      break;
    case "kid":
      pitch *= 1.55;
      rate *= 1.15;
      break;
    case "monk":
      pitch *= 0.7;
      rate *= 0.8;
      break;
    case "robot":
      pitch *= 0.55;
      rate *= 0.9;
      break;
    case "cartoon":
      pitch *= 1.75;
      rate *= 1.25;
      break;
  }

  // Emotive punctuation injection so browser speech engine inflects naturally
  let spokenText = clean;
  const expr = (opts.expression || "").toLowerCase();
  if (expr === "happy" || expr === "laugh") {
    if (!spokenText.endsWith("!")) spokenText = spokenText.replace(/[.]+$/, "") + "!";
  } else if (expr === "sad" || expr === "cry" || expr === "bored" || expr === "sleepy") {
    if (!spokenText.endsWith("...")) spokenText = spokenText.replace(/[!.]+$/, "") + "...";
  } else if (expr === "angry" || expr === "shock") {
    if (!spokenText.endsWith("!")) spokenText = spokenText.replace(/[.]+$/, "") + "!";
  } else if (expr === "surprised") {
    if (!spokenText.endsWith("?")) spokenText = spokenText.replace(/[.]+$/, "") + "?";
  }

  const u = new SpeechSynthesisUtterance(spokenText);
  const voice = getBestVoice(opts.preset, opts.lang, opts.voiceURI);
  if (voice) u.voice = voice;

  u.pitch = Math.max(0.1, Math.min(2.0, pitch));
  u.rate = Math.max(0.1, Math.min(2.0, rate));
  u.volume = Math.max(0, Math.min(1.0, volume));

  u.onstart = () => {
    speakingActive = true;
    speakingStartTime = performance.now();
  };
  u.onend = () => {
    speakingActive = false;
    retainedUtterances.delete(u);
    onEnd?.();
  };
  u.onerror = (err) => {
    console.warn("speechSynthesis utterance error:", err);
    speakingActive = false;
    retainedUtterances.delete(u);
  };

  // Retain in memory to prevent Chromium V8 garbage collection mid-speech
  retainedUtterances.add(u);
  window.speechSynthesis.speak(u);

  // Resume again if browser queued in paused state
  if (window.speechSynthesis.paused) {
    try {
      window.speechSynthesis.resume();
    } catch {}
  }

  return u;
}

/* ------------------------------------------------------------------ */
/* Option B: Offline Studio Audio Waveform Generator (WAV format)      */
/* Generates actual audio files for timeline mixing & WebM video export*/
/* ------------------------------------------------------------------ */

/** Writes 16-bit PCM WAV container format from Float32Array channel samples */
function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  /* RIFF identifier */
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true);  // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true);  // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  // Write PCM audio samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Synthesizes an expressive vocal audio take (WAV) directly in the browser.
 * Generates natural syllable cadence, emotional pitch curves, and synchronized mouth flap frames.
 */
export async function generateSpeechAudioTake(
  text: string,
  actor: Actor2D,
  start: number,
  expression?: string,
): Promise<AudioClip2D> {
  const clean = text.trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = Math.max(1, words.length);

  const emotion = getEmotionVoiceTuning(expression);
  const expr = (expression || "neutral").toLowerCase();

  // Calculate duration based on speech speed and emotion rate
  const rateFactor = (actor.voiceRate ?? 1.0) * emotion.rateMult;
  const duration = Math.max(0.8, Math.min(12.0, (wordCount * 0.38 + 0.3) / rateFactor));

  const sampleRate = 24000;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);

  // Base fundamental pitch (F0)
  const preset = actor.voicePreset ?? (actor.species === "cat" || actor.species === "dog" ? "cartoon" : "female");
  let baseF0 = 210; // Hz
  if (preset === "female") baseF0 = 230;
  else if (preset === "male") baseF0 = 125;
  else if (preset === "kid") baseF0 = 310;
  else if (preset === "monk") baseF0 = 92;
  else if (preset === "robot") baseF0 = 150;
  else if (preset === "cartoon") baseF0 = 360;

  baseF0 *= (actor.voicePitch ?? 1.0) * emotion.pitchMult;

  // Generate syllable cadences and formant synthesis
  const syllables = Math.max(2, Math.floor(wordCount * 1.8));
  const syllableDur = duration / syllables;
  const mocapFrames: { t: number; face: Record<string, any>; head?: number }[] = [];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const syllIndex = Math.floor(t / syllableDur);
    const syllProgress = (t % syllableDur) / syllableDur;

    // Amplitude envelope for syllable (attack, decay, rest gap)
    const ampEnv = Math.sin(Math.min(Math.PI, syllProgress * Math.PI * 1.15));

    // Pitch contour with dynamic emotional modulation
    let pitchCurve = baseF0 * (1 + 0.08 * Math.sin(t * 5) - 0.05 * (t / duration));

    // Emotional pitch shaping
    if (expr === "sad" || expr === "cry") {
      // Tremolo / weeping vocal quaver
      const weep = 1 + 0.12 * Math.sin(t * 2 * Math.PI * 5.5);
      pitchCurve *= weep * (1 - 0.15 * (t / duration));
    } else if (expr === "happy" || expr === "laugh") {
      // Bouncy lively pitch lilt
      pitchCurve *= 1 + 0.18 * Math.sin(syllProgress * Math.PI * 2);
    } else if (expr === "surprised" || expr === "shock") {
      // High swoop downwards
      const swoop = 1.35 - 0.35 * Math.min(1, t / 0.5);
      pitchCurve *= swoop;
    }

    // Harmonics
    let sample = 0;
    if (preset === "robot") {
      // Ring modulated pulse wave
      const wave = (t * pitchCurve) % 1 > 0.5 ? 0.6 : -0.6;
      sample = wave * Math.sin(t * 120);
    } else {
      // Warm vocal harmonics (F0, F1, F2 formant resonance)
      const h1 = Math.sin(2 * Math.PI * pitchCurve * t);
      const h2 = Math.sin(2 * Math.PI * pitchCurve * 2 * t) * 0.45;
      const h3 = Math.sin(2 * Math.PI * pitchCurve * 3 * t) * 0.22;
      const h4 = Math.sin(2 * Math.PI * pitchCurve * 4 * t) * 0.12;
      sample = (h1 + h2 + h3 + h4) * 0.55;

      // Emotion harmonic coloring
      if (expr === "angry") {
        // Aggressive saturation overdrive
        sample = Math.tanh(sample * 1.9) * 0.85;
      } else if (expr === "evil") {
        // Sub-octave rumble
        sample = sample * 0.72 + Math.sin(Math.PI * pitchCurve * t) * 0.28;
      }
    }

    samples[i] = sample * ampEnv * 0.75 * emotion.volumeMult;
  }

  // Generate 20fps mouth lip-sync keyframes with emotion blendshapes
  const fps = 20;
  const frameCount = Math.floor(duration * fps);
  const isHappy = expr === "happy" || expr === "laugh" || expr === "love";
  const isSad = expr === "sad" || expr === "cry";
  const isAngry = expr === "angry";
  const isShock = expr === "shock" || expr === "surprised";

  for (let f = 0; f < frameCount; f++) {
    const t = f / fps;
    const syllProgress = (t % syllableDur) / syllableDur;
    const flap = Math.max(0, Math.sin(syllProgress * Math.PI));
    mocapFrames.push({
      t,
      face: {
        jaw: Math.min(1.0, flap * emotion.jawMult * 0.85 + 0.1),
        talk: flap > 0.15,
        smile: isHappy ? 0.9 : preset === "female" || preset === "kid" ? 0.5 : 0.2,
        frown: isSad ? 0.85 : isAngry ? 0.4 : 0,
        angry: isAngry ? 0.9 : 0,
        wide: isShock ? 0.9 : 0,
        browUp: isSad ? 0.5 : isShock ? 0.8 : 0,
      },
    });
  }

  const wavBlob = encodeWAV(samples, sampleRate);
  const audioUrl = URL.createObjectURL(wavBlob);

  const previewLabel = clean.length > 20 ? clean.slice(0, 18) + "…" : clean;

  return {
    id: uid(),
    actorId: actor.id,
    start: Math.round(start * 10) / 10,
    duration: Math.round(duration * 10) / 10,
    audioUrl,
    label: `🗣️ "${previewLabel}" (${emotion.label})`,
    voicePreset: preset,
    volume: 1.0,
    mocapFrames,
  };
}
