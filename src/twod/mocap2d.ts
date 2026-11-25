/*
 * Real-time Webcam Face Motion Capture for 2D Characters.
 * Detects facial landmarks and blendshapes via MediaPipe FaceLandmarker,
 * extracting blinks, eye gaze, smiles, frowns, jaw opening, and head roll,
 * streaming them in real time to 2D figures and recording keyframe takes.
 */

import { ensureModels, getFaceLandmarker, solveFace } from "../mocap/engine";
import type { FaceState } from "../three/rigs";

export interface MocapFrame2D {
  t: number;
  face: FaceState;
  head?: number; // head roll in radians
}

export const liveMocap2D = {
  active: false,
  face: null as FaceState | null,
  headRoll: 0,
  recording: false,
  startTime: 0,
  frames: [] as MocapFrame2D[],
  lastSeen: 0,
};

let videoEl: HTMLVideoElement | null = null;
let stream: MediaStream | null = null;
let rafId = 0;
let running = false;
let lastVideoTime = -1;

function processVideoFrame() {
  if (!videoEl || !running) return;
  const faceLM = getFaceLandmarker();
  if (!faceLM) return;

  const now = performance.now();
  let fr: ReturnType<typeof faceLM.detectForVideo> | null = null;
  try {
    fr = faceLM.detectForVideo(videoEl, now);
  } catch {
    return;
  }

  const aspect = (videoEl.videoWidth || 640) / (videoEl.videoHeight || 480);
  if (fr && fr.faceLandmarks && fr.faceLandmarks[0]) {
    const solved = solveFace(
      fr.faceLandmarks[0] as Parameters<typeof solveFace>[0],
      fr.faceBlendshapes?.[0]?.categories as Parameters<typeof solveFace>[1],
      aspect,
    );

    liveMocap2D.face = solved.state;
    liveMocap2D.headRoll = solved.roll;
    liveMocap2D.lastSeen = now;
    liveMocap2D.active = true;

    if (liveMocap2D.recording) {
      const relT = (now - liveMocap2D.startTime) / 1000;
      liveMocap2D.frames.push({
        t: relT,
        face: { ...solved.state },
        head: solved.roll,
      });
    }
  } else {
    // If lost tracking for more than 400ms, clear active face
    if (now - liveMocap2D.lastSeen > 400) {
      liveMocap2D.face = null;
      liveMocap2D.headRoll = 0;
      liveMocap2D.active = false;
    }
  }
}

function mocapLoop() {
  if (!running) return;
  if (videoEl && videoEl.readyState >= 2 && videoEl.currentTime !== lastVideoTime) {
    lastVideoTime = videoEl.currentTime;
    processVideoFrame();
  }
  rafId = requestAnimationFrame(mocapLoop);
}

export async function startMocap2D(el: HTMLVideoElement): Promise<boolean> {
  stopMocap2D();
  try {
    await ensureModels();
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: "user" },
      audio: false,
    });
    videoEl = el;
    el.srcObject = stream;
    el.muted = true;
    await el.play();
    running = true;
    liveMocap2D.active = true;
    lastVideoTime = -1;
    mocapLoop();
    return true;
  } catch (err) {
    console.warn("Could not start face mocap webcam:", err);
    return false;
  }
}

export function stopMocap2D() {
  running = false;
  cancelAnimationFrame(rafId);
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  if (videoEl) {
    videoEl.pause();
    if (videoEl.srcObject) videoEl.srcObject = null;
    videoEl = null;
  }
  liveMocap2D.active = false;
  liveMocap2D.face = null;
  liveMocap2D.headRoll = 0;
  liveMocap2D.recording = false;
}

export function startMocapRecording() {
  liveMocap2D.frames = [];
  liveMocap2D.startTime = performance.now();
  liveMocap2D.recording = true;
}

export function stopMocapRecording(): MocapFrame2D[] {
  liveMocap2D.recording = false;
  const captured = [...liveMocap2D.frames];
  liveMocap2D.frames = [];
  return captured;
}

export function isMocapRunning() {
  return running;
}
