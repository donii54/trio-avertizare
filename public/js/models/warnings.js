/**
 * Model: warnings
 * All warning CRUD goes through the Laravel API (/api/warnings).
 * formatDateTime and formatInterval are shared utilities used by both
 * admin and public controllers.
 */

// ── API helpers ───────────────────────────────────────────────────────────────

function warningKind() {
  if (window.WARNING_KIND === 'env' || window.WARNING_KIND === 'meteo' || window.WARNING_KIND === 'hydro') {
    return window.WARNING_KIND;
  }
  const path = (location.pathname || '/').replace(/\/+$/, '') || '/';
  const hydro = path === '/hydro'
    || path.startsWith('/hydro/')
    || path.startsWith('/admin/hydro')
    || path.startsWith('/editor/hydro');
  if (hydro) return 'hydro';
  const env = path === '/environmental'
    || path.startsWith('/environmental/')
    || path.startsWith('/admin/environmental')
    || path.startsWith('/editor/environmental');
  return env ? 'env' : 'meteo';
}

function isWarningActive(item) {
  const t = getExpiryTime(item);
  return !t || t > Date.now();
}

let warningsCache = [];

async function getWarnings() {
  const res = await fetch('/api/warnings?kind=' + encodeURIComponent(warningKind()));
  if (!res.ok) return warningsCache = [];
  const data = await res.json();
  warningsCache = (Array.isArray(data) ? data : []).filter(isWarningActive);
  return warningsCache;
}

function currentWarnings() {
  return warningsCache;
}

async function addWarning(payload) {
  const res = await fetch('/api/warnings', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body:    JSON.stringify(Object.assign({ kind: warningKind() }, payload)),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Eroare la salvare');
  }
  return res.json();
}

async function deleteWarning(id) {
  const res = await fetch(`/api/warnings/${id}`, {
    method: 'DELETE',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });
  if (!res.ok) throw new Error('Eroare la ștergere');
}

async function clearWarnings() {
  const res = await fetch('/api/warnings?kind=' + encodeURIComponent(warningKind()), {
    method: 'DELETE',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });
  if (!res.ok) throw new Error('Eroare la ștergere');
}

function getWarningId(item) {
  return item.id ?? '';
}

// ── Date formatters ───────────────────────────────────────────────────────────

function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const day   = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year  = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins  = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year}, ora ${hours}:${mins}`;
}

function formatInterval(item) {
  if (item.intervalFrom && item.intervalTo) {
    return `${formatDateTime(item.intervalFrom)} – ${formatDateTime(item.intervalTo)}`;
  }
  return item.interval || '';
}

function getExpiryTime(item) {
  if (!item.intervalTo) return null;
  const t = new Date(item.intervalTo).getTime();
  return Number.isNaN(t) ? null : t;
}
