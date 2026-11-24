import { useEffect, useRef, type PointerEvent as RPointerEvent } from "react";
import type { Actor2D, Appearance, Species } from "./types2d";
import { BONE_AT, HEAD_TOP, deg, type ActorFrame } from "./anim2d";
import { isAnimal } from "./gen2d";

/*
 * 2D characters: side-view figures built from SVG parts. Each bone is a <g> whose transform is set every frame.
 * Humans and girls share a skeleton (with a dress variant); animals use a body/head/tail/legs skeleton
 * with the same animation language (walk cycle, tail wag, head sway, sit/sleep/play states).
 */

export interface FigDom {
  species: Species;
  outer: SVGGElement | null;
  bones: Record<string, SVGGElement | null>;
  eyeL: SVGEllipseElement | null;
  eyeR: SVGEllipseElement | null;
  pupilL: SVGGElement | null;
  pupilR: SVGGElement | null;
  browL: SVGGElement | null;
  browR: SVGGElement | null;
  mouth: SVGPathElement | null;
  bubble: SVGGElement | null;
  bubbleRect: SVGRectElement | null;
  bubbleText: SVGTextElement | null;
}

const emptyDom = (s: Species): FigDom => ({
  species: s, outer: null, bones: {}, eyeL: null, eyeR: null, pupilL: null, pupilR: null,
  browL: null, browR: null, mouth: null, bubble: null, bubbleRect: null, bubbleText: null,
});

/** Live DOM handles for every character on the stage, keyed by actor id. */
export const figRegistry = new Map<string, FigDom>();

type RefFn = (k: string) => (el: SVGGElement | null) => void;
const isChild = (sp: Species) => sp === "human" || sp === "girl";

/* ---------------------------------------------------------------- */
/* Human & girl                                                     */
/* ---------------------------------------------------------------- */

function hairBack(a: Appearance) {
  if (a.dress) {
    // ponytail falls behind the shoulders
    return (
      <>
        <path d="M -52 -66 Q -78 -40 -62 20 Q -56 52 -30 44 Q -52 -6 -38 -70 Z" fill={a.hair} />
        <circle cx={0} cy={-122} r={20} fill={a.hair} />
      </>
    );
  }
  switch (a.hairStyle) {
    case 2:
      return <rect x={-60} y={-100} width={120} height={150} rx={36} fill={a.hair} />;
    case 3:
      return <path d="M -48 -70 L -66 -116 L -36 -96 L -22 -130 L -4 -104 L 10 -134 L 24 -102 L 46 -124 L 44 -86 L 66 -84 L 50 -56 Z" fill={a.hair} />;
    case 4:
      return <circle cx={0} cy={-120} r={22} fill={a.hair} />;
    case 5:
      return (
        <>
          <circle cx={0} cy={-70} r={70} fill={a.hair} />
          <circle cx={-48} cy={-52} r={34} fill={a.hair} />
          <circle cx={48} cy={-52} r={34} fill={a.hair} />
        </>
      );
    case 6:
      return (
        <>
          <path d="M -50 -66 Q -70 -30 -58 30 Q -54 60 -26 52 Q -50 -8 -34 -72 Z" fill={a.hair} />
          <circle cx={0} cy={-122} r={18} fill={a.hair} />
        </>
      );
    case 7:
      return (
        <>
          <circle cx={0} cy={-64} r={52} fill={a.hair} />
          <circle cx={-44} cy={-74} r={26} fill={a.hair} />
          <circle cx={44} cy={-74} r={26} fill={a.hair} />
          <circle cx={-24} cy={-104} r={24} fill={a.hair} />
          <circle cx={28} cy={-102} r={24} fill={a.hair} />
        </>
      );
    default:
      return null;
  }
}

