// Horario de clases del semestre 2026-2 (Pregrado), cargado una sola vez.
// Cada clase tiene un id fijo: si ya existe (o se eliminó) en este dispositivo o en la cuenta,
// no se vuelve a agregar, así no se duplica entre el celular y el computador.

import * as store from './store.js';

const C = (id, title, day, time, endTime, room) => ({
  id: `uni-2026-2-${id}`,
  kind: 'class',
  title,
  time,
  endTime,
  room,
  repeatDays: [day],
  startDate: '2026-07-27',
  date: null,
  reminder: 0,
  doneDates: [],
  createdAt: 1,
  updatedAt: 1, // muy antiguo: cualquier cambio tuyo siempre gana
});

const CLASSES = [
  // Martes
  C('mercadeo', 'Gestión de Mercadeo', 2, '06:00', '09:00', '34-501'),
  C('mate-mar', 'Matemáticas 1', 2, '10:30', '12:00', '20-315B'),
  C('pensamiento', 'Pensamiento Computacional', 2, '12:00', '15:00', '26-921'),
  // Miércoles
  C('frisbee', 'Frisbee Ultimate', 3, '10:00', '12:00', ''),
  C('mate-mie', 'Matemáticas 1', 3, '13:30', '15:00', '33-201'),
  // Jueves
  C('info-financiera', 'Información Financiera para la Toma de Decisiones', 4, '09:00', '12:00', '38-104'),
  C('fundamentos-admin', 'Fundamentos de Administración', 4, '18:00', '21:00', '34-303'),
  // Viernes
  C('ciudadania', 'Ciudadanía y Democracia', 5, '06:00', '09:00', '35-303'),
  C('mate-vie', 'Matemáticas 1', 5, '10:30', '12:00', '20-315B'),
];

export function seedUniversity() {
  store.seedOnce('activities', CLASSES);
}
