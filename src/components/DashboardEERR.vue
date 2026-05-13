<template>
  <div class="min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-slate-800">
    <header class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">
          {{ tituloPrincipal }}
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          <template v-if="variant === 'flujo_caja'">
            Misma lógica y datos que el EERR (<code class="text-xs bg-slate-100 px-1 rounded">datos_vue.json</code>,
            <code class="text-xs bg-slate-100 px-1 rounded">mapeo_cuentas.json</code>) —
            {{ props.empresa }}
          </template>
          <template v-else>
            Montos desde <code class="text-xs bg-slate-100 px-1 rounded">datos_vue.json</code>,
            categorías desde <code class="text-xs bg-slate-100 px-1 rounded">mapeo_cuentas.json</code>
            — {{ props.empresa }}
          </template>
        </p>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex items-center gap-3">
        <label class="text-xs font-semibold uppercase text-slate-500">Año Operativo:</label>
        <select
          v-model.number="filtroAnio"
          class="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        >
          <option v-for="a in aniosDisponibles" :key="a" :value="a">
            {{ a }}
          </option>
        </select>
        <label class="text-xs font-semibold uppercase text-slate-500">Tipo EERR:</label>
        <select
          v-model="tipoEerr"
          class="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        >
          <option value="financiero">Financiero</option>
          <option value="contable">Contable</option>
        </select>
      </div>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <!-- Ingresos Acumulados -->
      <div class="rounded-xl shadow-sm p-5 border-l-4 border-emerald-500 bg-emerald-50/70 border border-emerald-100">
        <p class="text-xs uppercase text-emerald-700 font-bold tracking-wider">Ingresos Acumulados</p>
        <p class="text-2xl font-bold text-emerald-900 mt-1">{{ formatCLP(kpis.ingresos) }}</p>
        <p class="text-[11px] mt-1 text-emerald-700/80">Año anterior: {{ formatCLP(kpisAnioAnterior.ingresos) }}</p>
        <p class="text-[11px] font-semibold mt-0.5" :class="claseVariacionKpi('ingresos')">{{ textoVariacionKpi('ingresos') }}</p>
        <p class="text-[11px] mt-2 text-emerald-700/80">ingreso_explotacion + ingreso_financiero</p>
      </div>
       <!-- Ingresos Financieros -->
       <div class="rounded-xl shadow-sm p-5 border-l-4 border border-cyan-100" :class="kpis.ingresosFinancieros >= 0 ? 'border-cyan-500 bg-cyan-50/80' : 'border-rose-500 bg-rose-50/80'">
        <p class="text-xs uppercase font-bold tracking-wider" :class="kpis.ingresosFinancieros >= 0 ? 'text-cyan-700' : 'text-rose-700'">INGRESOS FINANCIEROS</p>
        <p class="text-2xl font-bold mt-1" :class="kpis.ingresosFinancieros >= 0 ? 'text-cyan-900' : 'text-rose-800'">
          {{ formatCLP(kpis.ingresosFinancieros) }}
        </p>
        <p class="text-[11px] mt-1" :class="kpis.ingresosFinancieros >= 0 ? 'text-cyan-700/80' : 'text-rose-700/80'">
          Año anterior: {{ formatCLP(kpisAnioAnterior.ingresosFinancieros) }}
        </p>
        <p class="text-[11px] font-semibold mt-0.5" :class="claseVariacionKpi('ingresosFinancieros')">{{ textoVariacionKpi('ingresosFinancieros') }}</p>
        <p class="text-[11px] mt-2" :class="kpis.ingresosFinancieros >= 0 ? 'text-cyan-700/80' : 'text-rose-700/80'">
          suma de categoria ingreso_financiero
        </p>
      </div>
      <!-- Gastos Acumulados -->
      <div class="rounded-xl shadow-sm p-5 border-l-4 border-rose-500 bg-rose-50/70 border border-rose-100">
        <p class="text-xs uppercase text-rose-700 font-bold tracking-wider">Gastos Acumulados</p>
        <p class="text-2xl font-bold text-rose-900 mt-1">{{ formatCLP(kpis.gastos) }}</p>
        <p class="text-[11px] mt-1 text-rose-700/80">Año anterior: {{ formatCLP(kpisAnioAnterior.gastos) }}</p>
        <p class="text-[11px] font-semibold mt-0.5" :class="claseVariacionKpi('gastos')">{{ textoVariacionKpi('gastos') }}</p>
        <p class="text-[11px] mt-2 text-rose-700/80">resultado - ingresos</p>
      </div>
      <!-- EBITDA -->
      <div class="rounded-xl shadow-md p-5 border-l-4 border border-purple-100" :class="kpis.ebitda >= 0 ? 'border-purple-600 bg-purple-50/80' : 'border-orange-500 bg-orange-50/80'">
        <p class="text-xs uppercase font-bold tracking-wider" :class="kpis.ebitda >= 0 ? 'text-purple-700' : 'text-orange-700'">EBITDA</p>
        <p class="text-2xl font-bold mt-1" :class="kpis.ebitda >= 0 ? 'text-purple-900' : 'text-orange-800'">
          {{ formatCLP(kpis.ebitda) }}
        </p>
        <p class="text-[11px] mt-1" :class="kpis.ebitda >= 0 ? 'text-purple-700/80' : 'text-orange-700/80'">
          Año anterior: {{ formatCLP(kpisAnioAnterior.ebitda) }}
        </p>
        <p class="text-[11px] font-semibold mt-0.5" :class="claseVariacionKpi('ebitda')">{{ textoVariacionKpi('ebitda') }}</p>
        <p class="text-[11px] mt-2" :class="kpis.ebitda >= 0 ? 'text-purple-700/80' : 'text-orange-700/80'">
          ingreso_explotacion + ingreso_financiero + gasto_adm_ventas
        </p>
      </div>
     
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <!-- Margen Bruto -->
      <div class="rounded-xl shadow-sm p-5 border-l-4 border-teal-500 bg-teal-50/70 border border-teal-100">
        <p class="text-xs uppercase text-teal-700 font-bold tracking-wider">MARGEN BRUTO</p>
        <p class="text-2xl font-bold text-teal-900 mt-1">{{ formatCLP(kpis.margenBruto) }}</p>
        <p class="text-[11px] mt-1 text-teal-700/80">Año anterior: {{ formatCLP(kpisAnioAnterior.margenBruto) }}</p>
        <p class="text-[11px] font-semibold mt-0.5" :class="claseVariacionKpi('margenBruto')">{{ textoVariacionKpi('margenBruto') }}</p>
        <p class="text-[11px] mt-2 text-teal-700/80">ingreso_explotacion + (gasto_adm_ventas - remuneraciones)</p>
      </div>
      <!-- Contribuciones -->
      <div class="rounded-xl shadow-sm p-5 border-l-4 border-fuchsia-500 bg-fuchsia-50/70 border border-fuchsia-100">
        <p class="text-xs uppercase text-fuchsia-700 font-bold tracking-wider">CONTRIBUCIONES</p>
        <p class="text-2xl font-bold text-fuchsia-900 mt-1">{{ formatCLP(kpis.contribuciones) }}</p>
        <p class="text-[11px] mt-1 text-fuchsia-700/80">Año anterior: {{ formatCLP(kpisAnioAnterior.contribuciones) }}</p>
        <p class="text-[11px] font-semibold mt-0.5" :class="claseVariacionKpi('contribuciones')">{{ textoVariacionKpi('contribuciones') }}</p>
        <p class="text-[11px] mt-2 text-fuchsia-700/80">suma de subitem impuestos_y_contribuciones</p>
      </div>
      <!-- Patente Municipal -->
      <div class="rounded-xl shadow-sm p-5 border-l-4 border border-amber-100" :class="kpis.patenteMunicipal >= 0 ? 'border-amber-500 bg-amber-50/80' : 'border-orange-500 bg-orange-50/80'">
        <p class="text-xs uppercase font-bold tracking-wider" :class="kpis.patenteMunicipal >= 0 ? 'text-amber-700' : 'text-orange-700'">PATENTE MUNICIPAL</p>
        <p class="text-2xl font-bold mt-1" :class="kpis.patenteMunicipal >= 0 ? 'text-amber-900' : 'text-orange-800'">
          {{ formatCLP(kpis.patenteMunicipal) }}
        </p>
        <p class="text-[11px] mt-1" :class="kpis.patenteMunicipal >= 0 ? 'text-amber-700/80' : 'text-orange-700/80'">
          Año anterior: {{ formatCLP(kpisAnioAnterior.patenteMunicipal) }}
        </p>
        <p class="text-[11px] font-semibold mt-0.5" :class="claseVariacionKpi('patenteMunicipal')">{{ textoVariacionKpi('patenteMunicipal') }}</p>
        <p class="text-[11px] mt-2" :class="kpis.patenteMunicipal >= 0 ? 'text-amber-700/80' : 'text-orange-700/80'">
          suma de subitem patentes
        </p>
      </div>
      <!-- Resultado del Ejercicio -->
      <div class="rounded-xl shadow-md p-5 border-l-4 border" :class="kpis.resultado >= 0 ? 'bg-emerald-950 border-emerald-500' : 'bg-rose-950 border-rose-500'">
        <p class="text-xs uppercase font-bold tracking-wider" :class="kpis.resultado >= 0 ? 'text-emerald-200' : 'text-rose-200'">Resultado del Ejercicio</p>
        <p class="text-2xl font-bold mt-1" :class="kpis.resultado >= 0 ? 'text-emerald-100' : 'text-rose-100'">
          {{ formatCLP(kpis.resultado) }}
        </p>
        <p class="text-[11px] mt-1" :class="kpis.resultado >= 0 ? 'text-emerald-300/80' : 'text-rose-300/80'">
          Año anterior: {{ formatCLP(kpisAnioAnterior.resultado) }}
        </p>
        <p class="text-[11px] font-semibold mt-0.5" :class="claseVariacionKpi('resultado', true)">{{ textoVariacionKpi('resultado') }}</p>
        <p class="text-[11px] mt-2" :class="kpis.resultado >= 0 ? 'text-emerald-300/80' : 'text-rose-300/80'">
          suma de SaldoNeto de todas las categorias
        </p>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <div class="px-5 py-4 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wide">
          Matriz {{ tipoEerr === "financiero" ? "Financiera" : "Contable" }} {{ filtroAnio }}
        </h2>
        <div class="flex flex-col items-end gap-2">
          <span class="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-semibold">
            Niveles: Categoría ▾ Subítem ▾ Cuenta ▾ Centro Costo
          </span>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
            @click="descargarMatrizEerrExcel"
          >
            Descargar Excel
          </button>
        </div>
      </div>

      <div class="overflow-x-auto max-h-[65vh]">
        <table class="min-w-[1400px] w-full text-xs border-collapse">
          <thead class="sticky top-0 z-20 bg-slate-100 shadow-sm">
            <tr class="border-b border-slate-300 text-slate-700">
              <th class="px-4 py-3 text-left font-bold min-w-[24rem]">Estructura de Cuentas</th>
              <th v-for="m in 12" :key="m" class="px-2 py-3 text-right font-bold min-w-[6.5rem]">{{ mesNombre(m) }}</th>
              <th class="px-4 py-3 text-right font-bold min-w-[8rem] bg-slate-200/50">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="grupo in matrizContable" :key="grupo.key">
              
              <tr :class="`border-y ${grupo.config.colorHeader} sticky top-[41px] z-10 shadow-sm`">
                <td class="px-4 py-2.5 font-bold text-slate-900 text-[13px] uppercase tracking-wide">{{ grupo.config.label }}</td>
                <td v-for="m in 12" :key="'g-' + m" class="px-2 py-2.5 text-right font-mono font-bold" :class="[
                  grupo.mensual[m] < 0 ? 'text-rose-700' : 'text-slate-800',
                  claseVariacionRealMensual(grupo.key, grupo.mensual[m], valorMesAnterior(m, grupo.mensual, 'grupos', grupo.key), filtroAnio, m)
                ]">
                  {{ formatCLPContable(grupo.mensual[m]) }}
                </td>
                <td class="px-4 py-2.5 text-right font-mono font-bold bg-white/30" :class="grupo.total < 0 ? 'text-rose-700' : 'text-slate-900'">
                  {{ formatCLPContable(grupo.total) }}
                </td>
              </tr>

              <template v-for="subitem in grupo.subitems" :key="subitem.key">
                <tr class="border-b border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors bg-white" @click="toggleFila(subitem.key)">
                  <td class="px-4 py-2 pl-8 font-semibold text-slate-800 flex items-center gap-2">
                    <span class="text-indigo-500 text-lg leading-none w-4">{{ filasAbiertas[subitem.key] ? "▾" : "▸" }}</span>
                    <span class="capitalize">{{ formatearNombre(subitem.nombreOriginal) }}</span>
                  </td>
                  <td v-for="m in 12" :key="'s-' + m" class="px-2 py-2 text-right font-mono text-slate-700 font-medium" :class="[
                    subitem.mensual[m] < 0 ? 'text-rose-600' : '',
                    claseVariacionRealMensual(grupo.key, subitem.mensual[m], valorMesAnterior(m, subitem.mensual, 'subitems', subitem.key), filtroAnio, m)
                  ]">
                    {{ formatCLPContable(subitem.mensual[m]) }}
                  </td>
                  <td class="px-4 py-2 text-right font-mono font-bold bg-slate-50/50" :class="subitem.total < 0 ? 'text-rose-700' : 'text-slate-800'">
                    {{ formatCLPContable(subitem.total) }}
                  </td>
                </tr>

                <template v-if="filasAbiertas[subitem.key]">
                  <template v-for="cuenta in subitem.cuentas" :key="cuenta.key">
                    
                    <tr class="border-b border-slate-100 cursor-pointer hover:bg-indigo-50/30 transition-colors bg-slate-50/50" @click="toggleFila(subitem.key + '-' + cuenta.key)">
                      <td class="px-4 py-1.5 pl-14 font-medium text-slate-700 flex items-center gap-2">
                        <span class="text-slate-400 text-lg leading-none w-4">{{ filasAbiertas[subitem.key + '-' + cuenta.key] ? "▾" : "▸" }}</span>
                        <span class="text-indigo-600 font-mono">{{ cuenta.codigo }}</span>
                        <span class="truncate max-w-[15rem]">{{ cuenta.nombre }}</span>
                      </td>
                      <td v-for="m in 12" :key="'c-' + m" class="px-2 py-1.5 text-right font-mono text-slate-600 text-[11px]" :class="[
                        cuenta.mensual[m] < 0 ? 'text-rose-500' : '',
                        claseVariacionRealMensual(grupo.key, cuenta.mensual[m], valorMesAnterior(m, cuenta.mensual, 'cuentas', `${subitem.key}-${cuenta.key}`), filtroAnio, m)
                      ]">
                        {{ formatCLPContable(cuenta.mensual[m]) }}
                      </td>
                      <td class="px-4 py-1.5 text-right font-mono font-semibold bg-slate-100/50 text-[11px]" :class="cuenta.total < 0 ? 'text-rose-600' : 'text-slate-700'">
                        {{ formatCLPContable(cuenta.total) }}
                      </td>
                    </tr>

                    <template v-if="filasAbiertas[subitem.key + '-' + cuenta.key]">
                      <tr v-for="cc in cuenta.centros" :key="cc.key" class="border-b border-slate-50 hover:bg-slate-100 transition-colors bg-white">
                        <td class="px-4 py-1 pl-[5.5rem] text-slate-500 text-[11px] flex items-center gap-1.5">
                          <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span class="font-mono text-slate-400">{{ cc.codigo === '000' ? '' : cc.codigo }}</span>
                          <span class="truncate max-w-[14rem]">{{ cc.codigo === '000' ? 'Sin Centro de Costo' : cc.nombre }}</span>
                        </td>
                        <td v-for="m in 12" :key="'cc-' + m" class="px-2 py-1 text-right font-mono text-slate-400 text-[11px]" :class="[
                          cc.mensual[m] < 0 ? 'text-rose-400' : '',
                          claseVariacionRealMensual(grupo.key, cc.mensual[m], valorMesAnterior(m, cc.mensual, 'centros', `${subitem.key}-${cuenta.key}-${cc.key}`), filtroAnio, m)
                        ]">
                          {{ formatCLPContable(cc.mensual[m]) }}
                        </td>
                        <td class="px-4 py-1 text-right font-mono font-medium text-slate-500 bg-white text-[11px]" :class="cc.total < 0 ? 'text-rose-500' : ''">
                          {{ formatCLPContable(cc.total) }}
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
      <div class="px-5 py-3 border-t border-slate-100 bg-slate-50/70">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-2">
          Criterio de comparacion real mensual (ajustado por IPC)
        </p>
        <div class="flex flex-wrap gap-2 text-[11px]">
          <span class="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            Ingresos: mejora real / Gastos: disminucion considerable
          </span>
          <span class="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-50 text-rose-700 border border-rose-100">
            <span class="w-2 h-2 rounded-full bg-rose-400"></span>
            Ingresos: caida real / Gastos: aumento considerable
          </span>
          <span class="inline-flex items-center gap-1 px-2 py-1 rounded bg-white text-slate-600 border border-slate-200">
            <span class="w-2 h-2 rounded-full bg-slate-300"></span>
            Sin color: variacion dentro de umbral o sin comparacion
          </span>
        </div>
        <p class="text-[10px] text-slate-500 mt-2">
          Referencia: mes anterior ajustado por inflacion mensual (IPC).
        </p>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <div class="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
        <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wide">
          Cuentas No Clasificadas 4 y 5 EERR {{ filtroAnio }}
        </h2>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
          @click="descargarNoClasificadas45Excel"
        >
          Descargar Excel
        </button>
      </div>
      <div class="overflow-x-auto max-h-[45vh]">
        <table class="min-w-[1400px] w-full text-xs border-collapse">
          <thead class="sticky top-0 z-10 bg-slate-100">
            <tr class="border-b border-slate-300 text-slate-700">
              <th class="px-4 py-3 text-left font-bold min-w-[24rem]">Cuenta</th>
              <th v-for="m in 12" :key="'nc-h-' + m" class="px-2 py-3 text-right font-bold min-w-[6.5rem]">
                {{ mesNombre(m) }}
              </th>
              <th class="px-4 py-3 text-right font-bold min-w-[8rem] bg-slate-200/50">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="grupo in matrizNoClasificadas45" :key="'ncg-' + grupo.key">
              <tr class="border-y bg-slate-200/70 border-slate-300">
                <td class="px-4 py-2.5 font-bold text-slate-900 uppercase tracking-wide">
                  {{ grupo.nombre }}
                </td>
                <td v-for="m in 12" :key="'ncg-m-' + grupo.key + '-' + m" class="px-2 py-2.5 text-right font-mono font-bold text-slate-800">
                  {{ formatCLPContable(grupo.mensual[m]) }}
                </td>
                <td class="px-4 py-2.5 text-right font-mono font-bold text-slate-900 bg-white/40">
                  {{ formatCLPContable(grupo.total) }}
                </td>
              </tr>

              <tr v-for="cuenta in grupo.cuentas" :key="'nc-' + grupo.key + '-' + cuenta.key" class="border-b border-slate-100 bg-white">
                <td class="px-4 py-2 text-slate-700">
                  <span class="font-mono text-indigo-600">{{ cuenta.codigo }}</span>
                  <span class="mx-2 text-slate-400">-</span>
                  <span>{{ cuenta.nombre }}</span>
                </td>
                <td v-for="m in 12" :key="'nc-' + grupo.key + '-' + cuenta.key + '-' + m" class="px-2 py-2 text-right font-mono text-slate-700">
                  {{ formatCLPContable(cuenta.mensual[m]) }}
                </td>
                <td class="px-4 py-2 text-right font-mono font-semibold text-slate-800">
                  {{ formatCLPContable(cuenta.total) }}
                </td>
              </tr>

              <tr class="bg-slate-50 border-b border-slate-300">
                <td class="px-4 py-2 font-bold text-slate-800">
                  Subtotal {{ grupo.nombre }}
                </td>
                <td v-for="m in 12" :key="'ncs-m-' + grupo.key + '-' + m" class="px-2 py-2 text-right font-mono font-bold text-slate-800">
                  {{ formatCLPContable(grupo.mensual[m]) }}
                </td>
                <td class="px-4 py-2 text-right font-mono font-bold text-slate-900">
                  {{ formatCLPContable(grupo.total) }}
                </td>
              </tr>
            </template>

            <tr class="bg-slate-100 border-t-2 border-slate-400" v-if="matrizNoClasificadas45.length">
              <td class="px-4 py-2.5 font-bold text-slate-900 uppercase tracking-wide">
                Total General
              </td>
              <td v-for="m in 12" :key="'nct-m-' + m" class="px-2 py-2.5 text-right font-mono font-bold text-slate-900">
                {{ formatCLPContable(totalNoClasificadas45.mensual[m]) }}
              </td>
              <td class="px-4 py-2.5 text-right font-mono font-bold text-slate-900 bg-white/50">
                {{ formatCLPContable(totalNoClasificadas45.total) }}
              </td>
            </tr>

            <tr v-if="!hayNoClasificadas45">
              <td colspan="14" class="px-4 py-4 text-center text-slate-500">
                No hay cuentas no clasificadas que comiencen con 4 o 5 para este año.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <div class="px-5 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wide">
            EBITDA Mensual {{ filtroAnio }}
          </h2>
          <p class="text-[11px] text-slate-500 mt-1">
            Barras: monto mensual · Línea: variación % respecto al mes anterior (enero compara con diciembre {{ filtroAnio - 1 }})
          </p>
        </div>
        <p class="text-xs font-mono font-semibold text-slate-700 shrink-0">
          Total año: <span :class="ebitdaAnual < 0 ? 'text-rose-600' : 'text-slate-900'">{{ formatCLPContable(ebitdaAnual) }}</span>
        </p>
      </div>
      <div class="p-4 pt-2">
        <VueApexCharts
          type="line"
          height="380"
          :options="chartOptionsEbitdaMixto"
          :series="chartSeriesEbitdaMixto"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 bg-white rounded-xl shadow-sm p-5 border border-slate-200">
        <h2 class="font-bold text-slate-800 mb-4">Evolución Ingresos vs Gastos</h2>
        <VueApexCharts type="bar" height="300" :options="chartOptionsBarras" :series="chartSeriesBarras" />
      </div>
      <div class="bg-white rounded-xl shadow-sm p-5 border border-slate-200">
        <h2 class="font-bold text-slate-800 mb-4">Distribución del Gasto</h2>
        <p class="text-xs text-slate-500 mb-3">
          Gastos de administración y ventas por subítem (magnitud en valor absoluto).
        </p>
        <div v-if="gastoAdmDistribucion.entries.length" class="min-h-[300px]">
          <VueApexCharts type="donut" height="300" :options="chartOptionsDonut" :series="chartSeriesDonut" />
        </div>
        <div
          v-else
          class="flex items-center justify-center h-[300px] rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 text-center px-4"
        >
          No hay datos de gasto adm. / ventas para este año y tipo EERR.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import VueApexCharts from "vue3-apexcharts";
