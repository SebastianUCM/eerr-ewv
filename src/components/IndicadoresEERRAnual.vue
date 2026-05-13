<template>
  <div class="min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-slate-800">
    <header class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Indicadores EERR Anuales</h1>
        <p class="text-sm text-slate-500 mt-1">Comparativa histórica anual por indicador — {{ props.empresa }}</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex items-center gap-3">
        <label class="text-xs font-semibold uppercase text-slate-500">Años visibles:</label>
        <select
          v-model.number="rangoAnios"
          class="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        >
          <option :value="3">Últimos 3</option>
          <option :value="5">Últimos 5</option>
          <option :value="8">Últimos 8</option>
          <option :value="99">Todos</option>
        </select>
        <label class="text-xs font-semibold uppercase text-slate-500 ml-2">Norma Balance:</label>
        <select
          v-model="normaBalance"
          class="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        >
          <option value="Trib">Trib</option>
          <option value="IFRS">IFRS</option>
        </select>
        <label class="text-xs font-semibold uppercase text-slate-500 ml-2">Tipo EERR:</label>
        <select
          v-model="tipoEerr"
          class="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        >
          <option value="financiero">Financiero</option>
          <option value="contable">Contable</option>
        </select>
        <label class="text-xs font-semibold uppercase text-slate-500 ml-2">Vista:</label>
        <select
          v-model="modoVista"
          class="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        >
          <option value="todos">Todos</option>
          <option value="montos">Solo montos</option>
          <option value="ratios">Solo ratios</option>
        </select>
      </div>
    </header>

    <div v-if="!serieKpisAnual.length" class="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm">
      No hay datos EERR mapeados para esta empresa.
    </div>

    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div
          v-for="item in resumenIndicadoresFiltrados"
          :key="item.key"
          class="rounded-xl bg-white border border-slate-200 shadow-sm p-4"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="text-[11px] uppercase tracking-wider font-bold text-slate-500">{{ item.label }}</p>
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border"
              :class="item.meta?.tipoRatio ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-sky-50 text-sky-700 border-sky-200'"
            >
              {{ item.meta?.tipoRatio ? "Ratio" : "Monto" }}
            </span>
          </div>
          <p class="text-xl font-bold mt-1 text-slate-900">{{ formatearValorMeta(item.meta, item.actual) }}</p>
          <p class="text-[11px] mt-1 text-slate-500">Año anterior: {{ formatearValorMeta(item.meta, item.anterior) }}</p>
          <p class="text-[11px] font-semibold mt-0.5" :class="item.claseVar">{{ item.textoVar }}</p>
          <p class="text-[10px] mt-1 text-slate-400">Año base: {{ ultimoAnio }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div v-if="mostrarMontos" class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 class="font-bold text-slate-800 mb-3">Evolución anual KPIs principales</h2>
          <VueApexCharts
            :key="`eerr-main-${chartRemountKey}`"
            type="line"
            height="320"
            :options="chartMainOptions"
            :series="chartMainSeries"
          />
        </div>
        <div v-if="mostrarMontos" class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 class="font-bold text-slate-800 mb-3">Comparativa anual KPIs complementarios</h2>
          <VueApexCharts
            :key="`eerr-secondary-${chartRemountKey}`"
            type="bar"
            height="320"
            :options="chartSecondaryOptions"
            :series="chartSecondarySeries"
          />
        </div>
      </div>
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div v-if="mostrarMontos" class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 class="font-bold text-slate-800 mb-3">KPIs de Balance (monto)</h2>
          <VueApexCharts
            :key="`eerr-balance-amt-${chartRemountKey}`"
            type="bar"
            height="320"
            :options="chartBalanceAmountOptions"
            :series="chartBalanceAmountSeries"
          />
        </div>
        <div v-if="mostrarRatios" class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 class="font-bold text-slate-800 mb-3">Ratios de Balance</h2>
          <VueApexCharts
            :key="`eerr-balance-ratio-${chartRemountKey}`"
            type="line"
            height="320"
            :options="chartBalanceRatioOptions"
            :series="chartBalanceRatioSeries"
          />
        </div>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wide">Tabla comparativa anual de indicadores</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-[980px] w-full text-xs border-collapse">
            <thead class="bg-slate-100">
              <tr class="border-b border-slate-300 text-slate-700">
                <th class="px-4 py-3 text-left font-bold min-w-[14rem]">Indicador</th>
                <th v-for="anio in aniosMostrados" :key="`th-${anio}`" class="px-3 py-3 text-right font-bold min-w-[8rem]">
                  {{ anio }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="meta in metricasFiltradasTabla" :key="meta.key" class="border-b border-slate-100">
                <td class="px-4 py-2.5">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-slate-700">{{ meta.label }}</span>
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                      :class="meta.tipoRatio ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-sky-50 text-sky-700 border-sky-200'"
                    >
                      {{ meta.tipoRatio ? "Ratio" : "Monto" }}
                    </span>
                  </div>
                </td>
                <td
                  v-for="anio in aniosMostrados"
                  :key="`${meta.key}-${anio}`"
                  class="px-3 py-2.5 text-right font-mono"
                  :class="obtenerValorMetaAnual(meta, anio) < 0 ? 'text-rose-600' : 'text-slate-800'"
                >
                  {{ formatearValorMeta(meta, obtenerValorMetaAnual(meta, anio)) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import eerrDataRaw from "../assets/datos_vue.json";
import mapeoCuentas from "../assets/config/mapeo_cuentas.json";
import mapeoDeuda from "../assets/config/mapeo_deuda.json";
import { computeKpiDeudaSobreEbitda } from "../utils/kpiActivosDeudaEbitda.js";
import { calcularKpisDesdeRows } from "../utils/kpiEerr.js";
import VueApexCharts from "vue3-apexcharts";

const props = defineProps({
  empresa: { type: String, required: true },
});

const rangoAnios = ref(5);
const normaBalance = ref("Trib");
const tipoEerr = ref("financiero");
const modoVista = ref("todos");
const STORAGE_KEY_MODO_VISTA = "eerrIndicadores.modoVista";

/** Fuerza remount de ApexCharts al cambiar filtros (evita leyendas duplicadas por update in-place). */
const chartRemountKey = computed(
  () => `${props.empresa}-${tipoEerr.value}-${normaBalance.value}-${rangoAnios.value}`
);

const METRICAS_META = [
  { key: "ingresos", label: "Ingresos acumulados", mejoraCuandoSube: true, compararAbs: false },
  { key: "gastos", label: "Gastos acumulados", mejoraCuandoSube: false, compararAbs: true },
  { key: "ebitda", label: "EBITDA", mejoraCuandoSube: true, compararAbs: false },
  { key: "resultado", label: "Resultado del ejercicio", mejoraCuandoSube: true, compararAbs: false },
  { key: "margenBruto", label: "Margen bruto", mejoraCuandoSube: true, compararAbs: false },
  { key: "ingresosFinancieros", label: "Ingresos financieros", mejoraCuandoSube: true, compararAbs: false },
  { key: "contribuciones", label: "Contribuciones", mejoraCuandoSube: false, compararAbs: true },
  { key: "patenteMunicipal", label: "Patente municipal", mejoraCuandoSube: false, compararAbs: true },
  { key: "deudaTotalBalance", label: "Deuda total (balance)", mejoraCuandoSube: false, compararAbs: true },
  { key: "activoTotalBalance", label: "Activos totales (balance)", mejoraCuandoSube: true, compararAbs: false },
  { key: "liquidezCorriente", label: "Liquidez corriente", mejoraCuandoSube: true, compararAbs: false, tipoRatio: true },
  { key: "endeudamiento", label: "Endeudamiento (Pasivo/Patrimonio)", mejoraCuandoSube: false, compararAbs: false, tipoRatio: true },
  { key: "ratioDeudaEbitda", label: "Deuda/EBITDA", mejoraCuandoSube: false, compararAbs: false, tipoRatio: true },
];

function normAnio(v) {
  return Number(v);
}

function normMes(v) {
  const n = Number(v);
  if (n >= 1 && n <= 12) return n;
  const x = parseInt(String(v || "").trim().replace(/^0+/, "") || "0", 10);
  return x >= 1 && x <= 12 ? x : 1;
}

const datosEmpresa = computed(() =>
  eerrDataRaw.filter((d) => String(d.Empresa).trim() === String(props.empresa).trim())
);

const aniosDisponibles = computed(() => {
  const set = new Set(datosEmpresa.value.map((d) => normAnio(d.Anio)));
  return Array.from(set).sort((a, b) => a - b);
});

const aniosMostrados = computed(() => {
  if (rangoAnios.value >= 99) return [...aniosDisponibles.value];
  return aniosDisponibles.value.slice(-rangoAnios.value);
});

function mapearDatosAnio(anioObjetivo) {
  const configEmpresa = mapeoCuentas?.empresas?.[props.empresa];
  if (!configEmpresa) return [];
  const mapCuentas = configEmpresa.cuentas || {};
  const rows = [];

  for (const d of datosEmpresa.value) {
    if (normAnio(d.Anio) !== Number(anioObjetivo)) continue;
    const cod = String(d.CodigoCuenta ?? "").trim();
    if (!cod) continue;
    const cfg = mapCuentas[cod];
    if (!cfg) continue;
    const tiposCuenta = Array.isArray(cfg.eerr) ? cfg.eerr : ["financiero", "contable"];
    if (!tiposCuenta.includes(tipoEerr.value)) continue;

    rows.push({
      ...d,
      Categoria: cfg.categoria,
      Subitem: cfg.subitem,
      Mes: normMes(d.Mes),
      SaldoNeto: Number(d.SaldoNeto ?? 0),
    });
  }
  return rows;
}

function codigoNormalizado(codigoCuenta) {
  return String(codigoCuenta || "").replace(/[^0-9]/g, "");
}

function obtenerSetsDeudaEmpresa() {
  const cfgEmpresa = mapeoDeuda?.empresas?.[props.empresa] || {};
  const totalSet = new Set(((cfgEmpresa.cuentas_deuda_total || [])).map((c) => codigoNormalizado(c)));
  const cpSet = new Set(((cfgEmpresa.cuentas_deuda_cp || [])).map((c) => codigoNormalizado(c)));
  const lpSet = new Set(((cfgEmpresa.cuentas_deuda_lp || [])).map((c) => codigoNormalizado(c)));
  return { totalSet, cpSet, lpSet };
}

function calcularKpisBalanceAnio(anio) {
  const rows = datosEmpresa.value.filter((d) => {
    if (normAnio(d.Anio) !== Number(anio)) return false;
    if (normMes(d.Mes) > 12) return false;
    return normaBalance.value === "IFRS" ? d.NormaIFRS === "S" : d.NormaTrib === "S";
  });

  let activoTotal = 0;
  let pasivoTotal = 0;
  let patrimonioTotal = 0;
  let activoCorriente = 0;
  let pasivoCorriente = 0;
  let deudaCortoPlazo = 0;
  let deudaLargoPlazo = 0;
  const { totalSet: deudaCodigos, cpSet: deudaCpCodigos, lpSet: deudaLpCodigos } = obtenerSetsDeudaEmpresa();
  const usarClasificacionExplicita = deudaCpCodigos.size > 0 || deudaLpCodigos.size > 0;

  rows.forEach((d) => {
    const saldo = Number(d.SaldoNeto || 0);
    const cod = codigoNormalizado(d.CodigoCuenta);
    const pref1 = cod.charAt(0);
    const pref2 = cod.slice(0, 2);

    if (pref1 === "1") activoTotal += saldo;
    if (pref1 === "2") pasivoTotal += Math.abs(saldo);
    if (pref1 === "3") patrimonioTotal += Math.abs(saldo);
    if (pref2 === "11") activoCorriente += saldo;
    if (pref2 === "21") pasivoCorriente += Math.abs(saldo);
    if (deudaCodigos.has(cod)) {
      if (usarClasificacionExplicita) {
        if (deudaCpCodigos.has(cod)) deudaCortoPlazo += Math.abs(saldo);
        else if (deudaLpCodigos.has(cod)) deudaLargoPlazo += Math.abs(saldo);
      } else {
        // Fallback para mapeos antiguos sin CP/LP explicito.
        if (pref2 === "21") deudaCortoPlazo += Math.abs(saldo);
        else if (pref2 === "22") deudaLargoPlazo += Math.abs(saldo);
        else deudaLargoPlazo += Math.abs(saldo);
      }
    }
  });

  const liquidezCorriente = pasivoCorriente > 0 ? activoCorriente / pasivoCorriente : null;
  const endeudamiento = patrimonioTotal > 0 ? pasivoTotal / patrimonioTotal : null;
  const deudaKpi = computeKpiDeudaSobreEbitda(props.empresa, `${anio}-12`, normaBalance.value, tipoEerr.value);

  return {
    activoTotalBalance: activoTotal,
    pasivoTotalBalance: pasivoTotal,
    patrimonioTotalBalance: patrimonioTotal,
    activoCorrienteBalance: activoCorriente,
    pasivoCorrienteBalance: pasivoCorriente,
    deudaTotalBalance: Number(deudaKpi?.deudaTotal || 0),
    deudaCortoPlazoBalance: deudaCortoPlazo,
    deudaLargoPlazoBalance: deudaLargoPlazo,
    ratioDeudaEbitda: Number.isFinite(deudaKpi?.ratio) ? deudaKpi.ratio : null,
    liquidezCorriente,
    endeudamiento,
  };
}

const serieKpisAnual = computed(() =>
  aniosMostrados.value.map((anio) => ({
    anio,
    ...calcularKpisDesdeRows(mapearDatosAnio(anio)),
    ...calcularKpisBalanceAnio(anio),
  }))
);

const ultimoAnio = computed(() => (serieKpisAnual.value.length ? serieKpisAnual.value[serieKpisAnual.value.length - 1].anio : null));

function valorAnual(anio, key) {
  const row = serieKpisAnual.value.find((x) => x.anio === anio);
  return Number(row?.[key] ?? 0);
}

function obtenerValorMetaAnual(meta, anio) {
  const row = serieKpisAnual.value.find((x) => x.anio === anio);
  if (meta?.tipoRatio) {
    const raw = row?.[meta.key];
    return raw == null ? null : Number(raw);
  }
  return Number(row?.[meta.key] ?? 0);
}

function variacionPct(actual, anterior, compararAbs = false) {
  if (actual === null || anterior === null) return null;
  const actualNorm = compararAbs ? Math.abs(actual) : actual;
  const anteriorNorm = compararAbs ? Math.abs(anterior) : anterior;
  if (!Number.isFinite(anteriorNorm) || anteriorNorm === 0) return null;
  return ((actualNorm - anteriorNorm) / Math.abs(anteriorNorm)) * 100;
}

function claseVariacion(variacion, mejoraCuandoSube) {
  if (variacion === null) return "text-slate-500";
  const mejora = mejoraCuandoSube ? variacion >= 0 : variacion <= 0;
  return mejora ? "text-emerald-600" : "text-rose-600";
}

function textoVariacion(variacion) {
  if (variacion === null) return "• Var: N/A";
  const signo = variacion > 0 ? "+" : "";
  const flecha = variacion >= 0 ? "▲" : "▼";
  return `${flecha} Var: ${signo}${variacion.toFixed(1)}%`;
}

const resumenIndicadores = computed(() => {
  if (!serieKpisAnual.value.length) return [];
  const actual = serieKpisAnual.value[serieKpisAnual.value.length - 1];
  const anterior = serieKpisAnual.value.length > 1 ? serieKpisAnual.value[serieKpisAnual.value.length - 2] : null;
  return METRICAS_META.map((meta) => {
    const actualValRaw = meta.tipoRatio ? (actual?.[meta.key] ?? null) : Number(actual?.[meta.key] ?? 0);
    const anteriorValRaw = meta.tipoRatio ? (anterior?.[meta.key] ?? null) : Number(anterior?.[meta.key] ?? 0);
    const varPct = variacionPct(actualValRaw, anteriorValRaw, meta.compararAbs);
    return {
      key: meta.key,
      label: meta.label,
      meta,
      actual: actualValRaw,
      anterior: anteriorValRaw,
      textoVar: textoVariacion(varPct),
      claseVar: claseVariacion(varPct, meta.mejoraCuandoSube),
    };
  });
});

const chartMainSeries = computed(() => [
  { name: "Ingresos", data: serieKpisAnual.value.map((r) => r.ingresos) },
  { name: "Gastos", data: serieKpisAnual.value.map((r) => Math.abs(r.gastos)) },
  { name: "EBITDA", data: serieKpisAnual.value.map((r) => r.ebitda) },
  { name: "Resultado", data: serieKpisAnual.value.map((r) => r.resultado) },
]);

const chartMainOptions = computed(() => ({
  chart: { type: "line", toolbar: { show: false }, fontFamily: "inherit" },
  stroke: { width: 2, curve: "smooth" },
  colors: ["#10B981", "#EF4444", "#8B5CF6", "#0EA5E9"],
  xaxis: { categories: aniosMostrados.value.map(String) },
  yaxis: { labels: { formatter: (val) => "$" + (val / 1000000).toFixed(1) + "M" } },
  tooltip: { y: { formatter: (val) => formatCLP(val) } },
  legend: { position: "top" },
}));

const chartSecondarySeries = computed(() => [
  { name: "Margen bruto", data: serieKpisAnual.value.map((r) => r.margenBruto) },
  { name: "Ing. financieros", data: serieKpisAnual.value.map((r) => r.ingresosFinancieros) },
  { name: "Contribuciones (abs)", data: serieKpisAnual.value.map((r) => Math.abs(r.contribuciones)) },
  { name: "Patente (abs)", data: serieKpisAnual.value.map((r) => Math.abs(r.patenteMunicipal)) },
]);

const chartSecondaryOptions = computed(() => ({
  chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit" },
  plotOptions: { bar: { columnWidth: "45%", borderRadius: 3 } },
  colors: ["#14B8A6", "#06B6D4", "#D946EF", "#F59E0B"],
  dataLabels: { enabled: false },
  xaxis: { categories: aniosMostrados.value.map(String) },
  yaxis: { labels: { formatter: (val) => "$" + (val / 1000000).toFixed(1) + "M" } },
  tooltip: { y: { formatter: (val) => formatCLP(val) } },
  legend: { position: "top" },
}));

const chartBalanceAmountSeries = computed(() => [
  { name: "Activos", data: serieKpisAnual.value.map((r) => r.activoTotalBalance) },
  { name: "Pasivos", data: serieKpisAnual.value.map((r) => r.pasivoTotalBalance) },
  { name: "Deuda total", data: serieKpisAnual.value.map((r) => r.deudaTotalBalance) },
]);

const chartBalanceAmountOptions = computed(() => ({
  chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit" },
  plotOptions: { bar: { columnWidth: "45%", borderRadius: 3 } },
  colors: ["#0EA5E9", "#EF4444", "#7C3AED"],
  dataLabels: { enabled: false },
  xaxis: { categories: aniosMostrados.value.map(String) },
  yaxis: { labels: { formatter: (val) => "$" + (val / 1000000).toFixed(1) + "M" } },
  tooltip: {
    custom: ({ series, seriesIndex, dataPointIndex, w }) => {
      const serieNombre = w.config.series?.[seriesIndex]?.name || "";
      const valor = Number(series?.[seriesIndex]?.[dataPointIndex] ?? 0);
      const anio = aniosMostrados.value[dataPointIndex];

      if (serieNombre === "Deuda total") {
        const punto = serieKpisAnual.value[dataPointIndex];
        const cp = Number(punto?.deudaCortoPlazoBalance ?? 0);
        const lp = Number(punto?.deudaLargoPlazoBalance ?? 0);
        return `
          <div style="padding:8px 10px; font-size:12px;">
            <div style="font-weight:600; margin-bottom:4px;">Deuda total (${anio})</div>
            <div>Total: ${formatCLP(valor)}</div>
            <div>CP: ${formatCLP(cp)}</div>
            <div>LP: ${formatCLP(lp)}</div>
          </div>
        `;
      }

      return `
        <div style="padding:8px 10px; font-size:12px;">
          <div style="font-weight:600; margin-bottom:4px;">${serieNombre} (${anio})</div>
          <div>${formatCLP(valor)}</div>
        </div>
      `;
    },
  },
  legend: { position: "top" },
}));

const chartBalanceRatioSeries = computed(() => [
  { name: "Liquidez corriente", data: serieKpisAnual.value.map((r) => r.liquidezCorriente) },
  { name: "Endeudamiento", data: serieKpisAnual.value.map((r) => r.endeudamiento) },
  { name: "Deuda/EBITDA", data: serieKpisAnual.value.map((r) => r.ratioDeudaEbitda) },
]);

const chartBalanceRatioOptions = computed(() => ({
  chart: { type: "line", toolbar: { show: false }, fontFamily: "inherit" },
  stroke: { width: 2, curve: "smooth" },
  colors: ["#14B8A6", "#F97316", "#8B5CF6"],
  xaxis: { categories: aniosMostrados.value.map(String) },
  yaxis: { labels: { formatter: (val) => `${Number(val).toFixed(2)}x` } },
  tooltip: { y: { formatter: (val) => (val == null ? "N/A" : `${Number(val).toFixed(2)}x`) } },
  legend: { position: "top" },
}));

const formatCLP = (v) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Math.round(Number(v || 0)));

const formatRatio = (v) => (v == null || !Number.isFinite(v) ? "N/A" : `${Number(v).toFixed(2)}x`);

const formatearValorMeta = (meta, valor) => {
  if (meta?.tipoRatio) return formatRatio(valor);
  return formatCLPContable(valor);
};

const mostrarMontos = computed(() => modoVista.value === "todos" || modoVista.value === "montos");
const mostrarRatios = computed(() => modoVista.value === "todos" || modoVista.value === "ratios");

const resumenIndicadoresFiltrados = computed(() =>
  resumenIndicadores.value.filter((item) => (item.meta?.tipoRatio ? mostrarRatios.value : mostrarMontos.value))
);

const metricasFiltradasTabla = computed(() =>
  METRICAS_META.filter((meta) => (meta.tipoRatio ? mostrarRatios.value : mostrarMontos.value))
);

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY_MODO_VISTA);
  if (saved === "todos" || saved === "montos" || saved === "ratios") {
    modoVista.value = saved;
  }
});

watch(modoVista, (valor) => {
  localStorage.setItem(STORAGE_KEY_MODO_VISTA, valor);
});

const formatCLPContable = (v) => {
  if (!v || v === 0) return "-";
  const n = Math.round(Number(v));
  const abs = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(Math.abs(n));
  return n < 0 ? `(${abs})` : abs;
};
</script>
