<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <header class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">
        Dashboard Financiero — {{ empresa }}
      </h1>
      <p class="text-gray-500">Cierre al {{ fechaActual }}</p>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div
        class="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-l-emerald-500"
      >
        <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider">
          Total Activos
        </h3>
        <p class="mt-2 text-3xl font-bold text-gray-900">
          ${{ formatearDinero(totalActivos) }}
        </p>
      </div>
      <div
        class="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-l-rose-500"
      >
        <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider">
          Total Pasivos
        </h3>
        <p class="mt-2 text-3xl font-bold text-gray-900">
          ${{ formatearDinero(totalPasivos) }}
        </p>
      </div>
      <div
        class="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-l-blue-500"
      >
        <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider">
          Capital Neto
        </h3>
        <p class="mt-2 text-3xl font-bold text-gray-900">
          ${{ formatearDinero(totalActivos - totalPasivos) }}
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div
        class="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-l-cyan-500"
      >
        <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider">
          Ventas del Mes
        </h3>
        <p class="mt-2 text-3xl font-bold text-gray-900">
          ${{ formatearDinero(ventasMes) }}
        </p>
      </div>
      <div
        class="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-l-violet-500"
      >
        <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider">
          Documentos de Venta
        </h3>
        <p class="mt-2 text-3xl font-bold text-gray-900">
          {{ cantidadDocsVentas }}
        </p>
      </div>
      <div
        class="bg-white rounded-xl shadow-sm border p-6 border-l-4 border-l-amber-500"
      >
        <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider">
          Mayor Pendiente Cobranzas
        </h3>
        <p class="mt-2 text-3xl font-bold text-gray-900">
          ${{ formatearDinero(maxPendienteCobranza) }}
        </p>
      </div>
    </div>

    <PrediccionVentasChart class="mb-8" :empresa="empresa" />

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 class="text-lg font-semibold text-gray-800 mb-1">
          Estructura Financiera
        </h2>
        <p class="text-sm text-gray-500 mb-4">
          Composición del balance: Activos, Pasivos y Patrimonio (plan contable
          Softland).
        </p>

        <div
          v-if="totalEstructura > 0"
          class="grid grid-cols-3 gap-3 mb-4 text-center"
        >
          <div class="rounded-lg bg-emerald-50 px-2 py-3 border border-emerald-100">
            <p class="text-xs font-medium text-emerald-700 uppercase">Activos</p>
            <p class="text-sm font-bold text-emerald-900 mt-1">
              {{ pctActivos }}%
            </p>
            <p class="text-xs text-emerald-600 mt-1 truncate" title="Saldo">
              ${{ formatearDinero(totalActivos) }}
            </p>
          </div>
          <div class="rounded-lg bg-rose-50 px-2 py-3 border border-rose-100">
            <p class="text-xs font-medium text-rose-700 uppercase">Pasivos</p>
            <p class="text-sm font-bold text-rose-900 mt-1">
              {{ pctPasivos }}%
            </p>
            <p class="text-xs text-rose-600 mt-1 truncate">
              ${{ formatearDinero(totalPasivos) }}
            </p>
          </div>
          <div class="rounded-lg bg-blue-50 px-2 py-3 border border-blue-100">
            <p class="text-xs font-medium text-blue-700 uppercase">Patrimonio</p>
            <p class="text-sm font-bold text-blue-900 mt-1">
              {{ pctPatrimonio }}%
            </p>
            <p class="text-xs text-blue-600 mt-1 truncate">
              ${{ formatearDinero(totalPatrimonio) }}
            </p>
          </div>
        </div>

        <div
          v-else
          class="mb-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500"
        >
          Sin datos de contabilidad para graficar.
        </div>

        <div class="flex flex-wrap gap-4 mb-2 text-xs text-gray-600">
          <span
            >Endeudamiento:
            <strong class="text-gray-900">{{ ratioEndeudamiento }}%</strong>
            (Pasivos / Activos)</span
          >
          <span v-if="totalPatrimonio !== 0"
            >Apalancamiento:
            <strong class="text-gray-900">{{ ratioApalancamiento }}</strong>
            (Pasivos / Patrimonio)</span
          >
        </div>

        <VueApexCharts
          v-if="totalEstructura > 0"
          type="donut"
          height="320"
          :options="opcionesDona"
          :series="seriesDona"
        />
      </div>

      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 class="text-lg font-semibold text-gray-800 mb-4">
          Top 5 Cuentas con Mayor Saldo
        </h2>
        <VueApexCharts
          type="bar"
          height="350"
          :options="opcionesBarras"
          :series="seriesBarras"
        />
      </div>
    </div>

    <div
      class="bg-indigo-50 p-6 rounded-xl shadow-sm border border-indigo-100 mb-8"
    >
      <h2 class="text-lg font-semibold text-indigo-900 mb-2 flex items-center">
        <svg
          class="w-5 h-5 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          ></path>
        </svg>
        Análisis de IA
      </h2>
      <p class="text-indigo-800 italic">
        "{{ analisisIA || "Esperando el análisis predictivo del modelo..." }}"
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import VueApexCharts from "vue3-apexcharts";
import PrediccionVentasChart from "./PrediccionVentasChart.vue";

