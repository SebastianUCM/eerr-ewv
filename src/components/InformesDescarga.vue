<template>
  <div class="min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-slate-800">
    <header class="flex flex-col lg:flex-row justify-between items-start gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Informes ejecutivos</h1>
        <p class="text-sm text-slate-500 mt-1">
          Exportación Excel (tablas) y PDF (vista con gráficos) — {{ props.empresa }}
        </p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex flex-wrap items-center gap-3 max-w-4xl">
        <label class="text-xs font-semibold uppercase text-slate-500">Año</label>
        <select
          v-model.number="filtroAnio"
          class="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white font-medium outline-none"
        >
          <option v-for="a in aniosDisponibles" :key="a" :value="a">{{ a }}</option>
        </select>
        <label class="text-xs font-semibold uppercase text-slate-500">Desde mes</label>
        <select v-model.number="mesDesde" class="border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white outline-none">
          <option v-for="m in 12" :key="'d-' + m" :value="m">{{ mesNombre(m) }}</option>
        </select>
        <label class="text-xs font-semibold uppercase text-slate-500">Hasta mes</label>
        <select v-model.number="mesHasta" class="border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white outline-none">
          <option v-for="m in 12" :key="'h-' + m" :value="m">{{ mesNombre(m) }}</option>
        </select>
        <label class="text-xs font-semibold uppercase text-slate-500">Norma balance</label>
        <select v-model="normaBalance" class="border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white outline-none">
          <option value="Trib">Tributario</option>
          <option value="IFRS">IFRS</option>
        </select>
        <label class="text-xs font-semibold uppercase text-slate-500">Tipo EERR</label>
        <select v-model="tipoEerr" class="border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white outline-none">
          <option value="financiero">Financiero</option>
          <option value="contable">Contable</option>
        </select>
        <div class="w-full sm:w-auto flex flex-wrap gap-2 border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-3">
          <button
            type="button"
            class="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
            :disabled="cargandoPdf"
            @click="onDescargarExcel"
          >
            Descargar Excel
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
            :disabled="cargandoPdf"
            @click="onDescargarPdf"
          >
            {{ cargandoPdf ? "Generando PDF…" : "Descargar PDF" }}
          </button>
        </div>
      </div>
    </header>

    <div v-if="!filasAnioMapeadas.length" class="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm">
      No hay movimientos EERR mapeados para esta empresa y año.
    </div>

    <div
      v-else
      ref="regionPdfRef"
      class="informe-pdf-root mx-auto max-w-[900px] rounded-2xl border border-slate-200/90 bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.15)] ring-1 ring-slate-900/[0.04]"
    >
      <header
        class="informe-pdf-hero relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 px-8 py-10 text-white"
      >
        <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-400/15 blur-3xl" aria-hidden="true" />
        <div class="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-[28rem] rounded-full bg-teal-400/10 blur-3xl" aria-hidden="true" />
        <div class="relative">
          <p class="text-[11px] font-bold uppercase tracking-[0.35em] text-indigo-200/95">Informe financiero ejecutivo</p>
          <h2 class="mt-3 text-3xl font-bold tracking-tight text-white sm:text-[1.75rem] leading-tight">
            {{ props.empresa }}
          </h2>
          <div class="mt-6 flex flex-wrap gap-2.5 text-[13px]">
            <span
              class="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-1.5 font-medium backdrop-blur-sm"
            >
              <span class="text-indigo-200/90 mr-2">Periodo</span>
              {{ filtroAnio }} · {{ mesNombre(mesDesde) }} – {{ mesNombre(mesHasta) }}
            </span>
            <span
              class="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-1.5 font-medium backdrop-blur-sm"
            >
              <span class="text-indigo-200/90 mr-2">Balance</span>
              {{ normaBalance }} · corte {{ mesNombre(mesHasta) }}
            </span>
            <span
              class="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-1.5 font-medium backdrop-blur-sm"
            >
              <span class="text-indigo-200/90 mr-2">EERR</span>
              {{ tipoEerr === "financiero" ? "Financiero" : "Contable" }}
            </span>
          </div>
          <p class="mt-5 max-w-2xl text-sm leading-relaxed text-indigo-100/85">
            Comparativo EERR frente a {{ filtroAnio - 1 }} (mismos meses). Ratios y montos de balance según norma seleccionada.
          </p>
          <p class="mt-4 text-[11px] font-medium text-indigo-300/80">
            Documento · {{ fechaPieInforme }}
          </p>
        </div>
      </header>

      <div class="informe-pdf-body space-y-12 bg-gradient-to-b from-slate-50/90 to-white px-6 py-10 sm:px-8">
        <section class="space-y-5">
          <div class="informe-pdf-section-head">
            <span class="informe-pdf-badge">01</span>
            <div class="min-w-0 flex-1">
              <h3 class="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Indicadores</h3>
              <p class="text-sm text-slate-400">Periodo actual vs año anterior (mismos meses)</p>
            </div>
            <div class="informe-pdf-rule" />
          </div>
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div
              v-for="(meta, idx) in metricasTabla"
              :key="meta.key"
              class="informe-pdf-kpi rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
              :class="['informe-pdf-kpi-accent', `informe-pdf-kpi-tone-${idx % 3}`]"
            >
              <p class="text-[10px] font-bold uppercase tracking-wide text-slate-500">{{ meta.label }}</p>
              <p class="mt-1.5 text-lg font-bold tabular-nums text-slate-900">
                {{ formatearValorMeta(meta, mergedActual[meta.key]) }}
              </p>
              <p class="mt-1 text-[11px] text-slate-500">
                <span class="text-slate-400">Año ant.</span>
                {{ formatearValorMeta(meta, mergedAnterior[meta.key]) }}
              </p>
            </div>
          </div>
        </section>

        <section class="space-y-5">
          <div class="informe-pdf-section-head">
            <span class="informe-pdf-badge">02</span>
            <div class="min-w-0 flex-1">
              <h3 class="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Análisis visual</h3>
              <p class="text-sm text-slate-400">Evolución y composición del periodo</p>
            </div>
            <div class="informe-pdf-rule" />
          </div>

          <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div class="informe-pdf-chart-card">
              <div class="informe-pdf-chart-title">
                <span class="informe-pdf-dot bg-emerald-500" />
                Ingresos vs gastos (periodo)
              </div>
              <div class="informe-chart-surface">
                <VueApexCharts
                  :key="`bar-ig-${chartRevision}`"
                  type="bar"
                  height="300"
                  :options="chartBarOptions"
                  :series="chartBarSeries"
                />
              </div>
            </div>
            <div class="informe-pdf-chart-card">
              <div class="informe-pdf-chart-title flex-wrap">
                <span class="informe-pdf-dot bg-rose-500" />
                Composición de gastos
              </div>
              <p class="mb-2 text-[11px] leading-snug text-slate-500">{{ donutGastoDistribucion.descripcion }}</p>
              <p v-if="!chartDonutSeries.length" class="py-10 text-center text-sm text-slate-500">Sin datos en el periodo.</p>
              <div v-else class="informe-chart-surface">
                <VueApexCharts
                  :key="`donut-gav-${chartRevision}`"
                  type="donut"
                  height="300"
                  :options="chartDonutOptions"
                  :series="chartDonutSeries"
                />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div class="informe-pdf-chart-card">
              <div class="informe-pdf-chart-title">
                <span class="informe-pdf-dot bg-violet-500" />
                EBITDA mensual · {{ filtroAnio }} vs {{ filtroAnio - 1 }}
              </div>
              <div class="informe-chart-surface">
                <VueApexCharts
                  :key="`line-ebitda-${chartRevision}`"
                  type="line"
                  height="300"
                  :options="chartEbitdaLineOptions"
                  :series="chartEbitdaLineSeries"
                />
              </div>
            </div>
            <div class="informe-pdf-chart-card">
              <div class="informe-pdf-chart-title">
                <span class="informe-pdf-dot bg-emerald-600" />
                Ingresos mensuales · año actual vs anterior
              </div>
              <div class="informe-chart-surface">
                <VueApexCharts
                  :key="`line-ing-${chartRevision}`"
                  type="line"
                  height="300"
                  :options="chartIngresosYoYOptions"
                  :series="chartIngresosYoYSeries"
                />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div class="informe-pdf-chart-card">
              <div class="informe-pdf-chart-title">
                <span class="informe-pdf-dot bg-sky-500" />
                Resultado y margen bruto por mes ({{ filtroAnio }})
              </div>
              <div class="informe-chart-surface">
                <VueApexCharts
                  :key="`area-res-${chartRevision}`"
                  type="area"
                  height="300"
                  :options="chartResultadoAreaOptions"
                  :series="chartResultadoAreaSeries"
                />
              </div>
            </div>
            <div class="informe-pdf-chart-card">
              <div class="informe-pdf-chart-title">
                <span class="informe-pdf-dot bg-indigo-500" />
                KPIs EERR · periodo vs año anterior
              </div>
              <div class="informe-chart-surface">
                <VueApexCharts
                  :key="`bar-kpi-${chartRevision}`"
                  type="bar"
                  height="300"
                  :options="chartKpiGroupedOptions"
                  :series="chartKpiGroupedSeries"
                />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div class="informe-pdf-chart-card">
              <div class="informe-pdf-chart-title">
                <span class="informe-pdf-dot bg-teal-500" />
                EERR por categoría (total periodo)
              </div>
              <p v-if="!tieneGraficoCategoriasEerr" class="py-10 text-center text-sm text-slate-500">Sin datos por categoría.</p>
              <div v-else class="informe-chart-surface informe-chart-surface--tall">
                <VueApexCharts
                  :key="`bar-h-cat-${chartRevision}`"
                  type="bar"
                  height="340"
                  :options="chartCategoriaHorizOptions"
                  :series="chartCategoriaHorizSeries"
                />
              </div>
            </div>
            <div class="informe-pdf-chart-card">
              <div class="informe-pdf-chart-title">
                <span class="informe-pdf-dot bg-blue-600" />
                Balance · montos clave (corte {{ mesNombre(mesHasta) }})
              </div>
              <div class="informe-chart-surface informe-chart-surface--tall">
                <VueApexCharts
                  :key="`bar-bal-${chartRevision}`"
                  type="bar"
                  height="340"
                  :options="chartBalanceGroupedOptions"
                  :series="chartBalanceGroupedSeries"
                />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div class="informe-pdf-chart-card">
              <div class="informe-pdf-chart-title text-sm">
                <span class="informe-pdf-dot bg-teal-600" />
                Liquidez y endeudamiento
              </div>
              <div class="informe-chart-surface">
                <VueApexCharts
                  :key="`bar-liq-${chartRevision}`"
                  type="bar"
                  height="300"
                  :options="chartLiquidezEndeudamientoOptions"
                  :series="chartLiquidezEndeudamientoSeries"
                />
              </div>
            </div>
            <div class="informe-pdf-chart-card">
              <div class="informe-pdf-chart-title text-sm">
                <span class="informe-pdf-dot bg-amber-600" />
                Deuda / EBITDA
              </div>
              <div class="informe-chart-surface">
                <VueApexCharts
                  :key="`bar-de-${chartRevision}`"
                  type="bar"
                  height="300"
                  :options="chartDeudaEbitdaBarOptions"
                  :series="chartDeudaEbitdaBarSeries"
                />
              </div>
            </div>
            <div class="informe-pdf-chart-card">
              <div class="informe-pdf-chart-title text-sm">
                <span class="informe-pdf-dot bg-rose-500" />
                Participación gastos por categoría EERR
              </div>
              <p v-if="!chartGastosPorCatSeries.length" class="py-10 text-center text-sm text-slate-500">Sin gastos en el periodo.</p>
              <div v-else class="informe-chart-surface">
                <VueApexCharts
                  :key="`pie-g-${chartRevision}`"
                  type="pie"
                  height="300"
                  :options="chartGastosPorCatOptions"
                  :series="chartGastosPorCatSeries"
                />
              </div>
            </div>
          </div>
        </section>

        <section class="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          <div class="informe-pdf-section-head border-b border-slate-100 bg-slate-50/90 px-5 py-4">
            <span class="informe-pdf-badge">03</span>
            <div class="min-w-0 flex-1">
              <h3 class="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Detalle tabular</h3>
              <p class="text-sm text-slate-400">EERR por categoría · total del periodo</p>
            </div>
          </div>
          <div class="overflow-x-auto p-1">
            <table class="informe-pdf-table min-w-[640px] w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th class="text-left">Categoría</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, ri) in eerrCategorias" :key="row.categoria" :class="ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'">
                  <td class="py-2.5 font-medium text-slate-800">{{ row.categoria }}</td>
                  <td class="py-2.5 text-right font-mono tabular-nums text-slate-900">{{ formatCLP(row.total) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="space-y-4">
          <div class="informe-pdf-section-head">
            <span class="informe-pdf-badge">04</span>
            <div class="min-w-0 flex-1">
              <h3 class="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Estado de resultados (EERR) completo</h3>
              <p class="text-sm text-slate-400">
                Año {{ filtroAnio }} · {{ tipoEerr === "financiero" ? "Financiero" : "Contable" }} · desglose mensual (12 meses)
              </p>
            </div>
            <div class="informe-pdf-rule" />
          </div>
          <div v-if="!matrizEerrCompleta.length" class="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Sin filas EERR mapeadas para este año y tipo.
          </div>
          <div v-else class="overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-sm">
            <table class="informe-pdf-matrix min-w-[920px] w-full border-collapse text-[9px] leading-tight">
              <thead>
                <tr class="bg-slate-100 text-slate-600">
                  <th class="sticky left-0 z-10 bg-slate-100 px-2 py-2 text-left font-bold border-b border-slate-200">Concepto</th>
                  <th v-for="mm in 12" :key="'m-' + mm" class="px-1 py-2 text-right font-semibold border-b border-slate-200 whitespace-nowrap">
                    {{ mesNombre(mm).slice(0, 3) }}
                  </th>
                  <th class="px-2 py-2 text-right font-bold border-b border-slate-200 border-l border-slate-200">Total</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="cat in matrizEerrCompleta" :key="cat.key">
                  <tr class="bg-indigo-50/80 font-semibold text-indigo-950">
                    <td class="sticky left-0 z-[1] bg-indigo-50/95 px-2 py-1.5 border-b border-indigo-100">{{ cat.label }}</td>
                    <td v-for="mm in 12" :key="cat.key + '-c-' + mm" class="px-1 py-1.5 text-right font-mono tabular-nums border-b border-indigo-100">
                      {{ formatCLP(cat.mensual[mm]) }}
                    </td>
                    <td class="px-2 py-1.5 text-right font-mono font-bold tabular-nums border-b border-indigo-100 border-l border-indigo-200">
                      {{ formatCLP(cat.total) }}
                    </td>
                  </tr>
                  <template v-for="sub in cat.subitems" :key="sub.key">
                    <tr class="bg-white text-slate-800">
                      <td class="sticky left-0 z-[1] bg-white px-2 py-1 pl-5 border-b border-slate-100">{{ String(sub.nombreOriginal).replace(/_/g, " ") }}</td>
                      <td v-for="mm in 12" :key="sub.key + '-m-' + mm" class="px-1 py-1 text-right font-mono tabular-nums text-slate-700 border-b border-slate-100">
                        {{ formatCLP(sub.mensual[mm]) }}
                      </td>
                      <td class="px-2 py-1 text-right font-mono tabular-nums font-medium border-b border-slate-100 border-l border-slate-200">
                        {{ formatCLP(sub.total) }}
                      </td>
                    </tr>
                    <template v-for="cuenta in sub.cuentas" :key="cuenta.codigo">
                      <tr class="bg-slate-50/50">
                        <td class="sticky left-0 z-[1] bg-slate-50/95 px-2 py-0.5 pl-7 text-[8px] text-slate-700 border-b border-slate-100">
                          <span class="font-mono text-slate-600">{{ cuenta.codigo }}</span>
                          <span class="ml-1">{{ cuenta.nombre }}</span>
                        </td>
                        <td v-for="mm in 12" :key="cuenta.codigo + '-cm-' + mm" class="px-1 py-0.5 text-right font-mono tabular-nums text-slate-600 border-b border-slate-100">
                          {{ formatCLP(cuenta.mensual[mm]) }}
                        </td>
                        <td class="px-2 py-0.5 text-right font-mono tabular-nums border-b border-slate-100 border-l border-slate-200">
                          {{ formatCLP(cuenta.total) }}
                        </td>
                      </tr>
                      <tr
                        v-for="cc in cuenta.centros"
                        :key="cuenta.codigo + '-cc-' + cc.codigo"
                        class="bg-white"
                      >
                        <td class="sticky left-0 z-[1] bg-white px-2 py-0.5 pl-10 text-[8px] text-slate-500 border-b border-slate-50">
                          <span class="font-mono">{{ cc.codigo }}</span>
                          <span class="ml-1">{{ cc.nombre }}</span>
                        </td>
                        <td v-for="mm in 12" :key="cuenta.codigo + '-' + cc.codigo + '-ccm-' + mm" class="px-1 py-0.5 text-right font-mono tabular-nums text-slate-500 border-b border-slate-50">
                          {{ formatCLP(cc.mensual[mm]) }}
                        </td>
                        <td class="px-2 py-0.5 text-right font-mono tabular-nums text-slate-600 border-b border-slate-50 border-l border-slate-100">
                          {{ formatCLP(cc.total) }}
                        </td>
                      </tr>
                    </template>
                  </template>
                </template>
              </tbody>
            </table>
          </div>
        </section>

        <section class="space-y-4">
          <div class="informe-pdf-section-head">
            <span class="informe-pdf-badge">05</span>
            <div class="min-w-0 flex-1">
              <h3 class="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Balance completo</h3>
              <p class="text-sm text-slate-400">
                {{ normaBalance === "IFRS" ? "IFRS" : "Tributario" }} · acumulado a {{ mesNombre(mesHasta) }} {{ filtroAnio }}
              </p>
            </div>
            <div class="informe-pdf-rule" />
          </div>
          <div class="overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-sm">
            <table class="informe-pdf-matrix min-w-[1100px] w-full border-collapse text-[9px]">
              <thead>
                <tr class="bg-slate-100 text-slate-600">
                  <th class="px-2 py-2 text-left font-bold border-b border-slate-200">Código</th>
                  <th class="px-2 py-2 text-left font-bold border-b border-slate-200 min-w-[8rem]">Nombre</th>
                  <th class="px-1 py-2 text-right font-semibold border-b border-slate-200">Débitos</th>
                  <th class="px-1 py-2 text-right font-semibold border-b border-slate-200">Créditos</th>
                  <th class="px-1 py-2 text-right font-semibold border-b border-slate-200">Deudor</th>
                  <th class="px-1 py-2 text-right font-semibold border-b border-slate-200">Acreedor</th>
                  <th class="px-1 py-2 text-right font-semibold border-b border-slate-200 bg-indigo-50/40">Activo</th>
                  <th class="px-1 py-2 text-right font-semibold border-b border-slate-200 bg-indigo-50/40">Pasivo</th>
                  <th class="px-1 py-2 text-right font-semibold border-b border-slate-200 bg-emerald-50/40">Pérdida</th>
                  <th class="px-1 py-2 text-right font-semibold border-b border-slate-200 bg-emerald-50/40">Ganancia</th>
                  <th class="px-1 py-2 text-right font-bold border-b border-slate-200 bg-amber-50/60">Saldo cuenta</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in balanceCompletoPdf.filas"
                  :key="row.codigo"
                  class="border-b border-slate-100"
                  :class="row.esHoja ? 'text-slate-600' : 'text-slate-900'"
                >
                  <td class="py-1 pr-1 font-mono whitespace-nowrap" :style="{ paddingLeft: `${(row.nivel || 1) * 0.35}rem` }">{{ row.codigo }}</td>
                  <td class="px-2 py-1 max-w-[14rem] truncate" :title="row.nombre">{{ row.nombre }}</td>
                  <td class="px-1 py-1 text-right font-mono tabular-nums">{{ formatCLP(row.debitos) }}</td>
                  <td class="px-1 py-1 text-right font-mono tabular-nums">{{ formatCLP(row.creditos) }}</td>
                  <td class="px-1 py-1 text-right font-mono tabular-nums">{{ formatCLP(row.saldoDeudor) }}</td>
                  <td class="px-1 py-1 text-right font-mono tabular-nums">{{ formatCLP(row.saldoAcreedor) }}</td>
                  <td class="px-1 py-1 text-right font-mono tabular-nums bg-indigo-50/20">{{ formatCLP(row.activo) }}</td>
                  <td class="px-1 py-1 text-right font-mono tabular-nums bg-indigo-50/20">{{ formatCLP(row.pasivo) }}</td>
                  <td class="px-1 py-1 text-right font-mono tabular-nums bg-emerald-50/20">{{ formatCLP(row.perdida) }}</td>
                  <td class="px-1 py-1 text-right font-mono tabular-nums bg-emerald-50/20">{{ formatCLP(row.ganancia) }}</td>
                  <td class="px-1 py-1 text-right font-mono font-semibold tabular-nums bg-amber-50/40">{{ formatCLP(row.saldoCuentas) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[10px] text-slate-600 space-y-1">
            <p>
              <span class="font-semibold text-slate-700">Pérdidas / ganancias (raíz):</span>
              {{ formatCLP(balanceCompletoPdf.resultadoEjercicio) }}
            </p>
            <p class="text-slate-500">Misma estructura que el balance en pantalla (vista expandida).</p>
          </div>
        </section>
      </div>

      <footer
        class="rounded-b-2xl border-t border-slate-200/90 bg-slate-50 px-8 py-5 text-center text-[11px] leading-relaxed text-slate-500"
      >
        <p class="font-medium text-slate-600">Dashboard Fidelmira · Informe generado automáticamente</p>
        <p class="mt-1 text-slate-400">{{ fechaPieInforme }} · Solo para uso interno</p>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted } from "vue";
import eerrDataRaw from "../assets/datos_vue.json";
import planCuentasRaw from "../assets/plan_cuentas.json";
import mapeoCuentas from "../assets/config/mapeo_cuentas.json";
import VueApexCharts from "vue3-apexcharts";
import {
  mapearDatosAnioEerr,
  filtrarFilasPorRangoMes,
  calcularKpisDesdeRows,
  calcularKpisBalanceCorte,
  totalesPorCategoriaYMes,
  normAnio,
} from "../utils/kpiEerr.js";
import { descargarInformeExcel } from "../utils/informeExcel.js";
import { descargarInformePdf } from "../utils/informePdf.js";
import { buildMatrizEerrCompleta, buildFilasBalanceInforme } from "../utils/informeBalanceEerr.js";

const props = defineProps({
  empresa: { type: String, required: true },
});

const filtroAnio = ref(new Date().getFullYear());
const mesDesde = ref(1);
const mesHasta = ref(12);
const normaBalance = ref("Trib");
const tipoEerr = ref("financiero");
const regionPdfRef = ref(null);
const cargandoPdf = ref(false);
const fechaPieInforme = ref("");

function actualizarFechaPie() {
  fechaPieInforme.value = new Date().toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short" });
}
actualizarFechaPie();

/** Apex: sin animaciones para captura PDF nítida y tipografía de documento */
function apexDocChart(overrides = {}) {
  return {
    animations: { enabled: false, speed: 0 },
    fontFamily: "system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
    redrawOnParentResize: true,
    redrawOnWindowResize: true,
    ...overrides,
  };
}

const METRICAS_META = [
  { key: "ingresos", label: "Ingresos acumulados", tipoRatio: false },
  { key: "gastos", label: "Gastos acumulados", tipoRatio: false },
  { key: "ebitda", label: "EBITDA", tipoRatio: false },
  { key: "resultado", label: "Resultado del ejercicio", tipoRatio: false },
  { key: "margenBruto", label: "Margen bruto", tipoRatio: false },
  { key: "ingresosFinancieros", label: "Ingresos financieros", tipoRatio: false },
  { key: "contribuciones", label: "Contribuciones", tipoRatio: false },
  { key: "patenteMunicipal", label: "Patente municipal", tipoRatio: false },
  { key: "deudaTotalBalance", label: "Deuda total (balance)", tipoRatio: false },
  { key: "activoTotalBalance", label: "Activos totales (balance)", tipoRatio: false },
  { key: "liquidezCorriente", label: "Liquidez corriente", tipoRatio: true },
  { key: "endeudamiento", label: "Endeudamiento (P/Pat)", tipoRatio: true },
  { key: "ratioDeudaEbitda", label: "Deuda / EBITDA", tipoRatio: true },
];

const datosEmpresa = computed(() =>
  eerrDataRaw.filter((d) => String(d.Empresa).trim() === String(props.empresa).trim())
);

const aniosDisponibles = computed(() => {
  const set = new Set(datosEmpresa.value.map((d) => normAnio(d.Anio)));
  const arr = Array.from(set).sort((a, b) => b - a);
  return arr.length ? arr : [new Date().getFullYear()];
});

watch(
  () => props.empresa,
  () => {
    if (aniosDisponibles.value.length) filtroAnio.value = aniosDisponibles.value[0];
  }
);

onMounted(() => {
  if (aniosDisponibles.value.length) filtroAnio.value = aniosDisponibles.value[0];
  nextTick(() => informeResizeCharts());
});

watch([mesDesde, mesHasta], () => {
  if (mesDesde.value > mesHasta.value) mesHasta.value = mesDesde.value;
});

const filasAnioMapeadas = computed(() =>
  mapearDatosAnioEerr(props.empresa, filtroAnio.value, tipoEerr.value, datosEmpresa.value, mapeoCuentas)
);

const filasAnioPrevMapeadas = computed(() =>
  mapearDatosAnioEerr(props.empresa, filtroAnio.value - 1, tipoEerr.value, datosEmpresa.value, mapeoCuentas)
);

const filasPeriodo = computed(() =>
  filtrarFilasPorRangoMes(filasAnioMapeadas.value, mesDesde.value, mesHasta.value)
);

const filasPeriodoPrev = computed(() =>
  filtrarFilasPorRangoMes(filasAnioPrevMapeadas.value, mesDesde.value, mesHasta.value)
);

const eerrKpisActual = computed(() => calcularKpisDesdeRows(filasPeriodo.value));
const eerrKpisAnterior = computed(() => calcularKpisDesdeRows(filasPeriodoPrev.value));

const balanceActual = computed(() =>
  calcularKpisBalanceCorte(
    props.empresa,
    filtroAnio.value,
    mesHasta.value,
    normaBalance.value,
    tipoEerr.value,
    datosEmpresa.value
  )
);

const balanceAnterior = computed(() =>
  calcularKpisBalanceCorte(
    props.empresa,
    filtroAnio.value - 1,
    mesHasta.value,
    normaBalance.value,
    tipoEerr.value,
    datosEmpresa.value
  )
);

const mergedActual = computed(() => ({
  ...eerrKpisActual.value,
  ...balanceActual.value,
}));

const mergedAnterior = computed(() => ({
  ...eerrKpisAnterior.value,
  ...balanceAnterior.value,
}));

const eerrCategorias = computed(() => totalesPorCategoriaYMes(filasPeriodo.value));

const matrizEerrCompleta = computed(() =>
  buildMatrizEerrCompleta(props.empresa, filtroAnio.value, tipoEerr.value, datosEmpresa.value, mapeoCuentas)
);

const balanceCompletoPdf = computed(() =>
  buildFilasBalanceInforme(
    props.empresa,
    filtroAnio.value,
    mesHasta.value,
    normaBalance.value,
    eerrDataRaw,
    planCuentasRaw
  )
);

const metricasTabla = METRICAS_META;

const LABEL_CATEGORIA_EERR = {
  ingreso_explotacion: "Ingresos de explotación",
  ingreso_financiero: "Ingresos financieros",
  gasto_adm_ventas: "Gastos adm. y ventas",
  otros_gastos_financieros: "Otros gastos financieros",
  otros_resultados: "Otros resultados",
};

/** Fuerza remount y resize de Apex al cambiar filtros (evita gráficos en blanco o descuadrados). */
const chartRevision = computed(
  () =>
    `${props.empresa}|${filtroAnio.value}|${mesDesde.value}|${mesHasta.value}|${tipoEerr.value}|${normaBalance.value}`
);

function informeResizeCharts() {
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event("resize"));
  });
}

