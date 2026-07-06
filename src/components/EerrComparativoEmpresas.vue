<template>
  <div class="min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-slate-800">
    <header class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6">
      <div class="max-w-xl">
        <h1 class="text-2xl font-bold text-slate-900">
          Estado de resultados comparativo
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          Misma estructura de cuentas que el EERR. Total del periodo por empresa; columna final acumulada entre empresas seleccionadas.
        </p>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex flex-col gap-3 min-w-[16rem] max-w-xl">
        <div class="flex flex-wrap items-center gap-3">
          <label class="text-xs font-semibold uppercase text-slate-500">Año:</label>
          <select
            v-model.number="filtroAnio"
            class="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white font-medium focus:border-indigo-500 outline-none"
          >
            <option v-for="a in aniosDisponibles" :key="a" :value="a">{{ a }}</option>
          </select>
          <label class="text-xs font-semibold uppercase text-slate-500">Desde mes:</label>
          <select
            v-model.number="mesDesde"
            class="border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white font-medium focus:border-indigo-500 outline-none"
          >
            <option v-for="m in 12" :key="'d-' + m" :value="m">{{ mesNombre(m) }}</option>
          </select>
          <label class="text-xs font-semibold uppercase text-slate-500">Hasta mes:</label>
          <select
            v-model.number="mesHasta"
            class="border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white font-medium focus:border-indigo-500 outline-none"
          >
            <option v-for="m in 12" :key="'h-' + m" :value="m">{{ mesNombre(m) }}</option>
          </select>
          <label class="text-xs font-semibold uppercase text-slate-500">Tipo EERR:</label>
          <select
            v-model="tipoEerr"
            class="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white font-medium focus:border-indigo-500 outline-none"
          >
            <option value="financiero">Financiero</option>
            <option value="contable">Contable</option>
          </select>
        </div>
        <div>
          <label for="eerr-multi-emp" class="text-xs font-semibold uppercase text-slate-500 block mb-1">
            Empresas (Ctrl+clic o Cmd+clic para varias)
          </label>
          <select
            id="eerr-multi-emp"
            v-model="empresasSeleccionadas"
            multiple
            :size="Math.min(10, Math.max(3, empresasDisponibles.length))"
            class="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-medium focus:border-indigo-500 outline-none"
          >
            <option v-for="e in empresasDisponibles" :key="e" :value="e">{{ e }}</option>
          </select>
        </div>
      </div>
    </header>

    <div
      v-if="!empresasSeleccionadas.length"
      class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-8 text-center text-sm text-amber-900"
    >
      Selecciona al menos una empresa en la lista para ver la matriz.
    </div>

    <div v-else class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <div class="px-5 py-4 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wide">
          Totales {{ filtroAnio }} · {{ mesNombre(mesDesde) }} – {{ mesNombre(mesHasta) }} —
          {{ tipoEerr === "financiero" ? "Financiero" : "Contable" }}
        </h2>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
          @click="descargarExcel"
        >
          Descargar Excel
        </button>
      </div>

      <div class="overflow-x-auto max-h-[70vh]">
        <table class="min-w-[720px] w-full text-xs border-collapse">
          <thead class="sticky top-0 z-20 bg-slate-100 shadow-sm">
            <tr class="border-b border-slate-300 text-slate-700">
              <th
                class="px-4 py-3 text-left font-bold min-w-[20rem] sticky left-0 z-30 bg-slate-100 border-r border-slate-200 shadow-[2px_0_6px_rgba(15,23,42,0.06)]"
              >
                Estructura de cuentas
              </th>
              <th
                v-for="emp in empresasSeleccionadas"
                :key="emp"
                class="px-3 py-3 text-right font-bold min-w-[8.5rem] whitespace-normal"
              >
                {{ emp }}
              </th>
              <th class="px-4 py-3 text-right font-bold min-w-[8.5rem] bg-slate-200/70 border-l border-slate-300">
                Acumulado
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-for="grupo in matrizMerged" :key="grupo.key">
              <tr :class="`border-y ${grupo.config.colorHeader} sticky top-[41px] z-10 shadow-sm`">
                <td
                  class="px-4 py-2.5 font-bold text-slate-900 text-[13px] uppercase tracking-wide sticky left-0 z-[11] bg-inherit border-r border-slate-200/90"
                  :class="grupo.config.colorHeader"
                >
                  {{ grupo.config.label }}
                </td>
                <td
                  v-for="emp in empresasSeleccionadas"
                  :key="'g-' + grupo.key + emp"
                  class="px-3 py-2.5 text-right font-mono font-bold"
                  :class="valorGrupo(emp, grupo.key) < 0 ? 'text-rose-700' : 'text-slate-800'"
                >
                  {{ formatCLPContable(valorGrupo(emp, grupo.key)) }}
                </td>
                <td
                  class="px-4 py-2.5 text-right font-mono font-bold bg-white/40 border-l border-slate-200"
                  :class="acumGrupo(grupo.key) < 0 ? 'text-rose-700' : 'text-slate-900'"
                >
                  {{ formatCLPContable(acumGrupo(grupo.key)) }}
                </td>
              </tr>

              <template v-for="subitem in grupo.subitems" :key="subitem.key">
                <tr class="border-b border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors bg-white" @click="toggleFila(subitem.key)">
                  <td
                    class="px-4 py-2 pl-8 font-semibold text-slate-800 flex items-center gap-2 sticky left-0 z-[5] bg-white border-r border-slate-100"
                  >
                    <span class="text-indigo-500 text-lg leading-none w-4">{{ filasAbiertas[subitem.key] ? "▾" : "▸" }}</span>
                    <span class="capitalize">{{ formatearNombre(subitem.nombreOriginal) }}</span>
                  </td>
                  <td
                    v-for="emp in empresasSeleccionadas"
                    :key="'s-' + subitem.key + emp"
                    class="px-3 py-2 text-right font-mono text-slate-700 font-medium"
                    :class="valorSubitem(emp, grupo.key, subitem.key) < 0 ? 'text-rose-600' : ''"
                  >
                    {{ formatCLPContable(valorSubitem(emp, grupo.key, subitem.key)) }}
                  </td>
                  <td
                    class="px-4 py-2 text-right font-mono font-bold bg-slate-50/50 border-l border-slate-100"
                    :class="acumSubitem(grupo.key, subitem.key) < 0 ? 'text-rose-700' : 'text-slate-800'"
                  >
                    {{ formatCLPContable(acumSubitem(grupo.key, subitem.key)) }}
                  </td>
                </tr>

                <template v-if="filasAbiertas[subitem.key]">
                  <template v-for="cuenta in subitem.cuentas" :key="cuenta.key">
                    <tr
                      class="border-b border-slate-100 cursor-pointer hover:bg-indigo-50/30 transition-colors bg-slate-50/50"
                      @click="toggleFila(subitem.key + '-' + cuenta.key)"
                    >
                      <td
                        class="px-4 py-1.5 pl-14 font-medium text-slate-700 flex items-center gap-2 sticky left-0 z-[5] bg-slate-50/70 border-r border-slate-100"
                      >
                        <span class="text-slate-400 text-lg leading-none w-4">{{
                          filasAbiertas[subitem.key + '-' + cuenta.key] ? "▾" : "▸"
                        }}</span>
                        <span class="text-indigo-600 font-mono">{{ cuenta.codigo }}</span>
                        <span class="truncate max-w-[14rem]">{{ cuenta.nombre }}</span>
                      </td>
                      <td
                        v-for="emp in empresasSeleccionadas"
                        :key="'c-' + cuenta.key + emp"
                        class="px-3 py-1.5 text-right font-mono text-slate-600 text-[11px]"
                        :class="valorCuenta(emp, grupo.key, subitem.key, cuenta.key) < 0 ? 'text-rose-500' : ''"
                      >
                        {{ formatCLPContable(valorCuenta(emp, grupo.key, subitem.key, cuenta.key)) }}
                      </td>
                      <td
                        class="px-4 py-1.5 text-right font-mono font-semibold bg-slate-100/50 text-[11px] border-l border-slate-100"
                        :class="acumCuenta(grupo.key, subitem.key, cuenta.key) < 0 ? 'text-rose-600' : 'text-slate-700'"
                      >
                        {{ formatCLPContable(acumCuenta(grupo.key, subitem.key, cuenta.key)) }}
                      </td>
                    </tr>

                    <template v-if="filasAbiertas[subitem.key + '-' + cuenta.key]">
                      <tr
                        v-for="cc in cuenta.centros"
                        :key="cc.key"
                        class="border-b border-slate-50 hover:bg-slate-100 transition-colors bg-white"
                      >
                        <td
                          class="px-4 py-1 pl-[5.5rem] text-slate-500 text-[11px] flex items-center gap-1.5 sticky left-0 z-[5] bg-white border-r border-slate-100"
                        >
                          <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span class="font-mono text-slate-400">{{ cc.codigo === "000" ? "" : cc.codigo }}</span>
                          <span class="truncate max-w-[12rem]">{{ cc.codigo === "000" ? "Sin Centro de Costo" : cc.nombre }}</span>
                        </td>
                        <td
                          v-for="emp in empresasSeleccionadas"
                          :key="'cc-' + cc.key + emp"
                          class="px-3 py-1 text-right font-mono text-slate-400 text-[11px]"
                          :class="valorCentro(emp, grupo.key, subitem.key, cuenta.key, cc.key) < 0 ? 'text-rose-400' : ''"
                        >
                          {{ formatCLPContable(valorCentro(emp, grupo.key, subitem.key, cuenta.key, cc.key)) }}
                        </td>
                        <td
                          class="px-4 py-1 text-right font-mono font-medium text-slate-500 bg-white text-[11px] border-l border-slate-100"
                          :class="acumCentro(grupo.key, subitem.key, cuenta.key, cc.key) < 0 ? 'text-rose-500' : ''"
                        >
                          {{ formatCLPContable(acumCentro(grupo.key, subitem.key, cuenta.key, cc.key)) }}
                        </td>
                      </tr>
                    </template>
                  </template>
                </template>
              </template>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="empresasSeleccionadas.length" class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <div class="px-5 py-4 border-b border-slate-100 bg-indigo-50/60">
        <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wide">
          Resumen gerencial comparativo
        </h2>
        <p class="text-xs text-slate-500 mt-1">
          Una fila por concepto gerencial. Columnas: empresas en comparación y acumulado entre ellas.
          Filas de saldo (banco/BTG): posición al mes «Hasta».
        </p>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-[720px] w-full text-xs border-collapse">
          <thead class="bg-slate-100">
            <tr class="border-b border-slate-300 text-slate-700">
              <th
                class="px-4 py-3 text-left font-bold min-w-[14rem] sticky left-0 z-10 bg-slate-100 border-r border-slate-200"
              >
                Concepto
              </th>
              <th
                v-for="emp in matrizGerencial.empresas"
                :key="'rg-h-' + emp"
                class="px-3 py-3 text-right font-bold min-w-[8.5rem] whitespace-normal"
              >
                {{ emp }}
              </th>
              <th
                class="px-4 py-3 text-right font-bold min-w-[8.5rem] bg-slate-200/70 border-l border-slate-300"
              >
                Acumulado
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-for="fila in matrizGerencial.filas" :key="'rg-' + fila.key">
              <tr
                class="border-b border-slate-200 transition-colors"
                :class="fila.expandible || fila.tieneCuentas ? 'cursor-pointer hover:bg-slate-50/80' : 'hover:bg-slate-50/80'"
                @click="onGerencialRowClick(fila)"
              >
                <td
                  class="px-4 py-2.5 font-semibold text-slate-800 sticky left-0 z-[5] bg-white border-r border-slate-100 leading-snug"
                >
                  <span v-if="fila.expandible || fila.tieneCuentas" class="inline-flex items-center gap-2">
                    <span class="text-indigo-500 text-lg leading-none w-4">{{
                      filaGerencialAbierta(fila) ? "▾" : "▸"
                    }}</span>
                    <span>{{ fila.label }}</span>
                  </span>
                  <span v-else>{{ fila.label }}</span>
                </td>
                <td
                  v-for="emp in matrizGerencial.empresas"
                  :key="'rg-' + fila.key + emp"
                  class="px-3 py-2.5 text-right font-mono font-medium"
                  :class="(fila.valoresPorEmpresa[emp] || 0) < 0 ? 'text-rose-600' : 'text-slate-700'"
                >
                  {{ formatCLPContable(fila.valoresPorEmpresa[emp]) }}
                </td>
                <td
                  class="px-4 py-2.5 text-right font-mono font-bold bg-slate-50/50 border-l border-slate-100"
                  :class="(fila.acumulado || 0) < 0 ? 'text-rose-700' : 'text-slate-900'"
                >
                  {{ formatCLPContable(fila.acumulado) }}
                </td>
              </tr>

              <GerencialSubfilasRows
                v-if="fila.expandible && filasAbiertasGerencial[fila.key]"
                :subfilas="fila.subfilas"
                :empresas="matrizGerencial.empresas"
                :path-prefix="`${fila.key}/`"
                :abiertas="filasAbiertasGerencial"
                :format-c-l-p-contable="formatCLPContable"
                @toggle="toggleGerencial"
              />

              <GerencialCuentasRows
                v-if="fila.tieneCuentas && filasAbiertasGerencial[claveCuentasGerencial(fila)]"
                :cuentas="fila.cuentas"
                :empresas="matrizGerencial.empresas"
                :depth="0"
                :path-prefix="`${claveCuentasGerencial(fila)}/`"
                :abiertas="filasAbiertasGerencial"
                :format-c-l-p-contable="formatCLPContable"
                @toggle="toggleGerencial"
              />
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import * as XLSX from "xlsx";
import eerrDataRaw from "../assets/datos_vue.json";
import mapeoCuentas from "../assets/config/mapeo_cuentas.json";
import comparativoGerencial from "../assets/config/comparativo_gerencial.json";
import appUi from "../assets/config/app_ui.json";
import { normAnio, mapearDatosAnioEerr, filtrarFilasPorRangoMes } from "../utils/kpiEerr.js";
import {
  construirMatrizContableEerr,
  mergeEstructuraMatrices,
  totalesPlanosPorNivel,
} from "../utils/eerrMatriz.js";
import { calcularMatrizResumenGerencial } from "../utils/eerrResumenGerencial.js";
import GerencialSubfilasRows from "./GerencialSubfilasRows.vue";
import GerencialCuentasRows from "./GerencialCuentasRows.vue";

