/**
 * KPI Deuda (mapeo) / EBITDA para Dashboard de Activos.
 * Replica criterios de BalanceTributario (saldo cuenta + mapeo_deuda) y DashboardEERR (EBITDA),
 * sin acoplar componentes Vue.
 */

import eerrDataRaw from "../assets/datos_vue.json";
import planCuentasRaw from "../assets/plan_cuentas.json";
import mapeoCuentas from "../assets/config/mapeo_cuentas.json";
import mapeoDeuda from "../assets/config/mapeo_deuda.json";

const CATEGORIA_EXCLUIDA_EBITDA = "otros_gastos_financieros";

function normMes(v) {
  const n = Number(v);
  if (n >= 1 && n <= 12) return n;
  const x = parseInt(String(v || "").trim().replace(/^0+/, "") || "0", 10);
  return x >= 1 && x <= 12 ? x : 1;
}

function normAnio(v) {
  return Number(v);
}

function parsePeriodo(periodoKey) {
  const s = String(periodoKey || "").trim();
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) return { anio: new Date().getFullYear(), mes: 12 };
  return { anio: Number(m[1]), mes: Math.min(12, Math.max(1, Number(m[2]))) };
}

function codigosDeudaParaEmpresa(empresa) {
  const list = mapeoDeuda?.empresas?.[empresa]?.cuentas_deuda_total;
  if (!Array.isArray(list)) return new Set();
  return new Set(list.map((c) => String(c).trim()).filter(Boolean));
}

/**
 * EBITDA acumulado año calendario desde enero hasta mesHasta (misma fórmula que EERR).
 */
export function calcularEbitdaYtd(empresa, anio, mesHasta, tipoEerr = null) {
  const configEmpresa = mapeoCuentas?.empresas?.[empresa];
  if (!configEmpresa) return 0;
  const mapCuentas = configEmpresa.cuentas || {};

  let ebitda = 0;
  for (const d of eerrDataRaw) {
    if (String(d.Empresa).trim() !== String(empresa).trim()) continue;
    if (normAnio(d.Anio) !== Number(anio)) continue;
    const mes = normMes(d.Mes);
    if (mes > Number(mesHasta)) continue;

    const cod = String(d.CodigoCuenta ?? "").trim();
    if (!cod) continue;
    const cfg = mapCuentas[cod];
    if (!cfg) continue;
    if (tipoEerr) {
      const tiposCuenta = Array.isArray(cfg.eerr) ? cfg.eerr : ["financiero", "contable"];
      if (!tiposCuenta.includes(tipoEerr)) continue;
    }

    const categoria = cfg.categoria;
    const saldo = Number(d.SaldoNeto ?? 0);

    const esIngreso = categoria === "ingreso_explotacion" || categoria === "ingreso_financiero";
    const esOtrosGF = categoria === CATEGORIA_EXCLUIDA_EBITDA;
    const esGav = categoria === "gasto_adm_ventas";

    if (!esOtrosGF && (esIngreso || esGav)) {
      ebitda += saldo;
    }
  }
  return ebitda;
}

