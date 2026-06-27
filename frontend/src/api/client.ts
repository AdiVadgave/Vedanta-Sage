import axios from "axios";

// Vite proxy forwards /api -> http://localhost:8000
export const api = axios.create({ baseURL: "/api", timeout: 60000 });

// ─── Types ───────────────────────────────────────────────────────────────────
export interface Source {
  doc_id: string;
  title: string;
  kind: string;
  score: number;
  snippet: string;
}
export interface AskResponse {
  answer: string;
  sources: Source[];
  mode: string;
}
export interface StandardItem {
  sop: string;
  sop_title: string;
  standard: string;
  standard_title: string;
  authority: string;
  referenced_version: string;
  current_version: string;
  status: string;
}
export interface Stats {
  total_incidents: number;
  total_near_misses: number;
  high_potential: number;
  serious_incidents: number;
  near_miss_ratio: number;
  sites_covered: number;
}
export interface Pattern {
  pattern_id: string;
  type: string;
  root_cause: string;
  count: number;
  sites: string[];
  top_area: string;
  linked_sop: string;
  sample: string;
}
export interface Equipment {
  equipment_id: string;
  equipment_name: string;
  site: string;
  area: string;
  failure_probability: number;
  risk_band: string;
  vibration_mm_s: number;
  bearing_temp_c: number;
  oil_pressure_bar: number;
  hours_since_service: number;
  defects_flagged: number;
  recommended_action?: string;
}

// ─── Calls ───────────────────────────────────────────────────────────────────
export const getStatus = () => api.get("/status").then((r) => r.data);
export const getDashboard = () => api.get("/dashboard").then((r) => r.data);

export const ask = (question: string) =>
  api.post<AskResponse>("/knowledge/ask", { question }).then((r) => r.data);
export const getStandardsWatch = () =>
  api.get("/knowledge/standards-watch").then((r) => r.data);

export const investigate = (payload: any) =>
  api.post("/investigation/analyze", payload).then((r) => r.data);

export const getStats = () => api.get<Stats>("/intelligence/stats").then((r) => r.data);
export const getBreakdowns = () => api.get("/intelligence/breakdowns").then((r) => r.data);
export const getTrend = () => api.get("/intelligence/trend").then((r) => r.data);
export const getPatterns = () =>
  api.get<Pattern[]>("/intelligence/patterns").then((r) => r.data);
export const getLessons = (pattern: Pattern) =>
  api.post("/intelligence/lessons", pattern).then((r) => r.data);

export const autofillHandover = () =>
  api.get("/docs/autofill/handover").then((r) => r.data);
export const autofillPretask = () =>
  api.get("/docs/autofill/pretask").then((r) => r.data);
export const generateDoc = (doc_type: string, fields: any) =>
  api.post("/docs/generate", { doc_type, fields }).then((r) => r.data);
export const scoreDoc = (doc_type: string, text: string) =>
  api.post("/docs/score", { doc_type, text }).then((r) => r.data);

export const getEquipment = () =>
  api.get<Equipment[]>("/predict/equipment").then((r) => r.data);
export const getAlerts = () => api.get("/predict/alerts").then((r) => r.data);
export const getImportances = () => api.get("/predict/importances").then((r) => r.data);
export const getEquipmentTrend = (id: string) =>
  api.get(`/predict/trend/${id}`).then((r) => r.data);
