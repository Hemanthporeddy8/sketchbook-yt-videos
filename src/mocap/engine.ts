import * as THREE from "three";
import { FaceLandmarker, FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { create } from "zustand";
import { HUMAN_ORDER, HUMAN_PARENT, rigRegistry, NEUTRAL_FACE, type FaceState, type RigInstance } from "../three/rigs";
import { useStore } from "../store";
import type { Take, TakeFrame } from "../lib/types";
import { uid } from "../lib/util";

/* ------------------------------------------------------------------ */
/* Config                                                               */
/* ------------------------------------------------------------------ */

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";
const POSE_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";
const FACE_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";

type LM = { x: number; y: number; z: number; visibility?: number };
type Cat = { categoryName: string; score: number };

export interface MocapUIState {
  source: "off" | "webcam" | "video";
  loading: boolean;
  error: string | null;
  status: string;
  recording: boolean;
  trackFace: boolean;
  fps: number;
  bodyOk: boolean;
  faceOk: boolean;
  videoName: string;
}

export const useMocapUI = create<MocapUIState>()(() => ({
  source: "off",
  loading: false,
  error: null,
  status: "Idle — start the webcam or import a video",
  recording: false,
  trackFace: true,
  fps: 0,
  bodyOk: false,
  faceOk: false,
  videoName: "",
}));

/** Live output consumed by CharacterModel every frame. */
export const liveRig = {
  active: false,
  targetId: null as string | null,
  bones: {} as Record<string, number[]>,
  py: 0,
  face: null as FaceState | null,
  lastSeen: 0,
  prev: {} as Record<string, THREE.Quaternion>,
  baseline: -1,
};

/* ------------------------------------------------------------------ */
/* Model loading                                                        */
/* ------------------------------------------------------------------ */

let poseLM: PoseLandmarker | null = null;
let faceLM: FaceLandmarker | null = null;
let loadPromise: Promise<void> | null = null;

export function getFaceLandmarker() {
  return faceLM;
}

async function withDelegate<T>(fn: (delegate: "GPU" | "CPU") => Promise<T>): Promise<T> {
  try {
    return await fn("GPU");
  } catch {
    return await fn("CPU");
  }
}

export function ensureModels(): Promise<void> {
  if (poseLM && faceLM) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    useMocapUI.setState({ loading: true, status: "Loading AI tracking models (first time may take a moment)…" });
    try {
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      poseLM = await withDelegate((delegate) =>
        PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: POSE_URL, delegate },
          runningMode: "VIDEO",
          numPoses: 1,
        }),
      );
      faceLM = await withDelegate((delegate) =>
        FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: FACE_URL, delegate },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
        }),
      );
      useMocapUI.setState({ loading: false, error: null, status: "Models ready" });
    } catch (e) {
      loadPromise = null;
      useMocapUI.setState({ loading: false, error: "Could not load tracking models. Check your internet connection.", status: "Error" });
      throw e;
    }
  })();
  return loadPromise;
}

/* ------------------------------------------------------------------ */
/* Solvers                                                              */
/* ------------------------------------------------------------------ */

const ok = (p: LM | undefined) => !!p && (p.visibility ?? 1) > 0.35;
const mid = (a: LM, b: LM): LM => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2, visibility: Math.min(a.visibility ?? 1, b.visibility ?? 1) });

/** Image-space vector -> character space (character faces the camera, +Y up, +Z toward camera). */
function charVec(a: LM, b: LM, aspect: number) {
  return new THREE.Vector3((b.x - a.x) * aspect, -(b.y - a.y), -(b.z - a.z) * aspect);
}

const DRIVEN = ["hips", "spine", "lUpperArm", "lLowerArm", "rUpperArm", "rLowerArm", "lUpperLeg", "lLowerLeg", "rUpperLeg", "rLowerLeg"];
const IDENT = new THREE.Quaternion();

export function solveFace(fl: LM[], bs: Cat[] | undefined, aspect: number): { state: FaceState; head: THREE.Quaternion | null; roll: number } {
  const g = (n: string) => bs?.find((c) => c.categoryName === n)?.score ?? 0;
  const lookX = Math.max(-1, Math.min(1, (g("eyeLookOutLeft") - g("eyeLookInLeft") + g("eyeLookInRight") - g("eyeLookOutRight")) * 1.6));
  const lookY = Math.max(-1, Math.min(1, (g("eyeLookUpLeft") + g("eyeLookUpRight") - g("eyeLookDownLeft") - g("eyeLookDownRight")) * 1.6));
  const state: FaceState = {
    ...NEUTRAL_FACE,
    blinkL: g("eyeBlinkLeft"),
    blinkR: g("eyeBlinkRight"),
    jaw: g("jawOpen"),
    smile: (g("mouthSmileLeft") + g("mouthSmileRight")) / 2,
    frown: (g("mouthFrownLeft") + g("mouthFrownRight")) / 2,
    browUp: g("browInnerUp"),
    angry: (g("browDownLeft") + g("browDownRight")) / 2,
    wide: (g("eyeWideLeft") + g("eyeWideRight")) / 2,
    lookX,
    lookY,
  };

  // Head pose from landmarks: yaw (nose vs ear midline), pitch (nose-eye vs nose-chin), roll (eye line)
  const earMidX = (fl[234].x + fl[454].x) / 2;
  const earW = Math.abs(fl[454].x - fl[234].x) || 0.1;
  const yaw = Math.max(-1.2, Math.min(1.2, ((fl[1].x - earMidX) / earW) * 2.0));
  const eyeMidY = (fl[33].y + fl[263].y) / 2;
  const ratio = (fl[1].y - eyeMidY) / (fl[152].y - eyeMidY || 0.1);
  const pitch = Math.max(-0.8, Math.min(0.8, (0.33 - ratio) * 5));
  const roll = Math.max(-0.6, Math.min(0.6, -Math.atan2((fl[263].y - fl[33].y) * 1, (fl[263].x - fl[33].x) * aspect)));
  const head = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, "YXZ"));
  return { state, head, roll };
}

