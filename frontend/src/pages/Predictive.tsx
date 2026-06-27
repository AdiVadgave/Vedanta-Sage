import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Gauge,
  Thermometer,
  Wrench,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { SectionTitle, Card, Spinner, Badge } from "../components/ui";
import {
  getEquipment,
  getAlerts,
  getImportances,
  getEquipmentTrend,
  Equipment,
} from "../api/client";

export default function Predictive() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [alerts, setAlerts] = useState<any>(null);
  const [importances, setImportances] = useState<any[]>([]);
  const [selected, setSelected] = useState<Equipment | null>(null);
  const [trend, setTrend] = useState<any[]>([]);

  useEffect(() => {
    getEquipment()
      .then((e) => {
        setEquipment(e);
        if (e.length) selectEquip(e[0]);
      })
      .catch((err) => console.error("getEquipment failed:", err));
    getAlerts().then(setAlerts).catch(() => {});
    getImportances().then(setImportances).catch(() => {});
  }, []);

  async function selectEquip(e: Equipment) {
    setSelected(e);
    setTrend(await getEquipmentTrend(e.equipment_id));
  }

  return (
    <div>
      <SectionTitle
        title="Predictive Maintenance Agent"
        subtitle="ML over pre-use inspection data — early warnings before equipment fails"
        icon={<Activity className="h-5 w-5" />}
      />

      {/* Alert banner */}
      {alerts && alerts.count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3 rounded-2xl border border-accent-red/30 bg-accent-red/10 p-4"
        >
          <div className="grid h-10 w-10 animate-pulseRing place-items-center rounded-full bg-accent-red/20 text-accent-red">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-accent-red">
              {alerts.count} early-warning alert{alerts.count > 1 ? "s" : ""} active
            </p>
            <p className="text-xs text-slate-400">
              Equipment trending toward failure — intervene before breakdown.
            </p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Equipment table */}
        <Card className="lg:col-span-3 p-0">
          <div className="border-b border-ink-700/60 p-4">
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-sage-400" />
              <h2 className="font-semibold text-slate-100">Equipment Risk Ranking</h2>
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {equipment.length === 0 && <div className="p-6"><Spinner /></div>}
            {equipment.map((e) => (
              <button
                key={e.equipment_id}
                onClick={() => selectEquip(e)}
                className={`flex w-full items-center justify-between border-b border-ink-700/40 p-4 text-left transition hover:bg-ink-700/30 ${
                  selected?.equipment_id === e.equipment_id ? "bg-sage-500/10" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <RiskDot band={e.risk_band} />
                  <div>
                    <p className="text-sm font-medium text-slate-200">{e.equipment_name}</p>
                    <p className="text-xs text-slate-500">
                      {e.site} · {e.area}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24">
                    <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                      <span>risk</span>
                      <span>{(e.failure_probability * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${e.failure_probability * 100}%` }}
                        transition={{ duration: 0.8 }}
                        className={`h-full ${
                          e.risk_band === "High"
                            ? "bg-accent-red"
                            : e.risk_band === "Medium"
                            ? "bg-accent-amber"
                            : "bg-accent-green"
                        }`}
                      />
                    </div>
                  </div>
                  <Badge value={e.risk_band} />
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Detail panel */}
        <div className="space-y-6 lg:col-span-2">
          {selected && (
            <Card>
              <h3 className="font-semibold text-slate-100">{selected.equipment_name}</h3>
              <p className="text-xs text-slate-500">{selected.equipment_id}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Metric icon={<Activity className="h-4 w-4" />} label="Vibration" value={`${selected.vibration_mm_s} mm/s`} />
                <Metric icon={<Thermometer className="h-4 w-4" />} label="Bearing Temp" value={`${selected.bearing_temp_c}°C`} />
                <Metric icon={<Gauge className="h-4 w-4" />} label="Oil Pressure" value={`${selected.oil_pressure_bar} bar`} />
                <Metric icon={<Wrench className="h-4 w-4" />} label="Defects" value={`${selected.defects_flagged}`} />
              </div>
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                  Sensor Trend (90 days)
                </p>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" hide />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12 }}
                      labelStyle={{ color: "#94a3b8" }}
                    />
                    <Line type="monotone" dataKey="vibration_mm_s" stroke="#f97316" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="bearing_temp_c" stroke="#38bdf8" dot={false} strokeWidth={1.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent-purple" />
              <h3 className="font-semibold text-slate-100">Model Drivers</h3>
            </div>
            {importances.length === 0 ? (
              <Spinner />
            ) : (
              <div className="space-y-2">
                {importances.map((f) => (
                  <div key={f.feature}>
                    <div className="mb-1 flex justify-between text-xs text-slate-400">
                      <span>{f.feature.replace(/_/g, " ")}</span>
                      <span>{(f.importance * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${f.importance * 100}%` }}
                        transition={{ duration: 0.8 }}
                        className="h-full bg-accent-purple"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Alerts feed */}
      {alerts?.alerts?.length > 0 && (
        <div className="mt-6">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-accent-red" />
            <h2 className="font-semibold text-slate-100">Early-Warning Alerts</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {alerts.alerts.map((a: any, i: number) => (
              <motion.div
                key={a.equipment_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card border-l-4 border-l-accent-red p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-200">{a.equipment_name}</p>
                  <span className="text-sm font-bold text-accent-red">
                    {(a.failure_probability * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-slate-500">{a.site} · {a.area}</p>
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-ink-900/50 p-3">
                  <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-sage-400" />
                  <p className="text-sm text-slate-300">{a.recommended_action}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RiskDot({ band }: { band: string }) {
  const color =
    band === "High" ? "bg-accent-red" : band === "Medium" ? "bg-accent-amber" : "bg-accent-green";
  return (
    <span className="relative flex h-3 w-3">
      {band === "High" && (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-60`} />
      )}
      <span className={`relative inline-flex h-3 w-3 rounded-full ${color}`} />
    </span>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-ink-600/50 bg-ink-900/40 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-slate-500">
        {icon}
        <span className="text-[11px] uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-lg font-bold text-slate-100">{value}</p>
    </div>
  );
}
