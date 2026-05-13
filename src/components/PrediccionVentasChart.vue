<template>
  <div v-if="tieneDatos" class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <h2 class="text-lg font-semibold text-gray-800 mb-1">
      Ventas: histórico vs pronóstico (6 meses)
      <span class="text-sm font-normal text-gray-500">— {{ empresa }}</span>
    </h2>
    <p class="text-sm text-gray-500 mb-4">
      <span class="font-mono text-gray-700">{{ metaModelo }}</span>
      · Línea sólida: observado · Línea punteada: pronóstico · Sombreado: intervalo (IC)
    </p>
    <VueApexCharts type="line" height="400" :options="chartOptions" :series="chartSeries" />
  </div>
  <div
    v-else
    class="bg-gray-50 p-6 rounded-xl border border-dashed border-gray-200 text-sm text-gray-500"
  >
    Sin predicciones para <strong>{{ empresa }}</strong>. Ejecuta
    <code class="bg-white px-1 rounded">python script/extract_historico.py {{ empresa }}</code>
    y luego
    <code class="bg-white px-1 rounded">python script/predecir_ventas.py {{ empresa }}</code>
    (o <code class="bg-white px-1 rounded">update_all.py</code>).
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import VueApexCharts from "vue3-apexcharts";

const props = defineProps({
  empresa: { type: String, required: true },
});

const prediccionesUrls = import.meta.glob("../assets/data/*/predicciones.json", {
  query: "?url",
  import: "default",
  eager: true,
});

function urlPredicciones(empresa) {
  const key = Object.keys(prediccionesUrls).find((k) =>
    k.replace(/\\/g, "/").includes(`/${empresa}/predicciones.json`)
  );
  return key ? prediccionesUrls[key] : null;
}

const payload = ref(null);

async function cargar() {
  payload.value = null;
  const url = urlPredicciones(props.empresa);
  if (!url) return;
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (r.ok) payload.value = await r.json();
  } catch {
    payload.value = null;
  }
}

watch(() => props.empresa, cargar, { immediate: true });

const tieneDatos = computed(() => {
  const h = payload.value?.ventas?.historico?.length ?? 0;
  const p = payload.value?.ventas?.pronostico?.length ?? 0;
  return h > 0 && p > 0;
});

const metaModelo = computed(() => payload.value?.meta?.modelo ?? "—");

const categories = computed(() => {
  if (!tieneDatos.value) return [];
  const hist = payload.value.ventas.historico;
  const pr = payload.value.ventas.pronostico;
  const catSet = new Set();
  hist.forEach((x) => catSet.add(x.periodo));
  pr.forEach((x) => catSet.add(x.periodo));
  return [...catSet].sort();
});

const chartSeries = computed(() => {
  if (!tieneDatos.value) return [];
  const hist = payload.value.ventas.historico;
  const pr = payload.value.ventas.pronostico;
  const cats = categories.value;

  const hMap = Object.fromEntries(hist.map((x) => [x.periodo, x.y]));
  const midMap = Object.fromEntries(pr.map((x) => [x.periodo, x.yhat]));
  const loMap = Object.fromEntries(pr.map((x) => [x.periodo, x.yhat_lower]));
  const hiMap = Object.fromEntries(pr.map((x) => [x.periodo, x.yhat_upper]));

  const histData = cats.map((c) => (hMap[c] != null ? hMap[c] : null));
  const midData = cats.map((c) => (midMap[c] != null ? midMap[c] : null));
  const rangeData = cats.map((c) => {
    const lo = loMap[c];
    const hi = hiMap[c];
    if (lo == null || hi == null) return null;
    return [lo, hi];
  });

  return [
    { name: "Histórico", type: "line", data: histData },
    { name: "Pronóstico", type: "line", data: midData },
    { name: "IC aprox.", type: "rangeArea", data: rangeData },
  ];
});

const chartOptions = computed(() => ({
  chart: {
    fontFamily: "inherit",
    toolbar: { show: false },
    zoom: { enabled: false },
  },
  dataLabels: { enabled: false },
  stroke: {
    curve: "smooth",
    width: [3, 3, 0],
    dashArray: [0, 8, 0],
  },
  fill: {
    opacity: [1, 1, 0.35],
    type: "solid",
  },
  colors: ["#2563eb", "#db2777", "#93c5fd"],
  xaxis: {
    categories: categories.value,
    labels: { rotate: -45, style: { fontSize: "11px" } },
  },
  yaxis: {
    labels: {
      formatter: (v) =>
        v != null ? "$" + new Intl.NumberFormat("es-CL").format(Math.round(v)) : "",
    },
  },
  tooltip: {
    shared: true,
    intersect: false,
    y: {
      formatter: (v) =>
        v != null ? "$" + new Intl.NumberFormat("es-CL").format(Math.round(v)) : "",
    },
  },
  legend: { show: true, position: "top" },
  markers: { size: [3, 3, 0] },
}));
</script>
