import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { useStore } from "../store";
import { usePlayback } from "../playback";
import type { Clip, SceneCharacter, Take } from "../lib/types";
import {
  blendPose,
  applyFace,
  applyFaceToRig,
  applyQuatPose,
  applyXrayMode,
  buildRig,
  EXPRESSIONS,
  NEUTRAL_FACE,
  resetRig,
  rigRegistry,
  type FaceState,
  type RigInstance,
} from "./rigs";
import { ACTION_MAP, evalMotion, IDLE_ACTION, type PoseParams } from "../lib/motions";
import { liveRig } from "../mocap/engine";
import { setPending } from "./runtime";
import { isSpeaking } from "../twod/speech2d";

const IDLE_PARAMS: PoseParams = { style: "normal", intensity: 1, speed: 1, mirror: false, variant: 0 };
const tmpA = new THREE.Quaternion();
const tmpB = new THREE.Quaternion();

/** Auto blink: a quick blink roughly every 3.4 seconds. */
function autoBlink(sec: number) {
  const phase = (sec % 3.4) / 0.14;
  return phase < 1 ? Math.sin(phase * Math.PI) : 0;
}

function faceFor(expression: string | undefined, talk: boolean | undefined, sec: number): FaceState {
  const base: FaceState = { ...NEUTRAL_FACE, ...(EXPRESSIONS[expression ?? "neutral"] ?? {}) };
  const b = autoBlink(sec);
  base.blinkL = Math.max(base.blinkL, b);
  base.blinkR = Math.max(base.blinkR, b);
  const isTalking = talk || isSpeaking();
  if (isTalking) base.jaw = Math.max(base.jaw, (0.5 + 0.5 * Math.sin(sec * 18)) * 0.6);
  return base;
}

function activeClip(clips: Clip[], t: number): Clip | null {
  let best: Clip | null = null;
  for (const c of clips) {
    if (t >= c.start && t < c.start + c.duration) {
      if (!best || c.start >= best.start) best = c;
    }
  }
  return best;
}

/** Interpolates a recorded mocap take into the rig (slerp between neighbouring frames). */
function applyTake(rig: RigInstance, take: Take, t: number) {
  const fr = take.frames;
  if (!fr.length) return;
  let lo = 0;
  let hi = fr.length - 1;
  if (t <= fr[0].t) {
    lo = hi = 0;
  } else if (t >= fr[hi].t) {
    lo = hi;
  } else {
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (fr[mid].t <= t) lo = mid;
      else hi = mid;
    }
  }
  const a = fr[lo];
  const b = fr[hi];
  const f = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0;

  resetRig(rig);
  for (const k in a.bones) {
    const bone = rig.bones[k];
    if (!bone) continue;
    const qa = a.bones[k];
    const qb = b.bones[k] ?? qa;
    tmpA.set(qa[0], qa[1], qa[2], qa[3]);
    tmpB.set(qb[0], qb[1], qb[2], qb[3]);
    bone.quaternion.copy(tmpA).slerp(tmpB, f);
  }
  const rb = rig.bones[rig.rootBone];
  if (rb) rb.position.y = rig.restY[rig.rootBone] + a.py + (b.py - a.py) * f;

  if (Object.keys(a.face).length) {
    const fs: FaceState = { ...NEUTRAL_FACE };
    for (const k of Object.keys(NEUTRAL_FACE) as (keyof FaceState)[]) {
      const va = a.face[k] ?? 0;
      const vb = b.face[k] ?? va;
      fs[k] = va * (1 - f) + vb * f;
    }
    applyFace(rig.face, fs);
  }
}

