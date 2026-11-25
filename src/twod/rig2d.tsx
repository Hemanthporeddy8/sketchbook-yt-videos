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

function animalTailArt(sp: Species, body: string, belly: string) {
  if (sp === "bird") {
    return <path d="M 0 0 C -12 -6 -28 -14 -34 -6 C -38 0 -24 6 0 2 Z" fill={body} filter="brightness(0.9)" />;
  }
  if (sp === "rabbit") {
    return <circle cx={-6} cy={-4} r={11} fill="#ffffff" stroke="rgba(0,0,0,0.12)" strokeWidth={1.5} />;
  }
  if (sp === "bear" || sp === "panda") {
    return <circle cx={-6} cy={-2} r={9} fill={sp === "panda" ? "#111827" : body} />;
  }
  if (sp === "pig") {
    return (
      <path
        d="M 0 0 Q -10 -8 -6 -18 Q -2 -26 -14 -20 Q -18 -14 -12 -8"
        fill="none"
        stroke={body}
        strokeWidth={5}
        strokeLinecap="round"
      />
    );
  }
  if (sp === "fox") {
    return (
      <g>
        <path d="M 0 0 C -18 -8 -44 -14 -42 -36 C -40 -48 -24 -46 -18 -32 C -12 -18 -6 -8 2 -2 Z" fill={body} />
        <path d="M -30 -30 C -42 -32 -42 -36 -42 -36 C -40 -48 -24 -46 -22 -36 Z" fill="#fef3c7" />
      </g>
    );
  }
  if (sp === "dog") {
    return <path d="M 0 0 C -8 -12 -14 -26 -6 -38 C -2 -42 4 -38 2 -32 C -2 -22 0 -10 4 -2 Z" fill={body} />;
  }
  // Cat: graceful curling upright tail
  return (
    <path
      d="M 0 0 C -10 -8 -18 -24 -14 -42 C -12 -48 -4 -46 -8 -38 C -12 -26 -4 -14 4 -2 Z"
      fill={body}
      stroke={body}
      strokeWidth={3}
      strokeLinecap="round"
    />
  );
}

function animalLegArt(sp: Species, bodyColor: string, isFar: boolean) {
  const shade = isFar ? "brightness(0.82) saturate(0.9)" : "none";
  if (sp === "bird") {
    return (
      <g style={{ filter: shade }}>
        <line x1={0} y1={0} x2={0} y2={38} stroke="#f59e0b" strokeWidth={4} strokeLinecap="round" />
        <path d="M -8 40 L 0 38 L 8 40 M 0 38 L 0 42" stroke="#f59e0b" strokeWidth={3} strokeLinecap="round" fill="none" />
      </g>
    );
  }
  return (
    <g style={{ filter: shade }}>
      <path
        d="M -9 0 C -12 14 -10 26 -7 36 L -7 38 C -7 42 -2 44 8 44 C 13 44 14 40 12 36 L 9 24 C 8 14 7 4 5 0 Z"
        fill={bodyColor}
      />
      <line x1={1} y1={40} x2={1} y2={44} stroke="rgba(0,0,0,0.2)" strokeWidth={1.5} />
      <line x1={6} y1={40} x2={6} y2={44} stroke="rgba(0,0,0,0.2)" strokeWidth={1.5} />
    </g>
  );
}

