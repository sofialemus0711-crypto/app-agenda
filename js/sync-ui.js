// Hoja de "Sincronización": iniciar sesión para usar la misma agenda en varios dispositivos.

import * as sync from './sync.js';
import { esc, showSheet, closeSheet, toast } from './ui.js';

function timeAgo(d) {
  if (!d) return 'aún no';
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'hace un momento';
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  return d.toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' });
}

export function statusLabel(st) {
  if (!sync.isConfigured()) return 'Solo en este dispositivo';
  if (!sync.currentUser()) return 'Sin iniciar sesión';
  if (st.state === 'syncing') return 'Sincronizando…';
  if (st.state === 'offline') return 'Sin conexión';
  if (st.state === 'error') return 'Pendiente de sincronizar';
  return 'Sincronizado';
}

export function statusKind(st) {
  if (!sync.isConfigured() || !sync.currentUser()) return 'local';
  if (st.state === 'error' || st.state === 'offline') return 'warn';
  if (st.state === 'syncing') return 'busy';
  return 'ok';
}

export function openSyncSheet() {
  const user = sync.currentUser();
  const cfg = sync.getConfig();
  let content;

  if (!cfg) {
    content = `
      <p class="sheet-text">Tu agenda se guarda en este dispositivo y no se pierde al cerrar la app.</p>
      <p class="sheet-text muted">Para ver la misma información en tu celular y en tu computador, conecta MI AGENDA a una base de datos gratuita de Supabase (instrucciones en el archivo README).</p>
      <details class="advanced">
        <summary>Conectar base de datos</summary>
        <form class="form" data-config>
          <label class="field">
            <span class="field-label">URL del proyecto</span>
            <input name="url" type="url" placeholder="https://xxxx.supabase.co" autocomplete="off" required>
          </label>
          <label class="field">
            <span class="field-label">Clave pública (anon key)</span>
            <input name="key" type="text" autocomplete="off" required>
          </label>
          <div class="form-actions"><button class="btn btn-primary" type="submit">Conectar</button></div>
        </form>
      </details>`;
  } else if (!user) {
    content = `
      <p class="sheet-text">Inicia sesión para tener la misma agenda en tu celular y en tu computador. Usa el mismo correo en todos tus dispositivos.</p>
      <form class="form" data-login novalidate>
        <label class="field">
          <span class="field-label">Correo electrónico</span>
          <input name="email" type="email" autocomplete="email" inputmode="email" required>
        </label>
        <label class="field">
          <span class="field-label">Contraseña</span>
          <input name="password" type="password" autocomplete="current-password" minlength="6" required>
        </label>
        <p class="form-error" data-error hidden></p>
        <div class="form-actions">
          <button class="btn btn-ghost" type="button" data-signup>Crear cuenta</button>
          <button class="btn btn-primary" type="submit">Iniciar sesión</button>
        </div>
      </form>
      ${cfg.fixed ? '' : '<button type="button" class="btn-text" data-unconfig>Desconectar base de datos</button>'}`;
  } else {
    const st = sync.getStatus();
    content = `
      <p class="sheet-text">Sesión iniciada como <strong>${esc(user.email)}</strong>.</p>
      <p class="sheet-text muted" data-status>${esc(statusLabel(st))} · última sincronización ${esc(timeAgo(st.lastSync))}</p>
      ${st.message ? `<p class="sheet-text small muted">${esc(st.message)}</p>` : ''}
      <div class="form-actions">
        <button class="btn btn-ghost" type="button" data-logout>Cerrar sesión</button>
        <button class="btn btn-primary" type="button" data-now>Sincronizar ahora</button>
      </div>`;
  }

  showSheet({
    title: 'Sincronización',
    content,
    onReady(sheet) {
      const configForm = sheet.querySelector('[data-config]');
      if (configForm) {
        configForm.addEventListener('submit', (e) => {
          e.preventDefault();
          sync.setLocalConfig(configForm.url.value, configForm.key.value);
          openSyncSheet();
        });
      }

      const login = sheet.querySelector('[data-login]');
      if (login) {
        const errorEl = login.querySelector('[data-error]');
        const busy = (on) => login.querySelectorAll('button').forEach((b) => (b.disabled = on));
        const run = async (mode) => {
          errorEl.hidden = true;
          const email = login.email.value.trim();
          const password = login.password.value;
          if (!email || !password) {
            errorEl.textContent = 'Escribe tu correo y tu contraseña.';
            errorEl.hidden = false;
            return;
          }
          busy(true);
          try {
            if (mode === 'signup') {
              const r = await sync.signUp(email, password);
              if (r === 'confirm') {
                closeSheet();
                toast('Cuenta creada', 'Revisa tu correo para confirmarla y luego inicia sesión.', 8000);
                return;
              }
            } else {
              await sync.signIn(email, password);
            }
            closeSheet();
            toast('Sesión iniciada', 'Tu agenda se sincronizará en todos tus dispositivos.', 3500);
          } catch (err) {
            errorEl.textContent = err.message;
            errorEl.hidden = false;
          } finally {
            busy(false);
          }
        };
        login.addEventListener('submit', (e) => {
          e.preventDefault();
          run('signin');
        });
        sheet.querySelector('[data-signup]').addEventListener('click', () => run('signup'));
      }

      const unconfig = sheet.querySelector('[data-unconfig]');
      if (unconfig) {
        unconfig.addEventListener('click', () => {
          sync.setLocalConfig('', '');
          sync.signOut();
          openSyncSheet();
        });
      }

      const now = sheet.querySelector('[data-now]');
      if (now) {
        now.addEventListener('click', async () => {
          now.disabled = true;
          await sync.syncNow();
          now.disabled = false;
          const st = sync.getStatus();
          const el = sheet.querySelector('[data-status]');
          if (el) el.textContent = `${statusLabel(st)} · última sincronización ${timeAgo(st.lastSync)}`;
        });
      }

      const logout = sheet.querySelector('[data-logout]');
      if (logout) {
        logout.addEventListener('click', () => {
          sync.signOut();
          closeSheet();
          toast('Sesión cerrada', 'Tus datos siguen guardados en este dispositivo.', 3000);
        });
      }
    },
  });
}
