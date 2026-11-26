import type { ReactNode } from "react";
import { SCENE_PALETTES } from "./gen2d";
import { mulberry32 } from "../lib/util";

/* Procedural SVG art: 60 object families and background scenes. */

type P = [string, string, string];
const VARIANT_SCALE = [0.8, 1, 1.25];

const starPts = (cx: number, cy: number, R: number, r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    return `${(cx + Math.cos(ang) * rad).toFixed(1)},${(cy + Math.sin(ang) * rad).toFixed(1)}`;
  }).join(" ");

function art(f: number, a: string, b: string, c: string, wheelAngle = 0): ReactNode {
  switch (f) {
    case 0: // Tree
      return (
        <>
          <rect x={-9} y={-70} width={18} height={72} fill={b} />
          <circle cx={0} cy={-118} r={52} fill={a} />
          <circle cx={-32} cy={-92} r={28} fill={a} />
          <circle cx={30} cy={-96} r={26} fill={c} />
        </>
      );
    case 1: // Pine tree
      return (
        <>
          <rect x={-8} y={-40} width={16} height={42} fill={b} />
          <polygon points="0,-190 -56,-60 56,-60" fill={a} />
          <polygon points="0,-140 -72,-20 72,-20" fill={a} />
        </>
      );
    case 2: // Bush
      return (
        <>
          <circle cx={-30} cy={-24} r={28} fill={a} />
          <circle cx={0} cy={-40} r={36} fill={a} />
          <circle cx={32} cy={-20} r={26} fill={a} />
          <circle cx={-6} cy={-48} r={6} fill={c} />
          <circle cx={26} cy={-32} r={5} fill={c} />
        </>
      );
    case 3: // Flower
      return (
        <>
          <path d="M 0 0 L 0 -96" stroke={b} strokeWidth={5} />
          <path d="M 0 -46 Q -24 -30 -18 -18" stroke={b} strokeWidth={5} fill="none" />
          <circle cx={0} cy={-116} r={20} fill={a} />
          <circle cx={-20} cy={-116} r={16} fill={a} />
          <circle cx={20} cy={-116} r={16} fill={a} />
          <circle cx={0} cy={-136} r={16} fill={a} />
          <circle cx={0} cy={-116} r={11} fill={c} />
        </>
      );
    case 4: // Rock
      return (
        <>
          <path d="M -78 0 L -60 -56 L -12 -76 L 40 -64 L 76 -22 L 62 0 Z" fill={a} />
          <path d="M 12 -74 L 42 -64 L 76 -22 L 60 0 L 22 0 Z" fill={b} />
        </>
      );
    case 5: // Cloud
      return (
        <>
          <ellipse cx={-38} cy={-22} rx={42} ry={28} fill={a} />
          <ellipse cx={6} cy={-38} rx={52} ry={34} fill={a} />
          <ellipse cx={44} cy={-20} rx={38} ry={24} fill={a} />
          <rect x={-52} y={-22} width={108} height={24} fill={a} />
        </>
      );
    case 6: // Sun
      return (
        <>
          <circle cx={0} cy={-62} r={66} fill={c} opacity={0.4} />
          <circle cx={0} cy={-62} r={46} fill={a} />
        </>
      );
    case 7: // Moon
      return <path d="M 6 -100 A 52 52 0 1 0 52 -46 A 40 40 0 0 1 6 -100 Z" fill={a} />;
    case 8: // Star
      return <polygon points={starPts(0, -60, 62, 26)} fill={a} stroke={c} strokeWidth={3} />;
    case 9: // Heart
      return <path d="M 0 -22 C -38 -78 -92 -18 0 42 C 92 -18 38 -78 0 -22 Z" fill={a} />;
    case 10: // House
      return (
        <>
          <rect x={-70} y={-118} width={140} height={118} fill={a} />
          <polygon points="-86,-116 0,-192 86,-116" fill={b} />
          <rect x={-16} y={-60} width={32} height={60} fill={c} />
          <rect x={32} y={-100} width={28} height={28} fill="#dbeafe" />
          <rect x={-78} y={-60} width={28} height={28} fill="#dbeafe" />
        </>
      );
    case 11: // Car with rotating spoke wheels, driver cabin, and headlights
      return (
        <g>
          {wheelAngle !== 0 && (
            <g opacity={0.65}>
              <circle cx={-108} cy={-24} r={6 + (Math.sin(wheelAngle * 0.1) * 2)} fill="#94a3b8" />
              <circle cx={-124} cy={-28} r={9 + (Math.cos(wheelAngle * 0.1) * 3)} fill="#cbd5e1" />
              <circle cx={-144} cy={-34} r={13} fill="#e2e8f0" opacity={0.4} />
            </g>
          )}
          <rect x={-96} y={-66} width={192} height={50} rx={16} fill={a} />
          <path d="M -54 -66 L -28 -112 L 42 -112 L 64 -66 Z" fill={b} />
          <path d="M -44 -68 L -24 -106 L 36 -106 L 52 -68 Z" fill="rgba(219, 234, 254, 0.75)" stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
          <line x1={32} y1={-72} x2={42} y2={-90} stroke="#1f2937" strokeWidth={5} strokeLinecap="round" />
          <ellipse cx={40} cy={-90} rx={8} ry={12} fill="none" stroke="#1f2937" strokeWidth={3} />
          <polygon points="96,-48 160,-70 160,-20 96,-34" fill="rgba(254, 240, 138, 0.25)" />
          <circle cx={92} cy={-42} r={6} fill="#fef08a" />
          <g transform="translate(-52 -14)">
            <g className="car-wheel" transform={`rotate(${wheelAngle})`}>
              <circle cx={0} cy={0} r={19} fill="#0f172a" stroke="#334155" strokeWidth={3} />
              <circle cx={0} cy={0} r={10} fill="#94a3b8" />
              <line x1={-9} y1={0} x2={9} y2={0} stroke="#475569" strokeWidth={2.5} />
              <line x1={0} y1={-9} x2={0} y2={9} stroke="#475569" strokeWidth={2.5} />
              <circle cx={0} cy={0} r={4} fill="#f8fafc" />
            </g>
          </g>
          <g transform="translate(52 -14)">
            <g className="car-wheel" transform={`rotate(${wheelAngle})`}>
              <circle cx={0} cy={0} r={19} fill="#0f172a" stroke="#334155" strokeWidth={3} />
              <circle cx={0} cy={0} r={10} fill="#94a3b8" />
              <line x1={-9} y1={0} x2={9} y2={0} stroke="#475569" strokeWidth={2.5} />
              <line x1={0} y1={-9} x2={0} y2={9} stroke="#475569" strokeWidth={2.5} />
              <circle cx={0} cy={0} r={4} fill="#f8fafc" />
            </g>
          </g>
        </g>
      );
    case 12: // Bus with rotating wheels
      return (
        <g>
          <rect x={-102} y={-150} width={204} height={140} rx={18} fill={a} />
          <rect x={-84} y={-132} width={42} height={42} rx={6} fill="rgba(219, 234, 254, 0.75)" stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
          <rect x={-28} y={-132} width={42} height={42} rx={6} fill="rgba(219, 234, 254, 0.75)" stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
          <rect x={28} y={-132} width={42} height={42} rx={6} fill="rgba(219, 234, 254, 0.75)" stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
          <g transform="translate(-64 -8)">
            <g className="car-wheel" transform={`rotate(${wheelAngle})`}>
              <circle cx={0} cy={0} r={19} fill="#0f172a" stroke="#334155" strokeWidth={3} />
              <circle cx={0} cy={0} r={10} fill="#94a3b8" />
              <line x1={-9} y1={0} x2={9} y2={0} stroke="#475569" strokeWidth={2.5} />
              <line x1={0} y1={-9} x2={0} y2={9} stroke="#475569" strokeWidth={2.5} />
              <circle cx={0} cy={0} r={4} fill="#f8fafc" />
            </g>
          </g>
          <g transform="translate(64 -8)">
            <g className="car-wheel" transform={`rotate(${wheelAngle})`}>
              <circle cx={0} cy={0} r={19} fill="#0f172a" stroke="#334155" strokeWidth={3} />
              <circle cx={0} cy={0} r={10} fill="#94a3b8" />
              <line x1={-9} y1={0} x2={9} y2={0} stroke="#475569" strokeWidth={2.5} />
              <line x1={0} y1={-9} x2={0} y2={9} stroke="#475569" strokeWidth={2.5} />
              <circle cx={0} cy={0} r={4} fill="#f8fafc" />
            </g>
          </g>
        </g>
      );
    case 13: // Bench
      return (
        <>
          <rect x={-82} y={-88} width={164} height={14} rx={6} fill={b} />
          <rect x={-82} y={-46} width={164} height={16} rx={6} fill={b} />
          <rect x={-70} y={-32} width={12} height={32} fill={a} />
          <rect x={58} y={-32} width={12} height={32} fill={a} />
        </>
      );
    case 14: // Table
      return (
        <>
          <rect x={-92} y={-78} width={184} height={16} rx={5} fill={a} />
          <rect x={-80} y={-62} width={14} height={62} fill={b} />
          <rect x={66} y={-62} width={14} height={62} fill={b} />
        </>
      );
    case 15: // Chair
      return (
        <>
          <rect x={-44} y={-60} width={88} height={14} rx={5} fill={a} />
          <rect x={-44} y={-128} width={88} height={16} rx={5} fill={a} />
          <rect x={-42} y={-112} width={12} height={112} fill={b} />
          <rect x={30} y={-112} width={12} height={112} fill={b} />
          <rect x={-42} y={-46} width={10} height={46} fill={b} />
          <rect x={32} y={-46} width={10} height={46} fill={b} />
        </>
      );
    case 16: // Lamp
      return (
        <>
          <circle cx={0} cy={-168} r={68} fill={c} opacity={0.32} />
          <rect x={-4} y={-150} width={8} height={150} fill={b} />
          <ellipse cx={0} cy={-2} rx={42} ry={8} fill={b} />
          <path d="M -44 -152 L -26 -202 L 26 -202 L 44 -152 Z" fill={a} />
        </>
      );
    case 17: // Book
      return (
        <>
          <rect x={-62} y={-68} width={124} height={68} rx={4} fill={a} />
          <rect x={-56} y={-62} width={112} height={56} fill="#fffbeb" />
          <rect x={-62} y={-68} width={10} height={68} fill={b} />
        </>
      );
    case 18: // Cup
      return (
        <>
          <path d="M -38 -88 L 38 -88 L 28 -8 L -28 -8 Z" fill={a} />
          <path d="M 38 -74 Q 62 -60 38 -40" fill="none" stroke={c} strokeWidth={8} />
          <ellipse cx={0} cy={-4} rx={56} ry={9} fill={b} />
        </>
      );
    case 19: // Ball
      return (
        <>
          <circle cx={0} cy={-38} r={38} fill={a} />
          <path d="M -38 -38 Q 0 -64 38 -38" fill="none" stroke={b} strokeWidth={9} />
        </>
      );
    case 20: // Box
      return (
        <>
          <rect x={-50} y={-96} width={100} height={96} fill={a} />
          <polygon points="-50,-96 -20,-126 80,-126 50,-96" fill={b} />
          <polygon points="50,-96 80,-126 80,-28 50,0" fill={c} />
        </>
      );
    case 21: // Phone
      return (
        <>
          <rect x={-38} y={-148} width={76} height={148} rx={14} fill={a} />
          <rect x={-30} y={-132} width={60} height={110} rx={6} fill={c} />
          <circle cx={0} cy={-20} r={5} fill={b} />
        </>
      );
    case 22: // Cake
      return (
        <>
          <rect x={-66} y={-64} width={132} height={64} fill={a} />
          <rect x={-66} y={-88} width={132} height={24} rx={8} fill={b} />
          <rect x={-60} y={-58} width={10} height={52} fill={b} />
          <rect x={-30} y={-58} width={10} height={52} fill={b} />
          <rect x={0} y={-58} width={10} height={52} fill={b} />
          <rect x={30} y={-58} width={10} height={52} fill={b} />
          <rect x={-4} y={-124} width={8} height={36} fill={c} />
          <circle cx={0} cy={-128} r={6} fill="#f59e0b" />
        </>
      );
    case 23: // Apple
      return (
        <>
          <circle cx={-9} cy={-52} r={34} fill={a} />
          <circle cx={11} cy={-52} r={32} fill={a} />
          <rect x={-2} y={-92} width={4} height={18} fill={b} />
          <ellipse cx={12} cy={-86} rx={13} ry={8} fill={c} />
        </>
      );
    case 24: // Balloon
      return (
        <>
          <ellipse cx={0} cy={-140} rx={42} ry={56} fill={a} />
          <path d="M 0 -84 L 0 0" stroke={b} strokeWidth={2.5} />
        </>
      );
    case 25: // Umbrella
      return (
        <>
          <path d="M -86 -84 Q -44 -128 0 -128 Q 44 -128 86 -84 Z" fill={a} />
          <path d="M 0 -128 L 0 -116" stroke={b} strokeWidth={5} />
          <rect x={-3} y={-84} width={6} height={84} fill={b} />
          <path d="M -3 0 Q -3 14 -16 14" fill="none" stroke={b} strokeWidth={5} />
        </>
      );
    case 26: // Mushroom
      return (
        <>
          <rect x={-16} y={-48} width={32} height={48} fill={b} />
          <path d="M -58 -48 Q -58 -108 0 -108 Q 58 -108 58 -48 Z" fill={a} />
          <circle cx={-22} cy={-72} r={7} fill={c} />
          <circle cx={18} cy={-84} r={8} fill={c} />
          <circle cx={2} cy={-60} r={5} fill={c} />
        </>
      );
    case 27: // Fish
      return (
        <>
          <ellipse cx={0} cy={-46} rx={66} ry={34} fill={a} />
          <polygon points="60,-46 98,-72 98,-22" fill={b} />
          <polygon points="-14,-46 -40,-72 -40,-20" fill={c} opacity={0.85} />
          <circle cx={-28} cy={-50} r={6} fill="#111827" />
        </>
      );
    case 28: // Signpost
      return (
        <>
          <rect x={-5} y={-140} width={10} height={140} fill={b} />
          <rect x={-74} y={-176} width={148} height={46} rx={6} fill={a} />
          <rect x={-58} y={-160} width={116} height={8} fill={c} />
        </>
      );
    case 29: // Crown
      return (
        <>
          <polygon points="-66,0 -66,-60 -34,-34 0,-96 34,-34 66,-60 66,0" fill={a} />
          <circle cx={0} cy={-26} r={8} fill={c} />
          <circle cx={-40} cy={-20} r={7} fill={c} />
          <circle cx={40} cy={-20} r={7} fill={c} />
        </>
      );
    case 30: // Mountain
      return (
        <>
          <polygon points="-110,0 -58,-104 -12,-38 28,-122 82,-46 108,0" fill={a} />
          <polygon points="24,-94 28,-122 32,-94" fill="#ffffff" />
          <polygon points="-58,-104 -42,-74 -74,-70" fill="#ffffff" />
        </>
      );
    case 31: // Castle
      return (
        <>
          <rect x={-46} y={-146} width={92} height={146} fill={a} />
          <rect x={-46} y={-146} width={18} height={146} fill={b} />
          <rect x={-24} y={-146} width={18} height={146} fill={b} />
          <rect x={-2} y={-146} width={18} height={146} fill={b} />
          <rect x={20} y={-146} width={18} height={146} fill={b} />
          <rect x={-58} y={-164} width={116} height={20} rx={5} fill={c} />
          <rect x={-12} y={-92} width={24} height={92} fill={c} />
        </>
      );
    case 32: // Tent
      return (
        <>
          <polygon points="-76,0 -56,-112 56,-112 76,0" fill={a} />
          <polygon points="-56,-112 56,-112 46,-56 -46,-56" fill={b} />
          <polygon points="0,-112 0,0" stroke={c} strokeWidth={4} />
        </>
      );
    case 33: // Sofa
      return (
        <>
          <rect x={-86} y={-58} width={172} height={38} rx={10} fill={a} />
          <rect x={-86} y={-104} width={172} height={46} rx={10} fill={a} />
          <rect x={-74} y={-24} width={14} height={24} fill={b} />
          <rect x={60} y={-24} width={14} height={24} fill={b} />
        </>
      );
    case 34: // Bed
      return (
        <>
          <rect x={-70} y={-56} width={140} height={22} rx={6} fill={a} />
          <rect x={-70} y={-34} width={140} height={34} fill={c} />
          <rect x={-70} y={-80} width={140} height={24} rx={6} fill={b} />
          <rect x={-70} y={-24} width={14} height={24} fill={b} />
          <rect x={56} y={-24} width={14} height={24} fill={b} />
        </>
      );
    case 35: // TV
      return (
        <>
          <rect x={-78} y={-96} width={156} height={92} rx={8} fill={a} />
          <rect x={-66} y={-84} width={132} height={70} fill={b} />
          <circle cx={0} cy={-50} r={14} fill={c} />
          <rect x={-40} y={-4} width={80} height={4} fill={b} />
        </>
      );
    case 36: // Plant pot
      return (
        <>
          <path d="M 0 -60 L 0 -128" stroke={b} strokeWidth={6} />
          <path d="M 0 -90 Q -34 -100 -30 -132" stroke={b} strokeWidth={5} fill="none" />
          <path d="M 0 -100 Q 34 -110 30 -142" stroke={b} strokeWidth={5} fill="none" />
          <circle cx={-30} cy={-132} r={22} fill={a} />
          <circle cx={30} cy={-142} r={24} fill={a} />
          <circle cx={0} cy={-158} r={26} fill={c} />
          <polygon points="-34,0 -28,-40 28,-40 34,0" fill={b} />
        </>
      );
    case 37: // Gift
      return (
        <>
          <rect x={-44} y={-82} width={88} height={82} rx={8} fill={a} />
          <rect x={-44} y={-82} width={88} height={18} fill={b} />
          <rect x={-6} y={-82} width={12} height={82} fill={b} />
          <path d="M 0 -82 Q -26 -104 -14 -118 Q 0 -126 12 -108 Q 26 -104 0 -82" fill={b} />
        </>
      );
    case 38: // Key
      return (
        <>
          <circle cx={0} cy={-78} r={28} fill="none" stroke={a} strokeWidth={14} />
          <rect x={-7} y={-52} width={14} height={52} fill={a} />
          <rect x={-7} y={-38} width={24} height={10} fill={a} />
          <rect x={-7} y={-20} width={20} height={9} fill={a} />
        </>
      );
    case 39: // Pizza
      return (
        <>
          <polygon points="0,0 -66,-86 66,-86" fill={a} />
          <polygon points="0,0 -66,-86 66,-86" fill="none" stroke={b} strokeWidth={6} />
          <path d="M -66 -86 L 66 -86" stroke={b} strokeWidth={16} strokeLinecap="round" />
          <circle cx={-18} cy={-48} r={10} fill={c} />
          <circle cx={22} cy={-66} r={10} fill={c} />
          <circle cx={34} cy={-38} r={8} fill={c} />
        </>
      );
    case 40: // Burger
      return (
        <>
          <path d="M -52 -50 Q -52 -88 0 -88 Q 52 -88 52 -50 Z" fill={a} />
          <rect x={-52} y={-46} width={104} height={12} fill={c} />
          <rect x={-46} y={-34} width={92} height={20} rx={8} fill={b} />
          <rect x={-52} y={-22} width={104} height={14} rx={7} fill={c} opacity={0.8} />
          <path d="M -52 -12 L 52 -12 L 52 0 L -52 0 Z" fill={a} />
        </>
      );
    case 41: // Ice cream
      return (
        <>
          <path d="M -30 -62 L 0 0 L 30 -62 Z" fill={a} />
          <path d="M -30 -62 Q -30 -96 0 -96 Q 30 -96 30 -62 L -30 -62" fill={b} />
          <circle cx={0} cy={-104} r={10} fill={c} />
        </>
      );
    case 42: // Bike
      return (
        <>
          <circle cx={-52} cy={-26} r={26} fill="none" stroke={a} strokeWidth={7} />
          <circle cx={52} cy={-26} r={26} fill="none" stroke={a} strokeWidth={7} />
          <line x1={-52} y1={-26} x2={0} y2={-64} stroke={b} strokeWidth={6} />
          <line x1={0} y1={-64} x2={52} y2={-26} stroke={b} strokeWidth={6} />
          <line x1={0} y1={-64} x2={-6} y2={-92} stroke={b} strokeWidth={6} />
          <line x1={-30} y1={-92} x2={14} y2={-92} stroke={b} strokeWidth={7} />
        </>
      );
    case 43: // Boat
      return (
        <>
          <path d="M -84 -36 Q -84 -4 0 -2 Q 84 -4 84 -36 L -84 -36" fill={a} />
          <line x1={0} y1={-36} x2={0} y2={-108} stroke={b} strokeWidth={5} />
          <polygon points="0,-108 0,-44 52,-48" fill={c} />
        </>
      );
    case 44: // Plane
      return (
        <>
          <ellipse cx={0} cy={-52} rx={92} ry={16} fill={a} />
          <rect x={-92} y={-52} width={184} height={10} fill={b} />
          <polygon points="0,-40 0,-88 -26,-40" fill={b} />
          <circle cx={-30} cy={-58} r={6} fill={c} />
          <circle cx={-10} cy={-58} r={6} fill={c} />
          <circle cx={10} cy={-58} r={6} fill={c} />
          <circle cx={30} cy={-58} r={6} fill={c} />
        </>
      );
    case 45: // Rocket
      return (
        <>
          <path d="M 0 -126 Q 20 -62 14 0 L -14 0 Q -20 -62 0 -126" fill={a} />
          <path d="M 0 -126 Q 12 -62 8 -34 L 0 -34 Z" fill={c} />
          <polygon points="18,-50 46,-20 16,-20" fill={b} />
          <polygon points="-18,-50 -46,-20 -16,-20" fill={b} />
          <ellipse cx={0} cy={10} rx={10} ry={22} fill="#fb923c" />
        </>
      );
    case 46: // Train
      return (
        <>
          <rect x={-96} y={-70} width={192} height={62} rx={10} fill={a} />
          <rect x={-96} y={-70} width={70} height={62} fill={b} />
          <rect x={-66} y={-60} width={40} height={22} rx={5} fill={c} />
          <circle cx={-62} cy={0} r={15} fill="#111827" />
          <circle cx={62} cy={0} r={15} fill="#111827" />
        </>
      );
    case 47: // Traffic light
      return (
        <>
          <rect x={-4} y={-120} width={8} height={120} fill={b} />
          <rect x={-26} y={-156} width={52} height={72} rx={8} fill={a} />
          <circle cx={0} cy={-142} r={9} fill="#ef4444" />
          <circle cx={0} cy={-122} r={9} fill="#facc15" />
          <circle cx={0} cy={-102} r={9} fill="#22c55e" />
        </>
      );
    case 48: // Bin
      return (
        <>
          <path d="M -46 0 L -40 -86 L 40 -86 L 46 0 Z" fill={a} />
          <rect x={-52} y={-96} width={104} height={14} rx={6} fill={b} />
          <rect x={-8} y={-96} width={16} height={12} fill={b} />
        </>
      );
    case 49: // Fence
      return (
        <>
          {[-80, -48, -16, 16, 48, 80].map((x) => (
            <rect key={x} x={x - 6} y={-66} width={12} height={66} rx={3} fill={a} />
          ))}
          <rect x={-96} y={-52} width={192} height={12} fill={b} />
          <rect x={-96} y={-26} width={192} height={12} fill={b} />
        </>
      );
    case 50: // Bridge
      return (
        <>
          <path d="M -110 0 L -110 -56 L 110 -56 L 110 0 Z" fill={a} />
          <path d="M -110 -56 Q 0 -124 110 -56" fill="none" stroke={b} strokeWidth={8} />
          {[-66, -22, 22, 66].map((x) => (
            <line key={x} x1={x} y1={-52} x2={x} y2={-104} stroke={b} strokeWidth={6} />
          ))}
        </>
      );
    case 51: // Windmill
      return (
        <>
          <polygon points="-46,0 -28,-150 28,-150 46,0" fill={a} />
          <line x1={0} y1={-150} x2={-66} y2={-210} stroke={b} strokeWidth={10} />
          <line x1={0} y1={-150} x2={66} y2={-196} stroke={b} strokeWidth={10} />
          <line x1={0} y1={-150} x2={-20} y2={-234} stroke={b} strokeWidth={10} />
          <line x1={0} y1={-150} x2={46} y2={-226} stroke={b} strokeWidth={10} />
          <circle cx={0} cy={-150} r={12} fill={c} />
        </>
      );
    case 52: // Snowman
      return (
        <>
          <circle cx={0} cy={-44} r={38} fill={a} />
          <circle cx={0} cy={-112} r={28} fill={a} />
          <circle cx={0} cy={-158} r={18} fill={a} />
          <polygon points="10,-158 46,-156 10,-146" fill="#f59e0b" />
          <circle cx={-6} cy={-168} r={3} fill="#111827" />
          <circle cx={6} cy={-168} r={3} fill="#111827" />
          <circle cx={-10} cy={-70} r={4} fill="#111827" />
          <circle cx={10} cy={-70} r={4} fill="#111827" />
        </>
      );
    case 53: // Pumpkin
      return (
        <>
          <path d="M 0 -18 Q -52 -18 -54 -66 Q -56 -110 0 -110 Q 56 -110 54 -66 Q 52 -18 0 -18" fill={a} />
          <ellipse cx={0} cy={-64} rx={14} ry={40} fill={b} opacity={0.7} />
          <rect x={-6} y={-126} width={12} height={18} rx={5} fill="#365314" />
        </>
      );
    case 54: // Rainbow
      return (
        <>
          <path d="M -100 0 A 100 100 0 0 1 100 0" fill="none" stroke={a} strokeWidth={12} />
          <path d="M -80 0 A 80 80 0 0 1 80 0" fill="none" stroke={b} strokeWidth={12} opacity={0.9} />
          <path d="M -60 0 A 60 60 0 0 1 60 0" fill="none" stroke={c} strokeWidth={12} opacity={0.9} />
        </>
      );
    case 55: // Lightning
      return <polygon points="18,-150 -34,-40 -2,-40 -18,6 40,-62 6,-62" fill={a} stroke={c} strokeWidth={3} />;
    case 56: // Snowflake
      return (
        <>
          {[0, 60, 120].map((r) => (
            <g key={r} transform={`rotate(${r} 0 -70)`}>
              <line x1={0} y1={-70} x2={0} y2={-130} stroke={a} strokeWidth={8} />
              <line x1={0} y1={-70} x2={0} y2={-10} stroke={a} strokeWidth={8} />
              <line x1={-14} y1={-112} x2={14} y2={-112} stroke={a} strokeWidth={6} />
              <line x1={-14} y1={-28} x2={14} y2={-28} stroke={a} strokeWidth={6} />
            </g>
          ))}
        </>
      );
    case 57: // Butterfly
      return (
        <>
          <ellipse cx={-38} cy={-70} rx={38} ry={30} fill={a} opacity={0.92} />
          <ellipse cx={38} cy={-70} rx={38} ry={30} fill={a} opacity={0.92} />
          <ellipse cx={0} cy={-70} rx={8} ry={30} fill="#111827" />
          <circle cx={-30} cy={-78} r={10} fill={c} />
          <circle cx={30} cy={-78} r={10} fill={c} />
        </>
      );
    case 58: // Bee
      return (
        <>
          <ellipse cx={0} cy={-70} rx={34} ry={28} fill="#facc15" />
          <path d="M -28 -70 L 28 -70" stroke="#111827" strokeWidth={14} />
          <path d="M -10 -94 L 10 -46" stroke="#111827" strokeWidth={14} />
          <ellipse cx={-20} cy={-96} rx={22} ry={14} fill="#ffffff" opacity={0.85} />
          <ellipse cx={20} cy={-96} rx={22} ry={14} fill="#ffffff" opacity={0.85} />
        </>
      );
    case 59: // Snail
      return (
        <>
          <path d="M -78 0 Q -78 -30 0 -30 Q 78 -30 78 0 Z" fill={a} />
          <circle cx={14} cy={-58} r={36} fill={b} />
          <circle cx={14} cy={-58} r={24} fill={a} />
          <circle cx={14} cy={-58} r={12} fill={b} />
          <line x1={-48} y1={-30} x2={-40} y2={-72} stroke={a} strokeWidth={6} />
          <line x1={-30} y1={-30} x2={-30} y2={-76} stroke={a} strokeWidth={6} />
        </>
      );
    case 60: // Burj Khalifa (Megatall Skyscraper)
      return (
        <g>
          {/* Foundation & podium */}
          <polygon points="-80,0 -80,-30 80,-30 80,0" fill="#334155" />
          <polygon points="-65,-30 -60,-80 60,-80 65,-30" fill="#475569" />
          {/* Tier 1 setback */}
          <polygon points="-55,-80 -48,-160 48,-160 55,-80" fill={a} />
          <polygon points="-48,-160 0,-160 0,-80 -55,-80" fill="#0284c7" opacity={0.3} />
          {[-40, -20, 0, 20, 40].map((lx) => (
            <line key={lx} x1={lx} y1={-80} x2={lx * 0.85} y2={-160} stroke="#e0f2fe" strokeWidth={1.5} opacity={0.7} />
          ))}
          {/* Tier 2 setback */}
          <polygon points="-44,-160 -36,-240 36,-240 44,-160" fill={a} />
          <polygon points="0,-160 36,-240 0,-240" fill="#38bdf8" opacity={0.25} />
          {[-30, -10, 10, 30].map((lx) => (
            <line key={lx} x1={lx} y1={-160} x2={lx * 0.8} y2={-240} stroke="#ffffff" strokeWidth={1.2} opacity={0.8} />
          ))}
          {/* Tier 3 setback */}
          <polygon points="-32,-240 -24,-330 24,-330 32,-240" fill={a} />
          <polygon points="-24,-330 0,-330 0,-240 -32,-240" fill="#0369a1" opacity={0.35} />
          {[-20, 0, 20].map((lx) => (
            <line key={lx} x1={lx} y1={-240} x2={lx * 0.75} y2={-330} stroke="#bae6fd" strokeWidth={1} opacity={0.75} />
          ))}
          {/* Tier 4 upper tower */}
          <polygon points="-20,-330 -12,-410 12,-410 20,-330" fill={a} />
          <line x1={0} y1={-330} x2={0} y2={-410} stroke="#ffffff" strokeWidth={2} opacity={0.9} />
          {/* Pinnacles and massive spire */}
          <polygon points="-10,-410 -5,-470 5,-470 10,-410" fill="#94a3b8" />
          <polygon points="-4,-470 -1.5,-530 1.5,-530 4,-470" fill="#cbd5e1" />
          <line x1={0} y1={-530} x2={0} y2={-570} stroke="#f8fafc" strokeWidth={2.5} />
          {/* Aircraft warning beacon light */}
          <circle cx={0} cy={-570} r={4} fill="#ef4444" />
          <circle cx={0} cy={-570} r={8} fill="#ef4444" opacity={0.4} />
        </g>
      );
    case 61: // Eiffel Tower
      return (
        <g>
          {/* 4 Iron legs & base arch */}
          <path d="M -80 0 L -60 -90 L -30 -90 L -50 0 Z" fill={b} />
          <path d="M 80 0 L 60 -90 L 30 -90 L 50 0 Z" fill={b} />
          <path d="M -48 -20 Q 0 -95 48 -20" stroke={b} strokeWidth={8} fill="none" />
          {/* First platform */}
          <rect x={-64} y={-96} width={128} height={10} rx={2} fill={a} />
          <rect x={-58} y={-102} width={116} height={6} fill="#1e293b" opacity={0.6} />
          {/* Middle tower */}
          <polygon points="-46,-102 -26,-200 26,-200 46,-102" fill={b} />
          <line x1={-42} y1={-104} x2={22} y2={-198} stroke="#0f172a" strokeWidth={2.5} opacity={0.7} />
          <line x1={42} y1={-104} x2={-22} y2={-198} stroke="#0f172a" strokeWidth={2.5} opacity={0.7} />
          <line x1={-36} y1={-150} x2={36} y2={-150} stroke={a} strokeWidth={3} />
          {/* Second platform */}
          <rect x={-32} y={-206} width={64} height={8} rx={2} fill={a} />
          {/* Upper tower */}
          <polygon points="-22,-206 -8,-320 8,-320 22,-206" fill={b} />
          <line x1={-16} y1={-208} x2={7} y2={-318} stroke="#0f172a" strokeWidth={2} opacity={0.7} />
          <line x1={16} y1={-208} x2={-7} y2={-318} stroke="#0f172a" strokeWidth={2} opacity={0.7} />
          {/* Cupola & radio spire */}
          <rect x={-12} y={-326} width={24} height={7} rx={2} fill={a} />
          <ellipse cx={0} cy={-330} rx={8} ry={5} fill={b} />
          <line x1={0} y1={-334} x2={0} y2={-370} stroke="#f8fafc" strokeWidth={2.5} />
          <circle cx={0} cy={-370} r={3} fill="#eab308" />
        </g>
      );
    case 62: // Statue of Liberty
      return (
        <g>
          {/* Stone Pedestal */}
          <polygon points="-50,0 -45,-30 45,-30 50,0" fill="#64748b" />
          <rect x={-36} y={-70} width={72} height={40} fill="#94a3b8" />
          <rect x={-40} y={-76} width={80} height={8} fill="#cbd5e1" />
          <rect x={-32} y={-100} width={64} height={26} fill="#94a3b8" />
          <rect x={-36} y={-106} width={72} height={8} fill="#cbd5e1" />
          {/* Draped Teal Robe */}
          <path d="M -24 -106 L -20 -200 Q 0 -220 20 -200 L 26 -106 Z" fill="#14b8a6" />
          <path d="M -16 -120 Q -5 -160 -12 -195" stroke="#0f766e" strokeWidth={3} fill="none" />
          <path d="M 12 -120 Q 5 -160 10 -195" stroke="#0f766e" strokeWidth={3} fill="none" />
          <path d="M -4 -110 L 0 -190" stroke="#0f766e" strokeWidth={2.5} fill="none" />
          {/* Left arm holding tablet */}
          <path d="M -18 -190 L -30 -160 L -22 -155" stroke="#14b8a6" strokeWidth={8} strokeLinecap="round" fill="none" />
          <rect x={-36} y={-165} width={12} height={16} rx={1} fill="#f8fafc" stroke="#64748b" strokeWidth={1} />
          {/* Crown & radiate spikes */}
          <ellipse cx={0} cy={-215} rx={10} ry={13} fill="#2dd4bf" />
          {[-45, -30, -15, 0, 15, 30, 45].map((ang) => {
            const rad = (ang * Math.PI) / 180;
            const x1 = Math.sin(rad) * 11;
            const y1 = -220 - Math.cos(rad) * 11;
            const x2 = Math.sin(rad) * 22;
            const y2 = -220 - Math.cos(rad) * 22;
            return <line key={ang} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#14b8a6" strokeWidth={2.5} />;
          })}
          {/* Right arm holding torch flame */}
          <path d="M 16 -190 L 32 -240 L 34 -255" stroke="#14b8a6" strokeWidth={7} strokeLinecap="round" fill="none" />
          <polygon points="30,-255 38,-255 35,-262 33,-262" fill="#0f766e" />
          <path d="M 34 -262 Q 28 -272 34 -282 Q 40 -272 34 -262 Z" fill="#f59e0b" />
          <circle cx={34} cy={-270} r={4} fill="#fef08a" />
        </g>
      );
    case 63: // Blue Whale
      return (
        <g>
          {/* Streamlined leviathan whale body */}
          <path
            d="M -120 -60 Q -90 -110 0 -95 Q 80 -80 130 -40 Q 150 -10 130 0 Q 70 15 -10 10 Q -70 5 -110 -25 Q -130 -40 -120 -60 Z"
            fill="#1e3a8a"
          />
          {/* Underside ventral throat pleats */}
          <path d="M -70 0 Q 0 12 70 0 Q 100 -5 125 -15" stroke="#93c5fd" strokeWidth={3} fill="none" opacity={0.8} />
          {[-40, -15, 10, 35, 60, 85].map((px) => (
            <line key={px} x1={px} y1={-8} x2={px + 12} y2={-2} stroke="#bfdbfe" strokeWidth={1.8} opacity={0.65} />
          ))}
          <circle cx={110} cy={-28} r={3.5} fill="#020617" />
          <circle cx={111} cy={-29} r={1.2} fill="#ffffff" />
          <path d="M 90 -22 Q 115 -18 128 -30" stroke="#0f172a" strokeWidth={2} fill="none" />
          {/* Pectoral flipper fin */}
          <path d="M 30 -10 Q 40 25 15 35 Q 20 15 25 -5" fill="#1e40af" stroke="#172554" strokeWidth={1.5} />
          {/* Dorsal fin */}
          <path d="M -60 -95 L -75 -115 L -80 -95 Z" fill="#172554" />
          {/* Massive horizontal tail fluke */}
          <path d="M -120 -60 Q -145 -70 -165 -90 Q -155 -60 -130 -50 Q -155 -40 -165 -15 Q -145 -35 -120 -45 Z" fill="#1e3a8a" />
          {/* Water spout / Blowhole spray */}
          <path d="M 25 -92 Q 22 -135 10 -150" stroke="#67e8f9" strokeWidth={3} fill="none" strokeDasharray="4 3" opacity={0.85} />
          <path d="M 27 -92 Q 35 -135 48 -148" stroke="#67e8f9" strokeWidth={3} fill="none" strokeDasharray="4 3" opacity={0.85} />
          <circle cx={10} cy={-152} r={3} fill="#a5f3fc" />
          <circle cx={48} cy={-150} r={3.5} fill="#a5f3fc" />
        </g>
      );
    default:
      return <circle cx={0} cy={-40} r={40} fill={a} />;
  }
}

