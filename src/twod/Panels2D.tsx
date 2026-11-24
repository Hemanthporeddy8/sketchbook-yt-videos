import { useMemo, useState, type ChangeEvent } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Copy, ImagePlus, Search, Trash2, Users } from "lucide-react";
import { useStudio2d, type Tab2D, DEFAULT_DRAFT } from "./store2d";
import type { Species } from "./types2d";
import {
  EXPRESSION_OPTIONS, ANIMAL_EXPRESSION_OPTIONS, GESTURE_OPTIONS, OBJECT_FAMILIES, OBJECT_PALETTES, OBJECT_VARIANTS,
  SCENE_KINDS, SCENE_PALETTES, DEFAULT_SCENE_PALETTE, SKIN_TONES, HAIR_COLORS, HAIR_STYLES, CLOTH, SHOE_COLORS, EYE_COLORS, BUILDS, HATS,
  STANCE_OPTIONS, SPEED_OPTIONS, INTENSITY_OPTIONS, PHASE_OPTIONS, appearanceFromIndex, appearanceCombos, motionCombos, objectCombos,
  sceneCombos, SPECIES_LIST, ANIMAL_STANCE_OPTIONS,
} from "./gen2d";
import { OBJECT_GROUND } from "./helptab";
import { ObjectArt } from "./art2d";
import { clock2d, dimsOf, groundOf } from "./anim2d";
import { SANDBOX_ACTIONS } from "../sandbox/actions";
import { isAnimal as isAnimalName } from "./gen2d";
import { Field, NumberInput, Section, Select, Slider, Toggle, Swatches } from "../ui/ui-kit";
import { cn } from "../utils/cn";
import MiniFigure from "./MiniFigure";

/* ---------------------------------------------------------------- */
/* Left panel                                                       */
/* ---------------------------------------------------------------- */

export function Studio2DLeft() {
  const tab = useStudio2d((s) => s.tab);
  const setTab = useStudio2d((s) => s.setTab);
  const [open, setOpen] = useState(true);
  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-9 shrink-0 items-center justify-center border-r border-black/40 bg-[#1f2126] py-2 text-slate-400 hover:bg-black/40 hover:text-white"
        title="Open the library (Characters / Actions / Objects / Scenes)"
      >
        <PanelLeftOpen className="h-4 w-4" />
      </button>
    );
  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-r border-black/40 bg-[#1f2126]">
      <button onClick={() => setOpen(false)} className="flex h-7 w-full items-center justify-between border-b border-black/30 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300" title="Close the library panel">
        <span>Library</span>
        <PanelLeftClose className="h-3.5 w-3.5" />
      </button>
      <div className="grid grid-cols-4 gap-0.5 border-b border-black/30 p-1">
        {(["characters", "actions", "objects", "scenes"] as Tab2D[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("rounded-md py-1.5 text-[10px] font-semibold", tab === t ? "bg-[#e87d0d]/20 text-[#ffb36b]" : "text-slate-500 hover:bg-white/5 hover:text-slate-300")}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === "characters" && <CharactersTab />}
      {tab === "actions" && <ActionsTab />}
      {tab === "objects" && <ObjectsTab />}
      {tab === "scenes" && <ScenesTab />}
    </aside>
  );
}

/* Characters ------------------------------------------------------ */

function CharactersTab() {
  const addActor = useStudio2d((s) => s.addActor);
  const addCrowd = useStudio2d((s) => s.addCrowd);
  const count = useStudio2d((s) => s.actors.length);
  const [species, setSpecies] = useState<Species>("girl");
  const sp = SPECIES_LIST.find((s) => s.id === species) ?? SPECIES_LIST[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 p-3 pb-2">
        <div className="rounded-md border border-emerald-400/25 bg-emerald-500/5 p-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Background crowd</div>
          <p className="text-[10px] leading-relaxed text-slate-400">5 small walkers in the back layer, crossing the scene from edge to edge.</p>
          <button onClick={addCrowd} className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-md bg-emerald-500/20 py-1.5 text-[11px] font-bold text-emerald-100 hover:bg-emerald-500/30">
            <Users className="h-3.5 w-3.5" /> + Background crowd
          </button>
        </div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Add a character</div>
        <div className="flex flex-wrap gap-1">
          {SPECIES_LIST.map((s) => (
            <button
              key={s.id}
              onClick={() => setSpecies(s.id)}
              className={cn("flex items-center gap-1 rounded-md border px-1.5 py-1 text-[10px]", species === s.id ? "border-[#e87d0d] bg-[#e87d0d]/15 text-white" : "border-white/10 text-slate-400 hover:border-white/25")}
              title={s.label}
            >
              {s.emoji} <span>{s.label}</span>
            </button>
          ))}
        </div>
        <div className="text-[10px] text-slate-500">
          {isAnimalName(species) ? `${species} · choose stance & expression in Actions` : `${species} · ${appearanceCombos().toLocaleString()} looks`}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {!isAnimalName(species) ? (
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 12 }, (_, i) => {
              const ap = appearanceFromIndex(i, species);
              return (
                <button key={i} onClick={() => addActor(i, 640, species)} className="flex flex-col items-center rounded-md border border-white/5 bg-white/[0.03] p-1 hover:border-[#e87d0d]/60">
                  <svg viewBox="-70 -140 140 170" className="h-14 w-12">
                    {ap.dress ? (
                      <>
                        <path d="M -34 -44 L 34 -44 L 46 30 L -46 30 Z" fill={ap.dressColor} />
                        <rect x={-40} y={-44} width={80} height={30} rx={18} fill={ap.dressColor} />
                      </>
                    ) : (
                      <rect x={-40} y={-44} width={80} height={84} rx={30} fill={ap.shirt} />
                    )}
                    <circle cx={0} cy={-70} r={40} fill={ap.skin} />
                    <path d="M -40 -80 Q 0 -128 40 -80 Q 30 -102 0 -102 Q -30 -102 -40 -80 Z" fill={ap.hair} />
                  </svg>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 9 }, (_, i) => (
              <button
                key={i}
                onClick={() => addActor(i, 640, species)}
                className="flex flex-col items-center rounded-md border border-white/5 bg-white/[0.03] p-1.5 hover:border-[#e87d0d]/60"
              >
                <span className="text-2xl">{specEmoji(species)}</span>
                <span className="text-[9px] text-slate-500">#{i + 1}</span>
              </button>
            ))}
          </div>
        )}
        <button onClick={() => addActor(Math.floor(Math.random() * 100000), 640, species)} className="mt-2 w-full rounded-md bg-[#e87d0d] py-2 text-xs font-bold text-black hover:bg-[#ff9430]">
          Randomly generated {sp.label.toLowerCase()}
        </button>
        <p className="mt-1.5 text-center text-[10px] text-slate-500">{count} on stage</p>
      </div>
    </div>
  );
}

