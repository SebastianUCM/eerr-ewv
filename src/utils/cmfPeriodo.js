/**
 * Infiere año y "mes de periodo" desde id de snapshot:
 * - Trimestre CMF: 2025-Q1 → mes 3 (mar)
 * - Mensual: 2025-01 → mes 1 (ene)
 */
export function inferirCierreDesdeId(id) {
  if (!id || id === "live") return null;

  /** Quita sufijos -mov / -cie / -cierre / -sv / -ifrs para leer 2025-Q1 o 2025-01. */
  const baseId = String(id).replace(/-(mov|cie|cierre|sv|ifrs|cpb)$/i, "");

  const q = baseId.match(/^(\d{4})-Q([1-4])$/i);
  if (q) {
    const anio = parseInt(q[1], 10);
    const qi = parseInt(q[2], 10);
    const mesCierre = qi * 3; // Q1→3, Q2→6, Q3→9, Q4→12
    return { anio, mesCierre };
  }

  const m = baseId.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const anio = parseInt(m[1], 10);
    const mesCierre = parseInt(m[2], 10);
    if (mesCierre >= 1 && mesCierre <= 12) return { anio, mesCierre };
  }

  return null;
}

export function etiquetaMesCierre(m) {
  const map = {
    1: "Ene",
    2: "Feb",
    3: "Mar",
    4: "Abr",
    5: "May",
    6: "Jun",
    7: "Jul",
    8: "Ago",
    9: "Sep",
    10: "Oct",
    11: "Nov",
    12: "Dic",
  };
  return map[m] ?? String(m);
}