import * as XLSX from "xlsx";
import eerrDataRaw from "../assets/datos_vue.json";
import mapeoCuentas from "../assets/config/mapeo_cuentas.json";
import macroData from "../assets/config/macro.json";
import {
  calcularKpisDesdeRows,
  normAnio,
  normMes,
  mapearDatosAnioEerr,
} from "../utils/kpiEerr.js";
import { BLOQUES_FINANCIEROS, construirMatrizContableEerr } from "../utils/eerrMatriz.js";

const props = defineProps({
  empresa: { type: String, required: true },
  variant: {
    type: String,
    default: "eerr",
    validator: (v) => ["eerr", "flujo_caja"].includes(v),
  },
});

const tituloPrincipal = computed(() =>
  props.variant === "flujo_caja" ? "Flujo de caja" : "Estado de Resultados EERR"
);

const filtroAnio = ref(new Date().getFullYear());
const tipoEerr = ref("financiero");
const filasAbiertas = ref({});

const toggleFila = (key) => {
  filasAbiertas.value[key] = !filasAbiertas.value[key];
};

const CATEGORIA_EXCLUIDA_EBITDA = "otros_gastos_financieros";
const CATEGORIAS_INGRESOS = new Set(["ingreso_explotacion", "ingreso_financiero"]);
const CATEGORIAS_GASTOS = new Set(["gasto_adm_ventas", "otros_gastos_financieros"]);
const UMBRAL_RELATIVO_NEUTRO = 0.005;
const UMBRAL_CONSIDERABLE_GASTOS = 0.03;

