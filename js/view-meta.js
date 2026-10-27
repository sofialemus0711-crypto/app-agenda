// Pantalla META: checklist de la campaña de Meta Ads, agrupado por semana.
// Las tareas se guardan como cosas sueltas con section = 'meta' (así se sincronizan igual que lo demás).

import * as store from './store.js';
import { esc, icons, toast, showSheet, closeSheet, confirmSheet } from './ui.js';
import { META_GROUPS } from './seed-navidad.js';

const MINE = 'Mis tareas';

// Lo que se está escribiendo se conserva aunque la pantalla se actualice
let draft = '';

export function isMeta(t) {
  return t.section === 'meta' || String(t.id).startsWith('nav26-');
}

export function renderMeta(root) {
  const items = store.list('things').filter(isMeta);
  const total = items.length;
  const done = items.filter((t) => t.done).length;
  const hadFocus = document.activeElement && document.activeElement.name === 'meta-task';

  const order = [MINE, ...META_GROUPS];
  const groups = new Map(order.map((g) => [g, []]));
  for (const t of items) {
    const g = groups.has(t.group) ? t.group : MINE;
    groups.get(g).push(t);
  }

  root.innerHTML = `
    <section class="view view-meta">
      <header class="view-head">
        <div class="view-title">
          <p class="eyebrow">Meta</p>
          <h1>Campaña de Navidad</h1>
        </div>
      </header>

      <div class="meta-progress" aria-label="Avance: ${done} de ${total} tareas">
        <div class="meta-bar"><span style="width:${total ? (done / total) * 100 : 0}%"></span></div>
        <p class="muted">${done} de ${total} tareas hechas</p>
      </div>

      <form class="quick-add" autocomplete="off">
        <label class="visually-hidden" for="meta-input">Nueva tarea de Meta</label>
        <input id="meta-input" name="meta-task" type="text" maxlength="200" placeholder="Agregar una tarea de Meta" enterkeyhint="done" value="${esc(draft)}">
        <button type="submit" class="btn btn-primary">Guardar</button>
      </form>

      ${total === 0
        ? `<div class="empty">
             <p class="empty-title">Sin tareas de Meta</p>
             <p class="muted">Escribe arriba las tareas de tus campañas.</p>
           </div>`
        : ''}

      ${order.map((g) => {
        const list = groups.get(g).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        if (!list.length) return '';
        const n = list.filter((t) => t.done).length;
        return `<p class="list-label meta-group"><span>${esc(g)}</span><span class="meta-count">${n}/${list.length}</span></p>
                <ul class="things">${list.map(row).join('')}</ul>`;
      }).join('')}
    </section>`;

  const section = root.querySelector('.view-meta');
  const form = section.querySelector('.quick-add');
  const input = form['meta-task'];
  if (hadFocus) input.focus();
  input.addEventListener('input', () => (draft = input.value));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return input.focus();
    draft = '';
    store.add('things', { text, done: false, section: 'meta', group: MINE });
    const again = document.getElementById('meta-input');
    if (again) again.focus();
  });

  section.addEventListener('click', (e) => {
    const li = e.target.closest('[data-thing]');
    if (!li) return;
    const id = li.dataset.thing;
    const t = store.get('things', id);
    if (!t) return;
    if (e.target.closest('[data-remove]')) {
      store.remove('things', id);
      toast('Eliminado', t.text, 2000);
      return;
    }
    if (e.target.closest('[data-edit]')) return openTaskForm(t);
    if (e.target.closest('[data-check]')) {
      store.update('things', id, { done: !t.done, doneAt: t.done ? null : Date.now() });
    }
  });
}

// Editar una tarea: texto y semana a la que pertenece
function openTaskForm(t) {
  const groups = [MINE, ...META_GROUPS];
  const current = groups.includes(t.group) ? t.group : MINE;
  const content = `
    <form class="form" novalidate>
      <label class="field">
        <span class="field-label">Tarea</span>
        <textarea name="text" rows="3" maxlength="200">${esc(t.text)}</textarea>
      </label>
      <label class="field">
        <span class="field-label">Semana</span>
        <select name="group">
          ${groups.map((g) => `<option value="${esc(g)}" ${g === current ? 'selected' : ''}>${esc(g)}</option>`).join('')}
        </select>
      </label>
      <label class="field-check">
        <input name="done" type="checkbox" ${t.done ? 'checked' : ''}>
        <span>Hecha</span>
      </label>
      <p class="form-error" data-error hidden></p>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
      <button type="button" class="btn-text danger" data-delete>${icons.trash}<span>Eliminar tarea</span></button>
    </form>`;

  showSheet({
    title: 'Editar tarea',
    content,
    onReady(sheet) {
      const form = sheet.querySelector('form');
      const errorEl = form.querySelector('[data-error]');
      form.text.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          form.requestSubmit();
        }
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = form.text.value.replace(/\s+/g, ' ').trim();
        if (!text) {
          errorEl.textContent = 'Escribe la tarea.';
          errorEl.hidden = false;
          return form.text.focus();
        }
        const done = form.done.checked;
        store.update('things', t.id, {
          text,
          group: form.group.value,
          section: 'meta',
          done,
          doneAt: done ? t.doneAt || Date.now() : null,
        });
        closeSheet();
        toast('Tarea actualizada', text, 2200);
      });
      form.querySelector('[data-delete]').addEventListener('click', async () => {
        if (await confirmSheet({ title: 'Eliminar tarea', text: `¿Eliminar “${t.text}”?` })) {
          store.remove('things', t.id);
          toast('Eliminado', t.text, 2000);
        }
      });
    },
  });
}

function row(t) {
  return `
    <li class="thing ${t.done ? 'is-done' : ''}" data-thing="${t.id}">
      <button type="button" class="check ${t.done ? 'is-checked' : ''}" data-check role="checkbox" aria-checked="${!!t.done}"
              aria-label="${t.done ? 'Marcar como pendiente' : 'Marcar como hecho'}: ${esc(t.text)}">${icons.check}</button>
      <span class="thing-text" data-edit>${esc(t.text)}</span>
      <button type="button" class="icon-btn meta-edit" data-edit aria-label="Editar: ${esc(t.text)}">${icons.edit}</button>
      <button type="button" class="icon-btn subtle" data-remove aria-label="Eliminar: ${esc(t.text)}">${icons.close}</button>
    </li>`;
}
