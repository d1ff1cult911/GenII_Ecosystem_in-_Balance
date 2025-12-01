export function Storage(key) {
  function save(state) {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
  }
  function load() {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch { return null; }
  }
  function clear() { try { localStorage.removeItem(key); } catch {} }
  return { save, load, clear };
}