const datosEmpresa = computed(() =>
  eerrDataRaw.filter((d) => String(d.Empresa).trim() === String(props.empresa).trim())
);

const aniosDisponibles = computed(() => {
  const set = new Set(datosEmpresa.value.map((d) => normAnio(d.Anio)));
  const arr = Array.from(set).sort((a, b) => b - a);
  return arr.length ? arr : [new Date().getFullYear()];
});

watch(() => props.empresa, () => {
  filtroAnio.value = aniosDisponibles.value[0];
  filasAbiertas.value = {};
});

onMounted(() => {
  if (aniosDisponibles.value.length) filtroAnio.value = aniosDisponibles.value[0];
});

const ipcMensualMap = computed(() => {
  const map = new Map();
  const serie = macroData?.historico?.ipc || [];
  serie.forEach((punto) => {
    const anio = Number(punto?.anio);
    const mes = Number(punto?.mes);
    const valor = Number(punto?.valor);
    if (!Number.isFinite(anio) || !Number.isFinite(mes) || !Number.isFinite(valor)) return;
    map.set(`${anio}-${mes}`, valor);
  });
  return map;
});

function obtenerIpcMensualPct(anio, mes) {
  return ipcMensualMap.value.get(`${Number(anio)}-${Number(mes)}`) ?? 0;
}