const props = defineProps({
  empresasDisponibles: { type: Array, required: true },
});

const filtroAnio = ref(new Date().getFullYear());
const mesDesde = ref(1);
const mesHasta = ref(12);
const tipoEerr = ref("financiero");

const mesNombre = (m) =>
  ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][
    Number(m) - 1
  ] || "";
const filasAbiertas = ref({});
const filasAbiertasGerencial = ref({});
const empresasSeleccionadas = ref([]);

const toggleFila = (key) => {
  filasAbiertas.value[key] = !filasAbiertas.value[key];
};

const toggleGerencial = (key) => {
  filasAbiertasGerencial.value[key] = !filasAbiertasGerencial.value[key];
};

function claveCuentasGerencial(fila) {
  return `${fila.key}|cuentas`;
}

function filaGerencialAbierta(fila) {
  if (fila.expandible) return filasAbiertasGerencial.value[fila.key];
  if (fila.tieneCuentas) return filasAbiertasGerencial.value[claveCuentasGerencial(fila)];
  return false;
}

function onGerencialRowClick(fila) {
  if (fila.expandible) toggleGerencial(fila.key);
  else if (fila.tieneCuentas) toggleGerencial(claveCuentasGerencial(fila));
}

function agregarSubfilasExcel(lista, subfilas, empresas, nivel) {
  for (const sub of subfilas || []) {
    const row = { Concepto: `${"  ".repeat(nivel)}${sub.label}` };
    empresas.forEach((emp) => {
      row[emp] = sub.valoresPorEmpresa[emp] ?? 0;
    });
    row.Acumulado = sub.acumulado ?? 0;
    lista.push(row);
    agregarSubfilasExcel(lista, sub.subfilas, empresas, nivel + 1);
  }
}

