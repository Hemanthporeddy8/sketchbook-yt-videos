import { useState, type ReactNode } from "react";
import { Blocks, Box, ChevronDown, Crown, Layers, Maximize2, MousePointer2, Plus, RotateCw, Users } from "lucide-react";
import { useSandbox } from "./sandboxStore";
import { ASSET_MAP } from "./assets";
import { cn } from "../utils/cn";
import type { CamMode } from "./camera";

/* Blender-style chrome for the sandbox: menu bar, tool strip, outliner and status bar. */

interface MenuItem {
  label: string;
  hint?: string;
  run: () => void;
}

const noop = () => undefined;

export function MenuBar() {
  const [open, setOpen] = useState<string | null>(null);
  const play = useSandbox((s) => s.play);
  const menus: Record<string, MenuItem[]> = {
    File: [
      { label: "New empty scene", run: () => useSandbox.getState().clearScene() },
      { label: "Load market demo", run: () => useSandbox.getState().loadMarketDemo() },
      { label: "Reset to starter scene", run: () => useSandbox.getState().resetSandbox() },
    ],
    Edit: [
      { label: "Undo", hint: "Ctrl+Z", run: () => useSandbox.getState().undo() },
      {
        label: "Duplicate selected",
        hint: "Ctrl+D",
        run: () => {
          const s = useSandbox.getState();
          if (s.selectedId) s.duplicateObject(s.selectedId);
        },
      },
      {
        label: "Delete selected",
        hint: "Del",
        run: () => {
          const s = useSandbox.getState();
          if (s.selectedId) s.removeObject(s.selectedId);
        },
      },
      { label: "Clear all blocks", run: () => useSandbox.getState().clearBlocks() },
    ],
    Add: [
      { label: "Open add panel (assets, characters, blocks)", hint: "Shift+A", run: () => useSandbox.getState().setDrawer(true) },
      { label: "Add an NPC from the Characters tab", run: () => useSandbox.getState().setDrawer(true) },
    ],
    View: [
      { label: "Orbit (edit camera)", hint: "V", run: () => useSandbox.getState().setCamMode("orbit") },
      { label: "Fly camera", run: () => useSandbox.getState().setCamMode("fly") },
      { label: "Third-person (gaming)", run: () => useSandbox.getState().setCamMode("third") },
      { label: "First-person (FPS hands)", run: () => useSandbox.getState().setCamMode("first") },
      { label: play ? "Stop play" : "Play", hint: "P", run: () => useSandbox.getState().setPlay(!play) },
    ],
    Help: [
      { label: "Edit: Q select · W move · E rotate · R scale", run: noop },
      { label: "Play: WASD move · Shift run · Space jump", run: noop },
      { label: "Talk: walk near an NPC and press E", run: noop },
      { label: "Camera: V cycles views · wheel zooms", run: noop },
    ],
  };
  return (
    <div className="flex h-7 shrink-0 items-center gap-0.5 border-b border-black/50 bg-[#17191e] px-2 text-[11px] text-slate-300">
      <span className="mr-3 font-bold text-[#e87d0d]">Scene</span>
      {Object.keys(menus).map((name) => (
        <div key={name} className="relative">
          <button
            onClick={() => setOpen(open === name ? null : name)}
            className={cn("rounded px-2 py-0.5 hover:bg-white/10", open === name && "bg-white/10 text-white")}
          >
            {name}
          </button>
          {open === name && (
            <div className="absolute left-0 top-full z-50 mt-0.5 min-w-[260px] rounded-md border border-black/60 bg-[#24272e] py-1 shadow-2xl">
              {menus[name].map((it) => (
                <button
                  key={it.label}
                  onClick={() => {
                    setOpen(null);
                    it.run();
                  }}
                  className="flex w-full items-center justify-between gap-6 px-3 py-1 text-left hover:bg-[#e87d0d]/30"
                >
                  <span>{it.label}</span>
                  {it.hint && <span className="text-[10px] text-slate-500">{it.hint}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ToolStrip() {
  const tool = useSandbox((s) => s.tool);
  const gizmo = useSandbox((s) => s.gizmo);
  const drawerOpen = useSandbox((s) => s.drawerOpen);
  const blockColor = useSandbox((s) => s.blockColor);
  const setTool = useSandbox((s) => s.setTool);
  const setGizmo = useSandbox((s) => s.setGizmo);
  const setDrawer = useSandbox((s) => s.setDrawer);
  const setBlockColor = useSandbox((s) => s.setBlockColor);

  const btn = (active: boolean, title: string, Icon: typeof Box, onClick: () => void) => (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-md transition",
        active ? "bg-[#e87d0d] text-black shadow" : "text-slate-300 hover:bg-white/10",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-black/50 bg-[#1f2126] py-2">
      {btn(tool === "select" && gizmo === "translate", "Select & move (Q / W)", MousePointer2, () => {
        setTool("select");
        setGizmo("translate");
      })}
      {btn(tool === "select" && gizmo === "rotate", "Rotate (E)", RotateCw, () => {
        setTool("select");
        setGizmo("rotate");
      })}
      {btn(tool === "select" && gizmo === "scale", "Scale (R)", Maximize2, () => {
        setTool("select");
        setGizmo("scale");
      })}
      <div className="my-1 h-px w-7 bg-white/10" />
      {btn(drawerOpen, "Add panel (Shift+A)", Plus, () => setDrawer(!drawerOpen))}
      {btn(tool === "block", "Voxel blocks", Blocks, () => setBlockColor(blockColor))}
    </div>
  );
}

function OutGroup({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div>
      <button onClick={onToggle} className="flex w-full items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300">
        <ChevronDown className={cn("h-3 w-3 transition", !open && "-rotate-90")} />
        {label}
      </button>
      {open && children}
    </div>
  );
}

export function Outliner() {
  const actors = useSandbox((s) => s.actors);
  const objects = useSandbox((s) => s.objects);
  const playerId = useSandbox((s) => s.playerId);
  const selectedId = useSandbox((s) => s.selectedId);
  const selectedActorId = useSandbox((s) => s.selectedActorId);
  const selectObj = useSandbox((s) => s.selectObj);
  const selectActor = useSandbox((s) => s.selectActor);
  const [open, setOpen] = useState({ chars: true, objs: true });

  return (
    <div className="flex max-h-[44%] min-h-[170px] flex-col border-b border-black/40 bg-[#1f2126]">
      <div className="flex h-7 shrink-0 items-center gap-2 border-b border-black/30 px-2 text-[11px] font-semibold text-slate-300">
        <Layers className="h-3.5 w-3.5 text-slate-400" /> Outliner
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-1 text-[11px]">
        <OutGroup label={`Characters · ${actors.length}`} open={open.chars} onToggle={() => setOpen((o) => ({ ...o, chars: !o.chars }))}>
          {actors.map((a) => (
            <button
              key={a.id}
              onClick={() => selectActor(a.id)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1 text-left",
                selectedActorId === a.id ? "bg-[#e87d0d]/25 text-white" : "text-slate-300 hover:bg-white/5",
              )}
            >
              {a.id === playerId ? <Crown className="h-3 w-3 text-cyan-300" /> : <Users className="h-3 w-3 text-slate-500" />}
              <span className="min-w-0 flex-1 truncate">{a.name}</span>
              <span className="text-[9px] text-slate-500">{a.id === playerId ? "player" : a.role}</span>
            </button>
          ))}
        </OutGroup>
        <OutGroup label={`Objects · ${objects.length}`} open={open.objs} onToggle={() => setOpen((o) => ({ ...o, objs: !o.objs }))}>
          {objects.slice(0, 300).map((o) => (
            <button
              key={o.id}
              onClick={() => selectObj(o.id)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1 text-left",
                selectedId === o.id ? "bg-[#e87d0d]/25 text-white" : "text-slate-300 hover:bg-white/5",
              )}
            >
              <Box className="h-3 w-3 text-slate-500" />
              <span className="min-w-0 flex-1 truncate">{ASSET_MAP[o.assetId]?.name ?? o.assetId}</span>
              {o.mech.type !== "none" && <span className="text-[9px] text-violet-300">{o.mech.type}</span>}
            </button>
          ))}
          {objects.length > 300 && <div className="px-3 py-1 text-[10px] text-slate-600">…{objects.length - 300} more</div>}
        </OutGroup>
      </div>
    </div>
  );
}

export function StatusBar() {
  const play = useSandbox((s) => s.play);
  const camMode = useSandbox((s) => s.camMode);
  const selectedId = useSandbox((s) => s.selectedId);
  const selectedActorId = useSandbox((s) => s.selectedActorId);
  const objects = useSandbox((s) => s.objects);
  const actors = useSandbox((s) => s.actors);
  const selName = selectedActorId
    ? actors.find((a) => a.id === selectedActorId)?.name
    : selectedId
      ? ASSET_MAP[objects.find((o) => o.id === selectedId)?.assetId ?? ""]?.name
      : undefined;
  const modeLabel: Record<CamMode, string> = { orbit: "Orbit", fly: "Fly", third: "Third person", first: "First person" };
  const hint = play
    ? camMode === "fly"
      ? "Fly: WASD move · Q/E down/up · Shift fast · click view to capture mouse"
      : "WASD move · Shift run · Space jump · G grab/drop · T throw · E talk / enter car · F dance · click view for mouse look · P stop"
    : camMode === "fly"
      ? "Fly: WASD move · Q/E down/up · Shift fast · click view to capture mouse · V next view"
      : "Q select · W move · E rotate · R scale · [ ] rotate 15° · Shift+A add · P play · V camera · drag orbit · right-drag pan · wheel zoom";
  return (
    <div className="flex h-6 shrink-0 items-center gap-4 border-t border-black/50 bg-[#17191e] px-3 text-[10px] text-slate-400">
      <span className="font-semibold text-slate-200">
        {play ? "PLAY" : "EDIT"} · {modeLabel[camMode]}
      </span>
      <span className="min-w-0 flex-1 truncate">{hint}</span>
      {selName && <span className="text-[#e87d0d]">{selName}</span>}
    </div>
  );
}