function solveBody(rig: RigInstance, lm: LM[], aspect: number, headQ: THREE.Quaternion | null): Record<string, THREE.Quaternion> {
  const rest = rig.rest!;
  const targets: Record<string, () => THREE.Vector3 | null> = {
    hips: () => (ok(lm[23]) && ok(lm[24]) ? charVec(lm[24], lm[23], aspect) : null),
    spine: () => (ok(lm[11]) && ok(lm[12]) && ok(lm[23]) && ok(lm[24]) ? charVec(mid(lm[23], lm[24]), mid(lm[11], lm[12]), aspect) : null),
    lUpperArm: () => (ok(lm[11]) && ok(lm[13]) ? charVec(lm[11], lm[13], aspect) : null),
    lLowerArm: () => (ok(lm[13]) && ok(lm[15]) ? charVec(lm[13], lm[15], aspect) : null),
    rUpperArm: () => (ok(lm[12]) && ok(lm[14]) ? charVec(lm[12], lm[14], aspect) : null),
    rLowerArm: () => (ok(lm[14]) && ok(lm[16]) ? charVec(lm[14], lm[16], aspect) : null),
    lUpperLeg: () => (ok(lm[23]) && ok(lm[25]) ? charVec(lm[23], lm[25], aspect) : null),
    lLowerLeg: () => (ok(lm[25]) && ok(lm[27]) ? charVec(lm[25], lm[27], aspect) : null),
    rUpperLeg: () => (ok(lm[24]) && ok(lm[26]) ? charVec(lm[24], lm[26], aspect) : null),
    rLowerLeg: () => (ok(lm[26]) && ok(lm[28]) ? charVec(lm[26], lm[28], aspect) : null),
  };

  const worldQ: Record<string, THREE.Quaternion> = {};
  const out: Record<string, THREE.Quaternion> = {};
  for (const name of HUMAN_ORDER) {
    const parent = HUMAN_PARENT[name];
    const pW = parent ? worldQ[parent] : IDENT;
    const isDriven = DRIVEN.includes(name);
    const target = isDriven ? targets[name]?.() : null;
    let local: THREE.Quaternion;

    if (target && target.lengthSq() > 1e-6 && rest[name]) {
      const dq = new THREE.Quaternion().setFromUnitVectors(rest[name].clone().normalize(), target.normalize());
      local = pW.clone().invert().multiply(dq);
    } else if (name === "head") {
      local = headQ ? headQ.clone() : IDENT.clone();
    } else if (isDriven) {
      local = liveRig.prev[name] ? liveRig.prev[name].clone() : IDENT.clone();
    } else {
      local = IDENT.clone();
    }

    // temporal smoothing
    if (isDriven && liveRig.prev[name]) local = liveRig.prev[name].clone().slerp(local, 0.6);
    liveRig.prev[name] = local.clone();
    worldQ[name] = pW.clone().multiply(local);
    out[name] = local;
  }
  return out;
}

const toArr = (q: THREE.Quaternion) => [q.x, q.y, q.z, q.w];

/* ------------------------------------------------------------------ */
/* Source & loop                                                        */
/* ------------------------------------------------------------------ */

let video: HTMLVideoElement | null = null;
let stream: MediaStream | null = null;
let raf = 0;
let running = false;
let lastVT = -1;
let mode: "webcam" | "video" = "webcam";
let onEnded: (() => void) | null = null;
let fpsFrames = 0;
let fpsT = 0;
let lastUI = 0;

const rec = { active: false, start: 0, frames: [] as TakeFrame[] };

