import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { useSandbox, PLAYER_CONFIG, type SActor, type SObject } from "./sandboxStore";
import { ASSET_MAP, getProto } from "./assets";
import {
  ensureWalker,
  enterOrExit,
  flushAll,
  grabObject,
  keys,
  nearestGrabbable,
  objectPose,
  poseOf,
  releaseHeld,
  RUN_CYCLE,
  RUN_SPEED,
  sim,
  stepLoose,
  surfaceAt,
  updateSim,
  WALK_CYCLE,
  WALK_SPEED,
  type Landed,
} from "./sim";
import { cam, lookDir, moveVec, type CamMode } from "./camera";
import { locoPose } from "./locomotion";
import { SkyDome, worldById, type WorldDef } from "../three/Worlds";
import { applyFaceToRig, applyXrayMode, blendPose, buildRig } from "../three/rigs";
import { faceForActor } from "./actions";
import { beginTalk, chooseTalk, endTalk, nearestNpc, script, testPerform, tickScripts } from "./scripts";
import { installPointerUp, runtime, setPending } from "../three/runtime";
import { fitAspect } from "../three/SceneView";
import { useStore } from "../store";

/* Sandbox 3D workspace: separate from the film viewport. */

const UP = new THREE.Vector3(0, 1, 0);
const TAU = Math.PI * 2;
const RUN_MID = (WALK_SPEED + RUN_SPEED) / 2;
const CAM_ORDER: CamMode[] = ["orbit", "fly", "third", "first"];

const refs = new Map<string, THREE.Object3D>();
const ghostState = { on: false, x: 0, z: 0, cell: [0, 0, 0] as [number, number, number] };
const cellOf = (p: THREE.Vector3, n: THREE.Vector3): [number, number, number] => {
  const t = p.clone().add(n.clone().multiplyScalar(0.5));
  return [Math.floor(t.x), Math.floor(t.y), Math.floor(t.z)];
};
const keyOf = (c: [number, number, number]) => `${c[0]},${c[1]},${c[2]}`;
const lerp3 = (a: number, b: number, t: number) => a + (b - a) * t;

function placeAsset(x: number, z: number, hintY: number) {
  const st = useSandbox.getState();
  const s = surfaceAt(x, z, hintY, { objs: st.objects, blocks: st.blocks, t: sim.t }, null);
  st.addObject(st.assetId, [x, s.y, z], st.ghostYaw);
}

/** Saves poses of things that moved on their own (landed items, vehicles) back into the store. */
function commitLanded(list: Landed[]) {
  if (!list.length) return;
  const s = useSandbox.getState();
  for (const l of list) s.patchObject(l.id, { position: [l.pose.x, l.pose.y, l.pose.z], rotationY: l.pose.yaw });
}

function playerWalker() {
  const pid = useSandbox.getState().playerId;
  return pid ? sim.walkers.get(pid) : undefined;
}

/** Where the camera should look: the player, or the vehicle they're driving. */
function focusPoint(): { x: number; y: number; z: number; yaw: number } {
  const w = playerWalker();
  if (!w) return { x: 0, y: 0, z: 0, yaw: 0 };
  const L = w.inVehicle ? sim.live.get(w.inVehicle) : undefined;
  return L ? { x: L.x, y: L.y, z: L.z, yaw: L.yaw } : { x: w.x, y: w.y, z: w.z, yaw: w.yaw };
}

function makeInstance(assetId: string, color?: string): THREE.Group {
  const inst = getProto(assetId).proto.clone(true);
  if (color) {
    inst.traverse((c) => {
      if (c instanceof THREE.Mesh) {
        c.material = (c.material as THREE.Material).clone();
        (c.material as THREE.MeshStandardMaterial).color.set(color);
      }
    });
  }
  return inst;
}

function ObjectView({ o, selected, editable }: { o: SObject; selected: boolean; editable: boolean }) {
  const gRef = useRef<THREE.Group>(null!);
  const inst = useMemo(() => makeInstance(o.assetId, o.color), [o.assetId, o.color]);
  const outline = useMemo(() => {
    const { min, max } = getProto(o.assetId);
    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(max.x - min.x + 0.05, max.y - min.y + 0.05, max.z - min.z + 0.05));
    geo.translate((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);
    return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xfacc15 }));
  }, [o.assetId]);
  const gizmo = useSandbox((s) => s.gizmo);
  const shading = useSandbox((s) => s.shading);

  useEffect(() => {
    inst.traverse((c) => {
      if (c instanceof THREE.Mesh && c.material) {
        c.material.wireframe = shading === "wireframe";
      }
    });
  }, [inst, shading]);

  useLayoutEffect(() => {
    refs.set(o.id, gRef.current);
    return () => {
      refs.delete(o.id);
    };
  }, [o.id]);

  return (
    <>
      <group
        ref={gRef}
        onPointerDown={(e) => {
          const st = useSandbox.getState();
          if (st.play || st.tool === "block") return;
          e.stopPropagation();
          const point = e.point.clone();
          setPending(e, (btn) => {
            const s2 = useSandbox.getState();
            if (s2.tool === "asset" && btn === 0) placeAsset(point.x, point.z, point.y + 0.05);
            else if (btn === 0) s2.selectObj(o.id);
          });
        }}
      >
        <primitive object={inst} />
        {selected && <primitive object={outline} />}
      </group>
      {selected && editable && (
        <TransformControls
          object={gRef}
          mode={gizmo}
          makeDefault
          translationSnap={null}
          onMouseDown={() => {
            useSandbox.getState().beginEdit();
            useSandbox.getState().setEditing(o.id);
          }}
          onMouseUp={() => {
            const g = gRef.current;
            if (!g) return;
            const cur = objectPose(o, sim.t);
            const base: [number, number, number] = [
              g.position.x - (cur.x - o.position[0]),
              g.position.y - (cur.y - o.position[1]),
              g.position.z - (cur.z - o.position[2]),
            ];
            useSandbox.getState().patchObject(o.id, { position: base, rotationY: o.rotationY + (g.rotation.y - cur.yaw) });
            useSandbox.getState().setEditing(null);
          }}
        />
      )}
    </>
  );
}