function hairFront(a: Appearance) {
  if (a.dress) return <path d="M -52 -56 Q -54 -104 0 -104 Q 54 -104 52 -56 Q 30 -82 0 -82 Q -30 -82 -52 -56 Z" fill={a.hair} />;
  if (a.hairStyle === 0) return null;
  if (a.hairStyle === 1 || a.hairStyle === 2) {
    return <path d="M -54 -52 Q -56 -110 0 -108 Q 56 -110 54 -52 Q 40 -78 0 -80 Q -40 -78 -54 -52 Z" fill={a.hair} />;
  }
  if (a.hairStyle === 4) return <path d="M -54 -56 Q -54 -102 0 -100 Q 54 -102 54 -56 Q 30 -76 0 -76 Q -30 -76 -54 -56 Z" fill={a.hair} />;
  if (a.hairStyle === 6) return <path d="M -54 -56 Q -56 -104 0 -102 Q 56 -104 54 -56 Q 30 -78 0 -78 Q -30 -78 -54 -56 Z" fill={a.hair} />;
  if (a.hairStyle === 7) {
    return (
      <>
        <circle cx={-34} cy={-88} r={22} fill={a.hair} />
        <circle cx={0} cy={-96} r={24} fill={a.hair} />
        <circle cx={34} cy={-88} r={22} fill={a.hair} />
      </>
    );
  }
  if (a.hairStyle === 5) return <path d="M -58 -54 Q -70 -108 0 -110 Q 70 -108 58 -54 Q 30 -80 0 -80 Q -30 -80 -58 -54 Z" fill={a.hair} />;
  return null;
}

function hatArt(a: Appearance) {
  switch (a.hat) {
    case 1:
      return (
        <>
          <path d="M -56 -62 Q -56 -112 0 -112 Q 56 -112 56 -62 Z" fill={a.hatColor} />
          <path d="M 30 -66 Q 76 -68 82 -56 Q 60 -52 34 -56 Z" fill={a.hatColor} />
        </>
      );
    case 2:
      return (
        <>
          <rect x={-34} y={-170} width={68} height={72} rx={4} fill="#111827" />
          <rect x={-56} y={-104} width={112} height={14} rx={5} fill="#111827" />
        </>
      );
    case 3:
      return <polygon points="-42,-104 -46,-140 -22,-118 0,-146 22,-118 46,-140 42,-104" fill="#facc15" />;
    case 4:
      return (
        <>
          <path d="M -54 -64 Q -56 -116 0 -116 Q 56 -116 54 -64 Z" fill={a.hatColor} />
          <rect x={-54} y={-82} width={108} height={14} rx={5} fill="#111827" opacity={0.35} />
          <circle cx={0} cy={-116} r={10} fill={a.hatColor} />
        </>
      );
    case 5:
      return (
        <>
          <ellipse cx={0} cy={-100} rx={84} ry={14} fill={a.hatColor} />
          <rect x={-36} y={-150} width={72} height={56} rx={14} fill={a.hatColor} />
        </>
      );
    default:
      return null;
  }
}

function beardArt(a: Appearance) {
  if (!a.beard) return null;
  return (
    <path d="M -38 -30 Q -44 -4 -14 8 Q 0 12 14 8 Q 44 -4 38 -30 Q 30 4 0 4 Q -30 4 -38 -30 Z" fill={a.beardColor} opacity={0.95} />
  );
}

function limbLeg(p: "l" | "r", a: Appearance, rf: RefFn) {
  const legColor = a.dress ? a.skin : a.pants;
  return (
    <g ref={rf(`${p}UpperLeg`)}>
      <line x1={0} y1={0} x2={0} y2={85} stroke={legColor} strokeWidth={28} strokeLinecap="round" />
      <g ref={rf(`${p}LowerLeg`)}>
        <line x1={0} y1={0} x2={0} y2={82} stroke={legColor} strokeWidth={24} strokeLinecap="round" />
        <ellipse cx={8} cy={88} rx={20} ry={10} fill={a.shoes} />
      </g>
    </g>
  );
}

function limbArm(p: "l" | "r", a: Appearance, rf: RefFn) {
  return (
    <g ref={rf(`${p}UpperArm`)}>
      <line x1={0} y1={0} x2={0} y2={62} stroke={a.dress ? a.skin : a.shirt} strokeWidth={22} strokeLinecap="round" />
      <g ref={rf(`${p}LowerArm`)}>
        <line x1={0} y1={0} x2={0} y2={58} stroke={a.skin} strokeWidth={18} strokeLinecap="round" />
        <circle cx={0} cy={60} r={13} fill={a.skin} />
      </g>
    </g>
  );
}

