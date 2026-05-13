<template>
  <div class="min-h-screen bg-gray-100 dark:bg-slate-950 transition-colors">
    <header
      class="sticky top-0 z-20 border-b border-slate-200/90 bg-white/90 shadow-[0_1px_0_0_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-950/90 dark:shadow-[0_1px_0_0_rgba(255,255,255,0.06)]"
    >
      <div class="mx-auto flex max-w-[1920px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-stretch lg:gap-6 lg:px-8 lg:py-0 lg:min-h-[4rem]">
        <!-- Marca -->
        <div
          class="flex shrink-0 items-center gap-3 border-b border-slate-100 pb-4 lg:border-b-0 lg:pb-0 lg:pr-6 lg:border-r lg:border-slate-200/90 dark:border-slate-800 dark:lg:border-slate-700/90"
        >
          <div
            class="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-600/25 ring-1 ring-white/20 dark:from-indigo-500 dark:via-indigo-600 dark:to-indigo-900 dark:shadow-indigo-900/40"
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              class="h-6 w-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v7.125c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125v-7.125zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            </svg>
          </div>
          <div class="min-w-0">
            <p
              class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
            >
              Suite financiera
            </p>
            <p class="truncate text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Eric Alfredo Waghorn Vitar
            </p>
          </div>
        </div>

        <!-- Navegación -->
        <nav
          class="flex min-h-0 min-w-0 flex-1 flex-col justify-center lg:py-3"
          aria-label="Vistas del dashboard"
        >
          <p
            class="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 lg:sr-only"
          >
            Navegación
          </p>
          <div
            class="rounded-2xl bg-slate-100/95 p-1 ring-1 ring-slate-200/80 dark:bg-slate-900/55 dark:ring-slate-700/90"
          >
            <div
              class="-mx-0 flex gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden"
            >
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
            </div>
          </div>
        </nav>

        <!-- Contexto: empresa -->
        <div
          class="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 pt-4 lg:justify-end lg:border-t-0 lg:border-l lg:border-slate-200/90 lg:pl-6 lg:pt-0 dark:border-slate-800 dark:lg:border-slate-700/90"
        >
          <div class="hidden h-8 w-px bg-slate-200 dark:bg-slate-700 sm:block lg:hidden" aria-hidden="true" />
          <div class="flex w-full min-w-0 flex-col gap-1 sm:w-auto sm:min-w-[12rem]">
            <label
              for="app-empresa"
              class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500"
            >
              Empresa activa
            </label>
            <div class="relative">
              <span
                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                aria-hidden="true"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  class="h-4 w-4"
                >
                  <path
                    fill-rule="evenodd"
                    d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
                    clip-rule="evenodd"
                  />
                </svg>
              </span>
              <select
                id="app-empresa"
                v-model="empresa"
                class="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-9 pr-10 text-sm font-semibold text-slate-800 shadow-inner shadow-slate-200/50 outline-none ring-0 transition hover:border-slate-300 hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:shadow-none dark:hover:border-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/25"
              >
                <option v-for="e in empresasDisponibles" :key="e" :value="e">
                  {{ e }}
                </option>
              </select>
              <span
                class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                aria-hidden="true"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  class="h-4 w-4"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clip-rule="evenodd"
                  />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>

    <DashboardFidelmira v-if="tab === 'dash'" :empresa="empresa" />
    <VistaEeffAcercamiento v-else-if="tab === 'eeff'" :empresa="empresa" />
    <VistaEeffExcelProyeccion v-else-if="tab === 'eeff_excel'" :empresa="empresa" />
    <VistaCmfProyeccion v-else-if="tab === 'cmf'" :empresa="empresa" />
    <VistaEerr v-else-if="tab === 'eeff_eerr'" :empresa="empresa" />
    <VistaEerr v-else-if="tab === 'flujo_caja'" :empresa="empresa" variant="flujo_caja" />
    <VistaEerrComparativo v-else-if="tab === 'eerr_comparativo'" :empresas-disponibles="empresasDisponibles" />
    <VistaEerrIndicadores v-else-if="tab === 'eerr_indicadores'" :empresa="empresa" />
    <VistaBalance v-else-if="tab === 'balance_trib'" :empresa="empresa" norma="Trib" />
    <VistaBalance v-else-if="tab === 'balance_ifrs'" :empresa="empresa" norma="IFRS" />
    <VistaInmobiliaria v-else-if="tab === 'inmobiliario'" :empresa="empresa" />
    <VistaInformes v-else-if="tab === 'informes'" :empresa="empresa" />
    <VistaDetalleDeudaLeasing v-else-if="tab === 'deuda_leasing'" :empresa="empresa" />

    <div
      v-show="themeMenuOpen"
      class="fixed inset-0 z-[45] bg-black/20 dark:bg-black/40"
      aria-hidden="true"
      @click="themeMenuOpen = false"
    />

    <div class="fixed bottom-6 left-6 z-50 flex flex-col items-start">
      <div class="relative">
        <button
          type="button"
          class="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-amber-600 shadow-lg transition hover:scale-105 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-amber-400 dark:hover:bg-slate-700"
          :title="'Tema: ' + (theme === 'dark' ? 'oscuro' : 'claro')"
          aria-haspopup="menu"
          :aria-expanded="themeMenuOpen"
          aria-label="Elegir tema claro u oscuro"
          @click.stop="themeMenuOpen = !themeMenuOpen"
        >
          <!-- sol (claro) / luna (oscuro) -->
          <svg
            v-if="theme === 'light'"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="h-6 w-6"
            aria-hidden="true"
          >
            <path
              d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"
            />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="h-6 w-6"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
              clip-rule="evenodd"
            />
          </svg>
        </button>

        <div
          v-show="themeMenuOpen"
          role="menu"
          class="absolute bottom-full left-0 mb-2 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-slate-600 dark:bg-slate-800"
          @click.stop
        >
          <button
            type="button"
            role="menuitem"
            class="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-slate-100 dark:hover:bg-slate-700"
            :class="{ 'bg-indigo-50 dark:bg-slate-700/80': theme === 'light' }"
            @click="setTheme('light'); themeMenuOpen = false"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 text-amber-500" aria-hidden="true">
              <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
            </svg>
            Tema claro
          </button>
          <button
            type="button"
            role="menuitem"
            class="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-slate-100 dark:hover:bg-slate-700"
            :class="{ 'bg-indigo-50 dark:bg-slate-700/80': theme === 'dark' }"
            @click="setTheme('dark'); themeMenuOpen = false"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 text-indigo-400" aria-hidden="true">
              <path fill-rule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clip-rule="evenodd" />
            </svg>
            Tema oscuro
          </button>
        </div>
      </div>
    </div>

    <button 
      v-if="!isChatOpen" 
      @click="isChatOpen = true"
      class="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 transition-transform hover:scale-105 flex items-center justify-center z-50 focus:outline-none dark:bg-indigo-500 dark:hover:bg-indigo-600"
      title="Abrir Asistente IA"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-7 h-7">
        <path fill-rule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clip-rule="evenodd" />
      </svg>
    </button>

    <ChatFinanciero v-if="isChatOpen" @close="isChatOpen = false" :empresa="empresa" />

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
import ChatFinanciero from "./components/ChatFinanciero.vue";
import VistaBalance from "./components/BalanceTributario.vue"; 
import VistaInmobiliaria from "./components/DashboardInmobiliario.vue";
import VistaInformes from "./components/InformesDescarga.vue";
import VistaDetalleDeudaLeasing from "./components/DetalleDeudaLeasing.vue";

