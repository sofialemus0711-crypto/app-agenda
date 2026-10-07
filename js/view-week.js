// Pantalla MI SEMANA: semana completa en computador y vista por día en celular.

import * as store from './store.js';
import {
  DAY_NAMES, DAY_SHORT, DAY_LETTER, START_HOUR, END_HOUR,
  todayKey, mondayOf, addDays, weekDays, weekday, fromKey, formatTime, hourLabel, hourOf,
  timeOptions, formatWeekRange, formatLongDay, formatDayMonth,
} from './dates.js';
import {
  activitiesOn, isDone, toggleDone, saveActivity, moveActivity, isRepeating, repeatSummary, REMINDER_OPTIONS,
} from './agenda.js';
import { esc, icons, showSheet, closeSheet, toast, confirmSheet } from './ui.js';
import { askPermission } from './reminders.js';

const view = {
  weekStart: mondayOf(todayKey()),
  day: todayKey(),
  mobileMode: 'day', // 'day' | 'week'
};

let rootEl = null;
let mobile = false;

const hours = () => Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

export function renderWeek(root, isMobile) {
  rootEl = root;
  mobile = isMobile;
  if (mondayOf(view.day) !== view.weekStart) view.day = view.weekStart;
  const days = weekDays(view.weekStart);
  const thisWeek = view.weekStart === mondayOf(todayKey());

  root.innerHTML = `
    <section class="view view-week">
      <header class="view-head">
        <div class="view-title">
          <p class="eyebrow">Mi semana</p>
          <h1 class="week-range">${esc(formatWeekRange(view.weekStart, mobile))}</h1>
        </div>
        ${mobile ? modeToggle() : ''}
        <div class="view-actions">
          <nav class="week-nav" aria-label="Cambiar de semana">
            <button type="button" class="link-btn" data-week="-1">${icons.left}<span>${mobile ? 'Anterior' : 'Semana anterior'}</span></button>
            <span class="sep" aria-hidden="true"></span>
            <button type="button" class="link-btn ${thisWeek ? 'is-current' : ''}" data-week="0">Esta semana</button>
            <span class="sep" aria-hidden="true"></span>
            <button type="button" class="link-btn" data-week="1"><span>${mobile ? 'Siguiente' : 'Semana siguiente'}</span>${icons.right}</button>
          </nav>
          ${mobile ? '' : `<button type="button" class="btn btn-primary" data-add>${icons.plus}<span>Agregar actividad</span></button>`}
        </div>
      </header>
      ${mobile ? mobileBody(days) : desktopGrid(days)}
      ${mobile ? `<button type="button" class="fab" data-add aria-label="Agregar actividad">${icons.plus}<span>Agregar actividad</span></button>` : ''}
    </section>`;

  bind(root);
}

// ---------- Computador: cuadrícula semanal ----------

function desktopGrid(days) {
  const today = todayKey();
  const perDay = Object.fromEntries(days.map((d) => [d, activitiesOn(d)]));
  const head = days
    .map((d, i) => `
      <div class="grid-day ${d === today ? 'is-today' : ''}">
        <span class="grid-dayname">${DAY_NAMES[i]}</span>
        <span class="grid-daynum">${fromKey(d).getDate()}</span>
      </div>`)
    .join('');

  const rows = hours()
    .map((h) => {
      const cells = days
        .map((d) => {
          const items = perDay[d].filter((a) => slotHour(a.time) === h);
          return `<div class="grid-cell ${d === today ? 'is-today' : ''}" data-slot data-date="${d}" data-hour="${h}"
                    role="button" tabindex="-1" aria-label="${esc(DAY_NAMES[weekday(d) - 1] + ' ' + hourLabel(h))}">
                    ${items.map((a) => chip(a, d)).join('')}
                  </div>`;
        })
        .join('');
      return `<div class="grid-hour">${esc(hourLabel(h))}</div>${cells}`;
    })
    .join('');

  return `
    <div class="week-grid-wrap">
      <div class="week-grid">
        <div class="grid-corner"></div>${head}
        ${rows}
      </div>
    </div>
    <p class="hint">Toca una hora para agregar una actividad. Puedes arrastrar una actividad a otra hora o día.</p>`;
}

