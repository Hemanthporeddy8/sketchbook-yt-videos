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
import { speakBrowser, stopSpeaking } from "../twod/speech2d";

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

const spoken3DClips = new Set<string>();

/** Advances the timeline clock while playing. */
function PlaybackDriver() {
  useFrame((_, dt) => {
    const p = usePlayback.getState();
    if (!p.playing) {
      if (spoken3DClips.size > 0) {
        stopSpeaking();
        spoken3DClips.clear();
      }
      return;
    }
    const st = useStore.getState();
    const end = sceneEnd(st.clips, st.captions) + (p.rec === "recording" ? 0.6 : 0);
    let t = p.time + Math.min(dt, 0.1);
    if (t >= end) {
      stopSpeaking();
      spoken3DClips.clear();
      if (p.loop && p.rec !== "recording") {
        t = 0;
      } else {
        t = end;
        usePlayback.setState({ playing: false, time: t });
        return;
      }
    }

    // Live 3D speech synthesis for speech bubbles
    for (const c of st.clips) {
      if (c.say && c.say.trim() && t >= c.start && t < c.start + c.duration) {
        if (!spoken3DClips.has(c.id)) {
          spoken3DClips.add(c.id);
          const ch = st.characters.find((char) => char.id === c.characterId);
          speakBrowser(c.say, {
            preset: ch?.voicePreset,
            pitch: ch?.voicePitch,
            rate: ch?.voiceRate,
            voiceURI: ch?.voiceURI,
            expression: c.expression,
          });
        }
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

function FilmShadingStrip() {
  const shading = useStore((s) => s.shading);
  const setShading = useStore((s) => s.setShading);
  const xrayOpacity = useStore((s) => s.xrayOpacity);
  const setXrayOpacity = useStore((s) => s.setXrayOpacity);
  const setCamPreset = useStore((s) => s.setCamPreset);

  return (
    <div className="pointer-events-auto absolute right-2 top-2 flex items-center gap-1.5 rounded-lg bg-black/75 p-1 backdrop-blur border border-white/10 shadow-xl z-20">
      <div className="flex items-center gap-0.5 rounded-md bg-white/5 p-0.5">
        <button
          onClick={() => setShading("wireframe")}
          title="Wireframe View"
          className={`flex h-6 w-6 items-center justify-center rounded text-xs transition ${
            shading === "wireframe" ? "bg-amber-400 text-black font-bold shadow" : "text-slate-300 hover:bg-white/10"
          }`}
        >
          🌐
        </button>
        <button
          onClick={() => setShading("solid")}
          title="Solid View"
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
          title="Zack D. X-Ray & Cutaway"
          className={`flex h-6 px-1.5 items-center gap-1 rounded text-xs transition font-semibold ${
            shading === "xray" ? "bg-cyan-400 text-black shadow animate-pulse" : "text-cyan-200 hover:bg-cyan-500/20"
          }`}
        >
          <span>🩻</span>
          <span className="text-[10px]">X-Ray</span>
        </button>
      </div>

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

      <button
        onClick={() => setCamPreset("close")}
        title="Zack D. Macro Camera Glide (Extreme Close-Up)"
        className="flex items-center gap-1 rounded bg-gradient-to-r from-red-500/30 to-amber-500/30 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-200 hover:brightness-125"
      >
        <span>🎬</span>
        <span>Macro Glide</span>
      </button>
    </div>
  );
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
        <FilmShadingStrip />
      </div>
    </div>
  );
}
