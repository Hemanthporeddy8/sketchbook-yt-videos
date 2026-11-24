import type { ReactNode } from "react";
import { cn } from "../utils/cn";

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-medium text-slate-400">{label}</div>
      {children}
    </div>
  );
}

export function NumberInput({
  value,
  onChange,
  step = 0.1,
  min,
  max,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      step={step}
      min={min}
      max={max}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (Number.isFinite(v)) onChange(v);
      }}
      className={cn("w-full min-w-0 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-cyan-500/60", className)}
    />
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-medium text-slate-400">{label}</span>
        <span className="font-mono text-slate-300">{format ? format(value) : value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-cyan-400"
      />
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-300">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-cyan-400" />
      {label}
    </label>
  );
}

export function Select<T extends string | number>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={String(value)}
      onChange={(e) => {
        const opt = options.find((o) => String(o.value) === e.target.value);
        if (opt) onChange(opt.value);
      }}
      className={cn("w-full rounded-md border border-white/10 bg-[#11131a] px-2 py-1.5 text-[11px] text-slate-100 outline-none focus:border-cyan-500/60", className)}
    >
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-white/10 bg-transparent p-0" />
      <span className="font-mono text-[10px] text-slate-500">{value}</span>
    </div>
  );
}

export function Swatches({ colors, value, onPick }: { colors: string[]; value: string; onPick: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {colors.map((c) => (
        <button
          key={c}
          onClick={() => onPick(c)}
          className={cn("h-5 w-5 rounded-full border-2 transition", value === c ? "border-white" : "border-transparent")}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

export function ToolButton({
  active,
  onClick,
  icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  sub?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition",
        active ? "border-amber-400 bg-amber-400/15 text-amber-100" : "border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/25",
      )}
    >
      {icon}
      <span>
        <span className="block text-xs font-semibold">{label}</span>
        {sub && <span className="block text-[9px] text-slate-500">{sub}</span>}
      </span>
    </button>
  );
}
