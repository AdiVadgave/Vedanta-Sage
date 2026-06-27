import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  BookOpen,
  Send,
  FileText,
  Sparkles,
  AlertOctagon,
  ChevronDown,
} from "lucide-react";
import { SectionTitle, Card, Spinner, Badge } from "../components/ui";
import { ask, getStandardsWatch, AskResponse, Source } from "../api/client";

const SUGGESTED = [
  "What are the critical controls for confined space entry?",
  "How do I safely isolate equipment before maintenance?",
  "What PPE is required for molten metal handling?",
  "What checks are needed before a crane lift?",
];

interface Msg {
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
}

export default function Knowledge() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [watch, setWatch] = useState<any>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getStandardsWatch().then(setWatch).catch(() => {});
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(q: string) {
    if (!q.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    try {
      const res: AskResponse = await ask(q);
      setMessages((m) => [
        ...m,
        { role: "assistant", text: res.answer, sources: res.sources },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "⚠️ Could not reach the assistant. Is the backend running?" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <SectionTitle
        title="Knowledge & Search Agent"
        subtitle="Plain-language safety guidance at the point of work — grounded in SOPs & risk assessments"
        icon={<BookOpen className="h-5 w-5" />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chat */}
        <div className="lg:col-span-2">
          <Card className="flex h-[68vh] flex-col p-0">
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-sage-500/15">
                    <Sparkles className="h-8 w-8 text-sage-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-200">
                    Ask anything about safety procedures
                  </h3>
                  <p className="mt-1 max-w-md text-sm text-slate-500">
                    The agent retrieves the relevant SOP and answers in plain language,
                    with citations you can verify.
                  </p>
                  <div className="mt-6 grid w-full max-w-lg gap-2 sm:grid-cols-2">
                    {SUGGESTED.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-xl border border-ink-600 bg-ink-900/50 p-3 text-left text-sm text-slate-300 transition hover:border-sage-500/50 hover:text-sage-300"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                        m.role === "user"
                          ? "bg-sage-500 text-white"
                          : "border border-ink-600/60 bg-ink-900/50 text-slate-200"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        <div className="prose-sage">
                          <ReactMarkdown>{m.text}</ReactMarkdown>
                        </div>
                      ) : (
                        m.text
                      )}
                      {m.sources && m.sources.length > 0 && (
                        <SourceList sources={m.sources} />
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-ink-600/60 bg-ink-900/50 px-4 py-3">
                    <Spinner label="Searching procedures…" />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="border-t border-ink-700/60 p-4">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send(input)}
                  placeholder="Ask about an SOP, hazard, or control…"
                  className="input"
                />
                <button
                  onClick={() => send(input)}
                  disabled={loading}
                  className="btn-primary shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Standards watch */}
        <div>
          <Card className="h-[68vh] overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-ink-700/60 p-4">
              <div className="flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-accent-amber" />
                <h3 className="font-semibold text-slate-100">Standards Watch</h3>
              </div>
              {watch && (
                <span className="rounded-full bg-accent-red/15 px-2.5 py-0.5 text-xs font-bold text-accent-red">
                  {watch.outdated} outdated
                </span>
              )}
            </div>
            <div className="h-[calc(68vh-60px)] space-y-2 overflow-y-auto p-4">
              {!watch && <Spinner label="Checking standards…" />}
              {watch?.items.map((s: any) => (
                <div
                  key={s.sop + s.standard}
                  className="rounded-xl border border-ink-600/50 bg-ink-900/40 p-3"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">{s.sop}</span>
                    <Badge value={s.status} />
                  </div>
                  <p className="text-xs text-slate-400">{s.sop_title}</p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="rounded bg-ink-700 px-1.5 py-0.5">{s.standard}</span>
                    <span>
                      ref v{s.referenced_version} → current v{s.current_version}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SourceList({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 border-t border-ink-600/50 pt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs font-semibold text-sage-400"
      >
        <FileText className="h-3.5 w-3.5" />
        {sources.length} source{sources.length > 1 ? "s" : ""}
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 space-y-2 overflow-hidden"
          >
            {sources.map((s) => (
              <div key={s.doc_id} className="rounded-lg bg-ink-800/60 p-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">{s.doc_id}</span>
                  <span className="text-slate-500">
                    relevance {(s.score * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="mt-1 text-slate-500">{s.snippet}…</p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
