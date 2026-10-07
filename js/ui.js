// Pequeñas utilidades de interfaz: escapar texto, hoja/modal y avisos.

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export const icons = {
  week: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>',
  events: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg>',
  things: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h9l3.5 3.5v13.5H6z"/><path d="M9 11h6M9 14.5h6M9 18h3.5"/></svg>',
  cloud: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18.5h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.5 1.6A3.3 3.3 0 0 0 7 18.5z"/></svg>',
  bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg>',
  repeat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11V9.5A3.5 3.5 0 0 1 7.5 6H19l-3-3M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H5l3 3"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/></svg>',
  left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg>',
  right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5L16 12l-6.5 6.5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
};

// ---------- Hoja (modal) ----------

let openSheet = null;

export function closeSheet() {
  if (!openSheet) return;
  const el = openSheet;
  openSheet = null;
  el.classList.remove('is-open');
  document.body.classList.remove('sheet-open');
  setTimeout(() => el.remove(), 220);
}

// content: HTML del cuerpo. onReady(el) recibe el contenedor para conectar eventos.
export function showSheet({ title, content, onReady }) {
  if (openSheet) {
    openSheet.remove();
    openSheet = null;
  }
  const wrap = document.createElement('div');
  wrap.className = 'sheet-backdrop';
  wrap.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="sheet-grip" aria-hidden="true"></div>
      <header class="sheet-head">
        <h2>${esc(title)}</h2>
        <button type="button" class="icon-btn" data-close aria-label="Cerrar">${icons.close}</button>
      </header>
      <div class="sheet-body">${content}</div>
    </div>`;
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap || e.target.closest('[data-close]')) closeSheet();
  });
  document.body.appendChild(wrap);
  document.body.classList.add('sheet-open');
  openSheet = wrap;
  requestAnimationFrame(() => wrap.classList.add('is-open'));
  if (onReady) onReady(wrap.querySelector('.sheet'));
  const first = wrap.querySelector('[autofocus]');
  // En celular no se abre el teclado automáticamente al editar
  if (first && !(first.value && first.value.length)) setTimeout(() => first.focus(), 60);
  return wrap;
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSheet();
});

// ---------- Avisos ----------

export function toast(title, body = '', ms = 3500) {
  let root = document.getElementById('toasts');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toasts';
    root.setAttribute('aria-live', 'polite');
    document.body.appendChild(root);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<strong>${esc(title)}</strong>${body ? `<span>${esc(body)}</span>` : ''}`;
  root.appendChild(el);
  // Nunca más de dos avisos a la vez
  while (root.children.length > 2) root.firstElementChild.remove();
  requestAnimationFrame(() => el.classList.add('is-in'));
  const hide = () => {
    el.classList.remove('is-in');
    setTimeout(() => el.remove(), 300);
  };
  el.addEventListener('click', hide);
  setTimeout(hide, ms);
}

export function confirmSheet({ title, text, okLabel = 'Eliminar' }) {
  return new Promise((resolve) => {
    let answered = false;
    showSheet({
      title,
      content: `<p class="sheet-text">${esc(text)}</p>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" data-no>Cancelar</button>
          <button type="button" class="btn btn-danger" data-yes>${esc(okLabel)}</button>
        </div>`,
      onReady(el) {
        el.querySelector('[data-yes]').addEventListener('click', () => {
          answered = true;
          closeSheet();
          resolve(true);
        });
        el.querySelector('[data-no]').addEventListener('click', () => {
          answered = true;
          closeSheet();
          resolve(false);
        });
        const obs = new MutationObserver(() => {
          if (!el.isConnected) {
            obs.disconnect();
            if (!answered) resolve(false);
          }
        });
        obs.observe(document.body, { childList: true });
      },
    });
  });
}
