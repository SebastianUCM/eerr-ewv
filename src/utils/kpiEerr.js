/**
 * KPIs EERR y balance alineados con DashboardEERR / IndicadoresEERRAnual.
 */

import mapeoDeuda from "../assets/config/mapeo_deuda.json";
import { computeKpiDeudaSobreEbitda } from "./kpiActivosDeudaEbitda.js";

export function normAnio(v) {
  return Number(v);
}

export function normMes(v) {
  const n = Number(v);
  if (n >= 1 && n <= 12) return n;
  const x = parseInt(String(v || "").trim().replace(/^0+/, "") || "0", 10);
  return x >= 1 && x <= 12 ? x : 1;
}

/**
 * Filas EERR mapeadas para un año y tipo (misma lógica que mapearDatosAnio en componentes).
 */
export function mapearDatosAnioEerr(empresa, anioObjetivo, tipoEerr, datosEmpresa, mapeoCuentas) {
  const configEmpresa = mapeoCuentas?.empresas?.[empresa];
  if (!configEmpresa) return [];
  const mapCuentas = configEmpresa.cuentas || {};
  const rows = [];

  for (const d of datosEmpresa) {
    if (normAnio(d.Anio) !== Number(anioObjetivo)) continue;
    const cod = String(d.CodigoCuenta ?? "").trim();
    if (!cod) continue;
    const cfg = mapCuentas[cod];
    if (!cfg) continue;
    const tiposCuenta = Array.isArray(cfg.eerr) ? cfg.eerr : ["financiero", "contable"];
    if (!tiposCuenta.includes(tipoEerr)) continue;

    rows.push({
      ...d,
      Categoria: cfg.categoria,
      Subitem: cfg.subitem,
      Mes: normMes(d.Mes),
      SaldoNeto: Number(d.SaldoNeto ?? 0),
    });
  }
  return rows;
}

/** Solo filas cuyo Mes esté entre mesDesde y mesHasta (inclusive). */
export function filtrarFilasPorRangoMes(rows, mesDesde, mesHasta) {
  const a = Math.min(mesDesde, mesHasta);
  const b = Math.max(mesDesde, mesHasta);
  return rows.filter((d) => d.Mes >= a && d.Mes <= b);
}

export function calcularKpisDesdeRows(rows) {
  let ingresos = 0;
  let gastos = 0;
  let resultado = 0;
  let ingresosFinancieros = 0;
  let contribuciones = 0;
  let patenteMunicipal = 0;
  let ingresoExplotacion = 0;
  let gastoAdmVentas = 0;
  let remuneraciones = 0;
  let ebitda = 0;

  rows.forEach((d) => {
    resultado += d.SaldoNeto;
    if (d.Categoria === "ingreso_explotacion" || d.Categoria === "ingreso_financiero") {
      ingresos += d.SaldoNeto;
    } else {
      gastos += d.SaldoNeto;
    }

    if (d.Categoria === "ingreso_financiero") ingresosFinancieros += d.SaldoNeto;
    if (d.Subitem === "impuestos_y_contribuciones") contribuciones += d.SaldoNeto;
    if (d.Subitem === "patentes") patenteMunicipal += d.SaldoNeto;
    if (d.Categoria === "ingreso_explotacion") ingresoExplotacion += d.SaldoNeto;
    if (d.Categoria === "gasto_adm_ventas") gastoAdmVentas += d.SaldoNeto;
    if (d.Subitem === "remuneraciones") remuneraciones += d.SaldoNeto;

    const paraEbitda =
      d.Categoria === "ingreso_explotacion" ||
      d.Categoria === "ingreso_financiero" ||
      d.Categoria === "gasto_adm_ventas";
    if (paraEbitda) ebitda += d.SaldoNeto;
  });

  const margenBruto = ingresoExplotacion + (gastoAdmVentas - remuneraciones);

  return {
    ingresos,
    gastos,
    ebitda,
    resultado,
    margenBruto,
    contribuciones,
    patenteMunicipal,
    ingresosFinancieros,
  };
}

function codigoNormalizado(codigoCuenta) {
  return String(codigoCuenta || "").replace(/[^0-9]/g, "");
}

function obtenerSetsDeudaEmpresa(empresa) {
  const cfgEmpresa = mapeoDeuda?.empresas?.[empresa] || {};
  const totalSet = new Set((cfgEmpresa.cuentas_deuda_total || []).map((c) => codigoNormalizado(c)));
  const cpSet = new Set((cfgEmpresa.cuentas_deuda_cp || []).map((c) => codigoNormalizado(c)));
  const lpSet = new Set((cfgEmpresa.cuentas_deuda_lp || []).map((c) => codigoNormalizado(c)));
  return { totalSet, cpSet, lpSet };
}

