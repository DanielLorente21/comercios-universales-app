// ════════════════════════════════════════════════════════════════════════════
// calcularDias.js — Utilidad de cálculo de días hábiles
// ════════════════════════════════════════════════════════════════════════════
// Calcula días hábiles entre dos fechas (formato DD/MM/AAAA).
// Reglas: Domingo = 0, Sábado = 0.5, Festivo completo = 0,
//         Festivo medio día = 0.5, Día laborable = 1.
//
// ORDEN DE PRIORIDAD:
//   1. Domingo          → siempre 0, incluso si está marcado como festivo
//   2. Festivo completo → 0        (tiene prioridad sobre sábado=0.5)
//   3. Festivo medio    → 0.5      (sábado festivo medio = 0.5, igual que sábado normal)
//   4. Sábado normal    → 0.5
//   5. Día hábil        → 1
// ════════════════════════════════════════════════════════════════════════════

export const calcularDias = (fechaInicioStr, fechaFinStr, festivosMap = {}) => {
  if (!fechaInicioStr || !fechaFinStr) return 0;
  const parsear = (str) => {
    const [d, m, y] = str.split('/').map(Number);
    return new Date(y, m - 1, d);
  };
  const inicio = parsear(fechaInicioStr);
  const fin    = parsear(fechaFinStr);
  if (isNaN(inicio) || isNaN(fin) || fin < inicio) return 0;
  let total = 0;
  const cursor = new Date(inicio);
  while (cursor <= fin) {
    const dow = cursor.getDay();
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`;
    const tipoFestivo = festivosMap[key]; // 'completo' | 'medio' | undefined

    if (dow === 0) {
      // Domingo → 0
    } else if (tipoFestivo === 'completo') {
      // Festivo día completo → no descuenta
    } else if (tipoFestivo === 'medio') {
      // Festivo medio día → descuenta 0.5
      total += 0.5;
    } else if (dow === 6) {
      // Sábado sin festivo → 0.5
      total += 0.5;
    } else {
      // Día laborable normal → 1
      total += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
};