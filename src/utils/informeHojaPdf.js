// PDF del Informe EERR con el formato de los informes del dueño: recuadro de cierre,
// título, participación, mes, las filas tal como se ven en pantalla (mismos niveles
// abiertos) y Banco/Caja y BTG al final; sin pie de página ni agregados. Recibe los
// textos ya formateados, así el PDF no puede decir otra cosa.
import { jsPDF } from "jspdf";

const TINTA = [17, 24, 39];
const SUAVE = [107, 114, 128];
const ROJO = [208, 2, 27];
const AZUL = [31, 78, 140];
const AZUL_CLARO = [74, 127, 193];

/**
 * @param {{
 *   meta: { fechaCierre: string, titulo: string, nota?: string, participacion: string,
 *           banco: string, btg: string, total: string },
 *   columnas: string[],
 *   filas: { label: string, estilo: string, seccion: string, depth: number, drill: number,
 *            valores: { pesos: boolean, texto: string }[] }[],

 *   fileName: string,
 * }} p
 */
export function descargarInformeHojaPdf(p) {
  const nCols = p.columnas.length;
  // Siempre carta vertical, como los informes del dueño.
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "letter", compress: true });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const mL = 14, mR = 14, ancho = W - mL - mR, bottom = H - 14;
  const wPesos = nCols > 2 ? 3.5 : 5;
  const wMonto = nCols > 2 ? Math.min(24, (ancho * 0.6) / nCols - wPesos) : nCols > 1 ? 26 : 32;
  const wConcepto = ancho - nCols * (wPesos + wMonto);
  const setC = (c) => doc.setTextColor(c[0], c[1], c[2]);
  const setD = (c) => doc.setDrawColor(c[0], c[1], c[2]);
  let y = 14;

  const nuevaPagina = () => { doc.addPage(); y = 14; };
  const asegurar = (h) => { if (y + h > bottom) nuevaPagina(); };
  const xMonto = (i) => mL + wConcepto + i * (wPesos + wMonto) + wPesos + wMonto - 1;
  const xPesos = (i) => mL + wConcepto + i * (wPesos + wMonto) + wPesos / 2;

  // ── Recuadro de cierre
  const cajaFila = (label, pesos, monto, opts = {}) => {
    doc.setFont("helvetica", opts.italic ? "italic" : "bold");
    doc.setFontSize(opts.size || 10.5);
    setC(opts.color || TINTA);
    if (label) doc.text(label, mL + 2, y + 4.6);
    if (pesos) doc.text("$", W - mR - 48, y + 4.6, { align: "center" });
    if (monto) doc.text(monto, W - mR - 2, y + 4.6, { align: "right" });
    y += 6.5;
    setD(TINTA); doc.setLineWidth(0.2); doc.line(mL, y, W - mR, y);
  };
  const yCaja = y;
  doc.setFont("helvetica", "italic"); doc.setFontSize(13); setC(ROJO);
  doc.text(p.meta.fechaCierre, mL + 2, y + 5.2);
  y += 7; setD(TINTA); doc.setLineWidth(0.2); doc.line(mL, y, W - mR, y);
  cajaFila('Banco/CAJA "Sociedad EWV"', true, p.meta.banco);
  cajaFila("*FI BTG Pactual Renta Comercial", true, p.meta.btg);
  cajaFila("", true, p.meta.total, { italic: true, color: AZUL_CLARO, size: 10 });
  doc.setLineWidth(0.6); setD(TINTA); doc.rect(mL, yCaja, ancho, y - yCaja);
  y += 6;

  // ── Título, participación y mes
  doc.setLineWidth(0.25); doc.rect(mL, y, ancho, 7);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11.5); setC(TINTA);
  doc.text("ESTADO DE RESULTADOS PRELIMINAR", mL + 2, y + 5);
  y += 10;
  const xPart = mL + ancho * 0.3;
  doc.rect(xPart, y, ancho * 0.4, 5.5); doc.rect(xPart + ancho * 0.4, y, ancho * 0.3, 5.5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.text("Participación", xPart + 1.5, y + 3.8);
  doc.text(p.meta.participacion, W - mR - 1.5, y + 3.8, { align: "right" });
  y += 9;
  doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
  doc.text(p.meta.titulo, mL + 1, y + 4);
  if (p.meta.nota) { doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); setC(SUAVE); doc.text(p.meta.nota, mL + 50, y + 4); setC(TINTA); }
  y += 5.5; doc.setLineWidth(0.25); doc.line(mL, y, W - mR, y);
  y += 2;

  // ── Encabezado de columnas (solo con varias empresas)
  const cabecera = () => {
    if (nCols < 2) return;
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); setC(SUAVE);
    p.columnas.forEach((c, i) => doc.text(c, xMonto(i), y + 3.5, { align: "right" }));
    y += 5; setD(TINTA); doc.setLineWidth(0.2); doc.line(mL, y, W - mR, y);
  };
  cabecera();

  // ── Filas
  const sangria = (f) => {
    const gasto = f.seccion === "gastos_comunes_servicios" || f.seccion === "gastos_adm_ventas";
    switch (f.estilo) {
      case "linea-ing": return 7;
      case "cliente-ing": return 12;
      case "subgrupo": return wConcepto * 0.34;
      case "linea": return gasto ? wConcepto * (f.depth >= 2 ? 0.37 : 0.34) : 1;
      case "detalle": return gasto ? wConcepto * 0.4 + (f.depth - 2) * 3 : 7 + (f.depth - 2) * 5;
      default: return 1;
    }
  };
  for (const f of p.filas) {
    const esSec = f.estilo.startsWith("sec");
    const alto = esSec ? 7 : f.estilo === "prop" ? 5.4 : f.drill ? 4.4 : 4.8;
    asegurar(alto + (esSec ? 1 : 0));
    if (esSec) y += 1.5;
    // Sin fondos de color, como los informes del dueño: los niveles se leen por sangría y tamaño.
    // estilo del texto
    let font = "normal", size = 8, color = TINTA, upper = false;
    if (esSec) { font = "bold"; size = 9; upper = true; }
    else if (f.estilo === "prop") { size = 8; upper = true; }
    else if (f.estilo === "subgrupo") { font = "bolditalic"; size = 7.5; upper = true; }
    else if (f.estilo === "linea" || f.estilo === "linea-ing") { font = "italic"; size = 7.5; color = AZUL; upper = f.estilo === "linea-ing" || f.seccion === "gastos_comunes_servicios"; }
    else if (f.estilo === "cliente-ing") { size = 7.5; }
    else if (f.estilo === "resultado-linea") { size = 8.5; }
    else if (f.estilo === "flujo") { size = 8.5; }
    else if (f.estilo === "detalle") { size = 6.8; color = SUAVE; }
    doc.setFont("helvetica", font); doc.setFontSize(size); setC(color);
    const xTexto = mL + sangria(f);
    const maxTexto = wConcepto - sangria(f) - 2;
    let texto = upper ? f.label.toUpperCase() : f.label;
    const lineas = doc.splitTextToSize(texto, maxTexto);
    if (lineas.length > 1) texto = String(lineas[0]).replace(/\s+\S*$/, "") + "…";
    doc.text(texto, xTexto, y + alto - 1.4);
    // montos
    const colorMonto = f.estilo === "sec-gasto" || f.estilo === "flujo" ? ROJO : f.estilo === "detalle" ? SUAVE : TINTA;
    doc.setFont("helvetica", esSec ? "bold" : "normal");
    doc.setFontSize(esSec ? 9 : f.estilo === "detalle" ? 6.8 : 8);
    setC(colorMonto);
    f.valores.forEach((v, i) => {
      if (v.pesos) doc.text("$", xPesos(i), y + alto - 1.4, { align: "center" });
      if (v.texto) doc.text(v.texto, xMonto(i), y + alto - 1.4, { align: "right" });
    });
    y += alto;
    if (esSec || f.estilo === "resultado-linea" || f.estilo === "flujo") {
      setD(TINTA); doc.setLineWidth(0.2); doc.line(mL, y, W - mR, y);
    }
  }

  // ── Pie: caja otra vez
  y += 6; asegurar(16);
  doc.setLineWidth(0.25); setD(TINTA);
  doc.line(mL, y, W - mR, y);
  cajaFila('Banco/CAJA "Sociedad EWV"', true, p.meta.banco);
  cajaFila("*FI BTG Pactual Renta Comercial", true, p.meta.btg);

  doc.save(p.fileName);
}
