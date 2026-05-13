/**
 * Genera detalle_deuda_leasing.json unificado:
 * cada crédito tiene cortoPlazo + largoPlazo, institución y número de cuotas.
 * Ejecutar: node scripts/build-detalle-deuda-leasing.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "src", "assets", "data", "detalle_deuda_leasing.json");

const raw = JSON.parse(fs.readFileSync(src, "utf8"));
const periods = raw.opcionesAcumulado.map((o) => o.periodo);

const cp = raw.creditos.filter((c) => c.plazo === "corto");
const lp = raw.creditos.filter((c) => c.plazo === "largo");

const bancos = [
  "Banco de Chile",
  "Banco Estado",
  "Banco Santander Chile",
  "Scotiabank Chile",
  "Banco BCI",
  "Itaú Chile",
  "Banco Security",
  "Banco Consorcio",
  "HSBC Bank (Chile)",
  "Banco Internacional",
];

function synthCortoFromLp(lpCred, fracCuota = 0.12) {
  const cuotaC = Math.max(
    Math.round((lpCred.cuota || 1e6) * fracCuota),
    150000
  );
  const out = { ...lpCred, cuota: cuotaC, porPeriodo: {} };
  for (const p of periods) {
    const row = lpCred.porPeriodo[p];
    if (!row) continue;
    const f = 0.08 + (lpCred.id.length % 7) * 0.01;
    out.porPeriodo[p] = {
      cuota: cuotaC,
      pagadoAcumulado: Math.round(row.pagadoAcumulado * f),
      capitalAcumulado: Math.round(row.capitalAcumulado * f),
      interesAcumulado: Math.round(row.interesAcumulado * f),
      saldoInsoluto: Math.round(row.saldoInsoluto * f),
    };
  }
  return out;
}

/** @type {any[]} */
const creditos = [];

for (let i = 0; i < 6; i++) {
  const a = cp[i];
  const b = lp[i];
  const nCuotas = 24 + ((i * 7) % 48) + 12;
  creditos.push({
    id: `LEA-${String(i + 1).padStart(3, "0")}`,
    nombre: `${a.nombre} — ${b.nombre}`,
    institucion: bancos[i % bancos.length],
    numeroCuotas: nCuotas,
    porPeriodo: Object.fromEntries(
      periods.map((p) => {
        const vc = a.porPeriodo[p];
        const vl = b.porPeriodo[p];
        return [
          p,
          {
            cortoPlazo: {
              cuota: a.cuota,
              pagadoAcumulado: vc.pagadoAcumulado,
              capitalAcumulado: vc.capitalAcumulado,
              interesAcumulado: vc.interesAcumulado,
              saldoInsoluto: vc.saldoInsoluto,
            },
            largoPlazo: {
              cuota: b.cuota,
              pagadoAcumulado: vl.pagadoAcumulado,
              capitalAcumulado: vl.capitalAcumulado,
              interesAcumulado: vl.interesAcumulado,
              saldoInsoluto: vl.saldoInsoluto,
            },
          },
        ];
      })
    ),
  });
}

for (let j = 6; j < 11; j++) {
  const b = lp[j];
  const synth = synthCortoFromLp(b, 0.11);
  const idx = creditos.length;
  creditos.push({
    id: `LEA-${String(idx + 1).padStart(3, "0")}`,
    nombre: b.nombre,
    institucion: bancos[j % bancos.length],
    numeroCuotas: 36 + ((j * 5) % 36),
    porPeriodo: Object.fromEntries(
      periods.map((p) => [
        p,
        {
          cortoPlazo: {
            cuota: synth.porPeriodo[p].cuota,
            pagadoAcumulado: synth.porPeriodo[p].pagadoAcumulado,
            capitalAcumulado: synth.porPeriodo[p].capitalAcumulado,
            interesAcumulado: synth.porPeriodo[p].interesAcumulado,
            saldoInsoluto: synth.porPeriodo[p].saldoInsoluto,
          },
          largoPlazo: {
            cuota: b.cuota,
            pagadoAcumulado: b.porPeriodo[p].pagadoAcumulado,
            capitalAcumulado: b.porPeriodo[p].capitalAcumulado,
            interesAcumulado: b.porPeriodo[p].interesAcumulado,
            saldoInsoluto: b.porPeriodo[p].saldoInsoluto,
          },
        },
      ])
    ),
  });
}

for (let k = 0; k < 6; k++) {
  const a = cp[k];
  const synth = synthCortoFromLp(
    { ...lp[Math.min(k + 5, 10)], id: "x", porPeriodo: lp[Math.min(k + 5, 10)].porPeriodo },
    0.92
  );
  synth.porPeriodo = {};
  for (const p of periods) {
    const row = a.porPeriodo[p];
    const f = 0.88;
    synth.porPeriodo[p] = {
      cuota: Math.round(a.cuota * 0.15),
      pagadoAcumulado: Math.round(row.pagadoAcumulado * f),
      capitalAcumulado: Math.round(row.capitalAcumulado * f),
      interesAcumulado: Math.round(row.interesAcumulado * f),
      saldoInsoluto: Math.round(row.saldoInsoluto * f),
    };
  }
  const idx = creditos.length;
  creditos.push({
    id: `LEA-${String(idx + 1).padStart(3, "0")}`,
    nombre: `${a.nombre} (contrato complementario)`,
    institucion: bancos[(k + 3) % bancos.length],
    numeroCuotas: 18 + ((k * 4) % 24),
    porPeriodo: Object.fromEntries(
      periods.map((p) => {
        const row = a.porPeriodo[p];
        const vl = lp[Math.min(k + 4, 10)].porPeriodo[p];
        const f = 0.12;
        return [
          p,
          {
            cortoPlazo: {
              cuota: a.cuota,
              pagadoAcumulado: row.pagadoAcumulado,
              capitalAcumulado: row.capitalAcumulado,
              interesAcumulado: row.interesAcumulado,
              saldoInsoluto: row.saldoInsoluto,
            },
            largoPlazo: {
              cuota: Math.round(lp[Math.min(k + 4, 10)].cuota * 0.18),
              pagadoAcumulado: Math.round(vl.pagadoAcumulado * f),
              capitalAcumulado: Math.round(vl.capitalAcumulado * f),
              interesAcumulado: Math.round(vl.interesAcumulado * f),
              saldoInsoluto: Math.round(vl.saldoInsoluto * f),
            },
          },
        ];
      })
    ),
  });
}

const out = {
  meta: {
    ...raw.meta,
    nota:
      "Datos ficticios. Cada crédito clasifica obligación en corto y largo plazo, con institución financiera y número de cuotas totales del contrato.",
  },
  opcionesAcumulado: raw.opcionesAcumulado,
  creditos,
};

fs.writeFileSync(src, JSON.stringify(out, null, 2), "utf8");
console.log("OK:", creditos.length, "créditos escritos en", src);
