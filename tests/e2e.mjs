// Prueba completa de MI AGENDA en un navegador real (computador y celular).
// Uso: npm install && npm test
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { startMockSupabase } from './mock-supabase.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'miagenda-'));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const staticServer = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(ROOT, p === '/' ? 'index.html' : p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => staticServer.listen(8080, r));
const mock = await startMockSupabase(54321);
const BASE = 'http://localhost:8080/';
const MOCK = 'http://localhost:54321';
let failures = 0, passes = 0;
function ok(cond, msg) { if (cond) { passes++; console.log('  ✓ ' + msg); } else { failures++; console.log('  ✗ ' + msg); } }
const pad = (n) => String(n).padStart(2, '0');
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = new Date();
const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
const dayKey = (i, weekOffset = 0) => { const d = new Date(monday); d.setDate(monday.getDate() + i + weekOffset * 7); return key(d); };

const browser = await chromium.launch({ channel: 'chromium' });
const errors = [];
async function newPage(mobile, extra = {}) {
  const ctx = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: mobile, hasTouch: mobile, locale: 'es-CO', timezoneId: 'America/Bogota', ...extra,
  });
  await ctx.grantPermissions(['notifications'], { origin: 'http://localhost:8080' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  // (el 400 esperado viene de la prueba de contraseña incorrecta)
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('status of 400')) errors.push('console: ' + m.text()); });
  page.on('dialog', (d) => d.dismiss());
  return { ctx, page };
}
const cell = (page, date, hour) => page.locator(`.grid-cell[data-date="${date}"][data-hour="${hour}"]`);
const chipIn = (page, date, hour, title) => cell(page, date, hour).locator('.chip', { hasText: title });
async function saveSheet(page) { await page.locator('.sheet button[type="submit"]').click(); await page.waitForTimeout(250); }

// ======================= COMPUTADOR =======================
console.log('\nCOMPUTADOR — Mi semana');
const { ctx: ctxA, page: A } = await newPage(false);
await A.goto(BASE);
await A.waitForSelector('.week-grid');
ok(await A.locator('.grid-day').count() === 7, 'Semana completa con 7 días visibles');
ok(await A.locator('.grid-hour').count() === 14, 'Horas de 7:00 a. m. a 8:00 p. m.');
ok((await A.locator('.grid-hour').first().textContent()).trim() === '7:00 a. m.' && (await A.locator('.grid-hour').last().textContent()).trim() === '8:00 p. m.', 'Formato de hora "7:00 a. m." … "8:00 p. m."');

// 1. Clic en una hora → crear actividad
await cell(A, dayKey(0), 9).click();
await A.waitForSelector('.sheet');
ok(await A.locator('.sheet select[name="day"]').inputValue() === dayKey(0), 'Al tocar Lunes 9:00 el formulario trae el día');
ok(await A.locator('.sheet select[name="time"]').inputValue() === '09:00', '… y la hora');
await A.fill('.sheet input[name="title"]', 'Revisar cotizaciones');
await saveSheet(A);
ok(await chipIn(A, dayKey(0), 9, 'Revisar cotizaciones').count() === 1, 'Actividad creada aparece en Lunes 9:00');

// 2. Botón + AGREGAR ACTIVIDAD con días específicos
await A.click('.view-head [data-add]');
await A.fill('.sheet input[name="title"]', 'Pilates');
await A.selectOption('.sheet select[name="time"]', '18:00');
await A.selectOption('.sheet select[name="repeat"]', 'custom');
for (const v of ['1', '2', '3', '4', '5', '6', '7']) {
  const box = A.locator(`.sheet .weekday input[value="${v}"]`);
  const want = ['1', '3', '5'].includes(v);
  if ((await box.isChecked()) !== want) await box.locator('xpath=..').click();
}
await A.selectOption('.sheet select[name="reminder"]', '30');
await saveSheet(A);
let pilOk = true;
for (let i = 0; i < 7; i++) {
  const n = await chipIn(A, dayKey(i), 18, 'Pilates').count();
  if (n !== ([0, 2, 4].includes(i) ? 1 : 0)) pilOk = false;
}
ok(pilOk, 'Pilates aparece solo lunes, miércoles y viernes a las 6:00 p. m.');

