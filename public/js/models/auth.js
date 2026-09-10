/**
 * Model: auth
 * Client-side session checks via server API.
 */

async function checkAuth() {
  try {
    const res = await fetch('/api/me');
    return res.ok;
  } catch {
    return false;
  }
}

async function handleLogout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login';
}