function Ground({ color }: { color: string }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d")!;
    x.clearRect(0, 0, 128, 128);
    x.strokeStyle = "rgba(255,255,255,0.22)";
    x.lineWidth = 3;
    x.strokeRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(400, 400);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <mesh
      rotation-x={-Math.PI / 2}
      receiveShadow
      onPointerMove={(e) => {
        ghostState.on = true;
        ghostState.x = e.point.x;
        ghostState.z = e.point.z;
        ghostState.cell = cellOf(e.point, UP);
      }}
      onPointerOut={() => {
        ghostState.on = false;
      }}
      onPointerDown={(e) => {
        const point = e.point.clone();
        setPending(e, (btn) => {
          const st = useSandbox.getState();
          if (st.play) return;
          if (st.tool === "asset" && btn === 0) placeAsset(point.x, point.z, 0);
          else if (st.tool === "block" && btn === 0) st.placeBlock(keyOf(cellOf(point, UP)), st.blockColor);
          else if (btn === 0) {
            st.selectObj(null);
            st.selectActor(null);
          }
        });
      }}
    >
      <planeGeometry args={[900, 900]} />
      <meshStandardMaterial color={color} map={tex} roughness={0.95} />
    </mesh>
  );
}

const MAX_BLOCKS = 20000;
const cubeGeo = new THREE.BoxGeometry(1, 1, 1);

function BlockLayer() {
  const blocks = useSandbox((s) => s.blocks);
  const ref = useRef<THREE.InstancedMesh>(null!);
  const keysRef = useRef<string[]>([]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.02 }), []);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const entries = Object.entries(blocks).slice(0, MAX_BLOCKS);
    keysRef.current = entries.map((e) => e[0]);
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    entries.forEach(([key, color], i) => {
      const [x, y, z] = key.split(",").map(Number);
      d.position.set(x + 0.5, y + 0.5, z + 0.5);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      m.setColorAt(i, col.set(color));
    });
    m.count = entries.length;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [blocks]);

  return (
    <instancedMesh
      ref={ref}
      args={[cubeGeo, mat, MAX_BLOCKS]}
      castShadow
      receiveShadow
      frustumCulled={false}
      onPointerMove={(e) => {
        const st = useSandbox.getState();
        if (st.tool !== "block" || !e.face) return;
        ghostState.on = true;
        ghostState.cell = cellOf(e.point, e.face.normal);
      }}
      onPointerOut={() => {
        ghostState.on = false;
      }}
      onPointerDown={(e) => {
        const st = useSandbox.getState();
        if (st.play || st.tool !== "block") return;
        e.stopPropagation();
        const id = e.instanceId;
        const key = id !== undefined ? keysRef.current[id] : undefined;
        const point = e.point.clone();
        const normal = e.face ? e.face.normal.clone() : UP.clone();
        setPending(e, (btn) => {
          if (btn === 2) {
            if (key) useSandbox.getState().removeBlock(key);
            return;
          }
          useSandbox.getState().placeBlock(keyOf(cellOf(point, normal)), useSandbox.getState().blockColor);
        });
      }}
    />
  );
}

function Ghost() {
  const obj = useMemo(() => new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0x22d3ee })), []);
  useFrame(() => {
    const st = useSandbox.getState();
    const show = ghostState.on && !st.play && st.tool !== "select";
    obj.visible = show;
    if (!show) return;
    if (st.tool === "block") {
      obj.position.set(ghostState.cell[0] + 0.5, ghostState.cell[1] + 0.5, ghostState.cell[2] + 0.5);
      obj.scale.set(1.02, 1.02, 1.02);
      obj.rotation.set(0, 0, 0);
      return;
    }
    const { min, max } = getProto(st.assetId);
    const s = surfaceAt(ghostState.x, ghostState.z, 0, { objs: st.objects, blocks: st.blocks, t: sim.t }, null);
    obj.position.set(ghostState.x + (min.x + max.x) / 2, s.y + (min.y + max.y) / 2, ghostState.z + (min.z + max.z) / 2);
    obj.scale.set(max.x - min.x, max.y - min.y, max.z - min.z);
    obj.rotation.set(0, st.ghostYaw, 0);
  });
  return <primitive object={obj} />;
}