watch(
  chartRevision,
  () => {
    nextTick(() => informeResizeCharts());
  },
  { flush: "post" }
);

function mesNombre(m) {
  return ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][m - 1];
}

function formatCLP(v) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(
    Math.round(Number(v || 0))
  );
}

function formatearValorMeta(meta, raw) {
  if (raw == null || raw === "") return "—";
  if (meta.tipoRatio) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return "—";
    return n.toFixed(2);
  }
  return formatCLP(raw);
}

const mesesEnRango = computed(() => {
  const out = [];
  for (let m = mesDesde.value; m <= mesHasta.value; m += 1) out.push(m);
  return out;
});

const chartBarSeries = computed(() => {
  const ingresos = [];
  const gastos = [];
  mesesEnRango.value.forEach((m) => {
    let ing = 0;
    let gas = 0;
    filasAnioMapeadas.value.forEach((d) => {
      if (d.Mes !== m) return;
      if (d.Categoria === "ingreso_explotacion" || d.Categoria === "ingreso_financiero") ing += d.SaldoNeto;
      else gas += d.SaldoNeto;
    });
    ingresos.push(ing);
    gastos.push(gas);
  });
  return [
    { name: "Ingresos", data: ingresos },
    { name: "Gastos", data: gastos },
  ];
});

