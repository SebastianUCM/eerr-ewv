import * as XLSX from "xlsx";

function num(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "";
  return Number(v);
}

/**
 * @param {object} opts
 * @param {Record<string,string>} opts.meta
 * @param {Record<string, number|string|null>} opts.kpisActual
 * @param {Record<string, number|string|null>} opts.kpisAnterior
 * @param {Array<{label:string, key:string, tipoRatio?:boolean}>} opts.metricasMeta
 * @param {Array<{categoria:string, total:number, mensual:Record<number,number>}>} opts.eerrCategorias
 * @param {Record<string, number|string|null>} opts.balanceKpis
 * @param {Array<{mes:number, label:string, ingresos:number, gastos:number}>} [opts.serieComparativa]
 */
export function descargarInformeExcel(opts) {
  const {
    meta = {},
    kpisActual = {},
    kpisAnterior = {},
    metricasMeta = [],
    eerrCategorias = [],
    balanceKpis = {},
    serieComparativa = [],
  } = opts;

  const wb = XLSX.utils.book_new();

  const metaRows = Object.entries({ ...meta, Generado: new Date().toISOString() }).map(([k, v]) => ({
    Campo: k,
    Valor: String(v ?? ""),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(metaRows), "Metadatos");

  const indRows = metricasMeta.map((m) => {
    const actual = kpisActual[m.key];
    const ant = kpisAnterior[m.key];
    let varPct = "";
    if (m.tipoRatio) {
      const a = num(actual);
      const b = num(ant);
      if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) {
        varPct = (((a - b) / Math.abs(b)) * 100).toFixed(2) + "%";
      }
    } else {
      const a = num(actual);
      const b = num(ant);
      if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) {
        const compAbs = ["gastos", "contribuciones", "patenteMunicipal"].includes(m.key);
        const an = compAbs ? Math.abs(a) : a;
        const bn = compAbs ? Math.abs(b) : b;
        varPct = (((an - bn) / Math.abs(bn)) * 100).toFixed(2) + "%";
      }
    }
    return {
      Indicador: m.label,
      Clave: m.key,
      Actual: m.tipoRatio ? actual : actual,
      Anterior: m.tipoRatio ? ant : ant,
      Variacion_pct: varPct,
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(indRows), "Indicadores");

  if (eerrCategorias.length) {
    const eerrRows = eerrCategorias.map((row) => {
      const o = { Categoria: row.categoria };
      for (let m = 1; m <= 12; m += 1) {
        o[`M${m}`] = num(row.mensual?.[m]) || 0;
      }
      o.Total = num(row.total);
      return o;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(eerrRows), "EERR_categorias");
  }

  const balRows = Object.entries(balanceKpis).map(([k, v]) => ({ Indicador: k, Valor: v }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(balRows), "Balance_KPIs");

  if (serieComparativa.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(serieComparativa), "Comparativo_mensual");
  }

  const safeEmp = String(meta.Empresa || "empresa").replace(/[^\w\-]/g, "_");
  const periodo = String(meta.Periodo || "periodo").replace(/[^\w\-]/g, "_");
  const nombre = `Informe_${safeEmp}_${periodo}.xlsx`;
  XLSX.writeFile(wb, nombre);
}