function slotHour(time) {
  return Math.min(Math.max(hourOf(time), START_HOUR), END_HOUR);
}

function chip(a, date) {
  const done = isDone(a, date);
  const showTime = !a.time.endsWith(':00') || hourOf(a.time) < START_HOUR || hourOf(a.time) > END_HOUR;
  return `
    <div class="chip ${done ? 'is-done' : ''} ${isRepeating(a) ? 'is-repeat' : ''}" data-activity="${a.id}" data-date="${date}" tabindex="0" role="button"
         aria-label="${esc(a.title)}, ${esc(formatTime(a.time))}${done ? ', realizada' : ''}">
      ${done ? `<span class="chip-check">${icons.check}</span>` : ''}
      <span class="chip-title">${esc(a.title)}</span>
      <span class="chip-meta">
        ${showTime ? `<span>${esc(formatTime(a.time))}</span>` : ''}
        ${isRepeating(a) ? `<span class="mini-icon" title="${esc(repeatSummary(a))}">${icons.repeat}</span>` : ''}
        ${a.reminder ? `<span class="mini-icon" title="Con recordatorio">${icons.bell}</span>` : ''}
      </span>
    </div>`;
}

// ---------- Celular: día y semana ----------

function mobileBody(days) {
  const today = todayKey();
  const strip = days
    .map((d, i) => `
      <button type="button" class="day-pill ${d === view.day ? 'is-selected' : ''} ${d === today ? 'is-today' : ''}" data-day="${d}"
              aria-label="${esc(formatLongDay(d))}" aria-pressed="${d === view.day}">
        <span>${DAY_LETTER[i]}</span><strong>${fromKey(d).getDate()}</strong>
      </button>`)
    .join('');

  if (view.mobileMode === 'week') return mobileWeekList(days);

  return `
    <div class="day-strip">${strip}</div>
    <div class="day-switch">
      <button type="button" class="icon-btn big" data-shift="-1" aria-label="Día anterior">${icons.left}</button>
      <h2 class="day-title ${view.day === today ? 'is-today' : ''}">
        <span>${esc(DAY_NAMES[weekday(view.day) - 1])}</span>
        <small>${esc(formatDayMonth(view.day))}${view.day === today ? ' · Hoy' : ''}</small>
      </h2>
      <button type="button" class="icon-btn big" data-shift="1" aria-label="Día siguiente">${icons.right}</button>
    </div>
    ${mobileDay(view.day)}`;
}

function modeToggle() {
  return `
    <div class="segmented" role="tablist" aria-label="Vista">
      <button type="button" role="tab" data-mode="day" aria-selected="${view.mobileMode === 'day'}">Día</button>
      <button type="button" role="tab" data-mode="week" aria-selected="${view.mobileMode === 'week'}">Semana</button>
    </div>`;
}

function mobileDay(date) {
  const items = activitiesOn(date);
  const before = items.filter((a) => hourOf(a.time) < START_HOUR);
  const after = items.filter((a) => hourOf(a.time) > END_HOUR);
  const rows = hours()
    .map((h) => {
      const here = items.filter((a) => hourOf(a.time) === h);
      const extra = h === START_HOUR ? before : h === END_HOUR ? after : [];
      const all = [...extra, ...here];
      return `
        <div class="day-row ${all.length ? 'has-items' : ''}" data-slot data-date="${date}" data-hour="${h}">
          <div class="day-hour">${esc(hourLabel(h))}</div>
          <div class="day-items">
            ${all.map((a) => dayItem(a, date)).join('')}
            ${all.length ? '' : '<span class="day-empty" aria-hidden="true">+</span>'}
          </div>
        </div>`;
    })
    .join('');
  return `<div class="day-list">${rows}</div>`;
}

