import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Play,
  ListChecks,
  GitBranch,
  ShieldX,
  Wrench,
  Lightbulb,
} from "lucide-react";
import { SectionTitle, Card, Spinner, Badge } from "../components/ui";
import { investigate } from "../api/client";

const SAMPLE = {
  title: "Conveyor restart during belt maintenance",
  description:
    "A technician was replacing a damaged idler on conveyor BC-7. The belt jogged unexpectedly while the guard was open, narrowly missing the technician's hand. The isolation had been applied at the main panel, but a second local control was not isolated and the try-out (test-for-zero-energy) step was skipped.",
  site: "Jharsuguda Smelter",
  area: "Material Handling",
  severity: "High Potential",
};

export default function Investigation() {
  const [form, setForm] = useState(SAMPLE);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      setResult(await investigate(form));
    } catch {
      setResult({ error: true });
    } finally {
      setLoading(false);
    }
  }

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <SectionTitle
        title="Incident Investigation Assistant"
        subtitle="Structured, SOP-aligned root-cause analysis in seconds"
        icon={<Search className="h-5 w-5" />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Form */}
        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-semibold text-slate-100">Incident Details</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Title</label>
              <input className="input" value={form.title} onChange={set("title")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Site</label>
                <input className="input" value={form.site} onChange={set("site")} />
              </div>
              <div>
                <label className="label">Area</label>
                <input className="input" value={form.area} onChange={set("area")} />
              </div>
            </div>
            <div>
              <label className="label">Severity</label>
              <select className="input" value={form.severity} onChange={set("severity")}>
                {["Near Miss", "First Aid", "Minor", "Serious", "High Potential"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                className="input min-h-[140px] resize-none"
                value={form.description}
                onChange={set("description")}
              />
            </div>
            <button onClick={run} disabled={loading} className="btn-primary w-full">
              <Play className="h-4 w-4" /> Analyse Incident
            </button>
          </div>
        </Card>

        {/* Result */}
        <div className="lg:col-span-3">
          {loading && (
            <Card className="grid h-full place-items-center">
              <Spinner label="Investigating root cause…" />
            </Card>
          )}
          {!loading && !result && (
            <Card className="grid h-full place-items-center text-center">
              <div className="text-slate-500">
                <Search className="mx-auto mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">
                  Fill the incident details and run the analysis to get a structured
                  root-cause report aligned to your SOPs.
                </p>
              </div>
            </Card>
          )}
          {result?.error && (
            <Card className="text-accent-red">Could not run analysis. Is the backend running?</Card>
          )}
          {result && !result.error && <InvestigationResult data={result} />}
        </div>
      </div>
    </div>
  );
}

function InvestigationResult({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold text-slate-100">Investigation Report</h3>
          {data.ai === false ? (
            <Badge value="Template (LLM offline)" />
          ) : (
            <span className="rounded-full bg-accent-green/15 px-2.5 py-0.5 text-xs font-bold text-accent-green">
              AI-generated
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed text-slate-300">{data.summary}</p>
        {data.referenced_sops?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {data.referenced_sops.map((s: string) => (
              <span key={s} className="rounded bg-ink-700 px-2 py-0.5 text-xs text-sage-300">
                {s}
              </span>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Block icon={<GitBranch className="h-4 w-4" />} title="5-Why Analysis" tone="blue">
          <ol className="space-y-2">
            {(data.five_whys || []).map((w: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-blue/15 text-[11px] font-bold text-accent-blue">
                  {i + 1}
                </span>
                {w}
              </li>
            ))}
          </ol>
        </Block>

        <Block icon={<ShieldX className="h-4 w-4" />} title="Failed Controls" tone="red">
          <ul className="space-y-1.5">
            {(data.failed_controls || []).map((c: string, i: number) => (
              <li key={i} className="text-sm text-slate-300">• {c}</li>
            ))}
          </ul>
          {data.contributing_factors?.length > 0 && (
            <>
              <p className="mt-3 mb-1 text-xs font-semibold uppercase text-slate-500">
                Contributing Factors
              </p>
              <ul className="space-y-1">
                {data.contributing_factors.map((c: string, i: number) => (
                  <li key={i} className="text-sm text-slate-400">• {c}</li>
                ))}
              </ul>
            </>
          )}
        </Block>
      </div>

      <Card>
        <div className="mb-1 flex items-center gap-2 text-sage-400">
          <Lightbulb className="h-4 w-4" />
          <h4 className="text-sm font-semibold">Root Cause</h4>
        </div>
        <p className="text-sm font-medium text-slate-200">{data.root_cause}</p>
      </Card>

      <Block icon={<Wrench className="h-4 w-4" />} title="Corrective Actions" tone="amber">
        <div className="space-y-2">
          {(data.corrective_actions || []).map((a: any, i: number) => (
            <div
              key={i}
              className="flex items-start justify-between gap-3 rounded-xl border border-ink-600/50 bg-ink-900/40 p-3"
            >
              <div>
                <p className="text-sm text-slate-200">{a.action}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Owner: {a.owner} · {a.timeline}
                </p>
              </div>
              <Badge value={a.priority} />
            </div>
          ))}
        </div>
      </Block>
    </div>
  );
}

function Block({
  icon,
  title,
  tone,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tone: "blue" | "red" | "amber";
  children: React.ReactNode;
}) {
  const colors = {
    blue: "text-accent-blue",
    red: "text-accent-red",
    amber: "text-accent-amber",
  }[tone];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
      <div className={`mb-3 flex items-center gap-2 ${colors}`}>
        {icon}
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      {children}
    </motion.div>
  );
}
