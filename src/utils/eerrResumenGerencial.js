import comparativoGerencialDefault from "../assets/config/comparativo_gerencial.json";
import { mapearDatosAnioEerr, filtrarFilasPorRangoMes, normAnio, normMes } from "./kpiEerr.js";

function normTexto(v) {
  return String(v || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function obtenerFilasConfig(config) {
  return config?.filas || config?.columnas || [];
}

function normCodigo(v) {
  return String(v ?? "").trim();
}

function normCentro(v) {
  const c = normCodigo(v);
  return c || "000";
}

function dedupeAsignaciones(lista) {
  const seen = new Set();
  const out = [];
  for (const item of lista || []) {
    const cuenta = normCodigo(item.cuenta);
    if (!cuenta) continue;
    const centro = normCentro(item.centro);
    const key = `${cuenta}|${centro}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...item, cuenta, centro });
  }
  return out;
}

/** Asignaciones cuenta+CC: regla.asignaciones + asignaciones_por_fila + override por empresa. */
function obtenerAsignacionesParaEmpresa(regla, empresa, config) {
  const override = config?.empresas?.[empresa]?.[regla.key];
  if (override?.asignaciones?.length) {
    return dedupeAsignaciones(override.asignaciones);
  }

  const base = [...(regla.asignaciones || []), ...(config?.asignaciones_por_fila?.[regla.key] || [])];
  const emp = String(empresa ?? "").trim();

  return dedupeAsignaciones(
    base.filter((a) => {
      const ae = String(a.empresa ?? "").trim();
      return !ae || ae === emp;
    })
  );
}

function filaCoincideAsignacion(row, asignacion) {
  return (
    normCodigo(row.CodigoCuenta) === normCodigo(asignacion.cuenta) &&
    normCentro(row.CodigoCentroCosto) === normCentro(asignacion.centro)
  );
}

function filaCoincideAlgunaAsignacion(row, asignaciones) {
  return asignaciones.some((a) => filaCoincideAsignacion(row, a));
}

function sumarCuentaCentroEmpresa(datosEmpresa, anio, mesDesde, mesHasta, regla, empresa, config) {
  const asignaciones = obtenerAsignacionesParaEmpresa(regla, empresa, config);
  if (!asignaciones.length) return 0;

  const { desde, hasta } = rangoMesesRegla(regla, mesDesde, mesHasta);
  let total = 0;

  for (const row of datosEmpresa || []) {
    if (normAnio(row.Anio) !== Number(anio)) continue;
    const mes = normMes(row.Mes);
    if (mes < desde || mes > hasta) continue;
    if (!filaCoincideAlgunaAsignacion(row, asignaciones)) continue;
    total += Number(row.SaldoNeto ?? 0);
  }

  return total;
}

function filasDetalleCuentaCentro(datosEmpresa, anio, mesDesde, mesHasta, regla, empresa, config) {
  const asignaciones = obtenerAsignacionesParaEmpresa(regla, empresa, config);
  if (!asignaciones.length) return [];

  const { desde, hasta } = rangoMesesRegla(regla, mesDesde, mesHasta);
  const porPar = new Map();

  for (const row of datosEmpresa || []) {
    if (normAnio(row.Anio) !== Number(anio)) continue;
    const mes = normMes(row.Mes);
    if (mes < desde || mes > hasta) continue;
    if (!filaCoincideAlgunaAsignacion(row, asignaciones)) continue;

    const det = normalizarFilaDetalle(row);
    const parKey = `${det.CodigoCuenta}|${det.CodigoCentroCosto}`;
    if (!porPar.has(parKey)) {
      porPar.set(parKey, { ...det, SaldoNeto: 0 });
    }
    const acc = porPar.get(parKey);
    acc.SaldoNeto += det.SaldoNeto;
    if (!acc.NombreCuenta || acc.NombreCuenta === "Sin Nombre") {
      acc.NombreCuenta = det.NombreCuenta;
    }
    if (!acc.CentroCosto || acc.CentroCosto === "Sin Centro de Costo") {
      acc.CentroCosto = det.CentroCosto;
    }
  }

  for (const a of asignaciones) {
    const cuenta = normCodigo(a.cuenta);
    const centro = normCentro(a.centro);
    const parKey = `${cuenta}|${centro}`;
    if (!porPar.has(parKey)) {
      porPar.set(parKey, {
        CodigoCuenta: cuenta,
        NombreCuenta: a.nota || cuenta,
        CodigoCentroCosto: centro,
        CentroCosto: a.nombre_centro || (centro === "000" ? "Sin Centro de Costo" : centro),
        SaldoNeto: 0,
      });
    }
  }

  return Array.from(porPar.values());
}

function cuentasConfiguradasParaFila(filaKey, config) {
  return (config?.columnas_cuentas || []).filter((c) => c.fila === filaKey);
}

function codigoCuentaParaEmpresa(col, empresa, config) {
  const override = config?.empresas?.[empresa]?.[col.key]?.codigo;
  if (override) return String(override).trim();
  if (col.codigos_por_empresa?.[empresa]) return String(col.codigos_por_empresa[empresa]).trim();
  return String(col.codigo ?? "").trim();
}

function sumarCodigoCuentaRaw(datosEmpresa, anio, mesDesde, mesHasta, codigo) {
  if (!codigo) return 0;
  let total = 0;
  for (const row of datosEmpresa) {
    if (normAnio(row.Anio) !== Number(anio)) continue;
    const mes = normMes(row.Mes);
    if (mes < mesDesde || mes > mesHasta) continue;
    if (String(row.CodigoCuenta ?? "").trim() !== codigo) continue;
    total += Number(row.SaldoNeto ?? 0);
  }
  return total;
}

function sumarCuentasConfiguradasEmpresa(filaKey, empresa, datosEmpresa, anio, mesDesde, mesHasta, config, modoCorte) {
  const cols = cuentasConfiguradasParaFila(filaKey, config);
  if (!cols.length) return null;

  const desde = modoCorte ? 1 : mesDesde;
  let total = 0;
  for (const col of cols) {
    const codigo = codigoCuentaParaEmpresa(col, empresa, config);
    total += sumarCodigoCuentaRaw(datosEmpresa, anio, desde, mesHasta, codigo);
  }
  return total;
}

function filaMappedCoincide(row, regla) {
  if (regla.categoria && row.Categoria !== regla.categoria) return false;

  if (regla.subitems?.length && !regla.subitems.includes(row.Subitem)) return false;

  const nombre = normTexto(row.NombreCuenta);
  const centro = normTexto(row.CentroCosto);
  const codCentro = String(row.CodigoCentroCosto ?? "").trim();

  const excluir = (regla.excluir_patrones_nombre || []).map(normTexto);
  if (excluir.some((p) => p && nombre.includes(p))) return false;

  const patronesNombre = (regla.patrones_nombre || []).map(normTexto);
  if (patronesNombre.length && !patronesNombre.some((p) => p && nombre.includes(p))) return false;

  const patronesCentro = (regla.patrones_centro || []).map(normTexto);
  if (patronesCentro.length && !patronesCentro.some((p) => p && centro.includes(p))) return false;

  if (regla.codigos_centro?.length && !regla.codigos_centro.includes(codCentro)) return false;

  if (patronesNombre.length || patronesCentro.length || regla.codigos_centro?.length) return true;

  if (!regla.subitems?.length && !regla.categoria) return false;

  return true;
}

function cuentaCoincideRegla(row, regla, override) {
  const cod = String(row?.CodigoCuenta ?? "").trim();
  const nombre = normTexto(row?.NombreCuenta);
  const cuentas = override?.cuentas?.length ? override.cuentas : regla.cuentas_default || [];
  const prefijos = regla.prefijos_cuenta || [];
  const patrones = (regla.patrones_nombre || []).map(normTexto);
  const excluir = (regla.excluir_patrones_nombre || []).map(normTexto);

  if (excluir.some((p) => p && nombre.includes(p))) return false;
  if (cuentas.includes(cod)) return true;

  const prefijoOk = prefijos.some((p) => cod.startsWith(p));
  if (prefijoOk) {
    if (!patrones.length) return true;
    return patrones.some((p) => p && nombre.includes(p));
  }

  if (patrones.length) return patrones.some((p) => p && nombre.includes(p));
  return false;
}

function sumarReglaRaw(datosEmpresa, anio, mesDesde, mesHasta, regla, override) {
  let total = 0;
  for (const row of datosEmpresa) {
    if (normAnio(row.Anio) !== Number(anio)) continue;
    const mes = normMes(row.Mes);
    if (mes < mesDesde || mes > mesHasta) continue;
    if (!cuentaCoincideRegla(row, regla, override)) continue;
    total += Number(row.SaldoNeto ?? 0);
  }
  return total;
}

function rangoMesesRegla(regla, mesDesde, mesHasta) {
  if (regla.modo_valor === "corte" || regla.tipo === "corte_cuentas") {
    return { desde: 1, hasta: mesHasta };
  }
  return { desde: mesDesde, hasta: mesHasta };
}

function filaCoincideRangoMes(row, anio, mesDesde, mesHasta, regla) {
  if (normAnio(row.Anio) !== Number(anio)) return false;
  const mes = normMes(row.Mes);
  const { desde, hasta } = rangoMesesRegla(regla, mesDesde, mesHasta);
  return mes >= desde && mes <= hasta;
}

function normalizarFilaDetalle(row) {
  return {
    CodigoCuenta: String(row.CodigoCuenta ?? "").trim(),
    NombreCuenta: String(row.NombreCuenta || row.Cuenta || "Sin Nombre").trim(),
    CodigoCentroCosto: String(row.CodigoCentroCosto ?? "000").trim() || "000",
    CentroCosto: String(row.CentroCosto || "Sin Centro de Costo").trim(),
    SaldoNeto: Number(row.SaldoNeto ?? 0),
  };
}

function obtenerFilasDetalleEmpresa(regla, empresa, mappedRows, datosEmpresa, anio, mesDesde, mesHasta, config) {
  const override = config?.empresas?.[empresa]?.[regla.key];

  switch (regla.tipo) {
    case "rango_mapeado_categoria":
      return mappedRows
        .filter((r) => r.Categoria === regla.categoria)
        .map(normalizarFilaDetalle);

    case "rango_mapeado_subitems":
      return mappedRows
        .filter((r) => (regla.subitems || []).includes(r.Subitem))
        .map(normalizarFilaDetalle);

    case "rango_mapeado_filtrado":
      return mappedRows.filter((r) => filaMappedCoincide(r, regla)).map(normalizarFilaDetalle);

    case "resultado_antes_impuestos": {
      const excluir = new Set(regla.excluir_subitems || []);
      return mappedRows.filter((r) => !excluir.has(r.Subitem)).map(normalizarFilaDetalle);
    }

    case "resultado_eerr_total":
      return mappedRows.map(normalizarFilaDetalle);

    case "rango_cuentas":
      return (datosEmpresa || [])
        .filter((row) => {
          if (!filaCoincideRangoMes(row, anio, mesDesde, mesHasta, regla)) return false;
          return cuentaCoincideRegla(row, regla, override);
        })
        .map(normalizarFilaDetalle);

    case "corte_cuentas": {
      const porCuentas = cuentasConfiguradasParaFila(regla.key, config);
      if (porCuentas.length) {
        const codigos = porCuentas
          .map((col) => codigoCuentaParaEmpresa(col, empresa, config))
          .filter(Boolean);
        return (datosEmpresa || [])
          .filter((row) => {
            if (!filaCoincideRangoMes(row, anio, mesDesde, mesHasta, regla)) return false;
            return codigos.includes(String(row.CodigoCuenta ?? "").trim());
          })
          .map(normalizarFilaDetalle);
      }
      return (datosEmpresa || [])
        .filter((row) => {
          if (!filaCoincideRangoMes(row, anio, mesDesde, mesHasta, regla)) return false;
          return cuentaCoincideRegla(row, regla, override);
        })
        .map(normalizarFilaDetalle);
    }

    case "cuenta_centro":
      return filasDetalleCuentaCentro(
        datosEmpresa,
        anio,
        mesDesde,
        mesHasta,
        regla,
        empresa,
        config
      );

    default:
      return [];
  }
}

function agruparCuentasGerencial(empresas, filasPorEmpresa, { incluirCeros = false } = {}) {
  const cuentasMap = new Map();

  for (const empresa of empresas) {
    for (const row of filasPorEmpresa[empresa] || []) {
      const cod = String(row.CodigoCuenta ?? "").trim();
      const ctaKey = cod || normTexto(row.NombreCuenta);
      if (!cuentasMap.has(ctaKey)) {
        cuentasMap.set(ctaKey, {
          key: ctaKey,
          codigo: cod,
          nombre: row.NombreCuenta || "Sin Nombre",
          valoresPorEmpresa: {},
          centrosMap: new Map(),
        });
      }

      const cuenta = cuentasMap.get(ctaKey);
      cuenta.valoresPorEmpresa[empresa] =
        (cuenta.valoresPorEmpresa[empresa] || 0) + row.SaldoNeto;

      const ccKey = row.CodigoCentroCosto || "000";
      if (!cuenta.centrosMap.has(ccKey)) {
        cuenta.centrosMap.set(ccKey, {
          key: ccKey,
          codigo: ccKey,
          nombre: row.CentroCosto || "Sin Centro de Costo",
          valoresPorEmpresa: {},
        });
      }

      const centro = cuenta.centrosMap.get(ccKey);
      centro.valoresPorEmpresa[empresa] =
        (centro.valoresPorEmpresa[empresa] || 0) + row.SaldoNeto;
    }
  }

  return Array.from(cuentasMap.values())
    .map((cta) => {
      const valoresPorEmpresa = {};
      for (const emp of empresas) valoresPorEmpresa[emp] = cta.valoresPorEmpresa[emp] || 0;
      const acumulado = empresas.reduce((s, emp) => s + (valoresPorEmpresa[emp] || 0), 0);
      const centros = Array.from(cta.centrosMap.values())
        .map((cc) => {
          const ve = {};
          for (const emp of empresas) ve[emp] = cc.valoresPorEmpresa[emp] || 0;
          return {
            ...cc,
            valoresPorEmpresa: ve,
            acumulado: empresas.reduce((s, emp) => s + (ve[emp] || 0), 0),
          };
        })
        .sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }));

      return {
        key: cta.key,
        codigo: cta.codigo,
        nombre: cta.nombre,
        valoresPorEmpresa,
        acumulado,
        centros,
      };
    })
    .filter(
      (cta) =>
        incluirCeros ||
        cta.acumulado !== 0 ||
        empresas.some((emp) => (cta.valoresPorEmpresa[emp] || 0) !== 0)
    )
    .sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }));
}

function calcularCuentasNodo(
  nodeDef,
  parentDef,
  empresas,
  mappedRowsPorEmpresa,
  datosPorEmpresa,
  anio,
  mesDesde,
  mesHasta,
  config
) {
  if (!nodeDef.tipo) return [];

  const regla = resolverReglaSubfila(nodeDef, parentDef);
  const filasPorEmpresa = {};

  for (const empresa of empresas) {
    filasPorEmpresa[empresa] = obtenerFilasDetalleEmpresa(
      regla,
      empresa,
      mappedRowsPorEmpresa[empresa] || [],
      datosPorEmpresa[empresa] || [],
      anio,
      mesDesde,
      mesHasta,
      config
    );
  }

  const incluirCeros = regla.tipo === "cuenta_centro";
  const cuentas = agruparCuentasGerencial(empresas, filasPorEmpresa, { incluirCeros });

  if (regla.tipo === "cuenta_centro") {
    const hayAsignaciones = empresas.some(
      (emp) => obtenerAsignacionesParaEmpresa(regla, emp, config).length > 0
    );
    if (hayAsignaciones) return cuentas;
  }

  return cuentas;
}

function nodoTieneCuentasVisibles(nodeDef, parentDef, empresas, config) {
  if (!nodeDef.tipo) return false;
  const regla = resolverReglaSubfila(nodeDef, parentDef);
  if (regla.tipo === "cuenta_centro") {
    return empresas.some((emp) => obtenerAsignacionesParaEmpresa(regla, emp, config).length > 0);
  }
  return true;
}

function resolverReglaSubfila(sub, filaPadre) {
  if (sub.tipo !== "regla_padre") return sub;

  const {
    subfilas: _s,
    expandible: _e,
    total_independiente: _t,
    key: _k,
    label: _l,
    ...reglaBase
  } = filaPadre;

  return {
    ...reglaBase,
    key: sub.key,
    label: sub.label,
    tipo: "rango_cuentas",
    modo_valor: sub.modo_valor || "rango",
  };
}

function calcularTotalFilaEmpresa(regla, empresa, mappedRows, datosEmpresa, anio, mesDesde, mesHasta, config) {
  const override = config?.empresas?.[empresa]?.[regla.key];
  const { desde, hasta } = rangoMesesRegla(regla, mesDesde, mesHasta);

  switch (regla.tipo) {
    case "rango_mapeado_categoria":
      return mappedRows
        .filter((r) => r.Categoria === regla.categoria)
        .reduce((s, r) => s + r.SaldoNeto, 0);

    case "rango_mapeado_subitems":
      return mappedRows
        .filter((r) => (regla.subitems || []).includes(r.Subitem))
        .reduce((s, r) => s + r.SaldoNeto, 0);

    case "rango_mapeado_filtrado":
      return mappedRows.filter((r) => filaMappedCoincide(r, regla)).reduce((s, r) => s + r.SaldoNeto, 0);

    case "resultado_antes_impuestos": {
      const excluir = new Set(regla.excluir_subitems || []);
      return mappedRows
        .filter((r) => !excluir.has(r.Subitem))
        .reduce((s, r) => s + r.SaldoNeto, 0);
    }

    case "resultado_eerr_total":
      return mappedRows.reduce((s, r) => s + r.SaldoNeto, 0);

    case "rango_cuentas":
      return sumarReglaRaw(datosEmpresa, anio, desde, hasta, regla, override);

    case "corte_cuentas": {
      const porCuentas = sumarCuentasConfiguradasEmpresa(
        regla.key,
        empresa,
        datosEmpresa,
        anio,
        mesDesde,
        mesHasta,
        config,
        true
      );
      if (porCuentas !== null) return porCuentas;
      return sumarReglaRaw(datosEmpresa, anio, 1, mesHasta, regla, override);
    }

    case "cuenta_centro":
      return sumarCuentaCentroEmpresa(
        datosEmpresa,
        anio,
        mesDesde,
        mesHasta,
        regla,
        empresa,
        config
      );

    default:
      return 0;
  }
}

function calcularBloqueRegla(regla, empresas, mappedRowsPorEmpresa, datosPorEmpresa, anio, mesDesde, mesHasta, config) {
  const valoresPorEmpresa = {};
  let acumulado = 0;

  for (const empresa of empresas) {
    const valor = calcularTotalFilaEmpresa(
      regla,
      empresa,
      mappedRowsPorEmpresa[empresa] || [],
      datosPorEmpresa[empresa] || [],
      anio,
      mesDesde,
      mesHasta,
      config
    );
    valoresPorEmpresa[empresa] = valor;
    acumulado += Number(valor) || 0;
  }

  return { valoresPorEmpresa, acumulado };
}

function sumarNodosHijos(children, empresas) {
  const valoresPorEmpresa = {};
  for (const empresa of empresas) {
    valoresPorEmpresa[empresa] = children.reduce(
      (s, ch) => s + (Number(ch.valoresPorEmpresa[empresa]) || 0),
      0
    );
  }
  const acumulado = children.reduce((s, ch) => s + (Number(ch.acumulado) || 0), 0);
  return { valoresPorEmpresa, acumulado };
}

function calcularNodoGerencial(
  nodeDef,
  parentDef,
  empresas,
  mappedRowsPorEmpresa,
  datosPorEmpresa,
  anio,
  mesDesde,
  mesHasta,
  config
) {
  const childDefs = nodeDef.subfilas || [];
  const children = childDefs.map((child) =>
    calcularNodoGerencial(
      child,
      nodeDef,
      empresas,
      mappedRowsPorEmpresa,
      datosPorEmpresa,
      anio,
      mesDesde,
      mesHasta,
      config
    )
  );

  const hasChildren = children.length > 0;
  const totalIndep = nodeDef.total_independiente ?? (hasChildren ? false : true);

  let valoresPorEmpresa;
  let acumulado;

  if (hasChildren && !totalIndep) {
    ({ valoresPorEmpresa, acumulado } = sumarNodosHijos(children, empresas));
  } else if (nodeDef.tipo) {
    const regla = resolverReglaSubfila(nodeDef, parentDef);
    ({ valoresPorEmpresa, acumulado } = calcularBloqueRegla(
      regla,
      empresas,
      mappedRowsPorEmpresa,
      datosPorEmpresa,
      anio,
      mesDesde,
      mesHasta,
      config
    ));
  } else if (hasChildren) {
    ({ valoresPorEmpresa, acumulado } = sumarNodosHijos(children, empresas));
  } else {
    valoresPorEmpresa = {};
    for (const empresa of empresas) valoresPorEmpresa[empresa] = 0;
    acumulado = 0;
  }

  const cuentas = hasChildren
    ? []
    : calcularCuentasNodo(
        nodeDef,
        parentDef,
        empresas,
        mappedRowsPorEmpresa,
        datosPorEmpresa,
        anio,
        mesDesde,
        mesHasta,
        config
      );

  const cuentasVisibles = hasChildren
    ? false
    : nodoTieneCuentasVisibles(nodeDef, parentDef, empresas, config)
      ? cuentas.length > 0 ||
        (resolverReglaSubfila(nodeDef, parentDef).tipo === "cuenta_centro" &&
          empresas.some(
            (emp) =>
              obtenerAsignacionesParaEmpresa(resolverReglaSubfila(nodeDef, parentDef), emp, config)
                .length > 0
          ))
      : cuentas.length > 0;

  return {
    key: nodeDef.key,
    label: nodeDef.label,
    expandible: Boolean(nodeDef.expandible && hasChildren),
    tieneCuentas: cuentasVisibles,
    valoresPorEmpresa,
    acumulado,
    cuentas,
    subfilas: children,
  };
}

function calcularSubfilas(filaConfig, empresas, mappedRowsPorEmpresa, datosPorEmpresa, anio, mesDesde, mesHasta, config) {
  return (filaConfig.subfilas || []).map((subDef) =>
    calcularNodoGerencial(
      subDef,
      filaConfig,
      empresas,
      mappedRowsPorEmpresa,
      datosPorEmpresa,
      anio,
      mesDesde,
      mesHasta,
      config
    )
  );
}

function calcularTotalPadre(filaConfig, subfilas, empresas, mappedRowsPorEmpresa, datosPorEmpresa, anio, mesDesde, mesHasta, config) {
  const usarReglaPadre = !subfilas.length || filaConfig.total_independiente;

  if (usarReglaPadre) {
    return calcularBloqueRegla(
      filaConfig,
      empresas,
      mappedRowsPorEmpresa,
      datosPorEmpresa,
      anio,
      mesDesde,
      mesHasta,
      config
    );
  }

  const valoresPorEmpresa = {};
  for (const empresa of empresas) {
    valoresPorEmpresa[empresa] = subfilas.reduce(
      (s, sub) => s + (Number(sub.valoresPorEmpresa[empresa]) || 0),
      0
    );
  }
  const acumulado = subfilas.reduce((s, sub) => s + (Number(sub.acumulado) || 0), 0);
  return { valoresPorEmpresa, acumulado };
}

/**
 * Matriz gerencial: filas = conceptos, columnas = empresas comparadas + acumulado.
 */
export function calcularMatrizResumenGerencial(
  empresas,
  { anio, mesDesde, mesHasta, tipoEerr, datosPorEmpresa, mapeoCuentas, config = comparativoGerencialDefault }
) {
  const filasConfig = obtenerFilasConfig(config);

  const mappedRowsPorEmpresa = {};
  for (const empresa of empresas) {
    mappedRowsPorEmpresa[empresa] = filtrarFilasPorRangoMes(
      mapearDatosAnioEerr(empresa, anio, tipoEerr, datosPorEmpresa[empresa] || [], mapeoCuentas),
      mesDesde,
      mesHasta
    );
  }

  const filas = filasConfig.map((filaConfig) => {
    const subfilas = calcularSubfilas(
      filaConfig,
      empresas,
      mappedRowsPorEmpresa,
      datosPorEmpresa,
      anio,
      mesDesde,
      mesHasta,
      config
    );

    const { valoresPorEmpresa, acumulado } = calcularTotalPadre(
      filaConfig,
      subfilas,
      empresas,
      mappedRowsPorEmpresa,
      datosPorEmpresa,
      anio,
      mesDesde,
      mesHasta,
      config
    );

    const hasSubfilas = subfilas.length > 0;
    const cuentas = hasSubfilas
      ? []
      : calcularCuentasNodo(
          filaConfig,
          null,
          empresas,
          mappedRowsPorEmpresa,
          datosPorEmpresa,
          anio,
          mesDesde,
          mesHasta,
          config
        );

    const tieneCuentas = hasSubfilas
      ? false
      : nodoTieneCuentasVisibles(filaConfig, null, empresas, config)
        ? cuentas.length > 0 ||
          (filaConfig.tipo === "cuenta_centro" &&
            empresas.some((emp) => obtenerAsignacionesParaEmpresa(filaConfig, emp, config).length > 0))
        : cuentas.length > 0;

    return {
      key: filaConfig.key,
      label: filaConfig.label,
      expandible: Boolean(filaConfig.expandible && hasSubfilas),
      tieneCuentas,
      valoresPorEmpresa,
      acumulado,
      cuentas,
      subfilas,
    };
  });

  return { empresas: [...empresas], filas };
}