function filasPorEmpresa(emp) {
  return eerrDataRaw.filter((d) => String(d.Empresa).trim() === String(emp).trim());
}

const aniosDisponibles = computed(() => {
  const set = new Set();
  (props.empresasDisponibles || []).forEach((emp) => {
    filasPorEmpresa(emp).forEach((d) => set.add(normAnio(d.Anio)));
  });
  const arr = Array.from(set).sort((a, b) => b - a);
  return arr.length ? arr : [new Date().getFullYear()];
});

watch(
  () => [...props.empresasDisponibles],
  (list) => {
    const set = new Set(list);
    empresasSeleccionadas.value = empresasSeleccionadas.value.filter((e) => set.has(e));
    if (!empresasSeleccionadas.value.length && list.length) {
      empresasSeleccionadas.value =
        list.length >= 2 ? list.slice(0, 2) : [list[0]];
    }
  },
  { deep: true }
);

watch(aniosDisponibles, (arr) => {
  if (arr.length && !arr.includes(filtroAnio.value)) {
    filtroAnio.value = arr[0];
  }
});

watch([mesDesde, mesHasta], () => {
  if (mesDesde.value > mesHasta.value) mesHasta.value = mesDesde.value;
});

onMounted(() => {
  const list = props.empresasDisponibles || [];
  if (list.length) {
    empresasSeleccionadas.value =
      list.length >= 2 ? [...list.slice(0, 2)] : [...list];
  }
  if (aniosDisponibles.value.length) filtroAnio.value = aniosDisponibles.value[0];
});

