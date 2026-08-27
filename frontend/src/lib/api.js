import axios from "axios";

const BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;
const http = axios.create({ baseURL: BASE });

export const api = {
  project: () => http.get("/project").then((r) => r.data),
  meta: () => http.get("/meta").then((r) => r.data),
  archetypes: () => http.get("/archetypes").then((r) => r.data),

  listCards: (params = {}) => http.get("/cards", { params }).then((r) => r.data),
  getCard: (id) => http.get(`/cards/${id}`).then((r) => r.data),
  createCard: (body) => http.post("/cards", body).then((r) => r.data),
  updateCard: (id, body) => http.put(`/cards/${id}`, body).then((r) => r.data),
  validateCard: (id) => http.post(`/cards/${id}/validate`).then((r) => r.data),
  transition: (id, action) => http.post(`/cards/${id}/status`, { action }).then((r) => r.data),
  deleteCard: (id) => http.delete(`/cards/${id}`).then((r) => r.data),
  versions: (id) => http.get(`/cards/${id}/versions`).then((r) => r.data),
  relations: (id) => http.get(`/cards/${id}/relations`).then((r) => r.data),

  createSimulation: (cfg) => http.post("/simulations", cfg).then((r) => r.data),
  listSimulations: () => http.get("/simulations").then((r) => r.data),
  getSimulation: (id) => http.get(`/simulations/${id}`).then((r) => r.data),
  matchupMatrix: (matches = 120) => http.get("/matchup-matrix", { params: { matches } }).then((r) => r.data),

  balanceReport: () => http.get("/balance/report").then((r) => r.data),
  recomputeBalance: () => http.post("/balance/recompute").then((r) => r.data),

  logs: (limit = 200) => http.get("/logs", { params: { limit } }).then((r) => r.data),

  exportPreview: () => http.get("/export/preview").then((r) => r.data),
  exportGodot: () => http.post("/export/godot").then((r) => r.data),
};
