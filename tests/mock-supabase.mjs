// Servidor que imita la parte de Supabase que usa MI AGENDA (auth + tabla items con RLS y "gana el más reciente").
import http from 'http';
const users = new Map(); // email -> {id, password}
const tokens = new Map(); // token -> userId
const rows = new Map(); // id -> row
let seq = 0;
const nowIso = () => { const d = new Date(Date.now() + (seq++) % 1000 / 1000); return d.toISOString(); };
function session(u) {
  const t = 'tok-' + Math.random().toString(36).slice(2);
  tokens.set(t, u.id);
  return { access_token: t, refresh_token: 'ref-' + t, expires_in: 3600, user: { id: u.id, email: u.email } };
}
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
export function startMockSupabase(port = 54321) {
  return new Promise((resolve) => {
  const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let body = '';
  for await (const c of req) body += c;
  const send = (code, obj) => { res.writeHead(code, { ...cors, 'Content-Type': 'application/json' }); res.end(obj === undefined ? '' : JSON.stringify(obj)); };
  if (req.method === 'OPTIONS') return send(204);
  if (!req.headers.apikey) return send(401, { message: 'no apikey' });
  if (url.pathname === '/auth/v1/signup') {
    const { email, password } = JSON.parse(body);
    if (users.has(email)) return send(400, { msg: 'User already registered' });
    if (!password || password.length < 6) return send(422, { msg: 'Password should be at least 6 characters' });
    const u = { id: 'u-' + users.size + '-' + Math.random().toString(36).slice(2, 6), email, password };
    users.set(email, u);
    return send(200, session(u));
  }
  if (url.pathname === '/auth/v1/token') {
    const b = JSON.parse(body);
    if (url.searchParams.get('grant_type') === 'password') {
      const u = users.get(b.email);
      if (!u || u.password !== b.password) return send(400, { error_description: 'Invalid login credentials' });
      return send(200, session(u));
    }
    const t = b.refresh_token.replace(/^ref-/, '');
    const uid = tokens.get(t);
    const u = [...users.values()].find((x) => x.id === uid);
    return u ? send(200, session(u)) : send(400, { error: 'invalid refresh' });
  }
  if (url.pathname === '/rest/v1/items') {
    const uid = tokens.get((req.headers.authorization || '').replace('Bearer ', ''));
    if (!uid) return send(401, { message: 'JWT expired' });
    if (req.method === 'GET') {
      let list = [...rows.values()].filter((r) => r.user_id === uid);
      const f = url.searchParams.get('synced_at');
      if (f) { const since = f.replace(/^gt\./, ''); list = list.filter((r) => r.synced_at > since); }
      list.sort((a, b) => a.synced_at.localeCompare(b.synced_at) || a.id.localeCompare(b.id));
      const off = Number(url.searchParams.get('offset') || 0), lim = Number(url.searchParams.get('limit') || 1000);
      return send(200, list.slice(off, off + lim));
    }
    if (req.method === 'POST') {
      for (const r of JSON.parse(body)) {
        if (r.user_id !== uid) return send(403, { message: 'RLS' });
        const old = rows.get(r.id);
        if (old && old.user_id !== uid) return send(403, { message: 'RLS' });
        if (old && r.updated_at < old.updated_at) continue;
        rows.set(r.id, { ...r, synced_at: nowIso() });
      }
      return send(201);
    }
  }
  send(404, { message: 'not found' });
  });
  server.listen(port, () => resolve(server));
  });
}