function dayItem(a, date) {
  const done = isDone(a, date);
  return `
    <div class="day-item chip ${done ? 'is-done' : ''}" data-activity="${a.id}" data-date="${date}" role="button" tabindex="0">
      <button type="button" class="check ${done ? 'is-checked' : ''}" data-toggle aria-label="${done ? 'Marcar como pendiente' : 'Marcar como realizada'}">${icons.check}</button>
      <div class="day-item-text">
        <span class="chip-title">${esc(a.title)}</span>
        <span class="chip-meta">
          <span>${esc(formatTime(a.time))}</span>
          ${isRepeating(a) ? `<span class="mini-icon">${icons.repeat}</span><span>${esc(repeatSummary(a))}</span>` : ''}
          ${a.reminder ? `<span class="mini-icon" title="Con recordatorio">${icons.bell}</span>` : ''}
        </span>
      </div>
    </div>`;
}

function mobileWeekList(days) {
  const today = todayKey();
  return `<div class="week-list">${days
    .map((d) => {
      const items = activitiesOn(d);
      return `
        <section class="week-list-day ${d === today ? 'is-today' : ''}">
          <button type="button" class="week-list-head" data-open-day="${d}">
            <span>${esc(DAY_NAMES[weekday(d) - 1])}</span>
            <small>${esc(formatDayMonth(d))}${d === today ? ' · Hoy' : ''}</small>
          </button>
          ${items.length
            ? items
                .map((a) => `
                  <div class="week-list-item chip ${isDone(a, d) ? 'is-done' : ''}" data-activity="${a.id}" data-date="${d}" role="button" tabindex="0">
                    <span class="wl-time">${esc(formatTime(a.time))}</span>
                    <span class="chip-title">${esc(a.title)}</span>
                    ${isDone(a, d) ? `<span class="chip-check">${icons.check}</span>` : ''}
                  </div>`)
                .join('')
            : '<p class="muted small">Sin actividades</p>'}
        </section>`;
    })
    .join('')}</div>`;
}

// ---------- Eventos de la pantalla ----------

function rerender() {
  if (rootEl) renderWeek(rootEl, mobile);
}

function bind(root) {
  const section = root.querySelector('.view-week');

  section.addEventListener('click', (e) => {
    if (dragState.justDropped) return;
    const t = e.target;
    const weekBtn = t.closest('[data-week]');
    if (weekBtn) {
      const step = Number(weekBtn.dataset.week);
      if (step === 0) {
        view.weekStart = mondayOf(todayKey());
        view.day = todayKey();
      } else {
        view.weekStart = addDays(view.weekStart, step * 7);
        view.day = view.weekStart;
        if (view.weekStart === mondayOf(todayKey())) view.day = todayKey();
      }
      return rerender();
    }
    if (t.closest('[data-add]')) {
      return openActivityForm({ date: mobile ? view.day : defaultAddDate(), time: defaultTime() });
    }
    const dayBtn = t.closest('[data-day]');
    if (dayBtn) {
      view.day = dayBtn.dataset.day;
      return rerender();
    }
    const shift = t.closest('[data-shift]');
    if (shift) {
      view.day = addDays(view.day, Number(shift.dataset.shift));
      view.weekStart = mondayOf(view.day);
      return rerender();
    }
    const mode = t.closest('[data-mode]');
    if (mode) {
      view.mobileMode = mode.dataset.mode;
      return rerender();
    }
    const openDay = t.closest('[data-open-day]');
    if (openDay) {
      view.day = openDay.dataset.openDay;
      view.mobileMode = 'day';
      return rerender();
    }
    const toggleBtn = t.closest('[data-toggle]');
    if (toggleBtn) {
      const item = toggleBtn.closest('[data-activity]');
      toggleDone(item.dataset.activity, item.dataset.date);
      return;
    }
    const act = t.closest('[data-activity]');
    if (act) {
      const a = store.get('activities', act.dataset.activity);
      if (a) openActivityForm({ activity: a, date: act.dataset.date });
      return;
    }
    const slot = t.closest('[data-slot]');
    if (slot) {
      const h = String(slot.dataset.hour).padStart(2, '0');
      openActivityForm({ date: slot.dataset.date, time: `${h}:00` });
    }
  });

  section.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-activity]')) {
      e.preventDefault();
      e.target.click();
    }
  });

  section.addEventListener('pointerdown', onPointerDown);
}

