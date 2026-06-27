import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import ErrorBoundary from "./components/ErrorBoundary";
import Dashboard from "./pages/Dashboard";
import Knowledge from "./pages/Knowledge";
import Investigation from "./pages/Investigation";
import Intelligence from "./pages/Intelligence";
import Documentation from "./pages/Documentation";
import Predictive from "./pages/Predictive";

export default function App() {
  const location = useLocation();
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="pl-64">
        <Topbar />
        <main className="px-8 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <ErrorBoundary key={location.pathname}>
              <Routes location={location}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/knowledge" element={<Knowledge />} />
                <Route path="/investigation" element={<Investigation />} />
                <Route path="/intelligence" element={<Intelligence />} />
                <Route path="/documentation" element={<Documentation />} />
                <Route path="/predictive" element={<Predictive />} />
              </Routes>
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