const chartBarOptions = computed(() => ({
  chart: apexDocChart({ type: "bar", toolbar: { show: false } }),
  colors: ["#10B981", "#EF4444"],
  plotOptions: { bar: { columnWidth: "55%", borderRadius: 2 } },
  dataLabels: { enabled: false },
  xaxis: { categories: mesesEnRango.value.map((m) => mesNombre(m).slice(0, 3)) },
  yaxis: { labels: { formatter: (val) => "$" + (val / 1e6).toFixed(1) + "M" } },
  tooltip: { y: { formatter: (val) => formatCLP(val) } },
  grid: { borderColor: "#e2e8f0", strokeDashArray: 3, padding: { top: 8, right: 8, bottom: 0, left: 8 } },
}));

const donutGastoDistribucion = computed(() => {
  const mapGav = {};
  for (const d of filasPeriodo.value) {
    if (d.Categoria !== "gasto_adm_ventas") continue;
    const k = d.Subitem || "sin_subitem";
    mapGav[k] = (mapGav[k] || 0) + d.SaldoNeto;
  }
  const gavKeys = Object.keys(mapGav).filter((k) => Math.abs(mapGav[k]) > 1e-9);
  if (gavKeys.length) {
    return {
      descripcion: "Gasto adm. y ventas por subítem (magnitud).",
      labels: gavKeys.map((t) => String(t).replace(/_/g, " ")),
      series: gavKeys.map((k) => Math.abs(mapGav[k])),
    };
  }
  const byCat = {};
  for (const d of filasPeriodo.value) {
    if (d.Categoria === "ingreso_explotacion" || d.Categoria === "ingreso_financiero") continue;
    const ck = d.Categoria || "otros";
    byCat[ck] = (byCat[ck] || 0) + d.SaldoNeto;
  }
  const catKeys = Object.keys(byCat).filter((k) => Math.abs(byCat[k]) > 1e-9);
  return {
    descripcion:
      "Sin movimientos GAV en el periodo: desglose por categoría EERR no ingresos (magnitud).",
    labels: catKeys.map((k) => LABEL_CATEGORIA_EERR[k] || String(k).replace(/_/g, " ")),
    series: catKeys.map((k) => Math.abs(byCat[k])),
  };
});

