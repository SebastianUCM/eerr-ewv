// Softland registra la sobretasa en la misma cuenta que las contribuciones
// (5-2-01-07-001); solo la glosa del pago la distingue ("PAGO CUOTA n DE 4 SOBRETASA").
// Estas funciones separan el monto usando el detalle de movimientos, que suma
// exactamente lo mismo que datos_vue.json por empresa + año + mes + centro.

export const CUENTA_CONTRIBUCIONES = "5-2-01-07-001";
export const NOMBRE_SOBRETASA = "SOBRETASA (en cuenta CONTRIBUCIONES)";

export const esGlosaSobretasa = (glosa) => /SOBRETASA/i.test(String(glosa || ""));

const centroDe = (c) => String(c ?? "").trim() || "000";
const clave = (emp, anio, mes, centro) => `${String(emp).trim()}|${Number(anio)}|${Number(mes)}|${centroDe(centro)}`;

/** Monto de sobretasa por empresa|año|mes|centro, desde el detalle de movimientos. */
export function sobretasaPorClave(detalle) {
  const m = new Map();
  for (const r of detalle || []) {
    if (String(r.CodigoCuenta).trim() !== CUENTA_CONTRIBUCIONES || !esGlosaSobretasa(r.Glosa)) continue;
    const k = clave(r.Empresa, r.Anio, r.Mes, r.CodigoCentroCosto);
    m.set(k, (m.get(k) || 0) + (Number(r.SaldoNeto) || 0));
  }
  return m;
}

/**
 * Filas de datos_vue.json con la cuenta de contribuciones partida en dos: lo que no es
 * sobretasa queda en la fila original y la sobretasa en una fila nueva con
 * NombreCuenta = NOMBRE_SOBRETASA (misma cuenta y centro). El total no cambia.
 */
export function separarSobretasaEnFilas(filas, porClave) {
  const out = [];
  const usadas = new Set();
  for (const d of filas || []) {
    if (String(d.CodigoCuenta).trim() !== CUENTA_CONTRIBUCIONES) {
      out.push(d);
      continue;
    }
    const k = clave(d.Empresa, d.Anio, d.Mes, d.CodigoCentroCosto);
    const monto = usadas.has(k) ? 0 : porClave.get(k) || 0;
    usadas.add(k);
    if (!monto) {
      out.push(d);
      continue;
    }
    out.push({ ...d, SaldoNeto: Number(d.SaldoNeto || 0) - monto });
    out.push({ ...d, NombreCuenta: NOMBRE_SOBRETASA, SaldoNeto: monto });
  }
  return out;
}
