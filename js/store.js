// Almacén de datos de MI AGENDA.
// Guarda todo en el dispositivo (localStorage) y expone una interfaz sencilla
// que la sincronización (sync.js) usa para combinarlo con la base de datos.
//
// Cada elemento tiene: { id, updatedAt, deleted?, ...campos }
// Los elementos eliminados se conservan como "lápidas" (deleted: true) para que
// la eliminación también llegue a los demás dispositivos.

const STORAGE_KEY = 'miagenda.v1';
export const KINDS = ['activities', 'events', 'things'];

let state = load();
const listeners = new Set();

function empty() {
  return { activities: [], events: [], things: [] };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    return { ...empty(), ...JSON.parse(raw) };
  } catch {
    return empty();
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('No se pudo guardar', err);
  }
}

function emit(fromRemote = false) {
  listeners.forEach((fn) => fn({ fromRemote }));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function uid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// Marca de tiempo siempre creciente (evita empates entre cambios seguidos)
let lastStamp = 0;
function stamp() {
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  return lastStamp;
}

export function list(kind) {
  return state[kind].filter((x) => !x.deleted);
}

export function get(kind, id) {
  return state[kind].find((x) => x.id === id && !x.deleted);
}

export function add(kind, data) {
  const item = { ...data, id: uid(), createdAt: Date.now(), updatedAt: stamp() };
  state[kind].push(item);
  persist();
  emit();
  return item;
}

export function update(kind, id, patch) {
  const item = state[kind].find((x) => x.id === id);
  if (!item) return;
  Object.assign(item, patch, { updatedAt: stamp() });
  persist();
  emit();
  return item;
}

export function remove(kind, id) {
  const item = state[kind].find((x) => x.id === id);
  if (!item) return;
  // Se conserva solo lo necesario para sincronizar la eliminación
  const tomb = { id, deleted: true, updatedAt: stamp() };
  state[kind] = state[kind].map((x) => (x.id === id ? tomb : x));
  persist();
  emit();
}

// Agrega elementos con id fijo solo si nunca han existido aquí (ni siquiera eliminados)
export function seedOnce(kind, items) {
  const missing = items.filter((it) => !state[kind].some((x) => x.id === it.id));
  if (!missing.length) return;
  state[kind].push(...missing.map((it) => ({ ...it })));
  persist();
  emit();
}

// ---- Usado por la sincronización ----

// Todos los elementos (incluidas lápidas) con su tipo
export function allRecords() {
  return KINDS.flatMap((kind) => state[kind].map((item) => ({ kind, item })));
}

// Aplica registros remotos más recientes que los locales. Devuelve true si algo cambió.
export function mergeRemote(records) {
  let changed = false;
  for (const { kind, item } of records) {
    if (!KINDS.includes(kind)) continue;
    const idx = state[kind].findIndex((x) => x.id === item.id);
    if (idx === -1) {
      state[kind].push(item);
      changed = true;
    } else if ((item.updatedAt || 0) > (state[kind][idx].updatedAt || 0)) {
      state[kind][idx] = item;
      changed = true;
    }
  }
  if (changed) {
    persist();
    emit(true);
  }
  return changed;
}

// Si la app está abierta en otra pestaña, mantener los datos al día
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    state = load();
    emit(true);
  }
});