const chartDonutSeries = computed(() => donutGastoDistribucion.value.series);

const chartDonutOptions = computed(() => ({
  chart: apexDocChart({ type: "donut" }),
  labels: donutGastoDistribucion.value.labels,
  colors: ["#EF4444", "#F97316", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4"],
  dataLabels: { enabled: false },
  stroke: { width: 2, colors: ["#ffffff"] },
  plotOptions: { pie: { donut: { size: "58%" } } },
  legend: { position: "bottom" },
  tooltip: { y: { formatter: (val) => formatCLP(val) } },
}));

const CATEGORIA_EXCLUIDA_EBITDA = "otros_gastos_financieros";

function ebitdaDesdeFilasMes(filasMes) {
  let e = 0;
  for (const d of filasMes) {
    if (d.Categoria === CATEGORIA_EXCLUIDA_EBITDA) continue;
    if (
      d.Categoria === "ingreso_explotacion" ||
      d.Categoria === "ingreso_financiero" ||
      d.Categoria === "gasto_adm_ventas"
    ) {
      e += d.SaldoNeto;
    }
  }
  return e;
}

function ingresosMes(filasMes) {
  let t = 0;
  for (const d of filasMes) {
    if (d.Categoria === "ingreso_explotacion" || d.Categoria === "ingreso_financiero") t += d.SaldoNeto;
  }
  return t;
}

const catsXaxis = computed(() => mesesEnRango.value.map((m) => mesNombre(m).slice(0, 3)));

const chartEbitdaLineSeries = computed(() => {
  const act = [];
  const ant = [];
  mesesEnRango.value.forEach((m) => {
    const fa = filasAnioMapeadas.value.filter((d) => d.Mes === m);
    const fp = filasAnioPrevMapeadas.value.filter((d) => d.Mes === m);
    act.push(ebitdaDesdeFilasMes(fa));
    ant.push(ebitdaDesdeFilasMes(fp));
  });
  return [
    { name: String(filtroAnio.value), data: act },
    { name: String(filtroAnio.value - 1), data: ant },
  ];
});

const chartEbitdaLineOptions = computed(() => ({
  chart: apexDocChart({ type: "line", toolbar: { show: false }, zoom: { enabled: false } }),
  colors: ["#7C3AED", "#94A3B8"],
  stroke: { width: 3, curve: "smooth" },
  dataLabels: { enabled: false },
  markers: { size: 4, hover: { size: 5 } },
  xaxis: { categories: catsXaxis.value },
  yaxis: { labels: { formatter: (val) => "$" + (val / 1e6).toFixed(1) + "M" } },
  tooltip: { y: { formatter: (val) => formatCLP(val) } },
  legend: { position: "top" },
  grid: { borderColor: "#e2e8f0", strokeDashArray: 3 },
}));

const chartIngresosYoYSeries = computed(() => {
  const act = [];
  const ant = [];
  mesesEnRango.value.forEach((m) => {
    const fa = filasAnioMapeadas.value.filter((d) => d.Mes === m);
    const fp = filasAnioPrevMapeadas.value.filter((d) => d.Mes === m);
    act.push(ingresosMes(fa));
    ant.push(ingresosMes(fp));
  });
  return [
    { name: `Ingresos ${filtroAnio.value}`, data: act },
    { name: `Ingresos ${filtroAnio.value - 1}`, data: ant },
  ];
});

const chartIngresosYoYOptions = computed(() => ({
  chart: apexDocChart({ type: "line", toolbar: { show: false }, zoom: { enabled: false } }),
  colors: ["#059669", "#64748B"],
  stroke: { width: 3, curve: "smooth" },
  dataLabels: { enabled: false },
  markers: { size: 4, hover: { size: 5 } },
  xaxis: { categories: catsXaxis.value },
  yaxis: { labels: { formatter: (val) => "$" + (val / 1e6).toFixed(1) + "M" } },
  tooltip: { y: { formatter: (val) => formatCLP(val) } },
  legend: { position: "top" },
  grid: { borderColor: "#e2e8f0", strokeDashArray: 3 },
}));

const chartResultadoAreaSeries = computed(() => {
  const res = [];
  const marg = [];
  mesesEnRango.value.forEach((m) => {
    const chunk = filasAnioMapeadas.value.filter((d) => d.Mes === m);
    const k = calcularKpisDesdeRows(chunk);
    res.push(k.resultado);
    marg.push(k.margenBruto);
  });
  return [
    { name: "Resultado", data: res },
    { name: "Margen bruto", data: marg },
  ];
});

const chartResultadoAreaOptions = computed(() => ({
  chart: apexDocChart({ type: "area", toolbar: { show: false }, zoom: { enabled: false } }),
  colors: ["#0EA5E9", "#A855F7"],
  stroke: { width: 2, curve: "smooth" },
  fill: {
    type: "gradient",
    gradient: { opacityFrom: 0.45, opacityTo: 0.05 },
  },
  dataLabels: { enabled: false },
  xaxis: { categories: catsXaxis.value },
  yaxis: { labels: { formatter: (val) => "$" + (val / 1e6).toFixed(1) + "M" } },
  tooltip: { y: { formatter: (val) => formatCLP(val) } },
  legend: { position: "top" },
  grid: { borderColor: "#e2e8f0", strokeDashArray: 3 },
}));

const chartKpiGroupedSeries = computed(() => {
  const a = eerrKpisActual.value;
  const b = eerrKpisAnterior.value;
  return [
    {
      name: `Periodo ${filtroAnio.value}`,
      data: [a.ingresos, a.gastos, a.ebitda, a.resultado],
    },
    {
      name: `Periodo ${filtroAnio.value - 1}`,
      data: [b.ingresos, b.gastos, b.ebitda, b.resultado],
    },
  ];
});

const chartKpiGroupedOptions = computed(() => ({
  chart: apexDocChart({ type: "bar", toolbar: { show: false } }),
  colors: ["#4F46E5", "#CBD5E1"],
  plotOptions: { bar: { columnWidth: "58%", borderRadius: 3 } },
  dataLabels: { enabled: false },
  xaxis: {
    categories: ["Ingresos", "Gastos", "EBITDA", "Resultado"],
  },
  yaxis: { labels: { formatter: (val) => "$" + (val / 1e6).toFixed(1) + "M" } },
  tooltip: { y: { formatter: (val) => formatCLP(val) } },
  legend: { position: "top" },
}));

const tieneGraficoCategoriasEerr = computed(() => {
  const rows = eerrCategorias.value.filter((r) => Math.abs(Number(r.total) || 0) > 0);
  return rows.length > 0;
});

const chartCategoriaHorizSeries = computed(() => {
  const rows = eerrCategorias.value.filter((r) => Math.abs(Number(r.total) || 0) > 0);
  if (!rows.length) return [];
  return [{ name: "Total periodo", data: rows.map((r) => r.total) }];
});

const chartCategoriaHorizOptions = computed(() => {
  const rows = eerrCategorias.value.filter((r) => Math.abs(Number(r.total) || 0) > 0);
  const labels = rows.map((r) => String(r.categoria).replace(/_/g, " "));
  return {
    chart: apexDocChart({ type: "bar", toolbar: { show: false } }),
    colors: ["#0D9488"],
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 3,
        barHeight: "72%",
        dataLabels: { position: "center" },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => {
        const n = Number(val);
        if (!Number.isFinite(n) || Math.abs(n) < 1) return "";
        return (n / 1e6).toFixed(1) + "M";
      },
      style: { fontSize: "10px", colors: ["#0f172a"] },
    },
    xaxis: {
      categories: labels,
      labels: {
        formatter: (val) => {
          const n = Number(val);
          if (!Number.isFinite(n)) return "";
          return "$" + (n / 1e6).toFixed(1) + "M";
        },
      },
    },
    yaxis: {
      labels: {
        maxWidth: 260,
        style: { fontSize: "11px" },
      },
    },
    grid: {
      borderColor: "#e2e8f0",
      strokeDashArray: 3,
      padding: { left: 8, right: 12, top: 4, bottom: 4 },
    },
    tooltip: {
      y: {
        formatter: (val) => formatCLP(val),
      },
    },
  };
});

