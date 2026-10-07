// Recordatorios: revisa cada pocos segundos si hay algo que avisar y muestra
// una notificación del navegador (y un aviso dentro de la app).

import * as store from './store.js';
import { activitiesOn, isDone } from './agenda.js';
import { reminderTime } from './events.js';
import { todayKey, at, formatTime, formatDayMonth, daysBetween } from './dates.js';

const FIRED_KEY = 'miagenda.fired';
const CHECK_EVERY_MS = 20000;
let onToast = () => {};

function loadFired() {
  try {
    return JSON.parse(localStorage.getItem(FIRED_KEY) || '{}');
  } catch {
    return {};
  }
}

function markFired(key) {
  const fired = loadFired();
  fired[key] = Date.now();
  // Limpia avisos de hace más de 30 días
  const limit = Date.now() - 30 * 86400000;
  for (const k of Object.keys(fired)) if (fired[k] < limit) delete fired[k];
  localStorage.setItem(FIRED_KEY, JSON.stringify(fired));
}

export function notificationsSupported() {
  return 'Notification' in window;
}

export function notificationPermission() {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

// Debe llamarse desde un gesto del usuario (por ejemplo, al guardar)
export async function askPermission() {
  if (!notificationsSupported() || Notification.permission !== 'default') return notificationPermission();
  try {
    return await Notification.requestPermission();
  } catch {
    return notificationPermission();
  }
}

async function notify(title, body, tag) {
  if (document.visibilityState === 'visible') onToast(title, body, 15000);
  if (notificationPermission() !== 'granted') return;
  const options = { body, tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) await reg.showNotification(title, options);
    else new Notification(title, options);
  } catch (err) {
    try {
      new Notification(title, options);
    } catch {
      console.warn('No se pudo mostrar la notificación', err);
    }
  }
}

export function checkReminders(now = new Date()) {
  const fired = loadFired();
  const today = todayKey();

  // Actividades de hoy
  for (const a of activitiesOn(today)) {
    if (!a.reminder || isDone(a, today)) continue;
    const start = at(today, a.time);
    const fireAt = new Date(start.getTime() - a.reminder * 60000);
    const key = `act:${a.id}:${today}:${a.time}:${a.reminder}`;
    if (fired[key]) continue;
    // Solo se avisa entre el momento del recordatorio y 5 minutos después de empezar
    if (now >= fireAt && now < new Date(start.getTime() + 5 * 60000)) {
      markFired(key);
      const mins = Math.round((start - now) / 60000);
      const when = mins > 0 ? `En ${mins} min · ${formatTime(a.time)}` : `Ahora · ${formatTime(a.time)}`;
      notify(a.title, when, key);
    }
  }

  // Eventos
  for (const e of store.list('events')) {
    const fireAt = reminderTime(e);
    if (!fireAt) continue;
    const key = `ev:${e.id}:${fireAt.getTime()}`;
    if (fired[key]) continue;
    const endOfEvent = at(e.date, '23:59');
    if (now >= fireAt && now <= endOfEvent) {
      markFired(key);
      const n = daysBetween(today, e.date);
      const lead = n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : `En ${n} días`;
      const body = `${lead} · ${formatDayMonth(e.date)}${e.time ? ' · ' + formatTime(e.time) : ''}`;
      notify(e.title, body, key);
    }
  }
}

export function startReminders(toast) {
  onToast = toast || onToast;
  checkReminders();
  setInterval(() => checkReminders(), CHECK_EVERY_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkReminders();
  });
}