function animalBodyArt(sp: Species, body: string, belly: string) {
  if (sp === "bird") {
    return (
      <>
        <ellipse cx={2} cy={-48} rx={36} ry={26} fill={body} />
        <ellipse cx={16} cy={-42} rx={18} ry={18} fill={belly} opacity={0.9} />
        <path
          d="M -16 -56 C 2 -60 22 -52 14 -38 C 6 -28 -12 -36 -28 -42 C -34 -44 -26 -52 -16 -56 Z"
          fill={body}
          filter="brightness(0.92)"
          stroke="rgba(0,0,0,0.15)"
          strokeWidth={1.5}
        />
      </>
    );
  }

  if (sp === "rabbit") {
    return (
      <>
        <path
          d="M -44 -48 C -42 -66 -10 -68 18 -62 C 34 -58 42 -44 38 -34 C 32 -20 8 -24 -16 -24 C -36 -24 -46 -34 -44 -48 Z"
          fill={body}
        />
        <ellipse cx={12} cy={-38} rx={22} ry={14} fill={belly} opacity={0.9} />
        <ellipse cx={-26} cy={-36} rx={18} ry={16} fill={body} filter="brightness(0.96)" />
      </>
    );
  }

  if (sp === "pig") {
    return (
      <>
        <ellipse cx={-2} cy={-46} rx={48} ry={28} fill={body} />
        <ellipse cx={2} cy={-38} rx={36} ry={16} fill={belly} opacity={0.85} />
      </>
    );
  }

  if (sp === "panda") {
    return (
      <>
        <ellipse cx={-2} cy={-48} rx={46} ry={27} fill="#ffffff" />
        <path d="M 8 -72 C 24 -70 42 -58 38 -32 C 34 -24 20 -22 14 -28 C 8 -36 10 -60 8 -72 Z" fill="#111827" />
        <path d="M -46 -54 C -48 -70 -26 -72 -20 -58 C -16 -46 -22 -24 -36 -24 C -46 -24 -48 -44 -46 -54 Z" fill="#111827" />
      </>
    );
  }

  if (sp === "bear") {
    return (
      <>
        <ellipse cx={-2} cy={-50} rx={50} ry={29} fill={body} />
        <ellipse cx={6} cy={-42} rx={34} ry={18} fill={belly} opacity={0.7} />
      </>
    );
  }

  // Cat, Dog, Fox (sleek quadruped silhouette)
  return (
    <>
      <path
        d="M -44 -48 C -42 -64 -10 -66 18 -62 C 34 -58 44 -46 40 -34 C 34 -22 12 -26 -14 -26 C -34 -26 -46 -36 -44 -48 Z"
        fill={body}
      />
      <path
        d="M 6 -56 C 24 -54 36 -46 32 -36 C 28 -28 12 -28 -2 -28 C 4 -38 4 -48 6 -56 Z"
        fill={belly}
        opacity={0.9}
      />
      <circle cx={-30} cy={-42} r={18} fill={body} filter="brightness(0.97)" opacity={0.7} />
    </>
  );
}