export function CharacterModel({ ch, selected, editable }: { ch: SceneCharacter; selected: boolean; editable: boolean }) {
  const cfgKey = JSON.stringify(ch.config);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rig = useMemo(() => buildRig(ch.config), [cfgKey]);
  const group = useRef<THREE.Group>(null!);

  useEffect(() => {
    rigRegistry.set(ch.id, rig);
    return () => {
      rigRegistry.delete(ch.id);
      rig.dispose();
    };
  }, [rig, ch.id]);

  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#22d3ee", transparent: true, opacity: 0.85, depthWrite: false }), []);
  const shading = useStore((s) => s.shading);
  const xrayOpacity = useStore((s) => s.xrayOpacity);

  useEffect(() => {
    applyXrayMode(rig.root, shading === "xray", xrayOpacity, shading === "wireframe");
  }, [rig, shading, xrayOpacity]);

  useFrame((state, delta) => {
    const t = usePlayback.getState().time;
    const sec = state.clock.elapsedTime;
    const nowSec = performance.now() / 1000;

    // 1) Live mocap drives the targeted human character
    if (rig.type === "human" && liveRig.active && liveRig.targetId === ch.id && nowSec - liveRig.lastSeen < 0.6) {
      applyQuatPose(rig, liveRig.bones, liveRig.py);
      applyFaceToRig(rig, liveRig.face ?? faceFor("neutral", false, sec));
      return;
    }

    const st = useStore.getState();
    const clips = st.clips.filter((c) => c.characterId === ch.id);
    const clip = activeClip(clips, t);

    // 2) Timeline clip
    if (clip) {
      if (clip.kind === "take" && clip.takeId) {
        const take = st.takes.find((x) => x.id === clip.takeId);
        if (take) {
          applyTake(rig, take, t - clip.start);
          applyFaceToRig(rig, faceFor(clip.expression, clip.talk, sec));
          return;
        }
      }
      if (clip.kind === "action" && clip.actionId) {
        const action = ACTION_MAP[clip.actionId];
        if (action && action.rig === rig.type) {
          const pose = evalMotion(action, t - clip.start, {
            style: clip.style ?? "normal",
            intensity: clip.intensity ?? 1,
            speed: clip.speed ?? 1,
            mirror: !!clip.mirror,
            variant: clip.variant ?? 0,
          });
          blendPose(rig, pose.rot, pose.py, delta, pose.sq);
          applyFaceToRig(rig, rig.type === "human" ? faceFor(clip.expression, clip.talk, sec) : faceFor("neutral", clip.talk, sec));
          return;
        }
      }
    }

    // 3) Idle loop
    const idle = ACTION_MAP[IDLE_ACTION[rig.type]];
    const pose = evalMotion(idle, sec, IDLE_PARAMS);
    blendPose(rig, pose.rot, pose.py, delta, pose.sq);
    applyFaceToRig(rig, faceFor("neutral", false, sec));
  });

  const recording = usePlayback((s) => s.rec === "recording");
  const setSelected = useStore((s) => s.selectChar);
  const patchCharacter = useStore((s) => s.patchCharacter);
  const gizmo = useStore((s) => s.gizmo);

  return (
    <>
      <group
        ref={group}
        position={ch.position}
        rotation={[0, ch.rotationY, 0]}
        scale={ch.config.height}
        onPointerDown={(e) => {
          e.stopPropagation();
          setPending(e, () => setSelected(ch.id));
        }}
      >
        <primitive object={rig.root} />
        {selected && !recording && (
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]} material={ringMat}>
            <ringGeometry args={[0.42, 0.52, 40]} />
          </mesh>
        )}
      </group>
      {selected && editable && (
        <TransformControls
          object={group}
          mode={gizmo}
          makeDefault
          onMouseUp={() => {
            const g = group.current;
            if (!g) return;
            if (gizmo === "translate") {
              patchCharacter(ch.id, { position: [g.position.x, g.position.y, g.position.z] });
            } else if (gizmo === "rotate") {
              patchCharacter(ch.id, { rotationY: g.rotation.y });
            } else if (gizmo === "scale") {
              patchCharacter(ch.id, {
                config: { ...ch.config, height: Math.max(0.4, Math.min(3.0, g.scale.y)) },
              });
            }
          }}
        />
      )}
    </>
  );
}