function sonCasiIguales(actual, referencia, umbralRel = UMBRAL_RELATIVO_NEUTRO) {
  const base = Math.max(1, Math.abs(referencia));
  return Math.abs(actual - referencia) / base <= umbralRel;
}

function claseVariacionRealMensual(categoria, actual, anterior, anio, mes) {
  if (mes < 1) return "";
  const valorActual = Number(actual) || 0;
  const valorAnterior = Number(anterior) || 0;
  const ipcMensualPct = obtenerIpcMensualPct(anio, mes);
  const valorAnteriorAjustado = valorAnterior * (1 + ipcMensualPct / 100);

  if (sonCasiIguales(valorActual, valorAnteriorAjustado)) return "";

  if (CATEGORIAS_INGRESOS.has(categoria)) {
    return valorActual > valorAnteriorAjustado ? "bg-emerald-50" : "bg-rose-50";
  }

  if (CATEGORIAS_GASTOS.has(categoria)) {
    const gastoActual = Math.abs(valorActual);
    const gastoAnteriorAjustado = Math.abs(valorAnteriorAjustado);
    const umbralSuperior = gastoAnteriorAjustado * (1 + UMBRAL_CONSIDERABLE_GASTOS);
    const umbralInferior = gastoAnteriorAjustado * (1 - UMBRAL_CONSIDERABLE_GASTOS);
    if (gastoActual > umbralSuperior) return "bg-rose-50";
    if (gastoActual < umbralInferior) return "bg-emerald-50";
  }

  return "";
}

