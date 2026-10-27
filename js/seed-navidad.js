// Checklist de la campaña de Navidad corporativa de Chef & Bakery (27 oct 2026 – 18 ene 2027),
// cargado una sola vez en Cosas sueltas.
// Cada tarea tiene un id fijo: si ya existe (o se eliminó) en este dispositivo o en la cuenta,
// no se vuelve a agregar, así no se duplica entre el celular y el computador.

import * as store from './store.js';

const TASKS = [
  // Semana 1 · 27 oct – 2 nov · Investigar y hacer los números
  ['s1-anterior', 'S1 · Mar 27 oct · Revisar campaña anterior: 5 errores y qué harás distinto'],
  ['s1-curso', 'S1 · Mar 27 oct · Curso Felipe Vergara Módulos 1 y 2: dibujar el ciclo de ventas'],
  ['s1-cliente', 'S1 · Mié 28 oct · Estudio de mercado: preguntar a 3–5 clientes y sacar 20 frases reales'],
  ['s1-competencia', 'S1 · Jue 29 oct · Biblioteca de anuncios: 15–20 anuncios de competencia en una hoja'],
  ['s1-moda', 'S1 · Vie 30 oct · Guardar 15 videos de moda y anotar 8 formatos'],
  ['s1-angulos', 'S1 · Vie 30 oct · Revisar ángulos: agregar regalo, fecha de corte o producción propia'],
  ['s1-numeros', 'S1 · Sáb 31 oct · Calcular AOV, margen, CPA máximo y costo máximo por conversación'],
  ['s1-pendientes', 'S1 · Sáb 31 oct · Llenar los datos pendientes del documento de ideas (precios, mínimos)'],
  ['s1-terminos', 'S1 · Dom 1 nov · Aprender los términos (glosario + Módulo 6)'],
  ['s1-cuenta', 'S1 · Lun 2 nov · Cuenta publicitaria y WhatsApp Business listos y probados'],
  // Semana 2 · 3 – 9 nov · Guiones, CapCut y grabación
  ['s2-guiones', 'S2 · Mar 3 nov · Cerrar guiones con datos reales + 1 guion del ángulo nuevo'],
  ['s2-casos', 'S2 · Mar 3 nov · Resolver los 5 casos de práctica de análisis de campañas'],
  ['s2-capcut1', 'S2 · Mié 4 nov · CapCut parte 1: cortes, silencios, subtítulos, exportar'],
  ['s2-capcut2', 'S2 · Jue 5 nov · CapCut parte 2: zoom, cámara lenta, B/N a color, audio'],
  ['s2-carrusel', 'S2 · Jue 5 nov · CapCut imágenes: plantilla del carrusel 4:5'],
  ['s2-equipo', 'S2 · Vie 6 nov · Comprar micrófono, trípode y luz + configurar el iPhone'],
  ['s2-rodaje', 'S2 · Sáb 7 nov · Plan de rodaje con todas las tomas y permisos'],
  ['s2-grabar', 'S2 · Dom 8 nov · Grabación de todos los anuncios y fotos del carrusel'],
  ['s2-anuncio1', 'S2 · Lun 9 nov · Editar el Anuncio 1 (novena)'],
  // Semana 3 · 10 – 16 nov · Editar, seguimiento, segmentación y lanzar
  ['s3-editar', 'S3 · Mar 10 nov · Editar Anuncio 2, carrusel y 3 versiones de hook'],
  ['s3-formatos', 'S3 · Mié 11 nov · Exportar 9:16 y 4:5, zonas seguras y textos'],
  ['s3-seguimiento', 'S3 · Mié 11 nov · Hoja de seguimiento (Diario + Leads) probada con un chat'],
  ['s3-segmentacion', 'S3 · Jue 12 nov · Campaña en borrador: Clientes potenciales → WhatsApp, 40.000/día'],
  ['s3-whatsapp', 'S3 · Jue 12 nov · Guiones de WhatsApp y quién responde'],
  ['s3-columnas', 'S3 · Jue 12 nov · Guardar columnas "CB_Diagnóstico" en el Administrador'],
  ['s3-lanzar', 'S3 · Vie 13 nov · LANZAR la campaña (respaldo: mar 17 nov)'],
  ['s3-esperar', 'S3 · Sáb 14 – Lun 16 nov · No tocar nada 72 h, solo revisar 15 min al día'],
  // Lista de lanzamiento
  ['l-oferta', 'Lanzamiento · Precios, mínimos y fecha de corte aprobados'],
  ['l-cpa', 'Lanzamiento · CPA máximo y costo máximo por conversación calculados'],
  ['l-anuncios', 'Lanzamiento · 3+ anuncios en 9:16 y 4:5 con subtítulos revisados'],
  ['l-musica', 'Lanzamiento · Música de la Sound Collection de Meta'],
  ['l-textos', 'Lanzamiento · Textos mencionan empresa, factura y entrega en oficina'],
  ['l-wa', 'Lanzamiento · WhatsApp con bienvenida, respuestas rápidas y etiquetas'],
  ['l-hoja', 'Lanzamiento · Hoja de seguimiento probada con un chat real'],
  ['l-responde', 'Lanzamiento · Persona y horario asignados para responder'],
  ['l-presupuesto', 'Lanzamiento · 40.000 COP/día y límite de gasto de la cuenta'],
  ['l-ubicacion', 'Lanzamiento · Ubicación limitada a donde entregan'],
  ['l-preview', 'Lanzamiento · Vista previa revisada en Reels, Historias y feed'],
  // Semana 4 · 17 – 23 nov · Primer ajuste
  ['s4-rutina', 'S4 · 17–23 nov · Rutina diaria de 15 min con la hoja al día'],
  ['s4-informe', 'S4 · Mar 17 nov · Informe semanal #1'],
  ['s4-calidad', 'S4 · Medir % de chats calificados y motivo de pérdida'],
  ['s4-semaforo', 'S4 · Vie 20 nov · Semáforo del día 7: cambiar solo el anuncio rojo'],
  ['s4-banco', 'S4 · Grabar Banco 1 (presupuesto) o Banco 2 (caso real)'],
  // Semana 5 · 24 – 30 nov · Pico de decisión
  ['s5-corte', 'S5 · Anuncio de fecha de corte (fecha confirmada con producción)'],
  ['s5-recuperar', 'S5 · Recuperar cotizaciones sin respuesta de más de 72 h'],
  ['s5-remarketing', 'S5 · Decidir si hay remarketing'],
  ['s5-escalar', 'S5 · Decidir si se escala (+20% cada 3–4 días)'],
  ['s5-informe', 'S5 · Informe #2 y versiones de 6, 15 y 30 s del ganador'],
  // Semana 6 · 1 – 7 dic · Cierre de ventas
  ['s6-ultimo', 'S6 · Anuncio de último llamado'],
  ['s6-fatiga', 'S6 · Revisar fatiga (frecuencia y CTR)'],
  ['s6-conciliar', 'S6 · Comparar Meta contra ventas reales de la hoja'],
  ['s6-rentable', 'S6 · ¿Fue rentable? ROAS real contra ROAS de equilibrio'],
  ['s6-grabar', 'S6 · Grabar entregas y eventos reales (con permiso)'],
  // Semanas 7 y 8 · 8 – 21 dic · Apagar y documentar
  ['s7-apagar', 'S7 · Jue 10 dic · Apagar la captación'],
  ['s7-testimonios', 'S7 · Pedir testimonios y reseñas en Google'],
  ['s7-hoja', 'S7 · Cerrar la hoja de leads con estado y motivo'],
  ['s8-informe', 'S8 · Informe final, 10 aprendizajes y caso de estudio'],
  // Semanas 9 y 10 · 22 dic – 4 ene · Preparar 2027
  ['s9-plantilla', 'S9 · Plantilla de marca en CapCut (anuncio de 15 s en menos de 45 min)'],
  ['s9-calendario', 'S9 · Calendario comercial 2027'],
  ['s10-enero', 'S10 · Oferta y campaña de enero con brief y números'],
  ['s10-reactivar', 'S10 · Mensajes para reactivar clientes'],
  // Semana 11 · 5 – 11 ene · Medición web y auditoría
  ['s11-pixel', 'S11 · Píxel y Administrador de eventos (Módulo 8)'],
  ['s11-capi', 'S11 · API de Conversiones sin eventos duplicados'],
  ['s11-utm', 'S11 · UTM y Google Analytics 4'],
  ['s11-auditoria', 'S11 · Auditar una cuenta publicitaria'],
  // Semana 12 · 12 – 18 ene · Profesionalizar
  ['s12-tablero', 'S12 · Tablero de informes'],
  ['s12-propuesta', 'S12 · Propuesta comercial'],
  ['s12-portafolio', 'S12 · Portafolio de 8–12 piezas'],
  ['s12-prueba', 'S12 · Prueba final'],
];

// La lista se muestra de la más reciente a la más antigua, así que la primera tarea
// recibe el createdAt más alto. Todos quedan por debajo de Date.now(): lo que anotes tú sale arriba.
const ITEMS = TASKS.map(([id, text], i) => ({
  id: `nav26-${id}`,
  text,
  done: false,
  createdAt: 10 + TASKS.length - i,
  updatedAt: 1, // muy antiguo: cualquier cambio tuyo siempre gana
}));

export function seedNavidad() {
  store.seedOnce('things', ITEMS);
}
