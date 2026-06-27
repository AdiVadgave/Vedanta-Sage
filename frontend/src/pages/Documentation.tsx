import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Sparkles,
  Download,
  Wand2,
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { SectionTitle, Card, Spinner, ProgressRing } from "../components/ui";
import {
  autofillHandover,
  autofillPretask,
  generateDoc,
  scoreDoc,
} from "../api/client";

type Tab = "handover" | "pretask";

export default function Documentation() {
  const [tab, setTab] = useState<Tab>("handover");
  const [fields, setFields] = useState<any>(null);
  const [doc, setDoc] = useState("");
  const [score, setScore] = useState<any>(null);
  const [busy, setBusy] = useState<string>("");

  async function autofill() {
    setBusy("autofill");
    setScore(null);
    setDoc("");
    try {
      const f = tab === "handover" ? await autofillHandover() : await autofillPretask();
      setFields(f);
    } finally {
      setBusy("");
    }
  }

  async function generate() {
    if (!fields) return;
    setBusy("generate");
    setScore(null);
    try {
      const res = await generateDoc(tab, fields);
      setDoc(res.document);
    } finally {
      setBusy("");
    }
  }

  async function runScore() {
    if (!doc) return;
    setBusy("score");
    try {
      setScore(await scoreDoc(tab, doc));
    } finally {
      setBusy("");
    }
  }

  function switchTab(t: Tab) {
    setTab(t);
    setFields(null);
    setDoc("");
    setScore(null);
  }

  return (
    <div>
      <SectionTitle
        title="Documentation Assistant"
        subtitle="Auto-filled shift handovers & pre-task briefs with AI quality scoring"
        icon={<FileText className="h-5 w-5" />}
      />

      {/* Tabs */}
      <div className="mb-6 inline-flex rounded-xl border border-ink-600 bg-ink-800/60 p-1">
        {(["handover", "pretask"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`relative rounded-lg px-5 py-2 text-sm font-semibold transition ${
              tab === t ? "text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab === t && (
              <motion.span
                layoutId="doc-tab"
                className="absolute inset-0 rounded-lg bg-sage-500"
              />
            )}
            <span className="relative">
              {t === "handover" ? "Shift Handover" : "Pre-Task Brief"}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left: fields + actions */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-100">Operational Data</h3>
            <button onClick={autofill} disabled={!!busy} className="btn-ghost text-xs">
              <Wand2 className="h-3.5 w-3.5" />
              {busy === "autofill" ? "Pulling…" : "Auto-fill from operations"}
            </button>
          </div>

          {!fields && (
            <div className="rounded-xl border border-dashed border-ink-600 p-8 text-center text-sm text-slate-500">
              Click <span className="font-semibold text-sage-400">Auto-fill</span> to pull
              live operational data (open permits, equipment status, recent events) into the form.
            </div>
          )}

          {fields && (
            <div className="space-y-2">
              {Object.entries(fields).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-ink-600/50 bg-ink-900/40 p-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {k.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm text-slate-300">
                    {Array.isArray(v) ? (v as any[]).join(" · ") : String(v)}
                  </p>
                </div>
              ))}
              <button onClick={generate} disabled={!!busy} className="btn-primary mt-2 w-full">
                <Sparkles className="h-4 w-4" />
                {busy === "generate" ? "Generating…" : "Generate Document"}
              </button>
            </div>
          )}
        </Card>

        {/* Right: generated doc + score */}
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-sage-400" />
                <h3 className="font-semibold text-slate-100">Generated Document</h3>
              </div>
              {doc && (
                <button onClick={runScore} disabled={!!busy} className="btn-ghost text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {busy === "score" ? "Scoring…" : "Score quality"}
                </button>
              )}
            </div>

            {busy === "generate" && <Spinner label="Drafting document…" />}
            {!doc && busy !== "generate" && (
              <div className="grid h-40 place-items-center text-center text-sm text-slate-500">
                <div>
                  <FileText className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  Generated document will appear here.
                </div>
              </div>
            )}
            {doc && (
              <motion.pre
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-h-[40vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-ink-600/50 bg-ink-900/50 p-4 text-sm leading-relaxed text-slate-300"
              >
                {doc}
              </motion.pre>
            )}
          </Card>

          {busy === "score" && (
            <Card>
              <Spinner label="Auditing completeness…" />
            </Card>
          )}

          {score && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <h3 className="mb-4 font-semibold text-slate-100">AI Quality Audit</h3>
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  <div className="flex flex-col items-center">
                    <ProgressRing value={score.score || 0} label={score.rating} />
                  </div>
                  <div className="flex-1 space-y-3">
                    {score.strengths?.length > 0 && (
                      <ScoreList
                        icon={<CheckCircle2 className="h-4 w-4 text-accent-green" />}
                        title="Strengths"
                        items={score.strengths}
                      />
                    )}
                    {score.gaps?.length > 0 && (
                      <ScoreList
                        icon={<AlertCircle className="h-4 w-4 text-accent-red" />}
                        title="Gaps"
                        items={score.gaps}
                      />
                    )}
                    {score.suggestions?.length > 0 && (
                      <ScoreList
                        icon={<Sparkles className="h-4 w-4 text-sage-400" />}
                        title="Suggestions"
                        items={score.suggestions}
                      />
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreList({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {icon} {title}
      </div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-slate-300">• {it}</li>
        ))}
      </ul>
    </div>
  );
}