function construirArbolBalance(empresa, anio, mes, norma) {
  const datosEmpresa = eerrDataRaw.filter(
    (d) => String(d.Empresa).trim() === String(empresa).trim()
  );
  const planEmpresa = planCuentasRaw.filter(
    (c) => String(c.Empresa).trim() === String(empresa).trim()
  );

  const movsFiltrados = datosEmpresa.filter((d) => {
    const matchPeriodo = normAnio(d.Anio) === Number(anio) && normMes(d.Mes) <= Number(mes);
    const matchNorma = norma === "IFRS" ? d.NormaIFRS === "S" : d.NormaTrib === "S";
    return matchPeriodo && matchNorma;
  });

  const dict = {};

  planEmpresa.forEach((c) => {
    dict[c.CodigoCuenta] = {
      codigo: c.CodigoCuenta,
      nombre: String(c.NombreCuenta).trim(),
      nivel: Number(c.NivelCuenta) || 1,
      prefijo: c.CodigoCuenta.substring(0, Number(c.LongitudCodigo)),
      debitos: 0,
      creditos: 0,
      hijos: [],
      esHoja: true,
    };
  });

  movsFiltrados.forEach((m) => {
    if (!dict[m.CodigoCuenta]) {
      dict[m.CodigoCuenta] = {
        codigo: m.CodigoCuenta,
        nombre: String(m.NombreCuenta).trim(),
        nivel: 5,
        prefijo: m.CodigoCuenta,
        debitos: 0,
        creditos: 0,
        hijos: [],
        esHoja: true,
      };
    }
    dict[m.CodigoCuenta].debitos += m.TotalDebe;
    dict[m.CodigoCuenta].creditos += m.TotalHaber;
  });

  const nodosArray = Object.values(dict).sort((a, b) =>
    a.codigo.localeCompare(b.codigo, "es", { numeric: true })
  );
  const raices = [];

  nodosArray.forEach((nodo, index) => {
    let padreEncontrado = null;
    for (let i = index - 1; i >= 0; i--) {
      const candidato = nodosArray[i];
      if (candidato.nivel < nodo.nivel && nodo.codigo.startsWith(candidato.prefijo)) {
        padreEncontrado = candidato;
        break;
      }
    }
    if (padreEncontrado) {
      padreEncontrado.hijos.push(nodo);
      padreEncontrado.esHoja = false;
    } else {
      raices.push(nodo);
    }
  });

  const procesarNodo = (nodo) => {
    let sumDebe = nodo.debitos;
    let sumHaber = nodo.creditos;

    let sumSaldoDeudor = 0;
    let sumSaldoAcreedor = 0;
    let sumActivo = 0;
    let sumPasivo = 0;
    let sumPerdida = 0;
    let sumGanancia = 0;

    if (sumDebe > sumHaber) sumSaldoDeudor = sumDebe - sumHaber;
    if (sumHaber > sumDebe) sumSaldoAcreedor = sumHaber - sumDebe;

    const prefix = String(nodo.codigo).charAt(0);
    if (prefix === "1") {
      sumActivo = sumSaldoDeudor;
      sumPasivo = sumSaldoAcreedor;
    } else if (prefix === "2" || prefix === "3") {
      sumPasivo = sumSaldoAcreedor;
      sumActivo = sumSaldoDeudor;
    } else if (prefix === "4") {
      sumGanancia = sumSaldoAcreedor;
      sumPerdida = sumSaldoDeudor;
    } else if (prefix === "5") {
      sumPerdida = sumSaldoDeudor;
      sumGanancia = sumSaldoAcreedor;
    } else {
      sumGanancia = sumSaldoAcreedor;
      sumPerdida = sumSaldoDeudor;
    }

    nodo.hijos.forEach((hijo) => {
      const vals = procesarNodo(hijo);
      sumDebe += vals.debe;
      sumHaber += vals.haber;
      sumSaldoDeudor += vals.saldoDeudor;
      sumSaldoAcreedor += vals.saldoAcreedor;
      sumActivo += vals.activo;
      sumPasivo += vals.pasivo;
      sumPerdida += vals.perdida;
      sumGanancia += vals.ganancia;
    });

    let sumSaldoCuentas = 0;
    if (prefix === "1") {
      sumSaldoCuentas = sumActivo - sumPasivo - sumPerdida + sumGanancia;
    } else {
      sumSaldoCuentas = -sumActivo + sumPasivo - sumPerdida + sumGanancia;
    }

    Object.assign(nodo, {
      debitos: sumDebe,
      creditos: sumHaber,
      saldoDeudor: sumSaldoDeudor,
      saldoAcreedor: sumSaldoAcreedor,
      activo: sumActivo,
      pasivo: sumPasivo,
      perdida: sumPerdida,
      ganancia: sumGanancia,
      saldoCuentas: sumSaldoCuentas,
    });

    return {
      debe: sumDebe,
      haber: sumHaber,
      saldoDeudor: sumSaldoDeudor,
      saldoAcreedor: sumSaldoAcreedor,
      activo: sumActivo,
      pasivo: sumPasivo,
      perdida: sumPerdida,
      ganancia: sumGanancia,
      saldoCuentas: sumSaldoCuentas,
    };
  };

  raices.forEach((r) => procesarNodo(r));
  return raices;
}

function sumarSaldoCuentaMapeado(raices, codigosSet) {
  if (!codigosSet.size) return 0;
  let suma = 0;
  const walk = (nodos) => {
    for (const n of nodos) {
      if (codigosSet.has(String(n.codigo).trim())) {
        suma += Number(n.saldoCuentas) || 0;
      }
      if (n.hijos?.length) walk(n.hijos);
    }
  };
  walk(raices);
  return suma;
}

/**
 * @param {string} empresa
 * @param {string} periodoKey - "YYYY-MM" (ej. "2026-04")
 * @param {string} [norma='Trib'] - 'Trib' | 'IFRS' (misma convención que BalanceTributario)
 * @param {string|null} [tipoEerr=null] - 'financiero' | 'contable' (opcional)
 * @returns {{ ratio: number|null, deudaTotal: number, ebitda: number, tieneMapeoDeuda: boolean }}
 */
export function computeKpiDeudaSobreEbitda(empresa, periodoKey, norma = "Trib", tipoEerr = null) {
  const { anio, mes } = parsePeriodo(periodoKey);
  const codigos = codigosDeudaParaEmpresa(empresa);
  const tieneMapeoDeuda = codigos.size > 0;

  const raices = construirArbolBalance(empresa, anio, mes, norma);
  const deudaTotal = tieneMapeoDeuda ? sumarSaldoCuentaMapeado(raices, codigos) : 0;

  const ebitda = calcularEbitdaYtd(empresa, anio, mes, tipoEerr);

  let ratio = null;
  if (tieneMapeoDeuda && Number.isFinite(ebitda) && ebitda !== 0) {
    ratio = deudaTotal / ebitda;
    if (!Number.isFinite(ratio)) ratio = null;
  }

  return {
    ratio,
    deudaTotal,
    ebitda,
    tieneMapeoDeuda,
    anio,
    mes,
  };
}
