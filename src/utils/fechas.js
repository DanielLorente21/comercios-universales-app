// ════════════════════════════════════════════════════════════════════════════
// src/utils/fechas.js — Helpers de fecha y hora · Comercios Universales
// ════════════════════════════════════════════════════════════════════════════

// ─── Constantes ───────────────────────────────────────────────────────────────
export const DIAS_POR_MES = 1.25;
export const REGEX_FECHA  = /^(\d{2})\/(\d{2})\/(\d{4})$/;

// ─── Formato de fechas y horas ────────────────────────────────────────────────

// Devuelve DD/MM/YYYY HH:MM
export const formatFechaHora = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// Devuelve hora en formato 12h (ej. 02:30 PM)
export const formatHora12 = (date) =>
  date.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: true });

// Diferencia entre dos fechas ISO en minutos
export const diffMinutos = (isoInicio, isoFin) => {
  try {
    const ms = new Date(isoFin) - new Date(isoInicio);
    return Math.round(ms / 60000);
  } catch { return null; }
};

// ─── Parsing de fechas ────────────────────────────────────────────────────────

// Parsea fecha DD/MM/YYYY → Date
export const parsearFechaIngreso = (str) => {
  if (!str) return null;
  const [d, m, y] = str.split('/');
  if (!d || !m || !y) return null;
  return new Date(Number(y), Number(m) - 1, Number(d));
};

// Parsea fecha DD/MM/YYYY con validación estricta → Date | null
export const parsearFecha = (str) => {
  const m = str.match(REGEX_FECHA);
  if (!m) return null;
  const [, d, mo, y] = m;
  const fecha = new Date(Number(y), Number(mo) - 1, Number(d));
  if (
    fecha.getFullYear() !== Number(y) ||
    fecha.getMonth()    !== Number(mo) - 1 ||
    fecha.getDate()     !== Number(d)
  ) return null;
  return fecha;
};

// ─── Clave del mes actual ─────────────────────────────────────────────────────

// Devuelve YYYY-MM del mes actual
export const clavesMesActual = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
};

// ─── Validación de rango de fechas ────────────────────────────────────────────

export const validarFechas = (inicio, fin) => {
  if (!REGEX_FECHA.test(inicio)) return 'La fecha de inicio no tiene formato DD/MM/AAAA';
  if (!REGEX_FECHA.test(fin))    return 'La fecha de fin no tiene formato DD/MM/AAAA';
  const fInicio = parsearFecha(inicio);
  const fFin    = parsearFecha(fin);
  if (!fInicio) return 'Fecha de inicio inválida';
  if (!fFin)    return 'Fecha de fin inválida';
  if (fFin < fInicio) return 'La fecha de fin no puede ser anterior a la fecha de inicio';
  return null;
};

// ─── Cálculo de meses pendientes de acumulación ──────────────────────────────

export const calcularMesesPendientes = (fechaIngreso, ultimaAcumulacion) => {
  const ingreso = parsearFechaIngreso(fechaIngreso);
  if (!ingreso) return 0;

  const hoy = new Date();
  let ref;

  // Soporta formato nuevo YYYY-MM-DD y anterior YYYY-MM
  if (ultimaAcumulacion && ultimaAcumulacion.split('-').length === 3) {
    const [y, m, d] = ultimaAcumulacion.split('-').map(Number);
    ref = new Date(y, m - 1, d);
  } else if (ultimaAcumulacion && ultimaAcumulacion.split('-').length === 2) {
    const [y, m] = ultimaAcumulacion.split('-').map(Number);
    ref = new Date(y, m - 1, ingreso.getDate());
  } else {
    ref = new Date(ingreso);
  }

  let meses = 0;
  let cursor = new Date(ref);

  while (true) {
    let a = cursor.getFullYear();
    let m = cursor.getMonth() + 1;
    let d = ingreso.getDate();

    let temp = new Date(a, m, d);
    // Si el día no existe (ej. 31 de febrero), ajusta al último día del mes
    if (temp.getDate() !== d) temp = new Date(a, m + 1, 0);

    if (temp > hoy) break;

    meses++;
    cursor = temp;
  }
  return meses;
};
