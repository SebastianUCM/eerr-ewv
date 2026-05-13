/**
 * Añade cuotasPagadas a cada porPeriodo (progresión hacia la fecha más reciente).
 * node scripts/inject-cuotas-pagadas.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "..", "src", "assets", "data", "detalle_deuda_leasing.json");

const data = JSON.parse(fs.readFileSync(file, "utf8"));
const order = (data.opcionesAcumulado || [])
  .map((o) => o.periodo)
  .sort();

for (const c of data.creditos || []) {
  const N = Number(c.numeroCuotas) || 1;
  const seed = [...(c.id || "")].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  order.forEach((p, j) => {
    const t = (j + 1) / Math.max(order.length, 1);
    const paid = Math.min(
      N,
      Math.max(
        0,
        Math.round(N * (0.12 + t * 0.42) + (seed % 7) - 2)
      )
    );
    if (!c.porPeriodo[p]) return;
    c.porPeriodo[p].cuotasPagadas = paid;
  });
}

fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
console.log("cuotasPagadas inyectadas en", file);