const empresaOrdenRef = computed(() => empresasSeleccionadas.value[0] || props.empresasDisponibles[0] || "");

const matricesPorEmpresa = computed(() => {
  const out = {};
  for (const e of empresasSeleccionadas.value) {
    const rowsAnio = mapearDatosAnioEerr(
      e,
      filtroAnio.value,
      tipoEerr.value,
      filasPorEmpresa(e),
      mapeoCuentas
    );
    const rows = filtrarFilasPorRangoMes(rowsAnio, mesDesde.value, mesHasta.value);
    out[e] = construirMatrizContableEerr(rows, e, mapeoCuentas);
  }
  return out;
});

const planosPorEmpresa = computed(() => {
  const acc = {};
  for (const e of empresasSeleccionadas.value) {
    acc[e] = totalesPlanosPorNivel(matricesPorEmpresa.value[e] || []);
  }
  return acc;
});

const categoriasOcultasComparativo = new Set(appUi.comparativoMatriz?.excluirCategorias || []);

const matrizMerged = computed(() => {
  if (!empresasSeleccionadas.value.length) return [];
  const mats = empresasSeleccionadas.value.map((e) => matricesPorEmpresa.value[e] || []);
  return mergeEstructuraMatrices(mats, empresaOrdenRef.value).filter(
    (g) => !categoriasOcultasComparativo.has(g.key)
  );
});

