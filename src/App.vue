<template>
  <div class="min-h-screen bg-gray-100 dark:bg-slate-950 transition-colors">
    <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div class="mx-auto flex h-14 max-w-[1920px] items-center gap-6 px-4 sm:px-6">
        <!-- Marca -->
        <div class="flex shrink-0 items-center gap-2.5">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white dark:bg-indigo-500" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4.5 w-4.5" style="width: 18px; height: 18px">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 19V11M10 19V7M16 19V4M3 21h18" />
            </svg>
          </div>
          <div class="leading-tight">
            <p class="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Sociedad EWV</p>
            <p class="hidden text-[11px] text-slate-500 sm:block dark:text-slate-400">Eric Alfredo Waghorn Vitar</p>
          </div>
        </div>

        <!-- Navegación: pestañas con subrayado -->
        <nav v-if="tabItems.length > 1" class="flex h-full min-w-0 flex-1 items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Vistas del dashboard">
          <button
            v-for="item in tabItems"
            :key="item.id"
            type="button"
            :class="tab === item.id ? tabActive : tabIdle"
            :aria-current="tab === item.id ? 'page' : undefined"
            @click="tab = item.id"
          >
            {{ item.label }}
          </button>
        </nav>
        <div v-else class="flex-1"></div>

        <!-- Empresa activa (solo si está habilitada en app_ui.json) -->
        <div v-if="appUi.showEmpresaSelector" class="hidden shrink-0 items-center gap-2 md:flex">
          <label for="app-empresa" class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Empresa</label>
          <select
            id="app-empresa"
            v-model="empresa"
            class="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <option v-for="e in empresasDisponibles" :key="e" :value="e">{{ e }}</option>
          </select>
        </div>

        <!-- Tema claro / oscuro -->
        <button
          type="button"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          :title="theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'"
          :aria-label="theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'"
          @click="setTheme(theme === 'dark' ? 'light' : 'dark')"
        >
          <svg v-if="theme === 'dark'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4" aria-hidden="true">
            <circle cx="12" cy="12" r="4" /><path stroke-linecap="round" d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
          </svg>
        </button>
      </div>
    </header>

    <DashboardFidelmira v-if="tab === 'dash'" :empresa="empresa" />
    <VistaEeffAcercamiento v-else-if="tab === 'eeff'" :empresa="empresa" />
    <VistaEeffExcelProyeccion v-else-if="tab === 'eeff_excel'" :empresa="empresa" />
    <VistaCmfProyeccion v-else-if="tab === 'cmf'" :empresa="empresa" />
    <VistaEerr v-else-if="tab === 'eeff_eerr'" :empresa="empresa" />
    <VistaEerr v-else-if="tab === 'flujo_caja'" :empresa="empresa" variant="flujo_caja" />
    <VistaInformeEerr v-else-if="tab === 'informe_eerr'" :empresas-disponibles="empresasDisponibles" />
    <VistaEerrComparativo v-else-if="tab === 'eerr_comparativo'" :empresas-disponibles="empresasDisponibles" />
    <VistaEerrIndicadores v-else-if="tab === 'eerr_indicadores'" :empresa="empresa" />
    <VistaBalance v-else-if="tab === 'balance_trib'" :empresa="empresa" norma="Trib" />
    <VistaBalance v-else-if="tab === 'balance_ifrs'" :empresa="empresa" norma="IFRS" />
    <VistaInmobiliaria v-else-if="tab === 'inmobiliario'" :empresa="empresa" />
    <VistaInformes v-else-if="tab === 'informes'" :empresa="empresa" />
    <VistaDetalleDeudaLeasing v-else-if="tab === 'deuda_leasing'" :empresa="empresa" />

    <button 
      v-if="appUi.showChatbot && !isChatOpen" 
      @click="isChatOpen = true"
      class="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 transition-transform hover:scale-105 flex items-center justify-center z-50 focus:outline-none dark:bg-indigo-500 dark:hover:bg-indigo-600"
      title="Abrir Asistente IA"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-7 h-7">
        <path fill-rule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clip-rule="evenodd" />
      </svg>
    </button>

    <ChatFinanciero v-if="appUi.showChatbot && isChatOpen" @close="isChatOpen = false" :empresa="empresa" />

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import DashboardFidelmira from "./components/DashboardFidelmira.vue";
import VistaEeffAcercamiento from "./components/VistaEeffAcercamiento.vue";
import VistaEeffExcelProyeccion from "./components/VistaEeffExcelProyeccion.vue";
import VistaCmfProyeccion from "./components/VistaCmfProyeccion.vue";
import VistaEerr from "./components/DashboardEERR.vue";
import VistaEerrIndicadores from "./components/IndicadoresEERRAnual.vue";
import VistaEerrComparativo from "./components/EerrComparativoEmpresas.vue";
import VistaInformeEerr from "./components/InformeEerr.vue";
import ChatFinanciero from "./components/ChatFinanciero.vue";
import VistaBalance from "./components/BalanceTributario.vue"; 
import VistaInmobiliaria from "./components/DashboardInmobiliario.vue";
import VistaInformes from "./components/InformesDescarga.vue";
import VistaDetalleDeudaLeasing from "./components/DetalleDeudaLeasing.vue";

import { EMPRESAS } from "./utils/empresas.js";
import { useTheme } from "./composables/useTheme.js";
import appUi from "./assets/config/app_ui.json";

const tabItems = computed(() =>
  Object.entries(appUi.tabs || {})
    .filter(([, cfg]) => cfg.enabled)
    .map(([id, cfg]) => ({ id, label: cfg.label }))
);

function tabInicial() {
  const ids = tabItems.value.map((t) => t.id);
  if (ids.includes(appUi.defaultTab)) return appUi.defaultTab;
  return ids[0] || "eerr_comparativo";
}

const tab = ref(tabInicial());
const isChatOpen = ref(false);
const { theme, setTheme } = useTheme();

const contabilidadGlob = import.meta.glob("./assets/data/*/contabilidad.json", {
  eager: true,
});
const empresasDisponibles = computed(() => {
  const set = new Set();
  for (const path of Object.keys(contabilidadGlob)) {
    const normalized = path.replace(/\\/g, "/");
    const idx = normalized.indexOf("/data/");
    if (idx === -1) continue;
    const rest = normalized.slice(idx + "/data/".length);
    const seg = rest.split("/")[0];
    if (seg) set.add(seg);
  }
  const list = EMPRESAS.filter((e) => set.has(e));
  return list.length ? list : [...set].sort();
});

const empresa = ref("FIDELMIRA");

onMounted(() => {
  if (!empresasDisponibles.value.includes(empresa.value)) {
    empresa.value = empresasDisponibles.value[0] || "FIDELMIRA";
  }
  if (!tabItems.value.some((t) => t.id === tab.value)) {
    tab.value = tabInicial();
  }
});

const tabActive =
  "relative flex shrink-0 items-center whitespace-nowrap px-3 text-sm font-semibold text-indigo-700 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-indigo-600 dark:text-indigo-300 dark:after:bg-indigo-400";
const tabIdle =
  "relative flex shrink-0 items-center whitespace-nowrap px-3 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100";
</script>

<style>
/* Tailwind en style.css principal */
</style>