function FigureAnimal({ actor, rf, d }: { actor: Actor2D; rf: RefFn; d: FigDom }) {
  const a = actor.app;
  const sp = actor.species;
  const body = a.skin;
  const belly = a.hair;
  const ear = a.skin;
  const headX = 46;
  const headY = -86;
  const headR = sp === "bird" ? 18 : 24;

  const earArt = () => {
    if (sp === "rabbit") {
      return (
        <>
          <ellipse cx={headX - 8} cy={headY - 34} rx={7} ry={30} fill={ear} transform={`rotate(-6 ${headX - 8} ${headY - 34})`} />
          <ellipse cx={headX - 8} cy={headY - 32} rx={3.5} ry={20} fill="#f9a8d4" transform={`rotate(-6 ${headX - 8} ${headY - 32})`} />
          <ellipse cx={headX + 10} cy={headY - 34} rx={7} ry={30} fill={ear} transform={`rotate(8 ${headX + 10} ${headY - 34})`} />
          <ellipse cx={headX + 10} cy={headY - 32} rx={3.5} ry={20} fill="#f9a8d4" transform={`rotate(8 ${headX + 10} ${headY - 32})`} />
        </>
      );
    }
    if (sp === "bird") {
      return (
        <path d={`M ${headX - 4} ${headY - 18} Q ${headX - 12} ${headY - 34} ${headX + 2} ${headY - 26}`} stroke={body} strokeWidth={4} strokeLinecap="round" fill="none" />
      );
    }
    if (sp === "bear") {
      return (
        <>
          <circle cx={headX - 16} cy={headY - 22} r={11} fill={ear} />
          <circle cx={headX - 16} cy={headY - 22} r={6} fill={belly} opacity={0.6} />
          <circle cx={headX + 16} cy={headY - 22} r={11} fill={ear} />
          <circle cx={headX + 16} cy={headY - 22} r={6} fill={belly} opacity={0.6} />
        </>
      );
    }
    if (sp === "panda") {
      return (
        <>
          <circle cx={headX - 16} cy={headY - 22} r={11} fill="#111827" />
          <circle cx={headX + 16} cy={headY - 22} r={11} fill="#111827" />
        </>
      );
    }
    if (sp === "dog") {
      return (
        <>
          <path d={`M ${headX - 14} ${headY - 12} C ${headX - 22} ${headY + 12} ${headX - 10} ${headY + 24} ${headX - 2} ${headY + 10} Z`} fill={ear} filter="brightness(0.9)" />
          <path d={`M ${headX + 12} ${headY - 12} C ${headX + 24} ${headY + 12} ${headX + 16} ${headY + 26} ${headX + 6} ${headY + 10} Z`} fill={ear} />
        </>
      );
    }
    if (sp === "pig") {
      return (
        <>
          <polygon points={`${headX - 18},${headY - 10} ${headX - 10},${headY - 30} ${headX - 2},${headY - 14}`} fill={ear} />
          <polygon points={`${headX + 6},${headY - 14} ${headX + 16},${headY - 30} ${headX + 22},${headY - 8}`} fill={ear} />
        </>
      );
    }
    if (sp === "fox") {
      return (
        <>
          <polygon points={`${headX - 18},${headY - 10} ${headX - 10},${headY - 42} ${headX + 2},${headY - 14}`} fill="#111827" />
          <polygon points={`${headX - 15},${headY - 12} ${headX - 10},${headY - 36} ${headX},${headY - 15}`} fill="#fef3c7" />
          <polygon points={`${headX + 8},${headY - 12} ${headX + 20},${headY - 42} ${headX + 26},${headY - 10}`} fill="#111827" />
          <polygon points={`${headX + 11},${headY - 13} ${headX + 19},${headY - 36} ${headX + 24},${headY - 12}`} fill="#fef3c7" />
        </>
      );
    }
    // Cat: alert cute pointed ears
    return (
      <>
        <polygon points={`${headX - 18},${headY - 12} ${headX - 10},${headY - 40} ${headX + 2},${headY - 16}`} fill={ear} />
        <polygon points={`${headX - 15},${headY - 14} ${headX - 10},${headY - 34} ${headX},${headY - 17}`} fill="#f472b6" />
        <polygon points={`${headX + 8},${headY - 14} ${headX + 20},${headY - 40} ${headX + 26},${headY - 12}`} fill={ear} />
        <polygon points={`${headX + 11},${headY - 15} ${headX + 19},${headY - 34} ${headX + 24},${headY - 14}`} fill="#f472b6" />
      </>
    );
  };

  const snoutArt = () => {
    if (sp === "bird") {
      return null; // Bird beak is rendered as the interactive mouth
    }
    if (sp === "pig") {
      return (
        <>
          <ellipse cx={headX + 18} cy={headY + 8} rx={11} ry={8} fill="#f472b6" />
          <circle cx={headX + 15} cy={headY + 8} r={2.5} fill="#9d174d" />
          <circle cx={headX + 21} cy={headY + 8} r={2.5} fill="#9d174d" />
        </>
      );
    }
    if (sp === "rabbit") {
      return (
        <>
          <ellipse cx={headX + 14} cy={headY + 8} rx={10} ry={7} fill="#ffffff" />
          <polygon points={`${headX + 17},${headY + 5} ${headX + 23},${headY + 5} ${headX + 20},${headY + 9}`} fill="#f472b6" />
          <line x1={headX + 16} y1={headY + 7} x2={headX + 34} y2={headY + 5} stroke="rgba(0,0,0,0.25)" strokeWidth={1.5} />
          <line x1={headX + 16} y1={headY + 9} x2={headX + 34} y2={headY + 11} stroke="rgba(0,0,0,0.25)" strokeWidth={1.5} />
        </>
      );
    }
    if (sp === "fox") {
      return (
        <>
          <polygon points={`${headX + 8},${headY + 2} ${headX + 34},${headY + 8} ${headX + 8},${headY + 16}`} fill={belly} />
          <circle cx={headX + 33} cy={headY + 8} r={3.5} fill="#111827" />
        </>
      );
    }
    if (sp === "panda") {
      return (
        <>
          <ellipse cx={headX + 14} cy={headY + 8} rx={11} ry={8} fill="#ffffff" />
          <ellipse cx={headX + 20} cy={headY + 5} rx={5} ry={3.5} fill="#111827" />
        </>
      );
    }
    if (sp === "bear") {
      return (
        <>
          <ellipse cx={headX + 14} cy={headY + 8} rx={13} ry={10} fill={belly} />
          <ellipse cx={headX + 20} cy={headY + 5} rx={6} ry={4.5} fill="#111827" />
        </>
      );
    }
    if (sp === "dog") {
      return (
        <>
          <ellipse cx={headX + 14} cy={headY + 8} rx={12} ry={9} fill={belly} />
          <ellipse cx={headX + 20} cy={headY + 5} rx={5} ry={4} fill="#1f2937" />
        </>
      );
    }
    // Cat: cute muzzle pad, pink nose, and distinct whiskers
    return (
      <>
        <ellipse cx={headX + 14} cy={headY + 8} rx={10} ry={7} fill={belly} opacity={0.9} />
        <polygon points={`${headX + 17},${headY + 5} ${headX + 23},${headY + 5} ${headX + 20},${headY + 9}`} fill="#f472b6" />
        {/* Whiskers */}
        <line x1={headX + 16} y1={headY + 6} x2={headX + 38} y2={headY + 2} stroke="rgba(0,0,0,0.35)" strokeWidth={1.5} />
        <line x1={headX + 16} y1={headY + 8} x2={headX + 40} y2={headY + 8} stroke="rgba(0,0,0,0.35)" strokeWidth={1.5} />
        <line x1={headX + 16} y1={headY + 10} x2={headX + 37} y2={headY + 14} stroke="rgba(0,0,0,0.35)" strokeWidth={1.5} />
      </>
    );
  };

  return (
    <>
      {/* 1. Tail (behind body, pivot at rump) */}
      <g ref={rf("tail")} transform="translate(-44 -48)">
        {animalTailArt(sp, body, belly)}
      </g>

      {/* 2. Far legs (behind body, shaded) */}
      <g ref={rf("bLeg2")} transform="translate(-28 -42)">
        {animalLegArt(sp, body, true)}
      </g>
      <g ref={rf("fLeg2")} transform="translate(32 -42)">
        {animalLegArt(sp, body, true)}
      </g>

      {/* 3. Main Torso */}
      <g ref={rf("body")}>
        {animalBodyArt(sp, body, belly)}
      </g>

      {/* 4. Head & Face */}
      <g ref={rf("head")}>
        {earArt()}
        <circle cx={headX} cy={headY} r={headR} fill={body} />
        {snoutArt()}

        {/* Panda eye patches */}
        {sp === "panda" && (
          <>
            <ellipse cx={headX - 6} cy={headY - 4} rx={8} ry={10} fill="#111827" transform={`rotate(-15 ${headX - 6} ${headY - 4})`} />
            <ellipse cx={headX + 12} cy={headY - 4} rx={8} ry={10} fill="#111827" transform={`rotate(15 ${headX + 12} ${headY - 4})`} />
          </>
        )}

        {/* Eyes */}
        <ellipse ref={(el) => { d.eyeL = el; }} cx={headX - 6} cy={headY - 4} rx={7} ry={7} fill="#ffffff" stroke="#1f2937" strokeWidth={2} />
        <ellipse ref={(el) => { d.eyeR = el; }} cx={headX + 12} cy={headY - 4} rx={7} ry={7} fill="#ffffff" stroke="#1f2937" strokeWidth={2} />

        {/* Pupils with highlights */}
        <g ref={(el) => { d.pupilL = el; }}>
          <circle cx={headX - 6} cy={headY - 4} r={3.8} fill={a.eyes} />
          <circle cx={headX - 4.5} cy={headY - 5.5} r={1.5} fill="#ffffff" />
        </g>
        <g ref={(el) => { d.pupilR = el; }}>
          <circle cx={headX + 12} cy={headY - 4} r={3.8} fill={a.eyes} />
          <circle cx={headX + 13.5} cy={headY - 5.5} r={1.5} fill="#ffffff" />
        </g>

        {/* Brows */}
        {sp !== "bird" && (
          <>
            <g ref={(el) => { d.browL = el; }}>
              <line x1={headX - 12} y1={headY - 13} x2={headX} y2={headY - 13} stroke="#1f2937" strokeWidth={3} strokeLinecap="round" />
            </g>
            <g ref={(el) => { d.browR = el; }}>
              <line x1={headX + 6} y1={headY - 13} x2={headX + 18} y2={headY - 13} stroke="#1f2937" strokeWidth={3} strokeLinecap="round" />
            </g>
          </>
        )}

        {/* Mouth / Beak anchored directly to the face */}
        <path
          ref={(el) => { d.mouth = el; }}
          d={
            sp === "bird"
              ? `M ${headX + 14} ${headY - 2} L ${headX + 32} ${headY + 5} L ${headX + 14} ${headY + 10} Z`
              : `M ${headX + 10} ${headY + 16} Q ${headX + 16} ${headY + 19} ${headX + 22} ${headY + 16}`
          }
          fill={sp === "bird" ? "#f59e0b" : "none"}
          stroke={sp === "bird" ? "none" : "#3b1d1d"}
          strokeWidth={sp === "bird" ? 0 : 2.5}
          strokeLinecap="round"
        />
      </g>

      {/* 5. Near legs (in front of body) */}
      <g ref={rf("bLeg")} transform="translate(-36 -42)">
        {animalLegArt(sp, body, false)}
      </g>
      <g ref={rf("fLeg")} transform="translate(24 -42)">
        {animalLegArt(sp, body, false)}
      </g>
    </>
  );
}