function FigureHuman({ actor, rf, d }: { actor: Actor2D; rf: RefFn; d: FigDom }) {
  const a = actor.app;
  return (
    <>
      <g ref={rf("hips")}>
        {a.dress ? (
          <path d={`M ${-42 * a.build} -16 L ${42 * a.build} -16 L ${66 * a.build} 82 L ${-66 * a.build} 82 Z`} fill={a.dressColor} />
        ) : (
          <rect x={-40 * a.build} y={-16} width={80 * a.build} height={34} rx={16} fill={a.pants} />
        )}
        {limbLeg("l", a, rf)}
        {limbLeg("r", a, rf)}
        <g ref={rf("spine")}>
          <rect x={-48 * a.build} y={-128} width={96 * a.build} height={136} rx={34} fill={a.dress ? a.dressColor : a.shirt} />
          {a.dress && <path d="M -30 -120 L 30 -120 L 22 -118 L -22 -118 Z" fill="#ffffff" opacity={0.35} />}
          {limbArm("l", a, rf)}
          {limbArm("r", a, rf)}
          <g ref={rf("head")}>
            {hairBack(a)}
            <circle cx={-50} cy={-54} r={11} fill={a.skin} />
            <circle cx={50} cy={-54} r={11} fill={a.skin} />
            <circle cx={0} cy={-55} r={52} fill={a.skin} />
            <ellipse cx={0} cy={-46} rx={4.5} ry={3.5} fill="rgba(90,40,25,0.35)" />
            <ellipse ref={(el) => { d.eyeL = el; }} cx={-18} cy={-58} rx={12} ry={14} fill="#ffffff" stroke="#1f2937" strokeWidth={2.5} />
            <ellipse ref={(el) => { d.eyeR = el; }} cx={18} cy={-58} rx={12} ry={14} fill="#ffffff" stroke="#1f2937" strokeWidth={2.5} />
            <g ref={(el) => { d.pupilL = el; }}>
              <circle cx={-18} cy={-58} r={6.5} fill={a.eyes} />
            </g>
            <g ref={(el) => { d.pupilR = el; }}>
              <circle cx={18} cy={-58} r={6.5} fill={a.eyes} />
            </g>
            <g ref={(el) => { d.browL = el; }}>
              <line x1={-30} y1={-84} x2={-6} y2={-84} stroke={a.hair} strokeWidth={6} strokeLinecap="round" />
            </g>
            <g ref={(el) => { d.browR = el; }}>
              <line x1={6} y1={-84} x2={30} y2={-84} stroke={a.hair} strokeWidth={6} strokeLinecap="round" />
            </g>
            {beardArt(a)}
            <path ref={(el) => { d.mouth = el; }} d="M -14 -30 Q 0 -30 14 -30" fill="none" stroke="#3b1d1d" strokeWidth={4} strokeLinecap="round" />
            {hairFront(a)}
            {hatArt(a)}
          </g>
        </g>
      </g>
    </>
  );
}

/* ---------------------------------------------------------------- */
/* Animals                                                           */
/* ---------------------------------------------------------------- */