export function ObjectArt({ family, pal, variant, wheelAngle = 0 }: { family: number; pal: P; variant: number; wheelAngle?: number }) {
  const s = VARIANT_SCALE[variant] ?? 1;
  return <g transform={`scale(${s})`}>{art(family, pal[0], pal[1], pal[2], wheelAngle)}</g>;
}

/** Background: sky gradient, decor for the scene kind, then ground. */
export function BackgroundArt({
  kind,
  palette,
  W,
  H,
  gy,
  image,
}: {
  kind: number;
  palette: number;
  W: number;
  H: number;
  gy: number;
  image?: string;
}) {
  const pal = SCENE_PALETTES[palette % SCENE_PALETTES.length];
  const [top, bottom, ground, accent] = pal;
  const rnd = mulberry32(kind * 97 + palette * 13 + 5);
  const R = (lo: number, hi: number) => lo + rnd() * (hi - lo);
  const id = `sky-${kind}-${palette}`;
  if (image) {
    return (
      <g>
        <image href={image} x={0} y={0} width={W} height={H} preserveAspectRatio="xMidYMid slice" />
      </g>
    );
  }
  const deco: ReactNode[] = [];

  switch (kind) {
    case 0:
      deco.push(<path key="h" d={`M 0 ${gy - 110} Q ${W * 0.3} ${gy - 220} ${W * 0.6} ${gy - 120} T ${W} ${gy - 130} L ${W} ${gy} L 0 ${gy} Z`} fill={accent} opacity={0.6} />);
      for (let i = 0; i < 9; i++) {
        const x = R(0, W);
        deco.push(
          <g key={`t${i}`}>
            <rect x={x - 6} y={gy - 120} width={12} height={120} fill="#7a4b22" />
            <circle cx={x} cy={gy - 150} r={R(40, 60)} fill="#3f9d3a" />
          </g>,
        );
      }
      break;
    case 1:
      deco.push(<circle key="sun" cx={W * 0.8} cy={140} r={60} fill="#fff3c4" />);
      deco.push(<rect key="sea" x={0} y={gy - 200} width={W} height={200} fill={accent} />);
      for (let i = 0; i < 6; i++) deco.push(<path key={`w${i}`} d={`M ${R(0, W)} ${gy - R(60, 170)} q 30 -14 60 0`} fill="none" stroke="#ffffff" strokeWidth={3} opacity={0.7} />);
      break;
    case 2:
      for (let i = 0; i < 14; i++) {
        const w = W / 14 + 4;
        const h = R(160, 420);
        deco.push(<rect key={`b${i}`} x={i * (W / 14)} y={gy - h} width={w} height={h} fill={i % 2 ? accent : "#0f172a"} />);
        for (let k = 0; k < 6; k++) deco.push(<rect key={`w${i}-${k}`} x={i * (W / 14) + 10 + (k % 2) * 22} y={gy - h + 18 + Math.floor(k / 2) * 40} width={10} height={14} fill="#fde68a" opacity={0.85} />);
      }
      break;
    case 3:
      deco.push(<rect key="wall" x={0} y={0} width={W} height={gy} fill={top} />);
      deco.push(<rect key="base" x={0} y={gy - 18} width={W} height={18} fill={bottom} />);
      deco.push(<rect key="win" x={W * 0.1} y={gy * 0.2} width={260} height={240} fill={accent} stroke="#ffffff" strokeWidth={14} />);
      deco.push(<rect key="pic" x={W * 0.7} y={gy * 0.28} width={150} height={110} fill={accent} opacity={0.6} />);
      break;
    case 4:
      for (let i = 0; i < 30; i++) {
        const x = R(-20, W + 20);
        const h = R(160, 320);
        deco.push(<polygon key={`p${i}`} points={`${x},${gy - h} ${x - 60},${gy} ${x + 60},${gy}`} fill={i % 2 ? accent : bottom} opacity={0.8} />);
      }
      break;
    case 5:
      for (let i = 0; i < 140; i++) deco.push(<circle key={`s${i}`} cx={R(0, W)} cy={R(0, gy)} r={R(1, 3)} fill="#ffffff" opacity={R(0.4, 1)} />);
      deco.push(<circle key="planet" cx={W * 0.8} cy={H * 0.3} r={120} fill={accent} />);
      deco.push(<ellipse key="ring" cx={W * 0.8} cy={H * 0.3} rx={190} ry={36} fill="none" stroke={accent} strokeWidth={10} opacity={0.6} />);
      break;
    case 6:
      for (let i = 0; i < 6; i++) deco.push(<polygon key={`m${i}`} points={`${i * 240 - 40},${gy} ${i * 240 + 120},${gy - R(260, 420)} ${i * 240 + 300},${gy}`} fill={accent} />);
      deco.push(<rect key="snowg" x={0} y={gy - 4} width={W} height={20} fill="#ffffff" />);
      for (let i = 0; i < 40; i++) deco.push(<circle key={`f${i}`} cx={R(0, W)} cy={R(0, gy)} r={R(2, 5)} fill="#ffffff" opacity={0.9} />);
      break;
    case 7:
      deco.push(<circle key="sun" cx={W * 0.8} cy={160} r={60} fill="#fde68a" />);
      for (let i = 0; i < 4; i++) deco.push(<ellipse key={`d${i}`} cx={R(0, W)} cy={gy - 40} rx={R(200, 340)} ry={60} fill={accent} />);
      deco.push(<rect key="cact" x={W * 0.2} y={gy - 150} width={18} height={150} rx={9} fill="#3d7a3a" />);
      break;
    case 8:
      deco.push(<circle key="sun" cx={W / 2} cy={gy - 160} r={120} fill={accent} />);
      for (let i = 0; i < 5; i++) deco.push(<ellipse key={`c${i}`} cx={R(0, W)} cy={R(80, 260)} rx={R(90, 160)} ry={28} fill="#ffe4e6" opacity={0.7} />);
      deco.push(<path key="hills" d={`M 0 ${gy - 60} Q ${W * 0.4} ${gy - 160} ${W} ${gy - 60} L ${W} ${gy} L 0 ${gy} Z`} fill={bottom} opacity={0.7} />);
      break;
    case 9:
      for (let i = 0; i < 90; i++) deco.push(<circle key={`s${i}`} cx={R(0, W)} cy={R(0, gy * 0.7)} r={R(1, 2.5)} fill="#ffffff" opacity={R(0.3, 1)} />);
      deco.push(<circle key="moon" cx={W * 0.85} cy={160} r={50} fill="#fef9c3" />);
      deco.push(<path key="hill" d={`M 0 ${gy - 40} Q ${W * 0.5} ${gy - 140} ${W} ${gy - 40} L ${W} ${gy} L 0 ${gy} Z`} fill={accent} opacity={0.5} />);
      break;
    default:
      break;
  }

  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={W} height={H} fill={`url(#${id})`} />
      {deco}
      <rect x={0} y={gy} width={W} height={H - gy} fill={ground} />
    </g>
  );
}
