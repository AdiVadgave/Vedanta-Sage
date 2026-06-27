import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  AlertTriangle,
  ShieldAlert,
  Activity,
  MapPin,
  TrendingUp,
  Repeat,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, Spinner, Badge } from "../components/ui";
import { getDashboard } from "../api/client";

function Counter({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) =>
    decimals ? v.toFixed(decimals) : Math.round(v).toString()
  );
  const [display, setDisplay] = useState("0");
  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.1, ease: "easeOut" });
    const unsub = rounded.on("change", setDisplay);
    return () => {
      controls.stop();
      unsub();
    };
  }, [value]);
  return <motion.span>{display}</motion.span>;
}

const KPIS = [
  { key: "total_incidents", label: "Total Incidents", icon: AlertTriangle, color: "text-sage-400", bg: "bg-sage-500/15" },
  { key: "high_potential", label: "High-Potential", icon: ShieldAlert, color: "text-accent-red", bg: "bg-accent-red/15" },
  { key: "near_miss_ratio", label: "Near-Miss Ratio", icon: TrendingUp, color: "text-accent-green", bg: "bg-accent-green/15", decimals: 1 },
  { key: "sites_covered", label: "Sites Covered", icon: MapPin, color: "text-accent-blue", bg: "bg-accent-blue/15" },
];

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getDashboard().then(setData).catch(() => setError(true));
  }, []);

  if (error)
    return (
      <div className="card p-8 text-center text-accent-red">
        Could not reach the backend. Is it running on port 8000?
      </div>
    );
  if (!data)
    return (
      <div className="grid h-64 place-items-center">
        <Spinner label="Loading safety intelligence…" />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-ink-600/60 bg-gradient-to-br from-ink-800 to-ink-900 p-8"
      >
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sage-500/10 blur-3xl" />
        <h1 className="text-2xl font-extrabold text-white">
          Safety Command Centre
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Five AI agents working together to close Vedanta's safety execution gap —
          putting guidance, intelligence, and early warnings at the point of work.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge value={`${data.open_alerts} open equipment alerts`} />
          <Badge value={`${data.top_patterns.length} recurring patterns`} />
          <Badge value={data.retrieval_mode === "embeddings" ? "Vector RAG" : "TF-IDF RAG"} />
        </div>
      </motion.div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPIS.map((k, i) => {
          const v = data.stats[k.key] ?? 0;
          return (
            <Card key={k.key} delay={i * 0.06} className="relative overflow-hidden">
              <div className={`mb-3 grid h-11 w-11 place-items-center rounded-xl ${k.bg} ${k.color}`}>
                <k.icon className="h-5 w-5" />
              </div>
              <div className="text-3xl font-extrabold text-white">
                <Counter value={v} decimals={(k as any).decimals || 0} />
              </div>
              <div className="mt-1 text-sm text-slate-400">{k.label}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Trend */}
        <Card className="lg:col-span-2" delay={0.1}>
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-sage-400" />
            <h2 className="font-semibold text-slate-100">Incident & Near-Miss Trend</h2>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.trend}>
              <defs>
                <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gNm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: 12,
                }}
              />
              <Area type="monotone" dataKey="incidents" stroke="#f97316" fill="url(#gInc)" strokeWidth={2} />
              <Area type="monotone" dataKey="near_misses" stroke="#2dd4bf" fill="url(#gNm)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* High risk equipment */}
        <Card delay={0.16}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-accent-red" />
              <h2 className="font-semibold text-slate-100">High-Risk Equipment</h2>
            </div>
            <Link to="/predictive" className="text-xs text-sage-400 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {data.high_risk_equipment.length === 0 && (
              <p className="text-sm text-slate-500">No high-risk equipment right now.</p>
            )}
            {data.high_risk_equipment.map((e: any) => (
              <div
                key={e.equipment_id}
                className="flex items-center justify-between rounded-xl border border-ink-600/50 bg-ink-900/40 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-200">{e.equipment_name}</p>
                  <p className="text-xs text-slate-500">{e.site}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-accent-red">
                    {(e.failure_probability * 100).toFixed(0)}%
                  </p>
                  <Badge value={e.risk_band} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recurring patterns */}
      <Card delay={0.2}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-sage-400" />
            <h2 className="font-semibold text-slate-100">Top Recurring Patterns</h2>
          </div>
          <Link
            to="/intelligence"
            className="flex items-center gap-1 text-xs text-sage-400 hover:underline"
          >
            Open Intelligence <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {data.top_patterns.map((p: any) => (
            <div key={p.pattern_id} className="rounded-xl border border-ink-600/50 bg-ink-900/40 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{p.pattern_id}</span>
                <span className="rounded-full bg-sage-500/15 px-2 py-0.5 text-xs font-bold text-sage-400">
                  {p.count}×
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-200">{p.type}</p>
              <p className="mt-1 text-xs text-slate-400">Cause: {p.root_cause}</p>
              <p className="mt-2 text-xs text-slate-500">Hotspot: {p.top_area}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