function FigureAnimal({ actor, rf, d }: { actor: Actor2D; rf: RefFn; d: FigDom }) {
  const a = actor.app;
  const sp = actor.species;
  const body = a.skin;
  const belly = a.hair;
  const ear = a.skin;
  // proportional side view, origin at bottom-centre, head on the +x (front) side
  const headX = 58;
  const headY = -92;
  const headR = sp === "bird" ? 22 : 27;

  const earArt = () => {
    if (sp === "rabbit")
      return (
        <>
          <ellipse cx={headX - 10} cy={headY - 40} rx={8} ry={36} fill={ear} />
          <ellipse cx={headX - 10} cy={headY - 38} rx={4} ry={24} fill="#f9a8d4" />
          <ellipse cx={headX + 10} cy={headY - 40} rx={8} ry={36} fill={ear} />
          <ellipse cx={headX + 10} cy={headY - 38} rx={4} ry={24} fill="#f9a8d4" />
        </>
      );
    if (sp === "bird") return null;
    if (sp === "bear" || sp === "panda")
      return (
        <>
          <circle cx={headX - 26} cy={headY - 28} r={14} fill={ear} />
          <circle cx={headX + 26} cy={headY - 28} r={14} fill={ear} />
        </>
      );
    if (sp === "dog")
      return (
        <>
          <path d={`M ${headX - 22} ${headY - 14} Q ${headX - 32} ${headY + 22} ${headX - 2} ${headY + 6} Z`} fill="#1f2937" />
          <path d={`M ${headX + 22} ${headY - 14} Q ${headX + 32} ${headY + 22} ${headX + 2} ${headY + 6} Z`} fill="#1f2937" />
        </>
      );
    if (sp === "pig")
      return (
        <>
          <path d={`M ${headX - 18} ${headY - 20} L ${headX - 6} ${headY - 48} L ${headX + 4} ${headY - 22} Z`} fill={ear} />
          <path d={`M ${headX + 16} ${headY - 20} L ${headX + 8} ${headY - 46} L ${headX + 18} ${headY - 22} Z`} fill={ear} />
        </>
      );
    const inner = sp === "fox" ? "#fef3c7" : "#f472b6";
    return (
      <>
        <path d={`M ${headX - 26} ${headY - 12} L ${headX - 16} ${headY - 50} L ${headX - 2} ${headY - 14} Z`} fill={ear} />
        <path d={`M ${headX + 26} ${headY - 12} L ${headX + 16} ${headY - 50} L ${headX + 2} ${headY - 14} Z`} fill={ear} />
        <path d={`M ${headX - 19} ${headY - 14} L ${headX - 14} ${headY - 38} L ${headX - 5} ${headY - 15} Z`} fill={inner} />
      </>
    );
  };

  const snoutArt = () => {
    if (sp === "bird") return <path d={`M ${headX + 18} ${headY - 4} L ${headX + 48} ${headY + 4} L ${headX + 18} ${headY + 12} Z`} fill="#f59e0b" />;
    if (sp === "pig")
      return (
        <>
          <ellipse cx={headX + 28} cy={headY + 12} rx={16} ry={12} fill="#f9a8d4" />
          <circle cx={headX + 22} cy={headY + 11} r={3.2} fill="#9d174d" />
          <circle cx={headX + 34} cy={headY + 11} r={3.2} fill="#9d174d" />
        </>
      );
    if (sp === "rabbit") return <ellipse cx={headX + 24} cy={headY + 10} rx={18} ry={8} fill="#f9a8d4" />;
    if (sp === "fox") return <path d={`M ${headX + 16} ${headY - 4} L ${headX + 50} ${headY + 8} L ${headX + 16} ${headY + 14} Z`} fill={belly} />;
    if (sp === "panda") return <ellipse cx={headX} cy={headY + 14} rx={15} ry={10} fill="#ffffff" />;
    // bear / dog / cat / panda
    return (
      <>
        <ellipse cx={headX + 22} cy={headY + 13} rx={14} ry={10} fill={belly} />
        <ellipse cx={headX + 26} cy={headY + 8} rx={6.5} ry={5} fill="#1f2937" />
      </>
    );
  };

  const tailArt = () => {
    if (sp === "bird") return <path d={`M -60 -50 Q -108 -66 -104 -20 Q -90 -34 -60 -28 Z`} fill={body} />;
    if (sp === "rabbit") return <circle cx={-72} cy={-44} r={14} fill="#ffffff" />;
    if (sp === "pig") return <circle cx={-72} cy={-46} r={10} fill="none" stroke={body} strokeWidth={6} />;
    if (sp === "cat" || sp === "fox") return <path d={`M -70 -52 Q -112 -72 -108 -14 Q -96 -30 -70 -30 Z`} fill={body} />;
    if (sp === "bear" || sp === "panda") return <circle cx={-72} cy={-44} r={11} fill={body} />;
    return <path d={`M -72 -46 Q -104 -54 -100 -12 Q -92 -28 -72 -28 Z`} fill={body} />;
  };

  // quadruped silhouette
  const legX = [-54, -38, 26, 42];
  const legY = -30;
  const legH = 32;

  return (
    <>
      <g ref={rf("tail")}>{tailArt()}</g>
      <g ref={rf("body")}>
        <rect x={-76} y={-80} width={152} height={52} rx={24} fill={body} />
        <ellipse cx={-14} cy={-48} rx={58} ry={18} fill={belly} opacity={0.85} />
        {sp === "dog" && <path d="M 56 -58 L 80 -76 L 80 -40 Z" fill={body} />}
        {legX.map((x, i) => (
          <g key={i} ref={rf(["bLeg", "bLeg2", "fLeg", "fLeg2"][i])}>
            <rect x={x} y={legY} width={13} height={legH} rx={6} fill={body} />
          </g>
        ))}
      </g>
      <g ref={rf("head")}>
        {earArt()}
        <circle cx={headX} cy={headY} r={headR} fill={body} />
        {snoutArt()}
        {sp === "panda" && (
          <>
            <ellipse cx={headX - 12} cy={headY - 8} rx={9} ry={11} fill="#111827" />
            <ellipse cx={headX + 12} cy={headY - 8} rx={9} ry={11} fill="#111827" />
          </>
        )}
        {sp === "bird" && <path d={`M ${headX - 10} ${headY - 10} Q ${headX} ${headY - 22} ${headX + 10} ${headY - 10}`} fill="none" stroke="#111827" strokeWidth={2.5} strokeLinecap="round" />}
        <ellipse ref={(el) => { d.eyeL = el; }} cx={headX - 11} cy={headY - 4} rx={8.5} ry={8.5} fill="#ffffff" stroke="#1f2937" strokeWidth={2.5} />
        <ellipse ref={(el) => { d.eyeR = el; }} cx={headX + 11} cy={headY - 4} rx={8.5} ry={8.5} fill="#ffffff" stroke="#1f2937" strokeWidth={2.5} />
        <g ref={(el) => { d.pupilL = el; }}>
          <circle cx={headX - 11} cy={headY - 4} r={4.5} fill={a.eyes} />
        </g>
        <g ref={(el) => { d.pupilR = el; }}>
          <circle cx={headX + 11} cy={headY - 4} r={4.5} fill={a.eyes} />
        </g>
        {sp !== "bird" && (
          <>
            <g ref={(el) => { d.browL = el; }}>
              <line x1={headX - 21} y1={headY - 13} x2={headX - 1} y2={headY - 13} stroke="#1f2937" strokeWidth={4.5} strokeLinecap="round" />
            </g>
            <g ref={(el) => { d.browR = el; }}>
              <line x1={headX + 1} y1={headY - 13} x2={headX + 21} y2={headY - 13} stroke="#1f2937" strokeWidth={4.5} strokeLinecap="round" />
            </g>
          </>
        )}
        <path ref={(el) => { d.mouth = el; }} d={`M ${headX - 5} ${headY + 22} Q ${headX} ${headY + 25} ${headX + 5} ${headY + 22}`} fill="none" stroke="#3b1d1d" strokeWidth={3} strokeLinecap="round" />
      </g>
    </>
  );
}

