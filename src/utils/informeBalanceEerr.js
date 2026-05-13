/**
 * Matriz EERR anual (misma estructura que DashboardEERR) y filas de balance
 * tipo BalanceTributario, totalmente expandidas para PDF/informes.
 */

import { mapearDatosAnioEerr, normAnio, normMes } from "./kpiEerr.js";

const BLOQUES_FINANCIEROS = [
  { key: "ingreso_explotacion", label: "Ingresos de Explotación" },
  { key: "ingreso_financiero", label: "Ingresos Financieros" },
  { key: "gasto_adm_ventas", label: "Gastos de Administración y Ventas" },
  { key: "otros_gastos_financieros", label: "Otros Gastos Financieros" },
];

function ordenSubitemsDesdeMapeo(empresa, mapeoCuentas) {
  const dict = {};
  const configEmpresa = mapeoCuentas?.empresas?.[empresa] || {};
  const cuentas = configEmpresa.cuentas || {};
  Object.values(cuentas).forEach((c) => {
    const sub = c.subitem || "sin_subitem";
    const ord = Number(c.orden ?? 9999);
    if (!(sub in dict) || ord < dict[sub]) dict[sub] = ord;
  });
  return dict;
}

/**
 * Matriz EERR completa (12 meses + jerarquía categoría → subítem → cuenta → centro).
 * Usa el año completo y el tipo EERR indicado (no filtra por rango de meses).
 */
export function buildMatrizEerrCompleta(empresa, anio, tipoEerr, datosEmpresa, mapeoCuentas) {
  const rows = mapearDatosAnioEerr(empresa, anio, tipoEerr, datosEmpresa, mapeoCuentas);
  const ordenSubitems = ordenSubitemsDesdeMapeo(empresa, mapeoCuentas);

  const mapaCategorias = new Map();
  BLOQUES_FINANCIEROS.forEach((bloque) => {
    mapaCategorias.set(bloque.key, {
      key: bloque.key,
      label: bloque.label,
      mensual: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 },
      total: 0,
      subitemsMap: new Map(),
    });
  });

  rows.forEach((d) => {
    const catKey = mapaCategorias.has(d.Categoria) ? d.Categoria : "otros_resultados";
    if (!mapaCategorias.has(catKey)) {
      mapaCategorias.set(catKey, {
        key: catKey,
        label: String(catKey).replace(/_/g, " "),
        mensual: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 },
        total: 0,
        subitemsMap: new Map(),
      });
    }
    const categoria = mapaCategorias.get(catKey);
    const subKey = d.Subitem || "sin_subitem";
    if (!categoria.subitemsMap.has(subKey)) {
      categoria.subitemsMap.set(subKey, {
        key: `${catKey}-${subKey}`,
        nombreOriginal: subKey,
        mensual: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 },
        total: 0,
        cuentasMap: new Map(),
      });
    }
    const subitem = categoria.subitemsMap.get(subKey);
    const ctaKey = d.CodigoCuenta;
    if (!subitem.cuentasMap.has(ctaKey)) {
      subitem.cuentasMap.set(ctaKey, {
        key: ctaKey,
        codigo: ctaKey,
        nombre: d.NombreCuenta || d.Cuenta || "Sin Nombre",
        mensual: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 },
        total: 0,
        centrosMap: new Map(),
      });
    }
    const cuenta = subitem.cuentasMap.get(ctaKey);
    const ccKey = d.CodigoCentroCosto || "000";
    if (!cuenta.centrosMap.has(ccKey)) {
      cuenta.centrosMap.set(ccKey, {
        key: ccKey,
        codigo: ccKey,
        nombre: d.CentroCosto || "Sin Centro de Costo",
        mensual: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 },
        total: 0,
      });
    }
    const centro = cuenta.centrosMap.get(ccKey);
    const monto = d.SaldoNeto || 0;
    const mes = d.Mes;
    categoria.mensual[mes] += monto;
    categoria.total += monto;
    subitem.mensual[mes] += monto;
    subitem.total += monto;
    cuenta.mensual[mes] += monto;
    cuenta.total += monto;
    centro.mensual[mes] += monto;
    centro.total += monto;
  });

  return Array.from(mapaCategorias.values())
    .filter((cat) => cat.total !== 0 || Object.values(cat.mensual).some((v) => v !== 0))
    .map((cat) => ({
      ...cat,
      subitems: Array.from(cat.subitemsMap.values())
        .sort((a, b) => {
          const ordA = ordenSubitems[a.nombreOriginal] ?? 9999;
          const ordB = ordenSubitems[b.nombreOriginal] ?? 9999;
          if (ordA !== ordB) return ordA - ordB;
          return a.nombreOriginal.localeCompare(b.nombreOriginal);
        })
        .map((sub) => ({
          ...sub,
          cuentas: Array.from(sub.cuentasMap.values())
            .sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }))
            .map((cta) => ({
              ...cta,
              centros: Array.from(cta.centrosMap.values()).sort((a, b) =>
                a.codigo.localeCompare(b.codigo, "es", { numeric: true })
              ),
            })),
        })),
    }));
}

