import { useState as useLocalState } from "react";
import { Copy, Crown, Trash2 } from "lucide-react";
import { useStore } from "../store";
import { usePlayback } from "../playback";
import { ACTION_MAP, actionsForRig, STYLES, INTENSITIES, SPEEDS } from "../lib/motions";
import { EXPRESSIONS } from "../three/rigs";
import { cn } from "../utils/cn";
import { ColorInput, Field, NumberInput, Section, Select, Slider, Toggle } from "./ui-kit";
import { MocapPanel } from "./MocapPanel";
import type { CharacterConfig, Clip, SceneCharacter } from "../lib/types";
import { getEmotionVoiceTuning, getSystemVoices, speakBrowser } from "../twod/speech2d";

const HATS = [
  { value: 0, label: "None" }, { value: 1, label: "Cap" }, { value: 2, label: "Top hat" }, { value: 3, label: "Crown" },
  { value: 4, label: "Beanie" }, { value: 5, label: "Cowboy" }, { value: 6, label: "Party cone" }, { value: 7, label: "Wizard" },
  { value: 8, label: "Antenna" }, { value: 9, label: "Halo" },
];
const HAIR = [
  { value: 0, label: "Bald" }, { value: 1, label: "Short" }, { value: 2, label: "Long" },
  { value: 3, label: "Spiky" }, { value: 4, label: "Bun" }, { value: 5, label: "Afro" },
];
const ACCESSORIES = [
  { value: 0, label: "None" }, { value: 1, label: "Glasses" }, { value: 2, label: "Bow tie" }, { value: 3, label: "Cape" },
  { value: 4, label: "Backpack" }, { value: 5, label: "Headphones" }, { value: 6, label: "Scarf" },
];
const EARS = [
  { value: 0, label: "Pointy" }, { value: 1, label: "Round" }, { value: 2, label: "Floppy" }, { value: 3, label: "Long" },
];
const TAILS = [
  { value: 1, label: "Long" }, { value: 2, label: "Short" }, { value: 3, label: "Stub" }, { value: 4, label: "Fluffy" }, { value: 5, label: "Curly" },
];
const EXPR = Object.keys(EXPRESSIONS).filter((e) => e !== "talk").map((e) => ({ value: e, label: e[0].toUpperCase() + e.slice(1) }));

export function RightPanel() {
  const tab = useStore((s) => s.rightTab);
  const setTab = useStore((s) => s.setRightTab);
  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-l border-white/5 bg-[#0d0f15]">
      <div className="grid grid-cols-2 gap-0.5 border-b border-white/5 p-1.5">
        {(["inspector", "mocap"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md py-2 text-xs font-semibold capitalize transition",
              tab === t ? "bg-white/10 text-white" : "text-slate-500 hover:bg-white/5 hover:text-slate-300",
            )}
          >
            {t === "mocap" ? "🎥 Motion capture" : "🎛️ Inspector"}
          </button>
        ))}
      </div>
      {tab === "inspector" ? <Inspector /> : <MocapPanel />}
    </aside>
  );
}

