// Checklist de la campaña de Navidad corporativa de Chef & Bakery (27 oct 2026 – 18 ene 2027),
// cargado una sola vez en la sección META (se guarda como cosas sueltas con section = 'meta').
// Cada tarea tiene un id fijo: si ya existe (o se eliminó) en este dispositivo o en la cuenta,
// no se vuelve a agregar, así no se duplica entre el celular y el computador.

import * as store from './store.js';

const TASKS = [
  // Semana 1 · 27 oct – 2 nov · Investigar y hacer los números
  ['s1-anterior', 'Semana 1 · 27 oct – 2 nov · Investigar y hacer los números', 'Mar 27 oct · Revisar campaña anterior: 5 errores y qué harás distinto'],
  ['s1-curso', 'Semana 1 · 27 oct – 2 nov · Investigar y hacer los números', 'Mar 27 oct · Curso Felipe Vergara Módulos 1 y 2: dibujar el ciclo de ventas'],
  ['s1-cliente', 'Semana 1 · 27 oct – 2 nov · Investigar y hacer los números', 'Mié 28 oct · Estudio de mercado: preguntar a 3–5 clientes y sacar 20 frases reales'],
  ['s1-competencia', 'Semana 1 · 27 oct – 2 nov · Investigar y hacer los números', 'Jue 29 oct · Biblioteca de anuncios: 15–20 anuncios de competencia en una hoja'],
  ['s1-moda', 'Semana 1 · 27 oct – 2 nov · Investigar y hacer los números', 'Vie 30 oct · Guardar 15 videos de moda y anotar 8 formatos'],
  ['s1-angulos', 'Semana 1 · 27 oct – 2 nov · Investigar y hacer los números', 'Vie 30 oct · Revisar ángulos: agregar regalo, fecha de corte o producción propia'],
  ['s1-numeros', 'Semana 1 · 27 oct – 2 nov · Investigar y hacer los números', 'Sáb 31 oct · Calcular AOV, margen, CPA máximo y costo máximo por conversación'],
  ['s1-pendientes', 'Semana 1 · 27 oct – 2 nov · Investigar y hacer los números', 'Sáb 31 oct · Llenar los datos pendientes del documento de ideas (precios, mínimos)'],
  ['s1-terminos', 'Semana 1 · 27 oct – 2 nov · Investigar y hacer los números', 'Dom 1 nov · Aprender los términos (glosario + Módulo 6)'],
  ['s1-cuenta', 'Semana 1 · 27 oct – 2 nov · Investigar y hacer los números', 'Lun 2 nov · Cuenta publicitaria y WhatsApp Business listos y probados'],
  // Semana 2 · 3 – 9 nov · Guiones, CapCut y grabación
  ['s2-guiones', 'Semana 2 · 3 – 9 nov · Guiones, CapCut y grabación', 'Mar 3 nov · Cerrar guiones con datos reales + 1 guion del ángulo nuevo'],
  ['s2-casos', 'Semana 2 · 3 – 9 nov · Guiones, CapCut y grabación', 'Mar 3 nov · Resolver los 5 casos de práctica de análisis de campañas'],
  ['s2-capcut1', 'Semana 2 · 3 – 9 nov · Guiones, CapCut y grabación', 'Mié 4 nov · CapCut parte 1: cortes, silencios, subtítulos, exportar'],
  ['s2-capcut2', 'Semana 2 · 3 – 9 nov · Guiones, CapCut y grabación', 'Jue 5 nov · CapCut parte 2: zoom, cámara lenta, B/N a color, audio'],
  ['s2-carrusel', 'Semana 2 · 3 – 9 nov · Guiones, CapCut y grabación', 'Jue 5 nov · CapCut imágenes: plantilla del carrusel 4:5'],
  ['s2-equipo', 'Semana 2 · 3 – 9 nov · Guiones, CapCut y grabación', 'Vie 6 nov · Comprar micrófono, trípode y luz + configurar el iPhone'],
  ['s2-rodaje', 'Semana 2 · 3 – 9 nov · Guiones, CapCut y grabación', 'Sáb 7 nov · Plan de rodaje con todas las tomas y permisos'],
  ['s2-grabar', 'Semana 2 · 3 – 9 nov · Guiones, CapCut y grabación', 'Dom 8 nov · Grabación de todos los anuncios y fotos del carrusel'],
  ['s2-anuncio1', 'Semana 2 · 3 – 9 nov · Guiones, CapCut y grabación', 'Lun 9 nov · Editar el Anuncio 1 (novena)'],
  // Semana 3 · 10 – 16 nov · Editar, seguimiento, segmentación y lanzar
  ['s3-editar', 'Semana 3 · 10 – 16 nov · Editar, seguimiento, segmentación y lanzar', 'Mar 10 nov · Editar Anuncio 2, carrusel y 3 versiones de hook'],
  ['s3-formatos', 'Semana 3 · 10 – 16 nov · Editar, seguimiento, segmentación y lanzar', 'Mié 11 nov · Exportar 9:16 y 4:5, zonas seguras y textos'],
  ['s3-seguimiento', 'Semana 3 · 10 – 16 nov · Editar, seguimiento, segmentación y lanzar', 'Mié 11 nov · Hoja de seguimiento (Diario + Leads) probada con un chat'],
  ['s3-segmentacion', 'Semana 3 · 10 – 16 nov · Editar, seguimiento, segmentación y lanzar', 'Jue 12 nov · Campaña en borrador: Clientes potenciales → WhatsApp, 40.000/día'],
  ['s3-whatsapp', 'Semana 3 · 10 – 16 nov · Editar, seguimiento, segmentación y lanzar', 'Jue 12 nov · Guiones de WhatsApp y quién responde'],
  ['s3-columnas', 'Semana 3 · 10 – 16 nov · Editar, seguimiento, segmentación y lanzar', 'Jue 12 nov · Guardar columnas «CB_Diagnóstico» en el Administrador'],
  ['s3-lanzar', 'Semana 3 · 10 – 16 nov · Editar, seguimiento, segmentación y lanzar', 'Vie 13 nov · LANZAR la campaña (respaldo: mar 17 nov)'],
  ['s3-esperar', 'Semana 3 · 10 – 16 nov · Editar, seguimiento, segmentación y lanzar', 'Sáb 14 – Lun 16 nov · No tocar nada 72 h, solo revisar 15 min al día'],
  // Lista de lanzamiento
  ['l-oferta', 'Lista de lanzamiento', 'Precios, mínimos y fecha de corte aprobados'],
  ['l-cpa', 'Lista de lanzamiento', 'CPA máximo y costo máximo por conversación calculados'],
  ['l-anuncios', 'Lista de lanzamiento', '3+ anuncios en 9:16 y 4:5 con subtítulos revisados'],
  ['l-musica', 'Lista de lanzamiento', 'Música de la Sound Collection de Meta'],
  ['l-textos', 'Lista de lanzamiento', 'Textos mencionan empresa, factura y entrega en oficina'],
  ['l-wa', 'Lista de lanzamiento', 'WhatsApp con bienvenida, respuestas rápidas y etiquetas'],
  ['l-hoja', 'Lista de lanzamiento', 'Hoja de seguimiento probada con un chat real'],
  ['l-responde', 'Lista de lanzamiento', 'Persona y horario asignados para responder'],
  ['l-presupuesto', 'Lista de lanzamiento', '40.000 COP/día y límite de gasto de la cuenta'],
  ['l-ubicacion', 'Lista de lanzamiento', 'Ubicación limitada a donde entregan'],
  ['l-preview', 'Lista de lanzamiento', 'Vista previa revisada en Reels, Historias y feed'],
  // Semana 4 · 17 – 23 nov · Primer ajuste
  ['s4-rutina', 'Semana 4 · 17 – 23 nov · Primer ajuste', '17–23 nov · Rutina diaria de 15 min con la hoja al día'],
  ['s4-informe', 'Semana 4 · 17 – 23 nov · Primer ajuste', 'Mar 17 nov · Informe semanal #1'],
  ['s4-calidad', 'Semana 4 · 17 – 23 nov · Primer ajuste', 'Medir % de chats calificados y motivo de pérdida'],
  ['s4-semaforo', 'Semana 4 · 17 – 23 nov · Primer ajuste', 'Vie 20 nov · Semáforo del día 7: cambiar solo el anuncio rojo'],
  ['s4-banco', 'Semana 4 · 17 – 23 nov · Primer ajuste', 'Grabar Banco 1 (presupuesto) o Banco 2 (caso real)'],
  // Semana 5 · 24 – 30 nov · Pico de decisión
  ['s5-corte', 'Semana 5 · 24 – 30 nov · Pico de decisión', 'Anuncio de fecha de corte (fecha confirmada con producción)'],
  ['s5-recuperar', 'Semana 5 · 24 – 30 nov · Pico de decisión', 'Recuperar cotizaciones sin respuesta de más de 72 h'],
  ['s5-remarketing', 'Semana 5 · 24 – 30 nov · Pico de decisión', 'Decidir si hay remarketing'],
  ['s5-escalar', 'Semana 5 · 24 – 30 nov · Pico de decisión', 'Decidir si se escala (+20% cada 3–4 días)'],
  ['s5-informe', 'Semana 5 · 24 – 30 nov · Pico de decisión', 'Informe #2 y versiones de 6, 15 y 30 s del ganador'],
  // Semana 6 · 1 – 7 dic · Cierre de ventas
  ['s6-ultimo', 'Semana 6 · 1 – 7 dic · Cierre de ventas', 'Anuncio de último llamado'],
  ['s6-fatiga', 'Semana 6 · 1 – 7 dic · Cierre de ventas', 'Revisar fatiga (frecuencia y CTR)'],
  ['s6-conciliar', 'Semana 6 · 1 – 7 dic · Cierre de ventas', 'Comparar Meta contra ventas reales de la hoja'],
  ['s6-rentable', 'Semana 6 · 1 – 7 dic · Cierre de ventas', '¿Fue rentable? ROAS real contra ROAS de equilibrio'],
  ['s6-grabar', 'Semana 6 · 1 – 7 dic · Cierre de ventas', 'Grabar entregas y eventos reales (con permiso)'],
  // Semanas 7 y 8 · 8 – 21 dic · Apagar y documentar
  ['s7-apagar', 'Semanas 7 y 8 · 8 – 21 dic · Apagar y documentar', 'Jue 10 dic · Apagar la captación'],
  ['s7-testimonios', 'Semanas 7 y 8 · 8 – 21 dic · Apagar y documentar', 'Pedir testimonios y reseñas en Google'],
  ['s7-hoja', 'Semanas 7 y 8 · 8 – 21 dic · Apagar y documentar', 'Cerrar la hoja de leads con estado y motivo'],
  ['s8-informe', 'Semanas 7 y 8 · 8 – 21 dic · Apagar y documentar', 'Informe final, 10 aprendizajes y caso de estudio'],
  // Semanas 9 y 10 · 22 dic – 4 ene · Preparar 2027
  ['s9-plantilla', 'Semanas 9 y 10 · 22 dic – 4 ene · Preparar 2027', 'Plantilla de marca en CapCut (anuncio de 15 s en menos de 45 min)'],
  ['s9-calendario', 'Semanas 9 y 10 · 22 dic – 4 ene · Preparar 2027', 'Calendario comercial 2027'],
  ['s10-enero', 'Semanas 9 y 10 · 22 dic – 4 ene · Preparar 2027', 'Oferta y campaña de enero con brief y números'],
  ['s10-reactivar', 'Semanas 9 y 10 · 22 dic – 4 ene · Preparar 2027', 'Mensajes para reactivar clientes'],
  // Semana 11 · 5 – 11 ene · Medición web y auditoría
  ['s11-pixel', 'Semana 11 · 5 – 11 ene · Medición web y auditoría', 'Píxel y Administrador de eventos (Módulo 8)'],
  ['s11-capi', 'Semana 11 · 5 – 11 ene · Medición web y auditoría', 'API de Conversiones sin eventos duplicados'],
  ['s11-utm', 'Semana 11 · 5 – 11 ene · Medición web y auditoría', 'UTM y Google Analytics 4'],
  ['s11-auditoria', 'Semana 11 · 5 – 11 ene · Medición web y auditoría', 'Auditar una cuenta publicitaria'],
  // Semana 12 · 12 – 18 ene · Profesionalizar
  ['s12-tablero', 'Semana 12 · 12 – 18 ene · Profesionalizar', 'Tablero de informes'],
  ['s12-propuesta', 'Semana 12 · 12 – 18 ene · Profesionalizar', 'Propuesta comercial'],
  ['s12-portafolio', 'Semana 12 · 12 – 18 ene · Profesionalizar', 'Portafolio de 8–12 piezas'],
  ['s12-prueba', 'Semana 12 · 12 – 18 ene · Profesionalizar', 'Prueba final'],
];

// La lista se muestra de la más reciente a la más antigua, así que la primera tarea
// recibe el createdAt más alto. Todos quedan por debajo de Date.now(): lo que anotes tú sale arriba.
export const META_GROUPS = [...new Set(TASKS.map(([, group]) => group))];

const ITEMS = TASKS.map(([id, group, text], i) => ({
  id: `nav26-${id}`,
  section: 'meta',
  group,
  text,
  done: false,
  createdAt: 10 + TASKS.length - i,
  updatedAt: 1, // muy antiguo: cualquier cambio tuyo siempre gana
}));

export function seedNavidad() {
  store.seedOnce('things', ITEMS);
  // Primera versión: estas tareas se cargaron en Cosas sueltas. Se pasan a META sin perder lo marcado.
  for (const it of ITEMS) {
    const cur = store.get('things', it.id);
    if (cur && cur.section !== 'meta') store.update('things', it.id, { section: 'meta', group: it.group, text: it.text });
  }
}