const props = defineProps({
  empresa: { type: String, required: true },
});

const contabilidadMod = import.meta.glob("../assets/data/*/contabilidad.json");
const ventasMod = import.meta.glob("../assets/data/*/ventas.json");
const cobranzasMod = import.meta.glob("../assets/data/*/cobranzas.json");
const iaInsightUrls = import.meta.glob("../assets/data/*/ia_insight.json", {
  query: "?url",
  import: "default",
  eager: true,
});

function findGlobKey(moduleGlob, empresa, filename) {
  const needle = `/assets/data/${empresa}/${filename}`;
  return Object.keys(moduleGlob).find((k) =>
    k.replace(/\\/g, "/").includes(needle)
  );
}

function normalizaCuentas(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw?.cuentas && Array.isArray(raw.cuentas)) return raw.cuentas;
  return [];
}

const cuentas = ref([]);
const ventas = ref({ total_mes: 0, cant_docs: 0 });
const cobranzas = ref([]);
const fechaActual = new Date().toLocaleDateString("es-CL");
const analisisIA = ref("");

async function cargarDatosEmpresa() {
  const e = props.empresa;
  const kC = findGlobKey(contabilidadMod, e, "contabilidad.json");
  const kV = findGlobKey(ventasMod, e, "ventas.json");
  const kB = findGlobKey(cobranzasMod, e, "cobranzas.json");

  try {
    if (kC && contabilidadMod[kC]) {
      const mod = await contabilidadMod[kC]();
      cuentas.value = normalizaCuentas(mod.default);
    } else {
      cuentas.value = [];
    }
  } catch {
    cuentas.value = [];
  }

  try {
    if (kV && ventasMod[kV]) {
      const mod = await ventasMod[kV]();
      ventas.value = mod.default ?? { total_mes: 0, cant_docs: 0 };
    } else {
      ventas.value = { total_mes: 0, cant_docs: 0 };
    }
  } catch {
    ventas.value = { total_mes: 0, cant_docs: 0 };
  }

  try {
    if (kB && cobranzasMod[kB]) {
      const mod = await cobranzasMod[kB]();
      const d = mod.default;
      cobranzas.value = Array.isArray(d) ? d : [];
    } else {
      cobranzas.value = [];
    }
  } catch {
    cobranzas.value = [];
  }

  analisisIA.value = "";
  const kIa = Object.keys(iaInsightUrls).find((k) =>
    k.replace(/\\/g, "/").includes(`/${e}/ia_insight.json`)
  );
  if (kIa) {
    try {
      const res = await fetch(iaInsightUrls[kIa], { cache: "no-store" });
      if (res.ok) {
        const payload = await res.json();
        analisisIA.value = payload?.comentario ?? "";
      }
    } catch {
      /* vacío */
    }
  }
}

onMounted(cargarDatosEmpresa);
watch(() => props.empresa, cargarDatosEmpresa);

const formatearDinero = (valor) =>
  new Intl.NumberFormat("es-CL").format(Math.abs(valor));

const esTipo = (c, tipo) => String(c.Tipo) === String(tipo);

const totalActivos = computed(() =>
  cuentas.value
    .filter((c) => esTipo(c, "1"))
    .reduce((acc, c) => acc + Number(c.Saldo_Actual ?? 0), 0)
);

const totalPasivos = computed(() =>
  Math.abs(
    cuentas.value
      .filter((c) => esTipo(c, "2"))
      .reduce((acc, c) => acc + Number(c.Saldo_Actual ?? 0), 0)
  )
);

