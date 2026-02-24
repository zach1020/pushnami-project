const AB_SERVICE_URL = window.__API_CONFIG__?.abServiceUrl || 'http://localhost:8002';
const METRICS_SERVICE_URL = window.__API_CONFIG__?.metricsServiceUrl || 'http://localhost:8001';

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Experiments
export const getExperiments = () => request(`${AB_SERVICE_URL}/api/experiments`);
export const createExperiment = (data) =>
  request(`${AB_SERVICE_URL}/api/experiments`, { method: 'POST', body: JSON.stringify(data) });
export const updateExperiment = (id, data) =>
  request(`${AB_SERVICE_URL}/api/experiments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteExperiment = (id) =>
  request(`${AB_SERVICE_URL}/api/experiments/${id}`, { method: 'DELETE' });

// Feature Toggles
export const getToggles = () => request(`${AB_SERVICE_URL}/api/toggles`);
export const updateToggle = (key, data) =>
  request(`${AB_SERVICE_URL}/api/toggles/${key}`, { method: 'PUT', body: JSON.stringify(data) });

// Metrics
export const getStats = (experimentId) => {
  const params = experimentId ? `?experiment_id=${experimentId}` : '';
  return request(`${METRICS_SERVICE_URL}/api/stats${params}`);
};
export const getEvents = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`${METRICS_SERVICE_URL}/api/events${qs ? `?${qs}` : ''}`);
};

// Music player events (click events with music_ prefix)
export const getMusicEvents = () =>
  request(`${METRICS_SERVICE_URL}/api/events?event_type=click&limit=1000`);

// Music tracks (via landing page server)
const LANDING_PAGE_URL = window.__API_CONFIG__?.landingPageUrl || 'http://localhost:3000';
export const getTracks = () => request(`${LANDING_PAGE_URL}/api/tracks`);
export const uploadTrack = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${LANDING_PAGE_URL}/api/tracks/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }
  return res.json();
};
export const deleteTrack = (filename) =>
  request(`${LANDING_PAGE_URL}/api/tracks/${encodeURIComponent(filename)}`, { method: 'DELETE' });