import { EMPRESAS } from "./utils/empresas.js";
import { useTheme } from "./composables/useTheme.js";

const tab = ref("dash");
const isChatOpen = ref(false);
const themeMenuOpen = ref(false);
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
});

/** @type {{ id: string, label: string }[]} */
const tabItems = [
  //{ id: "dash", label: "Dashboard ejecutivo" },
  //{ id: "eeff_eerr", label: "Estado de resultados (EERR)" },
  { id: "flujo_caja", label: "Flujo de caja" },
  { id: "eerr_comparativo", label: "EERR comparativo" },
  //{ id: "eerr_indicadores", label: "Indicadores EERR anual" },
  //{ id: "balance_trib", label: "Balance tributario" },
  //{ id: "balance_ifrs", label: "Balance IFRS" },
  //{ id: "inmobiliario", label: "Inmobiliario" },
  //{ id: "informes", label: "Informes" },
  //{ id: "deuda_leasing", label: "Detalle deuda (leasing)" },
];

const tabActive =
  "shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2 text-left text-sm font-semibold text-white shadow-md shadow-indigo-600/25 ring-1 ring-indigo-500/30 transition-colors duration-150 bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-700 dark:from-indigo-500 dark:to-indigo-600 dark:shadow-indigo-900/40 dark:ring-indigo-400/25";
const tabIdle =
  "shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2 text-left text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/90 dark:hover:text-slate-100";
</script>

<style>
/* Tailwind en style.css principal */
</style>
