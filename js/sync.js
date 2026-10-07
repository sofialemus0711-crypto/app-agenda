// Sincronización entre dispositivos usando Supabase (base de datos + inicio de sesión).
// Se usa directamente su API REST, sin librerías adicionales.
//
// Funcionamiento:
//  1. Se traen del servidor los cambios nuevos (desde la última sincronización).
//  2. Se combinan con los datos locales: gana el cambio más reciente.
//  3. Se envían al servidor los cambios locales que aún no se han subido.

import * as store from './store.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const SESSION_KEY = 'miagenda.session';
const META_KEY = 'miagenda.syncmeta';
const LOCAL_CONFIG_KEY = 'miagenda.supabase';
const PAGE = 1000;

let status = { state: 'off', lastSync: null, message: '' };
const listeners = new Set();
let running = null;
let again = false;
let debounce = null;

// ---------- Configuración ----------

export function getConfig() {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) return { url: SUPABASE_URL.replace(/\/+$/, ''), key: SUPABASE_ANON_KEY, fixed: true };
  try {
    const c = JSON.parse(localStorage.getItem(LOCAL_CONFIG_KEY) || 'null');
    if (c && c.url && c.key) return { url: c.url.replace(/\/+$/, ''), key: c.key, fixed: false };
  } catch {}
  return null;
}

export function setLocalConfig(url, key) {
  if (!url || !key) localStorage.removeItem(LOCAL_CONFIG_KEY);
  else localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify({ url: url.trim(), key: key.trim() }));
}

export function isConfigured() {
  return !!getConfig();
}

// ---------- Estado ----------

export function onStatus(fn) {
  listeners.add(fn);
  fn(status);
  return () => listeners.delete(fn);
}

function setStatus(patch) {
  status = { ...status, ...patch };
  listeners.forEach((fn) => fn(status));
}

export function getStatus() {
  return status;
}

// ---------- Sesión ----------

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function saveSession(s) {
  if (!s) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function currentUser() {
  const s = getSession();
  return s && s.user ? s.user : null;
}

function loadMeta() {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || 'null') || { userId: null, cursor: null, pushed: {} };
  } catch {
    return { userId: null, cursor: null, pushed: {} };
  }
}

function saveMeta(m) {
  localStorage.setItem(META_KEY, JSON.stringify(m));
}

function sessionFrom(data) {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
    user: { id: data.user.id, email: data.user.email },
  };
}