/**
 * KPIs de balance a corte (movimientos acumulados hasta mesCorte, misma idea que árbol balance en kpiActivosDeudaEbitda).
 */
export function calcularKpisBalanceCorte(empresa, anio, mesCorte, norma, tipoEerr, datosEmpresa) {
  const rows = datosEmpresa.filter((d) => {
    if (normAnio(d.Anio) !== Number(anio)) return false;
    if (normMes(d.Mes) > Number(mesCorte)) return false;
    return norma === "IFRS" ? d.NormaIFRS === "S" : d.NormaTrib === "S";
  });

  let activoTotal = 0;
  let pasivoTotal = 0;
  let patrimonioTotal = 0;
  let activoCorriente = 0;
  let pasivoCorriente = 0;
  let deudaCortoPlazo = 0;
  let deudaLargoPlazo = 0;
  const { totalSet: deudaCodigos, cpSet: deudaCpCodigos, lpSet: deudaLpCodigos } = obtenerSetsDeudaEmpresa(empresa);
  const usarClasificacionExplicita = deudaCpCodigos.size > 0 || deudaLpCodigos.size > 0;

  rows.forEach((d) => {
    const saldo = Number(d.SaldoNeto || 0);
    const cod = codigoNormalizado(d.CodigoCuenta);
    const pref1 = cod.charAt(0);
    const pref2 = cod.slice(0, 2);

    if (pref1 === "1") activoTotal += saldo;
    if (pref1 === "2") pasivoTotal += Math.abs(saldo);
    if (pref1 === "3") patrimonioTotal += Math.abs(saldo);
    if (pref2 === "11") activoCorriente += saldo;
    if (pref2 === "21") pasivoCorriente += Math.abs(saldo);
    if (deudaCodigos.has(cod)) {
      if (usarClasificacionExplicita) {
        if (deudaCpCodigos.has(cod)) deudaCortoPlazo += Math.abs(saldo);
        else if (deudaLpCodigos.has(cod)) deudaLargoPlazo += Math.abs(saldo);
      } else {
        if (pref2 === "21") deudaCortoPlazo += Math.abs(saldo);
        else if (pref2 === "22") deudaLargoPlazo += Math.abs(saldo);
        else deudaLargoPlazo += Math.abs(saldo);
      }
    }
  });

  const liquidezCorriente = pasivoCorriente > 0 ? activoCorriente / pasivoCorriente : null;
  const endeudamiento = patrimonioTotal > 0 ? pasivoTotal / patrimonioTotal : null;
  const mesStr = String(mesCorte).padStart(2, "0");
  const deudaKpi = computeKpiDeudaSobreEbitda(empresa, `${anio}-${mesStr}`, norma, tipoEerr);

  return {
    activoTotalBalance: activoTotal,
    pasivoTotalBalance: pasivoTotal,
    patrimonioTotalBalance: patrimonioTotal,
    activoCorrienteBalance: activoCorriente,
    pasivoCorrienteBalance: pasivoCorriente,
    deudaTotalBalance: Number(deudaKpi?.deudaTotal || 0),
    deudaCortoPlazoBalance: deudaCortoPlazo,
    deudaLargoPlazoBalance: deudaLargoPlazo,
    ratioDeudaEbitda: Number.isFinite(deudaKpi?.ratio) ? deudaKpi.ratio : null,
    liquidezCorriente,
    endeudamiento,
  };
}

/** Totales por categoría EERR y por mes (1–12) para export tabular. */
export function totalesPorCategoriaYMes(rows) {
  const map = new Map();
  rows.forEach((d) => {
    const cat = d.Categoria || "sin_categoria";
    if (!map.has(cat)) {
      map.set(cat, { categoria: cat, mensual: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, 0])), total: 0 });
    }
    const o = map.get(cat);
    o.mensual[d.Mes] = (o.mensual[d.Mes] || 0) + d.SaldoNeto;
    o.total += d.SaldoNeto;
  });
  return Array.from(map.values()).sort((a, b) => a.categoria.localeCompare(b.categoria));
}

export function variacionPct(actual, anterior, compararAbs = false) {
  if (actual === null || anterior === null) return null;
  const actualNorm = compararAbs ? Math.abs(actual) : actual;
  const anteriorNorm = compararAbs ? Math.abs(anterior) : anterior;
  if (!Number.isFinite(anteriorNorm) || anteriorNorm === 0) return null;
  return ((actualNorm - anteriorNorm) / Math.abs(anteriorNorm)) * 100;
}
