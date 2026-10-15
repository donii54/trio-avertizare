/**
 * Model: auth
 * Client-side session checks via server API.
 */

var adminSessionKind = null;

async function checkAuth(expectedKind) {
  try {
    const res = await fetch('/api/me');
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.ok) return false;
    adminSessionKind = data.kind;
    if (expectedKind && data.kind !== expectedKind && data.kind !== 'full') return false;
    return true;
  } catch {
    return false;
  }
}

async function handleLogout() {
  const next = adminSessionKind === 'full'
    ? '/admin/full'
    : (location.pathname.startsWith('/admin/environmental')
      ? '/admin/environmental'
      : location.pathname.startsWith('/admin/hydro')
        ? '/admin/hydro'
        : '/admin');
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login?next=' + encodeURIComponent(next);
}