function processFrame() {
  if (!video || !poseLM) return;
  const st = useStore.getState();
  const ui = useMocapUI.getState();
  const ts = mode === "webcam" ? performance.now() : video.currentTime * 1000;
  let pr: ReturnType<PoseLandmarker["detectForVideo"]> | null = null;
  let fr: ReturnType<FaceLandmarker["detectForVideo"]> | null = null;
  try {
    pr = poseLM.detectForVideo(video, ts);
    if (ui.trackFace && faceLM) fr = faceLM.detectForVideo(video, ts);
  } catch {
    return;
  }
  const aspect = (video.videoWidth || 640) / (video.videoHeight || 480);
  liveRig.targetId = st.mocapTargetId;
  const target = st.mocapTargetId ? rigRegistry.get(st.mocapTargetId) : undefined;

  let faceOk = false;
  let headQ: THREE.Quaternion | null = null;
  if (fr && fr.faceLandmarks && fr.faceLandmarks[0]) {
    const s = solveFace(fr.faceLandmarks[0] as LM[], fr.faceBlendshapes?.[0]?.categories as Cat[] | undefined, aspect);
    liveRig.face = s.state;
    headQ = s.head;
    faceOk = true;
  } else {
    liveRig.face = null;
  }

  const lm = pr?.landmarks?.[0] as LM[] | undefined;
  let bodyOk = false;
  if (lm && target && target.type === "human" && target.rest) {
    const q = solveBody(target, lm, aspect, headQ);
    const bones: Record<string, number[]> = {};
    for (const k in q) bones[k] = toArr(q[k]);
    liveRig.bones = bones;
    const hipY = (lm[23].y + lm[24].y) / 2;
    if (liveRig.baseline < 0) liveRig.baseline = hipY;
    liveRig.baseline += (hipY - liveRig.baseline) * 0.02;
    liveRig.py = Math.max(-0.3, Math.min(0.9, (liveRig.baseline - hipY) * 2.5));
    liveRig.lastSeen = performance.now() / 1000;
    bodyOk = true;
  }
  liveRig.active = running && bodyOk;

  if (rec.active && bodyOk) {
    const relT = mode === "video" ? video.currentTime : performance.now() / 1000 - rec.start;
    rec.frames.push({
      t: relT,
      py: liveRig.py,
      bones: liveRig.bones,
      face: liveRig.face ? { ...liveRig.face } : {},
    });
  }

  fpsFrames++;
  const nowMs = performance.now();
  if (nowMs - lastUI > 500) {
    const fps = Math.round((fpsFrames * 1000) / Math.max(1, nowMs - fpsT));
    fpsFrames = 0;
    fpsT = nowMs;
    lastUI = nowMs;
    useMocapUI.setState({
      fps,
      bodyOk,
      faceOk,
      status: bodyOk ? (rec.active ? "Recording take…" : "Tracking body" + (faceOk ? " + face" : "")) : "No person detected — step into view",
    });
  }
}

function loop() {
  if (!running) return;
  if (video && video.readyState >= 2 && video.currentTime !== lastVT) {
    lastVT = video.currentTime;
    processFrame();
  }
  raf = requestAnimationFrame(loop);
}

export async function startWebcam(el: HTMLVideoElement) {
  stopSource();
  await ensureModels();
  stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false });
  video = el;
  el.srcObject = stream;
  el.muted = true;
  await el.play();
  mode = "webcam";
  running = true;
  liveRig.baseline = -1;
  useMocapUI.setState({ source: "webcam", error: null, status: "Webcam live — stand back so your full body is visible", videoName: "" });
  fpsT = performance.now();
  loop();
}

export async function startVideoFile(el: HTMLVideoElement, file: File, ended?: () => void) {
  stopSource();
  await ensureModels();
  el.srcObject = null;
  el.src = URL.createObjectURL(file);
  el.muted = true;
  el.loop = false;
  await el.play().catch(() => undefined);
  video = el;
  mode = "video";
  running = true;
  onEnded = ended ?? null;
  el.onended = () => {
    onEnded?.();
  };
  liveRig.baseline = -1;
  useMocapUI.setState({ source: "video", error: null, status: "Video loaded — tracking while it plays", videoName: file.name });
  fpsT = performance.now();
  loop();
}

export function stopSource() {
  running = false;
  cancelAnimationFrame(raf);
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  if (video) {
    video.pause();
    if (mode === "video") {
      video.onended = null;
    }
    if (video.srcObject) video.srcObject = null;
  }
  video = null;
  onEnded = null;
  liveRig.active = false;
  lastVT = -1;
  useMocapUI.setState({ source: "off", status: "Stopped", bodyOk: false, faceOk: false, fps: 0 });
}

export function isRunning() {
  return running;
}

export function videoTime() {
  return video ? video.currentTime : 0;
}

export function startRecording() {
  rec.frames = [];
  rec.start = performance.now() / 1000;
  rec.active = true;
  useMocapUI.setState({ recording: true });
}

/** Stops the take and returns it (or null if nothing was captured). */
export function stopRecording(name: string): Take | null {
  rec.active = false;
  useMocapUI.setState({ recording: false });
  const frames = rec.frames;
  rec.frames = [];
  if (frames.length < 2) return null;
  const duration = frames[frames.length - 1].t;
  return {
    id: uid(),
    name,
    duration: Math.max(0.1, duration),
    fps: 30,
    source: mode,
    frames,
  };
}

export function isRecording() {
  return rec.active;
}
