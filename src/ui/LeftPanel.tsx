import { Copy, Globe, Library as LibraryIcon, Trash2, Users } from "lucide-react";
import { useStore } from "../store";
import { WORLDS } from "../three/Worlds";
import { Library } from "./Library";
import { cn } from "../utils/cn";
import type { LeftTab } from "../lib/types";

const TABS: { id: LeftTab; label: string; icon: typeof Users }[] = [
  { id: "cast", label: "Cast", icon: Users },
  { id: "library", label: "Library", icon: LibraryIcon },
  { id: "worlds", label: "Worlds", icon: Globe },
];

export function LeftPanel() {
  const tab = useStore((s) => s.leftTab);
  const setTab = useStore((s) => s.setLeftTab);
  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-r border-white/5 bg-[#0d0f15]">
      <div className="grid grid-cols-3 gap-0.5 border-b border-white/5 p-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md py-2 text-[10px] font-semibold transition",
              tab === t.id ? "bg-white/10 text-white" : "text-slate-500 hover:bg-white/5 hover:text-slate-300",
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>
      {tab === "cast" && <CastTab />}
      {tab === "library" && <Library />}
      {tab === "worlds" && <WorldsTab />}
    </aside>
  );
}

function CastTab() {
  const characters = useStore((s) => s.characters);
  const selected = useStore((s) => s.selectedCharId);
  const selectChar = useStore((s) => s.selectChar);
  const removeCharacter = useStore((s) => s.removeCharacter);
  const duplicateCharacter = useStore((s) => s.duplicateCharacter);
  const setLeftTab = useStore((s) => s.setLeftTab);
  const mocapTarget = useStore((s) => s.mocapTargetId);
  const setMocapTarget = useStore((s) => s.setMocapTarget);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between p-3">
        <div>
          <div className="text-xs font-semibold text-slate-200">Scene cast</div>
          <div className="text-[11px] text-slate-500">{characters.length} characters on stage</div>
        </div>
        <button onClick={() => setLeftTab("library")} className="rounded-md bg-cyan-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/25">
          + Add character
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
        {characters.length === 0 && (
          <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-slate-500">
            No characters yet. Open the Library to add people, animals or memeoji.
          </div>
        )}
        {characters.map((c) => (
          <div
            key={c.id}
            onClick={() => selectChar(c.id)}
            className={cn(
              "cursor-pointer rounded-lg border p-2.5 transition",
              selected === c.id ? "border-cyan-500/50 bg-cyan-500/10" : "border-white/5 bg-white/[0.03] hover:border-white/15",
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className="h-8 w-8 shrink-0 rounded-md"
                style={{ background: `linear-gradient(135deg, ${c.config.rig === "human" ? c.config.top : c.config.bodyColor}, ${c.config.rig === "human" ? c.config.skin : c.config.bellyColor})` }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-slate-100">{c.name}</div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <span className="rounded bg-white/5 px-1 uppercase">{c.config.rig}</span>
                  <span className="truncate">{c.category}</span>
                </div>
              </div>
              <button
                title="Duplicate"
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateCharacter(c.id);
                }}
                className="rounded p-1 text-slate-500 hover:bg-white/10 hover:text-slate-200"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                title="Remove"
                onClick={(e) => {
                  e.stopPropagation();
                  removeCharacter(c.id);
                }}
                className="rounded p-1 text-slate-500 hover:bg-red-500/20 hover:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {c.config.rig === "human" && (
              <label className="mt-2 flex items-center gap-2 text-[10px] text-slate-400" onClick={(e) => e.stopPropagation()}>
                <input type="radio" checked={mocapTarget === c.id} onChange={() => setMocapTarget(c.id)} className="accent-cyan-400" />
                Mocap target (follows your webcam)
              </label>
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-white/5 p-3 text-[11px] leading-relaxed text-slate-500">
        Drag a character on the stage to move it. Click one to select it, then use the Inspector on the right to pose it.
      </div>
    </div>
  );
}

function WorldsTab() {
  const worldId = useStore((s) => s.worldId);
  const setWorld = useStore((s) => s.setWorld);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      <div className="mb-3 text-xs text-slate-400">Open worlds for your film background. Each has its own terrain, sky, lighting and props.</div>
      <div className="grid grid-cols-2 gap-2">
        {WORLDS.map((w) => (
          <button
            key={w.id}
            onClick={() => setWorld(w.id)}
            className={cn("group overflow-hidden rounded-lg border text-left transition", worldId === w.id ? "border-cyan-400 ring-1 ring-cyan-400/40" : "border-white/10 hover:border-white/30")}
          >
            <div className="relative h-20" style={{ background: `linear-gradient(180deg, ${w.skyTop}, ${w.skyBottom} 60%, ${w.ground} 60%, ${w.groundAlt})` }}>
              <span className="absolute inset-0 flex items-center justify-center text-3xl drop-shadow">{w.emoji}</span>
            </div>
            <div className="bg-white/[0.03] px-2 py-1.5 text-[11px] font-semibold text-slate-200">{w.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
