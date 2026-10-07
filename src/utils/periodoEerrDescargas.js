// Descargas de "Resultado del Ejercicio por Periodo" del EERR, en PDF y Excel, carta
// horizontal. Reciben las mismas filas que pinta la pantalla (signo, concepto, total y
// los 12 meses), así que no pueden decir otra cosa que lo que se ve.
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const nfmt = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });
const contable = (v) => {
  if (v === null || v === undefined) return "-";
  const n = Math.round(Number(v) || 0);
  if (!n) return "-";
  return n < 0 ? `(${nfmt.format(-n)})` : nfmt.format(n);
};
const safe = (s) => String(s || "eerr").replace(/[^\w\-]+/g, "_").slice(0, 60);
// "−" (U+2212) no existe en la fuente estándar del PDF (WinAnsi).
const signoAscii = (s) => String(s || "").replace("−", "-");

function nombreArchivoPeriodos(empresa, anio, ext) {
  return `eerr_por_periodo_${safe(empresa)}_${anio}.${ext}`;
}

/**
 * @typedef {{signo?:string, label:string, mensual:object, total:number, tipo:string}} FilaPeriodo
 * @typedef {{titulo:string, filas:FilaPeriodo[], nota?:string}} TablaPeriodo
 * @param {{empresa:string, anio:number, subtitulo:string, fecha:string, tablas:TablaPeriodo[]}} p
 */
function generarPeriodosPdf({ empresa, anio, subtitulo, fecha, tablas }) {
  const doc = new jsPDF({ orientation: "l", unit: "mm", format: "letter", compress: true });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  // Montos de miles de millones en 12 columnas: meses en 5,9 pt para que
  // "(1.164.051.996)" quepa en su celda sin pisar la vecina.
  const mL = 7, mR = 7, ancho = W - mL - mR;
  const bottom = H - 12;
  const wSigno = 4, wConcepto = 46, wTotal = 22;
  const wMes = (ancho - wSigno - wConcepto - wTotal) / 12;
  const alto = 5.4;

  const tinta = [17, 24, 39], suave = [100, 116, 139], rojo = [190, 18, 60];
  const setC = (c) => doc.setTextColor(c[0], c[1], c[2]);
  const setF = (c) => doc.setFillColor(c[0], c[1], c[2]);

  doc.setFont("helvetica", "bold"); doc.setFontSize(15); setC(tinta);
  doc.text("Estado de Resultados por Periodo", mL, 15);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); setC(suave);
  doc.text(`${empresa} · ejercicio ${anio} · ${subtitulo}`, mL, 21);
  doc.text(`Generado ${fecha}`, W - mR, 21, { align: "right" });
  doc.setDrawColor(79, 70, 229); doc.setLineWidth(0.6); doc.line(mL, 24, W - mR, 24);

  const xTotal = mL + wSigno + wConcepto + wTotal - 1.5;
  const xMes = (m) => mL + wSigno + wConcepto + wTotal + m * wMes - 1.5;

  function cabecera(y) {
    setF([241, 245, 249]); doc.rect(mL, y, ancho, alto, "F");
    setF([226, 232, 240]); doc.rect(mL + wSigno + wConcepto, y, wTotal, alto, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); setC(tinta);
    doc.text("Concepto", mL + wSigno + 1, y + 3.7);
    doc.text("TOTAL", xTotal, y + 3.7, { align: "right" });
    MESES.forEach((m, i) => doc.text(m, xMes(i + 1), y + 3.7, { align: "right" }));
    return y + alto;
  }

  let y = 31;
  for (const t of tablas) {
    if (y + 10 + alto * (t.filas.length + 1) > bottom) { doc.addPage(); y = 14; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); setC(tinta);
    doc.text(t.titulo, mL, y + 4);
    y = cabecera(y + 7);
    for (const f of t.filas) {
      if (f.tipo === "resultado") { setF([238, 242, 255]); doc.rect(mL, y, ancho, alto, "F"); }
      else if (f.tipo === "subtotal") { setF([248, 250, 252]); doc.rect(mL, y, ancho, alto, "F"); }
      setF(f.tipo === "resultado" ? [224, 231, 255] : [241, 245, 249]);
      doc.rect(mL + wSigno + wConcepto, y, wTotal, alto, "F");
      const negrita = f.tipo === "resultado" || f.tipo === "subtotal";
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); setC(suave);
      doc.text(signoAscii(f.signo), mL + wSigno / 2, y + 3.8, { align: "center" });
      doc.setFont("helvetica", negrita ? "bold" : "normal"); doc.setFontSize(6.9);
      setC(f.tipo === "resultado" ? [49, 46, 129] : tinta);
      doc.text(String(f.label), mL + wSigno + 1, y + 3.8, { maxWidth: wConcepto - 2 });
      doc.setFont("helvetica", "bold"); doc.setFontSize(6.6); setC(Number(f.total) < 0 ? rojo : tinta);
      doc.text(contable(f.total), xTotal, y + 3.8, { align: "right" });
      doc.setFont("helvetica", negrita ? "bold" : "normal"); doc.setFontSize(5.9);
      for (let m = 1; m <= 12; m++) {
        const v = f.mensual?.[m];
        setC(Number(v) < 0 ? rojo : tinta);
        doc.text(contable(v), xMes(m), y + 3.8, { align: "right" });
      }
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.1); doc.line(mL, y + alto, W - mR, y + alto);
      y += alto;
    }
    if (t.nota) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(6.6); setC(suave);
      const lineas = doc.splitTextToSize(t.nota, ancho);
      if (y + 3 + lineas.length * 2.8 > bottom) { doc.addPage(); y = 14; }
      doc.text(lineas, mL, y + 4);
      y += 4 + lineas.length * 2.8;
    }
    y += 8;
  }

  const paginas = doc.internal.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); setC([150, 150, 158]);
    doc.text(`EERR por periodo · ${empresa} · ${anio}`, mL, H - 6);
    doc.text(`Página ${p} de ${paginas}`, W - mR, H - 6, { align: "right" });
  }
  return doc;
}