// 3. Lunes a viernes y Todos los días
await A.click('.view-head [data-add]');
await A.fill('.sheet input[name="title"]', 'Revisar correo');
await A.selectOption('.sheet select[name="time"]', '08:00');
await A.selectOption('.sheet select[name="repeat"]', 'weekdays');
ok(await A.locator('.sheet .weekday input:checked').count() === 5, 'Opción "Lunes a viernes" marca 5 días');
await saveSheet(A);
let lv = 0; for (let i = 0; i < 7; i++) lv += await chipIn(A, dayKey(i), 8, 'Revisar correo').count();
ok(lv === 5 && await chipIn(A, dayKey(5), 8, 'Revisar correo').count() === 0, '"Revisar correo" de lunes a viernes (no sábado)');

await A.click('.view-head [data-add]');
await A.fill('.sheet input[name="title"]', 'Desayuno');
await A.selectOption('.sheet select[name="time"]', '07:00');
await A.selectOption('.sheet select[name="repeat"]', 'daily');
await saveSheet(A);
let dl = 0; for (let i = 0; i < 7; i++) dl += await chipIn(A, dayKey(i), 7, 'Desayuno').count();
ok(dl === 7, '"Desayuno" todos los días');

// Repetición en semanas siguientes
await A.click('[data-week="1"]');
let nextOk = await chipIn(A, dayKey(0, 1), 18, 'Pilates').count() === 1 && await chipIn(A, dayKey(4, 1), 18, 'Pilates').count() === 1;
ok(nextOk, 'Pilates sigue apareciendo la semana siguiente sin copiarla');
ok(await chipIn(A, dayKey(0, 1), 9, 'Revisar cotizaciones').count() === 0, 'Actividad de una sola vez NO aparece la semana siguiente');
ok((await A.locator('.week-range').textContent()).length > 5, 'Se ve la fecha de la semana: ' + (await A.locator('.week-range').textContent()));
await A.click('[data-week="0"]');

// 4. Actividad de una sola vez (jueves 10:00)
await cell(A, dayKey(3), 10).click();
await A.fill('.sheet input[name="title"]', 'Reunión con cliente');
ok(await A.locator('.sheet select[name="repeat"]').inputValue() === 'none', 'Por defecto: No repetir');
await saveSheet(A);
ok(await chipIn(A, dayKey(3), 10, 'Reunión con cliente').count() === 1, 'Reunión con cliente solo el jueves 10:00');

// 5. Editar: título, día y hora
await chipIn(A, dayKey(0), 9, 'Revisar cotizaciones').click();
ok((await A.locator('.sheet-head h2').textContent()) === 'Editar actividad', 'Tocar actividad abre "Editar actividad"');
await A.fill('.sheet input[name="title"]', 'Llamar a clientes');
await A.selectOption('.sheet select[name="day"]', dayKey(1));
await A.selectOption('.sheet select[name="time"]', '11:00');
await saveSheet(A);
ok(await chipIn(A, dayKey(1), 11, 'Llamar a clientes').count() === 1 && await A.locator('.chip', { hasText: 'Revisar cotizaciones' }).count() === 0, 'Editada: ahora "Llamar a clientes" el martes 11:00');

// 6. Editar los días de repetición de Pilates (agregar martes, quitar viernes) y recordatorio
await chipIn(A, dayKey(0), 18, 'Pilates').click();
ok(await A.locator('.sheet select[name="repeat"]').inputValue() === 'custom', 'Pilates abre con "Elegir días"');
ok(await A.locator('.sheet select[name="reminder"]').inputValue() === '30', 'Recordatorio guardado (30 min)');
await A.locator('.sheet .weekday input[value="2"]').locator('xpath=..').click();
await A.locator('.sheet .weekday input[value="5"]').locator('xpath=..').click();
await A.selectOption('.sheet select[name="reminder"]', '60');
await saveSheet(A);
ok(await chipIn(A, dayKey(1), 18, 'Pilates').count() === 1 && await chipIn(A, dayKey(4), 18, 'Pilates').count() === 0, 'Repetición editada: aparece martes, ya no viernes');

