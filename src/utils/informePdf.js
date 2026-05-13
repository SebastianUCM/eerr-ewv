import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * Captura un elemento DOM a PDF multipágina (Carta / Letter vertical).
 * Márgenes amplios, fondo blanco y escala alta para texto y gráficos nítidos.
 *
 * @param {HTMLElement} element
 * @param {string} fileBaseName - sin extensión
 */
export async function descargarInformePdf(element, fileBaseName = "informe") {
  if (!element) return;

  const marginMm = 10;
  const scale = Math.min(2.25, Math.max(2, (window.devicePixelRatio || 1) * 1.25));

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    scrollX: 0,
    scrollY: -window.scrollY,
    onclone(clonedDoc) {
      const root = clonedDoc.querySelector(".informe-pdf-root");
      if (root) {
        root.style.boxShadow = "none";
        root.style.border = "none";
        root.style.borderRadius = "0";
        root.style.overflow = "visible";
      }
    },
  });

  const imgData = canvas.toDataURL("image/png", 1);
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "letter", compress: true });
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const imgWidth = pageWidth - marginMm * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = marginMm;

  pdf.addImage(imgData, "PNG", marginMm, position, imgWidth, imgHeight);
  heightLeft -= pageHeight - marginMm * 2;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight + marginMm;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", marginMm, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - marginMm * 2;
  }

  const safe = String(fileBaseName).replace(/[^\w\-]/g, "_");
  pdf.save(`${safe}.pdf`);
}