// Mapeo Inteligente
const datosAnioMapeados = computed(() =>
  mapearDatosAnioEerr(
    props.empresa,
    filtroAnio.value,
    tipoEerr.value,
    datosEmpresa.value,
    mapeoCuentas
  )
);
const datosAnioAnteriorMapeados = computed(() =>
  mapearDatosAnioEerr(
    props.empresa,
    Number(filtroAnio.value) - 1,
    tipoEerr.value,
    datosEmpresa.value,
    mapeoCuentas
  )
);
const datosAnioNoClasificados45 = computed(() => {
  const configEmpresa = mapeoCuentas?.empresas?.[props.empresa];
  if (!configEmpresa) return [];
  const mapCuentas = configEmpresa.cuentas || {};

  return datosEmpresa.value
    .filter((d) => normAnio(d.Anio) === Number(filtroAnio.value))
    .map((d) => ({
      ...d,
      Mes: normMes(d.Mes),
      SaldoNeto: Number(d.SaldoNeto ?? 0),
      CodigoCuenta: String(d.CodigoCuenta ?? "").trim(),
      NombreCuenta: d.NombreCuenta || d.Cuenta || "Sin Nombre",
    }))
    .filter((d) => {
      const cod = d.CodigoCuenta;
      if (!cod) return false;
      const esCuenta45 = cod.startsWith("4") || cod.startsWith("5");
      if (!esCuenta45) return false;

      const cfg = mapCuentas[cod];
      // Se considera no clasificada para el tipo EERR actual si:
      // - no existe en el mapeo, o
      // - existe pero no incluye el tipo seleccionado.
      if (!cfg) return true;
      const tiposCuenta = Array.isArray(cfg.eerr) ? cfg.eerr : ["financiero", "contable"];
      return !tiposCuenta.includes(tipoEerr.value);
    });
});