// 7. Marcar como realizada (solo ese día)
await chipIn(A, dayKey(0), 18, 'Pilates').click();
await A.click('.sheet [data-done]');
await A.waitForTimeout(250);
ok(await chipIn(A, dayKey(0), 18, 'Pilates').evaluate((e) => e.classList.contains('is-done')), 'Pilates del lunes marcado como realizado');
ok(!(await chipIn(A, dayKey(2), 18, 'Pilates').evaluate((e) => e.classList.contains('is-done'))), 'Pilates del miércoles sigue pendiente');

// 8. Arrastrar actividad a otra hora/día
await A.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove()));
const src = chipIn(A, dayKey(3), 10, 'Reunión con cliente');
const dst = cell(A, dayKey(4), 14);
await dst.scrollIntoViewIfNeeded();
const sb = await src.boundingBox(); const db = await dst.boundingBox();
await A.mouse.move(sb.x + 20, sb.y + 10);
await A.mouse.down();
await A.mouse.move(sb.x + 40, sb.y + 30, { steps: 4 });
await A.mouse.move(db.x + db.width / 2, db.y + db.height / 2, { steps: 12 });
await A.mouse.up();
await A.waitForTimeout(300);
ok(await chipIn(A, dayKey(4), 14, 'Reunión con cliente').count() === 1 && await chipIn(A, dayKey(3), 10, 'Reunión con cliente').count() === 0, 'Arrastrar: Reunión movida a viernes 2:00 p. m.');
ok(await A.locator('.sheet').count() === 0, 'Arrastrar no abre el formulario');

// 9. Eliminar
await chipIn(A, dayKey(1), 11, 'Llamar a clientes').click();
await A.click('.sheet [data-delete]');
await A.click('.sheet [data-yes]');
await A.waitForTimeout(300);
ok(await A.locator('.chip', { hasText: 'Llamar a clientes' }).count() === 0, 'Actividad eliminada');

// Otra fecha (semana distinta) desde el formulario
await A.click('.view-head [data-add]');
await A.fill('.sheet input[name="title"]', 'Dentista');
await A.selectOption('.sheet select[name="day"]', 'other');
await A.fill('.sheet input[name="otherDate"]', dayKey(2, 2));
await A.selectOption('.sheet select[name="time"]', '15:30');
await saveSheet(A);
ok(await chipIn(A, dayKey(2, 2), 15, 'Dentista').count() === 1, '"Otra fecha…" lleva a esa semana y muestra la actividad (3:30 p. m.)');
await A.click('[data-week="0"]');
await A.screenshot({ path: `${OUT}/t-desktop-week.png` });

// ======================= EVENTOS =======================
console.log('\nCOMPUTADOR — Eventos');
await A.click('.side-nav [data-nav="eventos"]'); await A.waitForTimeout(200);
await A.waitForSelector('.view-events');
const plusDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return key(d); };
async function addEvent(title, date, time, reminder, custom) {
  await A.click('.view-head [data-add]');
  await A.fill('.sheet input[name="title"]', title);
  await A.fill('.sheet input[name="date"]', date);
  if (time) await A.fill('.sheet input[name="time"]', time);
  await A.selectOption('.sheet select[name="reminder"]', reminder);
  if (custom) await A.fill('.sheet input[name="reminderAt"]', custom);
  await saveSheet(A);
}
await addEvent('✈️ Viaje', plusDays(34), null, '1w');
await addEvent('🎂 Cumpleaños de María', plusDays(8), null, '1d');
await addEvent('📅 Evento empresarial', plusDays(18), '10:00', '3d');
await addEvent('🎄 Comprar regalos de Navidad', plusDays(55), null, 'custom', `${plusDays(50)}T08:00`);
const titles = await A.locator('.event-title').allTextContents();
ok(titles[0].includes('María') && titles[1].includes('empresarial') && titles[2].includes('Viaje') && titles[3].includes('Navidad'), 'Eventos ordenados por fecha');
const lefts = await A.locator('.event-left').allTextContents();
ok(lefts[0] === 'Faltan 8 días' && lefts[1] === 'Faltan 18 días' && lefts[2] === 'Faltan 34 días', 'Calcula días que faltan: ' + lefts.slice(0, 3).join(', '));
// editar evento
await A.locator('.event', { hasText: 'Viaje' }).click();
ok(await A.locator('.sheet select[name="reminder"]').inputValue() === '1w', 'Evento guarda su recordatorio');
await A.fill('.sheet input[name="time"]', '06:00');
await saveSheet(A);
ok((await A.locator('.event', { hasText: 'Viaje' }).locator('.event-meta').textContent()).includes('6:00 a. m.'), 'Evento editado (hora opcional)');
await addEvent('Borrar este', plusDays(3), null, 'none');
await A.locator('.event', { hasText: 'Borrar este' }).click();
await A.click('.sheet [data-delete]'); await A.click('.sheet [data-yes]'); await A.waitForTimeout(250);
ok(await A.locator('.event', { hasText: 'Borrar este' }).count() === 0, 'Evento eliminado');
await A.screenshot({ path: `${OUT}/t-desktop-events.png` });

