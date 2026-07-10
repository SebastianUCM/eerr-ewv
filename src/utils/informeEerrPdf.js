import { jsPDF } from "jspdf";

// Estado de Resultados en PDF (texto nítido, Carta vertical) para enviar al dueño.
// Resumido: solo secciones + grupos. Columnas: una por empresa + Consolidado.

const KINDS_PDF = new Set(["seccion", "grupo"]);

// Paleta profesional
const C = {
  tinta: [17, 24, 39], // slate-900
  suave: [100, 116, 139], // slate-500
  linea: [203, 213, 225], // slate-300
  acento: [79, 70, 229], // indigo-600
  acentoSuave: [238, 238, 252],
  seccionBg: [241, 245, 249], // slate-100
  ingreso: [4, 120, 87], // emerald-700
  gasto: [190, 40, 40], // rojo
  blanco: [255, 255, 255],
};

const nf = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });
function fmt(v) {
  const n = Math.round(Number(v) || 0);
  if (n === 0) return "–";
  const abs = nf.format(Math.abs(n));
  return n < 0 ? `(${abs})` : abs;
}

function aplanar(secciones) {
  const out = [];
  const walk = (node) => {
    if (KINDS_PDF.has(node.kind)) out.push(node);
    (node.children || []).forEach(walk);
  };
  (secciones || []).forEach(walk);
  return out;
}

export function descargarInformeEerrPdf({ secciones, empresas = [], meta }) {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "letter", compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const mL = 14;
  const mR = 14;
  const rightX = pageW - mR;
  const contentW = pageW - mL - mR;

  // Columnas: cada empresa + Consolidado
  const cols = [...empresas.map((e) => ({ key: e, label: e })), { key: "__consol__", label: "Consolidado" }];
  const nCols = cols.length;
  const colW = Math.min(36, Math.max(26, (contentW * 0.62) / nCols));
  const labelMaxW = contentW - nCols * colW - 2;
  const colRight = (i) => rightX - (nCols - 1 - i) * colW;
  const valorCol = (node, key) =>
    key === "__consol__"
      ? empresas.reduce((s, e) => s + (Number(node.valores?.[e]) || 0), 0)
      : Number(node.valores?.[key]) || 0;

  const empresa = meta?.empresa || "Sociedad EWV";
  const periodo = meta?.periodoLabel || "";
  const participacion = meta?.participacion;
  const caja = meta?.caja || {};
  const fecha = meta?.fecha || "";

  const setColor = (c) => doc.setTextColor(c[0], c[1], c[2]);
  const setFill = (c) => doc.setFillColor(c[0], c[1], c[2]);

  function encabezado() {
    let y = 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    setColor(C.tinta);
    doc.text("Estado de resultados", mL, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setColor(C.suave);
    y += 6;
    doc.text(empresa, mL, y);
    doc.text(periodo, rightX, y, { align: "right" });
    if (participacion != null) {
      y += 5;
      doc.setFontSize(9);
      doc.text(`Participación: ${participacion}%`, rightX, y, { align: "right" });
    }
    y += 3.5;
    doc.setDrawColor(C.acento[0], C.acento[1], C.acento[2]);
    doc.setLineWidth(0.6);
    doc.line(mL, y, rightX, y);
    return y + 7;
  }

  function bloqueCaja(y) {
    const cards = [
      ['Banco / Caja "Sociedad EWV"', caja.banco, false],
      ["FI BTG Pactual Renta Comercial", caja.btg, false],
      ["Posición total", caja.total, true],
    ];
    const gap = 4;
    const cw = (contentW - gap * (cards.length - 1)) / cards.length;
    cards.forEach((cd, i) => {
      const x = mL + i * (cw + gap);
      setFill(cd[2] ? C.acento : [244, 245, 248]);
      doc.roundedRect(x, y, cw, 15, 1.5, 1.5, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      setColor(cd[2] ? [220, 221, 250] : C.suave);
      doc.text(cd[0], x + 3, y + 5, { maxWidth: cw - 6 });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      setColor(cd[2] ? C.blanco : C.tinta);
      doc.text("$ " + fmt(cd[1]), x + 3, y + 12);
    });
    return y + 15 + 7;
  }

  function cabeceraTabla(y) {
    setFill(C.seccionBg);
    doc.rect(mL, y - 4, contentW, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    setColor(C.suave);
    doc.text("CONCEPTO", mL + 1, y);
    cols.forEach((c, i) => {
      if (c.key === "__consol__") setColor(C.acento);
      doc.text(c.label.toUpperCase(), colRight(i), y, { align: "right" });
      setColor(C.suave);
    });
    y += 2;
    doc.setDrawColor(C.linea[0], C.linea[1], C.linea[2]);
    doc.setLineWidth(0.3);
    doc.line(mL, y, rightX, y);
    return y + 4.5;
  }

  let y = encabezado();
  y = bloqueCaja(y);
  y = cabeceraTabla(y);

  const filas = aplanar(secciones);
  const bottom = pageH - 14;

  for (const f of filas) {
    // Ocultar filas en cero (todas las columnas) para un informe limpio.
    const algunValor = cols.some((c) => Math.round(valorCol(f, c.key)) !== 0);
    if (!algunValor) continue;

    const esSeccion = f.kind === "seccion";
    const rowH = esSeccion ? 6.5 : 5.2;
    // Evita cortar una sección de sus primeras líneas al final de la página.
    const necesario = esSeccion ? rowH + 5.2 * 2 : rowH;
    if (y + necesario > bottom) {
      doc.addPage();
      y = 16;
      y = cabeceraTabla(y);
    }
    const esResultado = f.tone === "resultado";

    if (esSeccion) {
      setFill(esResultado ? C.acentoSuave : C.seccionBg);
      doc.rect(mL, y - 3.7, contentW, rowH, "F");
    }

    // Concepto
    doc.setFont("helvetica", esSeccion ? "bold" : "normal");
    doc.setFontSize(esSeccion ? 8.5 : 8);
    if (esSeccion) setColor(esResultado ? C.acento : C.tinta);
    else setColor(C.suave);
    const indent = mL + 1 + f.depth * 4;
    const label = esSeccion ? String(f.label).toUpperCase() : String(f.label);
    doc.text(label, indent, y, { maxWidth: labelMaxW });

    // Valores por columna
    cols.forEach((c, i) => {
      const v = valorCol(f, c.key);
      const consol = c.key === "__consol__";
      doc.setFont("helvetica", esSeccion || consol ? "bold" : "normal");
      doc.setFontSize(esSeccion ? 8.5 : 8);
      if (v < 0) setColor(C.gasto);
      else if (esSeccion) setColor(esResultado ? C.acento : C.tinta);
      else if (consol) setColor(C.tinta);
      else setColor(C.suave);
      doc.text(fmt(v), colRight(i), y, { align: "right" });
    });

    y += rowH;
  }

  // Pie
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setColor([150, 150, 158]);
    if (fecha) doc.text(`Generado ${fecha}`, mL, pageH - 8);
    doc.text(`Página ${p} de ${total}`, rightX, pageH - 8, { align: "right" });
  }

  const safe = String(meta?.fileBaseName || "informe_eerr").replace(/[^\w\-]/g, "_");
  doc.save(`${safe}.pdf`);
}
