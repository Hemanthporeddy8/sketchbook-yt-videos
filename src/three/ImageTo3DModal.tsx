import { useState, useRef, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { X, Upload, Sparkles, Box, Layers, Grid3X3, RotateCw, Check } from "lucide-react";
import { convertImageTo3D, type ImageTo3DMode } from "./imageTo3D";
import { useStore } from "../store";

interface ImageTo3DModalProps {
  onClose: () => void;
}

interface SamplePreset {
  id: string;
  name: string;
  emoji: string;
  generateSvg: () => string;
}

// Built-in vector presets that work 100% offline
const PRESETS: SamplePreset[] = [
  {
    id: "sword",
    name: "Hero Sword",
    emoji: "⚔️",
    generateSvg: () => `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <defs><linearGradient id="blade" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23f8fafc"/><stop offset="100%" stop-color="%2394a3b8"/></linearGradient></defs>
      <path d="M 100 20 L 115 110 L 100 120 L 85 110 Z" fill="url(%23blade)" stroke="%23334155" stroke-width="4"/>
      <rect x="65" y="120" width="70" height="14" rx="4" fill="%23f59e0b" stroke="%23b45309" stroke-width="3"/>
      <rect x="94" y="134" width="12" height="34" rx="3" fill="%2378350f"/>
      <circle cx="100" cy="174" r="10" fill="%23f59e0b" stroke="%23b45309" stroke-width="3"/>
    </svg>`,
  },
  {
    id: "shield",
    name: "Royal Shield",
    emoji: "🛡️",
    generateSvg: () => `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <defs><linearGradient id="shieldGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="%230284c7"/><stop offset="100%" stop-color="%230369a1"/></linearGradient></defs>
      <path d="M 50 40 Q 100 30 150 40 Q 150 110 100 165 Q 50 110 50 40 Z" fill="url(%23shieldGrad)" stroke="%23f59e0b" stroke-width="8"/>
      <path d="M 100 55 L 100 145 M 65 95 L 135 95" stroke="%23fbbf24" stroke-width="8" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: "star",
    name: "Magic Star",
    emoji: "⭐",
    generateSvg: () => `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <defs><linearGradient id="starGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23fde047"/><stop offset="100%" stop-color="%23eab308"/></linearGradient></defs>
      <polygon points="100,20 125,75 185,80 140,120 155,180 100,150 45,180 60,120 15,80 75,75" fill="url(%23starGrad)" stroke="%23ca8a04" stroke-width="6" stroke-linejoin="round"/>
    </svg>`,
  },
  {
    id: "potion",
    name: "Health Potion",
    emoji: "🧪",
    generateSvg: () => `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <defs><linearGradient id="liquid" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="%23f43f5e"/><stop offset="100%" stop-color="%23be123c"/></linearGradient></defs>
      <rect x="88" y="24" width="24" height="18" rx="3" fill="%23a16207"/>
      <path d="M 86 42 L 114 42 L 114 62 L 150 140 Q 150 175 100 175 Q 50 175 50 140 L 86 62 Z" fill="rgba(255,255,255,0.4)" stroke="%2338bdf8" stroke-width="5"/>
      <path d="M 64 125 L 136 125 Q 146 145 130 162 Q 100 172 70 162 Q 54 145 64 125 Z" fill="url(%23liquid)"/>
    </svg>`,
  },
  {
    id: "crown",
    name: "Gold Crown",
    emoji: "👑",
    generateSvg: () => `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <defs><linearGradient id="crownGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23fbbf24"/><stop offset="100%" stop-color="%23d97706"/></linearGradient></defs>
      <path d="M 40 145 L 35 65 L 75 95 L 100 45 L 125 95 L 165 65 L 160 145 Z" fill="url(%23crownGrad)" stroke="%23b45309" stroke-width="6" stroke-linejoin="round"/>
      <rect x="35" y="145" width="130" height="18" rx="4" fill="%23b45309"/>
      <circle cx="100" cy="154" r="5" fill="%23dc2626"/>
      <circle cx="65" cy="154" r="4" fill="%230284c7"/>
      <circle cx="135" cy="154" r="4" fill="%2316a34a"/>
    </svg>`,
  },
];

function PreviewModel({ mesh }: { mesh: THREE.Mesh | THREE.Group | null }) {
  if (!mesh) return null;
  return <primitive object={mesh} />;
}

export function ImageTo3DModal({ onClose }: ImageTo3DModalProps) {
  const addCustom3DModel = useStore((s) => s.addCustom3DModel);
  const [imgSrc, setImgSrc] = useState<string>(PRESETS[0].generateSvg());
  const [modelName, setModelName] = useState<string>("Hero Sword");
  const [mode, setMode] = useState<ImageTo3DMode>("extrude");
  const [depth, setDepth] = useState<number>(0.28);
  const [bevel, setBevel] = useState<number>(0.025);
  const [resolution, setResolution] = useState<number>(64);
  const [baseColor, setBaseColor] = useState<string>("#334155");

  const [previewMesh, setPreviewMesh] = useState<THREE.Mesh | THREE.Group | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate 3D Preview when parameters change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    convertImageTo3D(imgSrc, { mode, depth, bevel, resolution, baseColor })
      .then(({ mesh }) => {
        if (!cancelled) {
          setPreviewMesh(mesh);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Preview generation error:", err);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [imgSrc, mode, depth, bevel, resolution, baseColor]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setModelName(file.name.replace(/\.[^/.]+$/, ""));
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImgSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveToScene = () => {
    addCustom3DModel({
      name: modelName || "Custom 3D Model",
      imageData: imgSrc,
      customMode: mode,
      depth,
      bevel,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative flex h-[90vh] w-[95vw] max-w-5xl flex-col rounded-2xl border border-white/10 bg-[#12151c] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-[#161a24] px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 text-black">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-white">Image to 3D Model Converter</span>
              <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                100% Offline &amp; Free Lifetime
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex min-h-0 flex-1">
          {/* Left Column: Image Input & 3D Conversion Controls */}
          <div className="flex w-[340px] shrink-0 flex-col border-r border-white/10 bg-[#141720] overflow-y-auto p-4 space-y-4">
            {/* Model Name */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Model Name</label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
              />
            </div>

            {/* Upload or Drop */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Source 2D Image</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/15 bg-black/20 p-4 transition hover:border-cyan-500/60 hover:bg-cyan-500/5"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <img src={imgSrc} alt="Preview" className="h-20 w-20 object-contain rounded-lg drop-shadow mb-2" />
                <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload Image (PNG, JPG, SVG)</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5">Transparent PNGs produce the cleanest 3D edges</span>
              </div>
            </div>

            {/* Offline Starter Templates */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Or Pick Preset Image</label>
              <div className="grid grid-cols-5 gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setModelName(p.name);
                      setImgSrc(p.generateSvg());
                    }}
                    className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-black/30 p-2 hover:bg-white/10 transition"
                    title={p.name}
                  >
                    <span className="text-xl">{p.emoji}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3D Conversion Modes */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">3D Mode</label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: "extrude", label: "3D Extrude", icon: Box, desc: "Solid with Bevels" },
                  { id: "relief", label: "3D Relief", icon: Layers, desc: "Depth Heightmap" },
                  { id: "voxel", label: "3D Voxel", icon: Grid3X3, desc: "Pixel Block Art" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id as ImageTo3DMode)}
                    className={`flex flex-col items-center rounded-lg border p-2 transition text-center ${
                      mode === m.id
                        ? "border-cyan-500 bg-cyan-500/20 text-white font-semibold"
                        : "border-white/5 bg-black/30 text-slate-400 hover:text-white"
                    }`}
                  >
                    <m.icon className="h-4 w-4 mb-1" />
                    <span className="text-[11px] font-bold">{m.label}</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3 pt-1 border-t border-white/10">
              <div>
                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                  <span>3D Depth / Thickness</span>
                  <span className="font-mono text-cyan-300">{depth.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={0.9}
                  step={0.02}
                  value={depth}
                  onChange={(e) => setDepth(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-white/10 rounded cursor-pointer"
                />
              </div>

              {mode === "extrude" && (
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                    <span>Edge Bevel Size</span>
                    <span className="font-mono text-cyan-300">{bevel.toFixed(3)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.0}
                    max={0.08}
                    step={0.005}
                    value={bevel}
                    onChange={(e) => setBevel(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-white/10 rounded cursor-pointer"
                  />
                </div>
              )}

              {mode === "relief" && (
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                    <span>Heightmap Resolution</span>
                    <span className="font-mono text-cyan-300">{resolution}px</span>
                  </div>
                  <input
                    type="range"
                    min={32}
                    max={128}
                    step={16}
                    value={resolution}
                    onChange={(e) => setResolution(parseInt(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-white/10 rounded cursor-pointer"
                  />
                </div>
              )}

              {mode === "voxel" && (
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                    <span>Voxel Grid Resolution</span>
                    <span className="font-mono text-cyan-300">{Math.round(resolution * 0.4)}</span>
                  </div>
                  <input
                    type="range"
                    min={32}
                    max={100}
                    step={8}
                    value={resolution}
                    onChange={(e) => setResolution(parseInt(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-white/10 rounded cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Add to Scene Button */}
            <div className="mt-auto pt-2">
              <button
                onClick={handleSaveToScene}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 py-3 text-xs font-bold text-black shadow-xl hover:brightness-110 active:scale-95 transition"
              >
                <Sparkles className="h-4 w-4" />
                Add 3D Model to Scene
              </button>
            </div>
          </div>

          {/* Right Column: Live Interactive 3D Orbit Viewport */}
          <div className="relative flex min-h-0 flex-1 flex-col bg-[#080a0f]">
            <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-lg bg-black/60 px-3 py-1.5 backdrop-blur border border-white/10 text-xs text-slate-300">
              <RotateCw className="h-3.5 w-3.5 text-cyan-400 animate-spin-slow" />
              <span>Left-click &amp; drag to inspect in 3D · Scroll to zoom</span>
            </div>

            {loading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <span className="rounded-lg bg-black/80 px-4 py-2 text-xs font-semibold text-cyan-300 border border-cyan-500/30">
                  Converting 2D Image to 3D Mesh...
                </span>
              </div>
            )}

            <Canvas
              shadows
              camera={{ position: [0, 0.4, 2.4], fov: 45 }}
              gl={{ antialias: true }}
            >
              <color attach="background" args={["#0c0f17"]} />
              <ambientLight intensity={0.8} />
              <directionalLight position={[4, 6, 5]} intensity={1.5} castShadow />
              <directionalLight position={[-4, 3, -3]} intensity={0.6} color="#60a5fa" />
              <pointLight position={[0, -2, 2]} intensity={0.4} color="#f472b6" />

              {/* Floor grid */}
              <gridHelper args={[6, 12, "#334155", "#1e293b"]} position={[0, -0.85, 0]} />

              <PreviewModel mesh={previewMesh} />
              <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
            </Canvas>
          </div>
        </div>
      </div>
    </div>
  );
}