/* ---------------------------------------------------------------- */
/* Frame driver                                                     */
/* ---------------------------------------------------------------- */

function applyFace(d: FigDom, s: NonNullable<ActorFrame["face"]>) {
  const L = Math.max(s.blinkL, s.blinkR);
  const ry = String(Math.max(1.2, 12 * (1 - L) * (1 + s.wide * 0.35)));
  d.eyeL?.setAttribute("ry", ry);
  d.eyeR?.setAttribute("ry", ry);
  const look = `translate(${s.lookX * 2.4} ${s.lookY * 2.4})`;
  d.pupilL?.setAttribute("transform", look);
  d.pupilR?.setAttribute("transform", look);
  const tilt = (s.angry * 0.45 - s.frown * 0.3) * 57.3;
  const lift = -s.browUp * 6;
  d.browL?.setAttribute("transform", `translate(0 ${lift}) rotate(${tilt} -18 -92)`);
  d.browR?.setAttribute("transform", `translate(0 ${lift}) rotate(${-tilt} 18 -92)`);
  const cy = d.species === "bird" ? -38 : -36 - s.smile * 2 + s.frown * 3;
  const top = cy - 2 + s.smile * 12 - s.frown * 11;
  const bot = top + s.jaw * 26 + s.wide * 6;
  d.mouth?.setAttribute("d", `M -12 ${cy} Q 0 ${top} 12 ${cy} Q 0 ${bot} -12 ${cy} Z`);
  d.mouth?.setAttribute("fill", s.jaw > 0.12 || s.wide > 0.3 ? "#5b1f1f" : "none");
}
export function applyFigure(d: FigDom, f: ActorFrame, groundY: number, scale: number) {
  if (d.outer) d.outer.setAttribute("transform", `translate(${f.x} ${groundY}) scale(${scale * f.facing} ${scale})`);

  if (isAnimal(d.species)) {
    const g = f.gait;
    const speed = f.speedMs;
    const ph = g * Math.PI * 2;
    const moving = speed > 0.18;
    // leg swing: front legs vs back legs (opposite phases)
    const swing = moving ? Math.min(1, speed / 3.6) : 0;
    const s1 = Math.sin(ph) * 34 * swing;
    const s2 = Math.sin(ph + Math.PI) * 34 * swing;
    d.bones.bLeg?.setAttribute("transform", `translate(-48 -28) rotate(${s2})`);
    d.bones.bLeg2?.setAttribute("transform", `translate(-33 -28) rotate(${s2 * 0.7})`);
    d.bones.fLeg?.setAttribute("transform", `translate(32 -28) rotate(${s1})`);
    d.bones.fLeg2?.setAttribute("transform", `translate(47 -28) rotate(${s1 * 0.7})`);
    // body bob and lean
    const bob = moving ? Math.abs(Math.sin(ph)) * 5 * swing : Math.sin(f.t * 1.4) * 1.5;
    d.bones.body?.setAttribute("transform", `translate(0 ${bob - 3}) rotate(${moving ? Math.sin(ph * 2) * 2.5 : 0})`);
    d.bones.head?.setAttribute("transform", `translate(0 ${moving ? Math.sin(ph + 1.2) * 4 * swing : Math.sin(f.t * 1.4 + 1) * 2.5}) rotate(${Math.sin(f.t * 0.7) * (f.grounded ? 4 : 0)})`);
    d.bones.tail?.setAttribute("transform", `translate(-78 0) rotate(${Math.sin(f.t * 3.5) * 20 + (moving ? Math.sin(ph) * 16 : 0)})`);
    applyFace(d, f.face);
  } else {
    // humans and girls: bone-driven
    for (const name of Object.keys(BONE_AT)) {
      const el = d.bones[name];
      if (!el) continue;
      const at = BONE_AT[name];
      const y = name === "hips" ? at[1] + f.py : at[1];
      const ang = name === "hips" ? 0 : (f.angles[name] ?? 0);
      el.setAttribute("transform", `translate(${at[0]} ${y}) rotate(${deg(ang)})`);
    }
    applyFace(d, f.face);
  }

  if (d.bubble && d.bubbleText && d.bubbleRect) {
    const top = d.species === "bird" || isAnimal(d.species) ? -230 : HEAD_TOP + (d.species === "girl" ? 6 : 0);
    if (f.bubble) {
      const w = Math.min(560, 48 + f.bubble.length * 13);
      d.bubble.setAttribute("display", "inline");
      d.bubble.setAttribute("transform", `translate(${f.x} ${groundY + top * scale - 24})`);
      d.bubbleRect.setAttribute("x", String(-w / 2));
      d.bubbleRect.setAttribute("width", String(w));
      d.bubbleText.textContent = f.bubble;
    } else {
      d.bubble.setAttribute("display", "none");
    }
  }
}