/** Construye árbol de balance y totales (lógica alineada con BalanceTributario.vue). */
export function buildArbolBalanceTributario(empresa, anio, mesCorte, norma, datosEmpresa, planEmpresa) {
  const movsFiltrados = datosEmpresa.filter((d) => {
    const matchPeriodo = normAnio(d.Anio) === Number(anio) && normMes(d.Mes) <= Number(mesCorte);
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

  const nodosArray = Object.values(dict).sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }));
  const raices = [];

  nodosArray.forEach((nodo, index) => {
    let padreEncontrado = null;
    for (let i = index - 1; i >= 0; i -= 1) {
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

  const totalesGlobales = {
    debitos: 0,
    creditos: 0,
    saldoDeudor: 0,
    saldoAcreedor: 0,
    activo: 0,
    pasivo: 0,
    perdida: 0,
    ganancia: 0,
    saldoCuentas: 0,
  };
  raices.forEach((r) => {
    totalesGlobales.debitos += r.debitos;
    totalesGlobales.creditos += r.creditos;
    totalesGlobales.saldoDeudor += r.saldoDeudor;
    totalesGlobales.saldoAcreedor += r.saldoAcreedor;
    totalesGlobales.activo += r.activo;
    totalesGlobales.pasivo += r.pasivo;
    totalesGlobales.perdida += r.perdida;
    totalesGlobales.ganancia += r.ganancia;
    totalesGlobales.saldoCuentas += r.saldoCuentas;
  });

  const resultadoEjercicio = totalesGlobales.ganancia - totalesGlobales.perdida;

  return { raices, totalesGlobales, resultadoEjercicio };
}

/** Filas visibles con todas las ramas expandidas (misma regla que Balance con “expandir todo”). */
export function filasBalanceExpandidas(raices) {
  const filasAbiertas = {};
  const marcar = (nodos) => {
    nodos.forEach((n) => {
      if (!n.esHoja) filasAbiertas[n.codigo] = true;
      if (n.hijos?.length) marcar(n.hijos);
    });
  };
  marcar(raices);

  const result = [];
  const recorrer = (nodo, esVisible) => {
    if (nodo.debitos === 0 && nodo.creditos === 0) return;
    if (esVisible) result.push(nodo);
    const hijosVisibles = esVisible && filasAbiertas[nodo.codigo];
    nodo.hijos
      .sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }))
      .forEach((h) => recorrer(h, hijosVisibles));
  };

  raices
    .sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }))
    .forEach((r) => recorrer(r, true));

  return result;
}

export function buildFilasBalanceInforme(empresa, anio, mesCorte, norma, eerrDataRaw, planCuentasRaw) {
  const datosEmpresa = eerrDataRaw.filter((d) => String(d.Empresa).trim() === String(empresa).trim());
  const planEmpresa = planCuentasRaw.filter((c) => c.Empresa === empresa);
  const { raices, totalesGlobales, resultadoEjercicio } = buildArbolBalanceTributario(
    empresa,
    anio,
    mesCorte,
    norma,
    datosEmpresa,
    planEmpresa
  );
  const filas = filasBalanceExpandidas(raices);
  return { filas, totalesGlobales, resultadoEjercicio };
}