const chartBalanceGroupedSeries = computed(() => {
  const a = balanceActual.value;
  const b = balanceAnterior.value;
  return [
    {
      name: String(filtroAnio.value),
      data: [
        a.activoTotalBalance,
        a.pasivoTotalBalance,
        a.patrimonioTotalBalance,
        a.deudaTotalBalance,
      ],
    },
    {
      name: String(filtroAnio.value - 1),
      data: [
        b.activoTotalBalance,
        b.pasivoTotalBalance,
        b.patrimonioTotalBalance,
        b.deudaTotalBalance,
      ],
    },
  ];
});

const chartBalanceGroupedOptions = computed(() => ({
  chart: apexDocChart({ type: "bar", toolbar: { show: false } }),
  colors: ["#2563EB", "#94A3B8"],
  plotOptions: { bar: { columnWidth: "55%", borderRadius: 3 } },
  dataLabels: { enabled: false },
  xaxis: {
    categories: ["Activos", "Pasivo", "Patrimonio", "Deuda (mapeo)"],
  },
  yaxis: { labels: { formatter: (val) => "$" + (val / 1e6).toFixed(1) + "M" } },
  tooltip: { y: { formatter: (val) => formatCLP(val) } },
  legend: { position: "top" },
}));

const chartLiquidezEndeudamientoSeries = computed(() => {
  const a = balanceActual.value;
  const b = balanceAnterior.value;
  return [
    {
      name: String(filtroAnio.value),
      data: [
        a.liquidezCorriente ?? 0,
        a.endeudamiento ?? 0,
      ],
    },
    {
      name: String(filtroAnio.value - 1),
      data: [
        b.liquidezCorriente ?? 0,
        b.endeudamiento ?? 0,
      ],
    },
  ];
});

