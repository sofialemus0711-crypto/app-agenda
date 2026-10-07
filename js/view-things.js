// Pantalla COSAS SUELTAS: pendientes y cosas que no quiero olvidar.

import * as store from './store.js';
import { esc, icons, toast } from './ui.js';

// Lo que se está escribiendo se conserva aunque la pantalla se actualice
let draft = '';

export function renderThings(root) {
  const items = store.list('things');
  const pending = items.filter((t) => !t.done).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const done = items.filter((t) => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  const hadFocus = document.activeElement && document.activeElement.name === 'thing';

  root.innerHTML = `
    <section class="view view-things">
      <header class="view-head">
        <div class="view-title">
          <p class="eyebrow">Cosas sueltas</p>
          <h1>Lo que no quiero olvidar</h1>
        </div>
      </header>

      <form class="quick-add" autocomplete="off">
        <label class="visually-hidden" for="thing-input">Cosa suelta</label>
        <input id="thing-input" name="thing" type="text" maxlength="200" placeholder="¿Qué necesitas recordar?" enterkeyhint="done" value="${esc(draft)}">
        <button type="submit" class="btn btn-primary">Guardar</button>
      </form>

      ${items.length === 0
        ? `<div class="empty">
             <p class="empty-title">Todo en orden</p>
             <p class="muted">Anota aquí llamadas, compras o pendientes que aún no tienen día ni hora.</p>
           </div>`
        : ''}

      <ul class="things">${pending.map(row).join('')}</ul>
      ${done.length ? `<p class="list-label">Hechas</p><ul class="things is-done">${done.map(row).join('')}</ul>` : ''}
    </section>`;

  const section = root.querySelector('.view-things');
  const form = section.querySelector('.quick-add');
  const input = form.thing;
  if (hadFocus) input.focus();
  input.addEventListener('input', () => (draft = input.value));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return input.focus();
    draft = '';
    store.add('things', { text, done: false });
    // render se dispara por el cambio en el almacén; se mantiene el foco para seguir anotando
    const again = document.getElementById('thing-input');
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
    if (e.target.closest('[data-check]')) {
      store.update('things', id, { done: !t.done, doneAt: t.done ? null : Date.now() });
    }
  });
}

function row(t) {
  return `
    <li class="thing ${t.done ? 'is-done' : ''}" data-thing="${t.id}">
      <button type="button" class="check ${t.done ? 'is-checked' : ''}" data-check role="checkbox" aria-checked="${!!t.done}"
              aria-label="${t.done ? 'Marcar como pendiente' : 'Marcar como hecho'}: ${esc(t.text)}">${icons.check}</button>
      <span class="thing-text" data-check>${esc(t.text)}</span>
      <button type="button" class="icon-btn subtle" data-remove aria-label="Eliminar: ${esc(t.text)}">${icons.close}</button>
    </li>`;
}