/* ---------------------------------------------------------------- */
/* React figure                                                     */
/* ---------------------------------------------------------------- */

export function Figure2D({
  actor,
  selected,
  onDown,
}: {
  actor: Actor2D;
  selected: boolean;
  onDown: (e: RPointerEvent<SVGGElement>) => void;
}) {
  const dom = useRef<FigDom>(emptyDom(actor.species));
  const d = dom.current;

  useEffect(() => {
    figRegistry.set(actor.id, d);
    return () => {
      if (figRegistry.get(actor.id) === d) figRegistry.delete(actor.id);
    };
  }, [actor.id, d]);

  const animal = isAnimal(actor.species);
  const rf: RefFn = (k) => (el) => {
    d.bones[k] = el;
  };

  return (
    <>
      <g ref={(el) => { d.outer = el; }} data-actor={actor.id} onPointerDown={onDown} style={{ cursor: "grab" }}>
        <ellipse cx={0} cy={3} rx={animal ? 74 : 78} ry={12} fill="rgba(0,0,0,0.28)" />
        {selected && <ellipse cx={0} cy={3} rx={animal ? 92 : 92} ry={18} fill="none" stroke="#e87d0d" strokeWidth={3} strokeDasharray="8 6" />}
        {animal ? (
          <FigureAnimal actor={actor} rf={rf} d={d} />
        ) : (
          <FigureHuman actor={actor} rf={rf} d={d} />
        )}
      </g>
      <g ref={(el) => { d.bubble = el; }} display="none" style={{ pointerEvents: "none" }}>
        <rect ref={(el) => { d.bubbleRect = el; }} x={-100} y={-40} width={200} height={46} rx={16} fill="#ffffff" stroke="#111827" strokeWidth={3} />
        <text
          ref={(el) => { d.bubbleText = el; }}
          x={0}
          y={-17}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={24}
          fontWeight={700}
          fill="#111827"
          fontFamily="Inter, Arial, sans-serif"
        />
      </g>
    </>
  );
}

export { isChild };
