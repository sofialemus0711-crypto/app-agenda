// Lógica de las actividades de MI SEMANA (sin interfaz).
//
// Actividad:
//   title        texto
//   time         "HH:MM"
//   repeatDays   [] = una sola vez; [1,3,5] = lunes, miércoles y viernes (1 = lunes … 7 = domingo)
//   date         "AAAA-MM-DD" (solo para actividades de una sola vez)
//   startDate    lunes de la semana en que empieza la repetición
//   reminder     minutos antes (0 = sin recordatorio)
//   doneDates    fechas en que se marcó como realizada

import * as store from './store.js';
import { weekday, mondayOf } from './dates.js';

export const REMINDER_OPTIONS = [
  { value: 0, label: 'Sin recordatorio' },
  { value: 5, label: '5 minutos antes' },
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
];

export function isRepeating(a) {
  return Array.isArray(a.repeatDays) && a.repeatDays.length > 0;
}

export function occursOn(a, dateKey) {
  if (isRepeating(a)) {
    return a.repeatDays.includes(weekday(dateKey)) && dateKey >= (a.startDate || '0000-00-00');
  }
  return a.date === dateKey;
}

// Actividades de un día, ordenadas por hora
export function activitiesOn(dateKey) {
  return store
    .list('activities')
    .filter((a) => occursOn(a, dateKey))
    .sort((x, y) => x.time.localeCompare(y.time) || (x.createdAt || 0) - (y.createdAt || 0));
}

export function isDone(a, dateKey) {
  return (a.doneDates || []).includes(dateKey);
}

export function toggleDone(id, dateKey) {
  const a = store.get('activities', id);
  if (!a) return;
  const set = new Set(a.doneDates || []);
  set.has(dateKey) ? set.delete(dateKey) : set.add(dateKey);
  store.update('activities', id, { doneDates: [...set] });
}

export function saveActivity({ id, title, time, date, repeatDays, reminder }) {
  const repeating = repeatDays && repeatDays.length > 0;
  const data = {
    title: title.trim(),
    time,
    reminder: Number(reminder) || 0,
    repeatDays: repeating ? [...repeatDays].sort() : [],
    date: repeating ? null : date,
  };
  if (repeating) {
    const existing = id && store.get('activities', id);
    // La repetición empieza en la semana que se está viendo (o se conserva la anterior si ya existía)
    const start = mondayOf(date);
    data.startDate = existing && existing.startDate && existing.startDate < start ? existing.startDate : start;
  }
  if (id) return store.update('activities', id, data);
  return store.add('activities', { ...data, doneDates: [] });
}

// Arrastrar una actividad a otro día/hora
export function moveActivity(id, fromDate, toDate, toTime) {
  const a = store.get('activities', id);
  if (!a) return;
  if (!isRepeating(a)) {
    store.update('activities', id, { date: toDate, time: toTime });
    return;
  }
  // En una actividad repetitiva: cambia la hora de toda la serie y,
  // si se suelta en otro día, ese día reemplaza al día de origen.
  const days = new Set(a.repeatDays);
  if (fromDate !== toDate) {
    days.delete(weekday(fromDate));
    days.add(weekday(toDate));
  }
  const patch = { time: toTime, repeatDays: [...days].sort() };
  if (toDate < (a.startDate || '')) patch.startDate = mondayOf(toDate);
  store.update('activities', id, patch);
}

export function repeatSummary(a) {
  if (!isRepeating(a)) return 'No se repite';
  const d = a.repeatDays;
  if (d.length === 7) return 'Todos los días';
  if (d.length === 5 && [1, 2, 3, 4, 5].every((x) => d.includes(x))) return 'Lunes a viernes';
  const names = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  const list = d.map((x) => names[x - 1]);
  const text = list.length > 1 ? list.slice(0, -1).join(', ') + ' y ' + list.at(-1) : list[0];
  return 'Cada ' + text;
}