/** Name tag above every character. The player's tag is cyan and says YOU. */
function NameTag({ name, role, isPlayer, hidden }: { name: string; role: string; isPlayer: boolean; hidden: boolean }) {
  return (
    <Html position={[0, 2.05, 0]} center style={{ pointerEvents: "none" }}>
      <div
        className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-bold shadow ${hidden ? "hidden" : ""} ${isPlayer ? "bg-cyan-400 text-black" : "bg-black/70 text-white"}`}
      >
        {isPlayer ? "YOU" : name}
        {!isPlayer && <span className="ml-1 font-normal opacity-60">{role}</span>}
      </div>
    </Html>
  );
}

/** Speech bubble above an actor while it is speaking. */
function ActorBubble({ id }: { id: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const iv = window.setInterval(() => setText(script.bubbles.get(id)?.text ?? ""), 150);
    return () => window.clearInterval(iv);
  }, [id]);
  return (
    <Html position={[0, 2.55, 0]} center style={{ pointerEvents: "none" }}>
      <div className={`max-w-[260px] rounded-xl bg-white px-3 py-1.5 text-center text-sm font-bold leading-snug text-slate-900 shadow-lg ${text ? "" : "hidden"}`}>{text}</div>
    </Html>
  );
}

/** One character (player or NPC). Position comes from the walker; the pose comes from the locomotion engine. */
function ActorView({ a, selected, editable }: { a: SActor; selected: boolean; editable: boolean }) {
  const key = JSON.stringify(a.config);
  const rig = useMemo(() => buildRig(a.config), [key]);
  const g = useRef<THREE.Group>(null!);
  const isPlayer = useSandbox((s) => s.playerId === a.id);
  const camMode = useSandbox((s) => s.camMode);
  const shading = useSandbox((s) => s.shading);
  const xrayOpacity = useSandbox((s) => s.xrayOpacity);
  const patchActor = useSandbox((s) => s.patchActor);
  const setEditing = useSandbox((s) => s.setEditing);
  useEffect(() => () => rig.dispose(), [rig]);

  useEffect(() => {
    applyXrayMode(rig.root, shading === "xray", xrayOpacity, shading === "wireframe");
  }, [rig, shading, xrayOpacity]);

  useFrame((_, dt) => {
    const grp = g.current;
    const w = sim.walkers.get(a.id);
    if (!grp || !w) return;
    const st = useSandbox.getState();
    grp.visible = !w.inVehicle && !(isPlayer && st.camMode === "first");
    if (st.editingId !== a.id) grp.position.set(w.x, w.y, w.z);
    grp.rotation.y = w.yaw;

    const gs = sim.gait.get(a.id) ?? { g: 0, t: sim.t };
    const gdt = Math.max(0, Math.min(0.1, sim.t - gs.t));
    gs.t = sim.t;
    gs.g += (w.speed * gdt) / (w.speed > RUN_MID ? RUN_CYCLE : WALK_CYCLE);
    sim.gait.set(a.id, gs);

    const perf = script.perf.get(a.id);
    const pose = locoPose({
      speed: w.speed,
      grounded: w.grounded,
      vy: w.vy,
      gait: gs.g,
      t: sim.t,
      held: !!w.held,
      perf: perf ? { stance: perf.stance, gesture: perf.gesture } : null,
      talking: script.talk?.actorId === a.id,
    });
    blendPose(rig, pose.rot, pose.py, dt);
    applyFaceToRig(rig, faceForActor(script.expr.get(a.id) ?? "neutral", script.bubbles.has(a.id), sim.t));
  });

  return (
    <>
      <group
        ref={g}
        name={a.id}
        scale={0.9}
        onPointerDown={(e) => {
          e.stopPropagation();
          const id = a.id;
          setPending(e, (btn) => {
            if (btn === 0) useSandbox.getState().selectActor(id);
          });
        }}
      >
        <primitive object={rig.root} />
        {selected && (
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]} raycast={() => null}>
            <ringGeometry args={[0.55, 0.7, 40]} />
            <meshBasicMaterial color={isPlayer ? "#22d3ee" : "#e87d0d"} transparent opacity={0.9} depthWrite={false} />
          </mesh>
        )}
        <ActorBubble id={a.id} />
        <NameTag name={a.name} role={a.role} isPlayer={isPlayer} hidden={isPlayer && camMode === "first"} />
      </group>
      {selected && editable && (
        <TransformControls
          object={g}
          mode="translate"
          makeDefault
          onMouseDown={() => setEditing(a.id)}
          onMouseUp={() => {
            const grp = g.current;
            if (grp) patchActor(a.id, { startX: grp.position.x, startZ: grp.position.z });
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

/** First-person arms, held item and swing. Attached to the camera, so it moves with your view. */
function FpsHands() {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const root = useMemo(() => new THREE.Group(), []);
  const rig = useMemo(() => {
    const sleeveM = new THREE.MeshStandardMaterial({ color: PLAYER_CONFIG.top, roughness: 0.7 });
    const skinM = new THREE.MeshStandardMaterial({ color: PLAYER_CONFIG.skin, roughness: 0.6 });
    const arm = (side: number) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.26, -0.26, -0.5);
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.34, 12), sleeveM);
      sleeve.rotation.x = Math.PI / 2;
      sleeve.position.set(0, 0, -0.12);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), skinM);
      hand.position.set(0, 0, -0.3);
      pivot.add(sleeve, hand);
      return pivot;
    };
    const R = arm(1);
    const L = arm(-1);
    const heldG = new THREE.Group();
    heldG.position.set(0, -0.22, -0.56);
    root.add(R, L, heldG);
    return { R, L, heldG, heldId: null as string | null };
  }, [root]);

  useEffect(() => {
    scene.add(camera);
    camera.add(root);
    return () => {
      camera.remove(root);
      scene.remove(camera);
    };
  }, [camera, scene, root]);

  useFrame((_, dt) => {
    const st = useSandbox.getState();
    root.visible = st.camMode === "first";
    if (!root.visible) return;
    const pid = st.playerId;
    const w = pid ? sim.walkers.get(pid) : undefined;
    const g = pid ? (sim.gait.get(pid)?.g ?? 0) : 0;
    const speed = w ? w.speed : 0;
    const amp = Math.min(1, speed / WALK_SPEED) * (speed > RUN_MID ? 1.6 : 1);
    cam.sway.multiplyScalar(Math.exp(-dt * 6));
    cam.hold += ((w?.held ? 1 : 0) - cam.hold) * (1 - Math.exp(-dt * 10));
    cam.swing = Math.max(0, cam.swing - dt * 3.2);
    const ph = g * TAU;
    root.position.set(
      cam.sway.x + Math.cos(ph) * 0.012 * amp,
      -Math.abs(Math.cos(ph)) * 0.016 * amp + Math.sin(sim.t * 1.4) * 0.002,
      0,
    );
    root.rotation.z = Math.sin(ph) * 0.02 * amp;
    const h = cam.hold;
    const sw = cam.swing > 0 ? Math.sin(Math.PI * (1 - cam.swing)) : 0;
    const { R, L, heldG } = rig;
    R.position.set(lerp3(0.26, 0.1, h), lerp3(-0.26, -0.24, h), lerp3(-0.5, -0.6, h));
    L.position.set(lerp3(-0.26, -0.1, h), lerp3(-0.26, -0.24, h), lerp3(-0.5, -0.6, h));
    R.rotation.x = 0.9 * h + 1.1 * sw;
    L.rotation.x = 0.9 * h;

    const heldNow = w?.held ?? null;
    if (rig.heldId !== heldNow) {
      rig.heldId = heldNow;
      heldG.clear();
      if (heldNow) {
        const o = st.objects.find((x) => x.id === heldNow);
        if (o) {
          const inst = makeInstance(o.assetId, o.color);
          const box = new THREE.Box3().setFromObject(inst);
          const size = box.getSize(new THREE.Vector3());
          const c = box.getCenter(new THREE.Vector3());
          const k = 0.3 / Math.max(0.05, size.x, size.y, size.z);
          inst.scale.setScalar(k);
          inst.position.copy(c).multiplyScalar(-k);
          heldG.add(inst);
        }
      }
    }
    heldG.visible = !!heldNow;
  });
  return null;
}

/**
 * Places the camera for the active view:
 * orbit (OrbitControls), fly (free WASD flight), third person (behind and right of you), first person (your eyes).
 */
function CameraDirector() {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  const mode = useSandbox((s) => s.camMode);
  const cmd = useSandbox((s) => s.camCmd);
  const prev = useRef<CamMode>(mode);
  const smooth = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const from = prev.current;
    prev.current = mode;
    if (mode === "orbit") {
      if (document.pointerLockElement) document.exitPointerLock();
      if (controls) {
        const f = focusPoint();
        if (from === "third" || from === "first") camera.position.set(f.x - Math.sin(f.yaw) * 7, f.y + 3.5, f.z - Math.cos(f.yaw) * 7);
        controls.target.set(f.x, f.y + 1.2, f.z);
        controls.update();
      }
      return;
    }
    if (mode === "fly") {
      if (from !== "fly") {
        cam.fly.copy(camera.position);
        if (from === "orbit") {
          const d = new THREE.Vector3();
          camera.getWorldDirection(d);
          cam.yaw = Math.atan2(-d.x, -d.z);
          cam.pitch = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1));
        }
      }
      return;
    }
    if (from === "orbit" || from === "fly") {
      const f = focusPoint();
      cam.yaw = f.yaw + Math.PI;
      cam.pitch = 0.18;
      smooth.set(f.x, f.y + 1.45, f.z);
    }
  }, [mode, camera, controls, smooth]);

  useEffect(() => {
    if (!cmd.nonce || !controls || mode !== "orbit") return;
    const f = focusPoint();
    const focus = new THREE.Vector3(f.x, f.y + 1.2, f.z);
    const shots: Record<string, [THREE.Vector3, THREE.Vector3]> = {
      wide: [new THREE.Vector3(0, 16, 30), new THREE.Vector3(0, 0, 0)],
      top: [new THREE.Vector3(0, 60, 0.01), new THREE.Vector3(0, 0, 0)],
      side: [new THREE.Vector3(40, 8, 0), new THREE.Vector3(0, 0, 0)],
      close: [focus.clone().add(new THREE.Vector3(0, 2.2, 5)), focus.clone()],
    };
    const pick = shots[cmd.preset];
    if (!pick) return;
    camera.position.copy(pick[0]);
    controls.target.copy(pick[1]);
    controls.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmd.nonce]);

  useFrame((_, dt) => {
    const m = useSandbox.getState().camMode;
    if (m === "orbit") return;
    if (m === "fly") {
      const look = lookDir(cam.yaw, cam.pitch);
      const right = new THREE.Vector3().crossVectors(look, UP).normalize();
      const v = new THREE.Vector3();
      if (keys.has("w")) v.add(look);
      if (keys.has("s")) v.sub(look);
      if (keys.has("d")) v.add(right);
      if (keys.has("a")) v.sub(right);
      if (keys.has("e") || keys.has("space")) v.y += 1;
      if (keys.has("q") || keys.has("control") || keys.has("c")) v.y -= 1;
      if (v.lengthSq() > 0) cam.fly.addScaledVector(v.normalize(), 7 * (keys.has("shift") ? 3 : 1) * dt);
      camera.position.copy(cam.fly);
      camera.quaternion.setFromEuler(new THREE.Euler(cam.pitch, cam.yaw, 0, "YXZ"));
      return;
    }
    const f = focusPoint();
    if (m === "third") {
      const look = lookDir(cam.yaw, cam.pitch);
      const right = new THREE.Vector3().crossVectors(look, UP).normalize();
      smooth.lerp(new THREE.Vector3(f.x, f.y + 1.45, f.z), 1 - Math.exp(-dt * 16));
      const aim = smooth.clone().addScaledVector(right, 0.55);
      camera.position.copy(aim).addScaledVector(look, -cam.dist);
    } else {
      camera.position.set(f.x, f.y + 1.6, f.z);
    }
    camera.quaternion.setFromEuler(new THREE.Euler(cam.pitch, cam.yaw, 0, "YXZ"));
  });
  return null;
}

/** Mouse look, pointer capture, FPS swing and zoom. Active in every non-orbit view. */
function InputBridge() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    const onDown = (e: MouseEvent) => {
      const st = useSandbox.getState();
      if (st.camMode === "orbit" || st.convo || e.button !== 0) return;
      if (document.pointerLockElement !== canvas) {
        try {
          canvas.requestPointerLock();
        } catch {
          /* pointer lock unavailable */
        }
        return;
      }
      if (st.play) cam.swing = 1;
    };
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      cam.yaw -= e.movementX * 0.0022;
      cam.pitch = Math.max(-1.4, Math.min(1.4, cam.pitch - e.movementY * 0.0022));
      cam.sway.x = Math.max(-0.06, Math.min(0.06, cam.sway.x - e.movementX * 0.0004));
    };
    const onWheel = (e: WheelEvent) => {
      const m = useSandbox.getState().camMode;
      if (m === "third" || m === "first") cam.dist = Math.max(2, Math.min(14, cam.dist + e.deltaY * 0.004));
    };
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    canvas.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [gl]);
  return null;
}

/** Per-frame simulation: player movement, NPC brains, carried items, object mechanics and saving. */
function SimLoop() {
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    sim.t += d;
    const st = useSandbox.getState();
    const pid = st.playerId;
    const ids = new Set(st.actors.map((a) => a.id));
    for (const a of st.actors) ensureWalker(a.id, a.startX, a.startZ, a.startYaw);
    for (const id of Array.from(sim.walkers.keys())) if (!ids.has(id)) sim.walkers.delete(id);

    const live = st.play || st.scriptRunning;
    const inConvo = !!st.convo;
    const pw = pid ? sim.walkers.get(pid) : undefined;
    if (st.play && pid && pw) {
      const driving = (st.camMode === "third" || st.camMode === "first") && !inConvo;
      if (st.camMode === "first" && !pw.inVehicle) pw.yaw = cam.yaw + Math.PI;
      const fw = (keys.has("w") ? 1 : 0) - (keys.has("s") ? 1 : 0);
      const sd = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
      const mv = driving ? moveVec(cam.yaw, fw, sd) : { dx: 0, dz: 0 };
      updateSim(d, st.objects, st.blocks, pid, {
        dx: mv.dx,
        dz: mv.dz,
        run: driving && keys.has("shift"),
        jump: driving && keys.has("space"),
        noTurn: st.camMode === "first",
      });
    }

    tickScripts(d, st.objects, st.blocks);

    if (!live && !script.talk) {
      for (const a of st.actors) {
        if (st.editingId === a.id) continue;
        const w = sim.walkers.get(a.id);
        if (!w || w.inVehicle) continue;
        w.x = a.startX;
        w.z = a.startZ;
        w.yaw = a.startYaw;
        w.y = 0;
        w.vy = 0;
        w.speed = 0;
      }
    }

    commitLanded(stepLoose(d, { objs: st.objects, blocks: st.blocks, t: sim.t }));

    for (const o of st.objects) {
      if (st.editingId === o.id) continue;
      const g = refs.get(o.id);
      if (!g) continue;
      const p = poseOf(o, sim.t);
      g.position.set(p.x, p.y, p.z);
      g.rotation.set(p.pitch ?? 0, p.yaw, p.roll ?? 0, "YXZ");
      if (g.userData.spin || ASSET_MAP[o.assetId]?.mech) {
        const prop = g.getObjectByName("prop");
        if (prop) prop.rotation.z += d * 25;
        const rotor = g.getObjectByName("rotor");
        if (rotor) rotor.rotation.y += d * 14;
      }
    }
  });
  return null;
}

function Env({ world }: { world: WorldDef }) {
  return (
    <>
      <SkyDome top={world.skyTop} bottom={world.skyBottom} />
      <fog attach="fog" args={[world.fog, 90, 600]} />
      <ambientLight intensity={world.ambient} />
      <hemisphereLight args={[world.skyTop, world.ground, world.ambient * 0.6]} />
      <directionalLight
        position={world.sunPos}
        intensity={world.sun}
        color={world.sunColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-far={400}
        shadow-bias={-0.0008}
      />
    </>
  );
}

function SandboxScene() {
  const worldId = useSandbox((s) => s.worldId);
  const world = worldById(worldId);
  const objects = useSandbox((s) => s.objects);
  const selectedId = useSandbox((s) => s.selectedId);
  const actors = useSandbox((s) => s.actors);
  const selectedActorId = useSandbox((s) => s.selectedActorId);
  const play = useSandbox((s) => s.play);
  const camMode = useSandbox((s) => s.camMode);

  useEffect(() => installPointerUp(), []);

  useEffect(() => {
    const ALIAS: Record<string, string> = { arrowup: "w", arrowdown: "s", arrowleft: "a", arrowright: "d" };
    const keyName = (e: KeyboardEvent) => {
      const k = e.key === " " ? "space" : e.key.toLowerCase();
      return ALIAS[k] ?? k;
    };
    const onDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t) {
        if (t.tagName === "TEXTAREA") return;
        if (t.tagName === "INPUT" && ["text", "number", "search"].includes((t as HTMLInputElement).type)) return;
        if (t.tagName === "SELECT" && e.key.startsWith("Arrow")) return;
      }
      const k = keyName(e);
      if (k === "space" || e.key.startsWith("Arrow")) e.preventDefault();
      const st = useSandbox.getState();

      // A conversation takes over the keyboard: numbers pick an option, Esc ends it.
      if (st.convo) {
        if (k === "escape") {
          e.preventDefault();
          endTalk();
          return;
        }
        const n = parseInt(e.key, 10);
        if (!Number.isNaN(n) && n >= 1 && n <= 9 && !st.convo.ended) {
          const opt = st.convo.options[n - 1];
          if (opt) chooseTalk(opt.idx);
        }
        return;
      }

      keys.add(k);
      if (e.repeat) return;
      const mod = e.ctrlKey || e.metaKey;
      const pid = st.playerId;
      const pw = pid ? sim.walkers.get(pid) : undefined;

      if (k === "p") {
        (document.activeElement as HTMLElement | null)?.blur();
        keys.clear();
        st.setPlay(!st.play);
        return;
      }
      if (k === "v" && !mod) {
        const next = CAM_ORDER[(CAM_ORDER.indexOf(st.camMode) + 1) % CAM_ORDER.length];
        st.setCamMode(next);
        return;
      }
      if (k === "escape") {
        if (document.pointerLockElement) document.exitPointerLock();
        st.setTool("select");
        st.selectObj(null);
        st.selectActor(null);
        return;
      }
      if (mod && k === "z") {
        e.preventDefault();
        st.undo();
        return;
      }

      if (st.play && st.camMode !== "fly" && pid && pw) {
        if (k === "e") {
          const near = pw.inVehicle ? null : nearestNpc(pw.x, pw.z, 2.8);
          if (near) beginTalk(near.id);
          else {
            const res = enterOrExit(st.objects, pid);
            if (res) commitLanded([res]);
          }
        }
        if (k === "g") {
          if (pw.held) releaseHeld(pid, false);
          else {
            const o = nearestGrabbable(st.objects, pw.x, pw.z, 2.6);
            if (o) grabObject(pid, o);
          }
        }
        if (k === "t") releaseHeld(pid, true);
        if (k === "f") testPerform(pid, "stand", "dance-groove", 4);
        return;
      }

      if (!st.play && st.camMode === "orbit") {
        if (k === "q") {
          st.setTool("select");
          return;
        }
        if ((k === "w" || k === "g") && !mod) {
          st.setTool("select");
          st.setGizmo("translate");
          return;
        }
        if ((k === "e" || (k === "r" && !e.shiftKey)) && !mod) {
          st.setTool("select");
          st.setGizmo("rotate");
          return;
        }
        if (k === "s" && !mod) {
          st.setTool("select");
          st.setGizmo("scale");
          return;
        }
        if (k === "z" && !mod && !e.altKey) {
          st.setShading(st.shading === "wireframe" ? "material" : "wireframe");
          return;
        }
        if (k === "z" && (e.altKey || mod)) {
          st.setShading(st.shading === "xray" ? "material" : "xray");
          return;
        }
        if (k === "1" || k === "numpad1") {
          st.setSbCam("front");
          return;
        }
        if (k === "3" || k === "numpad3") {
          st.setSbCam("side");
          return;
        }
        if (k === "7" || k === "numpad7") {
          st.setSbCam("top");
          return;
        }
        if (k === "[" || k === "]") {
          const deg = k === "]" ? 15 : -15;
          if (st.selectedId) st.rotateObject(st.selectedId, deg);
          else st.rotateGhost(deg);
          return;
        }
        if (k === "a" && e.shiftKey) {
          st.setDrawer(true);
          return;
        }
        if ((k === "delete" || k === "backspace") && st.selectedId) {
          st.removeObject(st.selectedId);
          return;
        }
        if (mod && k === "d" && st.selectedId) {
          e.preventDefault();
          st.duplicateObject(st.selectedId);
        }
      }
    };
    const onUp = (e: KeyboardEvent) => keys.delete(keyName(e));
    const onBlur = () => keys.clear();
    const onCtx = (e: Event) => e.preventDefault();
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("contextmenu", onCtx);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("contextmenu", onCtx);
      keys.clear();
    };
  }, []);

  // Play start: switch to the gaming camera. Play stop: back to the Blender-style orbit view and reset the world.
  useEffect(() => {
    const st = useSandbox.getState();
    if (play) {
      if (st.camMode === "orbit" || st.camMode === "fly") st.setCamMode("third");
    } else {
      endTalk();
      keys.clear();
      st.setCamMode("orbit");
      commitLanded(flushAll());
    }
  }, [play]);

  return (
    <>
      <color attach="background" args={[world.skyBottom]} />
      <Env world={world} />
      <Ground color={world.ground} />
      {objects.map((o) => (
        <ObjectView key={o.id} o={o} selected={o.id === selectedId} editable={!play} />
      ))}
      <BlockLayer />
      {actors.map((a) => (
        <ActorView key={a.id} a={a} selected={a.id === selectedActorId} editable={!play} />
      ))}
      <Ghost />
      <SimLoop />
      <CameraDirector />
      <FpsHands />
      <InputBridge />
      <OrbitControls
        makeDefault
        enabled={camMode === "orbit"}
        enableDamping
        dampingFactor={0.12}
        target={[0, 1.2, 0]}
        mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.ROTATE, RIGHT: THREE.MOUSE.PAN }}
        maxPolarAngle={Math.PI * 0.49}
        minDistance={2}
        maxDistance={400}
      />
    </>
  );
}

/** Mode switch shown on top of the viewport (Blender-style view menu). */
function ModeBar() {
  const camMode = useSandbox((s) => s.camMode);
  const setCamMode = useSandbox((s) => s.setCamMode);
  const items: { id: CamMode; label: string }[] = [
    { id: "orbit", label: "Orbit" },
    { id: "fly", label: "Fly" },
    { id: "third", label: "Third person" },
    { id: "first", label: "First person" },
  ];
  return (
    <div className="pointer-events-auto absolute left-2 top-2 flex gap-0.5 rounded-md bg-black/60 p-0.5 backdrop-blur">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => setCamMode(it.id)}
          className={`rounded px-2 py-1 text-[11px] font-semibold transition ${camMode === it.id ? "bg-[#e87d0d] text-black" : "text-slate-300 hover:bg-white/10"}`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/** Blender-style shading strip (Wireframe, Solid, Material, Zack D. X-Ray & Cutaway). */
function BlenderShadingStrip({ play, aspect }: { play: boolean; aspect: string }) {
  const shading = useSandbox((s) => s.shading);
  const setShading = useSandbox((s) => s.setShading);
  const xrayOpacity = useSandbox((s) => s.xrayOpacity);
  const setXrayOpacity = useSandbox((s) => s.setXrayOpacity);
  const setSbCam = useSandbox((s) => s.setSbCam);

  return (
    <div className="pointer-events-auto absolute right-2 top-2 flex items-center gap-1.5 rounded-lg bg-black/75 p-1 backdrop-blur border border-white/10 shadow-xl z-20">
      {/* 4 Blender Shading Modes */}
      <div className="flex items-center gap-0.5 rounded-md bg-white/5 p-0.5">
        <button
          onClick={() => setShading("wireframe")}
          title="Wireframe View (Z)"
          className={`flex h-6 w-6 items-center justify-center rounded text-xs transition ${
            shading === "wireframe" ? "bg-amber-400 text-black font-bold shadow" : "text-slate-300 hover:bg-white/10"
          }`}
        >
          🌐
        </button>
        <button
          onClick={() => setShading("solid")}
          title="Solid Clay View"
          className={`flex h-6 w-6 items-center justify-center rounded text-xs transition ${
            shading === "solid" ? "bg-amber-400 text-black font-bold shadow" : "text-slate-300 hover:bg-white/10"
          }`}
        >
          ⚪
        </button>
        <button
          onClick={() => setShading("material")}
          title="Material Preview"
          className={`flex h-6 w-6 items-center justify-center rounded text-xs transition ${
            shading === "material" ? "bg-amber-400 text-black font-bold shadow" : "text-slate-300 hover:bg-white/10"
          }`}
        >
          🎨
        </button>
        <button
          onClick={() => setShading(shading === "xray" ? "material" : "xray")}
          title="Zack D. X-Ray & Cutaway (Alt+Z)"
          className={`flex h-6 px-1.5 items-center gap-1 rounded text-xs transition font-semibold ${
            shading === "xray" ? "bg-cyan-400 text-black shadow animate-pulse" : "text-cyan-200 hover:bg-cyan-500/20"
          }`}
        >
          <span>🩻</span>
          <span className="text-[10px]">X-Ray</span>
        </button>
      </div>

      {/* X-Ray Cutaway Opacity Slider */}
      {shading === "xray" && (
        <div className="flex items-center gap-1.5 px-1 border-l border-white/10">
          <span className="text-[10px] text-cyan-300 font-medium">Cutaway</span>
          <input
            type="range"
            min={0.1}
            max={0.8}
            step={0.05}
            value={xrayOpacity}
            onChange={(e) => setXrayOpacity(parseFloat(e.target.value))}
            className="w-14 h-1 accent-cyan-400 bg-white/20 rounded cursor-pointer"
            title={`Cutaway opacity: ${Math.round(xrayOpacity * 100)}%`}
          />
        </div>
      )}

      {/* Zack D. Macro Glide Camera Preset */}
      <button
        onClick={() => setSbCam("close")}
        title="Zack D. Macro Camera Glide (Extreme Close-Up)"
        className="flex items-center gap-1 rounded bg-gradient-to-r from-red-500/30 to-amber-500/30 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-200 hover:brightness-125"
      >
        <span>🎬</span>
        <span>Macro</span>
      </button>

      <span className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-slate-300">{aspect}</span>
      <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${play ? "bg-emerald-500/90 text-black" : "bg-[#e87d0d]/90 text-black"}`}>
        {play ? "PLAY" : "EDIT"}
      </span>
    </div>
  );
}