const matrizNoClasificadas45 = computed(() => {
  const grupos = new Map([
    [
      "4",
      {
        key: "4",
        nombre: "Ingresos",
        mensual: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0 },
        total: 0,
        cuentasMap: new Map(),
      },
    ],
    [
      "5",
      {
        key: "5",
        nombre: "Costos de Explotación",
        mensual: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0 },
        total: 0,
        cuentasMap: new Map(),
      },
    ],
  ]);

  datosAnioNoClasificados45.value.forEach((d) => {
    const tipo = String(d.CodigoCuenta || "").charAt(0);
    const grupo = grupos.get(tipo);
    if (!grupo) return;

    if (!grupo.cuentasMap.has(d.CodigoCuenta)) {
      grupo.cuentasMap.set(d.CodigoCuenta, {
        key: d.CodigoCuenta,
        codigo: d.CodigoCuenta,
        nombre: d.NombreCuenta,
        mensual: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0 },
        total: 0,
      });
    }

    const row = grupo.cuentasMap.get(d.CodigoCuenta);
    row.mensual[d.Mes] += d.SaldoNeto;
    row.total += d.SaldoNeto;

    grupo.mensual[d.Mes] += d.SaldoNeto;
    grupo.total += d.SaldoNeto;
  });

  return ["4", "5"].map((k) => {
    const grupo = grupos.get(k);
    return {
      ...grupo,
      cuentas: Array.from(grupo.cuentasMap.values()).sort((a, b) =>
        a.codigo.localeCompare(b.codigo, "es", { numeric: true })
      ),
    };
  });
});

const hayNoClasificadas45 = computed(() =>
  matrizNoClasificadas45.value.some((g) => g.cuentas.length > 0)
);

const totalNoClasificadas45 = computed(() => {
  const mensual = { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0 };
  let total = 0;

  matrizNoClasificadas45.value.forEach((g) => {
    for (let m = 1; m <= 12; m += 1) {
      mensual[m] += Number(g.mensual[m] || 0);
    }
    total += Number(g.total || 0);
  });

  return { mensual, total };
});

function descargarNoClasificadas45Excel() {
  const filas = [];

  matrizNoClasificadas45.value.forEach((grupo) => {
    grupo.cuentas.forEach((cuenta) => {
      filas.push({
        Grupo: grupo.nombre,
        CodigoCuenta: cuenta.codigo,
        NombreCuenta: cuenta.nombre,
        Enero: Number(cuenta.mensual[1] || 0),
        Febrero: Number(cuenta.mensual[2] || 0),
        Marzo: Number(cuenta.mensual[3] || 0),
        Abril: Number(cuenta.mensual[4] || 0),
        Mayo: Number(cuenta.mensual[5] || 0),
        Junio: Number(cuenta.mensual[6] || 0),
        Julio: Number(cuenta.mensual[7] || 0),
        Agosto: Number(cuenta.mensual[8] || 0),
        Septiembre: Number(cuenta.mensual[9] || 0),
        Octubre: Number(cuenta.mensual[10] || 0),
        Noviembre: Number(cuenta.mensual[11] || 0),
        Diciembre: Number(cuenta.mensual[12] || 0),
        Total: Number(cuenta.total || 0),
      });
    });
  });

  if (!filas.length) return;

  const worksheet = XLSX.utils.json_to_sheet(filas);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "NoClasificadas45");

  const nombreArchivo = `no_clasificadas_45_${props.empresa}_${filtroAnio.value}.xlsx`;
  XLSX.writeFile(workbook, nombreArchivo);
}

function descargarMatrizEerrExcel() {
  const filas = [];

  matrizContable.value.forEach((grupo) => {
    grupo.subitems.forEach((sub) => {
      sub.cuentas.forEach((cta) => {
        cta.centros.forEach((cc) => {
          filas.push({
            Categoria: grupo.config.label,
            Subitem: sub.nombreOriginal,
            CodigoCuenta: cta.codigo,
            NombreCuenta: cta.nombre,
            CodigoCentroCosto: cc.codigo,
            CentroCosto: cc.codigo === "000" ? "Sin Centro de Costo" : cc.nombre,
            Enero: Number(cc.mensual[1] || 0),
            Febrero: Number(cc.mensual[2] || 0),
            Marzo: Number(cc.mensual[3] || 0),
            Abril: Number(cc.mensual[4] || 0),
            Mayo: Number(cc.mensual[5] || 0),
            Junio: Number(cc.mensual[6] || 0),
            Julio: Number(cc.mensual[7] || 0),
            Agosto: Number(cc.mensual[8] || 0),
            Septiembre: Number(cc.mensual[9] || 0),
            Octubre: Number(cc.mensual[10] || 0),
            Noviembre: Number(cc.mensual[11] || 0),
            Diciembre: Number(cc.mensual[12] || 0),
            Total: Number(cc.total || 0),
          });
        });
      });
    });
  });

  if (!filas.length) return;

  const worksheet = XLSX.utils.json_to_sheet(filas);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "MatrizEERR");

  const tipo = tipoEerr.value === "financiero" ? "financiera" : "contable";
  const nombreArchivo = `matriz_eerr_${tipo}_${props.empresa}_${filtroAnio.value}.xlsx`;
  XLSX.writeFile(workbook, nombreArchivo);
}

const diciembreAnteriorPorNivel = computed(() => {
  const grupos = new Map();
  const subitems = new Map();
  const cuentas = new Map();
  const centros = new Map();

  datosAnioAnteriorMapeados.value.forEach((d) => {
    if (d.Mes !== 12) return;
    const categoria = d.Categoria;
    if (!BLOQUES_FINANCIEROS.some((b) => b.key === categoria)) return;
    const subitem = d.Subitem || "sin_subitem";
    const cuenta = d.CodigoCuenta || "sin_cuenta";
    const cc = d.CodigoCentroCosto || "000";
    const monto = Number(d.SaldoNeto) || 0;

    const subitemKey = `${categoria}-${subitem}`;
    const cuentaKey = `${subitemKey}-${cuenta}`;
    const centroKey = `${cuentaKey}-${cc}`;

    grupos.set(categoria, (grupos.get(categoria) || 0) + monto);
    subitems.set(subitemKey, (subitems.get(subitemKey) || 0) + monto);
    cuentas.set(cuentaKey, (cuentas.get(cuentaKey) || 0) + monto);
    centros.set(centroKey, (centros.get(centroKey) || 0) + monto);
  });

  return { grupos, subitems, cuentas, centros };
});

