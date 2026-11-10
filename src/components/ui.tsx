import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "success" | "ghost";
const V: Record<Variant, string> = {
  primary: "bg-indigo-600 text-white active:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-900",
  secondary: "bg-slate-200 text-slate-900 active:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:active:bg-slate-700",
  danger: "bg-rose-500 text-white active:bg-rose-600",
  success: "bg-emerald-500 text-white active:bg-emerald-600",
  ghost: "bg-transparent text-slate-600 active:bg-slate-100 dark:text-slate-300 dark:active:bg-slate-800",
};

export function Button({ variant = "primary", className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...rest}
      className={`min-h-14 rounded-2xl px-5 text-lg font-semibold transition active:scale-[0.98] disabled:opacity-60 ${V[variant]} ${className}`}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 ${className}`}>{children}</div>;
}

export function ProgressBar({ value, max, className = "", color = "bg-indigo-500" }: { value: number; max: number; className?: string; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={`h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 ${className}`}>
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PageTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h1 className="text-2xl font-bold">{children}</h1>
      {right}
    </div>
  );
}

export function Loading() {
  return <div className="py-20 text-center text-slate-400">불러오는 중…</div>;
}
