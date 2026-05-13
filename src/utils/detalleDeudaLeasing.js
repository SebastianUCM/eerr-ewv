import datosMock from "../assets/data/detalle_deuda_leasing.json";

/**
 * Devuelve el detalle de deuda/leasing para la empresa.
 * Ahora: mismo JSON mock para todas las empresas.
 * Siguiente paso: `import(\`../assets/data/${empresa}/detalle_deuda_leasing.json\`)`
 * o fetch a API. Estructura: cada crédito con `institucion`, `numeroCuotas`,
 * y `porPeriodo[YYYY-MM]`: `cuotasPagadas`, `cortoPlazo` / `largoPlazo` (cuota, pagados, saldos).
 *
 * @param {string} empresa
 */
export function getDetalleDeudaLeasing(empresa) {
  return {
    ...datosMock,
    empresa,
  };
}