/* ---------------------------------------------------------------- */
/* Frame driver                                                     */
/* ---------------------------------------------------------------- */

function applyFace(d: FigDom, s: NonNullable<ActorFrame["face"]>) {
  const L = Math.max(s.blinkL, s.blinkR);

  if (isAnimal(d.species)) {
    const headX = 46;
    const headY = -86;
    const isBird = d.species === "bird";

    // Eyes blink
    const ry = Math.max(0.8, (isBird ? 6 : 7) * (1 - L) * (1 + s.wide * 0.3));
    d.eyeL?.setAttribute("ry", String(ry));
    d.eyeR?.setAttribute("ry", String(ry));

    // Pupils track
    const lookX = s.lookX * 2.2;
    const lookY = s.lookY * 2.2;
    d.pupilL?.setAttribute("transform", `translate(${lookX} ${lookY})`);
    d.pupilR?.setAttribute("transform", `translate(${lookX} ${lookY})`);

    // Brows
    const tilt = (s.angry * 0.45 - s.frown * 0.3) * 57.3;
    const lift = -s.browUp * 5;
    d.browL?.setAttribute("transform", `translate(0 ${lift}) rotate(${tilt} ${headX - 6} ${headY - 14})`);
    d.browR?.setAttribute("transform", `translate(0 ${lift}) rotate(${-tilt} ${headX + 12} ${headY - 14})`);

    // Mouth / Beak
    if (isBird) {
      const open = s.jaw * 7 + (s.talk ? 4 : 0);
      d.mouth?.setAttribute("d", `M ${headX + 14} ${headY - 2} L ${headX + 32} ${headY + 5 + open} L ${headX + 14} ${headY + 10} Z`);
      d.mouth?.setAttribute("fill", "#f59e0b");
      d.mouth?.setAttribute("stroke", "none");
    } else {
      const mx = headX + 16;
      const my = headY + 16;
      const cy = my - s.smile * 2 + s.frown * 2;
      const top = cy + s.smile * 3;
      const bot = cy + 2 + s.jaw * 10 + s.wide * 4;
      d.mouth?.setAttribute("d", `M ${mx - 6} ${cy} Q ${mx} ${top} ${mx + 6} ${cy} Q ${mx} ${bot} ${mx - 6} ${cy} Z`);
      d.mouth?.setAttribute("fill", s.jaw > 0.12 ? "#991b1b" : "none");
      d.mouth?.setAttribute("stroke", "#3b1d1d");
      d.mouth?.setAttribute("stroke-width", "2.5");
    }
  } else {
    // Humans and girls
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
    const cy = -36 - s.smile * 2 + s.frown * 3;
    const top = cy - 2 + s.smile * 12 - s.frown * 11;
    const bot = top + s.jaw * 26 + s.wide * 6;
    d.mouth?.setAttribute("d", `M -12 ${cy} Q 0 ${top} 12 ${cy} Q 0 ${bot} -12 ${cy} Z`);
    d.mouth?.setAttribute("fill", s.jaw > 0.12 || s.wide > 0.3 ? "#5b1f1f" : "none");
    d.mouth?.setAttribute("stroke", "#3b1d1d");
    d.mouth?.setAttribute("stroke-width", "4");
  }
}

