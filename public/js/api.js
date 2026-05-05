/**
 * API Client — fetch wrapper. Every network call from the frontend should go
 * through one of these helpers (instead of raw fetch) so error handling and
 * future cross-cutting concerns (auth headers, retry, telemetry) only need to
 * change in one place.
 */
window.API = {
  async get(url) {
    return _request(url);
  },

  async post(url, data) {
    return _request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {})
    });
  },

  async put(url, data) {
    return _request(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {})
    });
  },

  async del(url) {
    return _request(url, { method: 'DELETE' });
  },

  // multipart/form-data upload (don't set Content-Type — the browser fills the boundary)
  async upload(url, formData) {
    return _request(url, { method: 'POST', body: formData });
  },

  // POST JSON, expect a binary stream back; triggers a browser download.
  // Used for Excel and PDF exports.
  async download(url, body, filename) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    if (!res.ok) throw await _toError(res);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(objUrl);
  }
};

// Shared request runner: throws on non-2xx so callers don't have to remember
// to check res.ok or handle non-JSON error bodies (eg. nginx 502 HTML).
async function _request(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw await _toError(res);
  // Some endpoints (DELETE) may return empty body — be lenient.
  const text = await res.text();
  if (!text) return { success: true };
  try { return JSON.parse(text); }
  catch (_) { return { success: true, raw: text }; }
}

// Normalise different error shapes into Error(message). Preference order:
//   - JSON body { error: "..." }
//   - Plain-text body (truncated)
//   - HTTP status fallback
async function _toError(res) {
  let detail = `HTTP ${res.status}`;
  try {
    const text = await res.text();
    if (text) {
      try {
        const j = JSON.parse(text);
        if (j && j.error) detail = j.error;
      } catch (_) {
        detail = text.slice(0, 200);
      }
    }
  } catch (_) {}
  return new Error(detail);
}
