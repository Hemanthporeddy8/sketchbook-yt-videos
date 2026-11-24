import { useMemo, useState } from "react";
import { Crown, Trash2 } from "lucide-react";
import { CATALOG } from "../lib/catalog";
import { useSandbox } from "./sandboxStore";
import { stopScene } from "./scripts";
import { Section } from "../ui/ui-kit";
import { cn } from "../utils/cn";

const HUMANS = CATALOG.filter((c) => c.config.rig === "human");
const PAGE = 60;

/** Cast: the main characters, NPCs, and the market demo. */
export function CastTab() {
  const actors = useSandbox((s) => s.actors);
  const playerId = useSandbox((s) => s.playerId);
  const selectedActorId = useSandbox((s) => s.selectedActorId);
  const selectActor = useSandbox((s) => s.selectActor);
  const setPlayer = useSandbox((s) => s.setPlayer);
  const removeActor = useSandbox((s) => s.removeActor);
  const addActor = useSandbox((s) => s.addActor);
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return HUMANS.filter((c) => !t || c.name.toLowerCase().includes(t) || c.category.toLowerCase().includes(t));
  }, [q]);

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
      <Section title="Market demo">
        <p className="text-[11px] leading-relaxed text-slate-400">
          Loads a market with stalls, a vendor who shops and grabs goods, and two NPCs who follow her. Then open the Script tab and press Run scene.
        </p>
        <button
          onClick={() => {
            useSandbox.getState().loadMarketDemo();
            stopScene();
          }}
          className="w-full rounded-md bg-amber-500 py-2 text-xs font-bold text-black hover:bg-amber-400"
        >
          Load market scene
        </button>
      </Section>

      <Section title={`Characters · ${actors.length}`}>
        <div className="space-y-1">
          {actors.map((a) => (
            <div
              key={a.id}
              onClick={() => selectActor(a.id)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md border p-2",
                selectedActorId === a.id ? "border-cyan-500/50 bg-cyan-500/10" : "border-white/5 bg-white/[0.03] hover:border-white/15",
              )}
            >
              <div
                className="h-7 w-7 shrink-0 rounded-md"
                style={{ background: `linear-gradient(135deg, ${a.config.top}, ${a.config.skin})` }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-semibold text-slate-100">
                  {a.name}
                  {a.id === playerId && <span className="ml-1 rounded bg-emerald-500/20 px-1 text-[9px] text-emerald-300">YOU</span>}
                </div>
                <div className="truncate text-[9px] text-slate-500">
                  {a.id === playerId ? "Controlled by keyboard" : `${a.queue.length} command${a.queue.length === 1 ? "" : "s"} · NPC`}
                </div>
              </div>
              <button
                title="Control this character with the keyboard"
                onClick={(e) => {
                  e.stopPropagation();
                  setPlayer(a.id);
                }}
                className={cn("rounded p-1", a.id === playerId ? "text-emerald-300" : "text-slate-500 hover:bg-white/10 hover:text-slate-200")}
              >
                <Crown className="h-3.5 w-3.5" />
              </button>
              {a.id !== playerId && (
                <button
                  title="Remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeActor(a.id);
                  }}
                  className="rounded p-1 text-slate-500 hover:bg-red-500/20 hover:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-600">Crown = control this character with WASD. Other characters follow their command lists in the Script tab.</p>
      </Section>

      <Section title={`Add NPC · ${HUMANS.length} people & memeoji`}>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setLimit(PAGE);
          }}
          placeholder="Search by name or category…"
          className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-amber-400/60"
        />
        <div className="space-y-1">
          {list.slice(0, limit).map((c) => (
            <button
              key={c.id}
              onClick={() => addActor(c.id)}
              className="flex w-full items-center gap-2 rounded-md border border-white/5 bg-white/[0.03] px-2 py-1.5 text-left hover:border-white/20 hover:bg-white/[0.06]"
            >
              <span className="text-base">{c.emoji}</span>
              <span className="min-w-0 flex-1 truncate text-[11px] text-slate-200">{c.name}</span>
              <span className="text-[9px] text-slate-500">{c.category}</span>
            </button>
          ))}
        </div>
        {list.length > limit && (
          <button onClick={() => setLimit((l) => l + PAGE)} className="w-full rounded-md border border-white/10 py-1.5 text-[11px] text-slate-300 hover:bg-white/5">
            Show more ({list.length - limit} left)
          </button>
        )}
      </Section>
    </div>
  );
}
