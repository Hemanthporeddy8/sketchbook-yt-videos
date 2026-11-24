import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useStore, sceneEnd } from "../store";
import { usePlayback } from "../playback";
import { worldById, WorldEnvironment, type WorldDef } from "./Worlds";
import { CharacterModel } from "./CharacterModel";
import { installPointerUp, runtime } from "./runtime";
import { FootageScreen } from "./FootageScreen";
import { CaptionLayer } from "./CaptionLayer";

/** Applies camera presets (Wide, Close, Low, Top, Side, Follow). */
function CameraRig() {
  const cmd = useStore((s) => s.camCmd);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  useEffect(() => {
    if (!cmd.nonce) return;
    const st = useStore.getState();
    let pos: [number, number, number] = [0, 2.6, 9.5];
    let target: [number, number, number] = [0, 1, 0];
    switch (cmd.preset) {
      case "close":
        pos = [0, 1.7, 3.2];
        target = [0, 1.25, 0];
        break;
      case "low":
        pos = [0, 0.5, 4.5];
        target = [0, 1.1, 0];
        break;
      case "top":
        pos = [0, 11, 0.01];
        target = [0, 0, 0];
        break;
      case "side":
        pos = [7, 1.8, 0];
        target = [0, 1, 0];
        break;
      case "follow": {
        const c = st.characters.find((x) => x.id === st.selectedCharId);
        if (c) {
          pos = [c.position[0], 1.6, c.position[2] + 3.6];
          target = [c.position[0], 1.1, c.position[2]];
        }
        break;
      }
      default:
        break;
    }
    camera.position.set(...pos);
    if (controls) {
      controls.target.set(...target);
      controls.update();
    } else {
      camera.lookAt(...target);
    }
  }, [cmd.nonce, camera, controls, cmd.preset]);
  return null;
}

/** Advances the timeline clock while playing. */
function PlaybackDriver() {
  useFrame((_, dt) => {
    const p = usePlayback.getState();
    if (!p.playing) return;
    const st = useStore.getState();
    const end = sceneEnd(st.clips, st.captions) + (p.rec === "recording" ? 0.6 : 0);
    let t = p.time + Math.min(dt, 0.1);
    if (t >= end) {
      if (p.loop && p.rec !== "recording") {
        t = 0;
      } else {
        t = end;
        usePlayback.setState({ playing: false, time: t });
        return;
      }
    }
    usePlayback.setState({ time: t });
  });
  return null;
}

function Lights({ world }: { world: WorldDef }) {
  return (
    <>
      <ambientLight intensity={world.ambient} />
      <hemisphereLight args={[world.skyTop, world.ground, world.ambient * 0.6]} />
      <directionalLight
        position={world.sunPos}
        intensity={world.sun}
        color={world.sunColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-far={400}
        shadow-bias={-0.0008}
      />
    </>
  );
}

function Scene() {
  const world = worldById(useStore((s) => s.worldId));
  const characters = useStore((s) => s.characters);
  const selectedCharId = useStore((s) => s.selectedCharId);

  useEffect(() => installPointerUp(), []);

  return (
    <>
      <color attach="background" args={[world.skyBottom]} />
      <WorldEnvironment key={world.id} world={world} />
      <Lights world={world} />
      {characters.map((ch) => (
        <CharacterModel key={ch.id} ch={ch} selected={ch.id === selectedCharId} editable />
      ))}
      <FootageScreen />
      <CaptionLayer />
      <CameraRig />
      <PlaybackDriver />
      <OrbitControls makeDefault enableDamping dampingFactor={0.12} target={[0, 1, 0]} maxPolarAngle={Math.PI * 0.495} minDistance={1} maxDistance={500} />
    </>
  );
}

export function fitAspect(boxW: number, boxH: number, ratio: number) {
  if (boxW <= 0 || boxH <= 0) return { w: 0, h: 0 };
  if (boxW / boxH > ratio) return { w: boxH * ratio, h: boxH };
  return { w: boxW, h: boxW / ratio };
}

export function SceneView() {
  const aspect = useStore((s) => s.aspect);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setBox({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ratio = aspect === "16:9" ? 16 / 9 : aspect === "9:16" ? 9 / 16 : 1;
  const { w, h } = fitAspect(box.w - 24, box.h - 24, ratio);

  return (
    <div ref={wrapRef} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#06070b]">
      <div className="relative overflow-hidden rounded-md shadow-2xl ring-1 ring-white/10" style={{ width: w || "100%", height: h || "100%" }}>
        {w > 0 && (
          <Canvas
            shadows
            dpr={[1, 2]}
            gl={{ preserveDrawingBuffer: true, antialias: true }}
            camera={{ position: [0, 2.6, 9.5], fov: 40, near: 0.1, far: 1500 }}
            onCreated={({ gl }) => {
              runtime.canvas = gl.domElement;
            }}
          >
            <Scene />
          </Canvas>
        )}
        <div className="pointer-events-none absolute left-2 top-2 flex gap-1.5">
          <span className="rounded bg-black/60 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-200">{aspect}</span>
          <span className="rounded bg-cyan-500/80 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-black">FILM</span>
        </div>
      </div>
    </div>
  );
}
