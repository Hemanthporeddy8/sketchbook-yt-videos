import { useMemo, useState } from "react";
import { Blocks, Box, Search, Trash2, Users } from "lucide-react";
import { ASSETS, ASSET_CATS, ASSET_MAP, type AssetCat } from "./assets";
import { SANDBOX_COLORS, useSandbox } from "./sandboxStore";
import { WORLDS } from "../three/Worlds";
import { cn } from "../utils/cn";
import { Section } from "../ui/ui-kit";
import { CastTab } from "./CastTab";

const PAGE = 90;

/** Blender-style Add drawer (opened with Shift+A or the Add button). Hidden when closed. */
export function SandboxLeft() {
  const open = useSandbox((s) => s.drawerOpen);
  const setDrawer = useSandbox((s) => s.setDrawer);
  const [tab, setTab] = useState<"chars" | "assets" | "blocks">("chars");
  if (!open) return null;
  return (
    <aside className="flex w-[290px] shrink-0 flex-col border-r border-black/40 bg-[#1f2126]">
      <div className="flex h-7 shrink-0 items-center justify-between border-b border-black/30 px-3 text-[11px] font-semibold text-slate-300">
        <span>Add</span>
        <button onClick={() => setDrawer(false)} className="rounded px-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
          Close
        </button>
      </div>
      <div className="grid grid-cols-3 gap-0.5 border-b border-black/30 p-1">
        {(
          [
            { id: "chars", label: "Characters", icon: Users },
            { id: "assets", label: "Assets", icon: Box },
            { id: "blocks", label: "Blocks", icon: Blocks },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md py-1.5 text-[10px] font-semibold transition",
              tab === t.id ? "bg-[#e87d0d]/20 text-[#ffb36b]" : "text-slate-500 hover:bg-white/5 hover:text-slate-300",
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>
      {tab === "chars" && <CastTab />}
      {tab === "assets" && <AssetsTab />}
      {tab === "blocks" && <BlocksTab />}
    </aside>
  );
}

function AssetsTab() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<AssetCat | "All">("All");
  const [limit, setLimit] = useState(PAGE);
  const assetId = useSandbox((s) => s.assetId);
  const tool = useSandbox((s) => s.tool);
  const setAssetId = useSandbox((s) => s.setAssetId);
  const worldId = useSandbox((s) => s.worldId);
  const setWorld = useSandbox((s) => s.setWorld);
  const setTool = useSandbox((s) => s.setTool);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return ASSETS.filter((a) => (cat === "All" || a.cat === cat) && (!term || a.name.toLowerCase().includes(term) || a.sub.toLowerCase().includes(term)));
  }, [q, cat]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 p-3">
        <select
          value={worldId}
          onChange={(e) => setWorld(e.target.value)}
          className="w-full rounded-md border border-white/10 bg-[#16181d] px-2 py-1.5 text-[11px] text-slate-100 outline-none"
          title="Sky & lighting"
        >
          {WORLDS.map((w) => (
            <option key={w.id} value={w.id}>
              {w.emoji} {w.name}
            </option>
          ))}
        </select>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
            }}
            placeholder="Search trees, walls, cars, roads…"
            className="w-full rounded-md border border-white/10 bg-black/30 py-2 pl-8 pr-2 text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#e87d0d]/60"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(["All", ...ASSET_CATS] as const).map((c) => (
            <button
              key={c}
              onClick={() => {
                setCat(c);
                setLimit(PAGE);
              }}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium transition",
                cat === c ? "border-[#e87d0d] bg-[#e87d0d]/15 text-[#ffb36b]" : "border-white/10 text-slate-400 hover:border-white/25",
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-500">
          {ASSETS.length} assets · {list.length} shown · click one, then click the ground to place it
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <div className="grid grid-cols-2 gap-1.5">
          {list.slice(0, limit).map((a) => (
            <button
              key={a.id}
              onClick={() => setAssetId(a.id)}
              className={cn(
                "rounded-md border px-2 py-2 text-left transition",
                tool === "asset" && assetId === a.id ? "border-[#e87d0d] bg-[#e87d0d]/15" : "border-white/5 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]",
              )}
            >
              <div className="text-base leading-none">{a.emoji}</div>
              <div className="mt-1 truncate text-[11px] font-semibold text-slate-100">{a.name}</div>
              <div className="truncate text-[9px] text-slate-500">
                {a.cat} · {a.sub}
                {a.vehicle ? " · drivable" : ""}
                {a.mech ? " · moves" : ""}
              </div>
            </button>
          ))}
        </div>
        {list.length > limit && (
          <button onClick={() => setLimit((l) => l + PAGE)} className="mt-2 w-full rounded-md border border-white/10 py-2 text-xs text-slate-300 hover:bg-white/5">
            Show more ({list.length - limit} left)
          </button>
        )}
        {tool !== "asset" && (
          <button onClick={() => setTool("asset")} className="mt-2 w-full rounded-md bg-[#e87d0d] py-2 text-xs font-bold text-black hover:bg-[#ff9430]">
            Place “{ASSET_MAP[assetId]?.name ?? "asset"}”
          </button>
        )}
      </div>
    </div>
  );
}

function BlocksTab() {
  const blockColor = useSandbox((s) => s.blockColor);
  const setBlockColor = useSandbox((s) => s.setBlockColor);
  const fillFloor = useSandbox((s) => s.fillFloor);
  const clearBlocks = useSandbox((s) => s.clearBlocks);
  const undo = useSandbox((s) => s.undo);
  const count = useSandbox((s) => Object.keys(s.blocks).length);
  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
      <Section title="Block palette">
        <div className="grid grid-cols-8 gap-1">
          {SANDBOX_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setBlockColor(c)}
              className={cn("h-7 rounded-md border-2 transition", blockColor === c ? "scale-105 border-white" : "border-transparent")}
              style={{ background: c }}
            />
          ))}
        </div>
      </Section>
      <Section title="How to build">
        <ul className="space-y-1 text-[11px] leading-relaxed text-slate-400">
          <li>
            <b className="text-slate-200">Left click</b> a face or the floor to place a block (cyan ghost shows where).
          </li>
          <li>
            <b className="text-slate-200">Right click</b> a block to remove it.
          </li>
          <li>Blocks are solid: you can walk on them and bump into them in Play mode.</li>
        </ul>
      </Section>
      <Section title="Quick actions">
        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={() => fillFloor(16, blockColor)} className="rounded-md bg-white/5 py-2 text-[11px] text-slate-200 hover:bg-white/10">
            Floor 16×16
          </button>
          <button onClick={() => fillFloor(32, "#4ade80")} className="rounded-md bg-white/5 py-2 text-[11px] text-slate-200 hover:bg-white/10">
            Grass 32×32
          </button>
          <button onClick={undo} className="rounded-md bg-white/5 py-2 text-[11px] text-slate-200 hover:bg-white/10">
            Undo
          </button>
          <button onClick={clearBlocks} className="flex items-center justify-center gap-1 rounded-md bg-red-500/15 py-2 text-[11px] text-red-300 hover:bg-red-500/25">
            <Trash2 className="h-3 w-3" /> Clear all
          </button>
        </div>
        <div className="text-[11px] text-slate-500">{count.toLocaleString()} blocks placed</div>
      </Section>
    </div>
  );
}
