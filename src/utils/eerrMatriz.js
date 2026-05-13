import mapeoCuentasAsset from "../assets/config/mapeo_cuentas.json";

/** Misma definición que en DashboardEERR. */
export const BLOQUES_FINANCIEROS = [
  { key: "ingreso_explotacion", label: "Ingresos de Explotación", colorHeader: "bg-emerald-200 border-emerald-400" },
  { key: "ingreso_financiero", label: "Ingresos Financieros", colorHeader: "bg-cyan-200 border-cyan-400" },
  { key: "gasto_adm_ventas", label: "Gastos de Administración y Ventas", colorHeader: "bg-amber-200 border-amber-400" },
  { key: "otros_gastos_financieros", label: "Otros Gastos Financieros", colorHeader: "bg-violet-200 border-violet-400" },
];

function ordenSubitemsParaEmpresa(empresa, mapeoCuentas = mapeoCuentasAsset) {
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
 * Construye la matriz en cascada (categoría → subítem → cuenta → centro) a partir de filas ya mapeadas (mapearDatosAnioEerr).
 */
export function construirMatrizContableEerr(rows, empresa, mapeoCuentas = mapeoCuentasAsset) {
  const ordenSubitems = ordenSubitemsParaEmpresa(empresa, mapeoCuentas);
  const mapaCategorias = new Map();

  BLOQUES_FINANCIEROS.forEach((bloque) => {
    mapaCategorias.set(bloque.key, {
      key: bloque.key,
      config: bloque,
      mensual: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 },
      total: 0,
      subitemsMap: new Map(),
    });
  });

  rows.forEach((d) => {
    const catKey = mapaCategorias.has(d.Categoria) ? d.Categoria : "otros_resultados";
    const categoria = mapaCategorias.get(catKey);
    if (!categoria) return;

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

/** Mapa path → total anual para cruzar varias empresas. */
export function totalesPlanosPorNivel(matriz) {
  const m = new Map();
  for (const g of matriz) {
    m.set(`g:${g.key}`, Number(g.total) || 0);
    for (const s of g.subitems) {
      m.set(`s:${g.key}:${s.key}`, Number(s.total) || 0);
      for (const c of s.cuentas) {
        m.set(`c:${g.key}:${s.key}:${c.key}`, Number(c.total) || 0);
        for (const cc of c.centros) {
          m.set(`cc:${g.key}:${s.key}:${c.key}:${cc.key}`, Number(cc.total) || 0);
        }
      }
    }
  }
  return m;
}

/**
 * Une la estructura (keys) de varias matrices ya construidas.
 * @param matrices Array de matrices (salida de construirMatrizContableEerr).
 * @param empresaOrdenRef Empresa para desempatar orden de subítems según mapeo_cuentas.
 */
export function mergeEstructuraMatrices(matrices, empresaOrdenRef = "") {
  if (!matrices?.length) return [];
  const mapaCategorias = new Map();

  for (const grupos of matrices) {
    for (const g of grupos) {
      if (!mapaCategorias.has(g.key)) {
        mapaCategorias.set(g.key, {
          key: g.key,
          config: g.config,
          mensual: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 },
          total: 0,
          subitemsMap: new Map(),
        });
      }
      const mg = mapaCategorias.get(g.key);
      for (const sub of g.subitems) {
        if (!mg.subitemsMap.has(sub.key)) {
          mg.subitemsMap.set(sub.key, {
            key: sub.key,
            nombreOriginal: sub.nombreOriginal,
            mensual: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 },
            total: 0,
            cuentasMap: new Map(),
          });
        }
        const ms = mg.subitemsMap.get(sub.key);
        for (const cta of sub.cuentas) {
          if (!ms.cuentasMap.has(cta.key)) {
            ms.cuentasMap.set(cta.key, {
              key: cta.key,
              codigo: cta.codigo,
              nombre: cta.nombre,
              mensual: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 },
              total: 0,
              centrosMap: new Map(),
            });
          }
          const mc = ms.cuentasMap.get(cta.key);
          for (const cc of cta.centros) {
            if (!mc.centrosMap.has(cc.key)) {
              mc.centrosMap.set(cc.key, {
                key: cc.key,
                codigo: cc.codigo,
                nombre: cc.nombre,
                mensual: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 },
                total: 0,
              });
            }
          }
        }
      }
    }
  }

  const refOrden = ordenSubitemsParaEmpresa(empresaOrdenRef, mapeoCuentasAsset);

  return Array.from(mapaCategorias.values())
    .filter((cat) => BLOQUES_FINANCIEROS.some((b) => b.key === cat.key))
    .sort((a, b) => {
      const ia = BLOQUES_FINANCIEROS.findIndex((x) => x.key === a.key);
      const ib = BLOQUES_FINANCIEROS.findIndex((x) => x.key === b.key);
      return ia - ib;
    })
    .map((cat) => ({
      ...cat,
      subitems: Array.from(cat.subitemsMap.values())
        .sort((sa, sb) => {
          const ordA = refOrden[sa.nombreOriginal] ?? 9999;
          const ordB = refOrden[sb.nombreOriginal] ?? 9999;
          if (ordA !== ordB) return ordA - ordB;
          return sa.nombreOriginal.localeCompare(sb.nombreOriginal);
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