export function applyFigure(d: FigDom, f: ActorFrame, groundY: number, scale: number) {
  if (f.hidden) {
    if (d.outer) d.outer.setAttribute("display", "none");
    if (d.bubble) d.bubble.setAttribute("display", "none");
    return;
  }
  if (d.outer) {
    d.outer.removeAttribute("display");
    d.outer.setAttribute("transform", `translate(${f.x} ${groundY}) scale(${scale * f.facing} ${scale})`);
  }

  if (isAnimal(d.species)) {
    const g = f.gait;
    const speed = f.speedMs;
    const ph = g * Math.PI * 2;
    const moving = speed > 0.18;
    // Leg swing: front legs vs back legs
    const swing = moving ? Math.min(1, speed / 3.6) : 0;
    const s1 = Math.sin(ph) * 26 * swing;
    const s2 = Math.sin(ph + Math.PI) * 26 * swing;

    d.bones.bLeg?.setAttribute("transform", `translate(-36 -42) rotate(${s2})`);
    d.bones.bLeg2?.setAttribute("transform", `translate(-28 -42) rotate(${s2 * 0.85})`);
    d.bones.fLeg?.setAttribute("transform", `translate(24 -42) rotate(${s1})`);
    d.bones.fLeg2?.setAttribute("transform", `translate(32 -42) rotate(${s1 * 0.85})`);

    // Body bob and sway
    const bob = moving ? Math.abs(Math.sin(ph * 2)) * 3 * swing : Math.sin(f.t * 1.5) * 1.2;
    d.bones.body?.setAttribute("transform", `translate(0 ${bob}) rotate(${moving ? Math.sin(ph) * 2 : 0})`);

    // Head bob with gentle breathing
    d.bones.head?.setAttribute(
      "transform",
      `translate(0 ${bob * 0.6 + (moving ? Math.sin(ph + 1) * 2.5 * swing : Math.sin(f.t * 1.5) * 1.5)}) rotate(${Math.sin(f.t * 0.8) * 3})`,
    );

    // Tail wag: attached directly to rump at (-44, -48)
    const wag = Math.sin(f.t * 4.5) * 18 + (moving ? Math.sin(ph) * 16 : 0);
    d.bones.tail?.setAttribute("transform", `translate(-44 -48) rotate(${wag})`);

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
    const top = d.species === "bird" || isAnimal(d.species) ? -180 : HEAD_TOP + (d.species === "girl" ? 6 : 0);
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