function valorMesAnterior(mes, mensual, nivel, keyNivel) {
  if (mes > 1) return Number(mensual?.[mes - 1]) || 0;
  const map = diciembreAnteriorPorNivel.value[nivel];
  return Number(map?.get(keyNivel)) || 0;
}

const matrizContable = computed(() =>
  construirMatrizContableEerr(datosAnioMapeados.value, props.empresa, mapeoCuentas)
);

const kpis = computed(() => calcularKpisDesdeRows(datosAnioMapeados.value));
const kpisAnioAnterior = computed(() => calcularKpisDesdeRows(datosAnioAnteriorMapeados.value));

const KPIS_MEJORA_CUANDO_SUBE = new Set(["ingresos", "ingresosFinancieros", "ebitda", "margenBruto", "resultado"]);
const KPIS_COMPARAR_ABSOLUTO = new Set(["gastos", "contribuciones", "patenteMunicipal"]);

function variacionKpiPorcentual(key) {
  const actualRaw = Number(kpis.value[key] ?? 0);
  const anteriorRaw = Number(kpisAnioAnterior.value[key] ?? 0);
  const actual = KPIS_COMPARAR_ABSOLUTO.has(key) ? Math.abs(actualRaw) : actualRaw;
  const anterior = KPIS_COMPARAR_ABSOLUTO.has(key) ? Math.abs(anteriorRaw) : anteriorRaw;
  if (!Number.isFinite(anterior) || anterior === 0) return null;
  return ((actual - anterior) / Math.abs(anterior)) * 100;
}

function textoVariacionKpi(key) {
  const variacion = variacionKpiPorcentual(key);
  if (variacion === null) return "• Var: N/A";
  const flecha = variacion >= 0 ? "▲" : "▼";
  const signo = variacion > 0 ? "+" : "";
  return `${flecha} Var: ${signo}${variacion.toFixed(1)}%`;
}

function claseVariacionKpi(key, modoOscuro = false) {
  const variacion = variacionKpiPorcentual(key);
  if (variacion === null) return modoOscuro ? "text-slate-300" : "text-slate-500";

  const mejora = KPIS_MEJORA_CUANDO_SUBE.has(key) ? variacion >= 0 : variacion <= 0;
  if (modoOscuro) return mejora ? "text-emerald-300" : "text-rose-300";
  return mejora ? "text-emerald-600" : "text-rose-600";
}

function computeEbitdaMensualFromRows(rows) {
  const mensual = Array(12).fill(0);
  rows.forEach((d) => {
    const idx = d.Mes - 1;
    if (idx < 0 || idx > 11) return;

    const esIngreso = d.Categoria === "ingreso_explotacion" || d.Categoria === "ingreso_financiero";
    const esOtrosGastosFinancieros = d.Categoria === CATEGORIA_EXCLUIDA_EBITDA;
    const esGastoAdmVentasConsiderado = d.Categoria === "gasto_adm_ventas";

    if (!esOtrosGastosFinancieros && (esIngreso || esGastoAdmVentasConsiderado)) {
      mensual[idx] += d.SaldoNeto;
    }
  });
  return mensual;
}

const ebitdaMensual = computed(() => computeEbitdaMensualFromRows(datosAnioMapeados.value));

const ebitdaDiciembreAnioAnterior = computed(() => {
  const m = computeEbitdaMensualFromRows(datosAnioAnteriorMapeados.value);
  return m[11];
});

/** Variación % vs mes calendario anterior; enero usa diciembre del año anterior. */
const ebitdaVariacionMesAnteriorPct = computed(() => {
  const mes = ebitdaMensual.value;
  const prevDec = ebitdaDiciembreAnioAnterior.value;
  const out = [];
  for (let i = 0; i < 12; i += 1) {
    const actual = Number(mes[i]) || 0;
    const anterior = i > 0 ? Number(mes[i - 1]) || 0 : prevDec;
    if (!Number.isFinite(anterior) || Math.abs(anterior) < 1e-6) {
      out.push(null);
      continue;
    }
    out.push(((actual - anterior) / Math.abs(anterior)) * 100);
  }
  return out;
});

const ebitdaAnual = computed(() => kpis.value.ebitda);

const chartSeriesEbitdaMixto = computed(() => [
  {
    name: "EBITDA",
    type: "column",
    data: [...ebitdaMensual.value],
  },
  {
    name: "Var. vs mes ant. (%)",
    type: "line",
    data: [...ebitdaVariacionMesAnteriorPct.value],
  },
]);

