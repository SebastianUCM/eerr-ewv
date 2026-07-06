/**
 * Genera docs/guia_config_eerr_comparativo.pdf
 * Uso: node scripts/generate-comparativo-guia-pdf.mjs
 */
import { jsPDF } from "jspdf";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "../docs/guia_config_eerr_comparativo.pdf");

const MARGIN = 18;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;
const LINE = 5.5;
const FOOTER = "Dashboard EWV — Guia config EERR comparativo (matriz gerencial)";

function createDoc() {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  const newPageIfNeeded = (need = LINE) => {
    if (y + need > 285) {
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(FOOTER, MARGIN, 292);
      doc.addPage();
      y = MARGIN;
      doc.setTextColor(0);
    }
  };

  const title = (text) => {
    newPageIfNeeded(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(text, MARGIN, y);
    y += 10;
  };

  const h2 = (text) => {
    newPageIfNeeded(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(text, MARGIN, y);
    y += 7;
  };

  const h3 = (text) => {
    newPageIfNeeded(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(text, MARGIN, y);
    y += 6;
  };

  const para = (text) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, CONTENT_W);
    for (const line of lines) {
      newPageIfNeeded();
      doc.text(line, MARGIN, y);
      y += LINE;
    }
    y += 2;
  };

  const bullet = (text) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, CONTENT_W - 6);
    newPageIfNeeded(lines.length * LINE);
    doc.text("•", MARGIN, y);
    let by = y;
    for (const line of lines) {
      doc.text(line, MARGIN + 5, by);
      by += LINE;
    }
    y = by + 1;
  };

  const table = (headers, rows, colWidths) => {
    const rowH = 6;
    const startX = MARGIN;
    newPageIfNeeded(rowH * (rows.length + 2));

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    let x = startX;
    headers.forEach((h, i) => {
      doc.text(h, x, y);
      x += colWidths[i];
    });
    y += rowH;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    for (const row of rows) {
      newPageIfNeeded(rowH + 2);
      x = startX;
      row.forEach((cell, i) => {
        const clipped = String(cell).length > 28 ? String(cell).slice(0, 26) + "…" : String(cell);
        doc.text(clipped, x, y);
        x += colWidths[i];
      });
      y += rowH;
    }
    y += 4;
  };

  title("Guia: config_eerr_comparativo.xlsx");
  para(
    "Este documento explica como llenar el archivo Excel docs/config_eerr_comparativo.xlsx. " +
      "Aplica SOLO a la matriz inferior del comparativo EERR (Resumen gerencial comparativo). " +
      "NO modifica la matriz contable superior ni el archivo mapeo_cuentas.json."
  );

  h2("1. Para que sirve");
  para(
    "En la matriz gerencial cada fila (ej. REMUNERACIONES ADMIN, CONSUMO AGUA, BANCO EWV) debe saber " +
      "que movimientos contables sumar. El Excel permite definirlo de forma explicita: codigo de cuenta + codigo de centro de costo (CC)."
  );

  h2("2. Hojas del Excel");
  table(
    ["Hoja", "Editar?", "Uso"],
    [
      ["Instrucciones", "No", "Resumen rapido"],
      ["Estructura", "Consulta", "Lista filas con su key (codigo interno)"],
      ["Asignaciones", "SI", "Principal: cuenta + CC por fila"],
      ["Saldos_corte", "Si aplica", "Banco, caja, inversiones (saldo al corte)"],
      ["Patrones", "No", "Referencia de reglas actuales por nombre"],
    ],
    [32, 22, 116]
  );

  h2("3. Hoja Estructura (solo consulta)");
  para(
    "Columnas: nivel, key, label, padre_key, expandible, total_independiente, tipo, nota. " +
      "Copia el valor key cuando llenes Asignaciones. Ejemplo: remuneraciones_admin corresponde a " +
      '"REMUNERACIONES ADMINISTRACION (28.435)".'
  );

  h2("4. Hoja Asignaciones (principal)");
  h3("Columnas");
  table(
    ["Columna", "Oblig.", "Descripcion"],
    [
      ["fila_key", "Si", "Codigo de fila (copiar de Estructura)"],
      ["label_fila", "No", "Solo referencia visual"],
      ["empresa", "No", "Vacio = todas las empresas"],
      ["cuenta", "Si", "Codigo contable ej. 3-2-01-01-010"],
      ["centro", "Si", "Codigo CC ej. 28435; 000 si sin CC"],
      ["nota", "No", "Comentario libre"],
    ],
    [28, 14, 118]
  );

  h3("Regla clave");
  para("Una fila del Excel = un par cuenta + centro de costo.");
  para(
    "Si un concepto gerencial suma 3 combinaciones distintas, agrega 3 filas con el mismo fila_key pero distinta cuenta o centro."
  );

  h3("Ejemplo");
  table(
    ["fila_key", "empresa", "cuenta", "centro"],
    [
      ["remuneraciones_admin", "(vacio)", "3-2-01-01-010", "28435"],
      ["remuneraciones_admin", "WCORP2", "3-2-01-01-015", "28435"],
      ["cuenta_luz_maitenes", "(vacio)", "3-2-01-02-001", "00123"],
    ],
    [52, 28, 42, 28]
  );

  h3("Donde obtener cuenta y centro");
  bullet("En el dashboard: matriz EERR superior, expandir subitem > cuenta > centro de costo.");
  bullet("En contabilidad / exportacion Softland.");
  bullet("En datos_vue.json: campos CodigoCuenta y CodigoCentroCosto.");

  h3("Campo empresa");
  bullet("Vacio: la asignacion aplica a todas las empresas del comparativo.");
  bullet("Con nombre (ej. FIDELMIRA): solo esa empresa, util cuando el codigo de cuenta difiere.");

  h2("5. Hoja Saldos_corte");
  para("Para filas de saldo al corte (banco, caja, fondos). No usa centro de costo.");
  table(
    ["Columna", "Descripcion"],
    [
      ["fila_key", "ej. banco_caja_ewv, fi_btg_pactual"],
      ["empresa", "Vacio = todas; o nombre si la cuenta cambia"],
      ["cuenta", "Codigo cuenta de balance"],
      ["modo", "corte = saldo al mes Hasta; rango = suma del periodo"],
    ],
    [35, 125]
  );

  h2("6. Hoja Patrones");
  para(
    "Muestra la configuracion actual por nombre de cuenta y subitems. Es referencia. " +
      "Si completas Asignaciones con cuenta+CC explicitos, no necesitas editar Patrones."
  );

  h2("7. Flujo paso a paso");
  bullet("1. Abrir hoja Estructura y elegir la fila gerencial (copiar key).");
  bullet("2. En Asignaciones, agregar filas con ese fila_key.");
  bullet("3. Completar cuenta y centro para cada movimiento que debe entrar.");
  bullet("4. Repetir para cada concepto del informe.");
  bullet("5. Revisar Saldos_corte para banco y BTG.");
  bullet("6. Importar al JSON (script build-comparativo-config.mjs, cuando este disponible).");

  h2("8. Errores frecuentes");
  table(
    ["Problema", "Solucion"],
    [
      ["fila_key mal escrito", "Copiar exacto desde Estructura"],
      ["Sin datos en matriz", "Verificar cuenta, CC y periodo"],
      ["CC incorrecto", "Revisar drill-down matriz superior"],
      ["Varias cuentas", "Varias filas Excel, mismo fila_key"],
    ],
    [55, 105]
  );

  h2("9. Esquema visual");
  para(
    "Informe gerencial (matriz abajo) > fila REMUNERACIONES ADMIN [key: remuneraciones_admin] > " +
      "Asignaciones Excel: cuenta 3-2-01-01-010 + centro 28435 (+ mas filas si hay mas pares)."
  );

  para("Archivo Excel: docs/config_eerr_comparativo.xlsx");
  para("Config JSON destino: src/assets/config/comparativo_gerencial.json");

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(FOOTER, MARGIN, 292);

  mkdirSync(dirname(outPath), { recursive: true });
  doc.save(outPath);
  console.log(`PDF generado: ${outPath}`);
}

createDoc();