export function descargarPeriodosPdf(p) {
  generarPeriodosPdf(p).save(nombreArchivoPeriodos(p.empresa, p.anio, "pdf"));
}

/** Libro Excel: una hoja con las tablas, montos como números. */
function generarPeriodosLibro({ empresa, anio, subtitulo, tablas }) {
  const aoa = [];
  aoa.push([`Estado de Resultados por Periodo · ${empresa} · ejercicio ${anio}`]);
  aoa.push([subtitulo]);
  aoa.push([]);
  for (const t of tablas) {
    aoa.push([t.titulo]);
    aoa.push(["", "Concepto", "TOTAL", ...MESES]);
    for (const f of t.filas) {
      const meses = [];
      for (let m = 1; m <= 12; m++) {
        const v = f.mensual?.[m];
        meses.push(v === null || v === undefined ? "" : Math.round(Number(v) || 0));
      }
      aoa.push([f.signo || "", f.label, Math.round(Number(f.total) || 0), ...meses]);
    }
    if (t.nota) aoa.push([t.nota]);
    aoa.push([]);
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Formato contable: negativos entre paréntesis y en rojo, como en pantalla.
  const rango = XLSX.utils.decode_range(ws["!ref"]);
  for (let r = rango.s.r; r <= rango.e.r; r++) {
    for (let c = 2; c <= 14; c++) {
      const cel = ws[XLSX.utils.encode_cell({ r, c })];
      if (cel && cel.t === "n") cel.z = "#,##0;[Red](#,##0);\"-\"";
    }
  }
  ws["!cols"] = [{ wch: 3 }, { wch: 38 }, { wch: 16 }, ...MESES.map(() => ({ wch: 13 }))];
  ws["!margins"] = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Por periodo");
  return wb;
}

/**
 * SheetJS (versión libre) no escribe la configuración de impresión. Se agrega a mano en
 * el XML de la hoja: carta (paperSize=1), horizontal y ajustada al ancho de la página.
 */
function conImpresionCartaHorizontal(bytes) {
  const archivos = unzipSync(bytes);
  const ruta = "xl/worksheets/sheet1.xml";
  let xml = strFromU8(archivos[ruta]);
  const pageSetup = '<pageSetup paperSize="1" orientation="landscape" fitToWidth="1" fitToHeight="0"/>';
  if (xml.includes("<sheetPr")) {
    xml = xml.replace(/<sheetPr([^>]*)\/>/, '<sheetPr$1><pageSetUpPr fitToPage="1"/></sheetPr>')
             .replace(/<sheetPr([^>]*)>(?!<pageSetUpPr)/, '<sheetPr$1><pageSetUpPr fitToPage="1"/>');
  } else {
    xml = xml.replace(/(<worksheet[^>]*>)/, '$1<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>');
  }
  // pageSetup va inmediatamente después de pageMargins (orden del esquema de Excel).
  xml = /<pageMargins[^>]*\/>/.test(xml)
    ? xml.replace(/(<pageMargins[^>]*\/>)/, `$1${pageSetup}`)
    : xml.replace("</sheetData>", `</sheetData><pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>${pageSetup}`);
  archivos[ruta] = strToU8(xml);
  return zipSync(archivos);
}

export function descargarPeriodosExcel(p) {
  const bytes = XLSX.write(generarPeriodosLibro(p), { type: "array", bookType: "xlsx" });
  const blob = new Blob([conImpresionCartaHorizontal(new Uint8Array(bytes))], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivoPeriodos(p.empresa, p.anio, "xlsx");
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
