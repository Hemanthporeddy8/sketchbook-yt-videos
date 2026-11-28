import { useState, useRef, useEffect } from "react";
import { uid } from "../lib/util";
import { X, Sparkles, RotateCcw, Play, Pause, Trash2, Check, Pencil, Eraser } from "lucide-react";
import type { Actor2D, CreatureData, CreatureTag } from "./types2d";
import { useStudio2d } from "./store2d";

interface CreatureStudioProps {
  onClose: () => void;
}

type TagType = "face" | "trunk" | "leg" | "tail" | "ear";

interface StarterTemplate {
  id: string;
  name: string;
  emoji: string;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  tags: Omit<CreatureTag, "id">[];
}

const TEMPLATES: StarterTemplate[] = [
  {
    id: "elephant",
    name: "Elephant",
    emoji: "🐘",
    draw: (ctx, w, h) => {
      ctx.fillStyle = "#64748b";
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";

      // Body (large rounded torso)
      ctx.beginPath();
      ctx.ellipse(w * 0.48, h * 0.52, w * 0.28, h * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Head
      ctx.beginPath();
      ctx.ellipse(w * 0.72, h * 0.42, w * 0.14, h * 0.16, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Big Floppy Ear
      ctx.beginPath();
      ctx.ellipse(w * 0.64, h * 0.44, w * 0.11, h * 0.17, -0.2, 0, Math.PI * 2);
      ctx.fillStyle = "#94a3b8";
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#64748b";

      // Curved Trunk
      ctx.beginPath();
      ctx.moveTo(w * 0.78, h * 0.48);
      ctx.bezierCurveTo(w * 0.88, h * 0.52, w * 0.94, h * 0.65, w * 0.88, h * 0.75);
      ctx.bezierCurveTo(w * 0.84, h * 0.78, w * 0.80, h * 0.76, w * 0.82, h * 0.68);
      ctx.bezierCurveTo(w * 0.85, h * 0.60, w * 0.80, h * 0.54, w * 0.74, h * 0.52);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Tusk
      ctx.beginPath();
      ctx.moveTo(w * 0.76, h * 0.50);
      ctx.quadraticCurveTo(w * 0.86, h * 0.54, w * 0.88, h * 0.48);
      ctx.quadraticCurveTo(w * 0.84, h * 0.51, w * 0.75, h * 0.48);
      ctx.fillStyle = "#f8fafc";
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#64748b";

      // 4 Sturdy Legs
      // Back legs
      ctx.fillRect(w * 0.28, h * 0.62, w * 0.08, h * 0.28);
      ctx.strokeRect(w * 0.28, h * 0.62, w * 0.08, h * 0.28);
      ctx.fillRect(w * 0.38, h * 0.62, w * 0.08, h * 0.28);
      ctx.strokeRect(w * 0.38, h * 0.62, w * 0.08, h * 0.28);
      // Front legs
      ctx.fillRect(w * 0.56, h * 0.62, w * 0.08, h * 0.28);
      ctx.strokeRect(w * 0.56, h * 0.62, w * 0.08, h * 0.28);
      ctx.fillRect(w * 0.66, h * 0.62, w * 0.08, h * 0.28);
      ctx.strokeRect(w * 0.66, h * 0.62, w * 0.08, h * 0.28);

      // Tail
      ctx.beginPath();
      ctx.moveTo(w * 0.21, h * 0.48);
      ctx.quadraticCurveTo(w * 0.16, h * 0.62, w * 0.18, h * 0.74);
      ctx.lineWidth = 5;
      ctx.stroke();
    },
    tags: [
      { type: "face", x: 0.76, y: 0.38, label: "Eye & Face" },
      { type: "trunk", x: 0.78, y: 0.48, x2: 0.88, y2: 0.75, label: "Curved Trunk" },
      { type: "ear", x: 0.64, y: 0.42, label: "Floppy Ear" },
      { type: "leg", x: 0.32, y: 0.88, subType: "bl", label: "Back-L Leg" },
      { type: "leg", x: 0.42, y: 0.88, subType: "br", label: "Back-R Leg" },
      { type: "leg", x: 0.60, y: 0.88, subType: "fl", label: "Front-L Leg" },
      { type: "leg", x: 0.70, y: 0.88, subType: "fr", label: "Front-R Leg" },
      { type: "tail", x: 0.21, y: 0.48, x2: 0.18, y2: 0.74, label: "Tail" },
    ],
  },
  {
    id: "horse",
    name: "Horse / Stallion",
    emoji: "🐴",
    draw: (ctx, w, h) => {
      ctx.fillStyle = "#78350f";
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";

      // Torso
      ctx.beginPath();
      ctx.ellipse(w * 0.46, h * 0.50, w * 0.24, h * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Arching Neck & Head
      ctx.beginPath();
      ctx.moveTo(w * 0.60, h * 0.48);
      ctx.lineTo(w * 0.72, h * 0.26);
      ctx.lineTo(w * 0.85, h * 0.32);
      ctx.lineTo(w * 0.70, h * 0.56);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Mane
      ctx.beginPath();
      ctx.moveTo(w * 0.58, h * 0.42);
      ctx.quadraticCurveTo(w * 0.68, h * 0.22, w * 0.70, h * 0.18);
      ctx.lineWidth = 8;
      ctx.strokeStyle = "#1c1917";
      ctx.stroke();

      // 4 Slender Legs
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 6;
      // Back legs
      ctx.beginPath();
      ctx.moveTo(w * 0.26, h * 0.58);
      ctx.lineTo(w * 0.28, h * 0.88);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.36, h * 0.58);
      ctx.lineTo(w * 0.38, h * 0.88);
      ctx.stroke();
      // Front legs
      ctx.beginPath();
      ctx.moveTo(w * 0.58, h * 0.58);
      ctx.lineTo(w * 0.60, h * 0.88);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.66, h * 0.58);
      ctx.lineTo(w * 0.68, h * 0.88);
      ctx.stroke();

      // Flowing Tail
      ctx.beginPath();
      ctx.moveTo(w * 0.23, h * 0.46);
      ctx.quadraticCurveTo(w * 0.12, h * 0.62, w * 0.15, h * 0.82);
      ctx.lineWidth = 10;
      ctx.strokeStyle = "#1c1917";
      ctx.stroke();
    },
    tags: [
      { type: "face", x: 0.80, y: 0.28, label: "Eye & Muzzle" },
      { type: "ear", x: 0.72, y: 0.18, label: "Pointed Ear" },
      { type: "leg", x: 0.28, y: 0.88, subType: "bl", label: "Back-L Leg" },
      { type: "leg", x: 0.38, y: 0.88, subType: "br", label: "Back-R Leg" },
      { type: "leg", x: 0.60, y: 0.88, subType: "fl", label: "Front-L Leg" },
      { type: "leg", x: 0.68, y: 0.88, subType: "fr", label: "Front-R Leg" },
      { type: "tail", x: 0.23, y: 0.46, x2: 0.15, y2: 0.82, label: "Flowing Tail" },
    ],
  },
  {
    id: "lion",
    name: "Safari Lion",
    emoji: "🦁",
    draw: (ctx, w, h) => {
      ctx.fillStyle = "#d97706";
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";

      // Torso
      ctx.beginPath();
      ctx.ellipse(w * 0.46, h * 0.52, w * 0.25, h * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Big Mane Circle
      ctx.beginPath();
      ctx.arc(w * 0.70, h * 0.40, w * 0.16, 0, Math.PI * 2);
      ctx.fillStyle = "#92400e";
      ctx.fill();
      ctx.stroke();

      // Face inside mane
      ctx.beginPath();
      ctx.arc(w * 0.72, h * 0.41, w * 0.10, 0, Math.PI * 2);
      ctx.fillStyle = "#f59e0b";
      ctx.fill();
      ctx.stroke();

      // Snout
      ctx.beginPath();
      ctx.ellipse(w * 0.79, h * 0.45, w * 0.05, h * 0.04, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#fef3c7";
      ctx.fill();
      ctx.stroke();

      // 4 Paws / Legs
      ctx.fillStyle = "#d97706";
      ctx.fillRect(w * 0.28, h * 0.60, w * 0.07, h * 0.28);
      ctx.strokeRect(w * 0.28, h * 0.60, w * 0.07, h * 0.28);
      ctx.fillRect(w * 0.38, h * 0.60, w * 0.07, h * 0.28);
      ctx.strokeRect(w * 0.38, h * 0.60, w * 0.07, h * 0.28);
      ctx.fillRect(w * 0.56, h * 0.60, w * 0.07, h * 0.28);
      ctx.strokeRect(w * 0.56, h * 0.60, w * 0.07, h * 0.28);
      ctx.fillRect(w * 0.66, h * 0.60, w * 0.07, h * 0.28);
      ctx.strokeRect(w * 0.66, h * 0.60, w * 0.07, h * 0.28);

      // Tail with tuft
      ctx.beginPath();
      ctx.moveTo(w * 0.22, h * 0.48);
      ctx.quadraticCurveTo(w * 0.14, h * 0.54, w * 0.12, h * 0.68);
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#78350f";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w * 0.12, h * 0.70, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#92400e";
      ctx.fill();
    },
    tags: [
      { type: "face", x: 0.74, y: 0.38, label: "Eye & Snout" },
      { type: "ear", x: 0.66, y: 0.26, label: "Round Ear" },
      { type: "leg", x: 0.31, y: 0.88, subType: "bl", label: "Back-L Paw" },
      { type: "leg", x: 0.41, y: 0.88, subType: "br", label: "Back-R Paw" },
      { type: "leg", x: 0.59, y: 0.88, subType: "fl", label: "Front-L Paw" },
      { type: "leg", x: 0.69, y: 0.88, subType: "fr", label: "Front-R Paw" },
      { type: "tail", x: 0.22, y: 0.48, x2: 0.12, y2: 0.70, label: "Tufted Tail" },
    ],
  },
  {
    id: "dino",
    name: "Baby Dinosaur",
    emoji: "🦕",
    draw: (ctx, w, h) => {
      ctx.fillStyle = "#10b981";
      ctx.strokeStyle = "#047857";
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";

      // Chubby Body
      ctx.beginPath();
      ctx.ellipse(w * 0.46, h * 0.54, w * 0.24, h * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Long Curved Neck & Head
      ctx.beginPath();
      ctx.moveTo(w * 0.56, h * 0.48);
      ctx.quadraticCurveTo(w * 0.72, h * 0.38, w * 0.76, h * 0.20);
      ctx.bezierCurveTo(w * 0.88, h * 0.20, w * 0.88, h * 0.30, w * 0.78, h * 0.32);
      ctx.quadraticCurveTo(w * 0.68, h * 0.46, w * 0.64, h * 0.56);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 4 Chunky Dino Legs
      ctx.fillRect(w * 0.28, h * 0.64, w * 0.08, h * 0.24);
      ctx.strokeRect(w * 0.28, h * 0.64, w * 0.08, h * 0.24);
      ctx.fillRect(w * 0.38, h * 0.64, w * 0.08, h * 0.24);
      ctx.strokeRect(w * 0.38, h * 0.64, w * 0.08, h * 0.24);
      ctx.fillRect(w * 0.54, h * 0.64, w * 0.08, h * 0.24);
      ctx.strokeRect(w * 0.54, h * 0.64, w * 0.08, h * 0.24);
      ctx.fillRect(w * 0.64, h * 0.64, w * 0.08, h * 0.24);
      ctx.strokeRect(w * 0.64, h * 0.64, w * 0.08, h * 0.24);

      // Long Thick Tail
      ctx.beginPath();
      ctx.moveTo(w * 0.24, h * 0.52);
      ctx.quadraticCurveTo(w * 0.12, h * 0.52, w * 0.06, h * 0.46);
      ctx.quadraticCurveTo(w * 0.14, h * 0.62, w * 0.26, h * 0.64);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    },
    tags: [
      { type: "face", x: 0.82, y: 0.22, label: "Eye & Dino Jaw" },
      { type: "leg", x: 0.32, y: 0.88, subType: "bl", label: "Back-L Leg" },
      { type: "leg", x: 0.42, y: 0.88, subType: "br", label: "Back-R Leg" },
      { type: "leg", x: 0.58, y: 0.88, subType: "fl", label: "Front-L Leg" },
      { type: "leg", x: 0.68, y: 0.88, subType: "fr", label: "Front-R Leg" },
      { type: "tail", x: 0.24, y: 0.54, x2: 0.06, y2: 0.46, label: "Dino Tail" },
    ],
  },
];

const PALETTE = [
  "#64748b", // Elephant grey
  "#f97316", // Tiger orange
  "#78350f", // Horse brown
  "#10b981", // Dino green
  "#eab308", // Golden yellow
  "#ec4899", // Pink
  "#3b82f6", // Blue
  "#1e293b", // Slate black
  "#ffffff", // White
];

export function CreatureStudio({ onClose }: CreatureStudioProps) {
  const addActor = useStudio2d((s) => s.addActor);
  const addClip = useStudio2d((s) => s.addClip);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawingTool, setDrawingTool] = useState<"brush" | "eraser">("brush");
  const [brushColor, setBrushColor] = useState("#64748b");
  const [brushSize, setBrushSize] = useState(6);
  const [isDrawing, setIsDrawing] = useState(false);
  const [animalName, setAnimalName] = useState("My Elephant");

  const [activeTagTool, setActiveTagTool] = useState<TagType | null>(null);
  const [tags, setTags] = useState<CreatureTag[]>(TEMPLATES[0].tags.map((t) => ({ ...t, id: uid() })));

  const [previewWalk, setPreviewWalk] = useState(false);
  const [walkPhase, setWalkPhase] = useState(0);

  // Load initial elephant template on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    TEMPLATES[0].draw(ctx, canvas.width, canvas.height);
  }, []);

  // Live preview animation loop
  useEffect(() => {
    if (!previewWalk) return;
    let animId = 0;
    const loop = () => {
      setWalkPhase((p) => p + 0.12);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [previewWalk]);

  const loadTemplate = (tmpl: StarterTemplate) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    tmpl.draw(ctx, canvas.width, canvas.height);
    setTags(tmpl.tags.map((t) => ({ ...t, id: uid() })));
    setAnimalName(tmpl.name);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTags([]);
  };

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, rx: 0, ry: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    return { x, y, rx: x / canvas.width, ry: y / canvas.height };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y, rx, ry } = getCanvasCoords(e);

    // If tagging command is active, place a tag
    if (activeTagTool) {
      const newTag: CreatureTag = {
        id: uid(),
        type: activeTagTool,
        x: Math.round(rx * 100) / 100,
        y: Math.round(ry * 100) / 100,
        label:
          activeTagTool === "face"
            ? "Eye & Face"
            : activeTagTool === "trunk"
            ? "Trunk / Snout"
            : activeTagTool === "tail"
            ? "Tail"
            : activeTagTool === "ear"
            ? "Ear"
            : `Leg ${tags.filter((t) => t.type === "leg").length + 1}`,
      };
      setTags((prev) => [...prev, newTag]);
      setActiveTagTool(null);
      return;
    }

    // Otherwise, normal freehand drawing
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize;
    if (drawingTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = brushColor;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const { x, y } = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  const removeTag = (id: string) => {
    setTags((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSaveCreature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const drawingUrl = canvas.toDataURL("image/png");

    const hasTrunk = tags.some((t) => t.type === "trunk");
    const legCount = tags.filter((t) => t.type === "leg").length;
    const isQuadruped = legCount >= 4;

    const creatureData: CreatureData = {
      drawingUrl,
      tags,
      isQuadruped,
      hasTrunk,
      name: animalName.trim() || "Custom Animal",
    };

    const newActorId = uid();
    const newActor: Actor2D = {
      id: newActorId,
      name: animalName.trim() || "Custom Animal",
      species: "creature",
      x: 380,
      y: 0,
      facing: 1,
      scale: 1.25,
      depth: 1,
      app: {
        skin: brushColor,
        hair: brushColor,
        hairStyle: 0,
        beard: false,
        beardColor: "#000",
        shirt: "#000",
        pants: "#000",
        shoes: "#000",
        eyes: "#000",
        build: 1.0,
        hat: 0,
        hatColor: "#000",
        dress: false,
        dressColor: "#000",
      },
      voicePreset: hasTrunk || isQuadruped ? "monk" : "cartoon",
      creature: creatureData,
    };

    addActor(newActor);

    // Add default initial walk & action clips to timeline
    addClip({
      id: uid(),
      actorId: newActorId,
      kind: "walk",
      start: 0,
      duration: 3.5,
      x1: 200,
      x2: 550,
      y: 0,
      facing: 1,
    });

    addClip({
      id: uid(),
      actorId: newActorId,
      kind: "action",
      start: 3.5,
      duration: 3.0,
      x: 550,
      y: 0,
      facing: 1,
      expression: "happy",
      stance: "stand",
      gesture: "wave",
      say: hasTrunk ? "Trumpet! (Elephant Roar)" : "Hello from the wild!",
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="flex h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-cyan-500/30 bg-[#0c0e14] text-slate-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#121622] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🐘</span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Draw Any Animal &amp; Semantic Part Rigging Studio
                <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan-300">
                  AI &amp; Sticker Rig
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Draw any animal outline, then tag body parts (Eyes, Trunk, 4 Legs, Tail) for instant 60 FPS animation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Studio Content */}
        <div className="flex flex-1 min-h-0 divide-x divide-white/10">
          {/* Left Toolbar: Drawing tools & templates */}
          <div className="w-64 shrink-0 flex flex-col p-4 space-y-4 overflow-y-auto bg-[#0f121a]">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                🌟 Starter Templates
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => loadTemplate(tmpl)}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2 text-xs font-semibold hover:border-cyan-400 hover:bg-cyan-500/10 transition text-left"
                  >
                    <span className="text-lg">{tmpl.emoji}</span>
                    <span className="truncate">{tmpl.name}</span>
                  </button>
                ))}
                <button
                  onClick={clearCanvas}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-white/20 p-2 text-xs font-semibold text-slate-400 hover:text-white hover:border-white/40 transition"
                >
                  <span>✏️</span>
                  <span>Blank Canvas</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                🎨 Drawing Tools
              </label>
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => {
                    setDrawingTool("brush");
                    setActiveTagTool(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                    drawingTool === "brush" && !activeTagTool
                      ? "bg-cyan-500 text-black shadow"
                      : "bg-white/10 text-slate-300 hover:bg-white/15"
                  }`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Brush
                </button>
                <button
                  onClick={() => {
                    setDrawingTool("eraser");
                    setActiveTagTool(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                    drawingTool === "eraser" && !activeTagTool
                      ? "bg-amber-500 text-black shadow"
                      : "bg-white/10 text-slate-300 hover:bg-white/15"
                  }`}
                >
                  <Eraser className="h-3.5 w-3.5" />
                  Eraser
                </button>
              </div>

              {/* Color Palette */}
              <div className="mb-3">
                <div className="text-[10px] text-slate-400 mb-1.5">Color Palette</div>
                <div className="flex flex-wrap gap-1.5">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => setBrushColor(c)}
                      style={{ backgroundColor: c }}
                      className={`h-6 w-6 rounded-md border-2 transition ${
                        brushColor === c ? "border-cyan-400 scale-110" : "border-white/20"
                      }`}
                    />
                  ))}
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    className="h-6 w-6 rounded cursor-pointer border border-white/20 bg-transparent"
                    title="Custom color"
                  />
                </div>
              </div>

              {/* Brush Size */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Brush Size</span>
                  <span className="font-mono">{brushSize}px</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="24"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>

            <button
              onClick={clearCanvas}
              className="mt-auto flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/20 py-2 text-xs font-semibold text-red-300 hover:bg-red-900/30 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset / Clear All
            </button>
          </div>

          {/* Center Canvas Viewport */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#07090e] relative select-none">
            <div className="relative rounded-2xl border-2 border-white/15 bg-[#151926] shadow-2xl overflow-hidden">
              <canvas
                ref={canvasRef}
                width={560}
                height={400}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="cursor-crosshair block"
              />

              {/* Tag Pins Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {tags.map((tag) => {
                  // Live walk bob/swing if preview is active
                  let dx = 0;
                  let dy = 0;
                  if (previewWalk) {
                    if (tag.type === "leg") {
                      const isBack = tag.subType?.startsWith("b");
                      const phaseOffset = isBack ? Math.PI : 0;
                      dx = Math.sin(walkPhase + phaseOffset) * 14;
                    } else if (tag.type === "trunk" || tag.type === "tail") {
                      dx = Math.sin(walkPhase * 1.5) * 12;
                    } else if (tag.type === "face" || tag.type === "ear") {
                      dy = Math.abs(Math.sin(walkPhase)) * 6;
                    }
                  }

                  return (
                    <div
                      key={tag.id}
                      style={{
                        left: `${tag.x * 100}%`,
                        top: `${tag.y * 100}%`,
                        transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px)`,
                      }}
                      className="pointer-events-auto absolute flex items-center gap-1 rounded-full bg-cyan-950/90 border border-cyan-400 px-2 py-0.5 text-[10px] font-bold text-cyan-200 shadow-lg group hover:scale-110 transition-transform"
                    >
                      <span>
                        {tag.type === "face"
                          ? "👁️"
                          : tag.type === "trunk"
                          ? "🐘"
                          : tag.type === "tail"
                          ? "🪱"
                          : tag.type === "ear"
                          ? "👂"
                          : "🦵"}
                      </span>
                      <span>{tag.label || tag.type}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTag(tag.id);
                        }}
                        className="ml-1 text-red-400 opacity-60 hover:opacity-100"
                        title="Remove tag"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Tagging Instruction Banner */}
              {activeTagTool && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full border border-cyan-400 bg-cyan-950/90 px-4 py-1.5 text-xs font-bold text-cyan-200 shadow-xl backdrop-blur animate-pulse">
                  👉 Click on the drawing where the{" "}
                  {activeTagTool === "face"
                    ? "Eye & Face"
                    : activeTagTool === "trunk"
                    ? "Trunk / Snout"
                    : activeTagTool === "leg"
                    ? "Leg"
                    : activeTagTool === "tail"
                    ? "Tail"
                    : "Ear"}{" "}
                  should be!
                </div>
              )}
            </div>

            {/* Canvas Bottom Quick Stats */}
            <div className="mt-3 flex items-center gap-6 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {tags.length} Anatomical Parts Tagged
              </span>
              <span>•</span>
              <span>{tags.filter((t) => t.type === "leg").length >= 4 ? "🐘 4-Legged Quadruped" : "🚶 Biped Beast"}</span>
              <span>•</span>
              <span>{tags.some((t) => t.type === "trunk") ? "Trunk Spline Active" : "Standard Snout"}</span>
            </div>
          </div>

          {/* Right Toolbar: Semantic Part Commands */}
          <div className="w-72 shrink-0 flex flex-col p-4 space-y-3 bg-[#0f121a]">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 block mb-1">
                🏷️ Semantic Part Commands
              </label>
              <p className="text-[11px] text-slate-400 mb-3">
                Select a command, then click on the drawing to attach that body part!
              </p>

              <div className="space-y-1.5">
                <button
                  onClick={() => setActiveTagTool(activeTagTool === "face" ? null : "face")}
                  className={`w-full flex items-center justify-between rounded-lg border p-2.5 text-xs font-semibold transition ${
                    activeTagTool === "face"
                      ? "border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow"
                      : "border-white/10 bg-white/5 hover:border-white/20 text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">👁️</span>
                    <div className="text-left">
                      <div className="font-bold">Face &amp; Eyes</div>
                      <div className="text-[10px] text-slate-400">Blinks, pupil tracking, mouth flap</div>
                    </div>
                  </div>
                  {tags.some((t) => t.type === "face") && <Check className="h-4 w-4 text-emerald-400" />}
                </button>

                <button
                  onClick={() => setActiveTagTool(activeTagTool === "trunk" ? null : "trunk")}
                  className={`w-full flex items-center justify-between rounded-lg border p-2.5 text-xs font-semibold transition ${
                    activeTagTool === "trunk"
                      ? "border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow"
                      : "border-white/10 bg-white/5 hover:border-white/20 text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🐘</span>
                    <div className="text-left">
                      <div className="font-bold">Trunk / Snout</div>
                      <div className="text-[10px] text-slate-400">Flexible curling bendy spine</div>
                    </div>
                  </div>
                  {tags.some((t) => t.type === "trunk") && <Check className="h-4 w-4 text-emerald-400" />}
                </button>

                <button
                  onClick={() => setActiveTagTool(activeTagTool === "leg" ? null : "leg")}
                  className={`w-full flex items-center justify-between rounded-lg border p-2.5 text-xs font-semibold transition ${
                    activeTagTool === "leg"
                      ? "border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow"
                      : "border-white/10 bg-white/5 hover:border-white/20 text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🦵</span>
                    <div className="text-left">
                      <div className="font-bold">Legs (Front &amp; Back)</div>
                      <div className="text-[10px] text-slate-400">Click 4 spots for quadruped trot</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-300">
                    {tags.filter((t) => t.type === "leg").length} / 4
                  </span>
                </button>

                <button
                  onClick={() => setActiveTagTool(activeTagTool === "tail" ? null : "tail")}
                  className={`w-full flex items-center justify-between rounded-lg border p-2.5 text-xs font-semibold transition ${
                    activeTagTool === "tail"
                      ? "border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow"
                      : "border-white/10 bg-white/5 hover:border-white/20 text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🪱</span>
                    <div className="text-left">
                      <div className="font-bold">Tail</div>
                      <div className="text-[10px] text-slate-400">Dynamic physics sway &amp; wag</div>
                    </div>
                  </div>
                  {tags.some((t) => t.type === "tail") && <Check className="h-4 w-4 text-emerald-400" />}
                </button>

                <button
                  onClick={() => setActiveTagTool(activeTagTool === "ear" ? null : "ear")}
                  className={`w-full flex items-center justify-between rounded-lg border p-2.5 text-xs font-semibold transition ${
                    activeTagTool === "ear"
                      ? "border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow"
                      : "border-white/10 bg-white/5 hover:border-white/20 text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">👂</span>
                    <div className="text-left">
                      <div className="font-bold">Big Ears</div>
                      <div className="text-[10px] text-slate-400">Floppy bouncing ears</div>
                    </div>
                  </div>
                  {tags.some((t) => t.type === "ear") && <Check className="h-4 w-4 text-emerald-400" />}
                </button>
              </div>
            </div>

            {/* Animal Name */}
            <div className="pt-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Animal Name
              </label>
              <input
                type="text"
                value={animalName}
                onChange={(e) => setAnimalName(e.target.value)}
                placeholder="e.g. African Elephant"
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            {/* Live Animation Test Toggle */}
            <div className="pt-2">
              <button
                onClick={() => setPreviewWalk(!previewWalk)}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition shadow ${
                  previewWalk
                    ? "bg-amber-400 text-black hover:bg-amber-300"
                    : "bg-white/10 text-white hover:bg-white/15"
                }`}
              >
                {previewWalk ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {previewWalk ? "Stop Live Walk Preview" : "▶ Test Live Walk Preview"}
              </button>
            </div>

            {/* Save & Add Animal */}
            <div className="mt-auto pt-4">
              <button
                onClick={handleSaveCreature}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 text-xs font-bold text-black shadow-xl hover:brightness-110 active:scale-95 transition-all"
              >
                <Sparkles className="h-4 w-4 text-black" />
                Save &amp; Add Animal to Stage
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
