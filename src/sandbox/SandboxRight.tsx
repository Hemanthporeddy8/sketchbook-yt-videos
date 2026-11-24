import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Play, Search, Square, Trash2 } from "lucide-react";
import { ASSET_MAP } from "./assets";
import { useSandbox, type Cmd, type MechType, type SActor, type SObject, type Target } from "./sandboxStore";
import { sim } from "./sim";
import { runScene, script, stopScene, testPerform } from "./scripts";
import { EXPRESSION_LIST, GESTURE_MAP, SANDBOX_ACTIONS, SANDBOX_ACTION_COUNT, STANCE_MAP } from "./actions";
import { useStore } from "../store";
import { ColorInput, Field, NumberInput, Section, Select, Slider, Toggle } from "../ui/ui-kit";
import { cn } from "../utils/cn";
import { Outliner } from "./Chrome";
import { NpcSettings } from "./NpcSettings";
import { uid } from "../lib/util";

const MECHS: { value: MechType; label: string; help: string }[] = [
  { value: "none", label: "None (static)", help: "" },
  { value: "spin", label: "Rotate", help: "Spins around its vertical axis (amount = degrees per second)" },
  { value: "oscillate", label: "Sway / swing", help: "Slides back and forth (amount = metres)" },
  { value: "bounce", label: "Bounce / jump", help: "Hops up and down (amount = height in metres)" },
  { value: "forward", label: "Move forward (loop)", help: "Travels forward and loops back (amount = loop length in metres)" },
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function SandboxRight() {
  const [tab, setTab] = useState<"inspect" | "script">("script");
  return (
    <aside className="flex w-[330px] shrink-0 flex-col border-l border-black/40 bg-[#1f2126]">
      <Outliner />
      <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-2 gap-0.5 border-b border-white/5 p-1.5">
        {(
          [
            { id: "inspect", label: "Inspector" },
            { id: "script", label: "Script & actions" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-md py-2 text-xs font-semibold transition",
              tab === t.id ? "bg-white/10 text-white" : "text-slate-500 hover:bg-white/5 hover:text-slate-300",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-3">{tab === "inspect" ? <InspectTab /> : <ScriptTab />}</div>
      </div>
    </aside>
  );
}

function InspectTab() {
  const o = useSandbox((s) => s.objects.find((x) => x.id === s.selectedId));
  const projectName = useStore((s) => s.projectName);
  const recState = useSandbox((s) => s.recState);
  return (
    <>
      {o ? <ObjectInspector o={o} /> : <p className="text-[11px] leading-relaxed text-slate-500">Select an object in the sandbox to move, rotate, recolor or give it a mechanic.</p>}

      <Section title="Recording">
        <p className="text-[11px] leading-relaxed text-slate-400">
          Records exactly what the sandbox viewport shows: builds, NPC scenes and your walking or driving. Use the <b className="text-slate-200">Record gameplay</b> button in the header. Pick 9:16 for Shorts.
        </p>
        <div className={cn("rounded-md p-2 text-[11px]", recState === "recording" ? "bg-red-500/15 text-red-300" : "bg-white/[0.03] text-slate-500")}>
          {recState === "recording" ? "● Recording — press Stop in the header when finished" : `Next file: ${projectName || "sandbox"}-sandbox.webm`}
        </div>
      </Section>

      <Section title="Controls">
        <div className="space-y-2 text-[11px] leading-relaxed text-slate-400">
          <div>
            <b className="text-emerald-300">Play mode (P)</b> — you control your character
            <ul className="ml-4 mt-1 list-disc space-y-0.5">
              <li>W / ↑ forward, S / ↓ back, A / ← left, D / → right — relative to the camera, so the way you see it is the way you move</li>
              <li>Shift: run · Space: jump (in a car: brake / climb)</li>
              <li>G: grab the nearest item, or drop the one you're holding</li>
              <li>T: throw the item you're holding</li>
              <li>E: enter the nearest vehicle / get out</li>
              <li>F: dance</li>
              <li>Click the view to capture the mouse, then move it to look around (third and first person)</li>
            </ul>
          </div>
          <div>
            <b className="text-amber-300">Edit mode</b> — build & direct
            <ul className="ml-4 mt-1 list-disc space-y-0.5">
              <li>Click an object or character to select it; drag the gizmo to move or rotate</li>
              <li>Q/W/E/R select, move, rotate, scale · [ ] rotate 15° · Shift+A add panel · V camera view</li>
              <li>Delete removes · Ctrl+D duplicates · Ctrl+Z undoes · Esc deselects</li>
            </ul>
          </div>
        </div>
      </Section>
    </>
  );
}

function ScriptTab() {
  const actors = useSandbox((s) => s.actors);
  const selectedActorId = useSandbox((s) => s.selectedActorId);
  const running = useSandbox((s) => s.scriptRunning);
  const repeat = useSandbox((s) => s.scriptRepeat);
  const setRepeat = useSandbox((s) => s.setScriptRepeat);
  const a = actors.find((x) => x.id === selectedActorId);
  return (
    <>
      <Section title="Scene">
        <div className="flex gap-1.5">
          {running ? (
            <button onClick={() => stopScene()} className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-red-500/20 py-2 text-xs font-bold text-red-200 hover:bg-red-500/30">
              <Square className="h-3.5 w-3.5" /> Stop scene
            </button>
          ) : (
            <button onClick={() => runScene()} className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-500 py-2 text-xs font-bold text-black hover:bg-emerald-400">
              <Play className="h-3.5 w-3.5" /> Run scene
            </button>
          )}
        </div>
        <Toggle label="Loop command lists" checked={repeat} onChange={setRepeat} />
        <p className="text-[10px] leading-relaxed text-slate-500">
          Every NPC runs its own command list at the same time. Stop resets everyone to their start spot. Record the viewport to capture the scene.
        </p>
      </Section>

      {a ? (
        <>
          <NpcSettings actor={a} />
          <ActorScript actor={a} />
        </>
      ) : (
        <p className="text-[11px] leading-relaxed text-slate-500">
          Click a character in the viewport, or pick one in the Cast tab, to give it commands and actions.
        </p>
      )}
    </>
  );
}

function ActorScript({ actor }: { actor: SActor }) {
  const playerId = useSandbox((s) => s.playerId);
  const actors = useSandbox((s) => s.actors);
  const objects = useSandbox((s) => s.objects);
  const removeCmd = useSandbox((s) => s.removeCmd);
  const moveCmd = useSandbox((s) => s.moveCmd);
  const clearQueue = useSandbox((s) => s.clearQueue);
  const [expr, setExpr] = useState("neutral");
  const isPlayer = actor.id === playerId;

  return (
    <>
      <Section
        title={`${actor.name}${isPlayer ? " · you" : ""}`}
        right={
          <button onClick={() => clearQueue(actor.id)} className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-white/10">
            Clear
          </button>
        }
      >
        {isPlayer && (
          <p className="text-[10px] text-amber-300/80">
            You control this character with the keyboard, so its command list is not used. Set another character as "you" in the Cast tab to direct this one.
          </p>
        )}
        <div className="space-y-1">
          {actor.queue.length === 0 && <p className="text-[11px] text-slate-600">No commands yet. Add one below.</p>}
          {actor.queue.map((c, i) => (
            <div key={c.id} className="flex items-center gap-1 rounded-md border border-white/5 bg-white/[0.03] px-2 py-1.5 text-[11px]">
              <span className="w-4 shrink-0 text-slate-500">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-slate-200">{describeCmd(c, actors, objects)}</span>
              <button onClick={() => moveCmd(actor.id, i, -1)} className="rounded p-0.5 text-slate-500 hover:text-slate-200" title="Move up">
                <ArrowUp className="h-3 w-3" />
              </button>
              <button onClick={() => moveCmd(actor.id, i, 1)} className="rounded p-0.5 text-slate-500 hover:text-slate-200" title="Move down">
                <ArrowDown className="h-3 w-3" />
              </button>
              <button onClick={() => removeCmd(actor.id, i)} className="rounded p-0.5 text-slate-500 hover:text-red-300" title="Remove">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </Section>

      <AddCommand actor={actor} />
      <ActionLibrary actor={actor} />

      <Section title="Facial expression">
        <p className="text-[10px] text-slate-500">Changes the face right away. Add an "Expression" command to change it during a scene.</p>
        <Select
          value={expr}
          onChange={(v) => {
            setExpr(v);
            script.expr.set(actor.id, v);
          }}
          options={EXPRESSION_LIST.map((e) => ({ value: e, label: cap(e) }))}
        />
      </Section>
    </>
  );
}

type Kind = "point" | "actor" | "player" | "object";

const CMD_TYPES: { value: Cmd["type"]; label: string }[] = [
  { value: "walk", label: "Walk to" },
  { value: "follow", label: "Follow" },
  { value: "face", label: "Face" },
  { value: "perform", label: "Perform action" },
  { value: "say", label: "Say (speech bubble)" },
  { value: "grab", label: "Grab item" },
  { value: "drop", label: "Drop item" },
  { value: "throw", label: "Throw item" },
  { value: "wait", label: "Wait" },
  { value: "expression", label: "Change expression" },
];

function AddCommand({ actor }: { actor: SActor }) {
  const actors = useSandbox((s) => s.actors);
  const objects = useSandbox((s) => s.objects);
  const addCmd = useSandbox((s) => s.addCmd);
  const [type, setType] = useState<Cmd["type"]>("walk");
  const [kind, setKind] = useState<Kind>("point");
  const [px, setPx] = useState(0);
  const [pz, setPz] = useState(0);
  const [tid, setTid] = useState("");
  const [secs, setSecs] = useState(3);
  const [stance, setStance] = useState("stand");
  const [gesture, setGesture] = useState("wave");
  const [text, setText] = useState("Hello!");
  const [expr, setExpr] = useState("happy");
  const [objId, setObjId] = useState("");

  const others = actors.filter((x) => x.id !== actor.id);
  const objOpts = objects.slice(0, 400);
  const needsTarget = type === "walk" || type === "follow" || type === "face";
  const needsSecs = type === "follow" || type === "perform" || type === "say" || type === "wait";
  const tgtId = tid || (kind === "actor" ? others[0]?.id ?? "" : objOpts[0]?.id ?? "");

  const target = (): Target => {
    if (kind === "point") return { kind: "point", x: px, z: pz };
    if (kind === "actor") return { kind: "actor", id: tgtId };
    if (kind === "player") return { kind: "player" };
    return { kind: "object", id: tgtId };
  };

  const useMySpot = () => {
    const st = useSandbox.getState();
    const w = st.playerId ? sim.walkers.get(st.playerId) : undefined;
    if (!w) return;
    setPx(Math.round(w.x * 10) / 10);
    setPz(Math.round(w.z * 10) / 10);
    setKind("point");
  };

  const add = () => {
    const id = uid();
    let c: Cmd | null = null;
    switch (type) {
      case "walk":
        c = { id, type: "walk", target: target() };
        break;
      case "follow":
        c = { id, type: "follow", target: target(), seconds: secs };
        break;
      case "face":
        c = { id, type: "face", target: target() };
        break;
      case "perform":
        c = { id, type: "perform", stance, gesture, seconds: secs };
        break;
      case "say":
        c = { id, type: "say", text, seconds: secs };
        break;
      case "grab":
        c = { id, type: "grab", objectId: objId || null };
        break;
      case "drop":
        c = { id, type: "drop" };
        break;
      case "throw":
        c = { id, type: "throw" };
        break;
      case "wait":
        c = { id, type: "wait", seconds: secs };
        break;
      case "expression":
        c = { id, type: "expression", expression: expr };
        break;
    }
    if (c) addCmd(actor.id, c);
  };

  return (
    <Section title="Add command">
      <div className="space-y-2 rounded-lg border border-amber-400/20 bg-amber-400/[0.04] p-2.5">
        <Field label="Command">
          <Select value={type} onChange={setType} options={CMD_TYPES} />
        </Field>

        {needsTarget && (
          <>
            <Field label="Target">
              <Select<Kind>
                value={kind}
                onChange={setKind}
                options={[
                  { value: "point", label: "A spot on the ground" },
                  { value: "actor", label: "Another character" },
                  { value: "player", label: "You (the player)" },
                  { value: "object", label: "An object" },
                ]}
              />
            </Field>
            {kind === "point" && (
              <div className="grid grid-cols-3 gap-1.5">
                <NumberInput value={px} step={0.5} onChange={setPx} />
                <NumberInput value={pz} step={0.5} onChange={setPz} />
                <button onClick={useMySpot} className="rounded-md bg-white/5 text-[10px] text-slate-200 hover:bg-white/10">
                  Use my spot
                </button>
              </div>
            )}
            {kind === "actor" && (
              <Select value={tgtId} onChange={setTid} options={others.map((x) => ({ value: x.id, label: x.name }))} />
            )}
            {kind === "object" && (
              <Select
                value={tgtId}
                onChange={setTid}
                options={objOpts.map((o, i) => ({ value: o.id, label: `${ASSET_MAP[o.assetId]?.name ?? "Object"} #${i + 1}` }))}
              />
            )}
          </>
        )}

        {needsSecs && (
          <Field label="Seconds">
            <NumberInput value={secs} min={0.2} step={0.5} onChange={(v) => setSecs(Math.max(0.2, v))} />
          </Field>
        )}

        {type === "perform" && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Stance">
              <Select value={stance} onChange={setStance} options={Object.values(STANCE_MAP).map((s) => ({ value: s.id, label: s.name }))} />
            </Field>
            <Field label="Gesture">
              <Select value={gesture} onChange={setGesture} options={Object.values(GESTURE_MAP).map((g) => ({ value: g.id, label: g.id === "none" ? "(none)" : g.name }))} />
            </Field>
          </div>
        )}

        {type === "say" && (
          <Field label="Speech">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-amber-400/60"
            />
          </Field>
        )}

        {type === "grab" && (
          <Field label="Item">
            <Select
              value={objId}
              onChange={setObjId}
              options={[{ value: "", label: "Nearest grabbable item" }, ...objOpts.map((o, i) => ({ value: o.id, label: `${ASSET_MAP[o.assetId]?.name ?? "Object"} #${i + 1}` }))]}
            />
          </Field>
        )}

        {type === "expression" && (
          <Field label="Expression">
            <Select value={expr} onChange={setExpr} options={EXPRESSION_LIST.map((e) => ({ value: e, label: cap(e) }))} />
          </Field>
        )}

        <button onClick={add} className="w-full rounded-md bg-amber-500 py-2 text-xs font-bold text-black hover:bg-amber-400">
          + Add to {actor.name}
        </button>
      </div>
    </Section>
  );
}

function ActionLibrary({ actor }: { actor: SActor }) {
  const addCmd = useSandbox((s) => s.addCmd);
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(60);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return SANDBOX_ACTIONS.filter((a) => !t || a.name.toLowerCase().includes(t));
  }, [q]);

  return (
    <Section title={`Action library · ${SANDBOX_ACTION_COUNT} actions`}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setLimit(60);
          }}
          placeholder="Search: sit, wave, dance, carry, cry…"
          className="w-full rounded-md border border-white/10 bg-black/30 py-2 pl-8 pr-2 text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-amber-400/60"
        />
      </div>
      <p className="text-[10px] text-slate-500">
        {list.length} shown · <b className="text-slate-300">Test</b> plays it on {actor.name} now · <b className="text-slate-300">Add</b> puts it in the command list
      </p>
      <div className="space-y-1">
        {list.slice(0, limit).map((a) => (
          <div key={a.id} className="flex items-center gap-1 rounded-md border border-white/5 bg-white/[0.03] px-2 py-1">
            <span className="min-w-0 flex-1 truncate text-[11px] text-slate-200">{a.name}</span>
            <button onClick={() => testPerform(actor.id, a.stance, a.gesture, 6)} className="rounded bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-200 hover:bg-cyan-500/25">
              Test
            </button>
            <button
              onClick={() => addCmd(actor.id, { id: uid(), type: "perform", stance: a.stance, gesture: a.gesture, seconds: 3 })}
              className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200 hover:bg-amber-500/25"
            >
              Add
            </button>
          </div>
        ))}
      </div>
      {list.length > limit && (
        <button onClick={() => setLimit((l) => l + 60)} className="w-full rounded-md border border-white/10 py-1.5 text-[11px] text-slate-300 hover:bg-white/5">
          Show more ({list.length - limit} left)
        </button>
      )}
    </Section>
  );
}

function targetLabel(t: Target, actors: SActor[], objects: SObject[]): string {
  if (t.kind === "point") return `spot (${t.x}, ${t.z})`;
  if (t.kind === "player") return "you";
  if (t.kind === "actor") return actors.find((a) => a.id === t.id)?.name ?? "someone";
  const o = objects.find((x) => x.id === t.id);
  return o ? ASSET_MAP[o.assetId]?.name ?? "object" : "object";
}

function describeCmd(c: Cmd, actors: SActor[], objects: SObject[]): string {
  switch (c.type) {
    case "walk":
      return `Walk to ${targetLabel(c.target, actors, objects)}`;
    case "follow":
      return `Follow ${targetLabel(c.target, actors, objects)} for ${c.seconds}s`;
    case "face":
      return `Face ${targetLabel(c.target, actors, objects)}`;
    case "perform":
      return `${STANCE_MAP[c.stance]?.name ?? c.stance}${c.gesture !== "none" ? ` · ${GESTURE_MAP[c.gesture]?.name ?? c.gesture}` : ""} for ${c.seconds}s`;
    case "say":
      return `Say "${c.text}" (${c.seconds}s)`;
    case "grab": {
      if (!c.objectId) return "Grab nearest item";
      const o = objects.find((x) => x.id === c.objectId);
      return `Grab ${o ? ASSET_MAP[o.assetId]?.name ?? "item" : "item"}`;
    }
    case "drop":
      return "Drop item";
    case "throw":
      return "Throw item";
    case "wait":
      return `Wait ${c.seconds}s`;
    case "expression":
      return `Expression: ${c.expression}`;
  }
}

function ObjectInspector({ o }: { o: SObject }) {
  const patchObject = useSandbox((s) => s.patchObject);
  const removeObject = useSandbox((s) => s.removeObject);
  const duplicateObject = useSandbox((s) => s.duplicateObject);
  const a = ASSET_MAP[o.assetId];
  const setPos = (i: number, v: number) => {
    const p = [...o.position] as [number, number, number];
    p[i] = v;
    patchObject(o.id, { position: p });
  };
  const setMech = (patch: Partial<SObject["mech"]>) => patchObject(o.id, { mech: { ...o.mech, ...patch } });
  const help = MECHS.find((m) => m.value === o.mech.type)?.help ?? "";

  return (
    <>
      <Section title="Selected">
        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2.5">
          <div className="text-sm font-semibold text-slate-100">
            {a?.emoji} {a?.name}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">
            {a?.cat} · {a?.sub}
            {a?.vehicle ? " · drivable" : ""}
            {a && ["prop-crate", "prop-boxes", "prop-barrel", "prop-ball", "prop-chair", "road-cone", "bin", "mush-0", "mush-1"].includes(a.id) ? " · grabbable" : ""}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {(["X", "Y", "Z"] as const).map((lbl, i) => (
            <Field key={lbl} label={`Pos ${lbl}`}>
              <NumberInput value={+o.position[i].toFixed(2)} step={0.25} onChange={(v) => setPos(i, v)} />
            </Field>
          ))}
        </div>
        <Field label="Rotation Y (degrees)">
          <NumberInput value={Math.round((o.rotationY * 180) / Math.PI)} step={15} onChange={(v) => patchObject(o.id, { rotationY: (v * Math.PI) / 180 })} />
        </Field>
        {a?.colorable && (
          <Field label="Color">
            <ColorInput value={o.color ?? "#94a3b8"} onChange={(v) => patchObject(o.id, { color: v })} />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={() => duplicateObject(o.id)} className="flex items-center justify-center gap-1 rounded-md bg-white/5 py-1.5 text-[11px] text-slate-200 hover:bg-white/10">
            <Copy className="h-3 w-3" /> Duplicate
          </button>
          <button onClick={() => removeObject(o.id)} className="flex items-center justify-center gap-1 rounded-md bg-red-500/15 py-1.5 text-[11px] text-red-300 hover:bg-red-500/25">
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        </div>
      </Section>

      <Section title="Mechanic">
        <Field label="Motion">
          <Select value={o.mech.type} onChange={(v) => setMech({ type: v })} options={MECHS.map((m) => ({ value: m.value, label: m.label }))} />
        </Field>
        {o.mech.type !== "none" && (
          <div className="space-y-2 rounded-lg border border-violet-500/20 bg-violet-500/[0.04] p-2.5">
            <p className="text-[10px] text-violet-200/80">{help}</p>
            <Slider label="Speed" value={o.mech.speed} min={0.1} max={4} step={0.05} onChange={(v) => setMech({ speed: v })} format={(v) => `${v.toFixed(2)}×`} />
            <Slider
              label={o.mech.type === "spin" ? "Degrees / s" : o.mech.type === "bounce" ? "Height (m)" : o.mech.type === "forward" ? "Loop length (m)" : "Distance (m)"}
              value={o.mech.amount}
              min={0}
              max={o.mech.type === "spin" ? 720 : 20}
              step={o.mech.type === "spin" ? 5 : 0.1}
              onChange={(v) => setMech({ amount: v })}
              format={(v) => v.toFixed(o.mech.type === "spin" ? 0 : 1)}
            />
            {o.mech.type === "oscillate" && (
              <Field label="Axis">
                <Select
                  value={o.mech.axis}
                  onChange={(v) => setMech({ axis: v })}
                  options={[
                    { value: "x", label: "Side to side (X)" },
                    { value: "z", label: "Front to back (Z)" },
                    { value: "y", label: "Up & down (Y)" },
                  ]}
                />
              </Field>
            )}
          </div>
        )}
      </Section>
    </>
  );
}
