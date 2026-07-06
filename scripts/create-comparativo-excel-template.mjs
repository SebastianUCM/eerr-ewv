/**
 * Genera docs/config_eerr_comparativo.xlsx (plantilla para mapeo gerencial).
 * Uso: node scripts/create-comparativo-excel-template.mjs
 */
import * as XLSX from "xlsx";
import { readFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const configPath = join(root, "src/assets/config/comparativo_gerencial.json");
const outPath = join(root, "docs/config_eerr_comparativo.xlsx");

const config = JSON.parse(readFileSync(configPath, "utf8"));

function flattenFilas(filas, padreKey = "", nivel = 1, out = []) {
  for (const f of filas || []) {
    out.push({
      nivel,
      key: f.key,
      label: f.label,
      padre_key: padreKey,
      expandible: f.expandible ? "S" : "N",
      total_independiente: f.total_independiente ? "S" : "N",
      tipo: f.tipo || "",
      nota: "",
    });
    if (f.subfilas?.length) {
      flattenFilas(f.subfilas, f.key, nivel + 1, out);
    }
  }
  return out;
}

const instrucciones = [
  ["CONFIG EERR COMPARATIVO — Resumen gerencial"],
  [""],
  ["Hojas:"],
  ["  Estructura     → Filas del informe (key único, jerarquía padre_key). Referencia; no importa sola."],
  ["  Asignaciones   → Mapeo explícito cuenta + centro de costo por fila_key."],
  ["                 → empresa vacía = aplica a todas las empresas del comparativo."],
  ["  Saldos_corte   → Cuentas de saldo al corte (banco, caja, inversiones)."],
  ["  Patrones       → Reglas por nombre/subítem (alternativa a Asignaciones)."],
  [""],
  ["Convenciones:"],
  ["  key / fila_key → snake_case, igual que en comparativo_gerencial.json"],
  ["  cuenta         → código contable, ej. 3-2-01-01-010"],
  ["  centro         → código centro de costo, ej. 28435 (000 si sin CC)"],
  [""],
  ["Próximo paso: completar Asignaciones y Saldos_corte; luego importar con build-comparativo-config.mjs"],
];

const estructuraHeaders = [
  "nivel",
  "key",
  "label",
  "padre_key",
  "expandible",
  "total_independiente",
  "tipo",
  "nota",
];
const estructuraRows = flattenFilas(config.filas);

const asignacionesHeaders = ["fila_key", "label_fila", "empresa", "cuenta", "centro", "nota"];
const asignacionesRows = [
  {
    fila_key: "remuneraciones_admin",
    label_fila: "REMUNERACIONES ADMINISTRACION (28.435)",
    empresa: "",
    cuenta: "3-2-01-01-010",
    centro: "28435",
    nota: "Ejemplo — borrar o reemplazar",
  },
  {
    fila_key: "cuenta_luz_maitenes",
    label_fila: "CUENTA LUZ LOS MAITENES",
    empresa: "",
    cuenta: "",
    centro: "",
    nota: "",
  },
];

const saldosHeaders = ["fila_key", "label_fila", "empresa", "cuenta", "modo", "nota"];
const labelPorKey = Object.fromEntries(estructuraRows.map((r) => [r.key, r.label]));
const saldosRows = (config.columnas_cuentas || []).map((col) => ({
  fila_key: col.fila,
  label_fila: labelPorKey[col.fila] || col.fila,
  empresa: "",
  cuenta: col.codigo || col.key,
  modo: col.tipo_valor === "corte" ? "corte" : "rango",
  nota: "",
}));

const patronesHeaders = [
  "fila_key",
  "label_fila",
  "tipo",
  "subitems",
  "patrones_nombre",
  "codigos_centro",
  "patrones_centro",
  "excluir_patrones_nombre",
  "nota",
];

function collectPatrones(filas, out = []) {
  for (const f of filas || []) {
    if (f.tipo && f.tipo !== "corte_cuentas" && f.tipo !== "regla_padre") {
      const tieneFiltro =
        f.patrones_nombre?.length ||
        f.codigos_centro?.length ||
        f.patrones_centro?.length ||
        f.subitems?.length ||
        f.categoria;
      if (tieneFiltro || f.tipo.startsWith("rango_mapeado") || f.tipo === "rango_cuentas") {
        out.push({
          fila_key: f.key,
          label_fila: f.label,
          tipo: f.tipo,
          subitems: (f.subitems || []).join(", "),
          patrones_nombre: (f.patrones_nombre || []).join(" | "),
          codigos_centro: (f.codigos_centro || []).join(", "),
          patrones_centro: (f.patrones_centro || []).join(" | "),
          excluir_patrones_nombre: (f.excluir_patrones_nombre || []).join(" | "),
          nota: "",
        });
      }
    }
    if (f.subfilas?.length) collectPatrones(f.subfilas, out);
  }
  return out;
}

const patronesRows = collectPatrones(config.filas);

function sheetFromObjects(headers, rows) {
  return XLSX.utils.json_to_sheet(rows, { header: headers });
}

function sheetFromArrays(rows) {
  return XLSX.utils.aoa_to_sheet(rows);
}

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, sheetFromArrays(instrucciones), "Instrucciones");
XLSX.utils.book_append_sheet(wb, sheetFromObjects(estructuraHeaders, estructuraRows), "Estructura");
XLSX.utils.book_append_sheet(wb, sheetFromObjects(asignacionesHeaders, asignacionesRows), "Asignaciones");
XLSX.utils.book_append_sheet(wb, sheetFromObjects(saldosHeaders, saldosRows), "Saldos_corte");
XLSX.utils.book_append_sheet(wb, sheetFromObjects(patronesHeaders, patronesRows), "Patrones");

mkdirSync(dirname(outPath), { recursive: true });
XLSX.writeFile(wb, outPath);

console.log(`Plantilla generada: ${outPath}`);
console.log(`  Estructura: ${estructuraRows.length} filas`);
console.log(`  Patrones: ${patronesRows.length} filas (referencia)`);
console.log(`  Saldos_corte: ${saldosRows.length} filas`);
