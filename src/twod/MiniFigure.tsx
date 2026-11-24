import { useMemo } from "react";
import { locoPose } from "../sandbox/locomotion";

const angleOf = (v: [number, number, number]) => (Math.abs(v[2]) > Math.abs(v[0]) ? v[2] : v[0]);

/** A tiny static figure that previews a stance/gesture combo. */
export default function MiniFigure({ stance, gesture, idle }: { stance: string; gesture: string; idle: boolean }) {
  const angles = useMemo(() => {
    const pose = locoPose({
      speed: 0,
      grounded: true,
      vy: 0,
      gait: 0,
      t: idle ? 0 : 1.4,
      held: false,
      perf: idle ? null : { stance, gesture },
      talking: false,
    });
    const out: Record<string, number> = {};
    for (const k of Object.keys(pose.rot)) out[k] = angleOf(pose.rot[k]);
    return out;
  }, [stance, gesture, idle]);

  const A = (k: string) => `rotate(${(angles[k] ?? 0) * 57.3})`;
  return (
    <svg viewBox="-90 -150 180 170" className="h-14 w-11 shrink-0 rounded bg-black/40">
      {/* legs */}
      <g transform="translate(0 -6)">
        <g transform={`translate(-18 0) ${A("lUpperLeg")}`}>
          <line x1={0} y1={0} x2={0} y2={52} stroke="#334155" strokeWidth={13} strokeLinecap="round" />
          <g transform={`translate(0 52) ${A("lLowerLeg")}`}>
            <line x1={0} y1={0} x2={0} y2={48} stroke="#334155" strokeWidth={11} strokeLinecap="round" />
          </g>
        </g>
        <g transform={`translate(18 0) ${A("rUpperLeg")}`}>
          <line x1={0} y1={0} x2={0} y2={52} stroke="#334155" strokeWidth={13} strokeLinecap="round" />
          <g transform={`translate(0 52) ${A("rLowerLeg")}`}>
            <line x1={0} y1={0} x2={0} y2={48} stroke="#334155" strokeWidth={11} strokeLinecap="round" />
          </g>
        </g>
      </g>
      {/* torso */}
      <g transform={`translate(0 -6) ${A("spine")}`}>
        <rect x={-30} y={-95} width={60} height={92} rx={24} fill="#e87d0d" />
        {/* arms */}
        <g transform={`translate(-42 -84) ${A("lUpperArm")}`}>
          <line x1={0} y1={0} x2={0} y2={38} stroke="#e87d0d" strokeWidth={13} strokeLinecap="round" />
          <g transform={`translate(0 38) ${A("lLowerArm")}`}>
            <line x1={0} y1={0} x2={0} y2={36} stroke="#f1c27d" strokeWidth={11} strokeLinecap="round" />
          </g>
        </g>
        <g transform={`translate(42 -84) ${A("rUpperArm")}`}>
          <line x1={0} y1={0} x2={0} y2={38} stroke="#e87d0d" strokeWidth={13} strokeLinecap="round" />
          <g transform={`translate(0 38) ${A("rLowerArm")}`}>
            <line x1={0} y1={0} x2={0} y2={36} stroke="#f1c27d" strokeWidth={11} strokeLinecap="round" />
          </g>
        </g>
        {/* head */}
        <g transform={`translate(0 -102) ${A("head")}`}>
          <circle cx={0} cy={0} r={30} fill="#f1c27d" />
          <circle cx={-10} cy={-4} r={3.5} fill="#111827" />
          <circle cx={10} cy={-4} r={3.5} fill="#111827" />
          <path d="M -9 9 Q 0 13 9 9" fill="none" stroke="#111827" strokeWidth={2.5} strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}
