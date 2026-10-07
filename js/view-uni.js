// Pantalla UNIVERSIDAD: horario de clases, aparte de MI SEMANA.
// Cada clase se guarda como una actividad con kind = 'class' (así se sincroniza igual que lo demás).

import * as store from './store.js';
import { DAY_NAMES, DAY_SHORT, todayKey, weekday, formatRange, toMinutes, hourLabel } from './dates.js';
import { classes, saveActivity } from './agenda.js';
import { esc, icons, showSheet, closeSheet, toast, confirmSheet } from './ui.js';
import { timeFields, wireTimeFields } from './view-week.js';

const HOUR_PX = 60;

export function renderUni(root, isMobile) {
  const list = classes().sort((a, b) => a.time.localeCompare(b.time));
  const days = [1, 2, 3, 4, 5, 6];
  if (list.some((c) => c.repeatDays.includes(7))) days.push(7);

  root.innerHTML = `
    <section class="view view-uni">
      <header class="view-head">
        <div class="view-title">
          <p class="eyebrow">Universidad</p>
          <h1>Horario de clases</h1>
        </div>
        <div class="view-actions">
          <button type="button" class="btn btn-primary" data-add>${icons.plus}<span>Agregar clase</span></button>
        </div>
      </header>
      ${list.length === 0
        ? `<div class="empty">
             <p class="empty-title">Tu horario está vacío</p>
             <p class="muted">Agrega cada materia una sola vez con sus días y horas, y aquí verás tu horario de la semana.</p>
           </div>`
        : isMobile ? dayList(list, days) : timetable(list, days)}
      <button type="button" class="fab only-mobile" data-add aria-label="Agregar clase">${icons.plus}<span>Agregar clase</span></button>
    </section>`;

  const section = root.querySelector('.view-uni');
  section.addEventListener('click', (e) => {
    if (e.target.closest('[data-add]')) return openClassForm();
    const el = e.target.closest('[data-class]');
    if (el) {
      const c = store.get('activities', el.dataset.class);
      if (c) openClassForm(c);
    }
  });
  section.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-class]')) {
      e.preventDefault();
      e.target.click();
    }
  });
}

// Computador: cuadrícula semanal donde cada clase ocupa su duración real
function timetable(list, days) {
  const starts = list.map((c) => toMinutes(c.time));
  const ends = list.map((c) => (c.endTime ? toMinutes(c.endTime) : toMinutes(c.time) + 60));
  const first = Math.floor(Math.min(...starts) / 60);
  const last = Math.ceil(Math.max(...ends) / 60);
  const hours = Array.from({ length: last - first }, (_, i) => first + i);
  const height = hours.length * HOUR_PX;
  const today = weekday(todayKey());

  const cols = days
    .map((d) => {
      const blocks = list
        .filter((c) => c.repeatDays.includes(d))
        .map((c) => {
          const s = toMinutes(c.time);
          const e = c.endTime ? toMinutes(c.endTime) : s + 60;
          const top = ((s - first * 60) / 60) * HOUR_PX;
          const h = Math.max(((e - s) / 60) * HOUR_PX - 4, 26);
          return `
            <div class="tt-class" data-class="${c.id}" role="button" tabindex="0" style="top:${top + 2}px;height:${h}px"
                 aria-label="${esc(c.title)}, ${esc(formatRange(c.time, c.endTime))}">
              <span class="tt-title">${esc(c.title)}</span>
              <span class="tt-meta">${esc(formatRange(c.time, c.endTime))}</span>
              ${c.room ? `<span class="tt-meta">${esc(c.room)}</span>` : ''}
            </div>`;
        })
        .join('');
      return `<div class="tt-col ${d === today ? 'is-today' : ''}" style="height:${height}px">${blocks}</div>`;
    })
    .join('');

  return `
    <div class="tt-wrap">
      <div class="tt" style="grid-template-columns: 92px repeat(${days.length}, minmax(110px, 1fr))">
        <div class="tt-corner"></div>
        ${days.map((d) => `<div class="tt-day ${d === today ? 'is-today' : ''}">${DAY_NAMES[d - 1]}</div>`).join('')}
        <div class="tt-hours" style="height:${height}px">
          ${hours.map((h) => `<div style="height:${HOUR_PX}px">${esc(hourLabel(h))}</div>`).join('')}
        </div>
        ${cols}
      </div>
    </div>`;
}

