// MI AGENDA — punto de entrada: navegación entre las tres secciones.

import * as store from './store.js';
import { renderWeek, goToToday } from './view-week.js';
import { renderEvents } from './view-events.js';
import { renderThings } from './view-things.js';
import { renderUni } from './view-uni.js';
import { seedUniversity } from './seed-uni.js';
import { startReminders } from './reminders.js';
import { startSync, onStatus } from './sync.js';
import { openSyncSheet, statusLabel, statusKind } from './sync-ui.js';
import { toast } from './ui.js';
import { todayKey } from './dates.js';

const SECTIONS = ['semana', 'eventos', 'cosas', 'universidad'];
const main = document.getElementById('view');
const mq = window.matchMedia('(max-width: 760px)');

function currentSection() {
  const h = location.hash.replace('#', '');
  return SECTIONS.includes(h) ? h : 'semana';
}

function render() {
  const section = currentSection();
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const active = a.dataset.nav === section;
    a.classList.toggle('is-active', active);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const scroll = window.scrollY;
  if (section === 'semana') renderWeek(main, mq.matches);
  else if (section === 'eventos') renderEvents(main);
  else if (section === 'cosas') renderThings(main);
  else renderUni(main, mq.matches);
  return scroll;
}

let lastSection = currentSection();
window.addEventListener('hashchange', () => {
  const s = currentSection();
  if (s === 'semana' && lastSection !== 'semana') goToToday();
  lastSection = s;
  render();
  window.scrollTo(0, 0);
});

// Volver a tocar "Mi semana" lleva a hoy
document.querySelectorAll('[data-nav="semana"]').forEach((a) =>
  a.addEventListener('click', () => {
    if (currentSection() === 'semana') {
      goToToday();
      render();
    }
  }));

mq.addEventListener('change', render);

// Cualquier cambio en los datos (local o desde otro dispositivo) actualiza la pantalla
store.subscribe(() => {
  const y = window.scrollY;
  render();
  window.scrollTo(0, y);
});

// Al pasar la medianoche, la app se actualiza sola
let day = todayKey();
setInterval(() => {
  if (todayKey() !== day) {
    day = todayKey();
    goToToday();
    render();
  }
}, 60000);

// Estado de la sincronización en el botón de la nube
document.querySelectorAll('[data-sync]').forEach((b) => b.addEventListener('click', openSyncSheet));
onStatus((st) => {
  document.querySelectorAll('[data-sync]').forEach((b) => {
    b.dataset.state = statusKind(st);
    b.title = statusLabel(st);
    const label = b.querySelector('[data-sync-label]');
    if (label) label.textContent = statusLabel(st);
  });
});

seedUniversity();
render();
startReminders(toast);
startSync();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
