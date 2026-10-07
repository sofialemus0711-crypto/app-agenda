// Pantalla EVENTOS: acontecimientos futuros con recordatorio.

import * as store from './store.js';
import { MONTHS, fromKey, todayKey, formatDayMonth, formatTime, addDays } from './dates.js';
import { upcomingEvents, pastEvents, daysLeftText, saveEvent, EVENT_REMINDERS, DEFAULT_REMINDER_TIME } from './events.js';
import { esc, icons, showSheet, closeSheet, toast, confirmSheet } from './ui.js';
import { reminderPermissionHint } from './view-week.js';

let showPast = false;

export function renderEvents(root) {
  const upcoming = upcomingEvents();
  const past = pastEvents();

  root.innerHTML = `
    <section class="view view-events">
      <header class="view-head">
        <div class="view-title">
          <p class="eyebrow">Eventos</p>
          <h1>Próximos eventos</h1>
        </div>
        <div class="view-actions">
          <button type="button" class="btn btn-primary" data-add>${icons.plus}<span>Agregar evento</span></button>
        </div>
      </header>

      ${upcoming.length
        ? `<ul class="event-list">${upcoming.map(eventRow).join('')}</ul>`
        : `<div class="empty">
             <p class="empty-title">Aún no hay eventos</p>
             <p class="muted">Cumpleaños, viajes, citas importantes… todo lo que viene y no quieres olvidar.</p>
           </div>`}

      ${past.length
        ? `<button type="button" class="link-btn past-toggle" data-past aria-expanded="${showPast}">
             ${showPast ? 'Ocultar eventos pasados' : `Ver eventos pasados (${past.length})`}
           </button>
           ${showPast ? `<ul class="event-list is-past">${past.map(eventRow).join('')}</ul>` : ''}`
        : ''}
      <button type="button" class="fab only-mobile" data-add aria-label="Agregar evento">${icons.plus}<span>Agregar evento</span></button>
    </section>`;

  const section = root.querySelector('.view-events');
  section.addEventListener('click', (e) => {
    if (e.target.closest('[data-add]')) return openEventForm();
    if (e.target.closest('[data-past]')) {
      showPast = !showPast;
      return renderEvents(root);
    }
    const row = e.target.closest('[data-event]');
    if (row) {
      const ev = store.get('events', row.dataset.event);
      if (ev) openEventForm(ev);
    }
  });
  section.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-event]')) {
      e.preventDefault();
      e.target.click();
    }
  });
}

function eventRow(e) {
  const d = fromKey(e.date);
  const isToday = e.date === todayKey();
  const hasReminder = e.reminder && e.reminder !== 'none';
  return `
    <li class="event ${isToday ? 'is-today' : ''}" data-event="${e.id}" role="button" tabindex="0">
      <div class="event-date" aria-hidden="true">
        <strong>${d.getDate()}</strong>
        <span>${MONTHS[d.getMonth()].slice(0, 3)}</span>
      </div>
      <div class="event-body">
        <span class="event-title">${esc(e.title)}</span>
        <span class="event-meta">
          <span>${esc(formatDayMonth(e.date))}${d.getFullYear() !== new Date().getFullYear() ? ' de ' + d.getFullYear() : ''}</span>
          ${e.time ? `<span>· ${esc(formatTime(e.time))}</span>` : ''}
          ${hasReminder ? `<span class="mini-icon" title="Con recordatorio">${icons.bell}</span>` : ''}
        </span>
      </div>
      <span class="event-left">${esc(daysLeftText(e.date))}</span>
    </li>`;
}

export function openEventForm(ev = null) {
  const editing = !!ev;
  const date = ev ? ev.date : addDays(todayKey(), 1);
  const reminder = ev ? ev.reminder || 'none' : 'none';
  const defaultCustom = `${addDays(date, -1)}T${DEFAULT_REMINDER_TIME}`;

  const content = `
    <form class="form" novalidate>
      <label class="field">
        <span class="field-label">Nombre del evento</span>
        <input name="title" type="text" maxlength="120" autocomplete="off" value="${esc(ev ? ev.title : '')}"
               placeholder="Ej. Cumpleaños de María" ${editing ? '' : 'autofocus'}>
      </label>
      <div class="field-row">
        <label class="field">
          <span class="field-label">Fecha</span>
          <input name="date" type="date" value="${date}" required>
        </label>
        <label class="field">
          <span class="field-label">Hora <em>(opcional)</em></span>
          <input name="time" type="time" value="${ev && ev.time ? ev.time : ''}">
        </label>
      </div>
      <label class="field">
        <span class="field-label">Recordarme</span>
        <select name="reminder">
          ${EVENT_REMINDERS.map((o) => `<option value="${o.value}" ${o.value === reminder ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
      </label>
      <label class="field" data-custom ${reminder === 'custom' ? '' : 'hidden'}>
        <span class="field-label">Avisarme el</span>
        <input name="reminderAt" type="datetime-local" value="${ev && ev.reminderAt ? ev.reminderAt : defaultCustom}">
      </label>
      <p class="field-note muted small" data-note></p>
      <p class="form-error" data-error hidden></p>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
      ${editing ? `<button type="button" class="btn-text danger" data-delete>${icons.trash}<span>Eliminar evento</span></button>` : ''}
    </form>`;

  showSheet({
    title: editing ? 'Editar evento' : 'Agregar evento',
    content,
    onReady(sheet) {
      const form = sheet.querySelector('form');
      const custom = form.querySelector('[data-custom]');
      const note = form.querySelector('[data-note]');
      const errorEl = form.querySelector('[data-error]');

      const updateNote = () => {
        const r = form.reminder.value;
        note.textContent = r !== 'none' && r !== 'custom' && !form.time.value
          ? 'Sin hora, el aviso llega a las 9:00 a. m.'
          : '';
      };
      updateNote();

      form.reminder.addEventListener('change', () => {
        custom.hidden = form.reminder.value !== 'custom';
        updateNote();
      });
      form.time.addEventListener('input', updateNote);

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = form.title.value.trim();
        errorEl.hidden = true;
        if (!title) return showError('Escribe el nombre del evento.', form.title);
        if (!form.date.value) return showError('Elige la fecha del evento.', form.date);
        if (form.reminder.value === 'custom' && !form.reminderAt.value) return showError('Elige cuándo quieres el aviso.', form.reminderAt);
        const saved = saveEvent({
          id: ev && ev.id,
          title,
          date: form.date.value,
          time: form.time.value,
          reminder: form.reminder.value,
          reminderAt: form.reminderAt.value,
        });
        closeSheet();
        toast(editing ? 'Evento actualizado' : 'Evento guardado', `${saved.title} · ${formatDayMonth(saved.date)}`, 2500);
        if (saved.reminder !== 'none') await reminderPermissionHint();
      });

      function showError(msg, el) {
        errorEl.textContent = msg;
        errorEl.hidden = false;
        if (el) el.focus();
      }

      const del = form.querySelector('[data-delete]');
      if (del) {
        del.addEventListener('click', async () => {
          if (await confirmSheet({ title: 'Eliminar evento', text: `¿Eliminar “${ev.title}”?` })) {
            store.remove('events', ev.id);
            toast('Evento eliminado', ev.title, 2200);
          }
        });
      }
    },
  });
}
