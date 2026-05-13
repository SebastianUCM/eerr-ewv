/**
 * Proyecciones tipo CMF / forward-looking (heurísticas).
 * Patrimonio contable: coherente con Activos - Pasivos en el dashboard.
 */

/** Palabras clave para marcar filas sensibles al tipo de cambio (USD). */
const PATRON_USD = /(USD|US\$|DOLAR|DÓLAR|DOLARES|DÓLARES)/i;

export function cuentaEsUsdSensitive(c) {
  const n = String(c?.Nombre ?? "");
  const cod = String(c?.Codigo ?? "");
  return PATRON_USD.test(n) || PATRON_USD.test(cod);
}

/**
 * Factor macro mensual para IPC: si variacion_mensual_pct es null, usa 0.
 */
export function factorIpcMensual(ipcVariacionMensualPct) {
  const v = Number(ipcVariacionMensualPct);
  if (!Number.isFinite(v)) return 0;
  return v / 100;
}

/**
 * Proyección un saldo a un mes (M+1).
 * - factorCrecimientoOrg: fracción (ej. 0.02 = 2%)
 * - dolarSpot / dolarEscenario: solo aplica si esUsdSensitive.
 */
export function proyectarSaldoM1({
  saldo,
  factorIpc,
  factorCrecimientoOrg,
  esUsdSensitive,
  dolarSpot,
  dolarEscenario,
}) {
  const s = Number(saldo) || 0;
  let f = (1 + factorIpc) * (1 + factorCrecimientoOrg);
  if (esUsdSensitive && dolarSpot > 0 && dolarEscenario > 0) {
    f *= dolarEscenario / dolarSpot;
  }
  return s * f;
}

export function variacionPorcentual(actual, proyectado) {
  const a = Number(actual) || 0;
  if (a === 0) return proyectado === 0 ? 0 : null;
  return ((proyectado - a) / Math.abs(a)) * 100;
}

export function saldoEnUf(saldoClp, valorUf) {
  const uf = Number(valorUf);
  if (!uf || uf <= 0) return null;
  return (Number(saldo) || 0) / uf;
}

/**
 * Totales por tipo Softland (1 activo, 2 pasivo, 3 patrimonio).
 */
export function totalesPorTipo(cuentas) {
  let a = 0;
  let p = 0;
  let pat = 0;
  for (const c of cuentas) {
    const s = Number(c.Saldo_Actual ?? 0);
    const t = String(c.Tipo ?? "");
    if (t === "1") a += s;
    else if (t === "2") p += s;
    else if (t === "3") pat += s;
  }
  return {
    activos: a,
    pasivos: Math.abs(p),
    patrimonio: Math.abs(pat),
    capitalNeto: a - Math.abs(p),
  };
}