// ======================= COSAS SUELTAS =======================
console.log('\nCOMPUTADOR — Cosas sueltas');
await A.click('.side-nav [data-nav="cosas"]'); await A.waitForTimeout(200);
for (const t of ['Llamar a María', 'Comprar flores', 'Revisar cotización', 'Preguntar precio de las cajas']) {
  await A.fill('#thing-input', t);
  await A.press('#thing-input', 'Enter');
}
ok(await A.locator('.thing').count() === 4, 'Se agregan cosas sueltas rápidamente');
ok(await A.evaluate(() => document.activeElement.id === 'thing-input'), 'El cursor queda listo para escribir otra');
await A.locator('.thing', { hasText: 'Comprar flores' }).locator('button.check').click();
ok(await A.locator('.things.is-done .thing', { hasText: 'Comprar flores' }).count() === 1, 'Marcada como hecha (✓, tachada)');
await A.locator('.thing', { hasText: 'Revisar cotización' }).locator('[data-remove]').click();
ok(await A.locator('.thing', { hasText: 'Revisar cotización' }).count() === 0, 'Cosa suelta eliminada');
await A.screenshot({ path: `${OUT}/t-desktop-things.png` });

// ======================= PERSISTENCIA =======================
console.log('\nGUARDADO');
await A.reload();
await A.waitForSelector('.view-things');
ok(await A.locator('.thing').count() === 3, 'Tras recargar, las cosas sueltas siguen ahí');
await A.click('.side-nav [data-nav="semana"]'); await A.waitForTimeout(200);
ok(await chipIn(A, dayKey(0), 18, 'Pilates').count() === 1 && await chipIn(A, dayKey(0), 18, 'Pilates').evaluate((e) => e.classList.contains('is-done')), 'Tras recargar, actividades y "realizada" se conservan');
await A.click('.side-nav [data-nav="eventos"]'); await A.waitForTimeout(200);
ok(await A.locator('.event').count() === 4, 'Tras recargar, los eventos se conservan');

