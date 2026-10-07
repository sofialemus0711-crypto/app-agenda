// Lógica de EVENTOS (sin interfaz).
//
// Evento:
//   title       texto
//   date        "AAAA-MM-DD"
//   time        "HH:MM" o null
//   reminder    'none' | '1d' | '3d' | '1w' | 'custom'
//   reminderAt  "AAAA-MM-DDTHH:MM" (solo para 'custom')

import * as store from './store.js';
import { at, todayKey, daysBetween } from './dates.js';

export const EVENT_REMINDERS = [
  { value: 'none', label: 'Sin recordatorio' },
  { value: '1d', label: '1 día antes' },
  { value: '3d', label: '3 días antes' },
  { value: '1w', label: '1 semana antes' },
  { value: 'custom', label: 'Personalizado' },
];

const OFFSET_DAYS = { '1d': 1, '3d': 3, '1w': 7 };

// Hora a la que se avisa si el evento no tiene hora
export const DEFAULT_REMINDER_TIME = '09:00';

export function sortedEvents() {
  return store
    .list('events')
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
}

export function upcomingEvents() {
  const t = todayKey();
  return sortedEvents().filter((e) => e.date >= t);
}

export function pastEvents() {
  const t = todayKey();
  return sortedEvents().filter((e) => e.date < t).reverse();
}

export function daysLeftText(dateKey) {
  const n = daysBetween(todayKey(), dateKey);
  if (n === 0) return 'Es hoy';
  if (n === 1) return 'Es mañana';
  if (n > 1) return `Faltan ${n} días`;
  if (n === -1) return 'Fue ayer';
  return `Hace ${-n} días`;
}

// Momento exacto del recordatorio (Date) o null
export function reminderTime(e) {
  if (!e.reminder || e.reminder === 'none') return null;
  if (e.reminder === 'custom') {
    if (!e.reminderAt) return null;
    const [d, t] = e.reminderAt.split('T');
    return at(d, t || DEFAULT_REMINDER_TIME);
  }
  const days = OFFSET_DAYS[e.reminder];
  if (!days) return null;
  const when = at(e.date, e.time || DEFAULT_REMINDER_TIME);
  when.setDate(when.getDate() - days);
  return when;
}

export function saveEvent({ id, title, date, time, reminder, reminderAt }) {
  const data = {
    title: title.trim(),
    date,
    time: time || null,
    reminder: reminder || 'none',
    reminderAt: reminder === 'custom' ? reminderAt || null : null,
  };
  if (id) return store.update('events', id, data);
  return store.add('events', data);
}

