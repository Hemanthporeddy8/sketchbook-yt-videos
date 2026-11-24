import { Plus, Trash2 } from "lucide-react";
import { useSandbox, type Behavior, type SActor } from "./sandboxStore";
import { ROLES, defaultDialogue, type DLine } from "./dialogue";
import { beginTalk } from "./scripts";
import { GESTURE_MAP } from "./actions";
import { Field, NumberInput, Section, Select, Toggle } from "../ui/ui-kit";

const BEHAVIORS: { value: Behavior; label: string }[] = [
  { value: "idle", label: "Idle (stand still)" },
  { value: "wander", label: "Wander around its spot" },
  { value: "patrol", label: "Patrol left and right" },
  { value: "vendor", label: "Vendor (stands and gestures)" },
];

const GESTURES = Object.values(GESTURE_MAP).map((g) => ({ value: g.id, label: g.id === "none" ? "(no gesture)" : g.name }));

const INPUT = "w-full rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-[#e87d0d]/70";

/** Setup for a non-player character: role, idle behaviour, start spot, greeting and conversation lines. */
export function NpcSettings({ actor }: { actor: SActor }) {
  const patchActor = useSandbox((s) => s.patchActor);
  const isPlayer = useSandbox((s) => s.playerId === actor.id);
  if (isPlayer) return null;

  const lines = actor.dialogue;
  const setLines = (next: DLine[]) => patchActor(actor.id, { dialogue: next });
  const patchLine = (i: number, p: Partial<DLine>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...p } : l)));

  return (
    <Section
      title="NPC setup"
      right={
        <button onClick={() => beginTalk(actor.id)} className="rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-200 hover:bg-cyan-500/30">
          Preview talk
        </button>
      }
    >
      <div className="space-y-2 rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
        <Field label="Role">
          <Select value={actor.role} onChange={(v) => patchActor(actor.id, { role: v })} options={ROLES.map((r) => ({ value: r, label: r }))} />
        </Field>
        <Field label="Idle behaviour (used when no command list is running)">
          <Select value={actor.behavior} onChange={(v: Behavior) => patchActor(actor.id, { behavior: v })} options={BEHAVIORS} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Wander radius (m)">
            <NumberInput value={actor.wanderRadius} min={2} step={0.5} onChange={(v) => patchActor(actor.id, { wanderRadius: Math.max(2, v) })} />
          </Field>
          <Field label="Facing (°)">
            <NumberInput
              value={Math.round((actor.startYaw * 180) / Math.PI)}
              step={15}
              onChange={(v) => patchActor(actor.id, { startYaw: (v * Math.PI) / 180 })}
            />
          </Field>
          <Field label="Start X">
            <NumberInput value={+actor.startX.toFixed(2)} step={0.5} onChange={(v) => patchActor(actor.id, { startX: v })} />
          </Field>
          <Field label="Start Z">
            <NumberInput value={+actor.startZ.toFixed(2)} step={0.5} onChange={(v) => patchActor(actor.id, { startZ: v })} />
          </Field>
        </div>
        <p className="text-[10px] text-slate-500">Drag the character in the viewport (Edit mode) to move its start spot.</p>
      </div>

      <div className="space-y-2 rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
        <Field label="Greeting (said when you start talking)">
          <input value={actor.greeting} onChange={(e) => patchActor(actor.id, { greeting: e.target.value })} className={INPUT} />
        </Field>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-slate-400">Conversation options ({lines.length})</span>
          <div className="flex gap-1">
            <button
              onClick={() => {
                const d = defaultDialogue(actor.role, actor.name);
                patchActor(actor.id, { greeting: d.greeting, dialogue: d.lines });
              }}
              className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-white/10"
            >
              Reset to role
            </button>
            <button
              onClick={() => setLines([...lines, { prompt: "New option", reply: "...", gesture: "nod" }])}
              className="flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-white/10"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
        </div>
        {lines.map((l, i) => (
          <div key={i} className="space-y-1 rounded-md border border-white/5 bg-black/20 p-2">
            <input value={l.prompt} placeholder="What you say" onChange={(e) => patchLine(i, { prompt: e.target.value })} className={INPUT} />
            <input value={l.reply} placeholder="What they answer" onChange={(e) => patchLine(i, { reply: e.target.value })} className={INPUT} />
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <Select value={l.gesture} onChange={(v) => patchLine(i, { gesture: v })} options={GESTURES} />
              </div>
              <Toggle label="Ends talk" checked={!!l.end} onChange={(v) => patchLine(i, { end: v })} />
              <button onClick={() => setLines(lines.filter((_, j) => j !== i))} className="rounded p-1 text-slate-500 hover:text-red-300">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