// ======================= RECORDATORIOS =======================
console.log('\nRECORDATORIOS');
{
  const { ctx, page: R } = await newPage(false);
  await R.addInitScript(() => {
    window.__notes = [];
    const orig = ServiceWorkerRegistration.prototype.showNotification;
    ServiceWorkerRegistration.prototype.showNotification = function (t, o) { window.__notes.push(t + ' | ' + (o && o.body)); return orig.call(this, t, o).catch(() => {}); };
    const N = window.Notification;
    window.Notification = class extends N { constructor(t, o) { window.__notes.push(t + ' | ' + (o && o.body)); super(t, o); } };
    window.Notification.requestPermission = N.requestPermission.bind(N);
    Object.defineProperty(window.Notification, 'permission', { get: () => N.permission });
  });
  await R.clock.install({ time: new Date('2026-10-07T14:40:00-05:00') });
  await R.goto(BASE);
  await R.waitForSelector('.week-grid');
  await R.evaluate(() => navigator.serviceWorker.ready);
  // actividad hoy (miércoles) 3:00 p. m. con aviso 15 min antes
  await cell(R, '2026-10-07', 15).click();
  await R.fill('.sheet input[name="title"]', 'Reunión');
  await R.selectOption('.sheet select[name="reminder"]', '15');
  await saveSheet(R);
  await R.clock.runFor(60000); // 14:41 → aún no
  ok((await R.evaluate(() => window.__notes)).length === 0, 'No avisa antes de tiempo (2:41 p. m.)');
  await R.clock.runFor(4 * 60000 + 1000); // ~14:45
  await R.waitForTimeout(300);
  let notes = await R.evaluate(() => window.__notes);
  ok(notes.some((n) => n.startsWith('Reunión')), 'Notificación del navegador a las 2:45 p. m.: ' + notes.join(' / '));
  ok(await R.locator('.toast', { hasText: 'Reunión' }).count() >= 1, 'Aviso visible dentro de la app');
  await R.clock.runFor(2 * 60000);
  ok((await R.evaluate(() => window.__notes)).filter((n) => n.startsWith('Reunión')).length === 1, 'El aviso no se repite');
  // evento mañana con aviso 1 día antes a las 9:00 → ya pasó la hora de aviso hoy, se avisa (aún no ocurre)
  await R.click('.side-nav [data-nav="eventos"]'); await R.waitForTimeout(200);
  await R.click('.view-head [data-add]');
  await R.fill('.sheet input[name="title"]', 'Cumpleaños de Ana');
  await R.fill('.sheet input[name="date"]', '2026-10-09');
  await R.selectOption('.sheet select[name="reminder"]', '1d');
  await saveSheet(R);
  await R.clock.runFor(25000);
  notes = await R.evaluate(() => window.__notes);
  ok(!notes.some((n) => n.includes('Ana')), 'Evento del 9 oct (aviso 1 día antes) no avisa el 7 oct');
  await R.clock.runFor(18 * 3600 * 1000 + 25 * 60000); // → 8 oct ~9:05
  await R.waitForTimeout(300);
  notes = await R.evaluate(() => window.__notes);
  ok(notes.some((n) => n.startsWith('Cumpleaños de Ana') && n.includes('Mañana')), 'Evento avisa 1 día antes: ' + notes.filter((n) => n.includes('Ana')).join(''));
  await ctx.close();
}

