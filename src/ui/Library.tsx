import { useMemo, useState } from "react";
import { Plus, Search, Sparkles } from "lucide-react";
import { CATALOG, CATALOG_CATEGORIES, type CatalogCategory } from "../lib/catalog";
import { ACTION_CATEGORIES, ACTIONS, motionVariantCount, actionsForRig } from "../lib/motions";
import { useStore } from "../store";
import { usePlayback } from "../playback";
import { cn } from "../utils/cn";
import { ImageTo3DModal } from "../three/ImageTo3DModal";

const PAGE = 120;

export function Library() {
  const [sub, setSub] = useState<"characters" | "motions">("characters");
  const [imgModalOpen, setImgModalOpen] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="p-2 border-b border-white/5">
        <button
          onClick={() => setImgModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 py-2 text-xs font-bold text-cyan-200 hover:from-cyan-500/30 hover:to-blue-600/30 shadow-md transition"
        >
          <Sparkles className="h-4 w-4 text-cyan-300" />
          <span>📦 Image to 3D Model Converter</span>
        </button>
      </div>

      <div className="flex gap-1 border-b border-white/5 p-2">
        {(["characters", "motions"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setSub(k)}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-xs font-semibold capitalize transition",
              sub === k ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
            )}
          >
            {k === "characters" ? `Characters · ${CATALOG.length}` : `Motions · ${ACTIONS.length}`}
          </button>
        ))}
      </div>
      {sub === "characters" ? <CharacterLibrary /> : <MotionLibrary />}
      {imgModalOpen && <ImageTo3DModal onClose={() => setImgModalOpen(false)} />}
    </div>
  );
}

function CharacterLibrary() {
  const addCharacter = useStore((s) => s.addCharacter);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CatalogCategory | "All">("All");
  const [limit, setLimit] = useState(PAGE);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return CATALOG.filter(
      (c) =>
        (cat === "All" || c.category === cat) &&
        (!term || c.name.toLowerCase().includes(term) || c.tags.some((t) => t.includes(term)) || c.config.species.toLowerCase().includes(term)),
    );
  }, [q, cat]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of CATALOG) m[c.category] = (m[c.category] ?? 0) + 1;
    return m;
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
            }}
            placeholder="Search people, animals, memeoji…"
            className="w-full rounded-md border border-white/10 bg-black/30 py-2 pl-8 pr-2 text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-500/60"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(["All", ...CATALOG_CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => {
                setCat(c);
                setLimit(PAGE);
              }}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition",
                cat === c ? "border-cyan-400 bg-cyan-400/15 text-cyan-200" : "border-white/10 text-slate-400 hover:border-white/25",
              )}
            >
              {c}
              <span className="ml-1 text-slate-500">{c === "All" ? CATALOG.length : counts[c]}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500">{filtered.length} matches · click + to add to your scene</p>
      </div>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
        {filtered.slice(0, limit).map((c) => (
          <div key={c.id} className="group flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.03] p-2 hover:border-white/15 hover:bg-white/[0.06]">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
              style={{ background: `linear-gradient(135deg, ${c.config.rig === "human" ? c.config.top : c.config.bodyColor}, ${c.config.rig === "human" ? c.config.skin : c.config.bellyColor})` }}
            >
              {c.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-slate-100">{c.name}</div>
              <div className="truncate text-[10px] text-slate-500">
                {c.category} · {c.config.rig}
                {c.config.species ? ` · ${c.config.species}` : ""}
              </div>
            </div>
            <button
              onClick={() => addCharacter(c)}
              title="Add to scene"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/15 text-cyan-300 opacity-70 transition hover:bg-cyan-500/30 hover:opacity-100"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ))}
        {filtered.length > limit && (
          <button onClick={() => setLimit((l) => l + PAGE)} className="w-full rounded-md border border-white/10 py-2 text-xs text-slate-300 hover:bg-white/5">
            Show more ({filtered.length - limit} left)
          </button>
        )}
      </div>
    </div>
  );
}

function MotionLibrary() {
  const selectedId = useStore((s) => s.selectedCharId);
  const rig = useStore((s) => s.characters.find((c) => c.id === s.selectedCharId)?.config.rig);
  const addClip = useStore((s) => s.addClip);
  const variants = motionVariantCount();
  const list = rig ? actionsForRig(rig) : ACTIONS;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      <div className="mb-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
        <div className="text-[11px] uppercase tracking-wider text-cyan-300">Procedural motion engine</div>
        <div className="mt-1 text-xl font-bold text-white">{variants.toLocaleString()}</div>
        <div className="text-[11px] leading-relaxed text-slate-400">
          distinct motion variants from {ACTIONS.length} base actions × 8 styles × 5 intensities × 5 speeds × mirror × 4 phase variants. Pick any and it plays
          instantly on the selected character.
        </div>
      </div>
      {!selectedId && <p className="mb-2 text-[11px] text-amber-300/80">Select a character in the Cast tab to apply motions. Showing all motions.</p>}
      {selectedId && rig && <p className="mb-2 text-[11px] text-slate-500">Showing {rig} motions · {list.length} actions</p>}
      {ACTION_CATEGORIES.map((cat) => {
        const items = list.filter((a) => a.cat === cat);
        if (!items.length) return null;
        return (
          <div key={cat} className="mb-3">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{cat}</div>
            <div className="grid grid-cols-2 gap-1.5">
              {items.map((a) => (
                <button
                  key={a.id}
                  disabled={!selectedId}
                  onClick={() => {
                    if (!selectedId) return;
                    addClip({
                      characterId: selectedId,
                      start: Math.max(0, Math.round(usePlayback.getState().time * 10) / 10),
                      duration: 3,
                      kind: "action",
                      actionId: a.id,
                      style: "normal",
                      intensity: 1,
                      speed: 1,
                      mirror: false,
                      variant: 0,
                      expression: "neutral",
                      talk: false,
                    });
                  }}
                  className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-1.5 text-left text-[11px] text-slate-200 transition hover:border-cyan-500/40 hover:bg-cyan-500/10 disabled:opacity-40"
                >
                  {a.name}
                  <span className="block text-[9px] text-slate-500">{a.rig}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