async function authRequest(path, body) {
  const cfg = getConfig();
  const res = await fetch(`${cfg.url}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: cfg.key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(translateAuthError(data));
  return data;
}

function translateAuthError(data) {
  const msg = (data.error_description || data.msg || data.message || data.error || '').toLowerCase();
  if (msg.includes('invalid login')) return 'Correo o contraseña incorrectos.';
  if (msg.includes('already registered') || msg.includes('already been registered')) return 'Ya existe una cuenta con este correo. Inicia sesión.';
  if (msg.includes('password')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (msg.includes('not confirmed')) return 'Confirma tu correo (revisa tu bandeja de entrada) y vuelve a intentarlo.';
  if (msg.includes('email')) return 'Revisa el correo electrónico.';
  return 'No fue posible conectarse. Inténtalo de nuevo.';
}

function afterLogin(session) {
  saveSession(session);
  const meta = loadMeta();
  if (meta.userId !== session.user.id) saveMeta({ userId: session.user.id, cursor: null, pushed: {} });
  setStatus({ state: 'idle', message: '' });
  syncNow();
}

export async function signIn(email, password) {
  const data = await authRequest('token?grant_type=password', { email, password });
  afterLogin(sessionFrom(data));
}

// Devuelve 'ok' si quedó dentro, o 'confirm' si Supabase pide confirmar el correo primero
export async function signUp(email, password) {
  const data = await authRequest('signup', { email, password });
  if (data.access_token) {
    afterLogin(sessionFrom(data));
    return 'ok';
  }
  return 'confirm';
}

export function signOut() {
  saveSession(null);
  saveMeta({ userId: null, cursor: null, pushed: {} });
  setStatus({ state: isConfigured() ? 'loggedout' : 'off', lastSync: null, message: '' });
}

async function validSession() {
  let s = getSession();
  if (!s) return null;
  if (Date.now() > s.expires_at - 60000) {
    try {
      const data = await authRequest('token?grant_type=refresh_token', { refresh_token: s.refresh_token });
      s = sessionFrom(data);
      saveSession(s);
    } catch (err) {
      if (navigator.onLine) {
        // El acceso ya no es válido: hay que volver a iniciar sesión
        signOut();
      }
      return null;
    }
  }
  return s;
}

async function rest(path, options = {}, retried = false) {
  const cfg = getConfig();
  const s = await validSession();
  if (!s) throw new Error('auth');
  const res = await fetch(`${cfg.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${s.access_token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (res.status === 401 && !retried) {
    saveSession({ ...s, expires_at: 0 });
    return rest(path, options, true);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

// ---------- Sincronización ----------

async function pull(meta) {
  // Se repasan unos segundos hacia atrás por seguridad (combinar es idempotente)
  const since = meta.cursor ? new Date(new Date(meta.cursor).getTime() - 10000).toISOString() : null;
  let offset = 0;
  let newest = meta.cursor;
  for (;;) {
    const filter = since ? `&synced_at=gt.${encodeURIComponent(since)}` : '';
    const res = await rest(`items?select=id,kind,data,updated_at,deleted,synced_at${filter}&order=synced_at.asc,id.asc&limit=${PAGE}&offset=${offset}`);
    const rows = await res.json();
    const records = rows.map((r) => ({
      kind: r.kind,
      item: r.deleted ? { id: r.id, deleted: true, updatedAt: Number(r.updated_at) } : { ...r.data, id: r.id, updatedAt: Number(r.updated_at) },
    }));
    store.mergeRemote(records);
    for (const r of rows) {
      meta.pushed[r.id] = Math.max(meta.pushed[r.id] || 0, Number(r.updated_at));
      if (!newest || new Date(r.synced_at) > new Date(newest)) newest = r.synced_at;
    }
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  meta.cursor = newest;
}

async function push(meta, userId) {
  const pending = store.allRecords().filter(({ item }) => (item.updatedAt || 0) > (meta.pushed[item.id] || 0));
  for (let i = 0; i < pending.length; i += 500) {
    const chunk = pending.slice(i, i + 500);
    const rows = chunk.map(({ kind, item }) => {
      const { id, updatedAt, deleted, ...data } = item;
      return { id, user_id: userId, kind, data: deleted ? {} : data, updated_at: updatedAt, deleted: !!deleted };
    });
    await rest('items?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows),
    });
    for (const { item } of chunk) meta.pushed[item.id] = item.updatedAt;
  }
}

export function syncNow() {
  if (!isConfigured() || !getSession()) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    setStatus({ state: 'syncing' });
    try {
      const s = await validSession();
      if (!s) throw new Error('auth');
      const meta = loadMeta();
      await pull(meta);
      await push(meta, s.user.id);
      saveMeta(meta);
      setStatus({ state: 'idle', lastSync: new Date(), message: '' });
    } catch (err) {
      if (!getSession()) return;
      setStatus({
        state: navigator.onLine ? 'error' : 'offline',
        message: navigator.onLine ? 'No se pudo sincronizar. Se reintentará automáticamente.' : 'Sin conexión. Los cambios se guardan y se enviarán al volver la conexión.',
      });
    } finally {
      running = null;
      if (again) {
        again = false;
        syncNow();
      }
    }
  })();
  return running;
}

export function startSync() {
  if (!isConfigured()) {
    setStatus({ state: 'off' });
  } else if (!getSession()) {
    setStatus({ state: 'loggedout' });
  }
  // Tras cada cambio local, sincronizar enseguida
  store.subscribe(({ fromRemote }) => {
    if (fromRemote) return;
    clearTimeout(debounce);
    debounce = setTimeout(syncNow, 800);
  });
  window.addEventListener('online', syncNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncNow();
  });
  setInterval(() => {
    if (document.visibilityState === 'visible') syncNow();
  }, 30000);
  syncNow();
}