/** Patrimonio / capital (plan contable tipo 3) */
const totalPatrimonio = computed(() =>
  Math.abs(
    cuentas.value
      .filter((c) => esTipo(c, "3"))
      .reduce((acc, c) => acc + Number(c.Saldo_Actual ?? 0), 0)
  )
);

// Capital Neto = Activos - Pasivos
const capitalNeto = computed(() => totalActivos.value - totalPasivos.value);

/** Total para proporciones del gráfico (magnitudes absolutas A + P + Pat) */
const totalEstructura = computed(
  () =>
    Math.abs(totalActivos.value) +
    totalPasivos.value +
    totalPatrimonio.value
);

const pctActivos = computed(() =>
  totalEstructura.value > 0
    ? ((Math.abs(totalActivos.value) / totalEstructura.value) * 100).toFixed(1)
    : "0"
);

const pctPasivos = computed(() =>
  totalEstructura.value > 0
    ? ((totalPasivos.value / totalEstructura.value) * 100).toFixed(1)
    : "0"
);

const pctPatrimonio = computed(() =>
  totalEstructura.value > 0
    ? ((totalPatrimonio.value / totalEstructura.value) * 100).toFixed(1)
    : "0"
);

/** Pasivos / Activos (endeudamiento) */
const ratioEndeudamiento = computed(() =>
  totalActivos.value !== 0
    ? ((totalPasivos.value / Math.abs(totalActivos.value)) * 100).toFixed(1)
    : "0"
);

/** Pasivos / Patrimonio (apalancamiento) */
const ratioApalancamiento = computed(() =>
  totalPatrimonio.value !== 0
    ? (totalPasivos.value / totalPatrimonio.value).toFixed(2)
    : "—"
);
const ventasMes = computed(() => Number(ventas.value?.total_mes ?? 0));
const cantidadDocsVentas = computed(() => Number(ventas.value?.cant_docs ?? 0));
const maxPendienteCobranza = computed(() => {
  if (!Array.isArray(cobranzas.value) || cobranzas.value.length === 0) return 0;
  return Math.max(...cobranzas.value.map((item) => Number(item?.pendiente ?? 0)));
});

// Gráfico de dona: Activos, Pasivos y Patrimonio (magnitudes relativas)
const seriesDona = computed(() => [
  Math.abs(totalActivos.value),
  totalPasivos.value,
  totalPatrimonio.value,
]);

const opcionesDona = computed(() => ({
  chart: {
    type: "donut",
    toolbar: { show: false },
    fontFamily: "inherit",
  },
  labels: ["Activos", "Pasivos", "Patrimonio"],
  colors: ["#10b981", "#f43f5e", "#3b82f6"],
  plotOptions: {
    pie: {
      donut: {
        size: "68%",
        labels: {
          show: true,
          name: { fontSize: "13px" },
          value: {
            fontSize: "14px",
            fontWeight: 600,
            formatter: (val) =>
              `$${new Intl.NumberFormat("es-CL").format(Math.round(Number(val)))}`,
          },
          total: {
            show: true,
            label: "Suma rubros",
            fontSize: "11px",
            color: "#6b7280",
          },
        },
      },
    },
  },
  dataLabels: { enabled: false },
  legend: {
    position: "bottom",
    fontSize: "13px",
  },
  tooltip: {
    y: {
      formatter: (val) =>
        `$${new Intl.NumberFormat("es-CL").format(Math.round(Number(val)))}`,
    },
  },
  stroke: { width: 2, colors: ["#fff"] },
}));

// Configuración Gráfico de Barras (Top 5 Cuentas)
const topCuentas = computed(() => {
  return [...cuentas.value]
    .sort((a, b) => Math.abs(b.Saldo_Actual) - Math.abs(a.Saldo_Actual))
    .slice(0, 5);
});

const seriesBarras = computed(() => [
  {
    name: "Saldo",
    data: topCuentas.value.map((c) => Math.abs(c.Saldo_Actual)),
  },
]);

const opcionesBarras = computed(() => ({
  chart: { type: "bar", toolbar: { show: false } },
  plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
  colors: ["#3b82f6"],
  dataLabels: { enabled: false },
  xaxis: {
    categories: topCuentas.value.map((c) => {
      const nombreCuenta = c.Nombre ?? c.Cuenta ?? c.Codigo ?? "Sin nombre";
      return String(nombreCuenta).substring(0, 20) + "...";
    }),
  },
}));
</script>