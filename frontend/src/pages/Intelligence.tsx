import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  PieChart as PieIcon,
  Repeat,
  Sparkles,
  X,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { SectionTitle, Card, Spinner } from "../components/ui";
import { getBreakdowns, getPatterns, getLessons, Pattern } from "../api/client";

const COLORS = ["#f97316", "#2dd4bf", "#38bdf8", "#fbbf24", "#a78bfa", "#f87171"];

export default function Intelligence() {
  const [breakdowns, setBreakdowns] = useState<any>(null);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [active, setActive] = useState<Pattern | null>(null);
  const [lesson, setLesson] = useState<any>(null);
  const [lessonLoading, setLessonLoading] = useState(false);

  useEffect(() => {
    getBreakdowns().then(setBreakdowns).catch(() => {});
    getPatterns().then(setPatterns).catch(() => {});
  }, []);

  async function openLesson(p: Pattern) {
    setActive(p);
    setLesson(null);
    setLessonLoading(true);
    try {
      setLesson(await getLessons(p));
    } finally {
      setLessonLoading(false);
    }
  }

  return (
    <div>
      <SectionTitle
        title="Incident Intelligence Agent"
        subtitle="Turning unused safety data into recurring-pattern insight & auto lessons learned"
        icon={<BarChart3 className="h-5 w-5" />}
      />

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-sage-400" />
            <h2 className="font-semibold text-slate-100">Incidents by Type</h2>
          </div>
          {!breakdowns ? (
            <Spinner />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={breakdowns.by_type} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} width={140} />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12 }}
                  cursor={{ fill: "rgba(249,115,22,0.06)" }}
                />
                <Bar dataKey="value" fill="#f97316" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <PieIcon className="h-5 w-5 text-accent-teal" />
            <h2 className="font-semibold text-slate-100">By Severity & Site</h2>
          </div>
          {!breakdowns ? (
            <Spinner />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={breakdowns.by_severity}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={75}
                    innerRadius={45}
                    paddingAngle={2}
                  >
                    {breakdowns.by_severity.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={breakdowns.by_site} margin={{ bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={9} angle={-35} textAnchor="end" interval={0} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12 }}
                    cursor={{ fill: "rgba(45,212,191,0.06)" }}
                  />
                  <Bar dataKey="value" fill="#2dd4bf" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Recurring patterns */}
      <div className="mt-6">
        <div className="mb-4 flex items-center gap-2">
          <Repeat className="h-5 w-5 text-sage-400" />
          <h2 className="font-semibold text-slate-100">Recurring Patterns</h2>
          <span className="text-sm text-slate-500">
            — click a pattern to auto-generate a Lessons Learned bulletin
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {patterns.map((p, i) => (
            <motion.button
              key={p.pattern_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => openLesson(p)}
              className="card p-4 text-left transition hover:border-sage-500/50 hover:shadow-glow"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{p.pattern_id}</span>
                <span className="rounded-full bg-sage-500/15 px-2.5 py-0.5 text-sm font-bold text-sage-400">
                  {p.count}×
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-200">{p.type}</p>
              <p className="mt-1 text-xs text-slate-400">Root cause: {p.root_cause}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-500">{p.sites.length} sites · {p.top_area}</span>
                <span className="flex items-center gap-1 text-xs font-semibold text-sage-400">
                  <Sparkles className="h-3 w-3" /> Generate lesson
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Lesson drawer */}
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setActive(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="card max-h-[85vh] w-full max-w-xl overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-2 text-sage-400">
                <Sparkles className="h-5 w-5" />
                <h3 className="font-bold text-slate-100">AI Lessons Learned</h3>
              </div>
              <button onClick={() => setActive(null)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            {lessonLoading && <Spinner label="Generating bulletin…" />}
            {lesson && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white">{lesson.title}</h2>
                {lesson.what_is_happening && (
                  <Field label="What is happening" text={lesson.what_is_happening} />
                )}
                {lesson.why_it_matters && (
                  <Field label="Why it matters" text={lesson.why_it_matters} />
                )}
                {lesson.key_lessons?.length > 0 && (
                  <ListField label="Key Lessons" items={lesson.key_lessons} color="text-accent-teal" />
                )}
                {lesson.required_actions?.length > 0 && (
                  <ListField label="Required Actions" items={lesson.required_actions} color="text-sage-400" />
                )}
                {lesson.audience && (
                  <div className="flex items-center gap-2 rounded-xl bg-ink-900/50 p-3 text-sm text-slate-300">
                    <Users className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-500">Audience:</span> {lesson.audience}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function Field({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm leading-relaxed text-slate-300">{text}</p>
    </div>
  );
}

function ListField({ label, items, color }: { label: string; items: string[]; color: string }) {
  return (
    <div>
      <p className={`mb-1.5 text-xs font-semibold uppercase tracking-wide ${color}`}>{label}</p>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-300">
            <span className={color}>•</span> {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