const matrizGerencial = computed(() => {
  if (!empresasSeleccionadas.value.length) {
    return { filas: [], empresas: [] };
  }
  const datosPorEmpresa = {};
  for (const emp of empresasSeleccionadas.value) {
    datosPorEmpresa[emp] = filasPorEmpresa(emp);
  }
  return calcularMatrizResumenGerencial(empresasSeleccionadas.value, {
    anio: filtroAnio.value,
    mesDesde: mesDesde.value,
    mesHasta: mesHasta.value,
    tipoEerr: tipoEerr.value,
    datosPorEmpresa,
    mapeoCuentas,
    config: comparativoGerencial,
  });
});

function plano(emp) {
  return planosPorEmpresa.value[emp];
}

function valorGrupo(emp, gKey) {
  const p = plano(emp);
  return Number(p?.get(`g:${gKey}`)) || 0;
}

function valorSubitem(emp, gKey, sKey) {
  const p = plano(emp);
  return Number(p?.get(`s:${gKey}:${sKey}`)) || 0;
}

function valorCuenta(emp, gKey, sKey, cKey) {
  const p = plano(emp);
  return Number(p?.get(`c:${gKey}:${sKey}:${cKey}`)) || 0;
}

function valorCentro(emp, gKey, sKey, cKey, ccKey) {
  const p = plano(emp);
  return Number(p?.get(`cc:${gKey}:${sKey}:${cKey}:${ccKey}`)) || 0;
}