function defaultAddDate() {
  const t = todayKey();
  return mondayOf(t) === view.weekStart ? t : view.weekStart;
}

function defaultTime() {
  const h = new Date().getHours() + 1;
  const hh = Math.min(Math.max(h, START_HOUR), END_HOUR);
  return `${String(hh).padStart(2, '0')}:00`;
}

// ---------- Arrastrar actividades ----------

const dragState = { justDropped: false };

function onPointerDown(e) {
  const el = e.target.closest('[data-activity]');
  if (!el || e.target.closest('[data-toggle]') || e.button > 0) return;
  if (!el.closest('[data-slot]')) return; // la lista semanal del celular no permite arrastrar
  const start = { x: e.clientX, y: e.clientY };
  const touch = e.pointerType !== 'mouse';
  let dragging = false;
  let ghost = null;
  let target = null;
  let timer = null;

  const begin = () => {
    dragging = true;
    el.classList.add('is-dragging');
    document.body.classList.add('is-dragging');
    ghost = el.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.style.width = el.getBoundingClientRect().width + 'px';
    document.body.appendChild(ghost);
    if (navigator.vibrate && touch) navigator.vibrate(15);
  };

  const position = (x, y) => {
    if (!ghost) return;
    ghost.style.transform = `translate(${x - 20}px, ${y - 18}px)`;
    ghost.style.visibility = 'hidden';
    const under = document.elementFromPoint(x, y);
    ghost.style.visibility = '';
    const slot = under && under.closest('[data-slot]');
    if (target && target !== slot) target.classList.remove('is-drop');
    target = slot;
    if (target) target.classList.add('is-drop');
  };

  const preventScroll = (ev) => {
    if (dragging) ev.preventDefault();
  };

  const move = (ev) => {
    const dx = ev.clientX - start.x;
    const dy = ev.clientY - start.y;
    const dist = Math.hypot(dx, dy);
    if (!dragging) {
      if (touch) {
        if (dist > 8) cleanup(); // es un desplazamiento normal de la pantalla
        return;
      }
      if (dist < 6) return;
      begin();
    }
    position(ev.clientX, ev.clientY);
  };

  const up = (ev) => {
    if (dragging) {
      position(ev.clientX, ev.clientY);
      if (target) {
        const fromDate = el.dataset.date;
        const toDate = target.dataset.date;
        const a = store.get('activities', el.dataset.activity);
        const minutes = a ? a.time.split(':')[1] : '00';
        const toTime = `${String(target.dataset.hour).padStart(2, '0')}:${minutes}`;
        if (a && (toDate !== fromDate || toTime !== a.time)) {
          moveActivity(a.id, fromDate, toDate, toTime);
          toast('Actividad movida', `${formatLongDay(toDate)} · ${formatTime(toTime)}`, 2500);
        }
      }
      dragState.justDropped = true;
      setTimeout(() => (dragState.justDropped = false), 50);
    }
    cleanup();
  };

  function cleanup() {
    clearTimeout(timer);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cleanup);
    window.removeEventListener('touchmove', preventScroll);
    el.classList.remove('is-dragging');
    document.body.classList.remove('is-dragging');
    if (target) target.classList.remove('is-drop');
    if (ghost) ghost.remove();
  }

  if (touch) {
    timer = setTimeout(() => {
      begin();
      position(start.x, start.y);
    }, 380);
    window.addEventListener('touchmove', preventScroll, { passive: false });
  }
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', cleanup);
}