// ======================= CELULAR =======================
console.log('\nCELULAR');
const { ctx: ctxB, page: B } = await newPage(true);
await B.goto(BASE);
await B.waitForSelector('.day-list');
ok(await B.locator('.sidebar').isHidden() && await B.locator('.tabbar').isVisible(), 'Barra inferior: Mi semana | Eventos | Cosas sueltas');
ok(await B.locator('.week-grid').count() === 0, 'En celular no se reduce la cuadrícula: vista por día');
const dayTitle = (await B.locator('.day-title').innerText()).replace(/\s+/g, ' ');
ok(dayTitle.length > 5, 'Encabezado del día: ' + dayTitle);
await B.locator(`.day-row[data-hour="9"]`).click();
await B.fill('.sheet input[name="title"]', 'Cotizaciones');
await saveSheet(B);
ok(await B.locator('.day-row[data-hour="9"] .day-item', { hasText: 'Cotizaciones' }).count() === 1, 'Tocar una hora en el celular agrega la actividad');
await B.locator('.day-row[data-hour="9"] .day-item [data-toggle]').click();
ok(await B.locator('.day-row[data-hour="9"] .day-item').evaluate((e) => e.classList.contains('is-done')), 'Círculo para marcar como realizada');
await B.click('.fab');
await B.fill('.sheet input[name="title"]', 'Llamar a cliente');
await B.selectOption('.sheet select[name="time"]', '10:00');
await saveSheet(B);
ok(await B.locator('.day-row[data-hour="10"] .day-item', { hasText: 'Llamar a cliente' }).count() === 1, 'Botón flotante "Agregar actividad"');
await B.screenshot({ path: `${OUT}/t-mobile-day.png` });
const before = await B.locator('.day-title').innerText();
await B.click('[data-shift="1"]');
const after = await B.locator('.day-title').innerText();
ok(before !== after, `Cambiar de día ‹ › (${before.replace(/\n/g, ' ')} → ${after.replace(/\n/g, ' ')})`);
await B.click('[data-shift="-1"]');
// arrastrar con el dedo (mantener presionado)
{
  const it = B.locator('.day-row[data-hour="10"] .day-item');
  const tgt = B.locator('.day-row[data-hour="12"]');
  const ib = await it.boundingBox(); const tb = await tgt.boundingBox();
  const cdp = await B.context().newCDPSession(B);
  const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await tp('touchStart', ib.x + 120, ib.y + 15);
  await B.waitForTimeout(500);
  for (let k = 1; k <= 10; k++) await tp('touchMove', ib.x + 120, ib.y + 15 + (tb.y + 20 - ib.y - 15) * k / 10);
  await tp('touchEnd');
  await B.waitForTimeout(300);
  ok(await B.locator('.day-row[data-hour="12"] .day-item', { hasText: 'Llamar a cliente' }).count() === 1, 'Mantener presionado y arrastrar en el celular');
}
await B.click('[data-mode="week"]');
ok(await B.locator('.week-list-day').count() === 7, 'Opción "Semana" en el celular');
await B.screenshot({ path: `${OUT}/t-mobile-week.png`, fullPage: true });
await B.click('[data-mode="day"]');
await B.click('.tabbar [data-nav="eventos"]'); await B.waitForTimeout(200);
await B.click('.fab');
ok(await B.locator('.sheet').isVisible(), 'Agregar evento en el celular (hoja inferior)');
await B.screenshot({ path: `${OUT}/t-mobile-sheet.png` });
await B.click('.sheet [data-close]');
await B.click('.tabbar [data-nav="cosas"]'); await B.waitForTimeout(200);
await B.fill('#thing-input', 'Comprar regalo'); await B.click('.quick-add button');
ok(await B.locator('.thing').count() === 1, 'Cosas sueltas en el celular');
// tamaños táctiles
const small = await B.evaluate(() => [...document.querySelectorAll('.tabbar a, .check, .quick-add .btn, .fab, [data-remove]')].filter((e) => e.offsetParent && Math.min(e.getBoundingClientRect().width, e.getBoundingClientRect().height) < 28).length);
ok(small === 0, 'Botones cómodos para el dedo');
const overflow = await B.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
ok(!overflow, 'Sin desplazamiento horizontal en el celular');