/** Live readout while playing: mode, speed and what you are holding. */
function PlayHud() {
  const [info, setInfo] = useState({ mode: "On foot", speed: 0, held: "" });
  useEffect(() => {
    const id = window.setInterval(() => {
      const st = useSandbox.getState();
      const w = st.playerId ? sim.walkers.get(st.playerId) : undefined;
      const L = w?.inVehicle ? sim.live.get(w.inVehicle) : undefined;
      const h = w?.held ? st.objects.find((o) => o.id === w.held) : undefined;
      setInfo({
        mode: L ? `Driving · ${L.kind}` : w && !w.grounded ? "Jumping" : "On foot",
        speed: L ? Math.abs(L.v) : w?.speed ?? 0,
        held: h ? ASSET_MAP[h.assetId]?.name ?? "" : "",
      });
    }, 150);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-black/60 px-2.5 py-1.5 font-mono text-[11px] text-emerald-200">
      {info.mode} · {info.speed.toFixed(1)} m/s{info.held ? ` · holding ${info.held}` : ""}
    </div>
  );
}

/** Shows a Talk button when you are close to an NPC. */
function TalkPrompt() {
  const [near, setNear] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    const iv = window.setInterval(() => {
      const st = useSandbox.getState();
      const pw = st.playerId ? sim.walkers.get(st.playerId) : undefined;
      if (!st.play || st.convo || !pw || pw.inVehicle || st.camMode === "fly") {
        setNear(null);
        return;
      }
      const a = nearestNpc(pw.x, pw.z, 2.8);
      setNear(a ? { id: a.id, name: a.name } : null);
    }, 150);
    return () => window.clearInterval(iv);
  }, []);
  if (!near) return null;
  return (
    <button
      onClick={() => beginTalk(near.id)}
      className="pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-cyan-400 px-4 py-1.5 text-xs font-bold text-black shadow-lg hover:bg-cyan-300"
    >
      💬 Talk to {near.name} <span className="opacity-60">[E]</span>
    </button>
  );
}

