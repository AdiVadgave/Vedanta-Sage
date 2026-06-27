import { useEffect, useState } from "react";
import { Cpu, Database, Wifi, WifiOff } from "lucide-react";
import { getStatus } from "../api/client";

export default function Topbar() {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    getStatus().then(setStatus).catch(() => setStatus({ error: true }));
  }, []);

  const llmOk = status?.llm_configured;
  const mode = status?.retrieval_mode;

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-ink-700/60 bg-ink-900/70 px-8 backdrop-blur-xl">
      <div>
        <p className="text-sm font-medium text-slate-300">
          Vedanta HSE Command Centre
        </p>
        <p className="text-xs text-slate-500">
          Proactive safety intelligence at the point of work
        </p>
      </div>

      <div className="flex items-center gap-3">
        <StatusChip
          icon={mode === "embeddings" ? <Database className="h-3.5 w-3.5" /> : <Cpu className="h-3.5 w-3.5" />}
          label={mode === "embeddings" ? "Vector Search" : mode === "tfidf" ? "TF-IDF Search" : "…"}
          tone="neutral"
        />
        <StatusChip
          icon={llmOk ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          label={llmOk ? "Azure OpenAI" : "LLM offline"}
          tone={llmOk ? "good" : "warn"}
        />
      </div>
    </header>
  );
}

function StatusChip({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "good" | "warn" | "neutral";
}) {
  const styles = {
    good: "border-accent-green/30 bg-accent-green/10 text-accent-green",
    warn: "border-accent-amber/30 bg-accent-amber/10 text-accent-amber",
    neutral: "border-ink-600 bg-ink-700/50 text-slate-300",
  }[tone];
  return (
    <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${styles}`}>
      {icon}
      {label}
    </div>
  );
}