const chartLiquidezEndeudamientoOptions = computed(() => ({
  chart: apexDocChart({ type: "bar", toolbar: { show: false } }),
  colors: ["#0D9488", "#94A3B8"],
  plotOptions: { bar: { columnWidth: "58%", borderRadius: 3 } },
  dataLabels: { enabled: true, formatter: (val) => Number(val).toFixed(2) },
  xaxis: { categories: ["Liquidez corriente", "Endeudamiento (P/Pat)"] },
  tooltip: { y: { formatter: (val) => Number(val).toFixed(2) } },
  legend: { position: "top" },
}));

const chartDeudaEbitdaBarSeries = computed(() => {
  const a = balanceActual.value;
  const b = balanceAnterior.value;
  return [
    { name: String(filtroAnio.value), data: [a.ratioDeudaEbitda ?? 0] },
    { name: String(filtroAnio.value - 1), data: [b.ratioDeudaEbitda ?? 0] },
  ];
});

const chartDeudaEbitdaBarOptions = computed(() => ({
  chart: apexDocChart({ type: "bar", toolbar: { show: false } }),
  colors: ["#B45309", "#94A3B8"],
  plotOptions: { bar: { columnWidth: "50%", borderRadius: 4 } },
  dataLabels: { enabled: true, formatter: (val) => (Number(val).toFixed(2)) },
  xaxis: { categories: ["Deuda / EBITDA"] },
  tooltip: { y: { formatter: (val) => Number(val).toFixed(2) + " x" } },
  legend: { position: "top" },
}));