function specEmoji(sp: string) {
  return SPECIES_LIST.find((s) => s.id === sp)?.emoji ?? "🧑";
}

/* Actions --------------------------------------------------------- */

function ActionsTab() {
  const draft = useStudio2d((s) => s.draft);
  const setDraft = useStudio2d((s) => s.setDraft);
  const selected = useStudio2d((s) => s.selected);
  const clips = useStudio2d((s) => s.clips);
  const addClip = useStudio2d((s) => s.addClip);
  const actor = useStudio2d((s) => (s.selected?.kind === "actor" ? s.actors.find((a) => a.id === s.selected?.id) : undefined));
  const actors = useStudio2d((st) => st.actors);
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(60);
  const combos = motionCombos();
  const isAnimalMode = actor ? isAnimalName(actor.species) : false;

  const actorId = selected?.kind === "actor" ? selected.id : selected?.kind === "clip" ? clips.find((c) => c.id === selected.id)?.actorId ?? null : null;

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return SANDBOX_ACTIONS.filter((a) => !t || a.name.toLowerCase().includes(t));
  }, [q]);

  const add = () => {
    if (!actorId) return;
    if (isAnimalMode) {
      addClip({
        actorId,
        start: Math.round(clock2d.t * 10) / 10,
        duration: draft.duration,
        kind: "act",
        stance: draft.stance,
        gesture: "none",
        expression: draft.expression,
        speed: draft.speed,
        intensity: draft.intensity,
        mirror: draft.mirror,
        phase: draft.phase,
        talk: false,
        say: draft.say,
      });
      return;
    }
    addClip({
      actorId,
      start: Math.round(clock2d.t * 10) / 10,
      duration: draft.duration,
      kind: "act",
      stance: draft.stance,
      gesture: draft.gesture,
      expression: draft.expression,
      speed: draft.speed,
      intensity: draft.intensity,
      mirror: draft.mirror,
      phase: draft.phase,
      talk: draft.talk,
      say: draft.say,
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-2 p-3 pb-2">
        <div className="rounded-md border border-[#e87d0d]/25 bg-[#e87d0d]/5 p-2">
          <div className="text-[10px] uppercase tracking-wider text-[#ffb36b]">Action library</div>
          <div className="text-lg font-bold text-white">{combos.total.toLocaleString()}</div>
          <div className="text-[10px] leading-relaxed text-slate-400">
            {combos.base} stance + gesture actions × {combos.expressions} expressions × speeds × intensities × mirror × phases
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(60);
            }}
            placeholder="Search: wave, sit, dance, cry…"
            className="w-full rounded-md border border-white/10 bg-black/30 py-2 pl-8 pr-2 text-xs text-slate-100 outline-none focus:border-[#e87d0d]/60"
          />
        </div>
      </div>
      <div className="min-h-[150px] flex-1 overflow-y-auto px-3">
        {isAnimalMode ? (
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500">Animal actions — the animal will play the pose while moving. Pick a pose, not a gesture.</p>
            <div className="grid grid-cols-2 gap-1">
              {ANIMAL_STANCE_OPTIONS.map((a) => (
                <button key={a.value} onClick={() => setDraft({ stance: a.value })} className={cn("rounded-md border px-2 py-1.5 text-left text-[11px]", draft.stance === a.value ? "border-[#e87d0d] bg-[#e87d0d]/15 text-white" : "border-white/5 bg-white/[0.03] text-slate-300 hover:border-white/20")}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 py-1">
            {list.slice(0, limit).map((a) => {
              const active = draft.stance === a.stance && draft.gesture === a.gesture;
              return (
                <button
                  key={a.id}
                  onClick={() => setDraft({ stance: a.stance, gesture: a.gesture })}
                  className={cn("flex items-center gap-2 rounded-md border p-1.5 text-left", active ? "border-[#e87d0d] bg-[#e87d0d]/15" : "border-white/5 bg-white/[0.03] hover:border-white/20")}
                >
                  <MiniFigure stance={a.stance} gesture={a.gesture} idle={false} />
                  <span className="min-w-0 flex-1 truncate text-[10px] text-slate-200">{a.name}</span>
                </button>
              );
            })}
          </div>
        )}
        {/* walk quick-add: target x + time */}
        {actorId && !isAnimalMode && (
          <div className="mb-2 mt-2 flex items-center gap-2 rounded-md border border-emerald-400/25 bg-emerald-500/5 p-2">
            <span className="text-[11px] text-emerald-200">🚶 Walk</span>
            <input
              id="walk-x"
              type="number"
              defaultValue={Math.round(actors.find((a) => a.id === actorId)?.x ?? 640) + 120}
              className="w-16 rounded border border-white/10 bg-black/30 px-1 py-0.5 text-[11px] text-slate-100 outline-none focus:border-emerald-400/60"
            />
            <button
              onClick={() => {
                const x = Number((document.getElementById("walk-x") as HTMLInputElement)?.value ?? 640);
                addClip({ actorId, start: Math.round(clock2d.t * 10) / 10, duration: 2.5, kind: "walk", toX: x, say: "" });
              }}
              className="ml-auto rounded-md bg-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-100 hover:bg-emerald-500/30"
            >
              + Add
            </button>
          </div>
        )}
        {!isAnimalMode && list.length > limit && (
          <button onClick={() => setLimit((l) => l + 60)} className="my-2 w-full rounded-md border border-white/10 py-1.5 text-[11px] text-slate-300 hover:bg-white/5">
            Show more ({list.length - limit} left)
          </button>
        )}
      </div>
      <div className="max-h-[52%] shrink-0 space-y-2 overflow-y-auto border-t border-black/30 p-3">
        {isAnimalMode ? (
          <>
            <Field label="Expression">
              <Select value={draft.expression} onChange={(v) => setDraft({ expression: v })} options={ANIMAL_EXPRESSION_OPTIONS} />
            </Field>
            <Field label="Speed">
              <Select value={draft.speed} onChange={(v) => setDraft({ speed: v })} options={SPEED_OPTIONS.map((v) => ({ value: v, label: `${v}×` }))} />
            </Field>
            <Field label="Length (s)">
              <NumberInput value={draft.duration} min={0.3} step={0.5} onChange={(v) => setDraft({ duration: Math.max(0.3, v) })} />
            </Field>
          </>
        ) : (
          <>
            <Field label="Expression">
              <Select value={draft.expression} onChange={(v) => setDraft({ expression: v })} options={EXPRESSION_OPTIONS} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Length (s)">
                <NumberInput value={draft.duration} min={0.3} step={0.5} onChange={(v) => setDraft({ duration: Math.max(0.3, v) })} />
              </Field>
              <Field label="Phase">
                <Select value={draft.phase} onChange={(v) => setDraft({ phase: v })} options={PHASE_OPTIONS.map((v) => ({ value: v, label: `Variant ${v + 1}` }))} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Speed">
                <Select value={draft.speed} onChange={(v) => setDraft({ speed: v })} options={SPEED_OPTIONS.map((v) => ({ value: v, label: `${v}×` }))} />
              </Field>
              <Field label="Intensity">
                <Select value={draft.intensity} onChange={(v) => setDraft({ intensity: v })} options={INTENSITY_OPTIONS.map((v) => ({ value: v, label: `${v}×` }))} />
              </Field>
            </div>
            <div className="flex gap-3">
              <Toggle label="Mirror" checked={draft.mirror} onChange={(v) => setDraft({ mirror: v })} />
              <Toggle label="Talking mouth" checked={draft.talk} onChange={(v) => setDraft({ talk: v })} />
            </div>
          </>
        )}
        <input value={draft.say} onChange={(e) => setDraft({ say: e.target.value })} placeholder="Speech bubble (optional)" className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-[#e87d0d]/70" />
        <button disabled={!actorId} onClick={add} className="w-full rounded-md bg-[#e87d0d] py-2 text-xs font-bold text-black hover:bg-[#ff9430] disabled:opacity-40">
          {actorId ? "Add to timeline at playhead" : "Select a character first"}
        </button>
        <button onClick={() => setDraft(DEFAULT_DRAFT)} className="w-full text-[10px] text-slate-500 hover:text-slate-300">
          Reset draft
        </button>
      </div>
    </div>
  );
}

/* Objects --------------------------------------------------------- */

function ObjectsTab() {
  const addObject = useStudio2d((s) => s.addObject);
  const objDraft = useStudio2d((s) => s.objDraft);
  const setObjDraft = useStudio2d((s) => s.setObjDraft);
  const aspect = useStudio2d((s) => s.aspect);
  const [, H] = dimsOf(aspect);
  const ground = groundOf(aspect);
  const [err, setErr] = useState<string | null>(null);

  const onImport = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 2_000_000) {
      setErr("Images must be under 2 MB so they can be saved with the project.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      addObject({ name: f.name.replace(/\.[^.]+$/, ""), family: -1, palette: 0, variant: 1, src: String(reader.result), x: 640, y: ground });
      setErr(null);
    };
    reader.readAsDataURL(f);
  };

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
      <Section title="Import your own art">
        <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-white/20 py-3 text-xs text-slate-200 hover:border-[#e87d0d]/60">
          <ImagePlus className="h-4 w-4" /> Import PNG / JPG / WebP / SVG
          <input type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" className="hidden" onChange={onImport} />
        </label>
        {err && <p className="text-[10px] text-red-300">{err}</p>}
      </Section>
      <Section title={`Generated objects · ${objectCombos().toLocaleString()}`}>
        <div className="flex flex-wrap gap-1">
          {OBJECT_PALETTES.map((p, i) => (
            <button key={i} onClick={() => setObjDraft({ palette: i })} className={cn("h-5 w-5 rounded-md border-2", objDraft.palette === i ? "border-white" : "border-transparent")} style={{ background: p[0] }} />
          ))}
        </div>
        <div className="flex gap-1">
          {OBJECT_VARIANTS.map((v, i) => (
            <button key={v} onClick={() => setObjDraft({ variant: i })} className={cn("flex-1 rounded-md border py-1 text-[10px]", objDraft.variant === i ? "border-[#e87d0d] text-[#ffb36b]" : "border-white/10 text-slate-400")}>
              {["Small", "Medium", "Large"][i]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {OBJECT_FAMILIES.map((name, i) => (
            <button
              key={name}
              onClick={() =>
                addObject({
                  name,
                  family: i,
                  palette: objDraft.palette,
                  variant: objDraft.variant,
                  x: 640,
                  y: OBJECT_GROUND.has(i) ? ground : Math.round(H * 0.3),
                })
              }
              className="flex flex-col items-center rounded-md border border-white/5 bg-white/[0.03] p-1 hover:border-[#e87d0d]/60"
            >
              <svg viewBox="-115 -215 230 230" className="h-12 w-12">
                <ObjectArt family={i} pal={OBJECT_PALETTES[objDraft.palette]} variant={objDraft.variant} />
              </svg>
              <span className="truncate text-[9px] text-slate-400">{name}</span>
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* Scenes ---------------------------------------------------------- */

function ScenesTab() {
  const scene = useStudio2d((s) => s.scene);
  const setScene = useStudio2d((s) => s.setScene);
  const addSceneClip = useStudio2d((s) => s.addSceneClip);
  const t = useStudio2d((s) => s.t);
  const [err, setErr] = useState<string | null>(null);

  const onImport = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 3_000_000) {
      setErr("Background images must be under 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setScene({ image: String(reader.result) });
    reader.readAsDataURL(f);
  };

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
      <Section title="Import a background image">
        <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-white/20 py-3 text-xs text-slate-200 hover:border-[#e87d0d]/60">
          <ImagePlus className="h-4 w-4" /> Import PNG / JPG / WebP
          <input type="file" accept="image/*" className="hidden" onChange={onImport} />
        </label>
        {err && <p className="text-[10px] text-red-300">{err}</p>}
        {scene.image && (
          <button onClick={() => setScene({ image: undefined })} className="w-full rounded-md bg-red-500/15 py-1.5 text-[11px] text-red-300 hover:bg-red-500/25">
            Remove imported background
          </button>
        )}
      </Section>
      <Section title={`Built-in backgrounds · ${sceneCombos()}`}>
        {!scene.image && (
          <div className="grid grid-cols-2 gap-1.5">
            {SCENE_KINDS.map((name, i) => (
              <button key={name} onClick={() => setScene({ kind: i, palette: DEFAULT_SCENE_PALETTE[i] })} className={cn("rounded-md border p-1.5 text-left text-[11px]", scene.kind === i && !scene.image ? "border-[#e87d0d] text-white" : "border-white/5 text-slate-300 hover:border-white/20")}>
                <div className="mb-1 h-8 rounded" style={{ background: `linear-gradient(${SCENE_PALETTES[DEFAULT_SCENE_PALETTE[i]][0]}, ${SCENE_PALETTES[DEFAULT_SCENE_PALETTE[i]][1]})` }} />
                {name}
              </button>
            ))}
          </div>
        )}
        {!scene.image && (
          <div className="flex flex-wrap gap-1.5">
            {SCENE_PALETTES.map((p, i) => (
              <button key={i} onClick={() => setScene({ palette: i })} className={cn("h-7 w-10 rounded-md border-2", scene.palette === i ? "border-white" : "border-transparent")} style={{ background: `linear-gradient(${p[0]}, ${p[1]} 60%, ${p[2]} 60%)` }} />
            ))}
          </div>
        )}
        <button
          onClick={() => addSceneClip({ start: Math.round(t * 10) / 10, duration: 3, kind: scene.kind, palette: DEFAULT_SCENE_PALETTE[scene.kind] ?? scene.palette })}
          className="w-full rounded-md bg-sky-500/20 py-2 text-xs font-bold text-sky-200 hover:bg-sky-500/30"
        >
          + Scene change at playhead
        </button>
        <p className="text-[10px] leading-relaxed text-slate-500">
          Scene changes live on the Scene track in the timeline. Drag the clip to move it in time — the background changes when the playhead reaches it.
        </p>
      </Section>
    </div>
  );
}

/* Inspector -------------------------------------------------------- */

export function Inspector2D() {
  const selected = useStudio2d((s) => s.selected);
  const actor = useStudio2d((s) => (s.selected?.kind === "actor" ? s.actors.find((a) => a.id === s.selected?.id) : undefined));
  const sceneClip = useStudio2d((s) => (s.selected?.kind === "clip" ? s.sceneClips.find((c) => c.id === s.selected?.id) : undefined));
  const obj = useStudio2d((s) => (s.selected?.kind === "object" ? s.objects.find((o) => o.id === s.selected?.id) : undefined));
  const clip = useStudio2d((s) => (s.selected?.kind === "clip" ? s.clips.find((c) => c.id === s.selected?.id) : undefined));
  const removeSelected = useStudio2d((s) => s.removeSelected);
  const addActor = useStudio2d((s) => s.addActor);
  const patchSceneClip = useStudio2d((s) => s.patchSceneClip);

  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-l border-black/40 bg-[#1f2126]">
      <div className="flex h-7 shrink-0 items-center border-b border-black/30 px-3 text-[11px] font-semibold text-slate-300">Properties</div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
        {!selected && (
          <div className="space-y-2 text-[11px] leading-relaxed text-slate-500">
            <p>Click a character, object or timeline clip to edit it.</p>
            <p>Click a walk clip, then click the stage, to set where the character walks to.</p>
            <button onClick={() => addActor(Math.floor(Math.random() * 100000), 640)} className="w-full rounded-md bg-white/5 py-2 text-xs text-slate-200 hover:bg-white/10">
              + Add random character
            </button>
          </div>
        )}
        {sceneClip && (
          <Section title="🎬 Scene change">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Start (s)">
                <NumberInput value={sceneClip.start} min={0} step={0.1} onChange={(v) => patchSceneClip(sceneClip.id, { start: Math.max(0, v) })} />
              </Field>
              <Field label="Length (s)">
                <NumberInput value={sceneClip.duration} min={0.2} step={0.5} onChange={(v) => patchSceneClip(sceneClip.id, { duration: Math.max(0.2, v) })} />
              </Field>
            </div>
            <Field label="Background">
              <Select
                value={sceneClip.kind}
                onChange={(v) => patchSceneClip(sceneClip.id, { kind: v })}
                options={SCENE_KINDS.map((n, i) => ({ value: i, label: n }))}
              />
            </Field>
            <Field label="Palette">
              <Select value={sceneClip.palette} onChange={(v) => patchSceneClip(sceneClip.id, { palette: v })} options={SCENE_PALETTES.map((_p, i) => ({ value: i, label: `Palette ${i + 1}` }))} />
            </Field>
            <button onClick={removeSelected} className="flex w-full items-center justify-center gap-1 rounded-md bg-red-500/15 py-1.5 text-[11px] text-red-300 hover:bg-red-500/25">
              <Trash2 className="h-3 w-3" /> Delete scene change
            </button>
          </Section>
        )}
        {actor && <ActorEditor id={actor.id} />}
        {obj && <ObjectEditor id={obj.id} />}
        {clip && <ClipEditor id={clip.id} />}
      </div>
    </aside>
  );
}

function ActorEditor({ id }: { id: string }) {
  const actor = useStudio2d((s) => s.actors.find((a) => a.id === id));
  const patchActor = useStudio2d((s) => s.patchActor);
  const setAppearance = useStudio2d((s) => s.setAppearance);
  const removeSelected = useStudio2d((s) => s.removeSelected);
  if (!actor) return null;
  const a = actor.app;
  const animal = isAnimalName(actor.species);
  const set = (p: Parameters<typeof setAppearance>[1]) => setAppearance(id, p);
  return (
    <Section title={`${actor.name} · ${SPECIES_LIST.find((s) => s.id === actor.species)?.label ?? actor.species}`}>
      <input value={actor.name} onChange={(e) => patchActor(id, { name: e.target.value })} className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-slate-100 outline-none focus:border-[#e87d0d]/70" />
      {!animal ? (
        <>
          <div className="space-y-2 rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
            <Field label="Skin">
              <Swatches colors={SKIN_TONES} value={a.skin} onPick={(v) => set({ skin: v })} />
            </Field>
            <Field label="Hair colour">
              <Swatches colors={HAIR_COLORS} value={a.hair} onPick={(v) => set({ hair: v })} />
            </Field>
            <Field label="Hair style">
              <Select value={a.hairStyle} onChange={(v) => set({ hairStyle: v })} options={HAIR_STYLES.map((n, i) => ({ value: i, label: n }))} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Beard">
                <Select value={a.beard ? 1 : 0} onChange={(v) => set({ beard: v === 1 })} options={[{ value: 0, label: "None" }, { value: 1, label: "Full beard" }]} />
              </Field>
              {a.beard && (
                <Field label="Beard colour">
                  <Swatches colors={HAIR_COLORS} value={a.beardColor} onPick={(v) => set({ beardColor: v })} />
                </Field>
              )}
            </div>
            <Field label="Shirt">
              <Swatches colors={CLOTH} value={a.shirt} onPick={(v) => set({ shirt: v })} />
            </Field>
            <Field label="Trousers">
              <Swatches colors={CLOTH} value={a.pants} onPick={(v) => set({ pants: v })} />
            </Field>
            <Field label="Shoes">
              <Swatches colors={SHOE_COLORS} value={a.shoes} onPick={(v) => set({ shoes: v })} />
            </Field>
            <Field label="Eyes">
              <Swatches colors={EYE_COLORS} value={a.eyes} onPick={(v) => set({ eyes: v })} />
            </Field>
            <Field label="Build">
              <Select value={a.build} onChange={(v) => set({ build: v })} options={BUILDS.map((b) => ({ value: b.v, label: b.label }))} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Dress">
                <Select value={a.dress ? 1 : 0} onChange={(v) => set({ dress: v === 1 })} options={[{ value: 0, label: "No" }, { value: 1, label: "Yes (dress)" }]} />
              </Field>
              {a.dress && (
                <Field label="Dress colour">
                  <Swatches colors={CLOTH} value={a.dressColor} onPick={(v) => set({ dressColor: v })} />
                </Field>
              )}
            </div>
            <Field label="Hat">
              <Select value={a.hat} onChange={(v) => set({ hat: v })} options={HATS.map((n, i) => ({ value: i, label: n }))} />
            </Field>
            <Field label="Hat colour">
              <Swatches colors={CLOTH} value={a.hatColor} onPick={(v) => set({ hatColor: v })} />
            </Field>
          </div>
        </>
      ) : (
        <div className="space-y-2 rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
          <Field label="Body colour">
            <Swatches colors={SKIN_TONES.concat(["#d97706", "#64748b", "#b33a3a"])} value={a.skin} onPick={(v) => set({ skin: v })} />
          </Field>
          <Field label="Belly / underside">
            <Swatches colors={HAIR_COLORS.concat(["#fef3c7", "#ffffff", "#fce7f3"])} value={a.hair} onPick={(v) => set({ hair: v })} />
          </Field>
          <Field label="Eyes">
            <Swatches colors={EYE_COLORS} value={a.eyes} onPick={(v) => set({ eyes: v })} />
          </Field>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Field label="X position">
          <NumberInput value={Math.round(actor.x)} step={10} onChange={(v) => patchActor(id, { x: v })} />
        </Field>
        <Field label="Facing">
          <div className="flex gap-1">
            <button onClick={() => patchActor(id, { facing: -1 })} className={cn("flex-1 rounded-md border py-1 text-[11px]", actor.facing === -1 ? "border-[#e87d0d] text-[#ffb36b]" : "border-white/10 text-slate-400")}>◀ Left</button>
            <button onClick={() => patchActor(id, { facing: 1 })} className={cn("flex-1 rounded-md border py-1 text-[11px]", actor.facing === 1 ? "border-[#e87d0d] text-[#ffb36b]" : "border-white/10 text-slate-400")}>Right ▶</button>
          </div>
        </Field>
      </div>
      <Slider label="Size" value={actor.scale} min={0.5} max={2.2} step={0.05} onChange={(v) => patchActor(id, { scale: v })} format={(v) => `${v.toFixed(2)}×`} />
      <Field label="Layer">
        <Select value={actor.depth} onChange={(v) => patchActor(id, { depth: v })} options={[{ value: 0, label: "Background (behind objects)" }, { value: 1, label: "Middle" }, { value: 2, label: "Foreground" }]} />
      </Field>
      <Toggle label="Away: remove when the character finishes its purpose" checked={!!actor.autoRemove} onChange={(v) => patchActor(id, { autoRemove: v })} />
      <button onClick={removeSelected} className="flex w-full items-center justify-center gap-1 rounded-md bg-red-500/15 py-1.5 text-[11px] text-red-300 hover:bg-red-500/25">
        <Trash2 className="h-3 w-3" /> Remove character
      </button>
    </Section>
  );
}

function ObjectEditor({ id }: { id: string }) {
  const obj = useStudio2d((s) => s.objects.find((o) => o.id === id));
  const patchObject = useStudio2d((s) => s.patchObject);
  const removeSelected = useStudio2d((s) => s.removeSelected);
  const addObject = useStudio2d((s) => s.addObject);
  if (!obj) return null;
  return (
    <Section title={`Object · ${obj.name}`}>
      <div className="grid grid-cols-2 gap-2">
        <Field label="X">
          <NumberInput value={Math.round(obj.x)} step={5} onChange={(v) => patchObject(id, { x: v })} />
        </Field>
        <Field label="Y">
          <NumberInput value={Math.round(obj.y)} step={5} onChange={(v) => patchObject(id, { y: v })} />
        </Field>
      </div>
      <Slider label="Scale" value={obj.scale} min={0.2} max={3} step={0.05} onChange={(v) => patchObject(id, { scale: v })} format={(v) => `${v.toFixed(2)}×`} />
      <Slider label="Rotation" value={obj.rotation} min={-180} max={180} step={1} onChange={(v) => patchObject(id, { rotation: v })} format={(v) => `${Math.round(v)}°`} />
      <Toggle label="Flip horizontally" checked={obj.flip} onChange={(v) => patchObject(id, { flip: v })} />
      <div className="grid grid-cols-2 gap-1.5">
        <button onClick={() => addObject({ ...obj, id: undefined, name: obj.name, x: obj.x + 60, y: obj.y })} className="flex items-center justify-center gap-1 rounded-md bg-white/5 py-1.5 text-[11px] text-slate-200 hover:bg-white/10">
          <Copy className="h-3 w-3" /> Duplicate
        </button>
        <button onClick={removeSelected} className="flex items-center justify-center gap-1 rounded-md bg-red-500/15 py-1.5 text-[11px] text-red-300 hover:bg-red-500/25">
          <Trash2 className="h-3 w-3" /> Delete
        </button>
      </div>
    </Section>
  );
}

function ClipEditor({ id }: { id: string }) {
  const clip = useStudio2d((s) => s.clips.find((c) => c.id === id));
  const actor = useStudio2d((s) => (s.selected?.kind === "clip" ? s.actors.find((a) => a.id === (s.clips.find((c) => c.id === s.selected?.id)?.actorId)) : undefined));
  const obj = useStudio2d((s) => (s.selected?.kind === "clip" ? s.objects.find((o) => o.id === (s.clips.find((c) => c.id === s.selected?.id)?.actorId)) : undefined));
  const patchClip = useStudio2d((s) => s.patchClip);
  const removeSelected = useStudio2d((s) => s.removeSelected);
  if (!clip) return null;
  if (clip.kind !== "drive" && !actor) return null;
  if (clip.kind === "drive" && !obj) return null;
  const animal = actor ? isAnimalName(actor.species) : false;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const p = (patch: Parameters<typeof patchClip>[1]) => patchClip(id, patch);
  return (
    <Section title={clip.kind === "walk" ? "Clip · walk" : clip.kind === "drive" ? "🚗 Clip · drive" : "Clip · action"}>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Start (s)">
          <NumberInput value={clip.start} min={0} step={0.1} onChange={(v) => p({ start: Math.max(0, v) })} />
        </Field>
        <Field label="Length (s)">
          <NumberInput value={clip.duration} min={0.2} step={0.1} onChange={(v) => p({ duration: Math.max(0.2, v) })} />
        </Field>
      </div>
      {clip.kind === "walk" ? (
        <Field label="Walk to x (px)">
          <NumberInput value={Math.round(clip.toX)} step={10} onChange={(v) => p({ toX: v })} />
        </Field>
      ) : clip.kind === "drive" ? (
        <Field label="🚗 Drive to x (px)">
          <NumberInput value={Math.round(clip.toX)} step={10} onChange={(v) => p({ toX: v })} />
        </Field>
      ) : animal ? (
        <>
          <Field label="Animal pose">
            <Select value={clip.stance} onChange={(v) => p({ stance: v })} options={ANIMAL_STANCE_OPTIONS} />
          </Field>
          <Field label="Expression">
            <Select value={clip.expression} onChange={(v) => p({ expression: v })} options={ANIMAL_EXPRESSION_OPTIONS} />
          </Field>
          <Field label="Speed">
            <Select value={clip.speed} onChange={(v) => p({ speed: v })} options={SPEED_OPTIONS.map((v) => ({ value: v, label: `${v}×` }))} />
          </Field>
        </>
      ) : (
        <>
          <Field label="Stance">
            <Select value={clip.stance} onChange={(v) => p({ stance: v })} options={STANCE_OPTIONS} />
          </Field>
          <Field label="Gesture">
            <Select value={clip.gesture} onChange={(v) => p({ gesture: v })} options={GESTURE_OPTIONS} />
          </Field>
          <Field label="Expression">
            <Select value={clip.expression} onChange={(v) => p({ expression: v })} options={EXPRESSION_OPTIONS} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Speed">
              <Select value={clip.speed} onChange={(v) => p({ speed: v })} options={SPEED_OPTIONS.map((v) => ({ value: v, label: `${v}×` }))} />
            </Field>
            <Field label="Intensity">
              <Select value={clip.intensity} onChange={(v) => p({ intensity: v })} options={INTENSITY_OPTIONS.map((v) => ({ value: v, label: `${v}×` }))} />
            </Field>
          </div>
          <div className="flex gap-3">
            <Toggle label="Mirror" checked={clip.mirror} onChange={(v) => p({ mirror: v })} />
            <Toggle label="Talking (talking expressions)" checked={clip.talk} onChange={(v) => p({ talk: v })} />
          </div>
        </>
      )}
      <Field label="Speech bubble">
        <input value={clip.say} onChange={(e) => p({ say: e.target.value })} placeholder="(none)" className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-[#e87d0d]/70" />
      </Field>
      <button onClick={removeSelected} className="flex w-full items-center justify-center gap-1 rounded-md bg-red-500/15 py-1.5 text-[11px] text-red-300 hover:bg-red-500/25">
        <Trash2 className="h-3 w-3" /> Delete clip
      </button>
    </Section>
  );
}