// ---------- Formulario de actividad ----------

const REPEAT_PRESETS = {
  none: [],
  daily: [1, 2, 3, 4, 5, 6, 7],
  weekdays: [1, 2, 3, 4, 5],
};

function presetFor(days) {
  if (!days.length) return 'none';
  if (days.length === 7) return 'daily';
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return 'weekdays';
  return 'custom';
}

export function openActivityForm({ activity = null, date, time = '09:00' }) {
  const editing = !!activity;
  const occDate = date;
  let repeatDays = activity && isRepeating(activity) ? [...activity.repeatDays] : [];
  const selectedDate = activity && !isRepeating(activity) ? activity.date : date;
  const selectedTime = activity ? activity.time : time;
  const reminder = activity ? activity.reminder || 0 : 0;
  const done = activity ? isDone(activity, occDate) : false;

  const weekOfDate = weekDays(mondayOf(selectedDate));
  const times = timeOptions();
  if (!times.includes(selectedTime)) times.push(selectedTime), times.sort();

  const dayOptions = weekOfDate
    .map((d, i) => `<option value="${d}" ${d === selectedDate ? 'selected' : ''}>${DAY_NAMES[i]} ${formatDayMonth(d)}</option>`)
    .join('');

  const content = `
    <form class="form" novalidate>
      <label class="field">
        <span class="field-label">Actividad</span>
        <input name="title" type="text" maxlength="120" autocomplete="off" required
               value="${esc(activity ? activity.title : '')}" placeholder="¿Qué vas a hacer?" ${editing ? '' : 'autofocus'}>
      </label>

      <div class="field-row">
        <label class="field" data-day-field>
          <span class="field-label">Día</span>
          <select name="day">
            ${dayOptions}
            <option value="other">Otra fecha…</option>
          </select>
          <input name="otherDate" type="date" class="other-date" hidden value="${selectedDate}">
        </label>
        <label class="field">
          <span class="field-label">Hora</span>
          <select name="time">
            ${times.map((t) => `<option value="${t}" ${t === selectedTime ? 'selected' : ''}>${esc(formatTime(t))}</option>`).join('')}
          </select>
        </label>
      </div>

      <div class="field">
        <label class="field-label" for="repeat-select">Repetir</label>
        <select name="repeat" id="repeat-select">
          <option value="none">No repetir</option>
          <option value="daily">Todos los días</option>
          <option value="weekdays">Lunes a viernes</option>
          <option value="custom">Elegir días…</option>
        </select>
        <div class="weekday-picker" data-weekdays hidden>
          ${DAY_SHORT.map((n, i) => `
            <label class="weekday">
              <input type="checkbox" value="${i + 1}">
              <span title="${DAY_NAMES[i]}">${n}</span>
            </label>`).join('')}
        </div>
      </div>

      <label class="field">
        <span class="field-label">Recordatorio</span>
        <select name="reminder">
          ${REMINDER_OPTIONS.map((o) => `<option value="${o.value}" ${o.value === reminder ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
      </label>

      <p class="form-error" data-error hidden></p>

      <div class="form-actions">
        ${editing ? `<button type="button" class="btn btn-ghost" data-done>${done ? 'Marcar como pendiente' : `${icons.check}<span>Marcar como realizada</span>`}</button>` : ''}
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
      ${editing ? `<button type="button" class="btn-text danger" data-delete>${icons.trash}<span>Eliminar actividad</span></button>` : ''}
    </form>`;

  showSheet({
    title: editing ? 'Editar actividad' : 'Agregar actividad',
    content,
    onReady(sheet) {
      const form = sheet.querySelector('form');
      const repeatSel = form.repeat;
      const picker = form.querySelector('[data-weekdays]');
      const boxes = [...picker.querySelectorAll('input')];
      const dayField = form.querySelector('[data-day-field]');
      const otherDate = form.otherDate;
      const errorEl = form.querySelector('[data-error]');

      const currentDate = () => (form.day.value === 'other' ? otherDate.value : form.day.value);

      const syncPicker = () => {
        boxes.forEach((b) => (b.checked = repeatDays.includes(Number(b.value))));
        const repeating = repeatSel.value !== 'none';
        picker.hidden = !repeating;
        dayField.hidden = repeating;
      };

      repeatSel.value = presetFor(repeatDays);
      syncPicker();

      repeatSel.addEventListener('change', () => {
        const v = repeatSel.value;
        if (v === 'custom') {
          if (presetFor(repeatDays) !== 'custom') {
            const d = currentDate();
            repeatDays = d ? [weekday(d)] : [];
          }
        } else {
          repeatDays = [...REPEAT_PRESETS[v]];
        }
        syncPicker();
      });

      boxes.forEach((b) =>
        b.addEventListener('change', () => {
          repeatDays = boxes.filter((x) => x.checked).map((x) => Number(x.value));
          const p = presetFor(repeatDays);
          if (repeatDays.length) repeatSel.value = p;
          else repeatSel.value = 'custom';
        }));

      form.day.addEventListener('change', () => {
        otherDate.hidden = form.day.value !== 'other';
        if (!otherDate.hidden) otherDate.focus();
      });

      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const title = form.title.value.trim();
        const repeating = repeatSel.value !== 'none';
        const theDate = currentDate();
        errorEl.hidden = true;
        if (!title) return showError('Escribe el nombre de la actividad.', form.title);
        if (repeating && !repeatDays.length) return showError('Elige al menos un día para repetir.');
        if (!repeating && !theDate) return showError('Elige una fecha.', otherDate);

        const reminderVal = Number(form.reminder.value);
        const saved = saveActivity({
          id: activity && activity.id,
          title,
          time: form.time.value,
          date: repeating ? (theDate || view.weekStart) : theDate,
          repeatDays: repeating ? repeatDays : [],
          reminder: reminderVal,
        });
        closeSheet();
        if (!repeating && mondayOf(theDate) !== view.weekStart) {
          view.weekStart = mondayOf(theDate);
          view.day = theDate;
          rerender();
        }
        toast(editing ? 'Actividad actualizada' : 'Actividad guardada', `${saved.title} · ${formatTime(saved.time)}`, 2500);
        if (reminderVal) await reminderPermissionHint();
      });

      function showError(msg, focusEl) {
        errorEl.textContent = msg;
        errorEl.hidden = false;
        if (focusEl) focusEl.focus();
      }

      const doneBtn = form.querySelector('[data-done]');
      if (doneBtn) {
        doneBtn.addEventListener('click', () => {
          toggleDone(activity.id, occDate);
          closeSheet();
          toast(done ? 'Marcada como pendiente' : 'Actividad realizada', activity.title, 2200);
        });
      }

      const delBtn = form.querySelector('[data-delete]');
      if (delBtn) {
        delBtn.addEventListener('click', async () => {
          const ok = await confirmSheet({
            title: 'Eliminar actividad',
            text: isRepeating(activity)
              ? `“${activity.title}” se eliminará de todos los días en que se repite (${repeatSummary(activity).toLowerCase()}).`
              : `¿Eliminar “${activity.title}”?`,
          });
          if (ok) {
            store.remove('activities', activity.id);
            toast('Actividad eliminada', activity.title, 2200);
          }
        });
      }
    },
  });
}

export async function reminderPermissionHint() {
  const perm = await askPermission();
  if (perm === 'granted') return;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (perm === 'unsupported' && ios && !standalone) {
    toast('Recordatorio guardado', 'Para recibir notificaciones en iPhone, agrega MI AGENDA a tu pantalla de inicio.', 7000);
  } else if (perm === 'denied') {
    toast('Recordatorio guardado', 'Las notificaciones están bloqueadas en este navegador. Te avisaré dentro de la app.', 7000);
  }
}

export function goToToday() {
  view.weekStart = mondayOf(todayKey());
  view.day = todayKey();
}

