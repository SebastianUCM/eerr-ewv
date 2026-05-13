<template>
  <div class="min-h-screen bg-slate-50 p-6 md:p-8">
    <header class="mb-6">
      <h1 class="text-2xl font-bold text-slate-900">
        CMF Edition — proyección y sensibilidad
      </h1>
      <p class="text-sm font-mono text-indigo-700 mt-0.5">{{ empresa }}</p>
      <p class="text-sm text-slate-600 mt-1 max-w-3xl">
        Vista analítica con indicadores de
        <strong>mindicador.cl</strong> (UF, USD, IPC) y proyección a
        <strong>mes +1</strong>. Heurística USD en cuentas cuyo nombre/código sugiere
        exposición al dólar. No sustituye estados IFRS ni normativa CMF.
      </p>
    </header>

    <div v-if="errorContabilidad" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-6">
      {{ errorContabilidad }}
    </div>

    <div v-else class="space-y-6">
      <div v-if="errorMacro" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {{ errorMacro }}
      </div>
      <!-- Indicadores macro -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs uppercase text-slate-500 font-semibold">UF</p>
          <p class="text-xl font-bold text-slate-900 mt-1">
            {{ macroUf != null ? `$${fmt(macroUf)}` : "—" }}
          </p>
          <p class="text-xs text-slate-500 mt-1">{{ macroFecha.uf || "" }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs uppercase text-slate-500 font-semibold">USD (obs.)</p>
          <p class="text-xl font-bold text-slate-900 mt-1">
            {{ macroUsd != null ? `$${fmt(macroUsd)}` : "—" }}
          </p>
          <p class="text-xs text-slate-500 mt-1">{{ macroFecha.dolar || "" }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs uppercase text-slate-500 font-semibold">IPC (var. mensual)</p>
          <p class="text-xl font-bold text-slate-900 mt-1">
            {{ ipcVarPct != null ? `${ipcVarPct.toFixed(2)} %` : "—" }}
          </p>
          <p class="text-xs text-slate-500 mt-1">{{ macroFecha.ipc || "" }}</p>
        </div>
        <div class="rounded-xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
          <p class="text-xs uppercase text-indigo-700 font-semibold">Capital neto (A − P)</p>
          <p class="text-lg font-bold text-indigo-900 mt-1">
            Actual: ${{ fmt(capitalNetoActual) }}
          </p>
          <p class="text-sm font-semibold text-indigo-800 mt-2">
            Proyectado M+1: ${{ fmt(capitalNetoProyectado) }}
          </p>
          <p class="text-xs text-indigo-700 mt-1">
            Δ {{ variacionCapitalPct != null ? variacionCapitalPct.toFixed(2) + " %" : "—" }}
          </p>
        </div>
      </div>

      <!-- Sensibilidad -->
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-5">
        <h2 class="text-sm font-semibold text-slate-800">Análisis de sensibilidad</h2>

        <div>
          <label class="flex justify-between text-sm text-slate-700 mb-1">
            <span>Expectativa dólar (vs spot)</span>
            <span class="font-mono text-indigo-700"
              >{{ dolarSpot > 0 ? ((dolarEscenario / dolarSpot - 1) * 100).toFixed(1) : "—" }} %</span
            >
          </label>
          <input
            v-model.number="dolarEscenario"
            type="range"
            :min="rangoDolar.min"
            :max="rangoDolar.max"
            :step="1"
            class="w-full accent-indigo-600"
          />
          <p class="text-xs text-slate-500 mt-1">
            Spot: ${{ fmt(dolarSpot) }} → Escenario: ${{ fmt(dolarEscenario) }}
          </p>
        </div>

        <div>
          <label class="flex justify-between text-sm text-slate-700 mb-1">
            <span>Crecimiento orgánico mensual (todas las cuentas)</span>
            <span class="font-mono text-indigo-700">{{ (crecimientoOrg * 100).toFixed(1) }} %</span>
          </label>
          <input
            v-model.number="crecimientoOrgPct"
            type="range"
            min="-5"
            max="15"
            step="0.5"
            class="w-full accent-indigo-600"
          />
        </div>

        <div>
          <label class="flex justify-between text-sm text-slate-700 mb-1">
            <span>Ajuste IPC mensual (override)</span>
            <span class="font-mono text-indigo-700">{{ (factorIpcManual * 100).toFixed(2) }} %</span>
          </label>
          <input
            v-model.number="ipcOverridePct"
            type="range"
            min="-2"
            max="4"
            step="0.05"
            class="w-full accent-indigo-600"
          />
          <p class="text-xs text-slate-500 mt-1">
            Si hay dato IPC de la API, el slider parte de ese valor; puedes corregirlo.
          </p>
        </div>
      </div>

      <!-- Tabla CMF-style -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 bg-slate-50 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 class="text-sm font-semibold text-slate-800">
            Comparativo cuenta (CLP / UF / proyección M+1)
          </h2>
          <input
            v-model="filtroTabla"
            type="search"
            placeholder="Filtrar código o nombre…"
            class="w-full sm:max-w-xs border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <div class="overflow-x-auto max-h-[min(65vh,680px)] overflow-y-auto">
          <table class="min-w-full text-xs sm:text-sm">
            <thead class="sticky top-0 bg-slate-100 z-10 shadow-sm">
              <tr class="text-left text-slate-600">
                <th class="px-3 py-2 font-medium">Cuenta</th>
                <th class="px-3 py-2 font-medium text-right whitespace-nowrap">Saldo CLP</th>
                <th class="px-3 py-2 font-medium text-right whitespace-nowrap">Saldo UF</th>
                <th class="px-3 py-2 font-medium text-right whitespace-nowrap">Proy. M+1</th>
                <th class="px-3 py-2 font-medium text-right whitespace-nowrap">Δ %</th>
                <th class="px-3 py-2 font-medium text-center">USD?</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="(row, idx) in filasTabla"
                :key="row.key + '-' + idx"
                class="hover:bg-slate-50/80"
              >
                <td class="px-3 py-1.5 max-w-xs">
                  <span class="font-mono text-slate-600">{{ row.codigo }}</span>
                  <span class="block text-slate-800 truncate" :title="row.nombre">{{ row.nombre }}</span>
                </td>
                <td class="px-3 py-1.5 text-right font-mono tabular-nums">{{ fmt(row.saldo) }}</td>
                <td class="px-3 py-1.5 text-right font-mono tabular-nums text-slate-700">
                  {{ row.uf != null ? row.uf.toFixed(4) : "—" }}
                </td>
                <td class="px-3 py-1.5 text-right font-mono tabular-nums font-medium text-indigo-900">
                  {{ fmt(row.proyectado) }}
                </td>
                <td class="px-3 py-1.5 text-right font-mono" :class="row.varPct >= 0 ? 'text-emerald-700' : 'text-rose-700'">
                  {{ row.varPct != null ? row.varPct.toFixed(2) + " %" : "—" }}
                </td>
                <td class="px-3 py-1.5 text-center">{{ row.usd ? "●" : "" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="px-4 py-2 border-t bg-slate-50 text-xs text-slate-500">
          {{ filasTabla.length }} filas · Patrimonio contable proyectado (tipos 1–3) coherente con saldos;
          capital neto KPI = Activos − Pasivos.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import macroJsonUrl from "../assets/config/macro.json?url";
import {
  cuentaEsUsdSensitive,
  proyectarSaldoM1,
  variacionPorcentual,
  saldoEnUf,
  totalesPorTipo,
} from "../utils/proyeccionMacro.js";

const props = defineProps({
  empresa: { type: String, required: true },
});

const contabilidadMod = import.meta.glob("../assets/data/*/contabilidad.json");

function findGlobKey(empresa) {
  const needle = `/assets/data/${empresa}/contabilidad.json`;
  return Object.keys(contabilidadMod).find((k) =>
    k.replace(/\\/g, "/").includes(needle)
  );
}

function normalizarCuentas(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.cuentas)) return data.cuentas;
  return [];
}

const cuentas = ref([]);
const macro = ref(null);
const errorContabilidad = ref("");
const errorMacro = ref("");

async function cargarContabilidad() {
  const key = findGlobKey(props.empresa);
  if (!key || !contabilidadMod[key]) {
    cuentas.value = [];
    errorContabilidad.value = `No hay contabilidad.json para ${props.empresa}.`;
    return;
  }
  errorContabilidad.value = "";
  try {
    const mod = await contabilidadMod[key]();
    cuentas.value = [...normalizarCuentas(mod.default)];
  } catch (e) {
    cuentas.value = [];
    errorContabilidad.value = `Error al cargar contabilidad: ${e}`;
  }
}

watch(() => props.empresa, cargarContabilidad, { immediate: true });

const filtroTabla = ref("");
const dolarEscenario = ref(950);
const crecimientoOrgPct = ref(0);
const ipcOverridePct = ref(0.5);

const macroUf = computed(() => macro.value?.indicadores?.uf?.valor ?? null);
const macroUsd = computed(() => macro.value?.indicadores?.dolar?.valor ?? null);
const ipcVarPct = computed(() => {
  const v = macro.value?.indicadores?.ipc?.variacion_mensual_pct;
  return v != null && Number.isFinite(Number(v)) ? Number(v) : null;
});

const macroFecha = computed(() => ({
  uf: macro.value?.indicadores?.uf?.fecha ?? "",
  dolar: macro.value?.indicadores?.dolar?.fecha ?? "",
  ipc: macro.value?.indicadores?.ipc?.fecha ?? "",
}));

const dolarSpot = computed(() => {
  const v = macroUsd.value;
  return v != null && v > 0 ? v : 950;
});

const rangoDolar = computed(() => {
  const s = dolarSpot.value;
  return { min: Math.round(s * 0.75), max: Math.round(s * 1.25) };
});

watch(
  dolarSpot,
  (s) => {
    if (s > 0) dolarEscenario.value = s;
  },
  { immediate: true }
);

const factorIpcManual = computed(() => ipcOverridePct.value / 100);

const crecimientoOrg = computed(() => crecimientoOrgPct.value / 100);

function proyectarFila(c) {
  const saldo = Number(c.Saldo_Actual ?? 0);
  const esUsd = cuentaEsUsdSensitive(c);
  const proj = proyectarSaldoM1({
    saldo,
    factorIpc: factorIpcManual.value,
    factorCrecimientoOrg: crecimientoOrg.value,
    esUsdSensitive: esUsd,
    dolarSpot: dolarSpot.value,
    dolarEscenario: dolarEscenario.value,
  });
  const vp = variacionPorcentual(saldo, proj);
  return {
    key: String(c.Codigo ?? ""),
    codigo: c.Codigo ?? "",
    nombre: String(c.Nombre ?? "").trim(),
    saldo,
    uf: saldoEnUf(saldo, macroUf.value),
    proyectado: proj,
    varPct: vp,
    usd: esUsd,
  };
}

const filasBase = computed(() => cuentas.value.map((c) => proyectarFila(c)));

const filasTabla = computed(() => {
  const q = filtroTabla.value.trim().toLowerCase();
  let rows = filasBase.value;
  if (q) {
    rows = rows.filter(
      (r) =>
        String(r.codigo).toLowerCase().includes(q) ||
        String(r.nombre).toLowerCase().includes(q)
    );
  }
  return rows.sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), "es", { numeric: true }));
});

