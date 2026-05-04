/**
 * API Client — fetch wrapper. Every network call from the frontend should go
 * through one of these helpers (instead of raw fetch) so error handling and
 * future cross-cutting concerns (auth headers, retry, telemetry) only need to
 * change in one place.
 */
window.API = {
  async get(url) {
    const res = await fetch(url);
    return res.json();
  },

  async post(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {})
    });
    return res.json();
  },

  async put(url, data) {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {})
    });
    return res.json();
  },

  async del(url) {
    const res = await fetch(url, { method: 'DELETE' });
    return res.json();
  },

  // multipart/form-data upload (don't set Content-Type — the browser fills the boundary)
  async upload(url, formData) {
    const res = await fetch(url, { method: 'POST', body: formData });
    return res.json();
  },

  // POST JSON, expect a binary stream back; triggers a browser download.
  // Used for Excel and PDF exports.
  async download(url, body, filename) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(objUrl);
  }
};
