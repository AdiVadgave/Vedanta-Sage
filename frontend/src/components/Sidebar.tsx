import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  Search,
  BarChart3,
  FileText,
  Activity,
  ShieldCheck,
} from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/knowledge", label: "Knowledge & Search", icon: BookOpen },
  { to: "/investigation", label: "Incident Investigation", icon: Search },
  { to: "/intelligence", label: "Incident Intelligence", icon: BarChart3 },
  { to: "/documentation", label: "Documentation", icon: FileText },
  { to: "/predictive", label: "Predictive Maintenance", icon: Activity },
];

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-ink-700/60 bg-ink-800/80 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sage-500 to-sage-600 shadow-glow">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold leading-none tracking-tight text-white">
            Sage
          </h1>
          <p className="text-[11px] font-medium text-slate-400">AI Safety Agents</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-sage-500/15 text-sage-300"
                  : "text-slate-400 hover:bg-ink-700/60 hover:text-slate-200"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="active-pill"
                    className="absolute left-0 h-6 w-1 rounded-r-full bg-sage-500"
                  />
                )}
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-ink-700/60 px-6 py-4">
        <p className="text-[11px] text-slate-500">
          Built for <span className="font-semibold text-slate-300">Vedanta</span>
        </p>
        <p className="text-[11px] text-slate-600">Eliminating safety execution gaps</p>
      </div>
    </aside>
  );
}