function Inspector() {
  const selectedId = useStore((s) => s.selectedCharId);
  const character = useStore((s) => s.characters.find((c) => c.id === s.selectedCharId));
  const selectedClipId = useStore((s) => s.selectedClipId);
  const clip = useStore((s) => s.clips.find((c) => c.id === s.selectedClipId));
  const captions = useStore((s) => s.captions);
  const patchCaption = useStore((s) => s.patchCaption);
  const removeCaption = useStore((s) => s.removeCaption);
  const addCaption = useStore((s) => s.addCaption);

  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
      {character ? <CharacterEditor ch={character} /> : <p className="text-[11px] text-slate-500">Select a character on the stage or in the Cast tab to edit it.</p>}

      {character && <AddMotion characterId={character.id} rig={character.config.rig} />}

      {clip && selectedClipId && <ClipEditor clip={clip} />}

      <Section
        title={`Captions · ${captions.length}`}
        right={
          <button onClick={() => addCaption("New line", Math.round(usePlayback.getState().time * 10) / 10)} className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-white/10">
            + Add
          </button>
        }
      >
        {captions.length === 0 && <p className="text-[11px] text-slate-600">Captions appear on screen (and in your exported video) at their time.</p>}
        <div className="space-y-2">
          {captions.map((cap) => (
            <div key={cap.id} className="rounded-md border border-white/5 bg-white/[0.03] p-2">
              <textarea
                value={cap.text}
                onChange={(e) => patchCaption(cap.id, { text: e.target.value })}
                rows={2}
                className="w-full resize-none rounded border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-amber-400/60"
              />
              <div className="mt-1 grid grid-cols-3 gap-1">
                <NumberInput value={cap.start} step={0.1} min={0} onChange={(v) => patchCaption(cap.id, { start: Math.max(0, v) })} />
                <NumberInput value={cap.duration} step={0.1} min={0.2} onChange={(v) => patchCaption(cap.id, { duration: Math.max(0.2, v) })} />
                <button onClick={() => removeCaption(cap.id)} className="flex items-center justify-center rounded bg-red-500/15 text-red-300 hover:bg-red-500/25">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <div className="mt-0.5 grid grid-cols-3 text-[9px] text-slate-600">
                <span>start (s)</span>
                <span>length (s)</span>
                <span className="text-center">delete</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {!selectedId && <div className="h-2" />}
    </div>
  );
}

function CharacterEditor({ ch }: { ch: SceneCharacter }) {
  const patchCharacter = useStore((s) => s.patchCharacter);
  const patchConfig = useStore((s) => s.patchConfig);
  const removeCharacter = useStore((s) => s.removeCharacter);
  const duplicateCharacter = useStore((s) => s.duplicateCharacter);
  const setMocapTarget = useStore((s) => s.setMocapTarget);
  const mocapTarget = useStore((s) => s.mocapTargetId);
  const c = ch.config;
  const cfg = (patch: Partial<CharacterConfig>) => patchConfig(ch.id, patch);

  return (
    <Section title="Character">
      <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2.5">
        <input
          value={ch.name}
          onChange={(e) => patchCharacter(ch.id, { name: e.target.value })}
          className="w-full rounded border border-transparent bg-transparent px-1 text-xs font-semibold text-slate-100 outline-none focus:border-white/15"
        />
        <div className="px-1 text-[10px] uppercase tracking-wider text-slate-500">
          {ch.category} · {c.rig}
          {c.species ? ` · ${c.species}` : ""}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Position X">
          <NumberInput value={+ch.position[0].toFixed(2)} step={0.1} onChange={(v) => patchCharacter(ch.id, { position: [v, ch.position[1], ch.position[2]] })} />
        </Field>
        <Field label="Position Z">
          <NumberInput value={+ch.position[2].toFixed(2)} step={0.1} onChange={(v) => patchCharacter(ch.id, { position: [ch.position[0], ch.position[1], v] })} />
        </Field>
      </div>
      <Slider label="Facing (rotation)" value={ch.rotationY} min={-Math.PI} max={Math.PI} step={0.01} onChange={(v) => patchCharacter(ch.id, { rotationY: v })} format={(v) => `${Math.round((v * 180) / Math.PI)}°`} />
      <Slider label="Height" value={c.height} min={0.6} max={1.3} step={0.01} onChange={(v) => cfg({ height: v })} />
      <Slider label="Build" value={c.build} min={0.7} max={1.5} step={0.01} onChange={(v) => cfg({ build: v })} />
      {c.rig === "human" && <Slider label="Head size (memeoji)" value={c.headScale} min={0.8} max={2.5} step={0.01} onChange={(v) => cfg({ headScale: v })} />}

      <div className="space-y-2 rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
        {c.rig === "human" && (
          <>
            <Field label="Skin"><ColorInput value={c.skin} onChange={(v) => cfg({ skin: v })} /></Field>
            <Field label="Hair color"><ColorInput value={c.hair} onChange={(v) => cfg({ hair: v })} /></Field>
            <Field label="Shirt"><ColorInput value={c.top} onChange={(v) => cfg({ top: v })} /></Field>
            <Field label="Pants"><ColorInput value={c.bottom} onChange={(v) => cfg({ bottom: v })} /></Field>
            <Field label="Shoes"><ColorInput value={c.shoes} onChange={(v) => cfg({ shoes: v })} /></Field>
            <Field label="Hair style"><Select value={c.hairStyle} onChange={(v) => cfg({ hairStyle: v })} options={HAIR} /></Field>
            <Field label="Hat"><Select value={c.hat} onChange={(v) => cfg({ hat: v })} options={HATS} /></Field>
            <Field label="Hat color"><ColorInput value={c.hatColor} onChange={(v) => cfg({ hatColor: v })} /></Field>
            <Field label="Accessory"><Select value={c.accessory} onChange={(v) => cfg({ accessory: v })} options={ACCESSORIES} /></Field>
            <Field label="Accessory color"><ColorInput value={c.accessoryColor} onChange={(v) => cfg({ accessoryColor: v })} /></Field>
            <div className="grid grid-cols-3 gap-1">
              <Toggle label="Wings" checked={c.wings} onChange={(v) => cfg({ wings: v })} />
              <Toggle label="Horns" checked={c.horns} onChange={(v) => cfg({ horns: v })} />
              <Toggle label="Tail" checked={c.tail} onChange={(v) => cfg({ tail: v })} />
            </div>
          </>
        )}
        {c.rig === "quadruped" && (
          <>
            <Field label="Body"><ColorInput value={c.bodyColor} onChange={(v) => cfg({ bodyColor: v })} /></Field>
            <Field label="Belly"><ColorInput value={c.bellyColor} onChange={(v) => cfg({ bellyColor: v })} /></Field>
            <Field label="Ears"><Select value={c.earStyle} onChange={(v) => cfg({ earStyle: v })} options={EARS} /></Field>
            <Field label="Tail"><Select value={c.tailStyle} onChange={(v) => cfg({ tailStyle: v })} options={TAILS} /></Field>
            <Slider label="Snout length" value={c.snout} min={0} max={1} step={0.01} onChange={(v) => cfg({ snout: v })} />
            <div className="grid grid-cols-3 gap-1">
              <Toggle label="Spots" checked={c.spots} onChange={(v) => cfg({ spots: v })} />
              <Toggle label="Horns" checked={c.horns} onChange={(v) => cfg({ horns: v })} />
              <Toggle label="Wings" checked={c.wings} onChange={(v) => cfg({ wings: v })} />
            </div>
          </>
        )}
        {c.rig === "blob" && (
          <>
            <Field label="Slime color"><ColorInput value={c.bodyColor} onChange={(v) => cfg({ bodyColor: v })} /></Field>
            <Field label="Eyes">
              <Select value={c.blobEyes} onChange={(v) => cfg({ blobEyes: v })} options={[{ value: 1, label: "One eye" }, { value: 2, label: "Two eyes" }, { value: 3, label: "Three eyes" }]} />
            </Field>
            <Toggle label="Spikes" checked={c.spikes} onChange={(v) => cfg({ spikes: v })} />
          </>
        )}
        <Field label="Eye color"><ColorInput value={c.eyeColor} onChange={(v) => cfg({ eyeColor: v })} /></Field>
      </div>

      <div className="space-y-2 rounded-lg border border-violet-500/30 bg-violet-950/20 p-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
            🗣️ Character Voice & Accent
          </span>
          <button
            onClick={() => {
              speakBrowser(`Hello! My name is ${ch.name}.`, {
                preset: ch.voicePreset ?? (ch.config.rig === "human" ? "female" : "cartoon"),
                pitch: ch.voicePitch,
                rate: ch.voiceRate,
                voiceURI: ch.voiceURI,
                expression: "happy",
              });
            }}
            className="flex items-center gap-1 rounded bg-violet-600/40 px-2 py-0.5 text-[10px] font-semibold text-violet-200 hover:bg-violet-600/60 transition-colors"
            title="Test character speech"
          >
            🔊 Test Voice
          </button>
        </div>
        <Field label="Voice Model">
          <Select
            value={ch.voicePreset ?? (ch.config.rig === "human" ? "female" : "cartoon")}
            onChange={(v) => patchCharacter(ch.id, { voicePreset: v as any })}
            options={[
              { value: "female", label: "👩 Female / Cheerful (Ava)" },
              { value: "male", label: "👨 Deep Male / Confident (Ben)" },
              { value: "kid", label: "🧒 Child / High Pitch" },
              { value: "monk", label: "🧓 Monk / Wise Elder" },
              { value: "robot", label: "🤖 Robot / Sci-Fi" },
              { value: "cartoon", label: "🐿️ Cartoon / Squeaky" },
            ]}
          />
        </Field>
        {typeof window !== "undefined" && getSystemVoices().length > 0 && (
          <Field label="Specific Voice (Optional)">
            <select
              value={ch.voiceURI ?? ""}
              onChange={(e) => patchCharacter(ch.id, { voiceURI: e.target.value || undefined })}
              className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-slate-200 outline-none focus:border-violet-400 truncate"
            >
              <option value="">(Auto: Best Matching Neural Voice)</option>
              {getSystemVoices().map((v) => (
                <option key={v.voiceURI || v.name} value={v.voiceURI || v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Slider
            label="Pitch"
            value={ch.voicePitch ?? 1.0}
            min={0.5}
            max={2.0}
            step={0.05}
            onChange={(v) => patchCharacter(ch.id, { voicePitch: v })}
            format={(v) => `${v.toFixed(2)}×`}
          />
          <Slider
            label="Speed"
            value={ch.voiceRate ?? 1.0}
            min={0.6}
            max={1.6}
            step={0.05}
            onChange={(v) => patchCharacter(ch.id, { voiceRate: v })}
            format={(v) => `${v.toFixed(2)}×`}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setMocapTarget(mocapTarget === ch.id ? null : ch.id)}
          disabled={c.rig !== "human"}
          className={cn("flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold disabled:opacity-40", mocapTarget === ch.id ? "bg-cyan-500 text-black" : "bg-white/5 text-slate-200 hover:bg-white/10")}
        >
          <Crown className="h-3 w-3" /> {mocapTarget === ch.id ? "Mocap target" : "Set as mocap target"}
        </button>
        <button onClick={() => duplicateCharacter(ch.id)} className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1.5 text-[11px] text-slate-200 hover:bg-white/10">
          <Copy className="h-3 w-3" /> Duplicate
        </button>
        <button onClick={() => removeCharacter(ch.id)} className="flex items-center gap-1 rounded-md bg-red-500/15 px-2 py-1.5 text-[11px] text-red-300 hover:bg-red-500/25">
          <Trash2 className="h-3 w-3" /> Remove
        </button>
      </div>
    </Section>
  );
}

function AddMotion({ characterId, rig }: { characterId: string; rig: SceneCharacter["config"]["rig"] }) {
  const addClip = useStore((s) => s.addClip);
  const actions = actionsForRig(rig);
  const [actionId, setActionId] = useLocalState(actions[0]?.id ?? "");
  const [style, setStyle] = useLocalState("normal");
  const [intensity, setIntensity] = useLocalState(1);
  const [speed, setSpeed] = useLocalState(1);
  const [duration, setDuration] = useLocalState(3);
  const [variant, setVariant] = useLocalState(0);
  const [mirror, setMirror] = useLocalState(false);
  const [expression, setExpression] = useLocalState("happy");
  const [talk, setTalk] = useLocalState(false);
  const validAction = actions.find((a) => a.id === actionId) ? actionId : actions[0]?.id ?? "";

  return (
    <Section title="Add motion at playhead">
      <div className="space-y-2 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] p-2.5">
        <Field label="Action">
          <Select value={validAction} onChange={setActionId} options={actions.map((a) => ({ value: a.id, label: `${a.cat} · ${a.name}` }))} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Style">
            <Select value={style} onChange={setStyle} options={STYLES.map((s) => ({ value: s.id, label: s.name }))} />
          </Field>
          <Field label="Variant">
            <Select value={variant} onChange={setVariant} options={[0, 1, 2, 3].map((v) => ({ value: v, label: `Phase ${v + 1}` }))} />
          </Field>
        </div>
        <Slider label="Intensity" value={intensity} min={INTENSITIES[0]} max={INTENSITIES[INTENSITIES.length - 1]} step={0.05} onChange={setIntensity} />
        <Slider label="Speed" value={speed} min={SPEEDS[0]} max={SPEEDS[SPEEDS.length - 1]} step={0.05} onChange={setSpeed} format={(v) => `${v.toFixed(2)}×`} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Length (s)">
            <NumberInput value={duration} min={0.2} step={0.1} onChange={(v) => setDuration(Math.max(0.2, v))} />
          </Field>
          <Field label="Expression">
            <Select value={expression} onChange={setExpression} options={EXPR} />
          </Field>
        </div>
        <div className="flex gap-3">
          <Toggle label="Mirror" checked={mirror} onChange={setMirror} />
          <Toggle label="Talking" checked={talk} onChange={setTalk} />
        </div>
        <button
          disabled={!validAction}
          onClick={() => {
            const t = usePlayback.getState().time;
            addClip({
              characterId,
              start: Math.round(t * 10) / 10,
              duration,
              kind: "action",
              actionId: validAction,
              style,
              intensity,
              speed,
              mirror,
              variant,
              expression: rig === "human" ? expression : "neutral",
              talk,
            });
          }}
          className="w-full rounded-md bg-cyan-500 py-2 text-xs font-bold text-black hover:bg-cyan-400 disabled:opacity-40"
        >
          + Add to timeline
        </button>
      </div>
    </Section>
  );
}

function ClipEditor({ clip }: { clip: Clip }) {
  const patchClip = useStore((s) => s.patchClip);
  const removeClip = useStore((s) => s.removeClip);
  const takes = useStore((s) => s.takes);
  const take = takes.find((t) => t.id === clip.takeId);
  const actions = actionsForRig(useStore.getState().characters.find((c) => c.id === clip.characterId)?.config.rig ?? "human");
  const action = ACTION_MAP[clip.actionId ?? ""];

  return (
    <Section
      title={`Selected clip · ${clip.kind === "footage" ? "video footage" : clip.kind === "take" ? "mocap take" : action?.name ?? "motion"}`}
      right={
        <button onClick={() => removeClip(clip.id)} className="rounded bg-red-500/15 px-2 py-0.5 text-[10px] text-red-300 hover:bg-red-500/25">
          Delete
        </button>
      }
    >
      <div className="space-y-2 rounded-lg border border-white/5 bg-white/[0.03] p-2.5">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Start (s)">
            <NumberInput value={clip.start} min={0} step={0.1} onChange={(v) => patchClip(clip.id, { start: Math.max(0, v) })} />
          </Field>
          <Field label="Length (s)">
            <NumberInput value={clip.duration} min={0.2} step={0.1} onChange={(v) => patchClip(clip.id, { duration: Math.max(0.2, v) })} />
          </Field>
        </div>
        {clip.kind === "footage" ? (
          <p className="text-[11px] text-sky-200">
            Video footage: {clip.label ?? "clip"}. It fills the film viewport while this clip plays and is included in exports. Sound is not included.
          </p>
        ) : clip.kind === "take" ? (
          <p className="text-[11px] text-fuchsia-200">Playing recorded take: {take ? take.name : "(take not found — it was recorded in an earlier session)"}</p>
        ) : (
          <>
            <Field label="Action">
              <Select value={clip.actionId ?? ""} onChange={(v) => patchClip(clip.id, { actionId: v })} options={actions.map((a) => ({ value: a.id, label: `${a.cat} · ${a.name}` }))} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Style">
                <Select value={clip.style ?? "normal"} onChange={(v) => patchClip(clip.id, { style: v })} options={STYLES.map((s) => ({ value: s.id, label: s.name }))} />
              </Field>
              <Field label="Variant">
                <Select value={clip.variant ?? 0} onChange={(v) => patchClip(clip.id, { variant: v })} options={[0, 1, 2, 3].map((v) => ({ value: v, label: `Phase ${v + 1}` }))} />
              </Field>
            </div>
            <Slider label="Intensity" value={clip.intensity ?? 1} min={INTENSITIES[0]} max={INTENSITIES[INTENSITIES.length - 1]} step={0.05} onChange={(v) => patchClip(clip.id, { intensity: v })} />
            <Slider label="Speed" value={clip.speed ?? 1} min={SPEEDS[0]} max={SPEEDS[SPEEDS.length - 1]} step={0.05} onChange={(v) => patchClip(clip.id, { speed: v })} format={(v) => `${v.toFixed(2)}×`} />
            <Toggle label="Mirror (flip left/right)" checked={!!clip.mirror} onChange={(v) => patchClip(clip.id, { mirror: v })} />
          </>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Expression">
            <Select value={clip.expression ?? "neutral"} onChange={(v) => patchClip(clip.id, { expression: v })} options={EXPR} />
          </Field>
          <div className="pt-4">
            <Toggle label="Talking (mouth moves)" checked={!!clip.talk} onChange={(v) => patchClip(clip.id, { talk: v })} />
          </div>
        </div>

        {/* Walk / Translation Path (just like in 2D) */}
        <div className="space-y-2 rounded-lg border border-amber-500/25 bg-amber-950/15 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-300">🚶 Walk / Movement Path</span>
            <Toggle
              label={clip.targetX !== undefined ? "Active" : "Off"}
              checked={clip.targetX !== undefined}
              onChange={(v) => {
                if (v) {
                  const ch = useStore.getState().characters.find((c) => c.id === clip.characterId);
                  const startX = ch?.position[0] ?? 0;
                  const startZ = ch?.position[2] ?? 0;
                  patchClip(clip.id, {
                    startX,
                    startZ,
                    targetX: startX + 3,
                    targetZ: startZ,
                  });
                } else {
                  patchClip(clip.id, {
                    startX: undefined,
                    startZ: undefined,
                    targetX: undefined,
                    targetZ: undefined,
                  });
                }
              }}
            />
          </div>
          {clip.targetX !== undefined && (
            <div className="space-y-2 pt-1 text-[11px]">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Start X (m)">
                  <NumberInput
                    value={clip.startX ?? 0}
                    step={0.5}
                    onChange={(v) => patchClip(clip.id, { startX: v })}
                  />
                </Field>
                <Field label="Start Z (m)">
                  <NumberInput
                    value={clip.startZ ?? 0}
                    step={0.5}
                    onChange={(v) => patchClip(clip.id, { startZ: v })}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Target X (m)">
                  <NumberInput
                    value={clip.targetX ?? 0}
                    step={0.5}
                    onChange={(v) => patchClip(clip.id, { targetX: v })}
                  />
                </Field>
                <Field label="Target Z (m)">
                  <NumberInput
                    value={clip.targetZ ?? 0}
                    step={0.5}
                    onChange={(v) => patchClip(clip.id, { targetZ: v })}
                  />
                </Field>
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const ch = useStore.getState().characters.find((c) => c.id === clip.characterId);
                    if (ch) patchClip(clip.id, { startX: ch.position[0], startZ: ch.position[2] });
                  }}
                  className="rounded bg-white/10 px-2 py-1 text-[10px] text-slate-200 hover:bg-white/20"
                >
                  📍 Set Current as Start
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ch = useStore.getState().characters.find((c) => c.id === clip.characterId);
                    if (ch) patchClip(clip.id, { targetX: ch.position[0], targetZ: ch.position[2] });
                  }}
                  className="rounded bg-white/10 px-2 py-1 text-[10px] text-slate-200 hover:bg-white/20"
                >
                  🎯 Set Current as Target
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sx = clip.startX ?? 0;
                    patchClip(clip.id, { targetX: sx + 3 });
                  }}
                  className="rounded bg-white/10 px-2 py-1 text-[10px] text-slate-200 hover:bg-white/20"
                >
                  ⏩ +3m Forward
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1.5 rounded-lg border border-cyan-500/25 bg-cyan-950/20 p-2.5">
          <Field label="Speech Bubble / Dialogue">

            <input
              value={clip.say ?? ""}
              onChange={(e) => patchClip(clip.id, { say: e.target.value, talk: true })}
              placeholder="e.g. Look at that in 3D!"
              className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-[11px] text-slate-100 outline-none focus:border-cyan-400"
            />
          </Field>
          {clip.say?.trim() && (
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between px-1 text-[10px]">
                <span className="text-cyan-300/80">Vocal Emotion:</span>
                <span className="font-semibold text-cyan-300">
                  {getEmotionVoiceTuning(clip.expression).label}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const char = useStore.getState().characters.find((c) => c.id === clip.characterId);
                    speakBrowser(clip.say ?? "", {
                      preset: char?.voicePreset ?? (char?.config.rig === "human" ? "female" : "cartoon"),
                      pitch: char?.voicePitch,
                      rate: char?.voiceRate,
                      lang: "en",
                      voiceURI: char?.voiceURI,
                      expression: clip.expression,
                    });
                  }}
                  className="flex-1 flex items-center justify-center gap-1 rounded bg-white/10 py-1.5 text-[10.5px] font-semibold text-white hover:bg-white/20 transition-colors"
                  title="Preview emotional speech synthesis in 3D"
                >
                  🔊 Preview Voice
                </button>
                <button
                  onClick={() => {
                    const addCaption = useStore.getState().addCaption;
                    addCaption(clip.say ?? "", clip.start);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 rounded bg-gradient-to-r from-cyan-600 to-blue-600 py-1.5 text-[10.5px] font-semibold text-white shadow hover:brightness-110 active:scale-95 transition-all"
                  title="Add dialogue as 3D subtitles in the scene"
                >
                  💬 Add 3D Subtitle
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
