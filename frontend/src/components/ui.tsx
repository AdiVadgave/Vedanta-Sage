import { motion } from "framer-motion";
import { ReactNode } from "react";

export function Card({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`card p-5 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-sage-500/15 text-sage-400">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-slate-100">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

const bandStyles: Record<string, string> = {
  High: "bg-accent-red/15 text-accent-red border-accent-red/30",
  Medium: "bg-accent-amber/15 text-accent-amber border-accent-amber/30",
  Low: "bg-accent-green/15 text-accent-green border-accent-green/30",
  OUTDATED: "bg-accent-red/15 text-accent-red border-accent-red/30",
  Current: "bg-accent-green/15 text-accent-green border-accent-green/30",
  "High Potential": "bg-accent-red/15 text-accent-red border-accent-red/30",
  Serious: "bg-sage-500/15 text-sage-400 border-sage-500/30",
};

export function Badge({ value, className = "" }: { value: string; className?: string }) {
  const style = bandStyles[value] || "bg-ink-600/40 text-slate-300 border-ink-600";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style} ${className}`}
    >
      {value}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-slate-400">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-sage-500/30 border-t-sage-500" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function EmptyState({ icon, text }: { icon?: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-slate-500">
      {icon}
      <p className="text-sm">{text}</p>
    </div>
  );
}

export function ProgressRing({
  value,
  size = 120,
  label,
}: {
  value: number; // 0-100
  size?: number;
  label?: string;
}) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (value / 100) * circ;
  const color = value >= 75 ? "#34d399" : value >= 50 ? "#fbbf24" : "#f87171";
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#1e293b" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-slate-100">{Math.round(value)}</span>
        {label && <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>}
      </div>
    </div>
  );
}
