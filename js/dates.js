// Utilidades de fechas y horas. Todas las fechas se manejan como claves locales "AAAA-MM-DD".

export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const DAY_LETTER = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Horas visibles en la agenda (7:00 a. m. a 8:00 p. m.)
export const START_HOUR = 7;
export const END_HOUR = 20;

const pad = (n) => String(n).padStart(2, '0');

export function toKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey() {
  return toKey(new Date());
}

export function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

// 1 = lunes … 7 = domingo
export function weekday(key) {
  const wd = fromKey(key).getDay();
  return wd === 0 ? 7 : wd;
}

export function mondayOf(key) {
  return addDays(key, 1 - weekday(key));
}

export function weekDays(mondayKey) {
  return Array.from({ length: 7 }, (_, i) => addDays(mondayKey, i));
}

export function daysBetween(fromK, toK) {
  return Math.round((fromKey(toK) - fromKey(fromK)) / 86400000);
}

// "9:00" -> "9:00 a. m."
export function formatTime(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${h < 12 ? 'a. m.' : 'p. m.'}`;
}

export function hourOf(hhmm) {
  return Number(hhmm.split(':')[0]);
}

export function hourLabel(h) {
  return formatTime(`${h}:00`);
}

// Opciones de hora para los formularios (de 6:00 a. m. a 10:00 p. m.)
export function timeOptions(step = 30) {
  const out = [];
  for (let m = 6 * 60; m <= 22 * 60; m += step) out.push(fromMinutes(m));
  return out;
}

export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(total) {
  const t = Math.max(0, Math.min(total, 23 * 60 + 59));
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}

// "9:00 – 11:00 a. m." / "11:00 a. m. – 1:00 p. m." / "9:00 a. m." (sin fin)
export function formatRange(start, end) {
  if (!end) return formatTime(start);
  const a = formatTime(start);
  const b = formatTime(end);
  const sa = a.slice(-5);
  return sa === b.slice(-5) ? `${a.slice(0, -6)} – ${b}` : `${a} – ${b}`;
}

export function normalizeTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${pad(h)}:${pad(m)}`;
}

// "15 de octubre"
export function formatDayMonth(key) {
  const d = fromKey(key);
  return `${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

// "Miércoles 7 de octubre"
export function formatLongDay(key) {
  return `${DAY_NAMES[weekday(key) - 1]} ${formatDayMonth(key)}`;
}

// "5 – 11 de octubre de 2026" / "29 de septiembre – 5 de octubre de 2026"
// Con short = true se omite el año si es el año actual
export function formatWeekRange(mondayKey, short = false) {
  const a = fromKey(mondayKey);
  const b = fromKey(addDays(mondayKey, 6));
  const sameYear = a.getFullYear() === b.getFullYear() && b.getFullYear() === new Date().getFullYear();
  if (short && sameYear) {
    if (a.getMonth() === b.getMonth()) return `${a.getDate()} – ${b.getDate()} de ${MONTHS[b.getMonth()]}`;
    return `${a.getDate()} de ${MONTHS[a.getMonth()]} – ${b.getDate()} de ${MONTHS[b.getMonth()]}`;
  }
  if (a.getMonth() === b.getMonth()) {
    return `${a.getDate()} – ${b.getDate()} de ${MONTHS[b.getMonth()]} de ${b.getFullYear()}`;
  }
  const yearA = a.getFullYear() !== b.getFullYear() ? ` de ${a.getFullYear()}` : '';
  return `${a.getDate()} de ${MONTHS[a.getMonth()]}${yearA} – ${b.getDate()} de ${MONTHS[b.getMonth()]} de ${b.getFullYear()}`;
}

// Combina fecha y hora en un Date local
export function at(key, hhmm = '00:00') {
  const d = fromKey(key);
  const [h, m] = hhmm.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}