const capitalNetoActual = computed(() => {
  const t = totalesPorTipo(cuentas.value);
  return t.capitalNeto;
});

const capitalNetoProyectado = computed(() => {
  const proy = cuentas.value.map((c) => {
    const r = proyectarFila(c);
    return { ...c, Saldo_Actual: r.proyectado };
  });
  const t = totalesPorTipo(proy);
  return t.capitalNeto;
});

const variacionCapitalPct = computed(() =>
  variacionPorcentual(capitalNetoActual.value, capitalNetoProyectado.value)
);

function fmt(v) {
  return new Intl.NumberFormat("es-CL").format(Math.round(Number(v) || 0));
}

async function cargarMacro() {
  errorMacro.value = "";
  try {
    const rMacro = await fetch(macroJsonUrl, { cache: "no-store" });
    if (!rMacro.ok) throw new Error("macro.json");
    macro.value = await rMacro.json();
    const ipcV = macro.value?.indicadores?.ipc?.variacion_mensual_pct;
    if (ipcV != null && Number.isFinite(Number(ipcV))) {
      ipcOverridePct.value = Math.round(Number(ipcV) * 100) / 100;
    }
  } catch (e) {
    errorMacro.value = `No se pudo cargar macro.json: ${e}`;
  }
}

onMounted(cargarMacro);
</script>