function acumGrupo(gKey) {
  let s = 0;
  for (const emp of empresasSeleccionadas.value) {
    s += valorGrupo(emp, gKey);
  }
  return s;
}

function acumSubitem(gKey, sKey) {
  let s = 0;
  for (const emp of empresasSeleccionadas.value) {
    s += valorSubitem(emp, gKey, sKey);
  }
  return s;
}

function acumCuenta(gKey, sKey, cKey) {
  let s = 0;
  for (const emp of empresasSeleccionadas.value) {
    s += valorCuenta(emp, gKey, sKey, cKey);
  }
  return s;
}

function acumCentro(gKey, sKey, cKey, ccKey) {
  let s = 0;
  for (const emp of empresasSeleccionadas.value) {
    s += valorCentro(emp, gKey, sKey, cKey, ccKey);
  }
  return s;
}

function descargarExcel() {
  const filas = [];
  for (const g of matrizMerged.value) {
    for (const sub of g.subitems) {
      for (const cta of sub.cuentas) {
        for (const cc of cta.centros) {
          const row = {
            Categoria: g.config.label,
            Subitem: formatearNombre(sub.nombreOriginal),
            CodigoCuenta: cta.codigo,
            NombreCuenta: cta.nombre,
            Centro: cc.codigo === "000" ? "Sin Centro de Costo" : `${cc.codigo} ${cc.nombre}`,
          };
          empresasSeleccionadas.value.forEach((emp) => {
            row[`Total_${emp}`] = valorCentro(emp, g.key, sub.key, cta.key, cc.key);
          });
          row.Acumulado = acumCentro(g.key, sub.key, cta.key, cc.key);
          filas.push(row);
        }
      }
    }
  }
  if (!filas.length) return;

  const worksheet = XLSX.utils.json_to_sheet(filas);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Comparativo");

  if (matrizGerencial.value.filas.length) {
    const filasGerencial = [];
    for (const fila of matrizGerencial.value.filas) {
      const row = { Concepto: fila.label };
      matrizGerencial.value.empresas.forEach((emp) => {
        row[emp] = fila.valoresPorEmpresa[emp] ?? 0;
      });
      row.Acumulado = fila.acumulado ?? 0;
      filasGerencial.push(row);

      agregarSubfilasExcel(filasGerencial, fila.subfilas, matrizGerencial.value.empresas, 1);
    }
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(filasGerencial), "Resumen gerencial");
  }

  const nombreArchivo = `eerr_comparativo_${filtroAnio.value}_${mesDesde.value}-${mesHasta.value}_${tipoEerr.value}.xlsx`;
  XLSX.writeFile(workbook, nombreArchivo);
}

const formatCLPContable = (v) => {
  if (!v || v === 0) return "-";
  const n = Math.round(Number(v));
  const abs = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(Math.abs(n));
  return n < 0 ? `(${abs})` : abs;
};
const formatearNombre = (t) => String(t || "").replace(/_/g, " ");
</script>