/** Conversation panel: the NPC's line and the options you can pick (1–9 keys or click). */
function ConversationPanel() {
  const convo = useSandbox((s) => s.convo);
  const actor = useSandbox((s) => (s.convo ? s.actors.find((a) => a.id === s.convo?.actorId) : undefined));
  const id = convo?.actorId ?? null;
  useEffect(() => {
    if (id && document.pointerLockElement) document.exitPointerLock();
  }, [id]);
  if (!convo || !actor) return null;
  return (
    <div className="pointer-events-auto absolute bottom-3 left-1/2 w-[min(680px,94%)] -translate-x-1/2 rounded-xl border border-white/10 bg-[#101216]/95 p-3 shadow-2xl backdrop-blur">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-8 w-8 rounded-full" style={{ background: `linear-gradient(135deg, ${actor.config.top}, ${actor.config.skin})` }} />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-white">{actor.name}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400">{actor.role}</div>
        </div>
        <button onClick={() => endTalk()} className="rounded bg-white/10 px-2 py-1 text-[10px] text-slate-200 hover:bg-white/20">
          End (Esc)
        </button>
      </div>
      <p className="mb-3 min-h-[2.5rem] text-sm leading-snug text-slate-100">“{convo.text}”</p>
      {!convo.ended && (
        <div className="grid grid-cols-2 gap-1.5">
          {convo.options.map((o, i) => (
            <button
              key={o.idx}
              onClick={() => chooseTalk(o.idx)}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-left text-[11px] text-slate-100 hover:border-cyan-400/60 hover:bg-cyan-500/10"
            >
              <span className="mr-1 text-cyan-300">{i + 1}.</span>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SandboxView() {
  const aspect = useStore((s) => s.aspect);
  const play = useSandbox((s) => s.play);
  const camMode = useSandbox((s) => s.camMode);
  const convo = useSandbox((s) => !!s.convo);
  const wrapRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef({ w: 0, h: 0 });
  const [, setTick] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      boxRef.current = { w: r.width, h: r.height };
      setTick((x) => x + 1);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ratio = aspect === "16:9" ? 16 / 9 : aspect === "9:16" ? 9 / 16 : 1;
  const { w, h } = fitAspect(boxRef.current.w - 24, boxRef.current.h - 24, ratio);
  const showCross = play && (camMode === "third" || camMode === "first") && !convo;

  return (
    <div ref={wrapRef} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#121417]">
      <div className="relative overflow-hidden shadow-2xl ring-1 ring-black/60" style={{ width: w || "100%", height: h || "100%" }}>
        {w > 0 && (
          <Canvas
            shadows
            dpr={[1, 2]}
            gl={{ preserveDrawingBuffer: true, antialias: true }}
            camera={{ position: [0, 4, 14], fov: camMode === "first" ? 70 : 55, near: 0.05, far: 1500 }}
            onCreated={({ gl }) => {
              runtime.canvas = gl.domElement;
            }}
          >
            <SandboxScene />
          </Canvas>
        )}
        <ModeBar />
        <BlenderShadingStrip play={play} aspect={aspect} />
        {showCross && <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 ring-2 ring-black/40" />}
        {play && <PlayHud />}
        <TalkPrompt />
        <ConversationPanel />
      </div>
    </div>
  );
}
