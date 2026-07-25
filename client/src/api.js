const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function apiFetch(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: isFormData
      ? options.headers
      : { "Content-Type": "application/json", ...options.headers },
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  register: (body) => apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => apiFetch("/api/auth/logout", { method: "POST" }),
  me: () => apiFetch("/api/auth/me"),

  meta: () => apiFetch("/api/meta"),

  listWardrobe: (category) => apiFetch(`/api/wardrobe${category ? `?category=${encodeURIComponent(category)}` : ""}`),
  createWardrobeItem: (formData) => apiFetch("/api/wardrobe", { method: "POST", body: formData }),
  updateWardrobeItem: (id, body) => apiFetch(`/api/wardrobe/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteWardrobeItem: (id) => apiFetch(`/api/wardrobe/${id}`, { method: "DELETE" }),

  listTrips: () => apiFetch("/api/trips"),
  createTrip: (body) => apiFetch("/api/trips", { method: "POST", body: JSON.stringify(body) }),
  getTrip: (id) => apiFetch(`/api/trips/${id}`),
  updateTrip: (id, body) => apiFetch(`/api/trips/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteTrip: (id) => apiFetch(`/api/trips/${id}`, { method: "DELETE" }),
  getSuggestions: (id) => apiFetch(`/api/trips/${id}/suggestions`),
  getOutfits: (id) => apiFetch(`/api/trips/${id}/outfits`),
  getStyleGuide: (id) => apiFetch(`/api/trips/${id}/style-guide`),

  listPacking: (tripId) => apiFetch(`/api/trips/${tripId}/packing`),
  addPacking: (tripId, body) => apiFetch(`/api/trips/${tripId}/packing`, { method: "POST", body: JSON.stringify(body) }),
  togglePacking: (id, packed) => apiFetch(`/api/packing/${id}`, { method: "PATCH", body: JSON.stringify({ packed }) }),
  deletePacking: (id) => apiFetch(`/api/packing/${id}`, { method: "DELETE" }),

  listInspiration: (tripId) => apiFetch(`/api/trips/${tripId}/inspiration`),
  addInspiration: (tripId, payload) =>
    apiFetch(`/api/trips/${tripId}/inspiration`, {
      method: "POST",
      body: payload instanceof FormData ? payload : JSON.stringify(payload),
    }),
  deleteInspiration: (id) => apiFetch(`/api/inspiration/${id}`, { method: "DELETE" }),

  getPopularWeather: () => apiFetch("/api/weather/popular"),
  searchWeather: (query) => apiFetch(`/api/weather/search?q=${encodeURIComponent(query)}`),

  getTryonConfig: () => apiFetch("/api/tryon/configured"),
  listTryonPhotos: () => apiFetch("/api/tryon/photos"),
  addTryonPhoto: (formData) => apiFetch("/api/tryon/photos", { method: "POST", body: formData }),
  deleteTryonPhoto: (id) => apiFetch(`/api/tryon/photos/${id}`, { method: "DELETE" }),
  listTryonResults: () => apiFetch("/api/tryon/results"),
  generateTryon: (body) => apiFetch("/api/tryon/generate", { method: "POST", body: JSON.stringify(body) }),
  deleteTryonResult: (id) => apiFetch(`/api/tryon/results/${id}`, { method: "DELETE" }),
};

export function photoUrl(path) {
  if (!path) return null;
  // Already a full URL (Supabase Storage in production) vs. a same-origin
  // "/uploads/..." path (local-disk fallback in dev) that needs the API's
  // origin prefixed on.
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE}${path}`;
}