const chartGastosPorCatSeries = computed(() => {
  const ing = new Set(["ingreso_explotacion", "ingreso_financiero"]);
  const slice = eerrCategorias.value.filter((r) => !ing.has(r.categoria) && Math.abs(Number(r.total) || 0) > 0);
  return slice.map((r) => Math.abs(Number(r.total) || 0));
});

const chartGastosPorCatOptions = computed(() => {
  const ing = new Set(["ingreso_explotacion", "ingreso_financiero"]);
  const slice = eerrCategorias.value.filter((r) => !ing.has(r.categoria) && Math.abs(Number(r.total) || 0) > 0);
  const labels = slice.map((r) => String(r.categoria).replace(/_/g, " "));
  return {
    chart: apexDocChart({ type: "pie" }),
    labels,
    colors: ["#DC2626", "#EA580C", "#CA8A04", "#9333EA", "#DB2777", "#0891B2", "#4F46E5"],
    plotOptions: { pie: { expandOnClick: false } },
    dataLabels: { enabled: true, formatter: (val) => formatCLP(val) },
    legend: { position: "bottom", fontSize: "11px" },
    tooltip: { y: { formatter: (val) => formatCLP(val) } },
    stroke: { width: 1, colors: ["#ffffff"] },
  };
});

const serieComparativa = computed(() =>
  mesesEnRango.value.map((m) => {
    let ing = 0;
    let gas = 0;
    filasAnioMapeadas.value.forEach((d) => {
      if (d.Mes !== m) return;
      if (d.Categoria === "ingreso_explotacion" || d.Categoria === "ingreso_financiero") ing += d.SaldoNeto;
      else gas += d.SaldoNeto;
    });
    return { mes: m, label: mesNombre(m), ingresos: ing, gastos: gas };
  })
);