const chartOptionsEbitdaMixto = computed(() => ({
  chart: {
    type: "line",
    fontFamily: "inherit",
    toolbar: { show: false },
    zoom: { enabled: false },
  },
  colors: ["#7c3aed", "#0ea5e9"],
  plotOptions: {
    bar: {
      columnWidth: "55%",
      borderRadius: 4,
    },
  },
  dataLabels: { enabled: false },
  stroke: {
    width: [0, 3],
    curve: "smooth",
  },
  markers: {
    size: [0, 4],
    strokeWidth: 2,
    hover: { sizeOffset: 2 },
  },
  xaxis: {
    categories: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
  },
  yaxis: [
    {
      seriesName: "EBITDA",
      title: { text: "EBITDA", style: { fontSize: "11px", color: "#64748b" } },
      labels: {
        formatter: (val) => {
          const n = Number(val);
          if (!Number.isFinite(n)) return "";
          const abs = Math.abs(n);
          if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
          if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
          if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}k`;
          return `$${Math.round(n)}`;
        },
      },
    },
    {
      seriesName: "Var. vs mes ant. (%)",
      opposite: true,
      title: { text: "Variación % (mes ant.)", style: { fontSize: "11px", color: "#64748b" } },
      labels: {
        formatter: (val) => {
          const n = Number(val);
          if (!Number.isFinite(n)) return "";
          return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
        },
      },
    },
  ],
  tooltip: {
    shared: true,
    intersect: false,
    y: {
      formatter: (val, opts) => {
        const idx = opts?.seriesIndex;
        if (idx === 1) {
          if (val == null || val === "") return "N/A (mes ant. ~0)";
          const n = Number(val);
          if (!Number.isFinite(n)) return "";
          return `${n >= 0 ? "+" : ""}${n.toFixed(1)}% vs mes anterior`;
        }
        return val == null || val === "" ? "" : formatCLP(val);
      },
    },
  },
  legend: {
    position: "top",
    horizontalAlign: "right",
  },
  grid: {
    borderColor: "#e2e8f0",
    strokeDashArray: 4,
  },
}));

const chartSeriesBarras = computed(() => {
  const ingresos = Array(12).fill(0);
  const gastos = Array(12).fill(0);

  datosAnioMapeados.value.forEach((d) => {
    const idx = d.Mes - 1;
    if (d.Categoria === "ingreso_explotacion" || d.Categoria === "ingreso_financiero") {
      ingresos[idx] += d.SaldoNeto;
    } else {
      gastos[idx] += d.SaldoNeto;
    }
  });

  return [
    { name: "Ingresos Totales", data: ingresos },
    { name: "Gastos Totales", data: gastos },
  ];
});

const chartOptionsBarras = computed(() => ({
  chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit" },
  colors: ["#10B981", "#EF4444"],
  plotOptions: { bar: { columnWidth: "50%", borderRadius: 2 } },
  dataLabels: { enabled: false },
  stroke: { show: true, width: 2, colors: ["transparent"] },
  xaxis: { categories: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"] },
  yaxis: { labels: { formatter: (val) => "$" + (val / 1000000).toFixed(1) + "M" } },
  tooltip: { y: { formatter: (val) => formatCLP(val) } },
}));

const PALETA_DONUT_GASTO = [
  "#DC2626", "#EA580C", "#D97706", "#CA8A04", "#65A30D", "#16A34A",
  "#0D9488", "#0891B2", "#2563EB", "#7C3AED", "#C026D3", "#DB2777",
];

/** Saldos de gasto adm. suelen ser negativos; la dona necesita magnitudes positivas y etiquetas alineadas. */
const gastoAdmDistribucion = computed(() => {
  const map = new Map();
  datosAnioMapeados.value
    .filter((d) => d.Categoria === "gasto_adm_ventas")
    .forEach((d) => {
      const key = d.Subitem || "sin_subitem";
      map.set(key, (map.get(key) || 0) + Number(d.SaldoNeto ?? 0));
    });

  const entries = [...map.entries()]
    .map(([nombre, raw]) => ({
      nombre,
      magnitud: Math.abs(Number(raw) || 0),
      raw: Number(raw) || 0,
    }))
    .filter((e) => e.magnitud > 1e-9)
    .sort((a, b) => b.magnitud - a.magnitud);

  const totalMagnitud = entries.reduce((s, e) => s + e.magnitud, 0);
  return { entries, totalMagnitud };
});

const chartSeriesDonut = computed(() =>
  gastoAdmDistribucion.value.entries.map((e) => e.magnitud)
);

const chartOptionsDonut = computed(() => {
  const { entries, totalMagnitud } = gastoAdmDistribucion.value;
  const labels = entries.map((e) => formatearNombre(e.nombre));
  const n = entries.length;
  const colors = Array.from({ length: n }, (_, i) => PALETA_DONUT_GASTO[i % PALETA_DONUT_GASTO.length]);

  return {
    chart: {
      type: "donut",
      fontFamily: "inherit",
      toolbar: { show: false },
    },
    labels,
    colors,
    stroke: { width: 2, colors: ["#fff"] },
    plotOptions: {
      pie: {
        expandOnClick: false,
        donut: {
          size: "62%",
          labels: {
            show: true,
            name: { fontSize: "12px" },
            value: {
              fontSize: "14px",
              fontWeight: 600,
              formatter: (val) => formatCLP(val),
            },
            total: {
              show: true,
              showAlways: entries.length > 0,
              label: "Total",
              fontSize: "11px",
              color: "#64748b",
              formatter: () => formatCLP(totalMagnitud),
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `${Number(val).toFixed(1)}%`,
      style: { fontSize: "10px", fontWeight: 500 },
      dropShadow: { enabled: false },
    },
    legend: {
      position: "bottom",
      fontSize: "11px",
    },
    tooltip: {
      y: {
        formatter: (val, opts) => {
          const i = opts?.seriesIndex;
          const e = typeof i === "number" ? entries[i] : undefined;
          const pct = totalMagnitud > 0 && val != null ? (Number(val) / totalMagnitud) * 100 : 0;
          const base = `${formatCLP(val)} · ${pct.toFixed(1)}% del total`;
          if (e && e.raw < 0) return `${base} (saldo contable negativo)`;
          return base;
        },
      },
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: { height: 280 },
          legend: { position: "bottom" },
        },
      },
    ],
  };
});

const formatCLP = (v) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Math.round(Number(v || 0)));
const formatCLPContable = (v) => {
  if (!v || v === 0) return "-";
  const n = Math.round(Number(v));
  const abs = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(Math.abs(n));
  return n < 0 ? `(${abs})` : abs;
};
const formatearNombre = (t) => String(t || "").replace(/_/g, " ");
const mesNombre = (m) => ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][m - 1];
const mesNombreAbrev = (m) => ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][m - 1];
</script>