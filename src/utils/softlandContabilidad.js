/**
 * Modos de lectura alineados a extract_contabilidad / extract_contabilidad_snapshot.
 */
export const MODO_MOVIMIENTO = "movimiento_periodo";
export const MODO_SALDO_CIERRE = "saldo_hasta_fecha";

/** Orden al elegir snapshot automático si hay varios con mismo año/mes. */
export const ORDEN_FUENTE = {
  cwmovim: 0,
  cwmovim_cpb: 0,
  saldo_vista: 1,
  ifrs: 2,
};

/** Desde index.json o sufijo de id (2025-Q1-mov / 2025-Q1-cie / 2025-01-sv / 2025-01-ifrs). */
export function modoDesdeSnapshot(s) {
  if (!s || s.id === "live") return null;
  const m = s.modo_softland;
  if (m === MODO_MOVIMIENTO || m === MODO_SALDO_CIERRE) return m;
  const id = String(s.id);
  if (/-mov$/i.test(id)) return MODO_MOVIMIENTO;
  if (/-cie$/i.test(id) || /-cierre$/i.test(id)) return MODO_SALDO_CIERRE;
  if (/-cpb$/i.test(id)) return MODO_MOVIMIENTO;
  if (/-sv$/i.test(id) || /-ifrs$/i.test(id)) return MODO_SALDO_CIERRE;
  return MODO_MOVIMIENTO;
}

/** Norma: metadato del índice o inferido por sufijo -ifrs. */
export function normaDesdeSnapshot(s) {
  if (!s || s.id === "live") return "nch";
  const n = s.norma;
  if (n === "ifrs" || n === "nch") return n;
  if (/-ifrs$/i.test(String(s.id))) return "ifrs";
  return "nch";
}

/** Fuente SQL: índice o inferido por id/archivo. */
export function fuenteDesdeSnapshot(s) {
  if (!s || s.id === "live") return "cwmovim";
  const f = s.fuente_datos;
  if (
    f === "cwmovim" ||
    f === "cwmovim_cpb" ||
    f === "saldo_vista" ||
    f === "ifrs"
  )
    return f;
  const id = String(s.id);
  if (/-cpb$/i.test(id)) return "cwmovim_cpb";
  if (/-ifrs$/i.test(id)) return "ifrs";
  if (/-sv$/i.test(id)) return "saldo_vista";
  return "cwmovim";
}

export function etiquetaModo(modo) {
  if (modo === MODO_SALDO_CIERRE) return "Saldo a fecha (Softland)";
  return "Movimiento del periodo (Softland)";
}

export function etiquetaFuente(f) {
  const m = {
    cwmovim: "Movimientos (cwmovim)",
    cwmovim_cpb: "cwmovim por CpbAno/CpbMes",
    saldo_vista: "Vista saldos (CW_vsnpSaldoCuenta)",
    ifrs: "IFRS (vista o fallback)",
  };
  return m[f] ?? f;
}
