import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Eraser, Eye, EyeOff, FlipHorizontal2, PaintBucket, Paintbrush, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import { CLOTH } from "./gen2d";
import { cn } from "../utils/cn";

const CANVAS_W = 320;
const CANVAS_H = 570;

const PALETTE = [
  "#ffffff",
  "#111827",
  "#ef4444",
  "#f43f5e",
  "#ec4899",
  "#a855f7",
  "#6366f1",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#eab308",
  "#f97316",
  "#facc15",
  "#78350f",
];

export function DressDrawModal({
  initialImage,
  baseColor,
  outfitStyle = 2,
  onApply,
  onClose,
}: {
  initialImage?: string;
  baseColor: string;
  outfitStyle?: number;
  onApply: (dataUrl: string) => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const [color, setColor] = useState("#facc15");
  const [size, setSize] = useState(12);
  const [mirror, setMirror] = useState(true);
  const [showGuide, setShowGuide] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const drawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);

  const pushHistory = () => {
    const c = canvasRef.current;
    if (!c) return;
    const snap = c.toDataURL("image/png");
    setHistory((prev) => [...prev.slice(-24), snap]);
  };

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    if (initialImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H);
        setHistory([c.toDataURL("image/png")]);
      };
      img.src = initialImage;
    } else {
      setHistory([c.toDataURL("image/png")]);
    }
  }, [initialImage]);

  const getCoords = (e: RPointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const rect = c.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
    };
  };

  const drawSegment = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = size;
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
    }

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    if (mirror) {
      ctx.beginPath();
      ctx.moveTo(CANVAS_W - from.x, from.y);
      ctx.lineTo(CANVAS_W - to.x, to.y);
      ctx.stroke();
    }
    ctx.restore();
  };

  const handlePointerDown = (e: RPointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const pt = getCoords(e);
    lastPtRef.current = pt;
    drawSegment(pt, { x: pt.x + 0.01, y: pt.y + 0.01 });
  };

  const handlePointerMove = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !lastPtRef.current) return;
    const pt = getCoords(e);
    drawSegment(lastPtRef.current, pt);
    lastPtRef.current = pt;
  };

  const handlePointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPtRef.current = null;
    pushHistory();
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const prevList = history.slice(0, -1);
    const snap = prevList[prevList.length - 1];
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H);
    };
    img.src = snap;
    setHistory(prevList);
  };

  const handleFillCanvas = (fillColor: string) => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = fillColor;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.restore();
    pushHistory();
  };

  const handleClear = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    pushHistory();
  };

  const handleSave = () => {
    const c = canvasRef.current;
    if (!c) return;
    onApply(c.toDataURL("image/png"));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-[680px] flex-col overflow-hidden rounded-xl border border-white/15 bg-[#1b1d22] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#15171b] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base">🎨</span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#ffb36b]">
              Dress Sketchpad — Draw From Scratch
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            title="Close sketchpad"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#22252c] px-4 py-2">
          <button
            onClick={() => setTool("brush")}
            className={cn(
              "flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold transition",
              tool === "brush"
                ? "bg-[#e87d0d] text-black"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            )}
          >
            <Paintbrush className="h-3.5 w-3.5" /> Brush
          </button>
          <button
            onClick={() => setTool("eraser")}
            className={cn(
              "flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold transition",
              tool === "eraser"
                ? "bg-[#e87d0d] text-black"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            )}
          >
            <Eraser className="h-3.5 w-3.5" /> Eraser
          </button>

          <div className="mx-1 h-4 w-px bg-white/10" />

          <button
            onClick={() => setMirror((m) => !m)}
            className={cn(
              "flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-medium transition",
              mirror
                ? "border-sky-400/50 bg-sky-500/20 text-sky-200"
                : "border-white/10 text-slate-400 hover:text-slate-200"
            )}
            title="Mirror strokes left-to-right for symmetrical dress designs"
          >
            <FlipHorizontal2 className="h-3.5 w-3.5" /> Symmetry: {mirror ? "ON" : "OFF"}
          </button>

          <button
            onClick={() => setShowGuide((g) => !g)}
            className={cn(
              "flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-medium transition",
              showGuide
                ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200"
                : "border-white/10 text-slate-400 hover:text-slate-200"
            )}
            title="Toggle character body guide lines"
          >
            {showGuide ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />} Guide
          </button>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={handleUndo}
              disabled={history.length <= 1}
              className="flex items-center gap-1 rounded bg-white/5 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10 disabled:opacity-35"
              title="Undo last stroke"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Undo
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-1 rounded bg-red-500/15 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/25"
              title="Clear all strokes"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        </div>

        {/* Main Workspace */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:flex-row">
          {/* Canvas Container */}
          <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-white/10 bg-[#121316] p-3">
            <div className="mb-1.5 text-[10px] text-slate-400">
              Draw directly inside the dress silhouette · Transparent areas keep base dress color
            </div>
            <div
              className="relative overflow-hidden rounded-lg border border-white/20 shadow-inner"
              style={{
                width: 240,
                height: 428,
                backgroundColor: baseColor,
                backgroundImage:
                  "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
                backgroundSize: "14px 14px",
              }}
            >
              {/* Faint Mannequin & Dress Silhouette Guide (Not exported into PNG) */}
              {showGuide && (
                <svg
                  viewBox="0 0 320 570"
                  className="pointer-events-none absolute inset-0 h-full w-full opacity-65"
                >
                  {/* Torso box guide */}
                  <rect
                    x={64}
                    y={0}
                    width={192}
                    height={272}
                    rx={68}
                    fill="none"
                    stroke="rgba(255,255,255,0.45)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                  {/* Waistline marker */}
                  <line
                    x1={20}
                    y1={224}
                    x2={300}
                    y2={224}
                    stroke="#ffb36b"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                  <text x={24} y={216} fill="#ffb36b" fontSize={12} fontWeight="bold">
                    WAIST
                  </text>
                  {/* Gown / Skirt silhouette guide */}
                  {outfitStyle === 2 ? (
                    <path
                      d="M 76 224 L 244 224 C 276 310 310 430 318 552 Q 160 572 2 552 C 10 430 44 310 76 224 Z"
                      fill="none"
                      stroke="rgba(255,255,255,0.5)"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                    />
                  ) : outfitStyle === 3 ? (
                    <path
                      d="M 80 224 L 240 224 L 280 372 L 40 372 Z"
                      fill="none"
                      stroke="rgba(255,255,255,0.5)"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                    />
                  ) : (
                    <path
                      d="M 76 224 L 244 224 L 292 420 L 28 420 Z"
                      fill="none"
                      stroke="rgba(255,255,255,0.5)"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                    />
                  )}
                  {/* Symmetry center line */}
                  {mirror && (
                    <line
                      x1={160}
                      y1={0}
                      x2={160}
                      y2={570}
                      stroke="rgba(56,189,248,0.45)"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                    />
                  )}
                </svg>
              )}

              {/* Interactive Drawing Canvas */}
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="relative z-10 h-full w-full cursor-crosshair touch-none"
              />
            </div>
          </div>

          {/* Right Tool Controls */}
          <div className="flex w-full shrink-0 flex-col gap-4 md:w-[240px]">
            {/* Brush Size */}
            <div className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-300">
                <span>{tool === "eraser" ? "Eraser Size" : "Brush Size"}</span>
                <span className="font-mono text-[#ffb36b]">{size}px</span>
              </div>
              <input
                type="range"
                min={2}
                max={42}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="w-full accent-[#e87d0d]"
              />
              <div className="mt-2 flex items-center justify-between gap-1">
                {[4, 10, 18, 30].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={cn(
                      "flex h-7 flex-1 items-center justify-center rounded border text-[10px]",
                      size === s
                        ? "border-[#e87d0d] bg-[#e87d0d]/20 text-[#ffb36b]"
                        : "border-white/10 text-slate-400 hover:bg-white/5"
                    )}
                  >
                    <span
                      className="rounded-full bg-current"
                      style={{ width: Math.min(18, s * 0.6 + 2), height: Math.min(18, s * 0.6 + 2) }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Color Palette */}
            <div className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-slate-300">
                <span>Paint Colour</span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => {
                    setColor(e.target.value);
                    setTool("brush");
                  }}
                  className="h-6 w-8 cursor-pointer rounded border border-white/20 bg-transparent"
                />
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {PALETTE.concat(CLOTH.slice(0, 0)).map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setColor(c);
                      setTool("brush");
                    }}
                    className={cn(
                      "h-6 w-6 rounded-md border transition",
                      color === c && tool === "brush"
                        ? "scale-110 border-white ring-2 ring-[#e87d0d]"
                        : "border-white/20 hover:scale-105"
                    )}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
              <button
                onClick={() => handleFillCanvas(color)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/5 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-white/10"
                title="Fill entire canvas with selected paint color"
              >
                <PaintBucket className="h-3.5 w-3.5" /> Fill Fabric Base with Colour
              </button>
            </div>

            {/* Tips */}
            <div className="rounded-lg border border-[#e87d0d]/25 bg-[#e87d0d]/5 p-2.5 text-[10px] leading-relaxed text-slate-300">
              <b>💡 Designer Tips:</b>
              <ul className="mt-1 list-disc space-y-0.5 pl-3.5 text-slate-400">
                <li>Use <b>Symmetry</b> to draw balanced collars, belts, or sleeves.</li>
                <li>Draw above the orange <b>WAIST</b> line for the bodice/top, and below for the skirt/gown!</li>
                <li>Use <b>Eraser</b> to let the base fabric show through.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-white/10 bg-[#15171b] px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/15 px-4 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-[#e87d0d] px-4 py-1.5 text-xs font-bold text-black hover:bg-[#ff9430]"
          >
            <Sparkles className="h-3.5 w-3.5" /> Apply Dress to Character
          </button>
        </div>
      </div>
    </div>
  );
}