function onDescargarExcel() {
  const periodoStr = `${filtroAnio.value}_${mesDesde.value}-${mesHasta.value}`;
  descargarInformeExcel({
    meta: {
      Empresa: props.empresa,
      Periodo: periodoStr,
      Anio: filtroAnio.value,
      MesDesde: mesDesde.value,
      MesHasta: mesHasta.value,
      NormaBalance: normaBalance.value,
      TipoEERR: tipoEerr.value,
      Comparativo: `vs ${filtroAnio.value - 1} mismos meses`,
    },
    kpisActual: mergedActual.value,
    kpisAnterior: mergedAnterior.value,
    metricasMeta: METRICAS_META,
    eerrCategorias: eerrCategorias.value,
    balanceKpis: balanceActual.value,
    serieComparativa: serieComparativa.value,
  });
}

async function onDescargarPdf() {
  actualizarFechaPie();
  cargandoPdf.value = true;
  await nextTick();
  informeResizeCharts();
  await new Promise((r) => setTimeout(r, 1200));
  try {
    if (regionPdfRef.value) {
      await descargarInformePdf(
        regionPdfRef.value,
        `Informe_${props.empresa}_${filtroAnio.value}_${mesDesde.value}-${mesHasta.value}`
      );
    }
  } finally {
    cargandoPdf.value = false;
  }
}
</script>

<style scoped>
.informe-pdf-kpi-accent {
  border-left-style: solid;
  border-left-width: 4px;
}
.informe-pdf-kpi-tone-0 {
  border-left-color: rgb(79 70 229);
}
.informe-pdf-kpi-tone-1 {
  border-left-color: rgb(13 148 136);
}
.informe-pdf-kpi-tone-2 {
  border-left-color: rgb(139 92 246);
}

.informe-pdf-section-head {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.informe-pdf-badge {
  display: inline-flex;
  height: 2.5rem;
  width: 2.5rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, rgb(79 70 229), rgb(67 56 202));
  font-size: 0.875rem;
  font-weight: 700;
  color: white;
  box-shadow: 0 10px 25px -5px rgb(79 70 229 / 0.35);
}

.informe-pdf-rule {
  height: 1px;
  flex: 1;
  min-width: 2rem;
  background: linear-gradient(to right, rgb(226 232 240), transparent);
}

.informe-pdf-chart-card {
  border-radius: 1rem;
  border: 1px solid rgb(241 245 249);
  background: rgb(255 255 255);
  padding: 1.25rem 1.25rem 0.75rem;
  box-shadow: 0 1px 3px 0 rgb(15 23 42 / 0.05);
}

.informe-pdf-chart-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: rgb(30 41 59);
}

.informe-pdf-dot {
  height: 0.5rem;
  width: 0.5rem;
  border-radius: 9999px;
  flex-shrink: 0;
}

.informe-pdf-table thead tr {
  background: rgb(248 250 252);
}

.informe-pdf-table th {
  padding: 0.65rem 1rem;
  font-weight: 700;
  font-size: 0.65rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(100 116 139);
  border-bottom: 1px solid rgb(226 232 240);
}

.informe-pdf-table td {
  padding: 0.65rem 1rem;
  border-bottom: 1px solid rgb(241 245 249);
}

.informe-chart-surface {
  position: relative;
  width: 100%;
  min-height: 300px;
  overflow: visible;
}

.informe-chart-surface--tall {
  min-height: 340px;
}

.informe-chart-surface :deep(.apexcharts-canvas),
.informe-chart-surface :deep(.apexcharts-svg),
.informe-chart-surface :deep(svg) {
  overflow: visible !important;
}
</style>