// Celular: clases agrupadas por día
function dayList(list, days) {
  const today = weekday(todayKey());
  return `<div class="week-list">${days
    .map((d) => {
      const items = list.filter((c) => c.repeatDays.includes(d));
      if (!items.length) return '';
      return `
        <section class="week-list-day ${d === today ? 'is-today' : ''}">
          <div class="week-list-head"><span>${DAY_NAMES[d - 1]}</span>${d === today ? '<small>Hoy</small>' : ''}</div>
          ${items
            .map((c) => `
              <div class="uni-item" data-class="${c.id}" role="button" tabindex="0">
                <span class="wl-time">${esc(formatRange(c.time, c.endTime))}</span>
                <span class="uni-text">
                  <span class="chip-title">${esc(c.title)}</span>
                  ${c.room ? `<span class="chip-meta">${esc(c.room)}</span>` : ''}
                </span>
              </div>`)
            .join('')}
        </section>`;
    })
    .join('')}</div>`;
}

export function openClassForm(c = null) {
  const editing = !!c;
  let days = c ? [...c.repeatDays] : [];
  const start = c ? c.time : '07:00';
  const end = c ? c.endTime || '' : '09:00';

  showSheet({
    title: editing ? 'Editar clase' : 'Agregar clase',
    content: `
      <form class="form" novalidate>
        <label class="field">
          <span class="field-label">Materia</span>
          <input name="title" type="text" maxlength="120" autocomplete="off" value="${esc(c ? c.title : '')}"
                 placeholder="Ej. Cálculo" ${editing ? '' : 'autofocus'}>
        </label>
        <div class="field">
          <span class="field-label">Días</span>
          <div class="weekday-picker">
            ${DAY_SHORT.map((n, i) => `
              <label class="weekday">
                <input type="checkbox" value="${i + 1}" ${days.includes(i + 1) ? 'checked' : ''}>
                <span title="${DAY_NAMES[i]}">${n}</span>
              </label>`).join('')}
          </div>
        </div>
        ${timeFields(start, end, 15)}
        <label class="field">
          <span class="field-label">Salón <em>(opcional)</em></span>
          <input name="room" type="text" maxlength="60" autocomplete="off" value="${esc(c && c.room ? c.room : '')}" placeholder="Ej. Bloque 3 · 204">
        </label>
        <p class="form-error" data-error hidden></p>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Guardar</button>
        </div>
        ${editing ? `<button type="button" class="btn-text danger" data-delete>${icons.trash}<span>Eliminar clase</span></button>` : ''}
      </form>`,
    onReady(sheet) {
      const form = sheet.querySelector('form');
      const errorEl = form.querySelector('[data-error]');
      const boxes = [...form.querySelectorAll('.weekday input')];
      wireTimeFields(form);
      boxes.forEach((b) => b.addEventListener('change', () => {
        days = boxes.filter((x) => x.checked).map((x) => Number(x.value));
      }));

      const showError = (msg, el) => {
        errorEl.textContent = msg;
        errorEl.hidden = false;
        if (el) el.focus();
      };

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = form.title.value.trim();
        if (!title) return showError('Escribe el nombre de la materia.', form.title);
        if (!days.length) return showError('Elige al menos un día.');
        const saved = saveActivity({
          id: c && c.id,
          kind: 'class',
          title,
          time: form.time.value,
          endTime: form.endTime.value,
          date: todayKey(),
          repeatDays: days,
          reminder: c ? c.reminder || 0 : 0,
          room: form.room.value,
        });
        closeSheet();
        toast(editing ? 'Clase actualizada' : 'Clase guardada', `${saved.title} · ${formatRange(saved.time, saved.endTime)}`, 2500);
      });

      const del = form.querySelector('[data-delete]');
      if (del) {
        del.addEventListener('click', async () => {
          if (await confirmSheet({ title: 'Eliminar clase', text: `¿Eliminar “${c.title}” de tu horario?` })) {
            store.remove('activities', c.id);
            toast('Clase eliminada', c.title, 2200);
          }
        });
      }
    },
  });
}