// ======================= SINCRONIZACIÓN =======================
console.log('\nSINCRONIZACIÓN (base de datos simulada)');
// Computador: conectar base de datos desde la app y crear cuenta
await A.click('.side-nav [data-nav="semana"]'); await A.waitForTimeout(200);
await A.click('.sidebar [data-sync]');
await A.click('.sheet .advanced summary');
await A.fill('.sheet input[name="url"]', MOCK);
await A.fill('.sheet input[name="key"]', 'anon-test');
await A.click('.sheet [data-config] button');
await A.fill('.sheet input[name="email"]', 'sofia@example.com');
await A.fill('.sheet input[name="password"]', 'clave123');
await A.click('.sheet [data-signup]');
await A.waitForTimeout(1500);
ok((await A.locator('.sidebar [data-sync-label]').textContent()) === 'Sincronizado', 'Computador: cuenta creada y sincronizado');
// Celular: conectar y entrar con la misma cuenta
await B.click('.tabbar [data-nav="semana"]'); await B.waitForTimeout(200);
await B.click('.topbar [data-sync]');
await B.click('.sheet .advanced summary');
await B.fill('.sheet input[name="url"]', MOCK);
await B.fill('.sheet input[name="key"]', 'anon-test');
await B.click('.sheet [data-config] button');
await B.fill('.sheet input[name="email"]', 'sofia@example.com');
await B.fill('.sheet input[name="password"]', 'mala');
await B.click('.sheet button[type="submit"]');
await B.waitForTimeout(500);
ok((await B.locator('.sheet .form-error').textContent()).includes('incorrectos'), 'Contraseña incorrecta muestra un mensaje claro');
await B.fill('.sheet input[name="password"]', 'clave123');
await B.click('.sheet button[type="submit"]');
await B.waitForTimeout(1500);
ok(await B.locator('.sheet').count() === 0, 'Celular: sesión iniciada');
// Celular debe ver lo creado en el computador
await B.click('[data-mode="week"]');
ok(await B.locator('.week-list-item', { hasText: 'Pilates' }).count() === 3, 'Celular ve "Pilates" creado en el computador');
await B.click('.tabbar [data-nav="eventos"]'); await B.waitForTimeout(200);
ok(await B.locator('.event', { hasText: 'María' }).count() === 1, 'Celular ve los eventos del computador');
// Celular agrega un evento → el computador lo ve
await B.click('.fab');
await B.fill('.sheet input[name="title"]', 'Evento desde el celular');
await B.fill('.sheet input[name="date"]', plusDays(5));
await saveSheet(B);
await B.waitForTimeout(1500);
await A.click('.side-nav [data-nav="eventos"]'); await A.waitForTimeout(200);
await A.click('.sidebar [data-sync]'); await A.click('.sheet [data-now]'); await A.waitForTimeout(800); await A.click('.sheet [data-close]');
await A.waitForTimeout(300);
ok(await A.locator('.event', { hasText: 'Evento desde el celular' }).count() === 1, 'Computador ve el evento creado en el celular');
// Cosas sueltas del celular combinadas con las del computador
await A.click('.side-nav [data-nav="cosas"]'); await A.waitForTimeout(200);
ok(await A.locator('.thing', { hasText: 'Comprar regalo' }).count() === 1 && await A.locator('.thing', { hasText: 'Llamar a María' }).count() === 1, 'Las cosas sueltas de ambos dispositivos se combinan');
// Computador agrega "Viernes 10:00 — Llamar a cliente" y elimina algo → celular lo ve al volver a la app
await A.click('.side-nav [data-nav="semana"]'); await A.waitForTimeout(200);
await cell(A, dayKey(4), 10).click();
await A.fill('.sheet input[name="title"]', 'Llamar a proveedor');
await saveSheet(A);
await A.click('.side-nav [data-nav="cosas"]'); await A.waitForTimeout(200);
await A.locator('.thing', { hasText: 'Preguntar precio' }).locator('[data-remove]').click();
await A.waitForTimeout(1500);
await B.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
await B.waitForTimeout(1200);
await B.click('.tabbar [data-nav="cosas"]'); await B.waitForTimeout(200);
ok(await B.locator('.thing', { hasText: 'Preguntar precio' }).count() === 0, 'Eliminar en el computador también elimina en el celular');
await B.click('.tabbar [data-nav="semana"]'); await B.waitForTimeout(200);
await B.click('[data-mode="week"]');
ok(await B.locator('.week-list-item', { hasText: 'Llamar a proveedor' }).count() === 1, 'Actividad nueva del computador aparece en el celular');
// Nuevo dispositivo vacío: iniciar sesión trae todo
{
  const { ctx, page: C } = await newPage(false);
  await C.goto(BASE);
  await C.evaluate((m) => localStorage.setItem('miagenda.supabase', JSON.stringify({ url: m, key: 'anon-test' })), MOCK);
  await C.reload();
  await C.click('.sidebar [data-sync]');
  await C.fill('.sheet input[name="email"]', 'sofia@example.com');
  await C.fill('.sheet input[name="password"]', 'clave123');
  await C.click('.sheet button[type="submit"]');
  await C.waitForTimeout(1500);
  ok(await chipIn(C, dayKey(0), 18, 'Pilates').count() === 1 && await chipIn(C, dayKey(0), 18, 'Pilates').evaluate((e) => e.classList.contains('is-done')), 'Un tercer dispositivo recibe toda la agenda (incluido "realizada")');
  await ctx.close();
}

console.log(`\n${passes} correctas, ${failures} fallidas`);
console.log(errors.length ? 'ERRORES JS:\n' + errors.join('\n') : 'Sin errores de JavaScript');
await browser.close();
staticServer.close();
mock.close();
console.log('Capturas en ' + OUT);
process.exit(failures ? 1 : 0);
